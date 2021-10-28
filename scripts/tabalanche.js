/* global PouchDB platform emit eventEmitter */

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

  var tabgroups = new PouchDB('tabgroups');
  var tabgroupsReady = ensureCurrentDesignDoc(tabgroups, dashboardDesignDoc);

  function stashTabs(tabs) {
    // ignore extension pages
    var extensionPrefix = platform.extensionURL('');
    tabs = tabs.filter(function (tab) {
      return !tab.url.startsWith(extensionPrefix);
    });
    if (!tabs.length) {
      throw new Error('No tabs to save');
    }
    return Promise.all([
      browser.windows && platform.currentWindowContext(),
      tabgroupsReady,
      platform.getOptions().then(function (opts) {
        if (opts.ignoreDuplicatedUrls) {
          return tabalanche.hasUrls(tabs.map(function (tab) {return tab.url;}));
        }
      })
    ]).then(function (result) {
      // FIXME: what does `store` do?
      // var store = result[0]
      const dupTabs = result[2] || {};
      
      var stashTime = new Date();
        
      function stashedTab(tab) {
        return {
          url: tab.url,
          title: tab.title,
        };
      }
      var tabGroupDoc = {
        created: stashTime.getTime(),
        tabs: []
      };
      
      var i;
      for (i = 0; i < tabs.length; i++) {
        if (!dupTabs[tabs[i].url]) {
          dupTabs[tabs[i].url] = true;
          tabGroupDoc.tabs.push(stashedTab(tabs[i]));
        }
      }
      
      if (!tabGroupDoc.tabs.length) {
        // FIXME: should we just close these tabs without posting a new doc?
        throw new Error('The tab group has no tab');
      }
      
      return tabgroups.post(tabGroupDoc).then(function(response) {
        platform.closeTabs(tabs);
        // FIXME: this won't trigger the listener in the same frame
        chrome.runtime.sendMessage({type: 'newTabGroup', tabGroupId: response.id});
        return platform.queryCurrentWindowTabs({url: extensionPrefix + '*'})
          .then(function (extensionTabs) {
            if (!extensionTabs.length) {
              var dashboard = platform.extensionURL('dashboard.html');
              open(dashboard + '#' + response.id, '_blank');
            }
          });
      });
    });
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
          .filter(doc => !filter || doc.tabs.some(filter.testObj));
          
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
    await tabgroupsReady;
    const result = await tabgroups.query('dashboard/total_tabs');
    return result.rows[0]?.value || 0;
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
    syncHandler.on('change', info => tabalanche.emit('syncChange', info));
  };
})();
