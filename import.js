/* global tabalanche */

var dumpTextArea = document.getElementById('dump');

document.getElementById('import-button').addEventListener(function(evt) {
  var tabGroups = JSON.parse(dumpTextArea.value);
  for (var i = 0; i < tabGroups.length; i++) {
    tabalanche.importTabGroup(tabGroups[i]);
  }
});
