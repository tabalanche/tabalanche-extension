/* global chrome */

// Saves options to chrome.storage.sync.
function save_options() {
  var magicNewTab = document.getElementById('magicnewtab').checked;
  chrome.storage.sync.set({
    magicNewTab: magicNewTab
  }, function() {
    // Update status to let user know options were saved.
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  // Use default values.
  chrome.storage.sync.get({
    magicNewTab: true
  }, function(items) {
    document.getElementById('magicNewTab').checked = items.magicNewTab;
  });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click',
    save_options);
