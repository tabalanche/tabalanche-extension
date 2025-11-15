/* global tabalanche platform */

var dumpTextArea = document.getElementById('dump');
var importButton = document.getElementById('import-button');
var importProgress = document.getElementById('import-progress');

function importDump() {
  var stashes = JSON.parse(dumpTextArea.value);

  importProgress.max = stashes.length;
  var imported = 0;
  importProgress.value = imported;
  importProgress.textContent = '0 / ' + stashes.length;

  importButton.hidden = true;
  importProgress.hidden = false;

  // TODO: import in bulk with bulkDocs
  for (var i = 0; i < stashes.length; i++) {
    tabalanche.importStash(stashes[i]).then(function(){
      importProgress.value = ++imported;
      importProgress.textContent = imported + ' / ' + stashes.length;
      if (imported == stashes.length) {
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
