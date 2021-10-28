/* global tabalanche */

if (chrome.commands) {
  chrome.commands.onCommand.addListener(function (command) {
    if (typeof tabalanche[command] == 'function') {
      tabalanche(command);
    }
  });
}

if (/mobi/i.test(navigator.userAgent)) {
  browser.browserAction.onClicked.addListener(tab => {
    const options = {
      url: browser.runtime.getURL("popup.html"),
      // FIXME: seems that this doesn't work on FF android
      openerTabId: tab.id
    };
    browser.tabs.create(options).catch(console.error);
  });
} else {
  browser.browserAction.setPopup({popup: 'popup.html'});
}
