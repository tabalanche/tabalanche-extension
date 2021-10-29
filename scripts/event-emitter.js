/* exported eventEmitter */

function eventEmitter() {
  const events = new Map;
  return {on, off, emit};
  
  function emit(ev, ...args) {
    const cbs = events.get(ev);
    if (!cbs) return;
    for (const [cb, opts] of cbs.entries()) {
      try {
        cb(...args);
      } catch (err) {
        console.error(err);
      } finally {
        if (opts.once) {
          cbs.delete(cb);
        }
      }
    }
  }
  
  // opts: {runNow: Boolean, once: Boolean}
  function on(ev, cb, opts = {}) {
    if (!events.has(ev)) {
      events.set(ev, new Map);
    }
    // FIXME (WONTFIX?): this prevents users from registering a single callback multiple times.
    events.get(ev).set(cb, opts);
    if (opts.runNow) {
      cb();
    }
  }
  
  function off(ev, cb) {
    if (!events.has(ev)) {
      return;
    }
    events.get(ev).delete(cb);
  }
}
