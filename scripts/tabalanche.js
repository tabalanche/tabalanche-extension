/* global PouchDB platform emit */

var tabalanche = {};
(function(){

  var stashes = new PouchDB('stashes');

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
        const uuid = crypto.randomUUID().toUpperCase();
        var stashDoc = {
          _id: stashTime.toISOString() + '_' + uuid,
          uuid,
          created: stashTime.toISOString(),
          tabs: tabs.map(stashedTab)
        };

        return stashes.put(stashDoc).then(function(response) {
          platform.closeTabs(tabs);
          var dashboard = platform.extensionURL('dashboard.html');
          // This used to be the UUID, but now it's the sort ID
          // which is... probably what'll be needed to make it
          // functional at whatever point that gets added
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

  tabalanche.importStash = async function importStash(stash) {

    const uuid = (stash.uuid || stash._id || crypto.randomUUID()
      ).toUpperCase();
    const created = new Date(stash.created).toISOString();
    return stashes.put({
      _id: `${created}_${uuid}`,
      uuid: uuid,
      created: created,
      tabs: stash.tabs
    });
  }

  tabalanche.getAllStashes = async function() {
    if (window.migrating) await window.migrating;

    const response = await stashes.allDocs({
      include_docs: true,
      descending: true
    });

    return response.rows.map(function (row) {
      return row.doc;
    });
  };

  tabalanche.getSomeStashes = async function(startKey) {
    if (window.migrating) await window.migrating;

    const queryOpts = {
      include_docs: true,
      descending: true,
      limit: 5 // TODO: Make configurable or something
    };

    if (startKey) {
      queryOpts.startkey = startKey;
      queryOpts.skip = 1;
    }

    const response = await stashes.allDocs(queryOpts);

    return response.rows.map(function (row) {
      return row.doc;
    });
  };

  tabalanche.getDB = async function getDB() {
    return stashes;
  };

  tabalanche.destroyAllStashes = async function destroyAllStashes() {
    return stashes.destroy();
  };
})();
