/* global platform tabalanche cre */

var windowStore;
var windowContext;

// platform.currentWindowContext().then(function(store){
  // windowStore = store;
  // windowContext = windowStore.get();
  // TODO: Set / restore window state
// });

var ACTIONS = {
  'stash-all': () => withLoader(tabalanche.stashAllTabs).then(sync),
  'stash-this': () => withLoader(tabalanche.stashThisTab).then(sync),
  'stash-other': () => withLoader(tabalanche.stashOtherTabs).then(sync),
  'stash-right': () => withLoader(tabalanche.stashTabsToTheRight).then(sync),
  'dash': () => {
    open(platform.extensionURL('dashboard.html'), '_blank');
    if (/mobi/i.test(navigator.userAgent)) window.close();
  }
};

for (const key in ACTIONS) {
  document.getElementById(key).addEventListener('click', ACTIONS[key]);
}

if (/mobi/i.test(navigator.userAgent)) {
  initSnapshotUI();
}

async function withLoader(cb) {
  document.body.classList.add('pending');
  try {
    return await cb();
  } finally {
    document.body.classList.remove('pending');
  }
}

async function sync() {
  // FIXME: move db operation into background so it won't be interrupted when the popup is closed
  const opts = await platform.getOptions();
  await tabalanche.sync(opts.serverUrl);
}

async function initSnapshotUI() {
  document.body.classList.add('snapshot-ui-enabled');
  const tabs = (await platform.getWindowTabs.all())
    .filter(t => !t.url.startsWith(browser.runtime.getURL('')))
    .map(createTabDiv);
  document.querySelector('#snapshot-ui').append(...tabs.map(t => t.el));
  
  document.querySelector('.stash-selection').addEventListener('click', async () => {
    await withLoader(() => 
      tabalanche.stashTabs(
        tabs.filter(t => t.selected())
          .map(t => t.tab)
      )
    );
    await sync();
    window.close();
  });
  
  document.querySelector('.invert-selection').addEventListener('click', () => {
    for (const tab of tabs) {
      tab.toggle();
    }
  });
  
  if (await browser.permissions.contains({
    origins: ["<all_urls>"]
  })) {
    for (const tab of tabs) {
      await tab.loadSnapshot();
    }
  } else {
    document.body.classList.add('snapshot-ui-no-snapshot');
  }
}

function createTabDiv(tab) {
  const check = cre('input', {type: 'checkbox'});
  const container = cre('label.snapshot-ui-tab', [
    check,
    cre('div.snapshot-ui-tab-inner', [
      cre('div.tab-title', {title: tab.title}, [tab.title]),
      cre('div.tab-url', {title: tab.url}, [tab.url]),
      cre('img.tab-snapshot')
    ])
  ]);
  return {
    el: container,
    selected: () => check.checked,
    toggle: (state = !check.checked) => check.checked = state,
    loadSnapshot,
    tab
  };
  
  async function loadSnapshot() {
    let src;
    try {
      src = await browser.tabs.captureTab(tab.id);
    } catch (err) {
      console.error(err);
      console.error(`failed capturing tab: ${tab.id}`);
      return;
    }
    container.querySelector('.tab-snapshot').src = src;
  }
}
