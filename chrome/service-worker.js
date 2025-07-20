/* global chrome tabalanche */
importScripts("../vendor/pouchdb-5.0.0.js", "../scripts/tabalanche.js");

chrome.commands.onCommand.addListener(function (command) {
  if (typeof tabalanche[command] == 'function') {
    tabalanche(command);
  }
});
