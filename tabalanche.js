/* global PouchDB chrome */

var tabalanche = {};
(function(){
  var tabgroups;
  var tabgroupsPromise = new PouchDB('tabgroups').then(function(db){
    tabgroups = db;
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
          name: sessionName || stashTime.toString(),
          created: stashTime.toISOString(),
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

  tabalanche.getAllTabGroups = function(cb) {
    whenDBReady(function(){
      tabgroups.allDocs({include_docs: true}).then(function(response){
        return cb(response.rows.map(function(row){return row.doc}));
      });
    });
  };

  tabalanche.addEventListener = function (name, cb) {
    if (name == 'dbready') {
      whenDBReady(cb);
    }
  };
})();
