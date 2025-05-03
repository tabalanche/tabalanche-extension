/* global platform */

const saveStatus = document.querySelector("#save-status");

// Saves options to chrome.storage.sync.
async function save_options() {
  saveStatus.textContent = "Saving..."
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

  try {

    if (opts.serverUrl) {
      const r = await browser.permissions.request({
        origins: [urlToMatchPattern(opts.serverUrl)]
      })
      if (!r) {
        throw new Error("Failed granting permission for ${opts.serverUrl}")
      }
    }
    
    await platform.setOptions(opts);
    saveStatus.textContent = "Saved";
  } catch (err) {
    saveStatus.textContent = `Error: ${String(err)}`;
  }
  
}

function urlToMatchPattern(s) {
  const u = new URL(s);
  return `${u.protocol}//${u.hostname}${u.pathname}*`
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

document.addEventListener('DOMContentLoaded', restore_options);

const importStatus = document.querySelector("#import-status");
const exportStatus = document.querySelector("#export-status");

const ACTIONS = {
  "destroy": () => browser.runtime.sendMessage({
    method: "destroy-db"
  }),
  "save": save_options,
  "import-tabs": () => importTabs().catch(err => {
    importStatus.textContent = String(err);
  }),
  "export-tabs": () => exportTabs().catch(err => {
    exportStatus.textContent = String(err);
  }),
};

for (const key in ACTIONS) {
  document.querySelector(`#${key}`).addEventListener('click', ACTIONS[key]);
}

document.querySelector('#useScreenshot').addEventListener('click', e => {
  if (e.target.checked) {
    platform.requestScreenshotPermission();
  }
});

function getFile() {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    // FIXME: When do we reject? we should probably display the file input directly on the page.
    input.addEventListener("change", () => resolve(input.files[0]));
    input.click();
  });
}

// FIXME: support dropping file on the button
async function importTabs() {
  importStatus.textContent = "Reading file...";
  const file = await getFile();
  importStatus.textContent = "Processing...";
  const text = await file.text();
  await browser.runtime.sendMessage({
    method: "import-tabs",
    text
  });
  importStatus.textContent = "Done";
}

let lastUrl = "";
async function exportTabs() {
  exportStatus.textContent = "Processing...";
  URL.revokeObjectURL(lastUrl);
  const text = await browser.runtime.sendMessage({
    method: "export-tabs"
  });
  const file = new File([text], "tabalanche-export.json", {
    type: "application/json",
  });
  const a = document.createElement("a");
  lastUrl = a.href = URL.createObjectURL(file);
  a.download = file.name;
  a.click();
  exportStatus.textContent = "Done";
}

