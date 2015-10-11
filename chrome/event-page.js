/* global chrome tabalanche */

chrome.commands.onCommand.addListener(function (command) {
  if (typeof tabalanche[command] == 'function') {
    tabalanche(command);
  }
});
