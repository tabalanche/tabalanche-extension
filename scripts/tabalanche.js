/* global PouchDB platform emit */

var tabalanche = {};
(function(){

  var tabgroups = new PouchDB('tabgroups');

  // these numbers aren't gonna be exact due to design docs
  // and/or new stashes happening mid-migration, but they're good
  // enough to explain that a slowdown on load is going to end someday
  let totalTabGroups = 'many';
  let currentGroup = 0;

  function updateProgress() {
    localStorage.setItem("zeroDesignDocMigration",++currentGroup);
    localStorage.setItem("slowBanner", `Updating ${
      currentGroup}/${totalTabGroups} stashes for Tabalanche 1.2.0`)
  }

  function postDesignDocMigration(doc) {
    if (doc._id[0] == '_') return false;

    const uuid = doc.uuid || doc._id || crypto.randomUUID().toUpperCase();
    const created = new Date(doc.created).toISOString();

    if (!doc.uuid) {
      doc.uuid = uuid;
      doc._id = `${created}_${uuid}`;
    }

    // ensure document timestamp is in ISO format
    doc.created = created;

    updateProgress();

    return doc;
  }

  const migrated = navigator.locks.request(
    "zeroDesignDocMigration", async () => {

    const migrationStatus = localStorage.getItem("zeroDesignDocMigration");
    if (migrationStatus == 'complete') return tabgroups;

    totalTabGroups = (await tabgroups.info()).doc_count;
    currentGroup = +migrationStatus;

    return tabgroups.migrate(postDesignDocMigration).then(() => {
      localStorage.setItem("zeroDesignDocMigration", "complete");
      localStorage.removeItem("slowBanner");
      return tabgroups;
    });
  });

  function stashTabs(tabs) {
    return platform.currentWindowContext().then(function(store) {
      var stashTime = new Date();

      function stashedTab(tab) {
        return {
          url: tab.url,
          title: tab.title,
        };
      }

      if (tabs.length > 0) {
        var uuid = crypto.randomUUID().toUpperCase();
        var tabGroupDoc = {
          _id: stashTime.toISOString() + '_' + uuid,
          uuid,
          created: stashTime.toISOString(),
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
    if (tabGroup.uuid) {
      return tabgroups.put({
        _id: tabGroup._id,
        uuid: tabGroup.uuid,
        created: tabGroup.created,
        tabs: tabGroup.tabs
      });
    } else {
      const uuid = tabGroup._id || crypto.randomUUID().toUpperCase();
      const created = new Date(tabGroup.created).toISOString();
      return tabgroups.put({
        _id: `${created}_${uuid}`,
        uuid: uuid,
        created: created,
        tabs: tabGroup.tabs
      });
    }
  };

  tabalanche.getAllTabGroups = function() {
    return migrated.then(function () {
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

  tabalanche.getSomeTabGroups = async function(startKey) {
    var queryOpts = {
      include_docs: true,
      descending: true,
      limit: 5 // TODO: Make configurable or something
    };

    if (startKey) {
      queryOpts.startkey = startKey;
      queryOpts.skip = 1;
    }

    await migrated;

    return tabgroups.allDocs(queryOpts)
    .then(function (response) {
      return response.rows.map(function (row) {
        return row.doc;
      });
    });
  };

  tabalanche.getDB = function getDB() {
    return tabgroups.info().then(() => tabgroups);
  };

  tabalanche.destroyAllTabGroups = function destroyAllTabGroups() {
    return tabgroups.destroy();
  };
})();
