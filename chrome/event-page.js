/* global tabalanche platform */

if (chrome.commands) {
  chrome.commands.onCommand.addListener(function (command) {
    if (typeof tabalanche[command] == 'function') {
      tabalanche(command);
    }
  });
}

platform.on('optionChange', updateBrowserAction, {runNow: true});

// https://bugzilla.mozilla.org/show_bug.cgi?id=1791279
browser.browserAction.onClicked.addListener(async tab => {
  const {useSnapshotUI} = await platform.getOptions();
  if (useSnapshotUI) {
    handleBrowserAction(tab);
  } else {
    browser.browserAction.setPopup({popup: 'popup.html'});
    browser.browserAction.openPopup();
  }
});

async function updateBrowserAction(changes) {
  if (!changes) {
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
