/* global tabalanche platform */

const HANDLE_MESSAGE = {
  "stash-all": () => {
    tabalanche.stashAllTabs();
    return false;
  },
  "stash-this": () => {
    tabalanche.stashThisTab();
    return false;
  },
  "stash-other": () => {
    tabalanche.stashOtherTabs();
    return false;
  },
  "stash-right": () => {
    tabalanche.stashTabsToTheRight();
    return false;
  },
  "stash-tabs": ({tabs}) => {
    tabalanche.stashTabs(tabs);
    return false;
  },
  "tab-count": () => tabalanche.totalTabs(),
  "open-dashboard": () => {
    platform.openDashboard();
    return false;
  },
  "get-tab-group": ({id}) => {
    return tabalanche.getTabGroup(id);
  },
  "remove-tabs": ({id, tabs}) => {
    return tabalanche.removeTabs(id, tabs);
  },
  "get-some-tab-groups": ({startKey, filter}) => {
    return tabalanche.getSomeTabGroups(startKey, filter);
  },
  "export-tabs": async () => {
    const docs = await tabalanche.getAllTabGroups();
    return JSON.stringify(docs, undefined, 2);
  },
  "import-tabs": async ({text}) => {
    const docs = JSON.parse(text);
    return tabalanche.importTabGroups(docs);
  },
  "destroy-db": () => tabalanche.destroyAllTabGroups()
}

if (chrome.commands) {
  chrome.commands.onCommand.addListener(function (command) {
    if (typeof tabalanche[command] == 'function') {
      tabalanche(command);
    }
  });
}

platform.on('optionChange', changes => {
  updateBrowserAction(changes);
  if (changes.serverUrl) {
    tabalanche.sync(changes.serverUrl.newValue);
  }
});

async function init() {
  const {serverUrl} = await platform.getOptions();
  tabalanche.sync(serverUrl);
}

init();

browser.runtime.onStartup.addListener(() => {
  updateBrowserAction();
});
browser.runtime.onInstalled.addListener(() => updateBrowserAction());

browser.browserAction.onClicked.addListener(tab => {
  handleBrowserAction(tab);
});

browser.runtime.onMessage.addListener(message => {
  if (HANDLE_MESSAGE[message.method]) {
    return HANDLE_MESSAGE[message.method](message);
  }
});

async function updateBrowserAction(changes) {
  if (!changes) {
    // NOTE: we have to use persistent background page to make this work
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1741865#c60
    changes = await platform.getOptions();
    for (const key in changes) {
      changes[key] = {newValue: changes[key]};
    }
  }
  if (!changes.useSnapshotUI) return;
  
  if (changes.useSnapshotUI.newValue) {
    browser.browserAction.setPopup({popup: ''});
  } else {
    browser.browserAction.setPopup({popup: 'popup.html'});
  }
}

function handleBrowserAction(tab) {
  platform.openTab({
    url: browser.runtime.getURL("popup.html"),
    openerTab: tab
  }).catch(console.error);
}

