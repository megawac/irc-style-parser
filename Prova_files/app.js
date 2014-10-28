(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var options = require("./options");

module.exports = grep;

function grep (value) {
  if (arguments.length > 0) {
    set(value);
  }

  return get();
}

function set (value) {
  var all = options.read();
  all.grep = value;
  options.write(all);
}

function get () {
  return options.read()['grep'];
}

},{"./options":4}],2:[function(require,module,exports){
var layout = require("./layout");
var run = require("./run");
var socket = require("./socket");

socket(function (update) {
  if (!update || !update.message) return;
  if (update.message.start) {
    run(update.message.url);
  }

  if (update.message.restart) run();
});

},{"./layout":3,"./run":5,"./socket":6}],3:[function(require,module,exports){
var dom = require("dom-tree");
var on = require("dom-event");
on.child = require("component-delegate");

var select = require("dom-select");
var style = require("dom-style");
var classes = require("dom-classes");
var format = require("format-text");
var bindKey = require("key-event");
var escape = require("escape-html");
var failingCode = require("failing-code");
var socket = require("./socket");
var grep = require("./grep");
var templates = require("./templates");
var options = require("./options");
var url;

on(window, 'resize', updatePositions);
on(window, 'hashchange', run);
on(window, 'scroll', saveScrollState);
socket(updateConn);

module.exports = {
  addError: addError,
  markTest: markTest,
  pass: pass,
  status: status,
  run: run,
  list: list
};

function addError (error) {
  var top = select('.top');
  var view = {
    name: error.name
  };

  if (!top) {
    setup();
    top = select('.top');
  };

  classes.add(select('.top'), 'failed');
  view.stack = format(templates.stack, error.stack.replace(/\n\s+/g, templates['stack-line']));

  view.code = error.source.length ? formatCode(error.source) : '';

  if (error.expected != undefined) {
    view.diff = format(templates.diff, escape(JSON.stringify(error.expected, null, " ")), escape(JSON.stringify(error.actual, null, " "))) || " ";
    view['diff-class'] = '';
  } else {
    view.diff = "";
    view['diff-class'] = ' empty';
  }

  if (addError.last != error.test) {
    view.title = '<h3>' + error.test +'</h3>';
    addError.last = error.test;
  } else {
    view.title = '';
  }

  if (!addError.counter) {
    addError.counter = 1;
  }

  view.id = addError.counter++;

  dom.add(select('.results .errors'), templates.error, view);
  var el = select('#error-' + view.id);
  on.child.bind(el, '.stack-line', 'click', function (e) {
    var index = Array.prototype.indexOf.call(e.target.parentElement.children, e.target) - 1;
    select('.code', el).innerHTML = formatCode(failingCode(error, __source_code, index));
  });
}

function markTest (test) {
  var overview = select('.overview');
  if (overview) return;

  var list = select('.waiting .list');

  if (!list) {
    dom.add(select('.waiting h1'), templates.overview);
    list = select('.waiting .list');
  }

  dom.add(list, templates.test, {
    icon: '',
    name: test.name
  });
}

function setup () {
  dom.remove(select('.waiting'));

  var template = format(templates['layout'], templates);
  dom.add(document.body, template, {
    grep: grep() || '',
    conn: ''
  });

  on(select('.frame-button'), 'click', toggleFrame);
  on(select('.run-again'), 'click', run);
  on(select('.maximize'), 'click', maximize);
  on(select('.minimize'), 'click', minimize);

  updateConn();

  setupGrep();

  if (localStorage['frame-open']) {
    toggleFrame();
  }

  if (localStorage['frame-maximized']) {
    maximize();
  }

  updateFramePosition();
  recoverScrollPosition();
}

function setupGrep () {
  var el = select('#grep');

  on(select('.grep label'), 'click', function () {
    el.focus();
  });

  bindKey(el, 'enter', function () {
    grep(el.value);
  });
}

function run (_url) {
  if (typeof _url == 'string') {
    url = _url;
  }

  addError.last = undefined;
  status('running');

  dom.add(document.body, templates['frame'], {
    url: url,
    options: options.stringify()
  });
}

function end () {
  classes.remove(select('.waiting'), '.running');
}

function pass (assertions) {
  setup();
  classes.add(select('.top'), 'passed');
  select('.pass').innerHTML = format(templates.pass, assertions);
  classes.add(select('.results'), 'passed');
}

function toggleFrame () {
  var isOpen = classes.has(select('.results'), 'open');

  if (isOpen) {
    closeFrame();
  } else {
    openFrame();
  }

  updateFramePosition();
}

function openFrame () {
  var results = select('.results');
  var frame = select('.frame');

  classes.add(results, 'open');
  classes.add(frame, 'open');

  localStorage['frame-open'] = true;
}

function closeFrame () {
  var results = select('.results');
  var frame = select('.frame');

  classes.remove(results, 'open');
  classes.remove(frame, 'open');

  delete localStorage['frame-open'];
}

function updatePositions () {
  updateFramePosition();
}

function updateFramePosition () {
  var frame = select('.frame');
  var results = select('.results');

  if (!frame) return;

  var isOpen = classes.has(frame, 'open') && !classes.has(select('body'), 'maximized');
  var right = isOpen ? results.offsetWidth : 0;

  style(select('.frame-button'), 'right', right + 'px');

  if (!isOpen) return;

  style(frame, {
    width: results.offsetWidth - 1 + 'px',
    left: right + 'px',
    height: '100%'
  });
}

function status (msg) {
  var el = select('.status');

  if (!el) {
    document.body.innerHTML = format(templates.waiting, {
      message: msg
    });
    return;
  }

  el.innerHTML = msg;
  select('.waiting').className = 'waiting center ' + msg;
}

function list (tests) {
  var key;
  for (key in tests) {
    dom.add(select('.overview .list'), templates.test, {
      icon: tests[key] ?  '✓' : '✖',
      name: key
    });
  }
}

function updateConn (msg) {
  var el = select('.conn');
  if (!el) return;

  el.innerHTML = socket.isOpen() ? 'Watching File Changes' : 'Disconnected';
}

function maximize () {
  classes.add(select('body'), 'maximized');
  localStorage['frame-maximized'] = true;
  updateFramePosition();
}

function minimize () {
  delete localStorage['frame-maximized'];
  classes.remove(select('body'), 'maximized');
  updateFramePosition();
}

function saveScrollState () {
  if (saveScrollState.defer) {
    clearTimeout(saveScrollState.defer);
    saveScrollState.defer = undefined;
  }

  saveScrollState.defer = setTimeout(function () {
    localStorage['scrollTop'] = document.body.scrollTop;
  }, 500);
}

function recoverScrollPosition () {
  document.body.scrollTop = Number(localStorage['scrollTop']);
}

function formatCode (source) {
  return format(templates.code, {
    'first-line-num': source[0].line,
    'first-line-source': escape(source[0].code),
    'second-line-num': source[1].line,
    'second-line-source': escape(source[1].code),
    'third-line-num': source[2].line,
    'third-line-source': escape(source[2].code)
  })
}

},{"./grep":1,"./options":4,"./socket":6,"./templates":7,"component-delegate":12,"dom-classes":17,"dom-event":19,"dom-select":21,"dom-style":23,"dom-tree":27,"escape-html":32,"failing-code":33,"format-text":35,"key-event":37}],4:[function(require,module,exports){
var querystring = require("querystring");

module.exports = {
  read: read,
  write: write,
  stringify: stringify
};

function stringify () {
  return document.location.hash.slice(1);
}

function read () {
  var hash = stringify();
  if (!hash) return {};
  return querystring.parse(hash, ';', ':');
}

function write (values) {
  var str = querystring.stringify(values, ';', ':');
  var url = document.location.href.split('#')[0];
  document.location.href = url + '#' + str;
}

},{"querystring":11}],5:[function(require,module,exports){
var select = require("dom-select");
var layout = require("./layout");
var socket = require("./socket");

module.exports = start;

function start (url) {
  window.addEventListener("message", receiveMessage, false);
  layout.run(url);
}

function receiveMessage (message) {
  if (message.data.type == 'error') {
    fail(message.data);
  }

  if (message.data.type == 'test') {
    layout.markTest(message.data);
  }

  if (message.data.type == 'end') {
    end(message.data);
  }
}

function fail (error) {
  socket.send({ fail: error, userAgent: navigator.userAgent });
  layout.addError(error);
}

function end (result) {
  socket.send({ userAgent: navigator.userAgent, result: result });

  if (!result.failed) layout.pass(result.passed);
  layout.list(result.tests);
}

},{"./layout":3,"./socket":6,"dom-select":21}],6:[function(require,module,exports){
var pubsub = require("pubsub")();
var status = false;
var ws;

connect();

module.exports = pubsub;
module.exports.isOpen = isOpen;
module.exports.send = send;

function connect () {
  ws = window.ws = new WebSocket(document.location.origin.replace('http', 'ws'));
  ws.onopen = open;
  ws.onmessage = message;
  ws.onclose = close;
}

function isOpen () {
  return status;
}

function open () {
  status = true;
  pubsub.publish({ open: true });
}

function message (event) {
  pubsub.publish({
    message: JSON.parse(event.data)
  });
}

function close () {
  if (status == false) return;
  status = false;
  pubsub.publish({ close: true });
  reconnect();
}

function reconnect () {
  if (status) return;
  connect();
  setTimeout(reconnect, 1000);
}

function send (message) {
  ws.send(JSON.stringify(message));
};

},{"pubsub":40}],7:[function(require,module,exports){
exports["code"] = "<div class=\"first-line line\"><span>{first-line-num}.</span>{first-line-source}</div>\n<div class=\"second-line failing-line line\"><span>{second-line-num}.</span>{second-line-source}</div>\n<div class=\"third-line line\"><span>{third-line-num}.</span>{third-line-source}</div>\n"
exports["custom-frame"] = "<!DOCTYPE html>\n<html>\n  <head>\n    <meta http-equiv=\"content-type\" content=\"text/html; charset=UTF-8\">\n    <title>hello</title>\n  </head>\n  <body>\n    <h1>Hello!</h1>\n    <h2>This is a custom frame.</h2>\n  </body>\n</html>\n"
exports["diff"] = "<div class=\"expected\">\n  <strong>Expected:</strong>{0}\n</div>\n<div class=\"actual\">\n  <strong>Actual:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</strong>{1}\n</div>\n"
exports["error"] = "<li id=\"error-{id}\">\n  {title}\n  <h4>{name}</h4>\n  <div class=\"diff{diff-class}\">{diff}</div>\n  <div class=\"code\">{code}</div>\n  <div class=\"stack\">\n    {stack}\n  </div>\n</li>\n"
exports["frame"] = "<iframe class=\"frame\" src=\"{url}#{options}\"></iframe>\n"
exports["layout"] = "<div class=\"top\">\n  <div class=\"results\">\n    <a class=\"frame-button center pointer\">\n      <span class=\"open pointer\">❮</span>\n      <span class=\"close pointer\">❯</span>\n    </a>\n    <ul class=\"errors\"></ul>\n    <div class=\"pass\"></div>\n  </div>\n  <div class=\"clear\"></div>\n</div>\n\n<div class=\"navigation\">\n  <div class=\"buttons\">\n    <a class=\"run-again pointer\">Run Again</a>\n    <a class=\"conn\" class=\"pointer\">{conn}</a>\n    <a class=\"maximize pointer\">Maximize Frame</a>\n    <a class=\"minimize pointer\">Minimize Frame</a>\n  </div>\n</div>\n\n<div class=\"overview\">\n  <ul class=\"list\"></ul>\n</div>\n\n<div class=\"grep\">\n  <div class=\"form\">\n    <label>Grep &#x2192;</label>\n    <input id=\"grep\" type=\"text\" placeholder=\"Type any test name filter...\" value=\"{grep}\" />\n  </div>\n</div>\n"
exports["overview"] = "<ul class=\"list\"></ul>\n"
exports["pass"] = "<div class=\"pass center\">\n  <h1>{0} Passed Assertions.</h1>\n</div>\n"
exports["stack-line"] = "</div><div class=\"stack-line\">\n"
exports["stack"] = "<div class=\"stack-title\">{0}</div>\n"
exports["test"] = "<li class=\"test\">\n  <span>{icon}</span>\n  {name}\n</li>\n"
exports["waiting"] = "<div class=\"waiting center {message}\">\n  <h1 class=\"status\">{message}</h1>\n</div>\n"
},{}],8:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],9:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],10:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],11:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":9,"./encode":10}],12:[function(require,module,exports){
/**
 * Module dependencies.
 */

