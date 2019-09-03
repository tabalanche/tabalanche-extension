/* global PouchDB platform emit */

var tabalanche = {};
(function(){
  var dashboardDesignDoc = {
    _id: '_design/dashboard',
    version: 2,
    views: {
      by_creation: {
        map: function(doc) {
          emit([doc.created, doc._id]);
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

      // If we have a newer design doc than the current one
      if (designDoc.version > existing.version) {

        // Note the revision we're clobbering and try the put again
        designDoc._rev = existing._rev;
        return ensureCurrentDesignDoc(db, designDoc);

      // If the existing design doc appears to be up to date then
      // return the DB for stuff like getDB
      } else return db;
    }

    return db.put(designDoc).then(function() {
      // return the DB for stuff like getDB
      return db;
    }).catch(function (err) {
      if (err.name == 'conflict') {
        return db.get(designDoc._id)
          .then(checkAgainstExistingDesignDoc);
      } else throw(err);
    });
  }

  var tabgroups = new PouchDB('tabgroups');
  var tabgroupsReady = ensureCurrentDesignDoc(tabgroups, dashboardDesignDoc);

  function stashTabs(tabs) {
    return platform.currentWindowContext().then(function(store) {
      var stashTime = new Date();

      function stashedTab(tab) {
        return {
          url: tab.url,
          title: tab.title,
        };
      }

      return tabgroupsReady.then(function() {
        if (tabs.length > 0) {
          var tabGroupDoc = {
            created: stashTime.getTime(),
            tabs: tabs.map(stashedTab)
          };

          return tabgroups.post(tabGroupDoc).then(function(response) {
            platform.closeTabs(tabs);
            var dashboard = platform.extensionURL('dashboard.html');
            open(dashboard + '#' + response.id, '_blank');
          });
        } else {
          throw new Error('No tabs to save');
        }
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
    return tabgroupsReady.then(function() {
      if (tabGroup._id) {
        return tabgroups.put({
          _id: tabGroup._id,
          created: tabGroup.created,
          tabs: tabGroup.tabs
        });
      } else {
        return tabgroups.post({
          created: tabGroup.created,
          tabs: tabGroup.tabs
        });
      }
    });
  };

  tabalanche.getAllTabGroups = function() {
    return tabgroupsReady.then(function () {
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

  tabalanche.getSomeTabGroups = function getSomeTabGroups(startKey, filter) {
    var queryOpts = {
      include_docs: true,
      descending: true,
      limit: 5 // TODO: Make configurable or something
    };

    if (startKey) {
      queryOpts.startkey = startKey;
      queryOpts.skip = 1;
    }
    
    if (filter && typeof filter == 'string') {
      filter = new RegExp(filter, 'i');
    }

    return tabgroupsReady.then(function () {
      return tabgroups.query('dashboard/by_creation', queryOpts)
      .then(function (response) {
        if (!response.rows.length) {
          return [];
        }
        
        var docs = response.rows
          .map(function (row) {
            return row.doc;
          })
          .filter(function (doc) {
            return !filter || doc.tabs.some(function (tab) {
              return filter.test(tab.title) || filter.test(tab.url);
            });
          });
          
        if (docs.length) {
          return docs;
        }
        
        var lastDoc = response.rows[response.rows.length - 1].doc;
        return getSomeTabGroups([lastDoc.created, lastDoc._id], filter);
      });
    });
  };

  tabalanche.getDB = function getDB() {
    return tabgroupsReady.then();
  };

  tabalanche.destroyAllTabGroups = function destroyAllTabGroups() {
    return tabgroups.destroy();
  };
})();
