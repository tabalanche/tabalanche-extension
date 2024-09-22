/* global platform cre */

let opts;

var ACTIONS = {
  'stash-all': true,
  'stash-this': true,
  'stash-other': true,
  'stash-right': true,
  'open-dashboard': true
};

for (const key in ACTIONS) {
  document.getElementById(key).addEventListener('click', () => {
    withLoader(() => browser.runtime.sendMessage({method: key}))
      .then(() => window.close())
      .catch(console.error);
  });
}

platform.getOptions().then(_opts => {
  opts = _opts;
  if (opts.useSnapshotUI) {
    initSnapshotUI();
  }
});

async function withLoader(cb) {
  document.body.classList.add('pending');
  try {
    return await cb();
  } finally {
    document.body.classList.remove('pending');
  }
}

async function initSnapshotUI() {
  document.body.classList.add('snapshot-ui-enabled');
  const tabs = (await platform.getWindowTabs.all({aboutBlank: false, extensionPage: false}))
    .map(createTabDiv);
  document.querySelector('#snapshot-ui').append(...tabs.map(t => t.el));
  
  document.querySelector('.stash-selection').addEventListener('click', async () => {
    await withLoader(() => 
      browser.runtime.sendMessage({
        method: 'stash-tabs',
        tabs: tabs.filter(t => t.selected()).map(t => t.tab)
      })
    );
    window.close();
  });
  
  document.querySelector('.invert-selection').addEventListener('click', () => {
    for (const tab of tabs) {
      tab.toggle();
    }
  });
  
  if (opts.useScreenshot && await platform.hasScreenshotPermission()) {
    for (const tab of tabs) {
      await tab.loadSnapshot();
    }
  } else {
    document.body.classList.add('snapshot-ui-no-snapshot');
  }

  // FIXME: we have to catch popstate event to close the tab on FF android
  if (platform.isFirefox() && platform.isMobile()) {
    onHistoryBack().then(() => window.close())
  }
}

function onHistoryBack() {
  return new Promise(resolve => {
    window.addEventListener('popstate', resolve);
    history.pushState(null, '');
  });
}

function createTabDiv(tab) {
  const title = tab.title || tab.url;
  const check = cre('input', {type: 'checkbox'});
  const container = cre('label.snapshot-ui-tab', [
    check,
    cre('div.snapshot-ui-tab-inner', [
      // NOTE: on firefox android, tab.title could be undefined when the tab is opened in the background and is not loaded..
      cre('div.tab-title', {title: tab.title}, [title]),
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
