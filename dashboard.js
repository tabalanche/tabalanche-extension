/* global tabalanche */

var tabGroupContainer = document.getElementById('tab-groups');

tabalanche.getAllTabGroups(function(tabGroups) {
  for (var i = 0; i < tabGroups.length; i++) {
    var tabGroup = tabGroups[i];
    var groupContainer = document.createElement('div');
    var groupName = document.createElement('h2');
    groupName.textContent = tabGroup.name;
    var tabList = document.createElement('ul');
    for (var j = 0; j < tabGroup.tabs.length; j++) {
      var tab = tabGroup.tabs[j];
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
      tabList.appendChild(tabLi);
    }
    groupContainer.appendChild(groupName);
    groupContainer.appendChild(tabList);
    tabGroupContainer.appendChild(groupContainer);
  }
});
