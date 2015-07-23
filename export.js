/* global tabalanche */

var dumpTextArea = document.getElementById('dump');

tabalanche.getAllTabGroups().then(function(tabGroups) {
  tabGroups.forEach(function(group) {
    delete group._rev;
  });
  dumpTextArea.value = JSON.stringify(tabGroups, null, 2);
});
