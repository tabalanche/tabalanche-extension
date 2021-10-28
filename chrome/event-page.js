/* global chrome tabalanche */

if (chrome.commands) {
  chrome.commands.onCommand.addListener(function (command) {
    if (typeof tabalanche[command] == 'function') {
      tabalanche(command);
    }
  });
}

if (/mobi/i.test(navigator.userAgent)) {
  browser.browserAction.onClicked.addListener(tab => {
    browser.tabs.create({
      url: browser.runtime.getURL("popup.html"),
      // doesn't work on firefox-android?
      // openerTabId: tab.id
    }).catch(console.error);
  });
} else {
  browser.browserAction.setPopup({popup: 'popup.html'});
}
