/* global chrome tabalanche */

function onclick(elementId,handler) {
  return document.getElementById(elementId)
    .addEventListener('click', handler);
}

onclick('stash', tabalanche.stashAllTabs);
onclick('dash', function(evt) {
  open(chrome.extension.getURL('dashboard.html'), '_blank');
});
