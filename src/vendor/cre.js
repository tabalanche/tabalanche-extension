function cre(base, opts, children) {
  "use strict";
  var classList = [];

  if (base && typeof base != 'string' && !base.cloneNode) {
    children = base;
    base = null;
  } else if (opts && typeof opts.length == 'number') {
    children = opts;
    opts = null;
  }

  opts = opts || {};
  var elem = null;
  var i;

  if (base && base.cloneNode) {
    elem = base.cloneNode(!children);
  } else if (typeof base == 'string') {
    var tagName;
    var words = base.match(/(^|[\.\#])[^\.\#]*/g);
    i = 0;
    if (words[0][0] == '.' || words[0][0] == '#') {
      // default to 'div', Jade-style
      tagName = 'div';
    } else {
      tagName = words[0];
      i = 1;
    }
    while (i < words.length) {
      if (words[i][0] == '.') {
        classList.push(words[i].slice(1));
      } else if (words[i][0] == '#') {
        opts.id = words[i].slice(1);
      }
      i++;
    }
    if (opts.namespaceURI) {
      elem = document.createElementNS(opts.namespaceURI, tagName);
    } else {
      elem = document.createElement(tagName);
    }
  } else if (base) {
    throw new TypeError(
      'base must be a String, something with cloneNode, or falsy');
  }
  if (children) {
    if (typeof children == 'string' ||
      children.length == 1 && typeof children[0] == 'string') {
      if (elem) {
        elem.textContent = children;
      } else {
        elem = document.createTextNode(children);
      }
    } else if (typeof children.length == 'number') {
      var frag = document.createDocumentFragment();
      for (i = 0; i < children.length; i++) {
        if (typeof children[i] == 'string') {
          frag.appendChild(document.createTextNode(children[i]));
        } else {
          frag.appendChild(children[i]);
        }
      }
      if (elem) {
        elem.appendChild(frag);
      } else {
        elem = frag;
      }
    } else {
      if (elem) {
        elem.appendChild(children);
      } else {
        elem = children;
      }
    }
  }

  for (var opt in opts) {
    if (Object.prototype.hasOwnProperty.call(opts, opt)) switch (opt) {
      case 'classList':

        // If the list is empty
        if (opts.classList.length == 0) {

          // Push a sentinel value to mark there was actually an explicitly
          // empty class marker
          classList.push('');

        // If the list has items, append the items of the list to this one
        } else {
          Array.prototype.push.apply(classList, opts.classList);
        }
        break;
      case 'className':
        classList.push(opts.className);
        break;
      case 'style':
        for (var rule in opts.style) {
          elem.style[rule] = opts.style[rule];
        }
        break;
      case 'attributes':
        if (typeof opts.attributes.length == 'number') {
          for (i = 0; i < opts.attributes.length; i++) {
            elem.setAttribute(opts.attributes[i].name,
              opts.attributes[i].value);
          }
        }
        break;
      case 'namespaceURI': // read-only, used during element creation
        break;
      default:
        elem[opt] = opts[opt];
        break;
    }
  }

  if (classList.length > 0) {
    elem.className = classList.join(' ');
  }

  return elem;
}

cre.svg = function elementSvg(base, opts, children) {
  "use strict";
  if (base && typeof base != 'string') {
    if (opts && typeof opts.length == 'number') {
      children = opts;
      opts = base;
      base = 'svg';
    } else {
      children = base;
      base = 'svg';
    }
  } else if (opts && typeof opts.length == 'number') {
    children = opts;
    opts = null;
  }

  if (typeof base == 'string' && (base[0] == '.' || base[0] == '#')) {
    base = 'svg' + base;
  }

  opts = opts || {};
  opts.namespaceURI = 'http://www.w3.org/2000/svg';

  cre(base, opts, children);
};

cre.text = document.createTextNode;
