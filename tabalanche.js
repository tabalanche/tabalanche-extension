/* global PouchDB chrome emit */

var tabalanche = {};
(function(){
  var dashboardDesignDoc = {
    _id: '_design/dashboard',
    version: 1,
    views: {
      by_creation: {
        map: function(doc) {
          emit(doc.created);
        }.toString()
      },
      total_tabs: {
        map: function(doc) {
          emit(doc._id, doc.tabs.length);
        }.toString(),
        reduce: '_sum'
      }
    }
  };

  function ensureCurrentDesignDoc(db, designDoc) {
    function checkAgainstExistingDesignDoc(existing) {
      if (designDoc.version > existing.version) {
        designDoc._rev = existing._rev;
        return ensureCurrentDesignDoc(db, designDoc);
      }
    }

    return db.put(designDoc).catch(function (err) {
      if (err.name == 'conflict') {
        return db.get(designDoc._id)
          .then(checkAgainstExistingDesignDoc);
      } else throw(err);
    });
  }

  var tabgroups;
  var tabgroupsPromise = new PouchDB('tabgroups').then(function(db){
    tabgroups = db;
    return ensureCurrentDesignDoc(db, dashboardDesignDoc);
  });

  function whenDBReady(cb) {
    return tabgroupsPromise.then(cb);
  }

  function stashTabs(filter) {
    // TODO: refactor to come from chrome.tabs.query:
    // https://developer.chrome.com/extensions/tabs#method-query
    chrome.windows.getCurrent({populate: true}, function (crWindow) {
      var sessionName = sessionStorage.getItem(
        'windowcontext_' + crWindow.id + '_name');
      var stashTime = new Date();
      var tabSave = crWindow.tabs.filter(filter).map(function (tab) {
        return {
          url: tab.url,
          title: tab.title,
          icon: tab.favIconUrl
        };
      });
      whenDBReady(function() {
        tabgroups.post({
          name: sessionName || stashTime.toLocaleString(),
          created: stashTime.getTime(),
          tabs: tabSave
        }).then(function(response) {
          // TODO: close all tabs, navigate to stash
        });
      });
    });
  }

  tabalanche.stashThisTab = function() {
    return stashTabs(function(tab){return tab.highlighted || tab.active});
  };
  tabalanche.stashAllTabs = function() {
    return stashTabs(function(){return true});
  };
  tabalanche.stashOtherTabs = function() {
    return stashTabs(function(tab){return !tab.highlighted});
  };
  tabalanche.stashTabsToTheRight = function() {
    // todo: refactor so this doesn't have to be a (terrible) filter
    return stashTabs(function(tab, i, tabs) {
      var lastTab = tabs.length-1;
      while (!tabs[lastTab].highlighted && lastTab > 0 && lastTab > i)
        lastTab--;
      return i > lastTab;
    });
  };

  tabalanche.importTabGroup = function importTabGroup(tabGroup, opts) {
    opts = opts || {};
    var tabGroupName = tabGroup.name ||
      (tabGroup.created &&
        new Date(tabGroup.created).toLocaleString()) ||
      opts.defaultName ||
      (tabGroup.tabs || []).length + ' Tabs';
    return whenDBReady(function() {
      if (tabGroup._id) {
        return tabgroups.put({
          _id: tabGroup._id,
          name: tabGroupName,
          created: tabGroup.created,
          tabs: tabGroup.tabs
        });
      } else {
        return tabgroups.post({
          name: tabGroupName,
          created: tabGroup.created,
          tabs: tabGroup.tabs
        });
      }
    });
  };

  tabalanche.getAllTabGroups = function(cb) {
    whenDBReady(function () {
      tabgroups.query('dashboard/by_creation', {
        include_docs: true,
        descending: true
      }).then(function (response) {
        return cb(response.rows.map(function (row) {
          return row.doc;
        }));
      });
    });
  };

  tabalanche.addEventListener = function (name, cb) {
    if (name == 'dbready') {
      whenDBReady(cb);
    }
  };
})();
