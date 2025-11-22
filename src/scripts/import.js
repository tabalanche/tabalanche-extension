/* global tabalanche platform */

var dumpTextArea = document.getElementById('dump');
var importButton = document.getElementById('import-button');
var importProgress = document.getElementById('import-progress');

function importDump() {
  var tabGroups = JSON.parse(dumpTextArea.value);

  importProgress.max = tabGroups.length;
  var imported = 0;
  importProgress.value = imported;
  importProgress.textContent = '0 / ' + tabGroups.length;

  importButton.hidden = true;
  importProgress.hidden = false;

  for (var i = 0; i < tabGroups.length; i++) {
    tabalanche.importTabGroup(tabGroups[i]).then(function(){
      importProgress.value = ++imported;
      importProgress.textContent = imported + ' / ' + tabGroups.length;
      if (imported == tabGroups.length) {
        importButton.textContent = 'Import complete';
        importButton.hidden = false;
        importProgress.hidden = true;
      }
    });
  }
}

importButton.addEventListener('click', importDump);

var optslink = document.getElementById('options');

// Set href so this link works mostly like the others
optslink.href = platform.getOptionsURL();

// Perform platform-specific options opening on click anyway
optslink.addEventListener('click', function(evt) {
  platform.openOptionsPage();
  evt.preventDefault();
});
