/* global chrome */

var platform = {};
(function(){

// The list of default domains to save favicons for.
// By default, the list is empty (all domains are considered to be better
// tracked by the browser's favicon mechanism).
var defaultIconSavingWhitelist = [];

var optionDefaults = {
  ignorePinnedTabs: true,
  saveLinkIcons: true,
  // the default for the whitelist value is 'null' so we know to skip ahead
  // and load the default list without going through the split/trim step
  iconSavingWhitelist: null
};

// exposed for the options page
platform.optionDefaults = optionDefaults;
platform.defaultIconSavingWhitelist = defaultIconSavingWhitelist.join('\n');

platform.currentWindowContext = function currentWindowContext() {
  var prefix, preLength;

  // Yes, really. We save window state using document.cookie. That is the
  // *only mechanism* we have for saving window state. IKR, it's 2015, WTF.
  // It's this, or have a persistent background page that we query with
  // postMessage, or try to maintain a window context store using a mechanism
  // like localStorage that is persistent *across reboots* (which doesn't crash
  // cleanly and would generally be even crazier than cookies).
  // See http://discourse.wicg.io/t/cross-window-session-storage/943

  function getContext() {
    var cookies = document.cookie.split(/;\s*/g);
    for (var i = 0; i < cookies.length; i++) {
      if (cookies[i].slice(0,preLength) == prefix) {
        return JSON.parse(decodeURIComponent(cookies[i].slice(preLength)));
      }
    }
    return {};
  }

  function setContext(ctx) {
    document.cookie = prefix + encodeURIComponent(JSON.stringify(ctx));
  }

  var iface = {get: getContext, set: setContext};
  return new Promise(function(resolve, reject) {
    chrome.windows.getCurrent({populate: false}, function (crWindow) {
      prefix = 'wins_' + crWindow.id + '=';
      preLength = prefix.length;
      return resolve(iface);
    });
  });
};

// clear window session cookies when the window is closed
chrome.windows.onRemoved.addListener(function (wid) {
  document.cookie = 'wins_' + wid + '=';
});

platform.getWindowTabs = {};

function listItems(listText) {
  // For each line
  return listText.split('\n')
    // remove indentation / whitespace-at-EOL
    .map(function(s){return s.trim()})
    // remove blank lines and lines with comments
    .filter(function(s){return s && s[0] != '#'});
}

function globListMatcher(globList) {

  // Quick shortcuts
  if (globList.length == 0) {
    return function(s) {return false;};
  // if global whitelisting has been enabled
  } else if (globList.indexOf('*') > -1) {
    return function(s) {return true;};
  }

  // any number of domain levels before this
  var arbitraryPrefix = '(?:[a-zA-Z0-9_-]*\\.)*';

  // Convert each item to a regex
  // TODO: handle paths
  for (var i = 0; i < globList.length; i++) {
    var prefix = globList[i].slice(0,2) == '*.' ? arbitraryPrefix : '';
    var item = prefix ? globList[i].slice(2) : globList[i];
    globList[i] = prefix + item.replace(/\./g, '\\.');
  }

  // it's okay to be this strict because we're comparing to normalized URLs
  var finalRegexp = new RegExp('^https?://(?:' + globList.join('|') + ')/');
  return function testWhitelistRegex(s) {
    return finalRegexp.test(s);
  };
}

function queryCurrentWindowTabs (params) {

  params.currentWindow = true;

  return new Promise(function(resolve) {
    chrome.storage.sync.get(optionDefaults, function(opts) {
      var shouldSaveIcon = globListMatcher(
        opts.iconSavingWhitelist
        ? listItems(opts.iconSavingWhitelist)
        : defaultIconSavingWhitelist);

      function savedTabInfo(tab) {
        var tabDoc = {
          url: tab.url,
          title: tab.title
        };

        if (shouldSaveIcon(tab.url)) tabDoc.icon = tab.favIconUrl;

        return tabDoc;
      }

      // Ignore pinned tabs (when set), except for highlighted tab queries
      // (because you don't *inadvertently* highlight pinned tabs)
      if (opts.ignorePinnedTabs && !params.highlighted) {
        params.pinned = false;
      }

      return chrome.tabs.query(params, function(tabs) {
        return resolve(tabs.map(savedTabInfo));
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
