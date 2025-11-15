/* global platform tabalanche cre */

var tabGroupContainer = document.getElementById('tab-groups');

var tabGroupData = new Map();

var templateTabIcon = cre('img.tabicon');
var templateTabLink = cre('a.tablink');
var templateTabListItem = cre('li.tablist-item');
var templateTabStash = cre('div.tabgroup.tabstash');
var templateFlap = cre('div.flap');
var templateTabList = cre('ul.tablist');

const loadingH1 = document.querySelector('footer h1');
const loadingH2 = document.querySelector('footer h2');

function updateSlowBanner() {
  const banner = localStorage.getItem("slowBanner");
  if (banner) {
    loadingH2.textContent = banner;
  }
  // if there's no banner, just don't touch the h2
  // (let the other functions set it, or let it be frozen)
}

let slowBannerTimer = null;

function watchSlowBanner() {
  if (!slowBannerTimer) {
    return slowBannerTimer = setInterval(updateSlowBanner,1000);
  }
}

function unwatchSlowBanner() {
  if (slowBannerTimer) {
    clearInterval(slowBannerTimer);
    slowBannerTimer = null;
  }
}

function getElementIndex(node) {
  var i = 0;
  while (node = node.previousElementSibling) ++i;
  return i;
}

function tabCountString(num) {
  return num + (num == 1 ? ' tab' : ' tabs');
}

// blame http://stackoverflow.com/q/20087368
function getLinkClickType(evt) {
  // Technically the click event is only supposed to fire for button 0,
  // but WebKit has shipped it for middle-click (button 1) for years.
  // See https://discourse.wicg.io/t/ui-events-wd-compliance/933/
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
  let pendingPutPromise = null;
  let pendingPutIsStale = false;

  function updateTabGroup() {
    async function putNewTabGroupDoc() {
      pendingPutIsStale = false;
      const db = await tabalanche.getDB();

      const action = tabGroupDoc.tabs.length > 0 ? 'put' : 'remove';
      return db[action](tabGroupDoc).then(function (result) {
        tabGroupDoc._rev = result.rev;
        if (pendingPutIsStale) {
          return putNewTabGroupDoc();
        } else {
          pendingPutPromise = null;
        }
      }, function(err) {
        if (err.name == 'conflict') {
          return db.get(tabGroupDoc._id)
          .then(function(newDoc) {
            tabGroupDoc._rev = newDoc._rev;
            return putNewTabGroupDoc();
          });
        }
      });

    }

    if (!pendingPutPromise) {
      pendingPutPromise = putNewTabGroupDoc();
    } else pendingPutIsStale = true;
    return pendingPutPromise;
  }

  var container;
  var tabCount = cre('span', [tabCountString(tabGroupDoc.tabs.length)]);

  function createTabListItem(tab) {
    var tabIcon = cre(templateTabIcon,
      {src: tab.icon || platform.faviconPath(tab.url)});

    var tabLink = cre(templateTabLink, {href: tab.url},
      [tabIcon, tab.title]);

    var listItem = cre(templateTabListItem, [tabLink]);

    tabLink.addEventListener('click', function(evt) {
      var type = getLinkClickType(evt);

      // we have a special behavior for normal-visiting
      if (type == 'visit') {
        platform.openBackgroundTab(tab.url);

        // We could technically do this stuff in a callback that only fires
        // once the background tab is opened, but then we'd run into issues
        // with the link getting clicked twice, or the tab group getting
        // updated before the link gets removed, or a bunch of issues it's
        // better to just not have to deal with.
        tabGroupDoc.tabs.splice(getElementIndex(listItem), 1);
        if (tabGroupDoc.tabs.length == 0) {
          container.remove();
        } else {
          listItem.remove();
          tabCount.textContent = tabCountString(tabGroupDoc.tabs.length);
        }
        updateTabGroup();

        evt.preventDefault();
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

  container = cre(templateTabStash, [flap, list]);

  tabGroupContainer.appendChild(container);
  tabGroupData.set(tabGroupDoc._id, {
    doc: tabGroupDoc,
    container: container,
    list: list,
    count: tabCount,
    name: name
  });
}

let lastTabGroup = null;
var loadingTabGroups = false;
var allTabGroupsLoaded = false;

function capTabGroupLoading() {
  allTabGroupsLoaded = true;
  // we can stop listening to load on scroll
  document.removeEventListener('scroll', loadMoreIfNearBottom);

  // don't need to check slowBanner any more
  clearInterval(slowBannerTimer);

  loadingH1.textContent = lastTabGroup ? "All stashes loaded" : "Nothing stashed (yet)";
  loadingH2.textContent = lastTabGroup ? "That's all, folks!"
    : "Import data or stash some tabs to get started"
}

function showLoadedTabGroups(tabGroups) {
  loadingTabGroups = false;
  for (var i = 0; i < tabGroups.length; i++) {
    createTabGroupDiv(tabGroups[i]);
  }
  if (tabGroups.length > 0) {
    lastTabGroup = tabGroups[tabGroups.length-1];

    // loadMoreIfNearBottom/loadMoreTabGroups will replace this
    // if/when relevant; unwatching slowBanner, however, we only
    // do if we're sure we're not still loading
    // (so as to not interrupt it, for politeness's sake)
    loadingH2.textContent = "Waiting for viewport to get this low";

    // in case there's still visible window, recurse
    return loadMoreIfNearBottom();
  } else {
    return capTabGroupLoading();
  }
}

function loadMoreTabGroups() {

  // this function gets called unconditionally by the scroll handler
  // whenever the page gets low, so we winnow the load down to
  // one call at a time (if necessary at all) here
  if (!loadingTabGroups && !allTabGroupsLoaded) {
    loadingTabGroups = true;

    loadingH2.textContent = "Getting more stashes";
    watchSlowBanner();

    // Get the next groups
    tabalanche.getSomeTabGroups(lastTabGroup._id)
      .then(showLoadedTabGroups);
  }
}

// Get the first groups
// Note that delays like migration etc. will replace this via slowBanner
// TODO: jump to a specific point if in the fragment (is that doable?)
loadingH2.textContent = "Getting latest stashes";
watchSlowBanner();
tabalanche.getSomeTabGroups().then(showLoadedTabGroups);

// How many viewport-heights from the bottom of the page we should be
// before loading more tabs; half the window seems reasonable.
var loadMoreMargin = 1/2;

function loadMoreIfNearBottom() {
  var bottomOffset = window.innerHeight * (1 + loadMoreMargin);
  var scrollTop = window.scrollY;
  var scrollHeight = document.documentElement.scrollHeight;

  if (scrollTop + bottomOffset >= scrollHeight) {
    loadMoreTabGroups();

  } else {
    // don't need to watch slow banner until we scroll that low
    unwatchSlowBanner();
  }
}

document.addEventListener('scroll', loadMoreIfNearBottom);

var optslink = document.getElementById('options');

// Set href so this link works mostly like the others
optslink.href = platform.getOptionsURL();

// Perform platform-specific options opening on click anyway
optslink.addEventListener('click', function(evt) {
  platform.openOptionsPage();
  evt.preventDefault();
});
