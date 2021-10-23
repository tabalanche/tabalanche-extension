/* global eventEmitter */
/* exported createSearchFilter */

function createSearchFilter({
  el,
  updateAt = 'change',
  props
}) {
  const events = eventEmitter();
  const rules = [];
  let value = el.value.trim();
  
  buildRules();
  
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
  
  return {test, testObj, empty, ...events};
  
  function empty() {
    return !rules.length;
  }
  
  function buildRules() {
    rules.length = 0;
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
  }
  
  // FIXME: this is no longer used
  function test(text) {
    for (const rule of rules) {
      if (rule.rx.test(text) === rule.negative) {
        return false;
      }
    }
    return true;
  }
  
  function testObj(obj) {
    for (const rule of rules) {
      if (props.some(p => rule.rx.test(obj[p])) === rule.negative) {
        return false;
      }
    }
    return true;
  }
  
  function updateValue() {
    const newValue = el.value.trim();
    if (newValue === value) return;
    value = newValue;
    buildRules();
    events.emit('change');
  }
}
