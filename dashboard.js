/* global chrome tabalanche cre */

var tabGroupContainer = document.getElementById('tab-groups');

var tabGroupElems = new Map();

var templateTabIcon = cre('img.tabicon');
var templateTabLink = cre('a.tablink');

function createTabListItem(tab) {
  var tabDomain = tab.url &&
    tab.url.replace(/^https?:\/?\/?([^\/]*)\/.*/, '$1');

  var tabIcon = cre(templateTabIcon, {src: tab.icon ||
    'https://www.google.com/s2/favicons?domain=' + tabDomain});

  var tabLink = cre(templateTabLink, {href: tab.url},
    [tabIcon, ' ' + tab.title]);

  return cre('li', [tabLink]);
}

var templateTabGroupContainer = cre('div.tabgroup');

function createTabGroupDiv(tabGroup) {
  var tabListItems = tabGroup.map(createTabListItem);

  var name = cre('h2', [tabGroup.name]);
  var list = cre('ul', tabListItems);

  var container = cre(templateTabGroupContainer, [name, list]);

  tabGroupContainer.appendChild(container);
  tabGroupElems.set(tabGroup._id, {
    container: container,
    list: list,
    name: name
  });
}

tabalanche.getAllTabGroups(function(tabGroups) {
  for (var i = 0; i < tabGroups.length; i++) {
    createTabGroupDiv(tabGroups[i]);
  }
});

document.getElementById('options').addEventListener('click', function(evt) {
  chrome.runtime.openOptionsPage();
});
