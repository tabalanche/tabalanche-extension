/* global readWriteLock eventEmitter */
/* exported createInfiniteLoader */

function createInfiniteLoader({
  root,
  createElement,
  getSome,
  key: item2key,
  id: item2id
  // filter
}) {
  const lock = readWriteLock.createLock();
  const items = [];
  // const el2item = new Map;
  const idMap = new Map;
  const ee = eventEmitter();
  const xo = new IntersectionObserver(onXoChange);
  let state = 'pause';
  init();
  return {
    ...ee,
    add,
    delete: delete_,
    state: () => state,
    init,
    uninit
  };
  
  async function init() {
    await lock.write(loadMore);
  }
  
  async function uninit() {
    await lock.write(() => {
      xo.disconnect();
    });
  }
  
  async function loadMore() {
    await pauseXO(async () => {
      state = 'loading';
      ee.emit('stateChange');
      const lastItem = items.length ? items[items.length - 1].item : null;
      const newItems = await getSome(lastItem);
      if (!newItems.length) {
        state = 'complete';
        ee.emit('stateChange');
        return;
      }
      for (const item of newItems) {
        const o = buildItem(item);
        items.push(o);
        root.append(o.el);
      }
    });
    state = 'pause';
    ee.emit('stateChange');
  }
  
  function buildItem(item) {
    const o = createElement(item);
    o.item = item;
    o.id = item2id(item);
    idMap.set(o.id, o);
    return o;
  }
  
  function destroyItem(o) {
    if (o.destroy) {
      o.destroy();
    }
    idMap.delete(o.id);
  }
  
  function onXoChange(entries) {
    // FIXME: would this fire during `loadMore`?
    // FIXME: is it possible that entry.target is not the last item?
    if (entries.some(e => e.target === items[items.length - 1].el && e.isIntersecting)) {
      lock.write(loadMore);
    }
  }
  
  async function add(item) {
    await lock.write(async () => {
      const key = item2key(item);
      const i = items.findIndex(i => item2key(i.item) > key);
      if (i < 0) return;
      
      await pauseXO(() => {
        const newItem = buildItem(item);
        // FIXME: this only works if the order of each item doesn't change
        if (i > 0 && item2id(items[i - 1].item) === item2id(item)) {
          // replace
          const oldItem = items[i - 1];
          destroyItem(oldItem);
          items.splice(i - 1, 1, newItem);
          root.replaceChild(newItem.el, oldItem.el);
        } else {
          // insert
          root.insertBefore(newItem.el, items[i].el);
          items.splice(i, 0, newItem);
          // drop last item so the list doesn't grow
          const removed = items.pop();
          destroyItem(removed);
          removed.el.remove();
          state = 'pause';
          ee.emit('stateChange');
        }
      });
    });
  }
  
  async function delete_(itemId) {
    await lock.write(async () => {
      const item = idMap.get(itemId);
      if (!item) return;
      
      await pauseXO(() => {
        const i = items.indexOf(item);
        destroyItem(item);
        items.splice(i, 1);
      });
    });
  }
  
  async function pauseXO(cb) {
    xo.disconnect();
    try {
      await cb();
    } finally {
      if (items.length && state !== 'complete') {
        xo.observe(items[items.length - 1].el);
      }
    }
  }
}
