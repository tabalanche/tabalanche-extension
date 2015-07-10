/* global chrome tabalanche */

chrome.omnibox.setDefaultSuggestion({
  description:'<dim>command</dim>'});

var actions = [
  ['stash', '(this tab)', tabalanche.stashThisTab],
  ['stash tab', '(this tab)', tabalanche.stashThisTab],
  ['stash this', '(tab)', tabalanche.stashThisTab],
  ['stash other', '(tabs in this window)', tabalanche.stashOtherTabs],
  ['stash all', '(tabs in this window)', tabalanche.stashAllTabs],
  ['stash window', '(tabs in this window)', tabalanche.stashAllTabs],
  ['stash rest', '(tabs to the right)', tabalanche.stashTabsToTheRight],
  ['stash right', '(tabs to the right)', tabalanche.stashTabsToTheRight],
];

function matchingActions(prefix) {
  return actions.filter(function (tuple) {
    return tuple.slice(0, prefix.length) == prefix;
  });
}

chrome.omnibox.onInputChanged.addListener(function(text, suggest) {
  return matchingActions(text).map(function (tuple) {
    return {content: tuple[0],
      description: tuple[0] + ' <dim>' +  tuple[1] + '</dim>'};
  });
});

chrome.omnibox.onInputEntered.addListener(function(text, disposition) {
  // Get unique action, or null if no action, or true if multiple actions
  var action = matchingActions(text).reduce(function (n, m) {
    return n ? (n==m[2] ? n : true) : m[2];
  }, null);
  // if there was only one action
  if (action && action !== true) {
    // do it
    action();
  }
});

chrome.commands.onCommand.addListener(function (command) {
  if (typeof tabalanche[command] == 'function') {
    tabalanche(command);
  }
});
