/* global chrome */

var platform = {};
(function(){

platform.getCurrentWindowContext = function getCurrentWindowContext() {
  return new Promise(function(resolve, reject) {
    chrome.windows.getCurrent({populate: false}, function (crWindow) {
      return resolve(JSON.parse(sessionStorage.getItem(
        'windowcontext_' + crWindow.id) || '{}'));
    });
  });
};

platform.getWindowTabs = {};

function queryCurrentWindowTabs (params) {

  params.currentWindow = true;

  return new Promise(function(resolve) {
    chrome.storage.sync.get({
      ignorePinnedTabs: true,
      saveLinkIcons: true,
      saveDataIcons: false
    }, function(opts) {

      if (opts.ignorePinnedTabs) {
        params.pinned = false;
      }

      return chrome.tabs.query(params, function(tabs) {

        for (var i = 0; i < tabs.length; i++) {
          if (/^data:/.test(tabs[i].favIconUrl) ?
            !opts.saveDataIcons : !opts.saveLinkIcons) {

            tabs[i].favIconUrl = '';
          }
        }

        return resolve(tabs);
      });
    });
  });
}

function getAllWindowTabs() {
  return queryCurrentWindowTabs({});
}

platform.getWindowTabs.all = getAllWindowTabs;

function getHighlightedWindowTabs() {
  return queryCurrentWindowTabs({highlighted: true});
}

platform.getWindowTabs.highlighted = getHighlightedWindowTabs;

platform.getWindowTabs.other = function getAllWindowTabs() {
  return queryCurrentWindowTabs({highlighted: false});
};

platform.getWindowTabs.right = function getRightWindowTabs() {
  return getHighlightedWindowTabs().then(function(tabs) {
    var rightEdge = tabs.reduce(function(max, tab) {
      return Math.max(tab.index, max);
    }, 0);
    return getAllWindowTabs().then(function(tabs) {
      return tabs.filter(function(tab){
        return tab.index > rightEdge;
      });
    });
  });
};

function tabIdMap(tab) {
  return tab.id;
}

platform.closeTabs = function closeTabs(tabs) {
  return new Promise(function(resolve) {
    return chrome.tabs.remove(tabs.map(tabIdMap), resolve);
  });
};

platform.faviconPath = function faviconPath(url) {
  return 'chrome://favicon/' + url;
};

platform.extensionURL = function extensionURL(path) {
  return chrome.extension.getURL(path);
};

platform.openOptionsPage = chrome.runtime.openOptionsPage;

})();
