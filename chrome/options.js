/* global platform tabalanche */

var boundInputs = [
  {id: 'ignorepin', opt: 'ignorePinnedTabs'},
  {id: 'ignoredupurl', opt: 'ignoreDuplicatedUrls'},
  {id: 'serverurl', opt: 'serverUrl'}
];

// Saves options to chrome.storage.sync.
function save_options() {
  var opts = {};
  for (var i = 0; i < boundInputs.length; i++) {
    var input = document.getElementById(boundInputs[i].id);
    // right now this is the only input we have
    if (input.type == 'checkbox') {
      opts[boundInputs[i].opt] = input.checked;
    } else if (input.type == 'text') {
      opts[boundInputs[i].opt] = input.value;
    } else {
        throw new Error(`unknown input type ${input.type}`);
      }
  }

  chrome.storage.sync.set(opts, function() {
    // Update status to let user know options were saved.
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
async function restore_options() {
  const items = await platform.getOptions();
  for (var i = 0; i < boundInputs.length; i++) {
    var input = document.getElementById(boundInputs[i].id);
    if (input.type == 'checkbox') {
      input.checked = items[boundInputs[i].opt];
    } else if (input.type == 'text') {
      input.value = items[boundInputs[i].opt];
    } else {
      throw new Error(`unknown input type ${input.type}`);
    }
  }
}

var advancedDiv = document.getElementById('advanced');
var advancedLink = document.getElementById('show-advanced');

advancedLink.addEventListener('click', function () {
  if (advancedDiv.hidden) {
    advancedDiv.hidden = false;
    advancedLink.textContent = 'Hide advanced options...';
  } else {
    advancedDiv.hidden = true;
    advancedLink.textContent = 'Show advanced options...';
  }
});

var destroyButton = document.getElementById('destroy');

destroyButton.addEventListener('click',
  tabalanche.destroyAllTabGroups);

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);

const enableSnapshot = document.querySelector('#enableSnapshot');
if (/mobi/i.test(navigator.userAgent)) {
  enableSnapshot.hidden = true;
}
platform.hasAllUrlsPermission()
  .then(ok => {
    if (ok) {
      enableSnapshot.hidden = true;
    }
    enableSnapshot.addEventListener('click', async () => {
      console.log('requesting permission');
      let ok = false;
      try {
        ok = await browser.permissions.request({origins: ['<all_urls>']});
      } catch (err) {
        console.error(err);
      }
      console.log(ok);
      if (ok) {
        enableSnapshot.hidden = true;
      }
    });
  });
