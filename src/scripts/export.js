/* global tabalanche platform */

var dumpTextArea = document.getElementById('dump');

tabalanche.getAllTabGroups().then(function(tabGroups) {
  tabGroups.forEach(function(group) {
    delete group._rev;
  });
  dumpTextArea.value = JSON.stringify(tabGroups, null, 2);
});

var optslink = document.getElementById('options');

// Set href so this link works mostly like the others
optslink.href = platform.getOptionsURL();

// Perform platform-specific options opening on click anyway
optslink.addEventListener('click', function(evt) {
  platform.openOptionsPage();
  evt.preventDefault();
});