var closest = require('closest')
  , event = require('event');

/**
 * Delegate event `type` to `selector`
 * and invoke `fn(e)`. A callback function
 * is returned which may be passed to `.unbind()`.
 *
 * @param {Element} el
 * @param {String} selector
 * @param {String} type
 * @param {Function} fn
 * @param {Boolean} capture
 * @return {Function}
 * @api public
 */

exports.bind = function(el, selector, type, fn, capture){
  return event.bind(el, type, function(e){
    var target = e.target || e.srcElement;
    e.delegateTarget = closest(target, selector, true, el);
    if (e.delegateTarget) fn.call(el, e);
  }, capture);
};

/**
 * Unbind event `type`'s callback `fn`.
 *
 * @param {Element} el
 * @param {String} type
 * @param {Function} fn
 * @param {Boolean} capture
 * @api public
 */

exports.unbind = function(el, type, fn, capture){
  event.unbind(el, type, fn, capture);
};

},{"closest":13,"event":16}],13:[function(require,module,exports){
var matches = require('matches-selector')

module.exports = function (element, selector, checkYoSelf, root) {
  element = checkYoSelf ? {parentNode: element} : element

  root = root || document

  // Make sure `element !== document` and `element != null`
  // otherwise we get an illegal invocation
  while ((element = element.parentNode) && element !== document) {
    if (matches(element, selector))
      return element
    // After `matches` on the edge case that
    // the selector matches the root
    // (when the root is not the document)
    if (element === root)
      return
  }
}

},{"matches-selector":14}],14:[function(require,module,exports){
/**
 * Module dependencies.
 */

var query = require('query');

/**
 * Element prototype.
 */

var proto = Element.prototype;

/**
 * Vendor function.
 */

var vendor = proto.matches
  || proto.webkitMatchesSelector
  || proto.mozMatchesSelector
  || proto.msMatchesSelector
  || proto.oMatchesSelector;

/**
 * Expose `match()`.
 */

module.exports = match;

/**
 * Match `el` to `selector`.
 *
 * @param {Element} el
 * @param {String} selector
 * @return {Boolean}
 * @api public
 */

function match(el, selector) {
  if (!el || el.nodeType !== 1) return false;
  if (vendor) return vendor.call(el, selector);
  var nodes = query.all(selector, el.parentNode);
  for (var i = 0; i < nodes.length; ++i) {
    if (nodes[i] == el) return true;
  }
  return false;
}

},{"query":15}],15:[function(require,module,exports){
function one(selector, el) {
  return el.querySelector(selector);
}

exports = module.exports = function(selector, el){
  el = el || document;
  return one(selector, el);
};

exports.all = function(selector, el){
  el = el || document;
  return el.querySelectorAll(selector);
};

exports.engine = function(obj){
  if (!obj.one) throw new Error('.one callback required');
  if (!obj.all) throw new Error('.all callback required');
  one = obj.one;
  exports.all = obj.all;
  return exports;
};

},{}],16:[function(require,module,exports){
var bind = window.addEventListener ? 'addEventListener' : 'attachEvent',
    unbind = window.removeEventListener ? 'removeEventListener' : 'detachEvent',
    prefix = bind !== 'addEventListener' ? 'on' : '';

/**
 * Bind `el` event `type` to `fn`.
 *
 * @param {Element} el
 * @param {String} type
 * @param {Function} fn
 * @param {Boolean} capture
 * @return {Function}
 * @api public
 */

exports.bind = function(el, type, fn, capture){
  el[bind](prefix + type, fn, capture || false);
  return fn;
};

/**
 * Unbind `el` event `type`'s callback `fn`.
 *
 * @param {Element} el
 * @param {String} type
 * @param {Function} fn
 * @param {Boolean} capture
 * @return {Function}
 * @api public
 */

exports.unbind = function(el, type, fn, capture){
  el[unbind](prefix + type, fn, capture || false);
  return fn;
};
},{}],17:[function(require,module,exports){
/**
 * Module dependencies.
 */

var index = require('indexof');

/**
 * Whitespace regexp.
 */

var whitespaceRe = /\s+/;

/**
 * toString reference.
 */

var toString = Object.prototype.toString;

module.exports = classes;
module.exports.add = add;
module.exports.contains = has;
module.exports.has = has;
module.exports.toggle = toggle;
module.exports.remove = remove;
module.exports.removeMatching = removeMatching;

function classes (el) {
  if (el.classList) {
    return el.classList;
  }

  var str = el.className.replace(/^\s+|\s+$/g, '');
  var arr = str.split(whitespaceRe);
  if ('' === arr[0]) arr.shift();
  return arr;
}

function add (el, name) {
  // classList
  if (el.classList) {
    el.classList.add(name);
    return;
  }

  // fallback
  var arr = classes(el);
  var i = index(arr, name);
  if (!~i) arr.push(name);
  el.className = arr.join(' ');
}

function has (el, name) {
  return el.classList
    ? el.classList.contains(name)
    : !! ~index(classes(el), name);
}

function remove (el, name) {
  if ('[object RegExp]' == toString.call(name)) {
    return removeMatching(el, name);
  }

  // classList
  if (el.classList) {
    el.classList.remove(name);
    return;
  }

  // fallback
  var arr = classes(el);
  var i = index(arr, name);
  if (~i) arr.splice(i, 1);
  el.className = arr.join(' ');
}

function removeMatching (el, re, ref) {
  var arr = Array.prototype.slice.call(classes(el));
  for (var i = 0; i < arr.length; i++) {
    if (re.test(arr[i])) {
      remove(el, arr[i]);
    }
  }
}

function toggle (el, name) {
  // classList
  if (el.classList) {
    return el.classList.toggle(name);
  }

  // fallback
  if (has(el, name)) {
    remove(el, name);
  } else {
    add(el, name);
  }
}

},{"indexof":18}],18:[function(require,module,exports){

var indexOf = [].indexOf;

module.exports = function(arr, obj){
  if (indexOf) return arr.indexOf(obj);
  for (var i = 0; i < arr.length; ++i) {
    if (arr[i] === obj) return i;
  }
  return -1;
};
},{}],19:[function(require,module,exports){
module.exports = on;
module.exports.on = on;
module.exports.off = off;

function on (element, event, callback, capture) {
  (element.addEventListener || element.attachEvent).call(element, event, callback, capture);
  return callback;
}

function off (element, event, callback, capture) {
  (element.removeEventListener || element.detachEvent).call(element, event, callback, capture);
  return callback;
}

},{}],20:[function(require,module,exports){
var qwery = require("qwery");

module.exports = {
  one: one,
  all: all
};

function all (selector, parent) {
  return qwery(selector, parent);
}

function one (selector, parent) {
  return all(selector, parent)[0];
}

},{"qwery":22}],21:[function(require,module,exports){
var fallback = require('./fallback');

module.exports = one;
module.exports.all = all;

function one (selector, parent) {
  parent || (parent = document);

  if (parent.querySelector) {
    return parent.querySelector(selector);
  }

  return fallback.one(selector, parent);
}

function all (selector, parent) {
  parent || (parent = document);

  if (parent.querySelectorAll) {
    return parent.querySelectorAll(selector);
  }

  return fallback.all(selector, parent);
}

},{"./fallback":20}],22:[function(require,module,exports){
/*!
  * @preserve Qwery - A Blazing Fast query selector engine
  * https://github.com/ded/qwery
  * copyright Dustin Diaz 2012
  * MIT License
  */

(function (name, context, definition) {
  if (typeof module != 'undefined' && module.exports) module.exports = definition()
  else if (typeof define == 'function' && define.amd) define(definition)
  else context[name] = definition()
})('qwery', this, function () {
  var doc = document
    , html = doc.documentElement
    , byClass = 'getElementsByClassName'
    , byTag = 'getElementsByTagName'
    , qSA = 'querySelectorAll'
    , useNativeQSA = 'useNativeQSA'
    , tagName = 'tagName'
    , nodeType = 'nodeType'
    , select // main select() method, assign later

    , id = /#([\w\-]+)/
    , clas = /\.[\w\-]+/g
    , idOnly = /^#([\w\-]+)$/
    , classOnly = /^\.([\w\-]+)$/
    , tagOnly = /^([\w\-]+)$/
    , tagAndOrClass = /^([\w]+)?\.([\w\-]+)$/
    , splittable = /(^|,)\s*[>~+]/
    , normalizr = /^\s+|\s*([,\s\+\~>]|$)\s*/g
    , splitters = /[\s\>\+\~]/
    , splittersMore = /(?![\s\w\-\/\?\&\=\:\.\(\)\!,@#%<>\{\}\$\*\^'"]*\]|[\s\w\+\-]*\))/
    , specialChars = /([.*+?\^=!:${}()|\[\]\/\\])/g
    , simple = /^(\*|[a-z0-9]+)?(?:([\.\#]+[\w\-\.#]+)?)/
    , attr = /\[([\w\-]+)(?:([\|\^\$\*\~]?\=)['"]?([ \w\-\/\?\&\=\:\.\(\)\!,@#%<>\{\}\$\*\^]+)["']?)?\]/
    , pseudo = /:([\w\-]+)(\(['"]?([^()]+)['"]?\))?/
    , easy = new RegExp(idOnly.source + '|' + tagOnly.source + '|' + classOnly.source)
    , dividers = new RegExp('(' + splitters.source + ')' + splittersMore.source, 'g')
    , tokenizr = new RegExp(splitters.source + splittersMore.source)
    , chunker = new RegExp(simple.source + '(' + attr.source + ')?' + '(' + pseudo.source + ')?')

  var walker = {
      ' ': function (node) {
        return node && node !== html && node.parentNode
      }
    , '>': function (node, contestant) {
        return node && node.parentNode == contestant.parentNode && node.parentNode
      }
    , '~': function (node) {
        return node && node.previousSibling
      }
    , '+': function (node, contestant, p1, p2) {
        if (!node) return false
        return (p1 = previous(node)) && (p2 = previous(contestant)) && p1 == p2 && p1
      }
    }

  function cache() {
    this.c = {}
  }
  cache.prototype = {
    g: function (k) {
      return this.c[k] || undefined
    }
  , s: function (k, v, r) {
      v = r ? new RegExp(v) : v
      return (this.c[k] = v)
    }
  }

  var classCache = new cache()
    , cleanCache = new cache()
    , attrCache = new cache()
    , tokenCache = new cache()

  function classRegex(c) {
    return classCache.g(c) || classCache.s(c, '(^|\\s+)' + c + '(\\s+|$)', 1)
  }

  // not quite as fast as inline loops in older browsers so don't use liberally
  function each(a, fn) {
    var i = 0, l = a.length
    for (; i < l; i++) fn(a[i])
  }

  function flatten(ar) {
    for (var r = [], i = 0, l = ar.length; i < l; ++i) arrayLike(ar[i]) ? (r = r.concat(ar[i])) : (r[r.length] = ar[i])
    return r
  }

  function arrayify(ar) {
    var i = 0, l = ar.length, r = []
    for (; i < l; i++) r[i] = ar[i]
    return r
  }

  function previous(n) {
    while (n = n.previousSibling) if (n[nodeType] == 1) break;
    return n
  }

  function q(query) {
    return query.match(chunker)
  }

  // called using `this` as element and arguments from regex group results.
  // given => div.hello[title="world"]:foo('bar')
  // div.hello[title="world"]:foo('bar'), div, .hello, [title="world"], title, =, world, :foo('bar'), foo, ('bar'), bar]
  function interpret(whole, tag, idsAndClasses, wholeAttribute, attribute, qualifier, value, wholePseudo, pseudo, wholePseudoVal, pseudoVal) {
    var i, m, k, o, classes
    if (this[nodeType] !== 1) return false
    if (tag && tag !== '*' && this[tagName] && this[tagName].toLowerCase() !== tag) return false
    if (idsAndClasses && (m = idsAndClasses.match(id)) && m[1] !== this.id) return false
    if (idsAndClasses && (classes = idsAndClasses.match(clas))) {
      for (i = classes.length; i--;) if (!classRegex(classes[i].slice(1)).test(this.className)) return false
    }
    if (pseudo && qwery.pseudos[pseudo] && !qwery.pseudos[pseudo](this, pseudoVal)) return false
    if (wholeAttribute && !value) { // select is just for existance of attrib
      o = this.attributes
      for (k in o) {
        if (Object.prototype.hasOwnProperty.call(o, k) && (o[k].name || k) == attribute) {
          return this
        }
      }
    }
    if (wholeAttribute && !checkAttr(qualifier, getAttr(this, attribute) || '', value)) {
      // select is for attrib equality
      return false
    }
    return this
  }

  function clean(s) {
    return cleanCache.g(s) || cleanCache.s(s, s.replace(specialChars, '\\$1'))
  }

  function checkAttr(qualify, actual, val) {
    switch (qualify) {
    case '=':
      return actual == val
    case '^=':
      return actual.match(attrCache.g('^=' + val) || attrCache.s('^=' + val, '^' + clean(val), 1))
    case '$=':
      return actual.match(attrCache.g('$=' + val) || attrCache.s('$=' + val, clean(val) + '$', 1))
    case '*=':
      return actual.match(attrCache.g(val) || attrCache.s(val, clean(val), 1))
    case '~=':
      return actual.match(attrCache.g('~=' + val) || attrCache.s('~=' + val, '(?:^|\\s+)' + clean(val) + '(?:\\s+|$)', 1))
    case '|=':
      return actual.match(attrCache.g('|=' + val) || attrCache.s('|=' + val, '^' + clean(val) + '(-|$)', 1))
    }
    return 0
  }

  // given a selector, first check for simple cases then collect all base candidate matches and filter
  function _qwery(selector, _root) {
    var r = [], ret = [], i, l, m, token, tag, els, intr, item, root = _root
      , tokens = tokenCache.g(selector) || tokenCache.s(selector, selector.split(tokenizr))
      , dividedTokens = selector.match(dividers)

    if (!tokens.length) return r

    token = (tokens = tokens.slice(0)).pop() // copy cached tokens, take the last one
    if (tokens.length && (m = tokens[tokens.length - 1].match(idOnly))) root = byId(_root, m[1])
    if (!root) return r

    intr = q(token)
    // collect base candidates to filter
    els = root !== _root && root[nodeType] !== 9 && dividedTokens && /^[+~]$/.test(dividedTokens[dividedTokens.length - 1]) ?
      function (r) {
        while (root = root.nextSibling) {
          root[nodeType] == 1 && (intr[1] ? intr[1] == root[tagName].toLowerCase() : 1) && (r[r.length] = root)
        }
        return r
      }([]) :
      root[byTag](intr[1] || '*')
    // filter elements according to the right-most part of the selector
    for (i = 0, l = els.length; i < l; i++) {
      if (item = interpret.apply(els[i], intr)) r[r.length] = item
    }
    if (!tokens.length) return r

    // filter further according to the rest of the selector (the left side)
    each(r, function (e) { if (ancestorMatch(e, tokens, dividedTokens)) ret[ret.length] = e })
    return ret
  }

  // compare element to a selector
  function is(el, selector, root) {
    if (isNode(selector)) return el == selector
    if (arrayLike(selector)) return !!~flatten(selector).indexOf(el) // if selector is an array, is el a member?

    var selectors = selector.split(','), tokens, dividedTokens
    while (selector = selectors.pop()) {
      tokens = tokenCache.g(selector) || tokenCache.s(selector, selector.split(tokenizr))
      dividedTokens = selector.match(dividers)
      tokens = tokens.slice(0) // copy array
      if (interpret.apply(el, q(tokens.pop())) && (!tokens.length || ancestorMatch(el, tokens, dividedTokens, root))) {
        return true
      }
    }
    return false
  }

  // given elements matching the right-most part of a selector, filter out any that don't match the rest
  function ancestorMatch(el, tokens, dividedTokens, root) {
    var cand
    // recursively work backwards through the tokens and up the dom, covering all options
    function crawl(e, i, p) {
      while (p = walker[dividedTokens[i]](p, e)) {
        if (isNode(p) && (interpret.apply(p, q(tokens[i])))) {
          if (i) {
            if (cand = crawl(p, i - 1, p)) return cand
          } else return p
        }
      }
    }
    return (cand = crawl(el, tokens.length - 1, el)) && (!root || isAncestor(cand, root))
  }

  function isNode(el, t) {
    return el && typeof el === 'object' && (t = el[nodeType]) && (t == 1 || t == 9)
  }

  function uniq(ar) {
    var a = [], i, j;
    o:
    for (i = 0; i < ar.length; ++i) {
      for (j = 0; j < a.length; ++j) if (a[j] == ar[i]) continue o
      a[a.length] = ar[i]
    }
    return a
  }

  function arrayLike(o) {
    return (typeof o === 'object' && isFinite(o.length))
  }

  function normalizeRoot(root) {
    if (!root) return doc
    if (typeof root == 'string') return qwery(root)[0]
    if (!root[nodeType] && arrayLike(root)) return root[0]
    return root
  }

  function byId(root, id, el) {
    // if doc, query on it, else query the parent doc or if a detached fragment rewrite the query and run on the fragment
    return root[nodeType] === 9 ? root.getElementById(id) :
      root.ownerDocument &&
        (((el = root.ownerDocument.getElementById(id)) && isAncestor(el, root) && el) ||
          (!isAncestor(root, root.ownerDocument) && select('[id="' + id + '"]', root)[0]))
  }

  function qwery(selector, _root) {
    var m, el, root = normalizeRoot(_root)

    // easy, fast cases that we can dispatch with simple DOM calls
    if (!root || !selector) return []
    if (selector === window || isNode(selector)) {
      return !_root || (selector !== window && isNode(root) && isAncestor(selector, root)) ? [selector] : []
    }
    if (selector && arrayLike(selector)) return flatten(selector)
    if (m = selector.match(easy)) {
      if (m[1]) return (el = byId(root, m[1])) ? [el] : []
      if (m[2]) return arrayify(root[byTag](m[2]))
      if (hasByClass && m[3]) return arrayify(root[byClass](m[3]))
    }

    return select(selector, root)
  }

  // where the root is not document and a relationship selector is first we have to
  // do some awkward adjustments to get it to work, even with qSA
  function collectSelector(root, collector) {
    return function (s) {
      var oid, nid
      if (splittable.test(s)) {
        if (root[nodeType] !== 9) {
          // make sure the el has an id, rewrite the query, set root to doc and run it
          if (!(nid = oid = root.getAttribute('id'))) root.setAttribute('id', nid = '__qwerymeupscotty')
          s = '[id="' + nid + '"]' + s // avoid byId and allow us to match context element
          collector(root.parentNode || root, s, true)
          oid || root.removeAttribute('id')
        }
        return;
      }
      s.length && collector(root, s, false)
    }
  }

  var isAncestor = 'compareDocumentPosition' in html ?
    function (element, container) {
      return (container.compareDocumentPosition(element) & 16) == 16
    } : 'contains' in html ?
    function (element, container) {
      container = container[nodeType] === 9 || container == window ? html : container
      return container !== element && container.contains(element)
    } :
    function (element, container) {
      while (element = element.parentNode) if (element === container) return 1
      return 0
    }
  , getAttr = function () {
      // detect buggy IE src/href getAttribute() call
      var e = doc.createElement('p')
      return ((e.innerHTML = '<a href="#x">x</a>') && e.firstChild.getAttribute('href') != '#x') ?
        function (e, a) {
          return a === 'class' ? e.className : (a === 'href' || a === 'src') ?
            e.getAttribute(a, 2) : e.getAttribute(a)
        } :
        function (e, a) { return e.getAttribute(a) }
    }()
  , hasByClass = !!doc[byClass]
    // has native qSA support
  , hasQSA = doc.querySelector && doc[qSA]
    // use native qSA
  , selectQSA = function (selector, root) {
      var result = [], ss, e
      try {
        if (root[nodeType] === 9 || !splittable.test(selector)) {
          // most work is done right here, defer to qSA
          return arrayify(root[qSA](selector))
        }
        // special case where we need the services of `collectSelector()`
        each(ss = selector.split(','), collectSelector(root, function (ctx, s) {
          e = ctx[qSA](s)
          if (e.length == 1) result[result.length] = e.item(0)
          else if (e.length) result = result.concat(arrayify(e))
        }))
        return ss.length > 1 && result.length > 1 ? uniq(result) : result
      } catch (ex) { }
      return selectNonNative(selector, root)
    }
    // no native selector support
  , selectNonNative = function (selector, root) {
      var result = [], items, m, i, l, r, ss
      selector = selector.replace(normalizr, '$1')
      if (m = selector.match(tagAndOrClass)) {
        r = classRegex(m[2])
        items = root[byTag](m[1] || '*')
        for (i = 0, l = items.length; i < l; i++) {
          if (r.test(items[i].className)) result[result.length] = items[i]
        }
        return result
      }
      // more complex selector, get `_qwery()` to do the work for us
      each(ss = selector.split(','), collectSelector(root, function (ctx, s, rewrite) {
        r = _qwery(s, ctx)
        for (i = 0, l = r.length; i < l; i++) {
          if (ctx[nodeType] === 9 || rewrite || isAncestor(r[i], root)) result[result.length] = r[i]
        }
      }))
      return ss.length > 1 && result.length > 1 ? uniq(result) : result
    }
  , configure = function (options) {
      // configNativeQSA: use fully-internal selector or native qSA where present
      if (typeof options[useNativeQSA] !== 'undefined')
        select = !options[useNativeQSA] ? selectNonNative : hasQSA ? selectQSA : selectNonNative
    }

  configure({ useNativeQSA: true })

  qwery.configure = configure
  qwery.uniq = uniq
  qwery.is = is
  qwery.pseudos = {}

  return qwery
});

},{}],23:[function(require,module,exports){
var toCamelCase = require("to-camel-case");

module.exports = style;
module.exports.hide = effect('display', 'none');
module.exports.show = effect('display', '');

function all(element, css){
  var name;
  for ( name in css ) {
    one(element, name, css[name]);
  }
}

function effect (name, value) {
  return function (element, override) {
    style(element, name, arguments.length > 1 ? override : value);
  };
}

function one(element, name, value){
  element.style[toCamelCase(name)] = value;
}

function style(element){
  if ( arguments.length == 3 ) {
    return one(element, arguments[1], arguments[2]);
  }

  return all(element, arguments[1]);
}

},{"to-camel-case":24}],24:[function(require,module,exports){

var toSpace = require('to-space-case');


/**
 * Expose `toCamelCase`.
 */

module.exports = toCamelCase;


/**
 * Convert a `string` to camel case.
 *
 * @param {String} string
 * @return {String}
 */


function toCamelCase (string) {
  return toSpace(string).replace(/\s(\w)/g, function (matches, letter) {
    return letter.toUpperCase();
  });
}
},{"to-space-case":25}],25:[function(require,module,exports){

var clean = require('to-no-case');


/**
 * Expose `toSpaceCase`.
 */

module.exports = toSpaceCase;


/**
 * Convert a `string` to space case.
 *
 * @param {String} string
 * @return {String}
 */


function toSpaceCase (string) {
  return clean(string).replace(/[\W_]+(.|$)/g, function (matches, match) {
    return match ? ' ' + match : '';
  });
}
},{"to-no-case":26}],26:[function(require,module,exports){

/**
 * Expose `toNoCase`.
 */

module.exports = toNoCase;


/**
 * Test whether a string is camel-case.
 */

var hasSpace = /\s/;
var hasCamel = /[a-z][A-Z]/;
var hasSeparator = /[\W_]/;


/**
 * Remove any starting case from a `string`, like camel or snake, but keep
 * spaces and punctuation that may be important otherwise.
 *
 * @param {String} string
 * @return {String}
 */

function toNoCase (string) {
  if (hasSpace.test(string)) return string.toLowerCase();

  if (hasSeparator.test(string)) string = unseparate(string);
  if (hasCamel.test(string)) string = uncamelize(string);
  return string.toLowerCase();
}


/**
 * Separator splitter.
 */

var separatorSplitter = /[\W_]+(.|$)/g;


/**
 * Un-separate a `string`.
 *
 * @param {String} string
 * @return {String}
 */

function unseparate (string) {
  return string.replace(separatorSplitter, function (m, next) {
    return next ? ' ' + next : '';
  });
}


/**
 * Camelcase splitter.
 */

var camelSplitter = /(.)([A-Z]+)/g;


/**
 * Un-camelcase a `string`.
 *
 * @param {String} string
 * @return {String}
 */

function uncamelize (string) {
  return string.replace(camelSplitter, function (m, previous, uppers) {
    return previous + ' ' + uppers.toLowerCase().split('').join(' ');
  });
}
},{}],27:[function(require,module,exports){
var newElement = require("./new-element");
var select = require('./select');

module.exports = {
  add: withChildren(add),
  addAfter: withChildren(addAfter),
  addBefore: withChildren(addBefore),
  insert: insert,
  replace: replace,
  remove: remove
};

function add (parent, child, vars) {
  select(parent).appendChild(newElement(child, vars));
}

function addAfter (parent, child/*[, vars], reference */) {
  var ref = select(arguments[arguments.length - 1], parent).nextSibling;
  var vars = arguments.length > 3 ? arguments[2] : undefined;

  if (ref == null) {
    return add(parent, child, vars);
  }

  addBefore(parent, child, vars, ref);
}

function addBefore (parent, child/*[, vars], reference */) {
  var ref = arguments[arguments.length - 1];
  var vars = arguments.length > 3 ? arguments[2] : undefined;
  select(parent).insertBefore(newElement(child, vars), select(ref, parent));
}

function insert (element /*[,vars], parent */) {
  var parent = arguments[arguments.length - 1];
  var vars = arguments.length > 2 ? arguments[1] : undefined;

  add(select(parent), element, vars);
}

function replace (parent, target, repl, vars) {
  select(parent).replaceChild(select(newElement(repl, vars)), select(target, parent));
}

function remove (element, child) {
  var i, all;

  if (arguments.length == 1 && typeof element != 'string') {
    return element.parentNode.removeChild(element);
  }

  all = arguments.length > 1 ? select.all(child, element) : select.all(element);
  i = all.length;

  while (i--) {
    all[i].parentNode.removeChild(all[i]);
  }

}

function withChildren (fn) {
  return function (_, children) {
    if (!Array.isArray(children)) children = [children];

    var i = -1;
    var len = children.length;
    var params = Array.prototype.slice.call(arguments);

    while (++i < len) {
      params[1] = children[i];
      fn.apply(undefined, params);
    }
  };
}

},{"./new-element":28,"./select":31}],28:[function(require,module,exports){
var newElement = require("new-element");

module.exports = ifNecessary;

function ifNecessary (html, vars) {
  if (!isHTML(html)) return html;
  return newElement(html, vars);
}

function isHTML(text){
  return typeof text == 'string' && text.charAt(0) == '<';
}

},{"new-element":29}],29:[function(require,module,exports){
var domify = require("domify");
var format = require("format-text");

module.exports = newElement;

function newElement (html, vars) {
  if (arguments.length == 1) return domify(html);
  return domify(format(html, vars));
}

},{"domify":30,"format-text":35}],30:[function(require,module,exports){

/**
 * Expose `parse`.
 */

module.exports = parse;

/**
 * Wrap map from jquery.
 */

var map = {
  option: [1, '<select multiple="multiple">', '</select>'],
  optgroup: [1, '<select multiple="multiple">', '</select>'],
  legend: [1, '<fieldset>', '</fieldset>'],
  thead: [1, '<table>', '</table>'],
  tbody: [1, '<table>', '</table>'],
  tfoot: [1, '<table>', '</table>'],
  colgroup: [1, '<table>', '</table>'],
  caption: [1, '<table>', '</table>'],
  tr: [2, '<table><tbody>', '</tbody></table>'],
  td: [3, '<table><tbody><tr>', '</tr></tbody></table>'],
  th: [3, '<table><tbody><tr>', '</tr></tbody></table>'],
  col: [2, '<table><tbody></tbody><colgroup>', '</colgroup></table>'],
  _default: [0, '', '']
};

/**
 * Parse `html` and return the children.
 *
 * @param {String} html
 * @return {Array}
 * @api private
 */

function parse(html) {
  if ('string' != typeof html) throw new TypeError('String expected');

  // tag name
  var m = /<([\w:]+)/.exec(html);
  if (!m) throw new Error('No elements were generated.');
  var tag = m[1];

  // body support
  if (tag == 'body') {
    var el = document.createElement('html');
    el.innerHTML = html;
    return el.removeChild(el.lastChild);
  }

  // wrap map
  var wrap = map[tag] || map._default;
  var depth = wrap[0];
  var prefix = wrap[1];
  var suffix = wrap[2];
  var el = document.createElement('div');
  el.innerHTML = prefix + html + suffix;
  while (depth--) el = el.lastChild;

  var els = el.children;
  if (1 == els.length) {
    return el.removeChild(els[0]);
  }

  var fragment = document.createDocumentFragment();
  while (els.length) {
    fragment.appendChild(el.removeChild(els[0]));
  }

  return fragment;
}

},{}],31:[function(require,module,exports){
var select = require('dom-select');

module.exports = ifNecessary;
module.exports.all = ifNecessaryAll;

function ifNecessary (child, parent) {
  if (Array.isArray(child)) {
    child = child[0];
  }

  if ( typeof child != 'string') {
    return child;
  }

  if (typeof parent == 'string') {
    parent = select(parent, document);
  }

  return select(child, parent);
}

function ifNecessaryAll (child, parent) {
  if (Array.isArray(child)) {
    child = child[0];
  }

  if ( typeof child != 'string') {
    return [child];
  }

  if (typeof parent == 'string') {
    parent = select(parent, document);
  }

  return select.all(child, parent);
}

},{"dom-select":21}],32:[function(require,module,exports){
/**
 * Escape special characters in the given string of html.
 *
 * @param  {String} html
 * @return {String}
 * @api private
 */

module.exports = function(html) {
  return String(html)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

},{}],33:[function(require,module,exports){
var isNode = require("is-node");
var failingLine = require("failing-line");

var fs;
var nodeRequire;

if (isNode) {
  nodeRequire = require;
  fs = nodeRequire('fs');
  nodeRequire = null;
}

module.exports = failingCode;

function failingCode (error, doc, shift) {
  var ln = failingLine(error, shift);

  if (!ln) return;

  if (!doc && fs) {
    try {
      doc = fs.readFileSync(ln.filename).toString();
    } catch (readError) {
      return undefined;
    }
  }

  var result = [];
  var lines = doc.split('\n');

  var i = ln.line - 3;
  while (++i < ln.line + 1) {
    if (i + 1 != ln.line) {
      result.push({
        line: ln.line - (ln.line - i -1),
        code: lines[i]
      });
      continue;
    }

    result.push({
      line: ln.line,
      col: ln.col,
      fn: ln.fn,
      filename: ln.filename,
      code: lines[i],
      failed: true
    });
  }

  return result;
}

},{"failing-line":34,"is-node":36}],34:[function(require,module,exports){
module.exports = detect;

function detect (error, shift) {
  if (!error || !error.stack) return;

  if (/  at /.test(error.stack)) return v8(error, shift);

  if (/:\d+:\d+$/.test(error.stack)) return safari(error, shift);

  return firefox(error, shift);
}

function safari (error, shift) {
  var index = 0;
  if (shift) index += shift;

  var fn, filename, line, col;
  var lines = error.stack.split('\n');
  var stack = lines[index] || lines[0];

  var fields = stack.split(/\:(\d+)\:(\d+)$/);
  var numbers = fields.slice(1, 3);
  fields = fields[0].split('@');

  return {
    fn: fields[0],
    filename: fields[1],
    line: Number(numbers[0]),
    col: Number(numbers[1])
  };
}

function v8 (error, shift) {
  if (!error || !error.stack) return;

  var index = 1;
  if (shift) index += shift;

  var fn, filename, line, col;
  var lines = error.stack.split('\n');
  var stack = lines[index] || lines[1];

  if (!stack) return;

  var match = stack.match(/at ([\(\)\w\.<>\[\]\s]+) \((.+):(\d+):(\d+)/);

  if (!match) {
    match = stack.match(/at (.+):(\d+):(\d+)/);
    if (!match) return undefined;

    filename = match[1];
    line = Number(match[2]);
    col = Number(match[3]);
  } else {
    fn = match[1];
    filename = match[2];
    line = Number(match[3]);
    col = Number(match[4]);
  }

  return {
    fn: fn,
    filename: filename,
    line: line,
    col: col
  };
}

function firefox (error, shift) {
  var index = 0;
  if (shift) index += shift;

  var fn, filename, line, col;
  var lines = error.stack.split('\n');
  var stack = lines[index] || lines[0];

  var fields = stack.split(/\:(\d+)$/);
  var numbers = fields.slice(1, 2);
  fields = fields[0].split('@');

  if (index == 0) {
    col = error.columnNumber;
  }

  return {
    fn: fields[0],
    filename: fields[1],
    line: Number(numbers[0]),
    col: col
  };
}

},{}],35:[function(require,module,exports){
module.exports = format;

function format(text) {
  var context;

  if (typeof arguments[1] == 'object' && arguments[1]) {
    context = arguments[1];
  } else {
    context = Array.prototype.slice.call(arguments, 1);
  }

  return String(text).replace(/\{?\{([^{}]+)}}?/g, replace(context));
};

function replace (context, nil){
  return function (tag, name) {
    if (tag.substring(0, 2) == '{{' && tag.substring(tag.length - 2) == '}}') {
      return '{' + name + '}';
    }

    if (!context.hasOwnProperty(name)) {
      return tag;
    }

    if (typeof context[name] == 'function') {
      return context[name]();
    }

    return context[name];
  }
}

},{}],36:[function(require,module,exports){
(function (process){
module.exports = !!(typeof process != 'undefined' && process.versions && process.versions.node);

}).call(this,require("BxWAtX"))
},{"BxWAtX":8}],37:[function(require,module,exports){
var keynameOf = require("keyname-of");
var events = require("dom-event");

module.exports = on;
module.exports.on = on;
module.exports.off = off;

function on (element, keys, callback) {
  var expected = parse(keys);

  var fn = events.on(element, 'keyup', function(event){

    if ((event.ctrlKey || undefined) == expected.ctrl &&
       (event.altKey || undefined) == expected.alt &&
       (event.shiftKey || undefined) == expected.shift &&
       keynameOf(event.keyCode) == expected.key){

      callback(event);
    }

  });


  callback['cb-' + keys] = fn;

  return callback;
}

function off (element, keys, callback) {
  events.off(element, 'keyup', callback['cb-' + keys]);
}

function parse (keys){
  var result = {};
  keys = keys.split(/[^\w]+/);

  var i = keys.length, name;
  while ( i -- ){
    name = keys[i].trim();

    if(name == 'ctrl') {
      result.ctrl = true;
      continue;
    }

    if(name == 'alt') {
      result.alt = true;
      continue;
    }

    if(name == 'shift') {
      result.shift = true;
      continue;
    }

    result.key = name.trim();
  }

  return result;
}

},{"dom-event":19,"keyname-of":38}],38:[function(require,module,exports){
var map = require("keynames");

module.exports = keynameOf;

function keynameOf (n) {
   return map[n] || String.fromCharCode(n).toLowerCase();
}

},{"keynames":39}],39:[function(require,module,exports){
module.exports = {
  8   : 'backspace',
  9   : 'tab',
  13  : 'enter',
  16  : 'shift',
  17  : 'ctrl',
  18  : 'alt',
  20  : 'capslock',
  27  : 'esc',
  32  : 'space',
  33  : 'pageup',
  34  : 'pagedown',
  35  : 'end',
  36  : 'home',
  37  : 'left',
  38  : 'up',
  39  : 'right',
  40  : 'down',
  45  : 'ins',
  46  : 'del',
  91  : 'meta',
  93  : 'meta',
  224 : 'meta'
};

},{}],40:[function(require,module,exports){
module.exports = pubsub;

function pubsub (mix) {
  var subscribers;
  var subscribersForOnce;

  mix || (mix = function (fn) {
    if (fn) mix.subscribe(fn);
  });

  mix.subscribe = function (fn) {
    if (!subscribers) return subscribers = fn;
    if (typeof subscribers == 'function') subscribers = [subscribers];
    subscribers.push(fn);
  };

  mix.subscribe.once = function (fn) {
    if (!subscribersForOnce) return subscribersForOnce = fn;
    if (typeof subscribersForOnce == 'function') subscribersForOnce = [subscribersForOnce];
    subscribersForOnce.push(fn);
  };

  mix.unsubscribe = function (fn) {
    if (!subscribers) return;

    if (typeof subscribers == 'function') {
      if (subscribers != fn) return;
      subscribers = undefined;
      return;
    }

    var i = subscribers.length;

    while (i--) {
      if (subscribers[i] && subscribers[i] == fn){
        subscribers[i] = undefined;
        return;
      }
    }
  };

  mix.unsubscribe.once = function (fn) {
    if (!subscribersForOnce) return;

    if (typeof subscribersForOnce == 'function') {
      if (subscribersForOnce != fn) return;
      subscribersForOnce = undefined;
      return;
    }

    var i = subscribersForOnce.length;

    while (i--) {
      if (subscribersForOnce[i] && subscribersForOnce[i] == fn){
        subscribersForOnce[i] = undefined;
        return;
      }
    }
  };

  mix.publish = function () {
    var params = arguments;
    var i, len;

    if (subscribers && typeof subscribers != 'function' && subscribers.length) {
      i = -1;
      len = subscribers.length;

      while (++i < len) {
        if (!subscribers[i] || typeof subscribers[i] != 'function') continue;

        try {
          subscribers[i].apply(undefined, params);
        } catch(err) {
          setTimeout(function () { throw err; }, 0);
        }
      };
    } else if (typeof subscribers == 'function') {
      try {
        subscribers.apply(undefined, params);
      } catch(err) {
        setTimeout(function () { throw err; }, 0);
      }
    }

    if (subscribersForOnce && typeof subscribersForOnce != 'function' && subscribersForOnce.length) {
      i = -1;
      len = subscribersForOnce.length;

      while (++i < len) {
        if (!subscribersForOnce[i] || typeof subscribersForOnce[i] != 'function') continue;

        try {
          subscribersForOnce[i].apply(undefined, params);
        } catch(err) {
          setTimeout(function () { throw err; }, 0);
        }
      };

      subscribersForOnce = undefined;
    } else if (typeof subscribersForOnce == 'function') {
      try {
        subscribersForOnce.apply(undefined, params);
      } catch(err) {
        setTimeout(function () { throw err; }, 0);
      }
      subscribersForOnce = undefined;
    }
  };

  return mix;
}

},{}]},{},[2])