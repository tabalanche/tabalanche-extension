/* global tabalanche */

var dumpTextArea = document.getElementById('dump');

function importDump() {
  var tabGroups = JSON.parse(dumpTextArea.value);
  for (var i = 0; i < tabGroups.length; i++) {
    tabalanche.importTabGroup(tabGroups[i]);
  }
}

document.getElementById('import-button').addEventListener('click', importDump);
