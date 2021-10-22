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

var ACTIONS = {
  'stash-all': tabalanche.stashAllTabs,
  'stash-this': tabalanche.stashThisTab,
  'stash-other': tabalanche.stashOtherTabs,
  'stash-right': tabalanche.stashTabsToTheRight
};

for (const [key, fn] of Object.entries(ACTIONS)) {
  onclick(key, async () => {
    document.body.classList.add('pending');
    try {
      await fn();
    } finally {
      document.body.classList.remove('pending');
    }
    // FIXME: move db operation into background so it won't be interrupted when the popup is closed
    const opts = await platform.getOptions();
    await tabalanche.sync(opts.serverUrl);
  });
}

onclick('dash', function(evt) {
  open(platform.extensionURL('dashboard.html'), '_blank');
});
