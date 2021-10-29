/* global tabalanche platform */

if (chrome.commands) {
  chrome.commands.onCommand.addListener(function (command) {
    if (typeof tabalanche[command] == 'function') {
      tabalanche(command);
    }
  });
}

platform.on('optionChange', updateBrowserAction, {runNow: true});

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
    browser.browserAction.onClicked.addListener(handleBrowserAction);
  } else {
    browser.browserAction.setPopup({popup: 'popup.html'});
    browser.browserAction.onClicked.removeListener(handleBrowserAction);
  }
}

function handleBrowserAction(tab) {
  platform.openTab({
    url: browser.runtime.getURL("popup.html"),
    openerTab: tab
  }).catch(console.error);
}
