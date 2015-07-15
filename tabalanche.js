/* global PouchDB platform emit */

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

  function stashTabs(tabs) {
    return platform.getCurrentWindowContext().then(function(wndCtx) {
      var stashTime = new Date();
      var tabSave = tabs.map(function (tab) {
        var tabDoc = {
          url: tab.url,
          title: tab.title
        };

        if (tab.favIconUrl) tabDoc.icon = tab.favIconUrl;

        return tabDoc;
      });
      return whenDBReady(function() {
        return tabgroups.post({
          name: wndCtx.name || stashTime.toLocaleString(),
          created: stashTime.getTime(),
          tabs: tabSave
        }).then(function(response) {
          platform.closeTabs(tabs);
          var dashboard = platform.extensionURL('dashboard.html');
          open(dashboard + '#' + response.id, '_blank');
        });
      });
    });
  }

  tabalanche.stashThisTab = function() {
    return platform.getWindowTabs.highlighted().then(stashTabs);
  };
  tabalanche.stashAllTabs = function() {
    return platform.getWindowTabs.all().then(stashTabs);
  };
  tabalanche.stashOtherTabs = function() {
    return platform.getWindowTabs.other().then(stashTabs);
  };
  tabalanche.stashTabsToTheRight = function() {
    return platform.getWindowTabs.right().then(stashTabs);
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

  tabalanche.getAllTabGroups = function() {
    return whenDBReady(function () {
      return tabgroups.query('dashboard/by_creation', {
        include_docs: true,
        descending: true
      }).then(function (response) {
        return response.rows.map(function (row) {
          return row.doc;
        });
      });
    });
  };

  tabalanche.addEventListener = function (name, cb) {
    if (name == 'dbready') {
      whenDBReady(cb);
    }
  };
})();
