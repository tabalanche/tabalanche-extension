/* global platform tabalanche */

var stashName = document.getElementById('stash-name');

var windowStore;
var windowContext;

platform.currentWindowContext().then(function(store){
  windowStore = store;
  windowContext = windowStore.get();
  if (stashName.value) {
    windowContext.name = stashName.value;
    windowStore.save(windowContext);
  } else if (windowContext.name) {
    stashName.value = windowContext.name;
  }
});

stashName.addEventListener('input', function(evt) {
  windowContext.name = stashName.value;
  windowStore.save(windowContext);
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
