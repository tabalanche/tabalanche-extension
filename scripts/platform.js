/* global eventEmitter */

var platform = {};
(function(){
  
const ee = eventEmitter();

Object.assign(platform, ee);

var optionDefaults = {
  ignorePinnedTabs: true,
  ignoreDuplicatedUrls: false,
  serverUrl: '',
  useSnapshotUI: isMobile(),
  useScreenshot: false
};

const localOptions = [
  'useSnapshotUI',
  'useScreenshot'
];

// exposed for the options page
platform.optionDefaults = optionDefaults;

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
  return browser.windows.getCurrent({populate: false})
    .then(function (crWindow) {
      prefix = 'wins_' + crWindow.id + '=';
      preLength = prefix.length;
      return iface;
    });
};

// clear window session cookies when the window is closed
if (browser.windows) {
  browser.windows.onRemoved.addListener(function (wid) {
    document.cookie = 'wins_' + wid + '=';
  });
}

platform.getWindowTabs = {};

async function getOptions() {
  const [syncOpts, localOpts] = await Promise.all([
    browser.storage.sync.get(optionDefaults),
    browser.storage.local.get(localOptions)
  ]);
  return Object.assign(syncOpts, localOpts);
}

platform.getOptions = getOptions;

platform.setOptions = async opts => {
  const syncOpts = {};
  const localOpts = {};
  for (const key in opts) {
    if (localOptions.includes(key)) {
      localOpts[key] = opts[key];
    } else {
      syncOpts[key] = opts[key];
    }
  }
  return await Promise.all([
    browser.storage.sync.set(syncOpts),
    browser.storage.local.set(localOpts)
  ]);
};

browser.storage.onChanged.addListener((changes, area) => {
  ee.emit('optionChange', changes, area);
});

function getRealUrl(tab) {
  if (tab.pendingUrl) {
    return tab.pendingUrl;
  }
  // FIXME: Firefox doesn't support pendingUrl but seems that we can get the url from title
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1620774
  // FIXME: Firefox android may return about:blank with undefined title for unloaded tabs
  if (tab.url === "about:blank" && tab.title) {
    // FIXME: when the title is a single word, it's treated as a domain
    // should we switch to linkify-plus-plus-core?
    const u = `https://${tab.title}`;
    if (isValidURL(u)) {
      return u;
    }
  }
}

function isValidURL(url) {
  try {
    new URL(url);
    return true;
  } catch (err) {
    return false;
  }
}

async function queryCurrentWindowTabs ({extensionPage = true, aboutBlank = true, ...params} = {}) {
  if (browser.windows) {
    params.currentWindow = true;
  }
  const tabs = await browser.tabs.query(params);
  for (const tab of tabs) {
    const realUrl = getRealUrl(tab);
    if (realUrl) {
      tab.url = realUrl;
    }
  }
  const prefix = browser.runtime.getURL('');
  return tabs.filter(tab => {
    if (!extensionPage && tab.url.startsWith(prefix)) {
      return false;
    }
    if (!aboutBlank && tab.url === 'about:blank') {
      return false;
    }
    return true;
  });
}

platform.queryCurrentWindowTabs = queryCurrentWindowTabs;

platform.getWindowTabs.all = function getAllWindowTabs(params = {}) {
  return getOptions().then(function (opts) {
    if (opts.ignorePinnedTabs) params.pinned = false;
    return queryCurrentWindowTabs(params);
  });
};

platform.getWindowTabs.highlighted = function getHighlightedWindowTabs() {
  return queryCurrentWindowTabs({highlighted: true});
};

platform.getWindowTabs.other = function getAllWindowTabs() {
  var params = {highlighted: false};
  return getOptions().then(function (opts) {
    if (opts.ignorePinnedTabs) params.pinned = false;
    return queryCurrentWindowTabs(params);
  });
};

platform.getWindowTabs.right = function getRightWindowTabs() {
  return queryCurrentWindowTabs({}).then(function (tabs) {
    var rightEdge = tabs.reduce(function (max, tab) {
      return tab.highlighted || tab.pinned
        ? Math.max(tab.index, max)
        : max;
    }, 0);
    return tabs.filter(function (tab) {
      return tab.index > rightEdge;
    });
  });
};

function tabIdMap(tab) {
  return tab.id;
}

platform.closeTabs = function closeTabs(tabs) {
  return browser.tabs.remove(tabs.map(tabIdMap));
};

// TODO: use Firefox native favicon
// see https://bugzilla.mozilla.org/show_bug.cgi?id=1315616
platform.faviconPath = !window.netscape ? 
  function faviconPath(url) {
    return 'chrome://favicon/' + url;
  } :
  url => {
    try {
      // This won't work with chrome://extensions/
      url = new URL(url);
      return `https://icons.duckduckgo.com/ip3/${url.hostname}.ico`;
    } catch (err) {
      return 'https://icons.duckduckgo.com/ip3/undefined.ico';
    }
  };

platform.extensionURL = function extensionURL(path) {
  return browser.extension.getURL(path);
};

platform.getOptionsURL = function getOptionsURL() {
  // TODO: Review newer options UI paradigm and revise this
  return 'chrome://extensions/?options=' + browser.runtime.id;
};

platform.openOptionsPage = browser.runtime.openOptionsPage;

platform.openDashboard = () => {
  return browser.tabs.create({url: platform.extensionURL('dashboard.html')});
}

platform.openTab = async ({link, openerTab, openerTabId = openerTab?.id, cookieStoreId, ...args}) => {
  if (isMobile() && link && !cookieStoreId) {
    // this allows users to return to the previous tab via backspace in kiwi browser
    const oldTarget = link.target;
    link.target = '_blank';
    link.click();
    link.target = oldTarget;
    return;
  }
  
  const options = {...args, cookieStoreId};
  // FIXME: https://bugzilla.mozilla.org/show_bug.cgi?id=1817806
  if (openerTabId && !/mobi.*firefox/i.test(navigator.userAgent)) {
    options.openerTabId = openerTabId;
  }
  try {
    return await browser.tabs.create(options);
  } catch (err) {
    if (/cookieStoreId/.test(err.message)) {
      delete options.cookieStoreId;
      return await browser.tabs.create(options);
    }
    throw err;
  }
};

// FIXME: this doesn't work in kiwi browser
// https://github.com/kiwibrowser/src.next/issues/425
// though Choromium doesn't support screenshot anyway
platform.hasScreenshotPermission = () =>
  browser.tabs.captureTab && browser.permissions.contains({
    origins: ['<all_urls>']
  });

// FIXME: this doesn't work in firefox android
// https://github.com/mozilla-mobile/fenix/issues/16912
// we need to build another manifest merging optional_permissions into permissions for firefox android
platform.requestScreenshotPermission = () => browser.permissions.request({
  origins: ['<all_urls>']
});

function isMobile() { return /mobi/i.test(navigator.userAgent) }

platform.isMobile = isMobile;

platform.isFirefox = () => /firefox/i.test(navigator.userAgent);

platform.isDashboardAvailable = async () => {
  const extensionTabs = await browser.tabs.query({url: [
    platform.extensionURL("dashboard.html"),
    platform.extensionURL("dashboard.html?*")
  ]});
  return extensionTabs.length > 0;
}

})();
