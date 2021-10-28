/* global tabalanche platform */

if (chrome.commands) {
  chrome.commands.onCommand.addListener(function (command) {
    if (typeof tabalanche[command] == 'function') {
      tabalanche(command);
    }
  });
}

if (/mobi/i.test(navigator.userAgent)) {
  browser.browserAction.onClicked.addListener(tab => {
    platform.openTab({
      url: browser.runtime.getURL("popup.html"),
      openerTab: tab
    }).catch(console.error);
  });
} else {
  browser.browserAction.setPopup({popup: 'popup.html'});
}
