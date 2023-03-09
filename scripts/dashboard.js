/* eslint-env webextensions */
/* global platform cre */
/* global createSearchFilter createInfiniteLoader */

const searchFilter = createSearchFilter({
  el: document.querySelector('#search-field'),
  updateAt: 'submit',
  props: ['title', 'url']
});

let loader;
const pCurrentTab = browser.tabs.getCurrent();

searchFilter.on('change', () => {
  if (loader) loader.uninit();
  const container = cre('div#tab-groups');
  const oldContainer = document.querySelector('#tab-groups');
  oldContainer.parentNode.replaceChild(container, oldContainer);
  loader = createInfiniteLoader({
    root: container,
    createElement: createTabGroupDiv,
    getSome: lastDoc => browser.runtime.sendMessage({
      method: "get-some-tab-groups",
      startKey: lastDoc ? [lastDoc.created, lastDoc._id] : null,
      filter: searchFilter.toString()
    }),
    key: doc => doc.created,
    id: doc => doc._id
  });
  loader.on('stateChange', updateState);
  loader.init();
}, {runNow: true});

async function updateTotalTabs() {
  const totalTabsContainer = document.getElementById('total-tabs');
  const count = await browser.runtime.sendMessage({method: "tab-count"});
  totalTabsContainer.textContent = tabCountString(count);
}

updateTotalTabs();

var templateTabButton = cre('button.tabbutton', ['x']);
var templateTabIcon = cre('img.tabicon');
var templateTabLink = cre('a.tablink');
var templateTabListItem = cre('li.tablist-item');
var templateTabStash = cre('div.tabgroup.tabstash');
var templateFlap = cre('div.flap');
var templateTabList = cre('ul.tablist');

function getElementIndex(node) {
  var i = 0;
  while ((node = node.previousElementSibling)) ++i;
  return i;
}

function tabCountString(num) {
  return num + (num == 1 ? ' tab' : ' tabs');
}

// blame http://stackoverflow.com/q/20087368
function getLinkClickType(evt) {
  if (!evt.isTrusted) return 'ignore';
  
  // Technically the click event is only supposed to fire for button 0,
  // but WebKit has shipped it for middle-click (button 1) for years.
  // See http://specifiction.org/t/fixing-the-click-event-in-browsers/933
  if (evt.button == 1 ||
    evt.button === 0 && (evt.ctrlKey || evt.shiftKey || evt.metaKey)) {
    return 'new';

  // If the primary button triggered the click with no modifier keys
  } else if (evt.button === 0) {
    return 'visit';

  // We are *really* not supposed to get here
  } else {
    return 'other';
  }
}

function createTabGroupDiv(tabGroupDoc) {
  var tabCount = cre('span', [tabCountString(tabGroupDoc.tabs.length)]);
  
  function createTabListItem(tab) {
    var tabButton = cre(templateTabButton, {type: 'button'});
    
    var tabIcon = cre(templateTabIcon,
      {src: tab.icon || platform.faviconPath(tab.url)});

    var tabLink = cre(templateTabLink, {href: tab.url},
      [tabIcon, tab.title]);

    var listItem = cre(templateTabListItem, [tabButton, tabLink]);
    
    var searchIncluded = searchFilter.testObj(tab);
    
    listItem.classList.toggle(
      'search-included', Boolean(!searchFilter.empty() && searchIncluded));
    listItem.classList.toggle(
      'search-excluded', Boolean(!searchFilter.empty() && !searchIncluded));
    
    function removeTabListItem() {
      // We could technically do this stuff in a callback that only fires
      // once the background tab is opened, but then we'd run into issues
      // with the link getting clicked twice, or the tab group getting
      // updated before the link gets removed, or a bunch of issues it's
      // better to just not have to deal with.
      var index = getElementIndex(listItem);
      const removedTabs = tabGroupDoc.tabs.splice(index, 1);
      if (tabGroupDoc.tabs.length == 0 || isExcludedBySearch(index)) {
        loader.delete(tabGroupDoc._id);
        // container.remove();
      } else {
        listItem.remove();
        tabCount.textContent = tabCountString(tabGroupDoc.tabs.length);
      }
      browser.runtime.sendMessage({
        method: "remove-tabs",
        id: tabGroupDoc._id,
        tabs: removedTabs
      })
        .then(updateTotalTabs);
    }
    
    tabButton.addEventListener('click', function(evt) {
      var type = getLinkClickType(evt);
      
      if (type == 'visit') {
        removeTabListItem();
        
        evt.preventDefault();
      }
    });

    tabLink.addEventListener('click', async function(evt) {
      var type = getLinkClickType(evt);

      // we have a special behavior for normal-visiting
      if (type == 'visit') {
        evt.preventDefault();
        
        platform.openTab({
          link: tabLink,
          url: tab.url,
          active: false,
          openerTab: await pCurrentTab
        });
        
        removeTabListItem();
      }
    });

    return listItem;
  }

  var tabListItems = tabGroupDoc.tabs.map(createTabListItem);

  var nameString = tabGroupDoc.name ||
    new Date(tabGroupDoc.created).toLocaleString();

  var className = tabGroupDoc.name ? 'explicit-name' : 'implicit-name';

  var name = cre('h3', {className: className}, [nameString]);
  var details = cre('h4', [tabCount]);
  var hgroup = cre('hgroup', [name, details]);
  var flap = cre(templateFlap, [hgroup]);
  var list = cre(templateTabList, tabListItems);
  
  function isExcludedBySearch(removedIndex) {
    if (searchFilter.empty()) {
      return false;
    }
    var i;
    for (i = 0; i < list.children.length; i++) {
      if (i != removedIndex && list.children[i].classList.contains('search-included')) {
        return false;
      }
    }
    return true;
  }

  return {
    el: cre(templateTabStash, [flap, list])
  };
}

async function addTabGroup(id) {
  const doc = await browser.runtime.sendMessage({method: "get-tab-group", id});
  if (doc.tabs.some(t => searchFilter.testObj(t))) {
    await loader.add(doc);
    if (!loader.items.length) {
      loader.init();
    }
  }
}

var optslink = document.getElementById('options');

// Set href so this link works mostly like the others
optslink.href = platform.getOptionsURL();

// Perform platform-specific options opening on click anyway
optslink.addEventListener('click', function(evt) {
  platform.openOptionsPage();
  evt.preventDefault();
});

const HANDLE_EVENT = {
  "new-tab-group": e => {
    addTabGroup(e.tabGroupId);
    updateTotalTabs();
  },
  "sync-change": ({info}) => {
    if (info.direction !== 'pull') return;
    console.log(info);
    info.change.docs.forEach(d => {
      if (d._id[0] !== '_') {
        if (d._deleted) {
          loader.delete(d._id);
        } else {
          addTabGroup(d._id);
        }
      }
    });
    updateTotalTabs();
  }
}

chrome.runtime.onMessage.addListener(function (e) {
  if (HANDLE_EVENT[e.event]) {
    return HANDLE_EVENT[e.event](e);
  }
});

function updateState() {
  const span = document.querySelector('#loader-state');
  switch (loader.state()) {
    case 'loading':
      span.textContent = 'Loading...';
      break;
    case 'complete':
      span.textContent = 'You have reached the end of the stack';
      break;
    case 'pause':
      span.textContent = 'Scroll down to load more';
      break;
    default:
      throw new Error(`unknown loader.state: ${loader.state()}`);
  }
}
