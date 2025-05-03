/* global eventEmitter */

/* exported createSearchFilter, compileFilter */
function compileFilter(value) {
  const rules = [];
  for (const term of value.split(/\s+/)) {
    let negative, rx;
    if (term.startsWith('-')) {
      negative = true;
      rx = term.slice(1);
    } else {
      negative = false;
      rx = term;
    }
    rules.push({
      rx: new RegExp(rx, 'i'),
      negative
    });
  }
  return {
    toString: () => value,
    rules,
    test,
    testObj,
  };
  function test(text) {
    for (const rule of rules) {
      if (rule.rx.test(text) === rule.negative) {
        return false;
      }
    }
    return true;
  }
  
  function testObj(obj, props = Object.keys(obj)) {
    for (const rule of rules) {
      if (props.some(p => rule.rx.test(obj[p])) === rule.negative) {
        return false;
      }
    }
    return true;
  }
  
}

function createSearchFilter({
  el,
  updateAt = 'change',
  props
}) {
  const events = eventEmitter();
  let filter = compileFilter(el.value.trim());
  if (el.form) {
    el.form.addEventListener('reset', () => setTimeout(updateValue));
  }
  if (updateAt === 'change' || updateAt === 'input') {
    el.addEventListener(updateAt, updateValue);
  } else if (updateAt === 'submit') {
    el.form.addEventListener('submit', e => {
      e.preventDefault();
      updateValue();
    });
  } else {
    throw new Error(`invalid updateAt: ${updateAt}`);
  }
  
  // Chrome re-fill the form after pageshow, should we delay the initial load or...?
  window.addEventListener('pageshow', updateValue);
  // Firefox re-fill even slower e.g. Ctrl+W & Ctrl+Shift+T
  window.requestIdleCallback(updateValue);
  return {
    ...events,
    testObj: obj => filter.testObj(obj, props),
    toString: () => filter.toString(),
    empty: () => !filter.rules.length
  };
  
  function updateValue() {
    const newValue = el.value.trim();
    if (newValue === String(filter)) return;
    filter = compileFilter(newValue);
    events.emit('change');
  }
}
