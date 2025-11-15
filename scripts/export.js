/* global tabalanche platform */

async function populateExportTextArea() {
  const dumpTextArea = document.getElementById('dump');

  if (window.migrating) await window.migrating;

  const stashes = await tabalanche.getAllStashes();

  for (const stash of stashes) {
    delete stash._rev;
  };

  dumpTextArea.value = JSON.stringify(stashes, null, 2);
}

populateExportTextArea();

var optslink = document.getElementById('options');

// Set href so this link works mostly like the others
optslink.href = platform.getOptionsURL();

// Perform platform-specific options opening on click anyway
optslink.addEventListener('click', function(evt) {
  platform.openOptionsPage();
  evt.preventDefault();
});
