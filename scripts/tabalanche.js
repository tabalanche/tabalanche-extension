/* global PouchDB platform emit eventEmitter compileFilter */

var tabalanche = eventEmitter();
(function(){
  var dashboardDesignDoc = {
    _id: '_design/dashboard',
    version: 3,
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
      },
      by_tab_url: {
        map: function(doc) {
          var i;
          for (i = 0; i < doc.tabs.length; i++) {
            emit(doc.tabs[i].url);
          }
        }.toString()
      }
    }
  };
  let syncHandler;
  let remoteUrl = '';

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

  let tabgroups;
  let tabgroupsReady;

  initDB();

  function newTabGroupDoc(init = {}) {
    if (!init.created) {
      init.created = new Date().getTime();
    }
    if (!init.tabs) {
      init.tabs = [];
    }
    return init;
  }

  function initDB() {
    tabgroups = new PouchDB('tabgroups');
    tabgroupsReady = ensureCurrentDesignDoc(tabgroups, dashboardDesignDoc);
  }

  function stashTabs(tabs) {
    var extensionPrefix = platform.extensionURL('');
    tabs = tabs.filter(function (tab) {
      // ignore extension pages
      if (tab.url.startsWith(extensionPrefix)) return false;
      // FIXME: you may get unloaded tabs with undefined URL on FF android
      if (tab.url.match(/^https?:\/\/undefined/)) return false;
      return true
    });
    if (!tabs.length) {
      throw new Error('No tabs to save');
    }
    const closeTabs = async () => {
      if (!(await platform.isDashboardAvailable())) {
        await platform.openDashboard();
      }
      await platform.closeTabs(tabs);
    }
    const containerCache = {};
    const getContainer = async (id) => {
      try {
        if (!containerCache[id]) {
          containerCache[id] = browser.contextualIdentities.get(id);
        }
        return await containerCache[id];
      } catch (err) {
        console.warn(err);
      }
    }
    const doStash = async () => {
      await tabgroupsReady;

      const opts = await platform.getOptions();
      const dupTabs = opts.ignoreDuplicatedUrls ?
        await tabalanche.hasUrls(tabs.map(function (tab) {return tab.url;})) : {};

      async function stashedTab(tab) {
        return {
          url: tab.url,
          title: tab.title,
          container: tab.cookieStoreId ?
            await getContainer(tab.cookieStoreId) : undefined,
        };
      }

      let uniqueTabs = [];

      var i;
      for (i = 0; i < tabs.length; i++) {
        // NOTE: this prevents users from saving duplicate URLs in a single group.
        // Even when ignoredDuplicateUrls is false
        if (!dupTabs[tabs[i].url]) {
          dupTabs[tabs[i].url] = true;
          uniqueTabs.push(stashedTab(tabs[i]));
        }
      }
      
      if (!uniqueTabs.length) {
        console.warn('The tab group has no tab');
        return;
      }

      uniqueTabs = await Promise.all(uniqueTabs);

      await tabalanche.insertTabs(null, uniqueTabs);
    }
    doStash();
    return closeTabs();
  }
  
  tabalanche.stashTabs = stashTabs;

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

  tabalanche.importTabGroups = async docs => {
    await tabgroupsReady;
    const newDocs = docs.filter(d => !d._id);
    if (newDocs.length && newDocs.length < docs.length) {
      throw new Error("Some documents donnot have correct _id");
    }
    const response = await tabgroups.bulkDocs(docs, {new_edits: Boolean(newDocs.length)});
    const failed = [];
    const created = [];
    for (const result of response) {
      if (result.error) {
        failed.push(result);
      } else {
        created.push(result);
      }
    }
    const changedIds = [
      ...docs.map(doc => doc._id),
      ...created.map(result => result.id)
    ];
    for (const id of changedIds) {
      browser.runtime.sendMessage({event: "new-tab-group", tabGroupId: id})
        .catch(console.warn);
    }
    if (failed.length) {
      console.error(failed);
      throw new Error(`Failed to import ${failed.length} tab groups. _id=${failed.map(r => r.id).join(', ')}`);
    }
  }

  tabalanche.importTabGroup = function importTabGroup(tabGroup, /* opts */) {
    // opts = opts || {};
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
  
  tabalanche.getTabGroup = function (id) {
    return tabgroupsReady.then(function () {
      return tabgroups.get(id);
    });
  };

  tabalanche.getLastTabGroup = function () {
    return tabgroupsReady.then(function () {
      return tabgroups.query('dashboard/by_creation', {
        include_docs: true,
        descending: true,
        limit: 1
      }).then(function (response) {
        if (!response.rows.length) {
          return null;
        }
        return response.rows[0].doc;
      });
    });
  }

  const FILTER_PROPS = ['url', 'title'];

  tabalanche.getSomeTabGroups = async function getSomeTabGroups(startKey, filter) {
    filter = filter && typeof filter === "string" ? compileFilter(filter) : filter;

    var queryOpts = {
      include_docs: true,
      descending: true,
      limit: 5 // TODO: Make configurable or something
    };

    if (startKey) {
      queryOpts.startkey = startKey;
      queryOpts.skip = 1;
    }
    await tabgroupsReady;
    for (;;) {
      var response = await tabgroups.query('dashboard/by_creation', queryOpts);
      if (!response.rows.length) {
        return [];
      }
      
      var docs = response.rows
        .map(function (row) {
          return row.doc;
        })
        .filter(doc => !filter || doc.tabs.some(t => filter.testObj(t, FILTER_PROPS)));
        
      if (docs.length) {
        return docs;
      }
      
      var lastDoc = response.rows[response.rows.length - 1].doc;
      queryOpts.startkey = [lastDoc.created, lastDoc._id];
    }
  };

  tabalanche.getSomeHistory = async function getSomeHistory(startKey = 'now', filter) {
    const LIMIT = 5;
    filter = filter && typeof filter === "string" ? compileFilter(filter) : filter;
    await tabgroupsReady;

    let isLastPage = false;

    if (startKey === "now") {
      const r = await tabgroups.changes({
        since: startKey,
        limit: LIMIT,
        descending: true,
      });

      if (r.results.length < LIMIT) {
        isLastPage = true;
      }

      await filterResult(r, filter);

      if (r.results.length) {
        return r.results;
      }

      if (isLastPage) {
        return [];
      }

      startKey = r.last_seq;
    }

    while (!isLastPage) {
      // FIXME: we can't use since and descending together
      // https://github.com/pouchdb/pouchdb/issues/8954
      const since = Math.max(startKey - LIMIT - 1, 0);
      const r = await tabgroups.changes({
        since,
        limit: LIMIT,
      });

      if (since === 0) {
        isLastPage = true;
      }

      r.results = r.results.filter(change => change.seq < startKey);
      r.results.reverse();
      r.last_seq = r.results.length ? r.results[r.results.length - 1].seq : startKey - LIMIT;

      await filterResult(r, filter);

      if (r.results.length) {
        return r.results;
      }

      if (isLastPage) {
        return [];
      }

      startKey = r.last_seq;
    }

    return [];
  };

  async function filterResult(r, filter) {
    // ignore design doc
    r.results = r.results.filter(change => !change.id.startsWith('_'));
    for (const change of r.results) {
      // fetch history
      const rev = change.changes[0].rev;
      const doc = await tabgroups.get(change.id, {rev, revs_info: true});
      // FIXME: if there are multiple changes to the same document, grabbing the previous rev won't work. hence we grab the oldest rev
      const previousRev = getPreviousRev(change.changes[0].rev, doc._revs_info, -1);
      const previousDoc = previousRev ? await tabgroups.get(change.id, {rev: previousRev}) : null;
      change.diff = diffTabs(previousDoc?.tabs || [], doc._deleted ? [] : doc.tabs);
      change.doc = doc;
      change.last_seq = r.last_seq;
    }

    r.results = r.results.filter(change => {
      if (!filter || [...change.diff.added, ...change.diff.removed].some(t => filter.testObj(t, FILTER_PROPS))) {
        return true;
      }
      return false;
    });

  }

  function diffTabs(oldTabs, newTabs) {
    const oldUrls = new Set(oldTabs.map(t => t.url));
    const newUrls = new Set(newTabs.map(t => t.url));
    const added = newTabs.filter(t => !oldUrls.has(t.url));
    const removed = oldTabs.filter(t => !newUrls.has(t.url));
    return {added, removed};
  }

  function getPreviousRev(rev, revs_info, index = 0) {
    const currentIndex = revs_info.findIndex(info => info.rev === rev);
    if (currentIndex === -1) {
      return null;
    }
    const infos = revs_info.slice(currentIndex + 1).filter(info => info.status === 'available');
    return index >= 0 ? infos[index]?.rev : infos[infos.length + index]?.rev;
  }

  tabalanche.getDB = function getDB() {
    return tabgroupsReady.then();
  };

  tabalanche.destroyAllTabGroups = async function destroyAllTabGroups() {
    if (syncHandler) {
      throw new Error('Cannot destroy all tab groups while syncing');
    }
    await tabgroups.destroy();
    initDB();
  };
  
  tabalanche.hasUrls = function (urls) {
    return tabgroupsReady.then(function () {
      return tabgroups.query('dashboard/by_tab_url', {keys: urls})
        .then(function (response) {
          var i, result = {};
          for (i = 0; i < response.rows.length; i++) {
            result[response.rows[i].key] = true;
          }
          return result;
        });
    });
  };
  
  tabalanche.totalTabs = async () => {
    // FIXME: https://github.com/pouchdb/pouchdb/issues/8626
    // await tabgroupsReady;
    // const result = await tabgroups.query('dashboard/total_tabs');
    // return result.rows[0]?.value || 0;
    return 0
  };
  
  tabalanche.sync = async url => {
    await tabgroupsReady;
    if (remoteUrl == url) return;
    remoteUrl = url;
    if (syncHandler) {
      syncHandler.cancel();
      syncHandler = null;
      remoteUrl = '';
    }
    if (!url) return;
    syncHandler = tabgroups.sync(remoteUrl, {
      live: true,
      retry: true,
    });
    syncHandler.on('change', info => {
      browser.runtime.sendMessage({event: "sync-change", info});
    });
  };

  tabalanche.removeTabs = async (id, tabs) => {
    await tabgroupsReady;
    return await tabgroups.upsert(id, doc => {
      const newTabs = [];
      // FIXME: this won't work if the same URL is in toRemove twice
      const toRemove = new Set(tabs.map(t => t.url));
      let touched = false;
      for (const tab of doc.tabs) {
        if (toRemove.has(tab.url)) {
          toRemove.delete(tab.url);
          touched = true;
          continue;
        }
        newTabs.push(tab);
      }
      if (!touched) {
        return;
      }
      if (newTabs.length) {
        doc.tabs = newTabs;
      } else {
        doc._deleted = true;
      }
      return doc;
    });
  };

  tabalanche.insertTabs = async (id, tabs) => {
    await tabgroupsReady;
    if (!id) {
      const doc = newTabGroupDoc();
      doc.tabs.push(...tabs);
      const response = await tabgroups.post(doc);
      browser.runtime.sendMessage({event: "new-tab-group", tabGroupId: response.id})
        .catch(console.warn);
      return response;
    }
    const response = await tabgroups.upsert(id, doc => {
      doc = newTabGroupDoc(doc);
      doc.tabs.push(...tabs);
      return doc;
    });
    // NOTE: we don't know if the id is new or not
    browser.runtime.sendMessage({event: "new-tab-group", tabGroupId: id})
      .catch(console.warn);
    return response;
  }

})();

