/* global chrome tabalanche */

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
    return tuple[0].slice(0, prefix.length) == prefix;
  });
}

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

function matchDescription(text, tuple) {
  return '<match>' + escapeXml(text) + '</match>' +
    escapeXml(tuple[0].slice(0, text.length)) +
    ' <dim>' +  escapeXml(tuple[1]) + '</dim>';
}

function definiteIntent(possibilities) {
  var action = possibilities.reduce(function (n, m) {
    return n ? (n==m[2] ? n : true) : m[2];
  }, null);

  // flip our conflict sentinel value so it makes sense
  if (action === true) action = false;

  return action;
}

chrome.omnibox.onInputChanged.addListener(function(text, suggest) {
  var actions = matchingActions(text);
  if (definiteIntent(actions)) {
    chrome.omnibox.setDefaultSuggestion({
      description: matchDescription(text, actions[0])});
    actions = actions.slice(1);
  } else if (actions.length > 0) {
    chrome.omnibox.setDefaultSuggestion({
      description: '<match>' + escapeXml(text) +
      '</match> <dim>(ambiguous)</dim>'});
  } else {
    chrome.omnibox.setDefaultSuggestion({
      description: escapeXml(text) + ' <dim>(no match)</dim>'});
  }
  return suggest(actions.map(function (tuple) {
    return {content: tuple[0],
      description: matchDescription(text, tuple)};
  }));
});

chrome.omnibox.onInputEntered.addListener(function(text, disposition) {
  // Get unique action, or null if no action, or true if multiple actions
  var action = definiteIntent(matchingActions(text));

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
