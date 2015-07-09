/* global tabalanche */

var dumpTextArea = document.getElementById('dump');

tabalanche.getAllTabGroups(function(tabGroups) {
  dumpTextArea.value = JSON.stringify(tabGroups);
});
