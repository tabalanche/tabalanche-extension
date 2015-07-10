/* global chrome */

// Saves options to chrome.storage.sync.
function save_options() {
  var magicNewTab = document.getElementById('magicnewtab').checked;
  var saveIcons = document.getElementById('saveicons').checked;
  chrome.storage.sync.set({
    magicNewTab: magicNewTab,
    saveIcons: saveIcons
  }, function() {
    // Update status to let user know options were saved.
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  // Use default values.
  chrome.storage.sync.get({
    magicNewTab: true,
    saveIcons: true
  }, function(items) {
    document.getElementById('magicnewtab').checked = items.magicNewTab;
    document.getElementById('saveicons').checked = items.saveIcons;
  });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click',
    save_options);
