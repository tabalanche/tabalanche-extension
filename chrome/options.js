/* global chrome platform */

var boundInputs = [
  {id: 'ignorepin', opt: 'ignorePinnedTabs'},
];

// Saves options to chrome.storage.sync.
function save_options() {
  var opts = {};
  for (var i = 0; i < boundInputs.length; i++) {
    var input = document.getElementById(boundInputs[i].id);
    // right now this is the only input we have
    if (input.type == 'checkbox') {
      opts[boundInputs[i].opt] = input.checked;
    }
  }

  chrome.storage.sync.set(opts, function() {
    // Update status to let user know options were saved.
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  chrome.storage.sync.get(platform.optionDefaults, function(items) {
    for (var i = 0; i < boundInputs.length; i++) {
      var input = document.getElementById(boundInputs[i].id);
      if (input.type == 'checkbox') {
        input.checked = items[boundInputs[i].opt];
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
