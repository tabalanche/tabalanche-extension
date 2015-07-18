/* global tabalanche */

var dumpTextArea = document.getElementById('dump');

tabalanche.getAllTabGroups().then(function(tabGroups) {
  dumpTextArea.value = JSON.stringify(tabGroups, null, 2);
});
