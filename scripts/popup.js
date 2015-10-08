/* global platform tabalanche */

var windowStore;
var windowContext;

platform.currentWindowContext().then(function(store){
  windowStore = store;
  windowContext = windowStore.get();
  // TODO: Set / restore window state
});

function onclick(elementId,handler) {
  return document.getElementById(elementId)
    .addEventListener('click', handler);
}

onclick('stash-all', tabalanche.stashAllTabs);
onclick('stash-this', tabalanche.stashThisTab);
onclick('stash-other', tabalanche.stashOtherTabs);
onclick('stash-right', tabalanche.stashTabsToTheRight);
onclick('dash', function(evt) {
  open(platform.extensionURL('dashboard.html'), '_blank');
});
