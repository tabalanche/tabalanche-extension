/* eslint-env webextensions */
/* global platform cre */
/* global createSearchFilter createInfiniteLoader */

const searchFilter = createSearchFilter({
  el: document.querySelector('#search-field'),
  updateAt: 'submit',
  props: ['title', 'url']
});

let loader;

searchFilter.on('change', () => {
  if (loader) loader.uninit();
  const container = cre('div#loader-container');
  const oldContainer = document.querySelector('#loader-container');
  oldContainer.parentNode.replaceChild(container, oldContainer);
  loader = createInfiniteLoader({
    root: container,
    createElement: createDocDiv,
    getSome: lastDoc => browser.runtime.sendMessage({
      method: "get-some-history",
      startKey: lastDoc ? lastDoc.last_seq : 'now',
      filter: searchFilter.toString()
    }),
    key: doc => doc.created,
    id: doc => doc._id
  });
  loader.on('stateChange', onLoaderStateChange);
  loader.init();
}, {runNow: true});

var templateTabIcon = cre('img.tabicon');
var templateTabLink = cre('a.tablink', {target: '_blank'});
var templateTabListItem = cre('li.tablist-item');
var templateTabStash = cre('div.tabgroup.tabstash');
var templateTabList = cre('ul.tablist');

function createDocDiv(change) {
  function createTabListItem(tab) {
    var tabIcon = cre(templateTabIcon,
      {src: tab.icon || platform.faviconPath(tab.url)});

    const tabContainer = tab.container ?
      cre('span.tab-container', {style: {'background': tab.container.colorCode}}, tab.container.name) :
      "";

    var tabLink = cre(templateTabLink, {href: tab.url},
      [tabIcon, String(tab.title), tabContainer]);

    var listItem = cre(templateTabListItem, [tabLink]);
    
    var searchIncluded = searchFilter.testObj(tab);
    
    listItem.classList.toggle(
      'search-included', Boolean(!searchFilter.empty() && searchIncluded));
    listItem.classList.toggle(
      'search-excluded', Boolean(!searchFilter.empty() && !searchIncluded));
    
    return listItem;
  }

  const addedTabs = change.diff.added.map(createTabListItem);
  const removedTabs = change.diff.removed.map(createTabListItem);

  addedTabs.forEach(el => el.classList.add('tab-added'));
  removedTabs.forEach(el => el.classList.add('tab-removed'));

  var list = cre(templateTabList, [...addedTabs, ...removedTabs]);
  
  return {
    el: cre(templateTabStash, [list])
  };
}

var optslink = document.getElementById('options');

// Set href so this link works mostly like the others
optslink.href = platform.getOptionsURL();

// Perform platform-specific options opening on click anyway
optslink.addEventListener('click', function(evt) {
  platform.openOptionsPage();
  evt.preventDefault();
});

function onLoaderStateChange() {
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
