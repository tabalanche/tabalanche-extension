/* global chrome tabalanche */

var tabGroupContainer = document.getElementById('tab-groups');

var tabGroupElems = new Map();

function populateTabList(listElement, tabs) {
  for (var j = 0; j < tabs.length; j++) {
    var tab = tabs[j];
    var tabIcon = document.createElement('img');
    tabIcon.className = 'tabicon';
    var tabDomain = tab.url &&
      tab.url.replace(/^https?:\/?\/?([^\/]*)\/.*/, '$1');
    tabIcon.src = tab.icon ||
      'https://www.google.com/s2/favicons?domain=' + tabDomain;
    var tabLink = document.createElement('a');
    var tabLi = document.createElement('li');
    tabLink.appendChild(tabIcon);
    tabLink.appendChild(document.createTextNode(' ' + tab.title));
    tabLink.href = tab.url;
    tabLi.appendChild(tabLink);
    listElement.appendChild(tabLi);
  }
}

function createTabGroupDiv(tabGroup) {
  var container = document.createElement('div');

  var name = document.createElement('h2');
  name.textContent = tabGroup.name;

  var list = document.createElement('ul');
  populateTabList(list, tabGroup.tabs);

  container.appendChild(name);
  container.appendChild(list);

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
