/* global PouchDB platform emit */

var tabalanche = {};
(function(){

  var tabgroups = new PouchDB('tabgroups');
  var tabgroupsReady = tabgroups;

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
          var uuid = crypto.randomUUID().toUpperCase();
          var tabGroupDoc = {
            _id: stashTime.toISOString() + '_' + uuid,
            uuid,
            created: stashTime.getTime(),
            tabs: tabs.map(stashedTab)
          };

          return tabgroups.put(tabGroupDoc).then(function(response) {
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
    // TODO: migrate schema during import
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
      return tabgroups.allDocs({
        include_docs: true,
        descending: true
      }).then(function (response) {
        return response.rows.map(function (row) {
          return row.doc;
        });
      });
    });
  };

  tabalanche.getSomeTabGroups = function(startKey) {
    var queryOpts = {
      include_docs: true,
      descending: true,
      limit: 5 // TODO: Make configurable or something
    };

    if (startKey) {
      queryOpts.startkey = startKey;
      queryOpts.skip = 1;
    }

    return tabgroupsReady.then(function () {
      return tabgroups.allDocs(queryOpts)
      .then(function (response) {
        return response.rows.map(function (row) {
          return row.doc;
        });
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
