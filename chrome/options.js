/* global platform tabalanche */

// Saves options to chrome.storage.sync.
async function save_options() {
  const opts = {};
  
  for (const key in platform.optionDefaults) {
    var input = document.getElementById(key);
    if (!input) continue;
    // right now this is the only input we have
    if (input.type == 'checkbox') {
      opts[key] = input.checked;
    } else if (input.type == 'text') {
      opts[key] = input.value;
    } else {
      throw new Error(`unknown input type ${input.type}`);
    }
  }
  
  await platform.setOptions(opts);
  
  // TODO: Update status to let user know options were saved.
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
async function restore_options() {
  const items = await platform.getOptions();
  for (const key in items) {
    var input = document.getElementById(key);
    if (!input) continue;
    
    if (input.type == 'checkbox') {
      input.checked = items[key];
    } else if (input.type == 'text') {
      input.value = items[key];
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

document.querySelector('#useScreenshot').addEventListener('click', e => {
  if (e.target.checked) {
    platform.requestScreenshotPermission();
  }
});
