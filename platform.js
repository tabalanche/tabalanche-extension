/* global chrome */

var platform = {};
(function(){

var defaultDataIconWhitelist = [];
var optionDefaults = {
  ignorePinnedTabs: true,
  saveLinkIcons: true,
  // the default for the whitelist value is 'null' so we know to skip ahead
  // and load the default list without going through the split/trim step
  dataIconWhitelist: null
};

// exposed for the options page
platform.optionDefaults = optionDefaults;
platform.defaultDataIconWhitelist = defaultDataIconWhitelist.join('\n');

platform.getCurrentWindowContext = function getCurrentWindowContext() {
  return new Promise(function(resolve, reject) {
    chrome.windows.getCurrent({populate: false}, function (crWindow) {
      return resolve(JSON.parse(sessionStorage.getItem(
        'windowcontext_' + crWindow.id) || '{}'));
    });
  });
};

platform.getWindowTabs = {};

function whitelistMatcher(whitelist) {
  whitelist = whitelist ?
    // For each line
    whitelist.split('\n')
      // remove indentation / whitespace-at-EOL
      .map(function(s){return s.trim})
      // remove blank lines and lines with comments
      .filter(function(s){return s && s[0] != '#'})
  : defaultDataIconWhitelist;

  // Quick shortcuts
  if (whitelist.length == 0) {
    return function(s) {return false;};
  // if global whitelisting has been enabled
  } else if (whitelist.indexOf('*') > -1) {
    return function(s) {return true;};
  }

  // any number of domain levels before this
  var arbitraryPrefix = '(?:[a-zA-Z0-9_-]*\\.)*';

  // Convert each item to a regex
  // TODO: handle paths
  for (var i = 0; i < whitelist.length; i++) {
    var prefix = whitelist[i].slice(0,2) == '*.' ? arbitraryPrefix : '';
    var item = prefix ? whitelist[i].slice(2) : whitelist[i];
    whitelist[i] = prefix + item.replace(/\./g, '\\.');
  }

  // it's okay to be this strict because we're comparing to normalized URLs
  var finalRegexp = new RegExp('^https?://(?:' + whitelist.join('|') + ')/');
  return function testWhitelistRegex(s) {
    return finalRegexp.test(s);
  };
}

function queryCurrentWindowTabs (params) {

  params.currentWindow = true;

  return new Promise(function(resolve) {
    chrome.storage.sync.get(optionDefaults, function(opts) {
      var isDataIconOkay = whitelistMatcher(opts.dataIconWhitelist);

      function filterTabData(tabs) {

        // For every tab in the list
        for (var i = 0; i < tabs.length; i++) {

          // If the favicon is one of the types we don't save
          if (/^chrome:/.test(tabs[i].favIconUrl) ||
            /^data:/.test(tabs[i].favIconUrl) ?
              !isDataIconOkay(tabs[i].url) : !opts.saveLinkIcons) {

            // Remove the favicon data
            tabs[i].favIconUrl = '';
          }
        }
        return tabs;
      }

      if (opts.ignorePinnedTabs) {
        params.pinned = false;
      }

      return chrome.tabs.query(params, function(tabs) {
        return resolve(filterTabData(tabs));
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

platform.getOptionsURL = function getOptionsURL() {
  return 'chrome://extensions/?options=' + chrome.runtime.id;
};

platform.openOptionsPage = chrome.runtime.openOptionsPage;

platform.openBackgroundTab = function openBackgroundTab(url) {
  return new Promise(function(resolve){
    return chrome.tabs.create({url: url, active: false}, resolve);
  });
};

})();
