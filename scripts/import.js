/* global tabalanche platform */

var dumpTextArea = document.getElementById('dump');

function importDump() {
  var tabGroups = JSON.parse(dumpTextArea.value);
  for (var i = 0; i < tabGroups.length; i++) {
    tabalanche.importTabGroup(tabGroups[i]);
  }
}

document.getElementById('import-button').addEventListener('click', importDump);

var optslink = document.getElementById('options');

// Set href so this link works mostly like the others
optslink.href = platform.getOptionsURL();

// Perform platform-specific options opening on click anyway
optslink.addEventListener('click', function(evt) {
  platform.openOptionsPage();
  evt.preventDefault();
});
