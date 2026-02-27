(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// when used in node, this will actually load the util module we depend on
// versus loading the builtin util module as happens otherwise
// this is a bug in node module loading as far as I am concerned
var util = require('util/');

var pSlice = Array.prototype.slice;
var hasOwn = Object.prototype.hasOwnProperty;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
  else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = stackStartFunction.name;
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && !isFinite(value)) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  // if one is a primitive, the other must be same
  if (util.isPrimitive(a) || util.isPrimitive(b)) {
    return a === b;
  }
  var aIsArgs = isArguments(a),
      bIsArgs = isArguments(b);
  if ((aIsArgs && !bIsArgs) || (!aIsArgs && bIsArgs))
    return false;
  if (aIsArgs) {
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  var ka = objectKeys(a),
      kb = objectKeys(b),
      key, i;
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

},{"util/":4}],2:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],3:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],4:[function(require,module,exports){
(function (process,global){
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

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":3,"_process":11,"inherits":2}],5:[function(require,module,exports){
module.exports = require('./vendor/dat.gui')
module.exports.color = require('./vendor/dat.color')
},{"./vendor/dat.color":6,"./vendor/dat.gui":7}],6:[function(require,module,exports){
/**
 * dat-gui JavaScript Controller Library
 * http://code.google.com/p/dat-gui
 *
 * Copyright 2011 Data Arts Team, Google Creative Lab
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */

/** @namespace */
var dat = module.exports = dat || {};

/** @namespace */
dat.color = dat.color || {};

/** @namespace */
dat.utils = dat.utils || {};

dat.utils.common = (function () {
  
  var ARR_EACH = Array.prototype.forEach;
  var ARR_SLICE = Array.prototype.slice;

  /**
   * Band-aid methods for things that should be a lot easier in JavaScript.
   * Implementation and structure inspired by underscore.js
   * http://documentcloud.github.com/underscore/
   */

  return { 
    
    BREAK: {},
  
    extend: function(target) {
      
      this.each(ARR_SLICE.call(arguments, 1), function(obj) {
        
        for (var key in obj)
          if (!this.isUndefined(obj[key])) 
            target[key] = obj[key];
        
      }, this);
      
      return target;
      
    },
    
    defaults: function(target) {
      
      this.each(ARR_SLICE.call(arguments, 1), function(obj) {
        
        for (var key in obj)
          if (this.isUndefined(target[key])) 
            target[key] = obj[key];
        
      }, this);
      
      return target;
    
    },
    
    compose: function() {
      var toCall = ARR_SLICE.call(arguments);
            return function() {
              var args = ARR_SLICE.call(arguments);
              for (var i = toCall.length -1; i >= 0; i--) {
                args = [toCall[i].apply(this, args)];
              }
              return args[0];
            }
    },
    
    each: function(obj, itr, scope) {

      
      if (ARR_EACH && obj.forEach === ARR_EACH) { 
        
        obj.forEach(itr, scope);
        
      } else if (obj.length === obj.length + 0) { // Is number but not NaN
        
        for (var key = 0, l = obj.length; key < l; key++)
          if (key in obj && itr.call(scope, obj[key], key) === this.BREAK) 
            return;
            
      } else {

        for (var key in obj) 
          if (itr.call(scope, obj[key], key) === this.BREAK)
            return;
            
      }
            
    },
    
    defer: function(fnc) {
      setTimeout(fnc, 0);
    },
    
    toArray: function(obj) {
      if (obj.toArray) return obj.toArray();
      return ARR_SLICE.call(obj);
    },

    isUndefined: function(obj) {
      return obj === undefined;
    },
    
    isNull: function(obj) {
      return obj === null;
    },
    
    isNaN: function(obj) {
      return obj !== obj;
    },
    
    isArray: Array.isArray || function(obj) {
      return obj.constructor === Array;
    },
    
    isObject: function(obj) {
      return obj === Object(obj);
    },
    
    isNumber: function(obj) {
      return obj === obj+0;
    },
    
    isString: function(obj) {
      return obj === obj+'';
    },
    
    isBoolean: function(obj) {
      return obj === false || obj === true;
    },
    
    isFunction: function(obj) {
      return Object.prototype.toString.call(obj) === '[object Function]';
    }
  
  };
    
})();


dat.color.toString = (function (common) {

  return function(color) {

    if (color.a == 1 || common.isUndefined(color.a)) {

      var s = color.hex.toString(16);
      while (s.length < 6) {
        s = '0' + s;
      }

      return '#' + s;

    } else {

      return 'rgba(' + Math.round(color.r) + ',' + Math.round(color.g) + ',' + Math.round(color.b) + ',' + color.a + ')';

    }

  }

})(dat.utils.common);


dat.Color = dat.color.Color = (function (interpret, math, toString, common) {

  var Color = function() {

    this.__state = interpret.apply(this, arguments);

    if (this.__state === false) {
      throw 'Failed to interpret color arguments';
    }

    this.__state.a = this.__state.a || 1;


  };

  Color.COMPONENTS = ['r','g','b','h','s','v','hex','a'];

  common.extend(Color.prototype, {

    toString: function() {
      return toString(this);
    },

    toOriginal: function() {
      return this.__state.conversion.write(this);
    }

  });

  defineRGBComponent(Color.prototype, 'r', 2);
  defineRGBComponent(Color.prototype, 'g', 1);
  defineRGBComponent(Color.prototype, 'b', 0);

  defineHSVComponent(Color.prototype, 'h');
  defineHSVComponent(Color.prototype, 's');
  defineHSVComponent(Color.prototype, 'v');

  Object.defineProperty(Color.prototype, 'a', {

    get: function() {
      return this.__state.a;
    },

    set: function(v) {
      this.__state.a = v;
    }

  });

  Object.defineProperty(Color.prototype, 'hex', {

    get: function() {

      if (!this.__state.space !== 'HEX') {
        this.__state.hex = math.rgb_to_hex(this.r, this.g, this.b);
      }

      return this.__state.hex;

    },

    set: function(v) {

      this.__state.space = 'HEX';
      this.__state.hex = v;

    }

  });

  function defineRGBComponent(target, component, componentHexIndex) {

    Object.defineProperty(target, component, {

      get: function() {

        if (this.__state.space === 'RGB') {
          return this.__state[component];
        }

        recalculateRGB(this, component, componentHexIndex);

        return this.__state[component];

      },

      set: function(v) {

        if (this.__state.space !== 'RGB') {
          recalculateRGB(this, component, componentHexIndex);
          this.__state.space = 'RGB';
        }

        this.__state[component] = v;

      }

    });

  }

  function defineHSVComponent(target, component) {

    Object.defineProperty(target, component, {

      get: function() {

        if (this.__state.space === 'HSV')
          return this.__state[component];

        recalculateHSV(this);

        return this.__state[component];

      },

      set: function(v) {

        if (this.__state.space !== 'HSV') {
          recalculateHSV(this);
          this.__state.space = 'HSV';
        }

        this.__state[component] = v;

      }

    });

  }

  function recalculateRGB(color, component, componentHexIndex) {

    if (color.__state.space === 'HEX') {

      color.__state[component] = math.component_from_hex(color.__state.hex, componentHexIndex);

    } else if (color.__state.space === 'HSV') {

      common.extend(color.__state, math.hsv_to_rgb(color.__state.h, color.__state.s, color.__state.v));

    } else {

      throw 'Corrupted color state';

    }

  }

  function recalculateHSV(color) {

    var result = math.rgb_to_hsv(color.r, color.g, color.b);

    common.extend(color.__state,
        {
          s: result.s,
          v: result.v
        }
    );

    if (!common.isNaN(result.h)) {
      color.__state.h = result.h;
    } else if (common.isUndefined(color.__state.h)) {
      color.__state.h = 0;
    }

  }

  return Color;

})(dat.color.interpret = (function (toString, common) {

  var result, toReturn;

  var interpret = function() {

    toReturn = false;

    var original = arguments.length > 1 ? common.toArray(arguments) : arguments[0];

    common.each(INTERPRETATIONS, function(family) {

      if (family.litmus(original)) {

        common.each(family.conversions, function(conversion, conversionName) {

          result = conversion.read(original);

          if (toReturn === false && result !== false) {
            toReturn = result;
            result.conversionName = conversionName;
            result.conversion = conversion;
            return common.BREAK;

          }

        });

        return common.BREAK;

      }

    });

    return toReturn;

  };

  var INTERPRETATIONS = [

    // Strings
    {

      litmus: common.isString,

      conversions: {

        THREE_CHAR_HEX: {

          read: function(original) {

            var test = original.match(/^#([A-F0-9])([A-F0-9])([A-F0-9])$/i);
            if (test === null) return false;

            return {
              space: 'HEX',
              hex: parseInt(
                  '0x' +
                      test[1].toString() + test[1].toString() +
                      test[2].toString() + test[2].toString() +
                      test[3].toString() + test[3].toString())
            };

          },

          write: toString

        },

        SIX_CHAR_HEX: {

          read: function(original) {

            var test = original.match(/^#([A-F0-9]{6})$/i);
            if (test === null) return false;

            return {
              space: 'HEX',
              hex: parseInt('0x' + test[1].toString())
            };

          },

          write: toString

        },

        CSS_RGB: {

          read: function(original) {

            var test = original.match(/^rgb\(\s*(.+)\s*,\s*(.+)\s*,\s*(.+)\s*\)/);
            if (test === null) return false;

            return {
              space: 'RGB',
              r: parseFloat(test[1]),
              g: parseFloat(test[2]),
              b: parseFloat(test[3])
            };

          },

          write: toString

        },

        CSS_RGBA: {

          read: function(original) {

            var test = original.match(/^rgba\(\s*(.+)\s*,\s*(.+)\s*,\s*(.+)\s*\,\s*(.+)\s*\)/);
            if (test === null) return false;

            return {
              space: 'RGB',
              r: parseFloat(test[1]),
              g: parseFloat(test[2]),
              b: parseFloat(test[3]),
              a: parseFloat(test[4])
            };

          },

          write: toString

        }

      }

    },

    // Numbers
    {

      litmus: common.isNumber,

      conversions: {

        HEX: {
          read: function(original) {
            return {
              space: 'HEX',
              hex: original,
              conversionName: 'HEX'
            }
          },

          write: function(color) {
            return color.hex;
          }
        }

      }

    },

    // Arrays
    {

      litmus: common.isArray,

      conversions: {

        RGB_ARRAY: {
          read: function(original) {
            if (original.length != 3) return false;
            return {
              space: 'RGB',
              r: original[0],
              g: original[1],
              b: original[2]
            };
          },

          write: function(color) {
            return [color.r, color.g, color.b];
          }

        },

        RGBA_ARRAY: {
          read: function(original) {
            if (original.length != 4) return false;
            return {
              space: 'RGB',
              r: original[0],
              g: original[1],
              b: original[2],
              a: original[3]
            };
          },

          write: function(color) {
            return [color.r, color.g, color.b, color.a];
          }

        }

      }

    },

    // Objects
    {

      litmus: common.isObject,

      conversions: {

        RGBA_OBJ: {
          read: function(original) {
            if (common.isNumber(original.r) &&
                common.isNumber(original.g) &&
                common.isNumber(original.b) &&
                common.isNumber(original.a)) {
              return {
                space: 'RGB',
                r: original.r,
                g: original.g,
                b: original.b,
                a: original.a
              }
            }
            return false;
          },

          write: function(color) {
            return {
              r: color.r,
              g: color.g,
              b: color.b,
              a: color.a
            }
          }
        },

        RGB_OBJ: {
          read: function(original) {
            if (common.isNumber(original.r) &&
                common.isNumber(original.g) &&
                common.isNumber(original.b)) {
              return {
                space: 'RGB',
                r: original.r,
                g: original.g,
                b: original.b
              }
            }
            return false;
          },

          write: function(color) {
            return {
              r: color.r,
              g: color.g,
              b: color.b
            }
          }
        },

        HSVA_OBJ: {
          read: function(original) {
            if (common.isNumber(original.h) &&
                common.isNumber(original.s) &&
                common.isNumber(original.v) &&
                common.isNumber(original.a)) {
              return {
                space: 'HSV',
                h: original.h,
                s: original.s,
                v: original.v,
                a: original.a
              }
            }
            return false;
          },

          write: function(color) {
            return {
              h: color.h,
              s: color.s,
              v: color.v,
              a: color.a
            }
          }
        },

        HSV_OBJ: {
          read: function(original) {
            if (common.isNumber(original.h) &&
                common.isNumber(original.s) &&
                common.isNumber(original.v)) {
              return {
                space: 'HSV',
                h: original.h,
                s: original.s,
                v: original.v
              }
            }
            return false;
          },

          write: function(color) {
            return {
              h: color.h,
              s: color.s,
              v: color.v
            }
          }

        }

      }

    }


  ];

  return interpret;


})(dat.color.toString,
dat.utils.common),
dat.color.math = (function () {

  var tmpComponent;

  return {

    hsv_to_rgb: function(h, s, v) {

      var hi = Math.floor(h / 60) % 6;

      var f = h / 60 - Math.floor(h / 60);
      var p = v * (1.0 - s);
      var q = v * (1.0 - (f * s));
      var t = v * (1.0 - ((1.0 - f) * s));
      var c = [
        [v, t, p],
        [q, v, p],
        [p, v, t],
        [p, q, v],
        [t, p, v],
        [v, p, q]
      ][hi];

      return {
        r: c[0] * 255,
        g: c[1] * 255,
        b: c[2] * 255
      };

    },

    rgb_to_hsv: function(r, g, b) {

      var min = Math.min(r, g, b),
          max = Math.max(r, g, b),
          delta = max - min,
          h, s;

      if (max != 0) {
        s = delta / max;
      } else {
        return {
          h: NaN,
          s: 0,
          v: 0
        };
      }

      if (r == max) {
        h = (g - b) / delta;
      } else if (g == max) {
        h = 2 + (b - r) / delta;
      } else {
        h = 4 + (r - g) / delta;
      }
      h /= 6;
      if (h < 0) {
        h += 1;
      }

      return {
        h: h * 360,
        s: s,
        v: max / 255
      };
    },

    rgb_to_hex: function(r, g, b) {
      var hex = this.hex_with_component(0, 2, r);
      hex = this.hex_with_component(hex, 1, g);
      hex = this.hex_with_component(hex, 0, b);
      return hex;
    },

    component_from_hex: function(hex, componentIndex) {
      return (hex >> (componentIndex * 8)) & 0xFF;
    },

    hex_with_component: function(hex, componentIndex, value) {
      return value << (tmpComponent = componentIndex * 8) | (hex & ~ (0xFF << tmpComponent));
    }

  }

})(),
dat.color.toString,
dat.utils.common);
},{}],7:[function(require,module,exports){
/**
 * dat-gui JavaScript Controller Library
 * http://code.google.com/p/dat-gui
 *
 * Copyright 2011 Data Arts Team, Google Creative Lab
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */

/** @namespace */
var dat = module.exports = dat || {};

/** @namespace */
dat.gui = dat.gui || {};

/** @namespace */
dat.utils = dat.utils || {};

/** @namespace */
dat.controllers = dat.controllers || {};

/** @namespace */
dat.dom = dat.dom || {};

/** @namespace */
dat.color = dat.color || {};

dat.utils.css = (function () {
  return {
    load: function (url, doc) {
      doc = doc || document;
      var link = doc.createElement('link');
      link.type = 'text/css';
      link.rel = 'stylesheet';
      link.href = url;
      doc.getElementsByTagName('head')[0].appendChild(link);
    },
    inject: function(css, doc) {
      doc = doc || document;
      var injected = document.createElement('style');
      injected.type = 'text/css';
      injected.innerHTML = css;
      doc.getElementsByTagName('head')[0].appendChild(injected);
    }
  }
})();


dat.utils.common = (function () {
  
  var ARR_EACH = Array.prototype.forEach;
  var ARR_SLICE = Array.prototype.slice;

  /**
   * Band-aid methods for things that should be a lot easier in JavaScript.
   * Implementation and structure inspired by underscore.js
   * http://documentcloud.github.com/underscore/
   */

  return { 
    
    BREAK: {},
  
    extend: function(target) {
      
      this.each(ARR_SLICE.call(arguments, 1), function(obj) {
        
        for (var key in obj)
          if (!this.isUndefined(obj[key])) 
            target[key] = obj[key];
        
      }, this);
      
      return target;
      
    },
    
    defaults: function(target) {
      
      this.each(ARR_SLICE.call(arguments, 1), function(obj) {
        
        for (var key in obj)
          if (this.isUndefined(target[key])) 
            target[key] = obj[key];
        
      }, this);
      
      return target;
    
    },
    
    compose: function() {
      var toCall = ARR_SLICE.call(arguments);
            return function() {
              var args = ARR_SLICE.call(arguments);
              for (var i = toCall.length -1; i >= 0; i--) {
                args = [toCall[i].apply(this, args)];
              }
              return args[0];
            }
    },
    
    each: function(obj, itr, scope) {

      
      if (ARR_EACH && obj.forEach === ARR_EACH) { 
        
        obj.forEach(itr, scope);
        
      } else if (obj.length === obj.length + 0) { // Is number but not NaN
        
        for (var key = 0, l = obj.length; key < l; key++)
          if (key in obj && itr.call(scope, obj[key], key) === this.BREAK) 
            return;
            
      } else {

        for (var key in obj) 
          if (itr.call(scope, obj[key], key) === this.BREAK)
            return;
            
      }
            
    },
    
    defer: function(fnc) {
      setTimeout(fnc, 0);
    },
    
    toArray: function(obj) {
      if (obj.toArray) return obj.toArray();
      return ARR_SLICE.call(obj);
    },

    isUndefined: function(obj) {
      return obj === undefined;
    },
    
    isNull: function(obj) {
      return obj === null;
    },
    
    isNaN: function(obj) {
      return obj !== obj;
    },
    
    isArray: Array.isArray || function(obj) {
      return obj.constructor === Array;
    },
    
    isObject: function(obj) {
      return obj === Object(obj);
    },
    
    isNumber: function(obj) {
      return obj === obj+0;
    },
    
    isString: function(obj) {
      return obj === obj+'';
    },
    
    isBoolean: function(obj) {
      return obj === false || obj === true;
    },
    
    isFunction: function(obj) {
      return Object.prototype.toString.call(obj) === '[object Function]';
    }
  
  };
    
})();


dat.controllers.Controller = (function (common) {

  /**
   * @class An "abstract" class that represents a given property of an object.
   *
   * @param {Object} object The object to be manipulated
   * @param {string} property The name of the property to be manipulated
   *
   * @member dat.controllers
   */
  var Controller = function(object, property) {

    this.initialValue = object[property];

    /**
     * Those who extend this class will put their DOM elements in here.
     * @type {DOMElement}
     */
    this.domElement = document.createElement('div');

    /**
     * The object to manipulate
     * @type {Object}
     */
    this.object = object;

    /**
     * The name of the property to manipulate
     * @type {String}
     */
    this.property = property;

    /**
     * The function to be called on change.
     * @type {Function}
     * @ignore
     */
    this.__onChange = undefined;

    /**
     * The function to be called on finishing change.
     * @type {Function}
     * @ignore
     */
    this.__onFinishChange = undefined;

  };

  common.extend(

      Controller.prototype,

      /** @lends dat.controllers.Controller.prototype */
      {

        /**
         * Specify that a function fire every time someone changes the value with
         * this Controller.
         *
         * @param {Function} fnc This function will be called whenever the value
         * is modified via this Controller.
         * @returns {dat.controllers.Controller} this
         */
        onChange: function(fnc) {
          this.__onChange = fnc;
          return this;
        },

        /**
         * Specify that a function fire every time someone "finishes" changing
         * the value wih this Controller. Useful for values that change
         * incrementally like numbers or strings.
         *
         * @param {Function} fnc This function will be called whenever
         * someone "finishes" changing the value via this Controller.
         * @returns {dat.controllers.Controller} this
         */
        onFinishChange: function(fnc) {
          this.__onFinishChange = fnc;
          return this;
        },

        /**
         * Change the value of <code>object[property]</code>
         *
         * @param {Object} newValue The new value of <code>object[property]</code>
         */
        setValue: function(newValue) {
          this.object[this.property] = newValue;
          if (this.__onChange) {
            this.__onChange.call(this, newValue);
          }
          this.updateDisplay();
          return this;
        },

        /**
         * Gets the value of <code>object[property]</code>
         *
         * @returns {Object} The current value of <code>object[property]</code>
         */
        getValue: function() {
          return this.object[this.property];
        },

        /**
         * Refreshes the visual display of a Controller in order to keep sync
         * with the object's current value.
         * @returns {dat.controllers.Controller} this
         */
        updateDisplay: function() {
          return this;
        },

        /**
         * @returns {Boolean} true if the value has deviated from initialValue
         */
        isModified: function() {
          return this.initialValue !== this.getValue()
        }

      }

  );

  return Controller;


})(dat.utils.common);


dat.dom.dom = (function (common) {

  var EVENT_MAP = {
    'HTMLEvents': ['change'],
    'MouseEvents': ['click','mousemove','mousedown','mouseup', 'mouseover'],
    'KeyboardEvents': ['keydown']
  };

  var EVENT_MAP_INV = {};
  common.each(EVENT_MAP, function(v, k) {
    common.each(v, function(e) {
      EVENT_MAP_INV[e] = k;
    });
  });

  var CSS_VALUE_PIXELS = /(\d+(\.\d+)?)px/;

  function cssValueToPixels(val) {

    if (val === '0' || common.isUndefined(val)) return 0;

    var match = val.match(CSS_VALUE_PIXELS);

    if (!common.isNull(match)) {
      return parseFloat(match[1]);
    }

    // TODO ...ems? %?

    return 0;

  }

  /**
   * @namespace
   * @member dat.dom
   */
  var dom = {

    /**
     * 
     * @param elem
     * @param selectable
     */
    makeSelectable: function(elem, selectable) {

      if (elem === undefined || elem.style === undefined) return;

      elem.onselectstart = selectable ? function() {
        return false;
      } : function() {
      };

      elem.style.MozUserSelect = selectable ? 'auto' : 'none';
      elem.style.KhtmlUserSelect = selectable ? 'auto' : 'none';
      elem.unselectable = selectable ? 'on' : 'off';

    },

    /**
     *
     * @param elem
     * @param horizontal
     * @param vertical
     */
    makeFullscreen: function(elem, horizontal, vertical) {

      if (common.isUndefined(horizontal)) horizontal = true;
      if (common.isUndefined(vertical)) vertical = true;

      elem.style.position = 'absolute';

      if (horizontal) {
        elem.style.left = 0;
        elem.style.right = 0;
      }
      if (vertical) {
        elem.style.top = 0;
        elem.style.bottom = 0;
      }

    },

    /**
     *
     * @param elem
     * @param eventType
     * @param params
     */
    fakeEvent: function(elem, eventType, params, aux) {
      params = params || {};
      var className = EVENT_MAP_INV[eventType];
      if (!className) {
        throw new Error('Event type ' + eventType + ' not supported.');
      }
      var evt = document.createEvent(className);
      switch (className) {
        case 'MouseEvents':
          var clientX = params.x || params.clientX || 0;
          var clientY = params.y || params.clientY || 0;
          evt.initMouseEvent(eventType, params.bubbles || false,
              params.cancelable || true, window, params.clickCount || 1,
              0, //screen X
              0, //screen Y
              clientX, //client X
              clientY, //client Y
              false, false, false, false, 0, null);
          break;
        case 'KeyboardEvents':
          var init = evt.initKeyboardEvent || evt.initKeyEvent; // webkit || moz
          common.defaults(params, {
            cancelable: true,
            ctrlKey: false,
            altKey: false,
            shiftKey: false,
            metaKey: false,
            keyCode: undefined,
            charCode: undefined
          });
          init(eventType, params.bubbles || false,
              params.cancelable, window,
              params.ctrlKey, params.altKey,
              params.shiftKey, params.metaKey,
              params.keyCode, params.charCode);
          break;
        default:
          evt.initEvent(eventType, params.bubbles || false,
              params.cancelable || true);
          break;
      }
      common.defaults(evt, aux);
      elem.dispatchEvent(evt);
    },

    /**
     *
     * @param elem
     * @param event
     * @param func
     * @param bool
     */
    bind: function(elem, event, func, bool) {
      bool = bool || false;
      if (elem.addEventListener)
        elem.addEventListener(event, func, bool);
      else if (elem.attachEvent)
        elem.attachEvent('on' + event, func);
      return dom;
    },

    /**
     *
     * @param elem
     * @param event
     * @param func
     * @param bool
     */
    unbind: function(elem, event, func, bool) {
      bool = bool || false;
      if (elem.removeEventListener)
        elem.removeEventListener(event, func, bool);
      else if (elem.detachEvent)
        elem.detachEvent('on' + event, func);
      return dom;
    },

    /**
     *
     * @param elem
     * @param className
     */
    addClass: function(elem, className) {
      if (elem.className === undefined) {
        elem.className = className;
      } else if (elem.className !== className) {
        var classes = elem.className.split(/ +/);
        if (classes.indexOf(className) == -1) {
          classes.push(className);
          elem.className = classes.join(' ').replace(/^\s+/, '').replace(/\s+$/, '');
        }
      }
      return dom;
    },

    /**
     *
     * @param elem
     * @param className
     */
    removeClass: function(elem, className) {
      if (className) {
        if (elem.className === undefined) {
          // elem.className = className;
        } else if (elem.className === className) {
          elem.removeAttribute('class');
        } else {
          var classes = elem.className.split(/ +/);
          var index = classes.indexOf(className);
          if (index != -1) {
            classes.splice(index, 1);
            elem.className = classes.join(' ');
          }
        }
      } else {
        elem.className = undefined;
      }
      return dom;
    },

    hasClass: function(elem, className) {
      return new RegExp('(?:^|\\s+)' + className + '(?:\\s+|$)').test(elem.className) || false;
    },

    /**
     *
     * @param elem
     */
    getWidth: function(elem) {

      var style = getComputedStyle(elem);

      return cssValueToPixels(style['border-left-width']) +
          cssValueToPixels(style['border-right-width']) +
          cssValueToPixels(style['padding-left']) +
          cssValueToPixels(style['padding-right']) +
          cssValueToPixels(style['width']);
    },

    /**
     *
     * @param elem
     */
    getHeight: function(elem) {

      var style = getComputedStyle(elem);

      return cssValueToPixels(style['border-top-width']) +
          cssValueToPixels(style['border-bottom-width']) +
          cssValueToPixels(style['padding-top']) +
          cssValueToPixels(style['padding-bottom']) +
          cssValueToPixels(style['height']);
    },

    /**
     *
     * @param elem
     */
    getOffset: function(elem) {
      var offset = {left: 0, top:0};
      if (elem.offsetParent) {
        do {
          offset.left += elem.offsetLeft;
          offset.top += elem.offsetTop;
        } while (elem = elem.offsetParent);
      }
      return offset;
    },

    // http://stackoverflow.com/posts/2684561/revisions
    /**
     * 
     * @param elem
     */
    isActive: function(elem) {
      return elem === document.activeElement && ( elem.type || elem.href );
    }

  };

  return dom;

})(dat.utils.common);


dat.controllers.OptionController = (function (Controller, dom, common) {

  /**
   * @class Provides a select input to alter the property of an object, using a
   * list of accepted values.
   *
   * @extends dat.controllers.Controller
   *
   * @param {Object} object The object to be manipulated
   * @param {string} property The name of the property to be manipulated
   * @param {Object|string[]} options A map of labels to acceptable values, or
   * a list of acceptable string values.
   *
   * @member dat.controllers
   */
  var OptionController = function(object, property, options) {

    OptionController.superclass.call(this, object, property);

    var _this = this;

    /**
     * The drop down menu
     * @ignore
     */
    this.__select = document.createElement('select');

    if (common.isArray(options)) {
      var map = {};
      common.each(options, function(element) {
        map[element] = element;
      });
      options = map;
    }

    common.each(options, function(value, key) {

      var opt = document.createElement('option');
      opt.innerHTML = key;
      opt.setAttribute('value', value);
      _this.__select.appendChild(opt);

    });

    // Acknowledge original value
    this.updateDisplay();

    dom.bind(this.__select, 'change', function() {
      var desiredValue = this.options[this.selectedIndex].value;
      _this.setValue(desiredValue);
    });

    this.domElement.appendChild(this.__select);

  };

  OptionController.superclass = Controller;

  common.extend(

      OptionController.prototype,
      Controller.prototype,

      {

        setValue: function(v) {
          var toReturn = OptionController.superclass.prototype.setValue.call(this, v);
          if (this.__onFinishChange) {
            this.__onFinishChange.call(this, this.getValue());
          }
          return toReturn;
        },

        updateDisplay: function() {
          this.__select.value = this.getValue();
          return OptionController.superclass.prototype.updateDisplay.call(this);
        }

      }

  );

  return OptionController;

})(dat.controllers.Controller,
dat.dom.dom,
dat.utils.common);


dat.controllers.NumberController = (function (Controller, common) {

  /**
   * @class Represents a given property of an object that is a number.
   *
   * @extends dat.controllers.Controller
   *
   * @param {Object} object The object to be manipulated
   * @param {string} property The name of the property to be manipulated
   * @param {Object} [params] Optional parameters
   * @param {Number} [params.min] Minimum allowed value
   * @param {Number} [params.max] Maximum allowed value
   * @param {Number} [params.step] Increment by which to change value
   *
   * @member dat.controllers
   */
  var NumberController = function(object, property, params) {

    NumberController.superclass.call(this, object, property);

    params = params || {};

    this.__min = params.min;
    this.__max = params.max;
    this.__step = params.step;

    if (common.isUndefined(this.__step)) {

      if (this.initialValue == 0) {
        this.__impliedStep = 1; // What are we, psychics?
      } else {
        // Hey Doug, check this out.
        this.__impliedStep = Math.pow(10, Math.floor(Math.log(this.initialValue)/Math.LN10))/10;
      }

    } else {

      this.__impliedStep = this.__step;

    }

    this.__precision = numDecimals(this.__impliedStep);


  };

  NumberController.superclass = Controller;

  common.extend(

      NumberController.prototype,
      Controller.prototype,

      /** @lends dat.controllers.NumberController.prototype */
      {

        setValue: function(v) {

          if (this.__min !== undefined && v < this.__min) {
            v = this.__min;
          } else if (this.__max !== undefined && v > this.__max) {
            v = this.__max;
          }

          if (this.__step !== undefined && v % this.__step != 0) {
            v = Math.round(v / this.__step) * this.__step;
          }

          return NumberController.superclass.prototype.setValue.call(this, v);

        },

        /**
         * Specify a minimum value for <code>object[property]</code>.
         *
         * @param {Number} minValue The minimum value for
         * <code>object[property]</code>
         * @returns {dat.controllers.NumberController} this
         */
        min: function(v) {
          this.__min = v;
          return this;
        },

        /**
         * Specify a maximum value for <code>object[property]</code>.
         *
         * @param {Number} maxValue The maximum value for
         * <code>object[property]</code>
         * @returns {dat.controllers.NumberController} this
         */
        max: function(v) {
          this.__max = v;
          return this;
        },

        /**
         * Specify a step value that dat.controllers.NumberController
         * increments by.
         *
         * @param {Number} stepValue The step value for
         * dat.controllers.NumberController
         * @default if minimum and maximum specified increment is 1% of the
         * difference otherwise stepValue is 1
         * @returns {dat.controllers.NumberController} this
         */
        step: function(v) {
          this.__step = v;
          return this;
        }

      }

  );

  function numDecimals(x) {
    x = x.toString();
    if (x.indexOf('.') > -1) {
      return x.length - x.indexOf('.') - 1;
    } else {
      return 0;
    }
  }

  return NumberController;

})(dat.controllers.Controller,
dat.utils.common);


dat.controllers.NumberControllerBox = (function (NumberController, dom, common) {

  /**
   * @class Represents a given property of an object that is a number and
   * provides an input element with which to manipulate it.
   *
   * @extends dat.controllers.Controller
   * @extends dat.controllers.NumberController
   *
   * @param {Object} object The object to be manipulated
   * @param {string} property The name of the property to be manipulated
   * @param {Object} [params] Optional parameters
   * @param {Number} [params.min] Minimum allowed value
   * @param {Number} [params.max] Maximum allowed value
   * @param {Number} [params.step] Increment by which to change value
   *
   * @member dat.controllers
   */
  var NumberControllerBox = function(object, property, params) {

    this.__truncationSuspended = false;

    NumberControllerBox.superclass.call(this, object, property, params);

    var _this = this;

    /**
     * {Number} Previous mouse y position
     * @ignore
     */
    var prev_y;

    this.__input = document.createElement('input');
    this.__input.setAttribute('type', 'text');

    // Makes it so manually specified values are not truncated.

    dom.bind(this.__input, 'change', onChange);
    dom.bind(this.__input, 'blur', onBlur);
    dom.bind(this.__input, 'mousedown', onMouseDown);
    dom.bind(this.__input, 'keydown', function(e) {

      // When pressing entire, you can be as precise as you want.
      if (e.keyCode === 13) {
        _this.__truncationSuspended = true;
        this.blur();
        _this.__truncationSuspended = false;
      }

    });

    function onChange() {
      var attempted = parseFloat(_this.__input.value);
      if (!common.isNaN(attempted)) _this.setValue(attempted);
    }

    function onBlur() {
      onChange();
      if (_this.__onFinishChange) {
        _this.__onFinishChange.call(_this, _this.getValue());
      }
    }

    function onMouseDown(e) {
      dom.bind(window, 'mousemove', onMouseDrag);
      dom.bind(window, 'mouseup', onMouseUp);
      prev_y = e.clientY;
    }

    function onMouseDrag(e) {

      var diff = prev_y - e.clientY;
      _this.setValue(_this.getValue() + diff * _this.__impliedStep);

      prev_y = e.clientY;

    }

    function onMouseUp() {
      dom.unbind(window, 'mousemove', onMouseDrag);
      dom.unbind(window, 'mouseup', onMouseUp);
    }

    this.updateDisplay();

    this.domElement.appendChild(this.__input);

  };

  NumberControllerBox.superclass = NumberController;

  common.extend(

      NumberControllerBox.prototype,
      NumberController.prototype,

      {

        updateDisplay: function() {

          this.__input.value = this.__truncationSuspended ? this.getValue() : roundToDecimal(this.getValue(), this.__precision);
          return NumberControllerBox.superclass.prototype.updateDisplay.call(this);
        }

      }

  );

  function roundToDecimal(value, decimals) {
    var tenTo = Math.pow(10, decimals);
    return Math.round(value * tenTo) / tenTo;
  }

  return NumberControllerBox;

})(dat.controllers.NumberController,
dat.dom.dom,
dat.utils.common);


dat.controllers.NumberControllerSlider = (function (NumberController, dom, css, common, styleSheet) {

  /**
   * @class Represents a given property of an object that is a number, contains
   * a minimum and maximum, and provides a slider element with which to
   * manipulate it. It should be noted that the slider element is made up of
   * <code>&lt;div&gt;</code> tags, <strong>not</strong> the html5
   * <code>&lt;slider&gt;</code> element.
   *
   * @extends dat.controllers.Controller
   * @extends dat.controllers.NumberController
   * 
   * @param {Object} object The object to be manipulated
   * @param {string} property The name of the property to be manipulated
   * @param {Number} minValue Minimum allowed value
   * @param {Number} maxValue Maximum allowed value
   * @param {Number} stepValue Increment by which to change value
   *
   * @member dat.controllers
   */
  var NumberControllerSlider = function(object, property, min, max, step) {

    NumberControllerSlider.superclass.call(this, object, property, { min: min, max: max, step: step });

    var _this = this;

    this.__background = document.createElement('div');
    this.__foreground = document.createElement('div');
    


    dom.bind(this.__background, 'mousedown', onMouseDown);
    
    dom.addClass(this.__background, 'slider');
    dom.addClass(this.__foreground, 'slider-fg');

    function onMouseDown(e) {

      dom.bind(window, 'mousemove', onMouseDrag);
      dom.bind(window, 'mouseup', onMouseUp);

      onMouseDrag(e);
    }

    function onMouseDrag(e) {

      e.preventDefault();

      var offset = dom.getOffset(_this.__background);
      var width = dom.getWidth(_this.__background);
      
      _this.setValue(
        map(e.clientX, offset.left, offset.left + width, _this.__min, _this.__max)
      );

      return false;

    }

    function onMouseUp() {
      dom.unbind(window, 'mousemove', onMouseDrag);
      dom.unbind(window, 'mouseup', onMouseUp);
      if (_this.__onFinishChange) {
        _this.__onFinishChange.call(_this, _this.getValue());
      }
    }

    this.updateDisplay();

    this.__background.appendChild(this.__foreground);
    this.domElement.appendChild(this.__background);

  };

  NumberControllerSlider.superclass = NumberController;

  /**
   * Injects default stylesheet for slider elements.
   */
  NumberControllerSlider.useDefaultStyles = function() {
    css.inject(styleSheet);
  };

  common.extend(

      NumberControllerSlider.prototype,
      NumberController.prototype,

      {

        updateDisplay: function() {
          var pct = (this.getValue() - this.__min)/(this.__max - this.__min);
          this.__foreground.style.width = pct*100+'%';
          return NumberControllerSlider.superclass.prototype.updateDisplay.call(this);
        }

      }



  );

  function map(v, i1, i2, o1, o2) {
    return o1 + (o2 - o1) * ((v - i1) / (i2 - i1));
  }

  return NumberControllerSlider;
  
})(dat.controllers.NumberController,
dat.dom.dom,
dat.utils.css,
dat.utils.common,
".slider {\n  box-shadow: inset 0 2px 4px rgba(0,0,0,0.15);\n  height: 1em;\n  border-radius: 1em;\n  background-color: #eee;\n  padding: 0 0.5em;\n  overflow: hidden;\n}\n\n.slider-fg {\n  padding: 1px 0 2px 0;\n  background-color: #aaa;\n  height: 1em;\n  margin-left: -0.5em;\n  padding-right: 0.5em;\n  border-radius: 1em 0 0 1em;\n}\n\n.slider-fg:after {\n  display: inline-block;\n  border-radius: 1em;\n  background-color: #fff;\n  border:  1px solid #aaa;\n  content: '';\n  float: right;\n  margin-right: -1em;\n  margin-top: -1px;\n  height: 0.9em;\n  width: 0.9em;\n}");


dat.controllers.FunctionController = (function (Controller, dom, common) {

  /**
   * @class Provides a GUI interface to fire a specified method, a property of an object.
   *
   * @extends dat.controllers.Controller
   *
   * @param {Object} object The object to be manipulated
   * @param {string} property The name of the property to be manipulated
   *
   * @member dat.controllers
   */
  var FunctionController = function(object, property, text) {

    FunctionController.superclass.call(this, object, property);

    var _this = this;

    this.__button = document.createElement('div');
    this.__button.innerHTML = text === undefined ? 'Fire' : text;
    dom.bind(this.__button, 'click', function(e) {
      e.preventDefault();
      _this.fire();
      return false;
    });

    dom.addClass(this.__button, 'button');

    this.domElement.appendChild(this.__button);


  };

  FunctionController.superclass = Controller;

  common.extend(

      FunctionController.prototype,
      Controller.prototype,
      {
        
        fire: function() {
          if (this.__onChange) {
            this.__onChange.call(this);
          }
          if (this.__onFinishChange) {
            this.__onFinishChange.call(this, this.getValue());
          }
          this.getValue().call(this.object);
        }
      }

  );

  return FunctionController;

})(dat.controllers.Controller,
dat.dom.dom,
dat.utils.common);


dat.controllers.BooleanController = (function (Controller, dom, common) {

  /**
   * @class Provides a checkbox input to alter the boolean property of an object.
   * @extends dat.controllers.Controller
   *
   * @param {Object} object The object to be manipulated
   * @param {string} property The name of the property to be manipulated
   *
   * @member dat.controllers
   */
  var BooleanController = function(object, property) {

    BooleanController.superclass.call(this, object, property);

    var _this = this;
    this.__prev = this.getValue();

    this.__checkbox = document.createElement('input');
    this.__checkbox.setAttribute('type', 'checkbox');


    dom.bind(this.__checkbox, 'change', onChange, false);

    this.domElement.appendChild(this.__checkbox);

    // Match original value
    this.updateDisplay();

    function onChange() {
      _this.setValue(!_this.__prev);
    }

  };

  BooleanController.superclass = Controller;

  common.extend(

      BooleanController.prototype,
      Controller.prototype,

      {

        setValue: function(v) {
          var toReturn = BooleanController.superclass.prototype.setValue.call(this, v);
          if (this.__onFinishChange) {
            this.__onFinishChange.call(this, this.getValue());
          }
          this.__prev = this.getValue();
          return toReturn;
        },

        updateDisplay: function() {
          
          if (this.getValue() === true) {
            this.__checkbox.setAttribute('checked', 'checked');
            this.__checkbox.checked = true;    
          } else {
              this.__checkbox.checked = false;
          }

          return BooleanController.superclass.prototype.updateDisplay.call(this);

        }


      }

  );

  return BooleanController;

})(dat.controllers.Controller,
dat.dom.dom,
dat.utils.common);


dat.color.toString = (function (common) {

  return function(color) {

    if (color.a == 1 || common.isUndefined(color.a)) {

      var s = color.hex.toString(16);
      while (s.length < 6) {
        s = '0' + s;
      }

      return '#' + s;

    } else {

      return 'rgba(' + Math.round(color.r) + ',' + Math.round(color.g) + ',' + Math.round(color.b) + ',' + color.a + ')';

    }

  }

})(dat.utils.common);


dat.color.interpret = (function (toString, common) {

  var result, toReturn;

  var interpret = function() {

    toReturn = false;

    var original = arguments.length > 1 ? common.toArray(arguments) : arguments[0];

    common.each(INTERPRETATIONS, function(family) {

      if (family.litmus(original)) {

        common.each(family.conversions, function(conversion, conversionName) {

          result = conversion.read(original);

          if (toReturn === false && result !== false) {
            toReturn = result;
            result.conversionName = conversionName;
            result.conversion = conversion;
            return common.BREAK;

          }

        });

        return common.BREAK;

      }

    });

    return toReturn;

  };

  var INTERPRETATIONS = [

    // Strings
    {

      litmus: common.isString,

      conversions: {

        THREE_CHAR_HEX: {

          read: function(original) {

            var test = original.match(/^#([A-F0-9])([A-F0-9])([A-F0-9])$/i);
            if (test === null) return false;

            return {
              space: 'HEX',
              hex: parseInt(
                  '0x' +
                      test[1].toString() + test[1].toString() +
                      test[2].toString() + test[2].toString() +
                      test[3].toString() + test[3].toString())
            };

          },

          write: toString

        },

        SIX_CHAR_HEX: {

          read: function(original) {

            var test = original.match(/^#([A-F0-9]{6})$/i);
            if (test === null) return false;

            return {
              space: 'HEX',
              hex: parseInt('0x' + test[1].toString())
            };

          },

          write: toString

        },

        CSS_RGB: {

          read: function(original) {

            var test = original.match(/^rgb\(\s*(.+)\s*,\s*(.+)\s*,\s*(.+)\s*\)/);
            if (test === null) return false;

            return {
              space: 'RGB',
              r: parseFloat(test[1]),
              g: parseFloat(test[2]),
              b: parseFloat(test[3])
            };

          },

          write: toString

        },

        CSS_RGBA: {

          read: function(original) {

            var test = original.match(/^rgba\(\s*(.+)\s*,\s*(.+)\s*,\s*(.+)\s*\,\s*(.+)\s*\)/);
            if (test === null) return false;

            return {
              space: 'RGB',
              r: parseFloat(test[1]),
              g: parseFloat(test[2]),
              b: parseFloat(test[3]),
              a: parseFloat(test[4])
            };

          },

          write: toString

        }

      }

    },

    // Numbers
    {

      litmus: common.isNumber,

      conversions: {

        HEX: {
          read: function(original) {
            return {
              space: 'HEX',
              hex: original,
              conversionName: 'HEX'
            }
          },

          write: function(color) {
            return color.hex;
          }
        }

      }

    },

    // Arrays
    {

      litmus: common.isArray,

      conversions: {

        RGB_ARRAY: {
          read: function(original) {
            if (original.length != 3) return false;
            return {
              space: 'RGB',
              r: original[0],
              g: original[1],
              b: original[2]
            };
          },

          write: function(color) {
            return [color.r, color.g, color.b];
          }

        },

        RGBA_ARRAY: {
          read: function(original) {
            if (original.length != 4) return false;
            return {
              space: 'RGB',
              r: original[0],
              g: original[1],
              b: original[2],
              a: original[3]
            };
          },

          write: function(color) {
            return [color.r, color.g, color.b, color.a];
          }

        }

      }

    },

    // Objects
    {

      litmus: common.isObject,

      conversions: {

        RGBA_OBJ: {
          read: function(original) {
            if (common.isNumber(original.r) &&
                common.isNumber(original.g) &&
                common.isNumber(original.b) &&
                common.isNumber(original.a)) {
              return {
                space: 'RGB',
                r: original.r,
                g: original.g,
                b: original.b,
                a: original.a
              }
            }
            return false;
          },

          write: function(color) {
            return {
              r: color.r,
              g: color.g,
              b: color.b,
              a: color.a
            }
          }
        },

        RGB_OBJ: {
          read: function(original) {
            if (common.isNumber(original.r) &&
                common.isNumber(original.g) &&
                common.isNumber(original.b)) {
              return {
                space: 'RGB',
                r: original.r,
                g: original.g,
                b: original.b
              }
            }
            return false;
          },

          write: function(color) {
            return {
              r: color.r,
              g: color.g,
              b: color.b
            }
          }
        },

        HSVA_OBJ: {
          read: function(original) {
            if (common.isNumber(original.h) &&
                common.isNumber(original.s) &&
                common.isNumber(original.v) &&
                common.isNumber(original.a)) {
              return {
                space: 'HSV',
                h: original.h,
                s: original.s,
                v: original.v,
                a: original.a
              }
            }
            return false;
          },

          write: function(color) {
            return {
              h: color.h,
              s: color.s,
              v: color.v,
              a: color.a
            }
          }
        },

        HSV_OBJ: {
          read: function(original) {
            if (common.isNumber(original.h) &&
                common.isNumber(original.s) &&
                common.isNumber(original.v)) {
              return {
                space: 'HSV',
                h: original.h,
                s: original.s,
                v: original.v
              }
            }
            return false;
          },

          write: function(color) {
            return {
              h: color.h,
              s: color.s,
              v: color.v
            }
          }

        }

      }

    }


  ];

  return interpret;


})(dat.color.toString,
dat.utils.common);


dat.GUI = dat.gui.GUI = (function (css, saveDialogueContents, styleSheet, controllerFactory, Controller, BooleanController, FunctionController, NumberControllerBox, NumberControllerSlider, OptionController, ColorController, requestAnimationFrame, CenteredDiv, dom, common) {

  css.inject(styleSheet);

  /** Outer-most className for GUI's */
  var CSS_NAMESPACE = 'dg';

  var HIDE_KEY_CODE = 72;

  /** The only value shared between the JS and SCSS. Use caution. */
  var CLOSE_BUTTON_HEIGHT = 20;

  var DEFAULT_DEFAULT_PRESET_NAME = 'Default';

  var SUPPORTS_LOCAL_STORAGE = (function() {
    try {
      return 'localStorage' in window && window['localStorage'] !== null;
    } catch (e) {
      return false;
    }
  })();

  var SAVE_DIALOGUE;

  /** Have we yet to create an autoPlace GUI? */
  var auto_place_virgin = true;

  /** Fixed position div that auto place GUI's go inside */
  var auto_place_container;

  /** Are we hiding the GUI's ? */
  var hide = false;

  /** GUI's which should be hidden */
  var hideable_guis = [];

  /**
   * A lightweight controller library for JavaScript. It allows you to easily
   * manipulate variables and fire functions on the fly.
   * @class
   *
   * @member dat.gui
   *
   * @param {Object} [params]
   * @param {String} [params.name] The name of this GUI.
   * @param {Object} [params.load] JSON object representing the saved state of
   * this GUI.
   * @param {Boolean} [params.auto=true]
   * @param {dat.gui.GUI} [params.parent] The GUI I'm nested in.
   * @param {Boolean} [params.closed] If true, starts closed
   */
  var GUI = function(params) {

    var _this = this;

    /**
     * Outermost DOM Element
     * @type DOMElement
     */
    this.domElement = document.createElement('div');
    this.__ul = document.createElement('ul');
    this.domElement.appendChild(this.__ul);

    dom.addClass(this.domElement, CSS_NAMESPACE);

    /**
     * Nested GUI's by name
     * @ignore
     */
    this.__folders = {};

    this.__controllers = [];

    /**
     * List of objects I'm remembering for save, only used in top level GUI
     * @ignore
     */
    this.__rememberedObjects = [];

    /**
     * Maps the index of remembered objects to a map of controllers, only used
     * in top level GUI.
     *
     * @private
     * @ignore
     *
     * @example
     * [
     *  {
     *    propertyName: Controller,
     *    anotherPropertyName: Controller
     *  },
     *  {
     *    propertyName: Controller
     *  }
     * ]
     */
    this.__rememberedObjectIndecesToControllers = [];

    this.__listening = [];

    params = params || {};

    // Default parameters
    params = common.defaults(params, {
      autoPlace: true,
      width: GUI.DEFAULT_WIDTH
    });

    params = common.defaults(params, {
      resizable: params.autoPlace,
      hideable: params.autoPlace
    });


    if (!common.isUndefined(params.load)) {

      // Explicit preset
      if (params.preset) params.load.preset = params.preset;

    } else {

      params.load = { preset: DEFAULT_DEFAULT_PRESET_NAME };

    }

    if (common.isUndefined(params.parent) && params.hideable) {
      hideable_guis.push(this);
    }

    // Only root level GUI's are resizable.
    params.resizable = common.isUndefined(params.parent) && params.resizable;


    if (params.autoPlace && common.isUndefined(params.scrollable)) {
      params.scrollable = true;
    }
//    params.scrollable = common.isUndefined(params.parent) && params.scrollable === true;

    // Not part of params because I don't want people passing this in via
    // constructor. Should be a 'remembered' value.
    var use_local_storage =
        SUPPORTS_LOCAL_STORAGE &&
            localStorage.getItem(getLocalStorageHash(this, 'isLocal')) === 'true';

    Object.defineProperties(this,

        /** @lends dat.gui.GUI.prototype */
        {

          /**
           * The parent <code>GUI</code>
           * @type dat.gui.GUI
           */
          parent: {
            get: function() {
              return params.parent;
            }
          },

          scrollable: {
            get: function() {
              return params.scrollable;
            }
          },

          /**
           * Handles <code>GUI</code>'s element placement for you
           * @type Boolean
           */
          autoPlace: {
            get: function() {
              return params.autoPlace;
            }
          },

          /**
           * The identifier for a set of saved values
           * @type String
           */
          preset: {

            get: function() {
              if (_this.parent) {
                return _this.getRoot().preset;
              } else {
                return params.load.preset;
              }
            },

            set: function(v) {
              if (_this.parent) {
                _this.getRoot().preset = v;
              } else {
                params.load.preset = v;
              }
              setPresetSelectIndex(this);
              _this.revert();
            }

          },

          /**
           * The width of <code>GUI</code> element
           * @type Number
           */
          width: {
            get: function() {
              return params.width;
            },
            set: function(v) {
              params.width = v;
              setWidth(_this, v);
            }
          },

          /**
           * The name of <code>GUI</code>. Used for folders. i.e
           * a folder's name
           * @type String
           */
          name: {
            get: function() {
              return params.name;
            },
            set: function(v) {
              // TODO Check for collisions among sibling folders
              params.name = v;
              if (title_row_name) {
                title_row_name.innerHTML = params.name;
              }
            }
          },

          /**
           * Whether the <code>GUI</code> is collapsed or not
           * @type Boolean
           */
          closed: {
            get: function() {
              return params.closed;
            },
            set: function(v) {
              params.closed = v;
              if (params.closed) {
                dom.addClass(_this.__ul, GUI.CLASS_CLOSED);
              } else {
                dom.removeClass(_this.__ul, GUI.CLASS_CLOSED);
              }
              // For browsers that aren't going to respect the CSS transition,
              // Lets just check our height against the window height right off
              // the bat.
              this.onResize();

              if (_this.__closeButton) {
                _this.__closeButton.innerHTML = v ? GUI.TEXT_OPEN : GUI.TEXT_CLOSED;
              }
            }
          },

          /**
           * Contains all presets
           * @type Object
           */
          load: {
            get: function() {
              return params.load;
            }
          },

          /**
           * Determines whether or not to use <a href="https://developer.mozilla.org/en/DOM/Storage#localStorage">localStorage</a> as the means for
           * <code>remember</code>ing
           * @type Boolean
           */
          useLocalStorage: {

            get: function() {
              return use_local_storage;
            },
            set: function(bool) {
              if (SUPPORTS_LOCAL_STORAGE) {
                use_local_storage = bool;
                if (bool) {
                  dom.bind(window, 'unload', saveToLocalStorage);
                } else {
                  dom.unbind(window, 'unload', saveToLocalStorage);
                }
                localStorage.setItem(getLocalStorageHash(_this, 'isLocal'), bool);
              }
            }

          }

        });

    // Are we a root level GUI?
    if (common.isUndefined(params.parent)) {

      params.closed = false;

      dom.addClass(this.domElement, GUI.CLASS_MAIN);
      dom.makeSelectable(this.domElement, false);

      // Are we supposed to be loading locally?
      if (SUPPORTS_LOCAL_STORAGE) {

        if (use_local_storage) {

          _this.useLocalStorage = true;

          var saved_gui = localStorage.getItem(getLocalStorageHash(this, 'gui'));

          if (saved_gui) {
            params.load = JSON.parse(saved_gui);
          }

        }

      }

      this.__closeButton = document.createElement('div');
      this.__closeButton.innerHTML = GUI.TEXT_CLOSED;
      dom.addClass(this.__closeButton, GUI.CLASS_CLOSE_BUTTON);
      this.domElement.appendChild(this.__closeButton);

      dom.bind(this.__closeButton, 'click', function() {

        _this.closed = !_this.closed;


      });


      // Oh, you're a nested GUI!
    } else {

      if (params.closed === undefined) {
        params.closed = true;
      }

      var title_row_name = document.createTextNode(params.name);
      dom.addClass(title_row_name, 'controller-name');

      var title_row = addRow(_this, title_row_name);

      var on_click_title = function(e) {
        e.preventDefault();
        _this.closed = !_this.closed;
        return false;
      };

      dom.addClass(this.__ul, GUI.CLASS_CLOSED);

      dom.addClass(title_row, 'title');
      dom.bind(title_row, 'click', on_click_title);

      if (!params.closed) {
        this.closed = false;
      }

    }

    if (params.autoPlace) {

      if (common.isUndefined(params.parent)) {

        if (auto_place_virgin) {
          auto_place_container = document.createElement('div');
          dom.addClass(auto_place_container, CSS_NAMESPACE);
          dom.addClass(auto_place_container, GUI.CLASS_AUTO_PLACE_CONTAINER);
          document.body.appendChild(auto_place_container);
          auto_place_virgin = false;
        }

        // Put it in the dom for you.
        auto_place_container.appendChild(this.domElement);

        // Apply the auto styles
        dom.addClass(this.domElement, GUI.CLASS_AUTO_PLACE);

      }


      // Make it not elastic.
      if (!this.parent) setWidth(_this, params.width);

    }

    dom.bind(window, 'resize', function() { _this.onResize() });
    dom.bind(this.__ul, 'webkitTransitionEnd', function() { _this.onResize(); });
    dom.bind(this.__ul, 'transitionend', function() { _this.onResize() });
    dom.bind(this.__ul, 'oTransitionEnd', function() { _this.onResize() });
    this.onResize();


    if (params.resizable) {
      addResizeHandle(this);
    }

    function saveToLocalStorage() {
      localStorage.setItem(getLocalStorageHash(_this, 'gui'), JSON.stringify(_this.getSaveObject()));
    }

    var root = _this.getRoot();
    function resetWidth() {
        var root = _this.getRoot();
        root.width += 1;
        common.defer(function() {
          root.width -= 1;
        });
      }

      if (!params.parent) {
        resetWidth();
      }

  };

  GUI.toggleHide = function() {

    hide = !hide;
    common.each(hideable_guis, function(gui) {
      gui.domElement.style.zIndex = hide ? -999 : 999;
      gui.domElement.style.opacity = hide ? 0 : 1;
    });
  };

  GUI.CLASS_AUTO_PLACE = 'a';
  GUI.CLASS_AUTO_PLACE_CONTAINER = 'ac';
  GUI.CLASS_MAIN = 'main';
  GUI.CLASS_CONTROLLER_ROW = 'cr';
  GUI.CLASS_TOO_TALL = 'taller-than-window';
  GUI.CLASS_CLOSED = 'closed';
  GUI.CLASS_CLOSE_BUTTON = 'close-button';
  GUI.CLASS_DRAG = 'drag';

  GUI.DEFAULT_WIDTH = 245;
  GUI.TEXT_CLOSED = 'Close Controls';
  GUI.TEXT_OPEN = 'Open Controls';

  dom.bind(window, 'keydown', function(e) {

    if (document.activeElement.type !== 'text' &&
        (e.which === HIDE_KEY_CODE || e.keyCode == HIDE_KEY_CODE)) {
      GUI.toggleHide();
    }

  }, false);

  common.extend(

      GUI.prototype,

      /** @lends dat.gui.GUI */
      {

        /**
         * @param object
         * @param property
         * @returns {dat.controllers.Controller} The new controller that was added.
         * @instance
         */
        add: function(object, property) {

          return add(
              this,
              object,
              property,
              {
                factoryArgs: Array.prototype.slice.call(arguments, 2)
              }
          );

        },

        /**
         * @param object
         * @param property
         * @returns {dat.controllers.ColorController} The new controller that was added.
         * @instance
         */
        addColor: function(object, property) {

          return add(
              this,
              object,
              property,
              {
                color: true
              }
          );

        },

        /**
         * @param controller
         * @instance
         */
        remove: function(controller) {

          // TODO listening?
          this.__ul.removeChild(controller.__li);
          this.__controllers.slice(this.__controllers.indexOf(controller), 1);
          var _this = this;
          common.defer(function() {
            _this.onResize();
          });

        },

        destroy: function() {

          if (this.autoPlace) {
            auto_place_container.removeChild(this.domElement);
          }

        },

        /**
         * @param name
         * @returns {dat.gui.GUI} The new folder.
         * @throws {Error} if this GUI already has a folder by the specified
         * name
         * @instance
         */
        addFolder: function(name) {

          // We have to prevent collisions on names in order to have a key
          // by which to remember saved values
          if (this.__folders[name] !== undefined) {
            throw new Error('You already have a folder in this GUI by the' +
                ' name "' + name + '"');
          }

          var new_gui_params = { name: name, parent: this };

          // We need to pass down the autoPlace trait so that we can
          // attach event listeners to open/close folder actions to
          // ensure that a scrollbar appears if the window is too short.
          new_gui_params.autoPlace = this.autoPlace;

          // Do we have saved appearance data for this folder?

          if (this.load && // Anything loaded?
              this.load.folders && // Was my parent a dead-end?
              this.load.folders[name]) { // Did daddy remember me?

            // Start me closed if I was closed
            new_gui_params.closed = this.load.folders[name].closed;

            // Pass down the loaded data
            new_gui_params.load = this.load.folders[name];

          }

          var gui = new GUI(new_gui_params);
          this.__folders[name] = gui;

          var li = addRow(this, gui.domElement);
          dom.addClass(li, 'folder');
          return gui;

        },

        open: function() {
          this.closed = false;
        },

        close: function() {
          this.closed = true;
        },

        onResize: function() {

          var root = this.getRoot();

          if (root.scrollable) {

            var top = dom.getOffset(root.__ul).top;
            var h = 0;

            common.each(root.__ul.childNodes, function(node) {
              if (! (root.autoPlace && node === root.__save_row))
                h += dom.getHeight(node);
            });

            if (window.innerHeight - top - CLOSE_BUTTON_HEIGHT < h) {
              dom.addClass(root.domElement, GUI.CLASS_TOO_TALL);
              root.__ul.style.height = window.innerHeight - top - CLOSE_BUTTON_HEIGHT + 'px';
            } else {
              dom.removeClass(root.domElement, GUI.CLASS_TOO_TALL);
              root.__ul.style.height = 'auto';
            }

          }

          if (root.__resize_handle) {
            common.defer(function() {
              root.__resize_handle.style.height = root.__ul.offsetHeight + 'px';
            });
          }

          if (root.__closeButton) {
            root.__closeButton.style.width = root.width + 'px';
          }

        },

        /**
         * Mark objects for saving. The order of these objects cannot change as
         * the GUI grows. When remembering new objects, append them to the end
         * of the list.
         *
         * @param {Object...} objects
         * @throws {Error} if not called on a top level GUI.
         * @instance
         */
        remember: function() {

          if (common.isUndefined(SAVE_DIALOGUE)) {
            SAVE_DIALOGUE = new CenteredDiv();
            SAVE_DIALOGUE.domElement.innerHTML = saveDialogueContents;
          }

          if (this.parent) {
            throw new Error("You can only call remember on a top level GUI.");
          }

          var _this = this;

          common.each(Array.prototype.slice.call(arguments), function(object) {
            if (_this.__rememberedObjects.length == 0) {
              addSaveMenu(_this);
            }
            if (_this.__rememberedObjects.indexOf(object) == -1) {
              _this.__rememberedObjects.push(object);
            }
          });

          if (this.autoPlace) {
            // Set save row width
            setWidth(this, this.width);
          }

        },

        /**
         * @returns {dat.gui.GUI} the topmost parent GUI of a nested GUI.
         * @instance
         */
        getRoot: function() {
          var gui = this;
          while (gui.parent) {
            gui = gui.parent;
          }
          return gui;
        },

        /**
         * @returns {Object} a JSON object representing the current state of
         * this GUI as well as its remembered properties.
         * @instance
         */
        getSaveObject: function() {

          var toReturn = this.load;

          toReturn.closed = this.closed;

          // Am I remembering any values?
          if (this.__rememberedObjects.length > 0) {

            toReturn.preset = this.preset;

            if (!toReturn.remembered) {
              toReturn.remembered = {};
            }

            toReturn.remembered[this.preset] = getCurrentPreset(this);

          }

          toReturn.folders = {};
          common.each(this.__folders, function(element, key) {
            toReturn.folders[key] = element.getSaveObject();
          });

          return toReturn;

        },

        save: function() {

          if (!this.load.remembered) {
            this.load.remembered = {};
          }

          this.load.remembered[this.preset] = getCurrentPreset(this);
          markPresetModified(this, false);

        },

        saveAs: function(presetName) {

          if (!this.load.remembered) {

            // Retain default values upon first save
            this.load.remembered = {};
            this.load.remembered[DEFAULT_DEFAULT_PRESET_NAME] = getCurrentPreset(this, true);

          }

          this.load.remembered[presetName] = getCurrentPreset(this);
          this.preset = presetName;
          addPresetOption(this, presetName, true);

        },

        revert: function(gui) {

          common.each(this.__controllers, function(controller) {
            // Make revert work on Default.
            if (!this.getRoot().load.remembered) {
              controller.setValue(controller.initialValue);
            } else {
              recallSavedValue(gui || this.getRoot(), controller);
            }
          }, this);

          common.each(this.__folders, function(folder) {
            folder.revert(folder);
          });

          if (!gui) {
            markPresetModified(this.getRoot(), false);
          }


        },

        listen: function(controller) {

          var init = this.__listening.length == 0;
          this.__listening.push(controller);
          if (init) updateDisplays(this.__listening);

        }

      }

  );

  function add(gui, object, property, params) {

    if (object[property] === undefined) {
      throw new Error("Object " + object + " has no property \"" + property + "\"");
    }

    var controller;

    if (params.color) {

      controller = new ColorController(object, property);

    } else {

      var factoryArgs = [object,property].concat(params.factoryArgs);
      controller = controllerFactory.apply(gui, factoryArgs);

    }

    if (params.before instanceof Controller) {
      params.before = params.before.__li;
    }

    recallSavedValue(gui, controller);

    dom.addClass(controller.domElement, 'c');

    var name = document.createElement('span');
    dom.addClass(name, 'property-name');
    name.innerHTML = controller.property;

    var container = document.createElement('div');
    container.appendChild(name);
    container.appendChild(controller.domElement);

    var li = addRow(gui, container, params.before);

    dom.addClass(li, GUI.CLASS_CONTROLLER_ROW);
    dom.addClass(li, typeof controller.getValue());

    augmentController(gui, li, controller);

    gui.__controllers.push(controller);

    return controller;

  }

  /**
   * Add a row to the end of the GUI or before another row.
   *
   * @param gui
   * @param [dom] If specified, inserts the dom content in the new row
   * @param [liBefore] If specified, places the new row before another row
   */
  function addRow(gui, dom, liBefore) {
    var li = document.createElement('li');
    if (dom) li.appendChild(dom);
    if (liBefore) {
      gui.__ul.insertBefore(li, params.before);
    } else {
      gui.__ul.appendChild(li);
    }
    gui.onResize();
    return li;
  }

  function augmentController(gui, li, controller) {

    controller.__li = li;
    controller.__gui = gui;

    common.extend(controller, {

      options: function(options) {

        if (arguments.length > 1) {
          controller.remove();

          return add(
              gui,
              controller.object,
              controller.property,
              {
                before: controller.__li.nextElementSibling,
                factoryArgs: [common.toArray(arguments)]
              }
          );

        }

        if (common.isArray(options) || common.isObject(options)) {
          controller.remove();

          return add(
              gui,
              controller.object,
              controller.property,
              {
                before: controller.__li.nextElementSibling,
                factoryArgs: [options]
              }
          );

        }

      },

      name: function(v) {
        controller.__li.firstElementChild.firstElementChild.innerHTML = v;
        return controller;
      },

      listen: function() {
        controller.__gui.listen(controller);
        return controller;
      },

      remove: function() {
        controller.__gui.remove(controller);
        return controller;
      }

    });

    // All sliders should be accompanied by a box.
    if (controller instanceof NumberControllerSlider) {

      var box = new NumberControllerBox(controller.object, controller.property,
          { min: controller.__min, max: controller.__max, step: controller.__step });

      common.each(['updateDisplay', 'onChange', 'onFinishChange'], function(method) {
        var pc = controller[method];
        var pb = box[method];
        controller[method] = box[method] = function() {
          var args = Array.prototype.slice.call(arguments);
          pc.apply(controller, args);
          return pb.apply(box, args);
        }
      });

      dom.addClass(li, 'has-slider');
      controller.domElement.insertBefore(box.domElement, controller.domElement.firstElementChild);

    }
    else if (controller instanceof NumberControllerBox) {

      var r = function(returned) {

        // Have we defined both boundaries?
        if (common.isNumber(controller.__min) && common.isNumber(controller.__max)) {

          // Well, then lets just replace this with a slider.
          controller.remove();
          return add(
              gui,
              controller.object,
              controller.property,
              {
                before: controller.__li.nextElementSibling,
                factoryArgs: [controller.__min, controller.__max, controller.__step]
              });

        }

        return returned;

      };

      controller.min = common.compose(r, controller.min);
      controller.max = common.compose(r, controller.max);

    }
    else if (controller instanceof BooleanController) {

      dom.bind(li, 'click', function() {
        dom.fakeEvent(controller.__checkbox, 'click');
      });

      dom.bind(controller.__checkbox, 'click', function(e) {
        e.stopPropagation(); // Prevents double-toggle
      })

    }
    else if (controller instanceof FunctionController) {

      dom.bind(li, 'click', function() {
        dom.fakeEvent(controller.__button, 'click');
      });

      dom.bind(li, 'mouseover', function() {
        dom.addClass(controller.__button, 'hover');
      });

      dom.bind(li, 'mouseout', function() {
        dom.removeClass(controller.__button, 'hover');
      });

    }
    else if (controller instanceof ColorController) {

      dom.addClass(li, 'color');
      controller.updateDisplay = common.compose(function(r) {
        li.style.borderLeftColor = controller.__color.toString();
        return r;
      }, controller.updateDisplay);

      controller.updateDisplay();

    }

    controller.setValue = common.compose(function(r) {
      if (gui.getRoot().__preset_select && controller.isModified()) {
        markPresetModified(gui.getRoot(), true);
      }
      return r;
    }, controller.setValue);

  }

  function recallSavedValue(gui, controller) {

    // Find the topmost GUI, that's where remembered objects live.
    var root = gui.getRoot();

    // Does the object we're controlling match anything we've been told to
    // remember?
    var matched_index = root.__rememberedObjects.indexOf(controller.object);

    // Why yes, it does!
    if (matched_index != -1) {

      // Let me fetch a map of controllers for thcommon.isObject.
      var controller_map =
          root.__rememberedObjectIndecesToControllers[matched_index];

      // Ohp, I believe this is the first controller we've created for this
      // object. Lets make the map fresh.
      if (controller_map === undefined) {
        controller_map = {};
        root.__rememberedObjectIndecesToControllers[matched_index] =
            controller_map;
      }

      // Keep track of this controller
      controller_map[controller.property] = controller;

      // Okay, now have we saved any values for this controller?
      if (root.load && root.load.remembered) {

        var preset_map = root.load.remembered;

        // Which preset are we trying to load?
        var preset;

        if (preset_map[gui.preset]) {

          preset = preset_map[gui.preset];

        } else if (preset_map[DEFAULT_DEFAULT_PRESET_NAME]) {

          // Uhh, you can have the default instead?
          preset = preset_map[DEFAULT_DEFAULT_PRESET_NAME];

        } else {

          // Nada.

          return;

        }


        // Did the loaded object remember thcommon.isObject?
        if (preset[matched_index] &&

          // Did we remember this particular property?
            preset[matched_index][controller.property] !== undefined) {

          // We did remember something for this guy ...
          var value = preset[matched_index][controller.property];

          // And that's what it is.
          controller.initialValue = value;
          controller.setValue(value);

        }

      }

    }

  }

  function getLocalStorageHash(gui, key) {
    // TODO how does this deal with multiple GUI's?
    return document.location.href + '.' + key;

  }

  function addSaveMenu(gui) {

    var div = gui.__save_row = document.createElement('li');

    dom.addClass(gui.domElement, 'has-save');

    gui.__ul.insertBefore(div, gui.__ul.firstChild);

    dom.addClass(div, 'save-row');

    var gears = document.createElement('span');
    gears.innerHTML = '&nbsp;';
    dom.addClass(gears, 'button gears');

    // TODO replace with FunctionController
    var button = document.createElement('span');
    button.innerHTML = 'Save';
    dom.addClass(button, 'button');
    dom.addClass(button, 'save');

    var button2 = document.createElement('span');
    button2.innerHTML = 'New';
    dom.addClass(button2, 'button');
    dom.addClass(button2, 'save-as');

    var button3 = document.createElement('span');
    button3.innerHTML = 'Revert';
    dom.addClass(button3, 'button');
    dom.addClass(button3, 'revert');

    var select = gui.__preset_select = document.createElement('select');

    if (gui.load && gui.load.remembered) {

      common.each(gui.load.remembered, function(value, key) {
        addPresetOption(gui, key, key == gui.preset);
      });

    } else {
      addPresetOption(gui, DEFAULT_DEFAULT_PRESET_NAME, false);
    }

    dom.bind(select, 'change', function() {


      for (var index = 0; index < gui.__preset_select.length; index++) {
        gui.__preset_select[index].innerHTML = gui.__preset_select[index].value;
      }

      gui.preset = this.value;

    });

    div.appendChild(select);
    div.appendChild(gears);
    div.appendChild(button);
    div.appendChild(button2);
    div.appendChild(button3);

    if (SUPPORTS_LOCAL_STORAGE) {

      var saveLocally = document.getElementById('dg-save-locally');
      var explain = document.getElementById('dg-local-explain');

      saveLocally.style.display = 'block';

      var localStorageCheckBox = document.getElementById('dg-local-storage');

      if (localStorage.getItem(getLocalStorageHash(gui, 'isLocal')) === 'true') {
        localStorageCheckBox.setAttribute('checked', 'checked');
      }

      function showHideExplain() {
        explain.style.display = gui.useLocalStorage ? 'block' : 'none';
      }

      showHideExplain();

      // TODO: Use a boolean controller, fool!
      dom.bind(localStorageCheckBox, 'change', function() {
        gui.useLocalStorage = !gui.useLocalStorage;
        showHideExplain();
      });

    }

    var newConstructorTextArea = document.getElementById('dg-new-constructor');

    dom.bind(newConstructorTextArea, 'keydown', function(e) {
      if (e.metaKey && (e.which === 67 || e.keyCode == 67)) {
        SAVE_DIALOGUE.hide();
      }
    });

    dom.bind(gears, 'click', function() {
      newConstructorTextArea.innerHTML = JSON.stringify(gui.getSaveObject(), undefined, 2);
      SAVE_DIALOGUE.show();
      newConstructorTextArea.focus();
      newConstructorTextArea.select();
    });

    dom.bind(button, 'click', function() {
      gui.save();
    });

    dom.bind(button2, 'click', function() {
      var presetName = prompt('Enter a new preset name.');
      if (presetName) gui.saveAs(presetName);
    });

    dom.bind(button3, 'click', function() {
      gui.revert();
    });

//    div.appendChild(button2);

  }

  function addResizeHandle(gui) {

    gui.__resize_handle = document.createElement('div');

    common.extend(gui.__resize_handle.style, {

      width: '6px',
      marginLeft: '-3px',
      height: '200px',
      cursor: 'ew-resize',
      position: 'absolute'
//      border: '1px solid blue'

    });

    var pmouseX;

    dom.bind(gui.__resize_handle, 'mousedown', dragStart);
    dom.bind(gui.__closeButton, 'mousedown', dragStart);

    gui.domElement.insertBefore(gui.__resize_handle, gui.domElement.firstElementChild);

    function dragStart(e) {

      e.preventDefault();

      pmouseX = e.clientX;

      dom.addClass(gui.__closeButton, GUI.CLASS_DRAG);
      dom.bind(window, 'mousemove', drag);
      dom.bind(window, 'mouseup', dragStop);

      return false;

    }

    function drag(e) {

      e.preventDefault();

      gui.width += pmouseX - e.clientX;
      gui.onResize();
      pmouseX = e.clientX;

      return false;

    }

    function dragStop() {

      dom.removeClass(gui.__closeButton, GUI.CLASS_DRAG);
      dom.unbind(window, 'mousemove', drag);
      dom.unbind(window, 'mouseup', dragStop);

    }

  }

  function setWidth(gui, w) {
    gui.domElement.style.width = w + 'px';
    // Auto placed save-rows are position fixed, so we have to
    // set the width manually if we want it to bleed to the edge
    if (gui.__save_row && gui.autoPlace) {
      gui.__save_row.style.width = w + 'px';
    }if (gui.__closeButton) {
      gui.__closeButton.style.width = w + 'px';
    }
  }

  function getCurrentPreset(gui, useInitialValues) {

    var toReturn = {};

    // For each object I'm remembering
    common.each(gui.__rememberedObjects, function(val, index) {

      var saved_values = {};

      // The controllers I've made for thcommon.isObject by property
      var controller_map =
          gui.__rememberedObjectIndecesToControllers[index];

      // Remember each value for each property
      common.each(controller_map, function(controller, property) {
        saved_values[property] = useInitialValues ? controller.initialValue : controller.getValue();
      });

      // Save the values for thcommon.isObject
      toReturn[index] = saved_values;

    });

    return toReturn;

  }

  function addPresetOption(gui, name, setSelected) {
    var opt = document.createElement('option');
    opt.innerHTML = name;
    opt.value = name;
    gui.__preset_select.appendChild(opt);
    if (setSelected) {
      gui.__preset_select.selectedIndex = gui.__preset_select.length - 1;
    }
  }

  function setPresetSelectIndex(gui) {
    for (var index = 0; index < gui.__preset_select.length; index++) {
      if (gui.__preset_select[index].value == gui.preset) {
        gui.__preset_select.selectedIndex = index;
      }
    }
  }

  function markPresetModified(gui, modified) {
    var opt = gui.__preset_select[gui.__preset_select.selectedIndex];
//    console.log('mark', modified, opt);
    if (modified) {
      opt.innerHTML = opt.value + "*";
    } else {
      opt.innerHTML = opt.value;
    }
  }

  function updateDisplays(controllerArray) {


    if (controllerArray.length != 0) {

      requestAnimationFrame(function() {
        updateDisplays(controllerArray);
      });

    }

    common.each(controllerArray, function(c) {
      c.updateDisplay();
    });

  }

  return GUI;

})(dat.utils.css,
"<div id=\"dg-save\" class=\"dg dialogue\">\n\n  Here's the new load parameter for your <code>GUI</code>'s constructor:\n\n  <textarea id=\"dg-new-constructor\"></textarea>\n\n  <div id=\"dg-save-locally\">\n\n    <input id=\"dg-local-storage\" type=\"checkbox\"/> Automatically save\n    values to <code>localStorage</code> on exit.\n\n    <div id=\"dg-local-explain\">The values saved to <code>localStorage</code> will\n      override those passed to <code>dat.GUI</code>'s constructor. This makes it\n      easier to work incrementally, but <code>localStorage</code> is fragile,\n      and your friends may not see the same values you do.\n      \n    </div>\n    \n  </div>\n\n</div>",
".dg ul{list-style:none;margin:0;padding:0;width:100%;clear:both}.dg.ac{position:fixed;top:0;left:0;right:0;height:0;z-index:0}.dg:not(.ac) .main{overflow:hidden}.dg.main{-webkit-transition:opacity 0.1s linear;-o-transition:opacity 0.1s linear;-moz-transition:opacity 0.1s linear;transition:opacity 0.1s linear}.dg.main.taller-than-window{overflow-y:auto}.dg.main.taller-than-window .close-button{opacity:1;margin-top:-1px;border-top:1px solid #2c2c2c}.dg.main ul.closed .close-button{opacity:1 !important}.dg.main:hover .close-button,.dg.main .close-button.drag{opacity:1}.dg.main .close-button{-webkit-transition:opacity 0.1s linear;-o-transition:opacity 0.1s linear;-moz-transition:opacity 0.1s linear;transition:opacity 0.1s linear;border:0;position:absolute;line-height:19px;height:20px;cursor:pointer;text-align:center;background-color:#000}.dg.main .close-button:hover{background-color:#111}.dg.a{float:right;margin-right:15px;overflow-x:hidden}.dg.a.has-save ul{margin-top:27px}.dg.a.has-save ul.closed{margin-top:0}.dg.a .save-row{position:fixed;top:0;z-index:1002}.dg li{-webkit-transition:height 0.1s ease-out;-o-transition:height 0.1s ease-out;-moz-transition:height 0.1s ease-out;transition:height 0.1s ease-out}.dg li:not(.folder){cursor:auto;height:27px;line-height:27px;overflow:hidden;padding:0 4px 0 5px}.dg li.folder{padding:0;border-left:4px solid rgba(0,0,0,0)}.dg li.title{cursor:pointer;margin-left:-4px}.dg .closed li:not(.title),.dg .closed ul li,.dg .closed ul li > *{height:0;overflow:hidden;border:0}.dg .cr{clear:both;padding-left:3px;height:27px}.dg .property-name{cursor:default;float:left;clear:left;width:40%;overflow:hidden;text-overflow:ellipsis}.dg .c{float:left;width:60%}.dg .c input[type=text]{border:0;margin-top:4px;padding:3px;width:100%;float:right}.dg .has-slider input[type=text]{width:30%;margin-left:0}.dg .slider{float:left;width:66%;margin-left:-5px;margin-right:0;height:19px;margin-top:4px}.dg .slider-fg{height:100%}.dg .c input[type=checkbox]{margin-top:9px}.dg .c select{margin-top:5px}.dg .cr.function,.dg .cr.function .property-name,.dg .cr.function *,.dg .cr.boolean,.dg .cr.boolean *{cursor:pointer}.dg .selector{display:none;position:absolute;margin-left:-9px;margin-top:23px;z-index:10}.dg .c:hover .selector,.dg .selector.drag{display:block}.dg li.save-row{padding:0}.dg li.save-row .button{display:inline-block;padding:0px 6px}.dg.dialogue{background-color:#222;width:460px;padding:15px;font-size:13px;line-height:15px}#dg-new-constructor{padding:10px;color:#222;font-family:Monaco, monospace;font-size:10px;border:0;resize:none;box-shadow:inset 1px 1px 1px #888;word-wrap:break-word;margin:12px 0;display:block;width:440px;overflow-y:scroll;height:100px;position:relative}#dg-local-explain{display:none;font-size:11px;line-height:17px;border-radius:3px;background-color:#333;padding:8px;margin-top:10px}#dg-local-explain code{font-size:10px}#dat-gui-save-locally{display:none}.dg{color:#eee;font:11px 'Lucida Grande', sans-serif;text-shadow:0 -1px 0 #111}.dg.main::-webkit-scrollbar{width:5px;background:#1a1a1a}.dg.main::-webkit-scrollbar-corner{height:0;display:none}.dg.main::-webkit-scrollbar-thumb{border-radius:5px;background:#676767}.dg li:not(.folder){background:#1a1a1a;border-bottom:1px solid #2c2c2c}.dg li.save-row{line-height:25px;background:#dad5cb;border:0}.dg li.save-row select{margin-left:5px;width:108px}.dg li.save-row .button{margin-left:5px;margin-top:1px;border-radius:2px;font-size:9px;line-height:7px;padding:4px 4px 5px 4px;background:#c5bdad;color:#fff;text-shadow:0 1px 0 #b0a58f;box-shadow:0 -1px 0 #b0a58f;cursor:pointer}.dg li.save-row .button.gears{background:#c5bdad url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAANCAYAAAB/9ZQ7AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAQJJREFUeNpiYKAU/P//PwGIC/ApCABiBSAW+I8AClAcgKxQ4T9hoMAEUrxx2QSGN6+egDX+/vWT4e7N82AMYoPAx/evwWoYoSYbACX2s7KxCxzcsezDh3evFoDEBYTEEqycggWAzA9AuUSQQgeYPa9fPv6/YWm/Acx5IPb7ty/fw+QZblw67vDs8R0YHyQhgObx+yAJkBqmG5dPPDh1aPOGR/eugW0G4vlIoTIfyFcA+QekhhHJhPdQxbiAIguMBTQZrPD7108M6roWYDFQiIAAv6Aow/1bFwXgis+f2LUAynwoIaNcz8XNx3Dl7MEJUDGQpx9gtQ8YCueB+D26OECAAQDadt7e46D42QAAAABJRU5ErkJggg==) 2px 1px no-repeat;height:7px;width:8px}.dg li.save-row .button:hover{background-color:#bab19e;box-shadow:0 -1px 0 #b0a58f}.dg li.folder{border-bottom:0}.dg li.title{padding-left:16px;background:#000 url(data:image/gif;base64,R0lGODlhBQAFAJEAAP////Pz8////////yH5BAEAAAIALAAAAAAFAAUAAAIIlI+hKgFxoCgAOw==) 6px 10px no-repeat;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.2)}.dg .closed li.title{background-image:url(data:image/gif;base64,R0lGODlhBQAFAJEAAP////Pz8////////yH5BAEAAAIALAAAAAAFAAUAAAIIlGIWqMCbWAEAOw==)}.dg .cr.boolean{border-left:3px solid #806787}.dg .cr.function{border-left:3px solid #e61d5f}.dg .cr.number{border-left:3px solid #2fa1d6}.dg .cr.number input[type=text]{color:#2fa1d6}.dg .cr.string{border-left:3px solid #1ed36f}.dg .cr.string input[type=text]{color:#1ed36f}.dg .cr.function:hover,.dg .cr.boolean:hover{background:#111}.dg .c input[type=text]{background:#303030;outline:none}.dg .c input[type=text]:hover{background:#3c3c3c}.dg .c input[type=text]:focus{background:#494949;color:#fff}.dg .c .slider{background:#303030;cursor:ew-resize}.dg .c .slider-fg{background:#2fa1d6}.dg .c .slider:hover{background:#3c3c3c}.dg .c .slider:hover .slider-fg{background:#44abda}\n",
dat.controllers.factory = (function (OptionController, NumberControllerBox, NumberControllerSlider, StringController, FunctionController, BooleanController, common) {

      return function(object, property) {

        var initialValue = object[property];

        // Providing options?
        if (common.isArray(arguments[2]) || common.isObject(arguments[2])) {
          return new OptionController(object, property, arguments[2]);
        }

        // Providing a map?

        if (common.isNumber(initialValue)) {

          if (common.isNumber(arguments[2]) && common.isNumber(arguments[3])) {

            // Has min and max.
            return new NumberControllerSlider(object, property, arguments[2], arguments[3]);

          } else {

            return new NumberControllerBox(object, property, { min: arguments[2], max: arguments[3] });

          }

        }

        if (common.isString(initialValue)) {
          return new StringController(object, property);
        }

        if (common.isFunction(initialValue)) {
          return new FunctionController(object, property, '');
        }

        if (common.isBoolean(initialValue)) {
          return new BooleanController(object, property);
        }

      }

    })(dat.controllers.OptionController,
dat.controllers.NumberControllerBox,
dat.controllers.NumberControllerSlider,
dat.controllers.StringController = (function (Controller, dom, common) {

  /**
   * @class Provides a text input to alter the string property of an object.
   *
   * @extends dat.controllers.Controller
   *
   * @param {Object} object The object to be manipulated
   * @param {string} property The name of the property to be manipulated
   *
   * @member dat.controllers
   */
  var StringController = function(object, property) {

    StringController.superclass.call(this, object, property);

    var _this = this;

    this.__input = document.createElement('input');
    this.__input.setAttribute('type', 'text');

    dom.bind(this.__input, 'keyup', onChange);
    dom.bind(this.__input, 'change', onChange);
    dom.bind(this.__input, 'blur', onBlur);
    dom.bind(this.__input, 'keydown', function(e) {
      if (e.keyCode === 13) {
        this.blur();
      }
    });
    

    function onChange() {
      _this.setValue(_this.__input.value);
    }

    function onBlur() {
      if (_this.__onFinishChange) {
        _this.__onFinishChange.call(_this, _this.getValue());
      }
    }

    this.updateDisplay();

    this.domElement.appendChild(this.__input);

  };

  StringController.superclass = Controller;

  common.extend(

      StringController.prototype,
      Controller.prototype,

      {

        updateDisplay: function() {
          // Stops the caret from moving on account of:
          // keyup -> setValue -> updateDisplay
          if (!dom.isActive(this.__input)) {
            this.__input.value = this.getValue();
          }
          return StringController.superclass.prototype.updateDisplay.call(this);
        }

      }

  );

  return StringController;

})(dat.controllers.Controller,
dat.dom.dom,
dat.utils.common),
dat.controllers.FunctionController,
dat.controllers.BooleanController,
dat.utils.common),
dat.controllers.Controller,
dat.controllers.BooleanController,
dat.controllers.FunctionController,
dat.controllers.NumberControllerBox,
dat.controllers.NumberControllerSlider,
dat.controllers.OptionController,
dat.controllers.ColorController = (function (Controller, dom, Color, interpret, common) {

  var ColorController = function(object, property) {

    ColorController.superclass.call(this, object, property);

    this.__color = new Color(this.getValue());
    this.__temp = new Color(0);

    var _this = this;

    this.domElement = document.createElement('div');

    dom.makeSelectable(this.domElement, false);

    this.__selector = document.createElement('div');
    this.__selector.className = 'selector';

    this.__saturation_field = document.createElement('div');
    this.__saturation_field.className = 'saturation-field';

    this.__field_knob = document.createElement('div');
    this.__field_knob.className = 'field-knob';
    this.__field_knob_border = '2px solid ';

    this.__hue_knob = document.createElement('div');
    this.__hue_knob.className = 'hue-knob';

    this.__hue_field = document.createElement('div');
    this.__hue_field.className = 'hue-field';

    this.__input = document.createElement('input');
    this.__input.type = 'text';
    this.__input_textShadow = '0 1px 1px ';

    dom.bind(this.__input, 'keydown', function(e) {
      if (e.keyCode === 13) { // on enter
        onBlur.call(this);
      }
    });

    dom.bind(this.__input, 'blur', onBlur);

    dom.bind(this.__selector, 'mousedown', function(e) {

      dom
        .addClass(this, 'drag')
        .bind(window, 'mouseup', function(e) {
          dom.removeClass(_this.__selector, 'drag');
        });

    });

    var value_field = document.createElement('div');

    common.extend(this.__selector.style, {
      width: '122px',
      height: '102px',
      padding: '3px',
      backgroundColor: '#222',
      boxShadow: '0px 1px 3px rgba(0,0,0,0.3)'
    });

    common.extend(this.__field_knob.style, {
      position: 'absolute',
      width: '12px',
      height: '12px',
      border: this.__field_knob_border + (this.__color.v < .5 ? '#fff' : '#000'),
      boxShadow: '0px 1px 3px rgba(0,0,0,0.5)',
      borderRadius: '12px',
      zIndex: 1
    });
    
    common.extend(this.__hue_knob.style, {
      position: 'absolute',
      width: '15px',
      height: '2px',
      borderRight: '4px solid #fff',
      zIndex: 1
    });

    common.extend(this.__saturation_field.style, {
      width: '100px',
      height: '100px',
      border: '1px solid #555',
      marginRight: '3px',
      display: 'inline-block',
      cursor: 'pointer'
    });

    common.extend(value_field.style, {
      width: '100%',
      height: '100%',
      background: 'none'
    });
    
    linearGradient(value_field, 'top', 'rgba(0,0,0,0)', '#000');

    common.extend(this.__hue_field.style, {
      width: '15px',
      height: '100px',
      display: 'inline-block',
      border: '1px solid #555',
      cursor: 'ns-resize'
    });

    hueGradient(this.__hue_field);

    common.extend(this.__input.style, {
      outline: 'none',
//      width: '120px',
      textAlign: 'center',
//      padding: '4px',
//      marginBottom: '6px',
      color: '#fff',
      border: 0,
      fontWeight: 'bold',
      textShadow: this.__input_textShadow + 'rgba(0,0,0,0.7)'
    });

    dom.bind(this.__saturation_field, 'mousedown', fieldDown);
    dom.bind(this.__field_knob, 'mousedown', fieldDown);

    dom.bind(this.__hue_field, 'mousedown', function(e) {
      setH(e);
      dom.bind(window, 'mousemove', setH);
      dom.bind(window, 'mouseup', unbindH);
    });

    function fieldDown(e) {
      setSV(e);
      // document.body.style.cursor = 'none';
      dom.bind(window, 'mousemove', setSV);
      dom.bind(window, 'mouseup', unbindSV);
    }

    function unbindSV() {
      dom.unbind(window, 'mousemove', setSV);
      dom.unbind(window, 'mouseup', unbindSV);
      // document.body.style.cursor = 'default';
    }

    function onBlur() {
      var i = interpret(this.value);
      if (i !== false) {
        _this.__color.__state = i;
        _this.setValue(_this.__color.toOriginal());
      } else {
        this.value = _this.__color.toString();
      }
    }

    function unbindH() {
      dom.unbind(window, 'mousemove', setH);
      dom.unbind(window, 'mouseup', unbindH);
    }

    this.__saturation_field.appendChild(value_field);
    this.__selector.appendChild(this.__field_knob);
    this.__selector.appendChild(this.__saturation_field);
    this.__selector.appendChild(this.__hue_field);
    this.__hue_field.appendChild(this.__hue_knob);

    this.domElement.appendChild(this.__input);
    this.domElement.appendChild(this.__selector);

    this.updateDisplay();

    function setSV(e) {

      e.preventDefault();

      var w = dom.getWidth(_this.__saturation_field);
      var o = dom.getOffset(_this.__saturation_field);
      var s = (e.clientX - o.left + document.body.scrollLeft) / w;
      var v = 1 - (e.clientY - o.top + document.body.scrollTop) / w;

      if (v > 1) v = 1;
      else if (v < 0) v = 0;

      if (s > 1) s = 1;
      else if (s < 0) s = 0;

      _this.__color.v = v;
      _this.__color.s = s;

      _this.setValue(_this.__color.toOriginal());


      return false;

    }

    function setH(e) {

      e.preventDefault();

      var s = dom.getHeight(_this.__hue_field);
      var o = dom.getOffset(_this.__hue_field);
      var h = 1 - (e.clientY - o.top + document.body.scrollTop) / s;

      if (h > 1) h = 1;
      else if (h < 0) h = 0;

      _this.__color.h = h * 360;

      _this.setValue(_this.__color.toOriginal());

      return false;

    }

  };

  ColorController.superclass = Controller;

  common.extend(

      ColorController.prototype,
      Controller.prototype,

      {

        updateDisplay: function() {

          var i = interpret(this.getValue());

          if (i !== false) {

            var mismatch = false;

            // Check for mismatch on the interpreted value.

            common.each(Color.COMPONENTS, function(component) {
              if (!common.isUndefined(i[component]) &&
                  !common.isUndefined(this.__color.__state[component]) &&
                  i[component] !== this.__color.__state[component]) {
                mismatch = true;
                return {}; // break
              }
            }, this);

            // If nothing diverges, we keep our previous values
            // for statefulness, otherwise we recalculate fresh
            if (mismatch) {
              common.extend(this.__color.__state, i);
            }

          }

          common.extend(this.__temp.__state, this.__color.__state);

          this.__temp.a = 1;

          var flip = (this.__color.v < .5 || this.__color.s > .5) ? 255 : 0;
          var _flip = 255 - flip;

          common.extend(this.__field_knob.style, {
            marginLeft: 100 * this.__color.s - 7 + 'px',
            marginTop: 100 * (1 - this.__color.v) - 7 + 'px',
            backgroundColor: this.__temp.toString(),
            border: this.__field_knob_border + 'rgb(' + flip + ',' + flip + ',' + flip +')'
          });

          this.__hue_knob.style.marginTop = (1 - this.__color.h / 360) * 100 + 'px'

          this.__temp.s = 1;
          this.__temp.v = 1;

          linearGradient(this.__saturation_field, 'left', '#fff', this.__temp.toString());

          common.extend(this.__input.style, {
            backgroundColor: this.__input.value = this.__color.toString(),
            color: 'rgb(' + flip + ',' + flip + ',' + flip +')',
            textShadow: this.__input_textShadow + 'rgba(' + _flip + ',' + _flip + ',' + _flip +',.7)'
          });

        }

      }

  );
  
  var vendors = ['-moz-','-o-','-webkit-','-ms-',''];
  
  function linearGradient(elem, x, a, b) {
    elem.style.background = '';
    common.each(vendors, function(vendor) {
      elem.style.cssText += 'background: ' + vendor + 'linear-gradient('+x+', '+a+' 0%, ' + b + ' 100%); ';
    });
  }
  
  function hueGradient(elem) {
    elem.style.background = '';
    elem.style.cssText += 'background: -moz-linear-gradient(top,  #ff0000 0%, #ff00ff 17%, #0000ff 34%, #00ffff 50%, #00ff00 67%, #ffff00 84%, #ff0000 100%);'
    elem.style.cssText += 'background: -webkit-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);'
    elem.style.cssText += 'background: -o-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);'
    elem.style.cssText += 'background: -ms-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);'
    elem.style.cssText += 'background: linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);'
  }


  return ColorController;

})(dat.controllers.Controller,
dat.dom.dom,
dat.color.Color = (function (interpret, math, toString, common) {

  var Color = function() {

    this.__state = interpret.apply(this, arguments);

    if (this.__state === false) {
      throw 'Failed to interpret color arguments';
    }

    this.__state.a = this.__state.a || 1;


  };

  Color.COMPONENTS = ['r','g','b','h','s','v','hex','a'];

  common.extend(Color.prototype, {

    toString: function() {
      return toString(this);
    },

    toOriginal: function() {
      return this.__state.conversion.write(this);
    }

  });

  defineRGBComponent(Color.prototype, 'r', 2);
  defineRGBComponent(Color.prototype, 'g', 1);
  defineRGBComponent(Color.prototype, 'b', 0);

  defineHSVComponent(Color.prototype, 'h');
  defineHSVComponent(Color.prototype, 's');
  defineHSVComponent(Color.prototype, 'v');

  Object.defineProperty(Color.prototype, 'a', {

    get: function() {
      return this.__state.a;
    },

    set: function(v) {
      this.__state.a = v;
    }

  });

  Object.defineProperty(Color.prototype, 'hex', {

    get: function() {

      if (!this.__state.space !== 'HEX') {
        this.__state.hex = math.rgb_to_hex(this.r, this.g, this.b);
      }

      return this.__state.hex;

    },

    set: function(v) {

      this.__state.space = 'HEX';
      this.__state.hex = v;

    }

  });

  function defineRGBComponent(target, component, componentHexIndex) {

    Object.defineProperty(target, component, {

      get: function() {

        if (this.__state.space === 'RGB') {
          return this.__state[component];
        }

        recalculateRGB(this, component, componentHexIndex);

        return this.__state[component];

      },

      set: function(v) {

        if (this.__state.space !== 'RGB') {
          recalculateRGB(this, component, componentHexIndex);
          this.__state.space = 'RGB';
        }

        this.__state[component] = v;

      }

    });

  }

  function defineHSVComponent(target, component) {

    Object.defineProperty(target, component, {

      get: function() {

        if (this.__state.space === 'HSV')
          return this.__state[component];

        recalculateHSV(this);

        return this.__state[component];

      },

      set: function(v) {

        if (this.__state.space !== 'HSV') {
          recalculateHSV(this);
          this.__state.space = 'HSV';
        }

        this.__state[component] = v;

      }

    });

  }

  function recalculateRGB(color, component, componentHexIndex) {

    if (color.__state.space === 'HEX') {

      color.__state[component] = math.component_from_hex(color.__state.hex, componentHexIndex);

    } else if (color.__state.space === 'HSV') {

      common.extend(color.__state, math.hsv_to_rgb(color.__state.h, color.__state.s, color.__state.v));

    } else {

      throw 'Corrupted color state';

    }

  }

  function recalculateHSV(color) {

    var result = math.rgb_to_hsv(color.r, color.g, color.b);

    common.extend(color.__state,
        {
          s: result.s,
          v: result.v
        }
    );

    if (!common.isNaN(result.h)) {
      color.__state.h = result.h;
    } else if (common.isUndefined(color.__state.h)) {
      color.__state.h = 0;
    }

  }

  return Color;

})(dat.color.interpret,
dat.color.math = (function () {

  var tmpComponent;

  return {

    hsv_to_rgb: function(h, s, v) {

      var hi = Math.floor(h / 60) % 6;

      var f = h / 60 - Math.floor(h / 60);
      var p = v * (1.0 - s);
      var q = v * (1.0 - (f * s));
      var t = v * (1.0 - ((1.0 - f) * s));
      var c = [
        [v, t, p],
        [q, v, p],
        [p, v, t],
        [p, q, v],
        [t, p, v],
        [v, p, q]
      ][hi];

      return {
        r: c[0] * 255,
        g: c[1] * 255,
        b: c[2] * 255
      };

    },

    rgb_to_hsv: function(r, g, b) {

      var min = Math.min(r, g, b),
          max = Math.max(r, g, b),
          delta = max - min,
          h, s;

      if (max != 0) {
        s = delta / max;
      } else {
        return {
          h: NaN,
          s: 0,
          v: 0
        };
      }

      if (r == max) {
        h = (g - b) / delta;
      } else if (g == max) {
        h = 2 + (b - r) / delta;
      } else {
        h = 4 + (r - g) / delta;
      }
      h /= 6;
      if (h < 0) {
        h += 1;
      }

      return {
        h: h * 360,
        s: s,
        v: max / 255
      };
    },

    rgb_to_hex: function(r, g, b) {
      var hex = this.hex_with_component(0, 2, r);
      hex = this.hex_with_component(hex, 1, g);
      hex = this.hex_with_component(hex, 0, b);
      return hex;
    },

    component_from_hex: function(hex, componentIndex) {
      return (hex >> (componentIndex * 8)) & 0xFF;
    },

    hex_with_component: function(hex, componentIndex, value) {
      return value << (tmpComponent = componentIndex * 8) | (hex & ~ (0xFF << tmpComponent));
    }

  }

})(),
dat.color.toString,
dat.utils.common),
dat.color.interpret,
dat.utils.common),
dat.utils.requestAnimationFrame = (function () {

  /**
   * requirejs version of Paul Irish's RequestAnimationFrame
   * http://paulirish.com/2011/requestanimationframe-for-smart-animating/
   */

  return window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.oRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      function(callback, element) {

        window.setTimeout(callback, 1000 / 60);

      };
})(),
dat.dom.CenteredDiv = (function (dom, common) {


  var CenteredDiv = function() {

    this.backgroundElement = document.createElement('div');
    common.extend(this.backgroundElement.style, {
      backgroundColor: 'rgba(0,0,0,0.8)',
      top: 0,
      left: 0,
      display: 'none',
      zIndex: '1000',
      opacity: 0,
      WebkitTransition: 'opacity 0.2s linear'
    });

    dom.makeFullscreen(this.backgroundElement);
    this.backgroundElement.style.position = 'fixed';

    this.domElement = document.createElement('div');
    common.extend(this.domElement.style, {
      position: 'fixed',
      display: 'none',
      zIndex: '1001',
      opacity: 0,
      WebkitTransition: '-webkit-transform 0.2s ease-out, opacity 0.2s linear'
    });


    document.body.appendChild(this.backgroundElement);
    document.body.appendChild(this.domElement);

    var _this = this;
    dom.bind(this.backgroundElement, 'click', function() {
      _this.hide();
    });


  };

  CenteredDiv.prototype.show = function() {

    var _this = this;
    


    this.backgroundElement.style.display = 'block';

    this.domElement.style.display = 'block';
    this.domElement.style.opacity = 0;
//    this.domElement.style.top = '52%';
    this.domElement.style.webkitTransform = 'scale(1.1)';

    this.layout();

    common.defer(function() {
      _this.backgroundElement.style.opacity = 1;
      _this.domElement.style.opacity = 1;
      _this.domElement.style.webkitTransform = 'scale(1)';
    });

  };

  CenteredDiv.prototype.hide = function() {

    var _this = this;

    var hide = function() {

      _this.domElement.style.display = 'none';
      _this.backgroundElement.style.display = 'none';

      dom.unbind(_this.domElement, 'webkitTransitionEnd', hide);
      dom.unbind(_this.domElement, 'transitionend', hide);
      dom.unbind(_this.domElement, 'oTransitionEnd', hide);

    };

    dom.bind(this.domElement, 'webkitTransitionEnd', hide);
    dom.bind(this.domElement, 'transitionend', hide);
    dom.bind(this.domElement, 'oTransitionEnd', hide);

    this.backgroundElement.style.opacity = 0;
//    this.domElement.style.top = '48%';
    this.domElement.style.opacity = 0;
    this.domElement.style.webkitTransform = 'scale(1.1)';

  };

  CenteredDiv.prototype.layout = function() {
    this.domElement.style.left = window.innerWidth/2 - dom.getWidth(this.domElement) / 2 + 'px';
    this.domElement.style.top = window.innerHeight/2 - dom.getHeight(this.domElement) / 2 + 'px';
  };
  
  function lockScroll(e) {
    console.log(e);
  }

  return CenteredDiv;

})(dat.dom.dom,
dat.utils.common),
dat.dom.dom,
dat.utils.common);
},{}],8:[function(require,module,exports){
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

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],9:[function(require,module,exports){
/*!
@fileoverview gl-matrix - High performance matrix and vector operations
@author Brandon Jones
@author Colin MacKenzie IV
@version 2.7.0

Copyright (c) 2015-2018, Brandon Jones, Colin MacKenzie IV.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/
!function(t,n){if("object"==typeof exports&&"object"==typeof module)module.exports=n();else if("function"==typeof define&&define.amd)define([],n);else{var r=n();for(var a in r)("object"==typeof exports?exports:t)[a]=r[a]}}("undefined"!=typeof self?self:this,function(){return function(t){var n={};function r(a){if(n[a])return n[a].exports;var e=n[a]={i:a,l:!1,exports:{}};return t[a].call(e.exports,e,e.exports,r),e.l=!0,e.exports}return r.m=t,r.c=n,r.d=function(t,n,a){r.o(t,n)||Object.defineProperty(t,n,{enumerable:!0,get:a})},r.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},r.t=function(t,n){if(1&n&&(t=r(t)),8&n)return t;if(4&n&&"object"==typeof t&&t&&t.__esModule)return t;var a=Object.create(null);if(r.r(a),Object.defineProperty(a,"default",{enumerable:!0,value:t}),2&n&&"string"!=typeof t)for(var e in t)r.d(a,e,function(n){return t[n]}.bind(null,e));return a},r.n=function(t){var n=t&&t.__esModule?function(){return t.default}:function(){return t};return r.d(n,"a",n),n},r.o=function(t,n){return Object.prototype.hasOwnProperty.call(t,n)},r.p="",r(r.s=10)}([function(t,n,r){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.setMatrixArrayType=function(t){n.ARRAY_TYPE=t},n.toRadian=function(t){return t*e},n.equals=function(t,n){return Math.abs(t-n)<=a*Math.max(1,Math.abs(t),Math.abs(n))};var a=n.EPSILON=1e-6;n.ARRAY_TYPE="undefined"!=typeof Float32Array?Float32Array:Array,n.RANDOM=Math.random;var e=Math.PI/180},function(t,n,r){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.forEach=n.sqrLen=n.len=n.sqrDist=n.dist=n.div=n.mul=n.sub=void 0,n.create=e,n.clone=function(t){var n=new a.ARRAY_TYPE(4);return n[0]=t[0],n[1]=t[1],n[2]=t[2],n[3]=t[3],n},n.fromValues=function(t,n,r,e){var u=new a.ARRAY_TYPE(4);return u[0]=t,u[1]=n,u[2]=r,u[3]=e,u},n.copy=function(t,n){return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t},n.set=function(t,n,r,a,e){return t[0]=n,t[1]=r,t[2]=a,t[3]=e,t},n.add=function(t,n,r){return t[0]=n[0]+r[0],t[1]=n[1]+r[1],t[2]=n[2]+r[2],t[3]=n[3]+r[3],t},n.subtract=u,n.multiply=o,n.divide=i,n.ceil=function(t,n){return t[0]=Math.ceil(n[0]),t[1]=Math.ceil(n[1]),t[2]=Math.ceil(n[2]),t[3]=Math.ceil(n[3]),t},n.floor=function(t,n){return t[0]=Math.floor(n[0]),t[1]=Math.floor(n[1]),t[2]=Math.floor(n[2]),t[3]=Math.floor(n[3]),t},n.min=function(t,n,r){return t[0]=Math.min(n[0],r[0]),t[1]=Math.min(n[1],r[1]),t[2]=Math.min(n[2],r[2]),t[3]=Math.min(n[3],r[3]),t},n.max=function(t,n,r){return t[0]=Math.max(n[0],r[0]),t[1]=Math.max(n[1],r[1]),t[2]=Math.max(n[2],r[2]),t[3]=Math.max(n[3],r[3]),t},n.round=function(t,n){return t[0]=Math.round(n[0]),t[1]=Math.round(n[1]),t[2]=Math.round(n[2]),t[3]=Math.round(n[3]),t},n.scale=function(t,n,r){return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=n[3]*r,t},n.scaleAndAdd=function(t,n,r,a){return t[0]=n[0]+r[0]*a,t[1]=n[1]+r[1]*a,t[2]=n[2]+r[2]*a,t[3]=n[3]+r[3]*a,t},n.distance=s,n.squaredDistance=c,n.length=f,n.squaredLength=M,n.negate=function(t,n){return t[0]=-n[0],t[1]=-n[1],t[2]=-n[2],t[3]=-n[3],t},n.inverse=function(t,n){return t[0]=1/n[0],t[1]=1/n[1],t[2]=1/n[2],t[3]=1/n[3],t},n.normalize=function(t,n){var r=n[0],a=n[1],e=n[2],u=n[3],o=r*r+a*a+e*e+u*u;o>0&&(o=1/Math.sqrt(o),t[0]=r*o,t[1]=a*o,t[2]=e*o,t[3]=u*o);return t},n.dot=function(t,n){return t[0]*n[0]+t[1]*n[1]+t[2]*n[2]+t[3]*n[3]},n.lerp=function(t,n,r,a){var e=n[0],u=n[1],o=n[2],i=n[3];return t[0]=e+a*(r[0]-e),t[1]=u+a*(r[1]-u),t[2]=o+a*(r[2]-o),t[3]=i+a*(r[3]-i),t},n.random=function(t,n){var r,e,u,o,i,s;n=n||1;do{r=2*a.RANDOM()-1,e=2*a.RANDOM()-1,i=r*r+e*e}while(i>=1);do{u=2*a.RANDOM()-1,o=2*a.RANDOM()-1,s=u*u+o*o}while(s>=1);var c=Math.sqrt((1-i)/s);return t[0]=n*r,t[1]=n*e,t[2]=n*u*c,t[3]=n*o*c,t},n.transformMat4=function(t,n,r){var a=n[0],e=n[1],u=n[2],o=n[3];return t[0]=r[0]*a+r[4]*e+r[8]*u+r[12]*o,t[1]=r[1]*a+r[5]*e+r[9]*u+r[13]*o,t[2]=r[2]*a+r[6]*e+r[10]*u+r[14]*o,t[3]=r[3]*a+r[7]*e+r[11]*u+r[15]*o,t},n.transformQuat=function(t,n,r){var a=n[0],e=n[1],u=n[2],o=r[0],i=r[1],s=r[2],c=r[3],f=c*a+i*u-s*e,M=c*e+s*a-o*u,h=c*u+o*e-i*a,l=-o*a-i*e-s*u;return t[0]=f*c+l*-o+M*-s-h*-i,t[1]=M*c+l*-i+h*-o-f*-s,t[2]=h*c+l*-s+f*-i-M*-o,t[3]=n[3],t},n.str=function(t){return"vec4("+t[0]+", "+t[1]+", "+t[2]+", "+t[3]+")"},n.exactEquals=function(t,n){return t[0]===n[0]&&t[1]===n[1]&&t[2]===n[2]&&t[3]===n[3]},n.equals=function(t,n){var r=t[0],e=t[1],u=t[2],o=t[3],i=n[0],s=n[1],c=n[2],f=n[3];return Math.abs(r-i)<=a.EPSILON*Math.max(1,Math.abs(r),Math.abs(i))&&Math.abs(e-s)<=a.EPSILON*Math.max(1,Math.abs(e),Math.abs(s))&&Math.abs(u-c)<=a.EPSILON*Math.max(1,Math.abs(u),Math.abs(c))&&Math.abs(o-f)<=a.EPSILON*Math.max(1,Math.abs(o),Math.abs(f))};var a=function(t){if(t&&t.__esModule)return t;var n={};if(null!=t)for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&(n[r]=t[r]);return n.default=t,n}(r(0));function e(){var t=new a.ARRAY_TYPE(4);return a.ARRAY_TYPE!=Float32Array&&(t[0]=0,t[1]=0,t[2]=0,t[3]=0),t}function u(t,n,r){return t[0]=n[0]-r[0],t[1]=n[1]-r[1],t[2]=n[2]-r[2],t[3]=n[3]-r[3],t}function o(t,n,r){return t[0]=n[0]*r[0],t[1]=n[1]*r[1],t[2]=n[2]*r[2],t[3]=n[3]*r[3],t}function i(t,n,r){return t[0]=n[0]/r[0],t[1]=n[1]/r[1],t[2]=n[2]/r[2],t[3]=n[3]/r[3],t}function s(t,n){var r=n[0]-t[0],a=n[1]-t[1],e=n[2]-t[2],u=n[3]-t[3];return Math.sqrt(r*r+a*a+e*e+u*u)}function c(t,n){var r=n[0]-t[0],a=n[1]-t[1],e=n[2]-t[2],u=n[3]-t[3];return r*r+a*a+e*e+u*u}function f(t){var n=t[0],r=t[1],a=t[2],e=t[3];return Math.sqrt(n*n+r*r+a*a+e*e)}function M(t){var n=t[0],r=t[1],a=t[2],e=t[3];return n*n+r*r+a*a+e*e}n.sub=u,n.mul=o,n.div=i,n.dist=s,n.sqrDist=c,n.len=f,n.sqrLen=M,n.forEach=function(){var t=e();return function(n,r,a,e,u,o){var i=void 0,s=void 0;for(r||(r=4),a||(a=0),s=e?Math.min(e*r+a,n.length):n.length,i=a;i<s;i+=r)t[0]=n[i],t[1]=n[i+1],t[2]=n[i+2],t[3]=n[i+3],u(t,t,o),n[i]=t[0],n[i+1]=t[1],n[i+2]=t[2],n[i+3]=t[3];return n}}()},function(t,n,r){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.forEach=n.sqrLen=n.len=n.sqrDist=n.dist=n.div=n.mul=n.sub=void 0,n.create=e,n.clone=function(t){var n=new a.ARRAY_TYPE(3);return n[0]=t[0],n[1]=t[1],n[2]=t[2],n},n.length=u,n.fromValues=o,n.copy=function(t,n){return t[0]=n[0],t[1]=n[1],t[2]=n[2],t},n.set=function(t,n,r,a){return t[0]=n,t[1]=r,t[2]=a,t},n.add=function(t,n,r){return t[0]=n[0]+r[0],t[1]=n[1]+r[1],t[2]=n[2]+r[2],t},n.subtract=i,n.multiply=s,n.divide=c,n.ceil=function(t,n){return t[0]=Math.ceil(n[0]),t[1]=Math.ceil(n[1]),t[2]=Math.ceil(n[2]),t},n.floor=function(t,n){return t[0]=Math.floor(n[0]),t[1]=Math.floor(n[1]),t[2]=Math.floor(n[2]),t},n.min=function(t,n,r){return t[0]=Math.min(n[0],r[0]),t[1]=Math.min(n[1],r[1]),t[2]=Math.min(n[2],r[2]),t},n.max=function(t,n,r){return t[0]=Math.max(n[0],r[0]),t[1]=Math.max(n[1],r[1]),t[2]=Math.max(n[2],r[2]),t},n.round=function(t,n){return t[0]=Math.round(n[0]),t[1]=Math.round(n[1]),t[2]=Math.round(n[2]),t},n.scale=function(t,n,r){return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t},n.scaleAndAdd=function(t,n,r,a){return t[0]=n[0]+r[0]*a,t[1]=n[1]+r[1]*a,t[2]=n[2]+r[2]*a,t},n.distance=f,n.squaredDistance=M,n.squaredLength=h,n.negate=function(t,n){return t[0]=-n[0],t[1]=-n[1],t[2]=-n[2],t},n.inverse=function(t,n){return t[0]=1/n[0],t[1]=1/n[1],t[2]=1/n[2],t},n.normalize=l,n.dot=v,n.cross=function(t,n,r){var a=n[0],e=n[1],u=n[2],o=r[0],i=r[1],s=r[2];return t[0]=e*s-u*i,t[1]=u*o-a*s,t[2]=a*i-e*o,t},n.lerp=function(t,n,r,a){var e=n[0],u=n[1],o=n[2];return t[0]=e+a*(r[0]-e),t[1]=u+a*(r[1]-u),t[2]=o+a*(r[2]-o),t},n.hermite=function(t,n,r,a,e,u){var o=u*u,i=o*(2*u-3)+1,s=o*(u-2)+u,c=o*(u-1),f=o*(3-2*u);return t[0]=n[0]*i+r[0]*s+a[0]*c+e[0]*f,t[1]=n[1]*i+r[1]*s+a[1]*c+e[1]*f,t[2]=n[2]*i+r[2]*s+a[2]*c+e[2]*f,t},n.bezier=function(t,n,r,a,e,u){var o=1-u,i=o*o,s=u*u,c=i*o,f=3*u*i,M=3*s*o,h=s*u;return t[0]=n[0]*c+r[0]*f+a[0]*M+e[0]*h,t[1]=n[1]*c+r[1]*f+a[1]*M+e[1]*h,t[2]=n[2]*c+r[2]*f+a[2]*M+e[2]*h,t},n.random=function(t,n){n=n||1;var r=2*a.RANDOM()*Math.PI,e=2*a.RANDOM()-1,u=Math.sqrt(1-e*e)*n;return t[0]=Math.cos(r)*u,t[1]=Math.sin(r)*u,t[2]=e*n,t},n.transformMat4=function(t,n,r){var a=n[0],e=n[1],u=n[2],o=r[3]*a+r[7]*e+r[11]*u+r[15];return o=o||1,t[0]=(r[0]*a+r[4]*e+r[8]*u+r[12])/o,t[1]=(r[1]*a+r[5]*e+r[9]*u+r[13])/o,t[2]=(r[2]*a+r[6]*e+r[10]*u+r[14])/o,t},n.transformMat3=function(t,n,r){var a=n[0],e=n[1],u=n[2];return t[0]=a*r[0]+e*r[3]+u*r[6],t[1]=a*r[1]+e*r[4]+u*r[7],t[2]=a*r[2]+e*r[5]+u*r[8],t},n.transformQuat=function(t,n,r){var a=r[0],e=r[1],u=r[2],o=r[3],i=n[0],s=n[1],c=n[2],f=e*c-u*s,M=u*i-a*c,h=a*s-e*i,l=e*h-u*M,v=u*f-a*h,d=a*M-e*f,b=2*o;return f*=b,M*=b,h*=b,l*=2,v*=2,d*=2,t[0]=i+f+l,t[1]=s+M+v,t[2]=c+h+d,t},n.rotateX=function(t,n,r,a){var e=[],u=[];return e[0]=n[0]-r[0],e[1]=n[1]-r[1],e[2]=n[2]-r[2],u[0]=e[0],u[1]=e[1]*Math.cos(a)-e[2]*Math.sin(a),u[2]=e[1]*Math.sin(a)+e[2]*Math.cos(a),t[0]=u[0]+r[0],t[1]=u[1]+r[1],t[2]=u[2]+r[2],t},n.rotateY=function(t,n,r,a){var e=[],u=[];return e[0]=n[0]-r[0],e[1]=n[1]-r[1],e[2]=n[2]-r[2],u[0]=e[2]*Math.sin(a)+e[0]*Math.cos(a),u[1]=e[1],u[2]=e[2]*Math.cos(a)-e[0]*Math.sin(a),t[0]=u[0]+r[0],t[1]=u[1]+r[1],t[2]=u[2]+r[2],t},n.rotateZ=function(t,n,r,a){var e=[],u=[];return e[0]=n[0]-r[0],e[1]=n[1]-r[1],e[2]=n[2]-r[2],u[0]=e[0]*Math.cos(a)-e[1]*Math.sin(a),u[1]=e[0]*Math.sin(a)+e[1]*Math.cos(a),u[2]=e[2],t[0]=u[0]+r[0],t[1]=u[1]+r[1],t[2]=u[2]+r[2],t},n.angle=function(t,n){var r=o(t[0],t[1],t[2]),a=o(n[0],n[1],n[2]);l(r,r),l(a,a);var e=v(r,a);return e>1?0:e<-1?Math.PI:Math.acos(e)},n.str=function(t){return"vec3("+t[0]+", "+t[1]+", "+t[2]+")"},n.exactEquals=function(t,n){return t[0]===n[0]&&t[1]===n[1]&&t[2]===n[2]},n.equals=function(t,n){var r=t[0],e=t[1],u=t[2],o=n[0],i=n[1],s=n[2];return Math.abs(r-o)<=a.EPSILON*Math.max(1,Math.abs(r),Math.abs(o))&&Math.abs(e-i)<=a.EPSILON*Math.max(1,Math.abs(e),Math.abs(i))&&Math.abs(u-s)<=a.EPSILON*Math.max(1,Math.abs(u),Math.abs(s))};var a=function(t){if(t&&t.__esModule)return t;var n={};if(null!=t)for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&(n[r]=t[r]);return n.default=t,n}(r(0));function e(){var t=new a.ARRAY_TYPE(3);return a.ARRAY_TYPE!=Float32Array&&(t[0]=0,t[1]=0,t[2]=0),t}function u(t){var n=t[0],r=t[1],a=t[2];return Math.sqrt(n*n+r*r+a*a)}function o(t,n,r){var e=new a.ARRAY_TYPE(3);return e[0]=t,e[1]=n,e[2]=r,e}function i(t,n,r){return t[0]=n[0]-r[0],t[1]=n[1]-r[1],t[2]=n[2]-r[2],t}function s(t,n,r){return t[0]=n[0]*r[0],t[1]=n[1]*r[1],t[2]=n[2]*r[2],t}function c(t,n,r){return t[0]=n[0]/r[0],t[1]=n[1]/r[1],t[2]=n[2]/r[2],t}function f(t,n){var r=n[0]-t[0],a=n[1]-t[1],e=n[2]-t[2];return Math.sqrt(r*r+a*a+e*e)}function M(t,n){var r=n[0]-t[0],a=n[1]-t[1],e=n[2]-t[2];return r*r+a*a+e*e}function h(t){var n=t[0],r=t[1],a=t[2];return n*n+r*r+a*a}function l(t,n){var r=n[0],a=n[1],e=n[2],u=r*r+a*a+e*e;return u>0&&(u=1/Math.sqrt(u),t[0]=n[0]*u,t[1]=n[1]*u,t[2]=n[2]*u),t}function v(t,n){return t[0]*n[0]+t[1]*n[1]+t[2]*n[2]}n.sub=i,n.mul=s,n.div=c,n.dist=f,n.sqrDist=M,n.len=u,n.sqrLen=h,n.forEach=function(){var t=e();return function(n,r,a,e,u,o){var i=void 0,s=void 0;for(r||(r=3),a||(a=0),s=e?Math.min(e*r+a,n.length):n.length,i=a;i<s;i+=r)t[0]=n[i],t[1]=n[i+1],t[2]=n[i+2],u(t,t,o),n[i]=t[0],n[i+1]=t[1],n[i+2]=t[2];return n}}()},function(t,n,r){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.setAxes=n.sqlerp=n.rotationTo=n.equals=n.exactEquals=n.normalize=n.sqrLen=n.squaredLength=n.len=n.length=n.lerp=n.dot=n.scale=n.mul=n.add=n.set=n.copy=n.fromValues=n.clone=void 0,n.create=s,n.identity=function(t){return t[0]=0,t[1]=0,t[2]=0,t[3]=1,t},n.setAxisAngle=c,n.getAxisAngle=function(t,n){var r=2*Math.acos(n[3]),e=Math.sin(r/2);e>a.EPSILON?(t[0]=n[0]/e,t[1]=n[1]/e,t[2]=n[2]/e):(t[0]=1,t[1]=0,t[2]=0);return r},n.multiply=f,n.rotateX=function(t,n,r){r*=.5;var a=n[0],e=n[1],u=n[2],o=n[3],i=Math.sin(r),s=Math.cos(r);return t[0]=a*s+o*i,t[1]=e*s+u*i,t[2]=u*s-e*i,t[3]=o*s-a*i,t},n.rotateY=function(t,n,r){r*=.5;var a=n[0],e=n[1],u=n[2],o=n[3],i=Math.sin(r),s=Math.cos(r);return t[0]=a*s-u*i,t[1]=e*s+o*i,t[2]=u*s+a*i,t[3]=o*s-e*i,t},n.rotateZ=function(t,n,r){r*=.5;var a=n[0],e=n[1],u=n[2],o=n[3],i=Math.sin(r),s=Math.cos(r);return t[0]=a*s+e*i,t[1]=e*s-a*i,t[2]=u*s+o*i,t[3]=o*s-u*i,t},n.calculateW=function(t,n){var r=n[0],a=n[1],e=n[2];return t[0]=r,t[1]=a,t[2]=e,t[3]=Math.sqrt(Math.abs(1-r*r-a*a-e*e)),t},n.slerp=M,n.random=function(t){var n=a.RANDOM(),r=a.RANDOM(),e=a.RANDOM(),u=Math.sqrt(1-n),o=Math.sqrt(n);return t[0]=u*Math.sin(2*Math.PI*r),t[1]=u*Math.cos(2*Math.PI*r),t[2]=o*Math.sin(2*Math.PI*e),t[3]=o*Math.cos(2*Math.PI*e),t},n.invert=function(t,n){var r=n[0],a=n[1],e=n[2],u=n[3],o=r*r+a*a+e*e+u*u,i=o?1/o:0;return t[0]=-r*i,t[1]=-a*i,t[2]=-e*i,t[3]=u*i,t},n.conjugate=function(t,n){return t[0]=-n[0],t[1]=-n[1],t[2]=-n[2],t[3]=n[3],t},n.fromMat3=h,n.fromEuler=function(t,n,r,a){var e=.5*Math.PI/180;n*=e,r*=e,a*=e;var u=Math.sin(n),o=Math.cos(n),i=Math.sin(r),s=Math.cos(r),c=Math.sin(a),f=Math.cos(a);return t[0]=u*s*f-o*i*c,t[1]=o*i*f+u*s*c,t[2]=o*s*c-u*i*f,t[3]=o*s*f+u*i*c,t},n.str=function(t){return"quat("+t[0]+", "+t[1]+", "+t[2]+", "+t[3]+")"};var a=i(r(0)),e=i(r(5)),u=i(r(2)),o=i(r(1));function i(t){if(t&&t.__esModule)return t;var n={};if(null!=t)for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&(n[r]=t[r]);return n.default=t,n}function s(){var t=new a.ARRAY_TYPE(4);return a.ARRAY_TYPE!=Float32Array&&(t[0]=0,t[1]=0,t[2]=0),t[3]=1,t}function c(t,n,r){r*=.5;var a=Math.sin(r);return t[0]=a*n[0],t[1]=a*n[1],t[2]=a*n[2],t[3]=Math.cos(r),t}function f(t,n,r){var a=n[0],e=n[1],u=n[2],o=n[3],i=r[0],s=r[1],c=r[2],f=r[3];return t[0]=a*f+o*i+e*c-u*s,t[1]=e*f+o*s+u*i-a*c,t[2]=u*f+o*c+a*s-e*i,t[3]=o*f-a*i-e*s-u*c,t}function M(t,n,r,e){var u=n[0],o=n[1],i=n[2],s=n[3],c=r[0],f=r[1],M=r[2],h=r[3],l=void 0,v=void 0,d=void 0,b=void 0,m=void 0;return(v=u*c+o*f+i*M+s*h)<0&&(v=-v,c=-c,f=-f,M=-M,h=-h),1-v>a.EPSILON?(l=Math.acos(v),d=Math.sin(l),b=Math.sin((1-e)*l)/d,m=Math.sin(e*l)/d):(b=1-e,m=e),t[0]=b*u+m*c,t[1]=b*o+m*f,t[2]=b*i+m*M,t[3]=b*s+m*h,t}function h(t,n){var r=n[0]+n[4]+n[8],a=void 0;if(r>0)a=Math.sqrt(r+1),t[3]=.5*a,a=.5/a,t[0]=(n[5]-n[7])*a,t[1]=(n[6]-n[2])*a,t[2]=(n[1]-n[3])*a;else{var e=0;n[4]>n[0]&&(e=1),n[8]>n[3*e+e]&&(e=2);var u=(e+1)%3,o=(e+2)%3;a=Math.sqrt(n[3*e+e]-n[3*u+u]-n[3*o+o]+1),t[e]=.5*a,a=.5/a,t[3]=(n[3*u+o]-n[3*o+u])*a,t[u]=(n[3*u+e]+n[3*e+u])*a,t[o]=(n[3*o+e]+n[3*e+o])*a}return t}n.clone=o.clone,n.fromValues=o.fromValues,n.copy=o.copy,n.set=o.set,n.add=o.add,n.mul=f,n.scale=o.scale,n.dot=o.dot,n.lerp=o.lerp;var l=n.length=o.length,v=(n.len=l,n.squaredLength=o.squaredLength),d=(n.sqrLen=v,n.normalize=o.normalize);n.exactEquals=o.exactEquals,n.equals=o.equals,n.rotationTo=function(){var t=u.create(),n=u.fromValues(1,0,0),r=u.fromValues(0,1,0);return function(a,e,o){var i=u.dot(e,o);return i<-.999999?(u.cross(t,n,e),u.len(t)<1e-6&&u.cross(t,r,e),u.normalize(t,t),c(a,t,Math.PI),a):i>.999999?(a[0]=0,a[1]=0,a[2]=0,a[3]=1,a):(u.cross(t,e,o),a[0]=t[0],a[1]=t[1],a[2]=t[2],a[3]=1+i,d(a,a))}}(),n.sqlerp=function(){var t=s(),n=s();return function(r,a,e,u,o,i){return M(t,a,o,i),M(n,e,u,i),M(r,t,n,2*i*(1-i)),r}}(),n.setAxes=function(){var t=e.create();return function(n,r,a,e){return t[0]=a[0],t[3]=a[1],t[6]=a[2],t[1]=e[0],t[4]=e[1],t[7]=e[2],t[2]=-r[0],t[5]=-r[1],t[8]=-r[2],d(n,h(n,t))}}()},function(t,n,r){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.sub=n.mul=void 0,n.create=function(){var t=new a.ARRAY_TYPE(16);a.ARRAY_TYPE!=Float32Array&&(t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0);return t[0]=1,t[5]=1,t[10]=1,t[15]=1,t},n.clone=function(t){var n=new a.ARRAY_TYPE(16);return n[0]=t[0],n[1]=t[1],n[2]=t[2],n[3]=t[3],n[4]=t[4],n[5]=t[5],n[6]=t[6],n[7]=t[7],n[8]=t[8],n[9]=t[9],n[10]=t[10],n[11]=t[11],n[12]=t[12],n[13]=t[13],n[14]=t[14],n[15]=t[15],n},n.copy=function(t,n){return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],t},n.fromValues=function(t,n,r,e,u,o,i,s,c,f,M,h,l,v,d,b){var m=new a.ARRAY_TYPE(16);return m[0]=t,m[1]=n,m[2]=r,m[3]=e,m[4]=u,m[5]=o,m[6]=i,m[7]=s,m[8]=c,m[9]=f,m[10]=M,m[11]=h,m[12]=l,m[13]=v,m[14]=d,m[15]=b,m},n.set=function(t,n,r,a,e,u,o,i,s,c,f,M,h,l,v,d,b){return t[0]=n,t[1]=r,t[2]=a,t[3]=e,t[4]=u,t[5]=o,t[6]=i,t[7]=s,t[8]=c,t[9]=f,t[10]=M,t[11]=h,t[12]=l,t[13]=v,t[14]=d,t[15]=b,t},n.identity=e,n.transpose=function(t,n){if(t===n){var r=n[1],a=n[2],e=n[3],u=n[6],o=n[7],i=n[11];t[1]=n[4],t[2]=n[8],t[3]=n[12],t[4]=r,t[6]=n[9],t[7]=n[13],t[8]=a,t[9]=u,t[11]=n[14],t[12]=e,t[13]=o,t[14]=i}else t[0]=n[0],t[1]=n[4],t[2]=n[8],t[3]=n[12],t[4]=n[1],t[5]=n[5],t[6]=n[9],t[7]=n[13],t[8]=n[2],t[9]=n[6],t[10]=n[10],t[11]=n[14],t[12]=n[3],t[13]=n[7],t[14]=n[11],t[15]=n[15];return t},n.invert=function(t,n){var r=n[0],a=n[1],e=n[2],u=n[3],o=n[4],i=n[5],s=n[6],c=n[7],f=n[8],M=n[9],h=n[10],l=n[11],v=n[12],d=n[13],b=n[14],m=n[15],p=r*i-a*o,P=r*s-e*o,A=r*c-u*o,E=a*s-e*i,O=a*c-u*i,R=e*c-u*s,y=f*d-M*v,q=f*b-h*v,x=f*m-l*v,_=M*b-h*d,Y=M*m-l*d,L=h*m-l*b,S=p*L-P*Y+A*_+E*x-O*q+R*y;if(!S)return null;return S=1/S,t[0]=(i*L-s*Y+c*_)*S,t[1]=(e*Y-a*L-u*_)*S,t[2]=(d*R-b*O+m*E)*S,t[3]=(h*O-M*R-l*E)*S,t[4]=(s*x-o*L-c*q)*S,t[5]=(r*L-e*x+u*q)*S,t[6]=(b*A-v*R-m*P)*S,t[7]=(f*R-h*A+l*P)*S,t[8]=(o*Y-i*x+c*y)*S,t[9]=(a*x-r*Y-u*y)*S,t[10]=(v*O-d*A+m*p)*S,t[11]=(M*A-f*O-l*p)*S,t[12]=(i*q-o*_-s*y)*S,t[13]=(r*_-a*q+e*y)*S,t[14]=(d*P-v*E-b*p)*S,t[15]=(f*E-M*P+h*p)*S,t},n.adjoint=function(t,n){var r=n[0],a=n[1],e=n[2],u=n[3],o=n[4],i=n[5],s=n[6],c=n[7],f=n[8],M=n[9],h=n[10],l=n[11],v=n[12],d=n[13],b=n[14],m=n[15];return t[0]=i*(h*m-l*b)-M*(s*m-c*b)+d*(s*l-c*h),t[1]=-(a*(h*m-l*b)-M*(e*m-u*b)+d*(e*l-u*h)),t[2]=a*(s*m-c*b)-i*(e*m-u*b)+d*(e*c-u*s),t[3]=-(a*(s*l-c*h)-i*(e*l-u*h)+M*(e*c-u*s)),t[4]=-(o*(h*m-l*b)-f*(s*m-c*b)+v*(s*l-c*h)),t[5]=r*(h*m-l*b)-f*(e*m-u*b)+v*(e*l-u*h),t[6]=-(r*(s*m-c*b)-o*(e*m-u*b)+v*(e*c-u*s)),t[7]=r*(s*l-c*h)-o*(e*l-u*h)+f*(e*c-u*s),t[8]=o*(M*m-l*d)-f*(i*m-c*d)+v*(i*l-c*M),t[9]=-(r*(M*m-l*d)-f*(a*m-u*d)+v*(a*l-u*M)),t[10]=r*(i*m-c*d)-o*(a*m-u*d)+v*(a*c-u*i),t[11]=-(r*(i*l-c*M)-o*(a*l-u*M)+f*(a*c-u*i)),t[12]=-(o*(M*b-h*d)-f*(i*b-s*d)+v*(i*h-s*M)),t[13]=r*(M*b-h*d)-f*(a*b-e*d)+v*(a*h-e*M),t[14]=-(r*(i*b-s*d)-o*(a*b-e*d)+v*(a*s-e*i)),t[15]=r*(i*h-s*M)-o*(a*h-e*M)+f*(a*s-e*i),t},n.determinant=function(t){var n=t[0],r=t[1],a=t[2],e=t[3],u=t[4],o=t[5],i=t[6],s=t[7],c=t[8],f=t[9],M=t[10],h=t[11],l=t[12],v=t[13],d=t[14],b=t[15];return(n*o-r*u)*(M*b-h*d)-(n*i-a*u)*(f*b-h*v)+(n*s-e*u)*(f*d-M*v)+(r*i-a*o)*(c*b-h*l)-(r*s-e*o)*(c*d-M*l)+(a*s-e*i)*(c*v-f*l)},n.multiply=u,n.translate=function(t,n,r){var a=r[0],e=r[1],u=r[2],o=void 0,i=void 0,s=void 0,c=void 0,f=void 0,M=void 0,h=void 0,l=void 0,v=void 0,d=void 0,b=void 0,m=void 0;n===t?(t[12]=n[0]*a+n[4]*e+n[8]*u+n[12],t[13]=n[1]*a+n[5]*e+n[9]*u+n[13],t[14]=n[2]*a+n[6]*e+n[10]*u+n[14],t[15]=n[3]*a+n[7]*e+n[11]*u+n[15]):(o=n[0],i=n[1],s=n[2],c=n[3],f=n[4],M=n[5],h=n[6],l=n[7],v=n[8],d=n[9],b=n[10],m=n[11],t[0]=o,t[1]=i,t[2]=s,t[3]=c,t[4]=f,t[5]=M,t[6]=h,t[7]=l,t[8]=v,t[9]=d,t[10]=b,t[11]=m,t[12]=o*a+f*e+v*u+n[12],t[13]=i*a+M*e+d*u+n[13],t[14]=s*a+h*e+b*u+n[14],t[15]=c*a+l*e+m*u+n[15]);return t},n.scale=function(t,n,r){var a=r[0],e=r[1],u=r[2];return t[0]=n[0]*a,t[1]=n[1]*a,t[2]=n[2]*a,t[3]=n[3]*a,t[4]=n[4]*e,t[5]=n[5]*e,t[6]=n[6]*e,t[7]=n[7]*e,t[8]=n[8]*u,t[9]=n[9]*u,t[10]=n[10]*u,t[11]=n[11]*u,t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],t},n.rotate=function(t,n,r,e){var u=e[0],o=e[1],i=e[2],s=Math.sqrt(u*u+o*o+i*i),c=void 0,f=void 0,M=void 0,h=void 0,l=void 0,v=void 0,d=void 0,b=void 0,m=void 0,p=void 0,P=void 0,A=void 0,E=void 0,O=void 0,R=void 0,y=void 0,q=void 0,x=void 0,_=void 0,Y=void 0,L=void 0,S=void 0,w=void 0,I=void 0;if(s<a.EPSILON)return null;u*=s=1/s,o*=s,i*=s,c=Math.sin(r),f=Math.cos(r),M=1-f,h=n[0],l=n[1],v=n[2],d=n[3],b=n[4],m=n[5],p=n[6],P=n[7],A=n[8],E=n[9],O=n[10],R=n[11],y=u*u*M+f,q=o*u*M+i*c,x=i*u*M-o*c,_=u*o*M-i*c,Y=o*o*M+f,L=i*o*M+u*c,S=u*i*M+o*c,w=o*i*M-u*c,I=i*i*M+f,t[0]=h*y+b*q+A*x,t[1]=l*y+m*q+E*x,t[2]=v*y+p*q+O*x,t[3]=d*y+P*q+R*x,t[4]=h*_+b*Y+A*L,t[5]=l*_+m*Y+E*L,t[6]=v*_+p*Y+O*L,t[7]=d*_+P*Y+R*L,t[8]=h*S+b*w+A*I,t[9]=l*S+m*w+E*I,t[10]=v*S+p*w+O*I,t[11]=d*S+P*w+R*I,n!==t&&(t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15]);return t},n.rotateX=function(t,n,r){var a=Math.sin(r),e=Math.cos(r),u=n[4],o=n[5],i=n[6],s=n[7],c=n[8],f=n[9],M=n[10],h=n[11];n!==t&&(t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15]);return t[4]=u*e+c*a,t[5]=o*e+f*a,t[6]=i*e+M*a,t[7]=s*e+h*a,t[8]=c*e-u*a,t[9]=f*e-o*a,t[10]=M*e-i*a,t[11]=h*e-s*a,t},n.rotateY=function(t,n,r){var a=Math.sin(r),e=Math.cos(r),u=n[0],o=n[1],i=n[2],s=n[3],c=n[8],f=n[9],M=n[10],h=n[11];n!==t&&(t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15]);return t[0]=u*e-c*a,t[1]=o*e-f*a,t[2]=i*e-M*a,t[3]=s*e-h*a,t[8]=u*a+c*e,t[9]=o*a+f*e,t[10]=i*a+M*e,t[11]=s*a+h*e,t},n.rotateZ=function(t,n,r){var a=Math.sin(r),e=Math.cos(r),u=n[0],o=n[1],i=n[2],s=n[3],c=n[4],f=n[5],M=n[6],h=n[7];n!==t&&(t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15]);return t[0]=u*e+c*a,t[1]=o*e+f*a,t[2]=i*e+M*a,t[3]=s*e+h*a,t[4]=c*e-u*a,t[5]=f*e-o*a,t[6]=M*e-i*a,t[7]=h*e-s*a,t},n.fromTranslation=function(t,n){return t[0]=1,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=1,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=1,t[11]=0,t[12]=n[0],t[13]=n[1],t[14]=n[2],t[15]=1,t},n.fromScaling=function(t,n){return t[0]=n[0],t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=n[1],t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=n[2],t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t},n.fromRotation=function(t,n,r){var e=r[0],u=r[1],o=r[2],i=Math.sqrt(e*e+u*u+o*o),s=void 0,c=void 0,f=void 0;if(i<a.EPSILON)return null;return e*=i=1/i,u*=i,o*=i,s=Math.sin(n),c=Math.cos(n),f=1-c,t[0]=e*e*f+c,t[1]=u*e*f+o*s,t[2]=o*e*f-u*s,t[3]=0,t[4]=e*u*f-o*s,t[5]=u*u*f+c,t[6]=o*u*f+e*s,t[7]=0,t[8]=e*o*f+u*s,t[9]=u*o*f-e*s,t[10]=o*o*f+c,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t},n.fromXRotation=function(t,n){var r=Math.sin(n),a=Math.cos(n);return t[0]=1,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=a,t[6]=r,t[7]=0,t[8]=0,t[9]=-r,t[10]=a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t},n.fromYRotation=function(t,n){var r=Math.sin(n),a=Math.cos(n);return t[0]=a,t[1]=0,t[2]=-r,t[3]=0,t[4]=0,t[5]=1,t[6]=0,t[7]=0,t[8]=r,t[9]=0,t[10]=a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t},n.fromZRotation=function(t,n){var r=Math.sin(n),a=Math.cos(n);return t[0]=a,t[1]=r,t[2]=0,t[3]=0,t[4]=-r,t[5]=a,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=1,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t},n.fromRotationTranslation=o,n.fromQuat2=function(t,n){var r=new a.ARRAY_TYPE(3),e=-n[0],u=-n[1],i=-n[2],s=n[3],c=n[4],f=n[5],M=n[6],h=n[7],l=e*e+u*u+i*i+s*s;l>0?(r[0]=2*(c*s+h*e+f*i-M*u)/l,r[1]=2*(f*s+h*u+M*e-c*i)/l,r[2]=2*(M*s+h*i+c*u-f*e)/l):(r[0]=2*(c*s+h*e+f*i-M*u),r[1]=2*(f*s+h*u+M*e-c*i),r[2]=2*(M*s+h*i+c*u-f*e));return o(t,n,r),t},n.getTranslation=function(t,n){return t[0]=n[12],t[1]=n[13],t[2]=n[14],t},n.getScaling=function(t,n){var r=n[0],a=n[1],e=n[2],u=n[4],o=n[5],i=n[6],s=n[8],c=n[9],f=n[10];return t[0]=Math.sqrt(r*r+a*a+e*e),t[1]=Math.sqrt(u*u+o*o+i*i),t[2]=Math.sqrt(s*s+c*c+f*f),t},n.getRotation=function(t,n){var r=n[0]+n[5]+n[10],a=0;r>0?(a=2*Math.sqrt(r+1),t[3]=.25*a,t[0]=(n[6]-n[9])/a,t[1]=(n[8]-n[2])/a,t[2]=(n[1]-n[4])/a):n[0]>n[5]&&n[0]>n[10]?(a=2*Math.sqrt(1+n[0]-n[5]-n[10]),t[3]=(n[6]-n[9])/a,t[0]=.25*a,t[1]=(n[1]+n[4])/a,t[2]=(n[8]+n[2])/a):n[5]>n[10]?(a=2*Math.sqrt(1+n[5]-n[0]-n[10]),t[3]=(n[8]-n[2])/a,t[0]=(n[1]+n[4])/a,t[1]=.25*a,t[2]=(n[6]+n[9])/a):(a=2*Math.sqrt(1+n[10]-n[0]-n[5]),t[3]=(n[1]-n[4])/a,t[0]=(n[8]+n[2])/a,t[1]=(n[6]+n[9])/a,t[2]=.25*a);return t},n.fromRotationTranslationScale=function(t,n,r,a){var e=n[0],u=n[1],o=n[2],i=n[3],s=e+e,c=u+u,f=o+o,M=e*s,h=e*c,l=e*f,v=u*c,d=u*f,b=o*f,m=i*s,p=i*c,P=i*f,A=a[0],E=a[1],O=a[2];return t[0]=(1-(v+b))*A,t[1]=(h+P)*A,t[2]=(l-p)*A,t[3]=0,t[4]=(h-P)*E,t[5]=(1-(M+b))*E,t[6]=(d+m)*E,t[7]=0,t[8]=(l+p)*O,t[9]=(d-m)*O,t[10]=(1-(M+v))*O,t[11]=0,t[12]=r[0],t[13]=r[1],t[14]=r[2],t[15]=1,t},n.fromRotationTranslationScaleOrigin=function(t,n,r,a,e){var u=n[0],o=n[1],i=n[2],s=n[3],c=u+u,f=o+o,M=i+i,h=u*c,l=u*f,v=u*M,d=o*f,b=o*M,m=i*M,p=s*c,P=s*f,A=s*M,E=a[0],O=a[1],R=a[2],y=e[0],q=e[1],x=e[2],_=(1-(d+m))*E,Y=(l+A)*E,L=(v-P)*E,S=(l-A)*O,w=(1-(h+m))*O,I=(b+p)*O,N=(v+P)*R,g=(b-p)*R,T=(1-(h+d))*R;return t[0]=_,t[1]=Y,t[2]=L,t[3]=0,t[4]=S,t[5]=w,t[6]=I,t[7]=0,t[8]=N,t[9]=g,t[10]=T,t[11]=0,t[12]=r[0]+y-(_*y+S*q+N*x),t[13]=r[1]+q-(Y*y+w*q+g*x),t[14]=r[2]+x-(L*y+I*q+T*x),t[15]=1,t},n.fromQuat=function(t,n){var r=n[0],a=n[1],e=n[2],u=n[3],o=r+r,i=a+a,s=e+e,c=r*o,f=a*o,M=a*i,h=e*o,l=e*i,v=e*s,d=u*o,b=u*i,m=u*s;return t[0]=1-M-v,t[1]=f+m,t[2]=h-b,t[3]=0,t[4]=f-m,t[5]=1-c-v,t[6]=l+d,t[7]=0,t[8]=h+b,t[9]=l-d,t[10]=1-c-M,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t},n.frustum=function(t,n,r,a,e,u,o){var i=1/(r-n),s=1/(e-a),c=1/(u-o);return t[0]=2*u*i,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=2*u*s,t[6]=0,t[7]=0,t[8]=(r+n)*i,t[9]=(e+a)*s,t[10]=(o+u)*c,t[11]=-1,t[12]=0,t[13]=0,t[14]=o*u*2*c,t[15]=0,t},n.perspective=function(t,n,r,a,e){var u=1/Math.tan(n/2),o=void 0;t[0]=u/r,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=u,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[11]=-1,t[12]=0,t[13]=0,t[15]=0,null!=e&&e!==1/0?(o=1/(a-e),t[10]=(e+a)*o,t[14]=2*e*a*o):(t[10]=-1,t[14]=-2*a);return t},n.perspectiveFromFieldOfView=function(t,n,r,a){var e=Math.tan(n.upDegrees*Math.PI/180),u=Math.tan(n.downDegrees*Math.PI/180),o=Math.tan(n.leftDegrees*Math.PI/180),i=Math.tan(n.rightDegrees*Math.PI/180),s=2/(o+i),c=2/(e+u);return t[0]=s,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=c,t[6]=0,t[7]=0,t[8]=-(o-i)*s*.5,t[9]=(e-u)*c*.5,t[10]=a/(r-a),t[11]=-1,t[12]=0,t[13]=0,t[14]=a*r/(r-a),t[15]=0,t},n.ortho=function(t,n,r,a,e,u,o){var i=1/(n-r),s=1/(a-e),c=1/(u-o);return t[0]=-2*i,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=-2*s,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=2*c,t[11]=0,t[12]=(n+r)*i,t[13]=(e+a)*s,t[14]=(o+u)*c,t[15]=1,t},n.lookAt=function(t,n,r,u){var o=void 0,i=void 0,s=void 0,c=void 0,f=void 0,M=void 0,h=void 0,l=void 0,v=void 0,d=void 0,b=n[0],m=n[1],p=n[2],P=u[0],A=u[1],E=u[2],O=r[0],R=r[1],y=r[2];if(Math.abs(b-O)<a.EPSILON&&Math.abs(m-R)<a.EPSILON&&Math.abs(p-y)<a.EPSILON)return e(t);h=b-O,l=m-R,v=p-y,d=1/Math.sqrt(h*h+l*l+v*v),o=A*(v*=d)-E*(l*=d),i=E*(h*=d)-P*v,s=P*l-A*h,(d=Math.sqrt(o*o+i*i+s*s))?(o*=d=1/d,i*=d,s*=d):(o=0,i=0,s=0);c=l*s-v*i,f=v*o-h*s,M=h*i-l*o,(d=Math.sqrt(c*c+f*f+M*M))?(c*=d=1/d,f*=d,M*=d):(c=0,f=0,M=0);return t[0]=o,t[1]=c,t[2]=h,t[3]=0,t[4]=i,t[5]=f,t[6]=l,t[7]=0,t[8]=s,t[9]=M,t[10]=v,t[11]=0,t[12]=-(o*b+i*m+s*p),t[13]=-(c*b+f*m+M*p),t[14]=-(h*b+l*m+v*p),t[15]=1,t},n.targetTo=function(t,n,r,a){var e=n[0],u=n[1],o=n[2],i=a[0],s=a[1],c=a[2],f=e-r[0],M=u-r[1],h=o-r[2],l=f*f+M*M+h*h;l>0&&(l=1/Math.sqrt(l),f*=l,M*=l,h*=l);var v=s*h-c*M,d=c*f-i*h,b=i*M-s*f;(l=v*v+d*d+b*b)>0&&(l=1/Math.sqrt(l),v*=l,d*=l,b*=l);return t[0]=v,t[1]=d,t[2]=b,t[3]=0,t[4]=M*b-h*d,t[5]=h*v-f*b,t[6]=f*d-M*v,t[7]=0,t[8]=f,t[9]=M,t[10]=h,t[11]=0,t[12]=e,t[13]=u,t[14]=o,t[15]=1,t},n.str=function(t){return"mat4("+t[0]+", "+t[1]+", "+t[2]+", "+t[3]+", "+t[4]+", "+t[5]+", "+t[6]+", "+t[7]+", "+t[8]+", "+t[9]+", "+t[10]+", "+t[11]+", "+t[12]+", "+t[13]+", "+t[14]+", "+t[15]+")"},n.frob=function(t){return Math.sqrt(Math.pow(t[0],2)+Math.pow(t[1],2)+Math.pow(t[2],2)+Math.pow(t[3],2)+Math.pow(t[4],2)+Math.pow(t[5],2)+Math.pow(t[6],2)+Math.pow(t[7],2)+Math.pow(t[8],2)+Math.pow(t[9],2)+Math.pow(t[10],2)+Math.pow(t[11],2)+Math.pow(t[12],2)+Math.pow(t[13],2)+Math.pow(t[14],2)+Math.pow(t[15],2))},n.add=function(t,n,r){return t[0]=n[0]+r[0],t[1]=n[1]+r[1],t[2]=n[2]+r[2],t[3]=n[3]+r[3],t[4]=n[4]+r[4],t[5]=n[5]+r[5],t[6]=n[6]+r[6],t[7]=n[7]+r[7],t[8]=n[8]+r[8],t[9]=n[9]+r[9],t[10]=n[10]+r[10],t[11]=n[11]+r[11],t[12]=n[12]+r[12],t[13]=n[13]+r[13],t[14]=n[14]+r[14],t[15]=n[15]+r[15],t},n.subtract=i,n.multiplyScalar=function(t,n,r){return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=n[3]*r,t[4]=n[4]*r,t[5]=n[5]*r,t[6]=n[6]*r,t[7]=n[7]*r,t[8]=n[8]*r,t[9]=n[9]*r,t[10]=n[10]*r,t[11]=n[11]*r,t[12]=n[12]*r,t[13]=n[13]*r,t[14]=n[14]*r,t[15]=n[15]*r,t},n.multiplyScalarAndAdd=function(t,n,r,a){return t[0]=n[0]+r[0]*a,t[1]=n[1]+r[1]*a,t[2]=n[2]+r[2]*a,t[3]=n[3]+r[3]*a,t[4]=n[4]+r[4]*a,t[5]=n[5]+r[5]*a,t[6]=n[6]+r[6]*a,t[7]=n[7]+r[7]*a,t[8]=n[8]+r[8]*a,t[9]=n[9]+r[9]*a,t[10]=n[10]+r[10]*a,t[11]=n[11]+r[11]*a,t[12]=n[12]+r[12]*a,t[13]=n[13]+r[13]*a,t[14]=n[14]+r[14]*a,t[15]=n[15]+r[15]*a,t},n.exactEquals=function(t,n){return t[0]===n[0]&&t[1]===n[1]&&t[2]===n[2]&&t[3]===n[3]&&t[4]===n[4]&&t[5]===n[5]&&t[6]===n[6]&&t[7]===n[7]&&t[8]===n[8]&&t[9]===n[9]&&t[10]===n[10]&&t[11]===n[11]&&t[12]===n[12]&&t[13]===n[13]&&t[14]===n[14]&&t[15]===n[15]},n.equals=function(t,n){var r=t[0],e=t[1],u=t[2],o=t[3],i=t[4],s=t[5],c=t[6],f=t[7],M=t[8],h=t[9],l=t[10],v=t[11],d=t[12],b=t[13],m=t[14],p=t[15],P=n[0],A=n[1],E=n[2],O=n[3],R=n[4],y=n[5],q=n[6],x=n[7],_=n[8],Y=n[9],L=n[10],S=n[11],w=n[12],I=n[13],N=n[14],g=n[15];return Math.abs(r-P)<=a.EPSILON*Math.max(1,Math.abs(r),Math.abs(P))&&Math.abs(e-A)<=a.EPSILON*Math.max(1,Math.abs(e),Math.abs(A))&&Math.abs(u-E)<=a.EPSILON*Math.max(1,Math.abs(u),Math.abs(E))&&Math.abs(o-O)<=a.EPSILON*Math.max(1,Math.abs(o),Math.abs(O))&&Math.abs(i-R)<=a.EPSILON*Math.max(1,Math.abs(i),Math.abs(R))&&Math.abs(s-y)<=a.EPSILON*Math.max(1,Math.abs(s),Math.abs(y))&&Math.abs(c-q)<=a.EPSILON*Math.max(1,Math.abs(c),Math.abs(q))&&Math.abs(f-x)<=a.EPSILON*Math.max(1,Math.abs(f),Math.abs(x))&&Math.abs(M-_)<=a.EPSILON*Math.max(1,Math.abs(M),Math.abs(_))&&Math.abs(h-Y)<=a.EPSILON*Math.max(1,Math.abs(h),Math.abs(Y))&&Math.abs(l-L)<=a.EPSILON*Math.max(1,Math.abs(l),Math.abs(L))&&Math.abs(v-S)<=a.EPSILON*Math.max(1,Math.abs(v),Math.abs(S))&&Math.abs(d-w)<=a.EPSILON*Math.max(1,Math.abs(d),Math.abs(w))&&Math.abs(b-I)<=a.EPSILON*Math.max(1,Math.abs(b),Math.abs(I))&&Math.abs(m-N)<=a.EPSILON*Math.max(1,Math.abs(m),Math.abs(N))&&Math.abs(p-g)<=a.EPSILON*Math.max(1,Math.abs(p),Math.abs(g))};var a=function(t){if(t&&t.__esModule)return t;var n={};if(null!=t)for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&(n[r]=t[r]);return n.default=t,n}(r(0));function e(t){return t[0]=1,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=1,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=1,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t}function u(t,n,r){var a=n[0],e=n[1],u=n[2],o=n[3],i=n[4],s=n[5],c=n[6],f=n[7],M=n[8],h=n[9],l=n[10],v=n[11],d=n[12],b=n[13],m=n[14],p=n[15],P=r[0],A=r[1],E=r[2],O=r[3];return t[0]=P*a+A*i+E*M+O*d,t[1]=P*e+A*s+E*h+O*b,t[2]=P*u+A*c+E*l+O*m,t[3]=P*o+A*f+E*v+O*p,P=r[4],A=r[5],E=r[6],O=r[7],t[4]=P*a+A*i+E*M+O*d,t[5]=P*e+A*s+E*h+O*b,t[6]=P*u+A*c+E*l+O*m,t[7]=P*o+A*f+E*v+O*p,P=r[8],A=r[9],E=r[10],O=r[11],t[8]=P*a+A*i+E*M+O*d,t[9]=P*e+A*s+E*h+O*b,t[10]=P*u+A*c+E*l+O*m,t[11]=P*o+A*f+E*v+O*p,P=r[12],A=r[13],E=r[14],O=r[15],t[12]=P*a+A*i+E*M+O*d,t[13]=P*e+A*s+E*h+O*b,t[14]=P*u+A*c+E*l+O*m,t[15]=P*o+A*f+E*v+O*p,t}function o(t,n,r){var a=n[0],e=n[1],u=n[2],o=n[3],i=a+a,s=e+e,c=u+u,f=a*i,M=a*s,h=a*c,l=e*s,v=e*c,d=u*c,b=o*i,m=o*s,p=o*c;return t[0]=1-(l+d),t[1]=M+p,t[2]=h-m,t[3]=0,t[4]=M-p,t[5]=1-(f+d),t[6]=v+b,t[7]=0,t[8]=h+m,t[9]=v-b,t[10]=1-(f+l),t[11]=0,t[12]=r[0],t[13]=r[1],t[14]=r[2],t[15]=1,t}function i(t,n,r){return t[0]=n[0]-r[0],t[1]=n[1]-r[1],t[2]=n[2]-r[2],t[3]=n[3]-r[3],t[4]=n[4]-r[4],t[5]=n[5]-r[5],t[6]=n[6]-r[6],t[7]=n[7]-r[7],t[8]=n[8]-r[8],t[9]=n[9]-r[9],t[10]=n[10]-r[10],t[11]=n[11]-r[11],t[12]=n[12]-r[12],t[13]=n[13]-r[13],t[14]=n[14]-r[14],t[15]=n[15]-r[15],t}n.mul=u,n.sub=i},function(t,n,r){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.sub=n.mul=void 0,n.create=function(){var t=new a.ARRAY_TYPE(9);a.ARRAY_TYPE!=Float32Array&&(t[1]=0,t[2]=0,t[3]=0,t[5]=0,t[6]=0,t[7]=0);return t[0]=1,t[4]=1,t[8]=1,t},n.fromMat4=function(t,n){return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[4],t[4]=n[5],t[5]=n[6],t[6]=n[8],t[7]=n[9],t[8]=n[10],t},n.clone=function(t){var n=new a.ARRAY_TYPE(9);return n[0]=t[0],n[1]=t[1],n[2]=t[2],n[3]=t[3],n[4]=t[4],n[5]=t[5],n[6]=t[6],n[7]=t[7],n[8]=t[8],n},n.copy=function(t,n){return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t},n.fromValues=function(t,n,r,e,u,o,i,s,c){var f=new a.ARRAY_TYPE(9);return f[0]=t,f[1]=n,f[2]=r,f[3]=e,f[4]=u,f[5]=o,f[6]=i,f[7]=s,f[8]=c,f},n.set=function(t,n,r,a,e,u,o,i,s,c){return t[0]=n,t[1]=r,t[2]=a,t[3]=e,t[4]=u,t[5]=o,t[6]=i,t[7]=s,t[8]=c,t},n.identity=function(t){return t[0]=1,t[1]=0,t[2]=0,t[3]=0,t[4]=1,t[5]=0,t[6]=0,t[7]=0,t[8]=1,t},n.transpose=function(t,n){if(t===n){var r=n[1],a=n[2],e=n[5];t[1]=n[3],t[2]=n[6],t[3]=r,t[5]=n[7],t[6]=a,t[7]=e}else t[0]=n[0],t[1]=n[3],t[2]=n[6],t[3]=n[1],t[4]=n[4],t[5]=n[7],t[6]=n[2],t[7]=n[5],t[8]=n[8];return t},n.invert=function(t,n){var r=n[0],a=n[1],e=n[2],u=n[3],o=n[4],i=n[5],s=n[6],c=n[7],f=n[8],M=f*o-i*c,h=-f*u+i*s,l=c*u-o*s,v=r*M+a*h+e*l;if(!v)return null;return v=1/v,t[0]=M*v,t[1]=(-f*a+e*c)*v,t[2]=(i*a-e*o)*v,t[3]=h*v,t[4]=(f*r-e*s)*v,t[5]=(-i*r+e*u)*v,t[6]=l*v,t[7]=(-c*r+a*s)*v,t[8]=(o*r-a*u)*v,t},n.adjoint=function(t,n){var r=n[0],a=n[1],e=n[2],u=n[3],o=n[4],i=n[5],s=n[6],c=n[7],f=n[8];return t[0]=o*f-i*c,t[1]=e*c-a*f,t[2]=a*i-e*o,t[3]=i*s-u*f,t[4]=r*f-e*s,t[5]=e*u-r*i,t[6]=u*c-o*s,t[7]=a*s-r*c,t[8]=r*o-a*u,t},n.determinant=function(t){var n=t[0],r=t[1],a=t[2],e=t[3],u=t[4],o=t[5],i=t[6],s=t[7],c=t[8];return n*(c*u-o*s)+r*(-c*e+o*i)+a*(s*e-u*i)},n.multiply=e,n.translate=function(t,n,r){var a=n[0],e=n[1],u=n[2],o=n[3],i=n[4],s=n[5],c=n[6],f=n[7],M=n[8],h=r[0],l=r[1];return t[0]=a,t[1]=e,t[2]=u,t[3]=o,t[4]=i,t[5]=s,t[6]=h*a+l*o+c,t[7]=h*e+l*i+f,t[8]=h*u+l*s+M,t},n.rotate=function(t,n,r){var a=n[0],e=n[1],u=n[2],o=n[3],i=n[4],s=n[5],c=n[6],f=n[7],M=n[8],h=Math.sin(r),l=Math.cos(r);return t[0]=l*a+h*o,t[1]=l*e+h*i,t[2]=l*u+h*s,t[3]=l*o-h*a,t[4]=l*i-h*e,t[5]=l*s-h*u,t[6]=c,t[7]=f,t[8]=M,t},n.scale=function(t,n,r){var a=r[0],e=r[1];return t[0]=a*n[0],t[1]=a*n[1],t[2]=a*n[2],t[3]=e*n[3],t[4]=e*n[4],t[5]=e*n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t},n.fromTranslation=function(t,n){return t[0]=1,t[1]=0,t[2]=0,t[3]=0,t[4]=1,t[5]=0,t[6]=n[0],t[7]=n[1],t[8]=1,t},n.fromRotation=function(t,n){var r=Math.sin(n),a=Math.cos(n);return t[0]=a,t[1]=r,t[2]=0,t[3]=-r,t[4]=a,t[5]=0,t[6]=0,t[7]=0,t[8]=1,t},n.fromScaling=function(t,n){return t[0]=n[0],t[1]=0,t[2]=0,t[3]=0,t[4]=n[1],t[5]=0,t[6]=0,t[7]=0,t[8]=1,t},n.fromMat2d=function(t,n){return t[0]=n[0],t[1]=n[1],t[2]=0,t[3]=n[2],t[4]=n[3],t[5]=0,t[6]=n[4],t[7]=n[5],t[8]=1,t},n.fromQuat=function(t,n){var r=n[0],a=n[1],e=n[2],u=n[3],o=r+r,i=a+a,s=e+e,c=r*o,f=a*o,M=a*i,h=e*o,l=e*i,v=e*s,d=u*o,b=u*i,m=u*s;return t[0]=1-M-v,t[3]=f-m,t[6]=h+b,t[1]=f+m,t[4]=1-c-v,t[7]=l-d,t[2]=h-b,t[5]=l+d,t[8]=1-c-M,t},n.normalFromMat4=function(t,n){var r=n[0],a=n[1],e=n[2],u=n[3],o=n[4],i=n[5],s=n[6],c=n[7],f=n[8],M=n[9],h=n[10],l=n[11],v=n[12],d=n[13],b=n[14],m=n[15],p=r*i-a*o,P=r*s-e*o,A=r*c-u*o,E=a*s-e*i,O=a*c-u*i,R=e*c-u*s,y=f*d-M*v,q=f*b-h*v,x=f*m-l*v,_=M*b-h*d,Y=M*m-l*d,L=h*m-l*b,S=p*L-P*Y+A*_+E*x-O*q+R*y;if(!S)return null;return S=1/S,t[0]=(i*L-s*Y+c*_)*S,t[1]=(s*x-o*L-c*q)*S,t[2]=(o*Y-i*x+c*y)*S,t[3]=(e*Y-a*L-u*_)*S,t[4]=(r*L-e*x+u*q)*S,t[5]=(a*x-r*Y-u*y)*S,t[6]=(d*R-b*O+m*E)*S,t[7]=(b*A-v*R-m*P)*S,t[8]=(v*O-d*A+m*p)*S,t},n.projection=function(t,n,r){return t[0]=2/n,t[1]=0,t[2]=0,t[3]=0,t[4]=-2/r,t[5]=0,t[6]=-1,t[7]=1,t[8]=1,t},n.str=function(t){return"mat3("+t[0]+", "+t[1]+", "+t[2]+", "+t[3]+", "+t[4]+", "+t[5]+", "+t[6]+", "+t[7]+", "+t[8]+")"},n.frob=function(t){return Math.sqrt(Math.pow(t[0],2)+Math.pow(t[1],2)+Math.pow(t[2],2)+Math.pow(t[3],2)+Math.pow(t[4],2)+Math.pow(t[5],2)+Math.pow(t[6],2)+Math.pow(t[7],2)+Math.pow(t[8],2))},n.add=function(t,n,r){return t[0]=n[0]+r[0],t[1]=n[1]+r[1],t[2]=n[2]+r[2],t[3]=n[3]+r[3],t[4]=n[4]+r[4],t[5]=n[5]+r[5],t[6]=n[6]+r[6],t[7]=n[7]+r[7],t[8]=n[8]+r[8],t},n.subtract=u,n.multiplyScalar=function(t,n,r){return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=n[3]*r,t[4]=n[4]*r,t[5]=n[5]*r,t[6]=n[6]*r,t[7]=n[7]*r,t[8]=n[8]*r,t},n.multiplyScalarAndAdd=function(t,n,r,a){return t[0]=n[0]+r[0]*a,t[1]=n[1]+r[1]*a,t[2]=n[2]+r[2]*a,t[3]=n[3]+r[3]*a,t[4]=n[4]+r[4]*a,t[5]=n[5]+r[5]*a,t[6]=n[6]+r[6]*a,t[7]=n[7]+r[7]*a,t[8]=n[8]+r[8]*a,t},n.exactEquals=function(t,n){return t[0]===n[0]&&t[1]===n[1]&&t[2]===n[2]&&t[3]===n[3]&&t[4]===n[4]&&t[5]===n[5]&&t[6]===n[6]&&t[7]===n[7]&&t[8]===n[8]},n.equals=function(t,n){var r=t[0],e=t[1],u=t[2],o=t[3],i=t[4],s=t[5],c=t[6],f=t[7],M=t[8],h=n[0],l=n[1],v=n[2],d=n[3],b=n[4],m=n[5],p=n[6],P=n[7],A=n[8];return Math.abs(r-h)<=a.EPSILON*Math.max(1,Math.abs(r),Math.abs(h))&&Math.abs(e-l)<=a.EPSILON*Math.max(1,Math.abs(e),Math.abs(l))&&Math.abs(u-v)<=a.EPSILON*Math.max(1,Math.abs(u),Math.abs(v))&&Math.abs(o-d)<=a.EPSILON*Math.max(1,Math.abs(o),Math.abs(d))&&Math.abs(i-b)<=a.EPSILON*Math.max(1,Math.abs(i),Math.abs(b))&&Math.abs(s-m)<=a.EPSILON*Math.max(1,Math.abs(s),Math.abs(m))&&Math.abs(c-p)<=a.EPSILON*Math.max(1,Math.abs(c),Math.abs(p))&&Math.abs(f-P)<=a.EPSILON*Math.max(1,Math.abs(f),Math.abs(P))&&Math.abs(M-A)<=a.EPSILON*Math.max(1,Math.abs(M),Math.abs(A))};var a=function(t){if(t&&t.__esModule)return t;var n={};if(null!=t)for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&(n[r]=t[r]);return n.default=t,n}(r(0));function e(t,n,r){var a=n[0],e=n[1],u=n[2],o=n[3],i=n[4],s=n[5],c=n[6],f=n[7],M=n[8],h=r[0],l=r[1],v=r[2],d=r[3],b=r[4],m=r[5],p=r[6],P=r[7],A=r[8];return t[0]=h*a+l*o+v*c,t[1]=h*e+l*i+v*f,t[2]=h*u+l*s+v*M,t[3]=d*a+b*o+m*c,t[4]=d*e+b*i+m*f,t[5]=d*u+b*s+m*M,t[6]=p*a+P*o+A*c,t[7]=p*e+P*i+A*f,t[8]=p*u+P*s+A*M,t}function u(t,n,r){return t[0]=n[0]-r[0],t[1]=n[1]-r[1],t[2]=n[2]-r[2],t[3]=n[3]-r[3],t[4]=n[4]-r[4],t[5]=n[5]-r[5],t[6]=n[6]-r[6],t[7]=n[7]-r[7],t[8]=n[8]-r[8],t}n.mul=e,n.sub=u},function(t,n,r){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.forEach=n.sqrLen=n.sqrDist=n.dist=n.div=n.mul=n.sub=n.len=void 0,n.create=e,n.clone=function(t){var n=new a.ARRAY_TYPE(2);return n[0]=t[0],n[1]=t[1],n},n.fromValues=function(t,n){var r=new a.ARRAY_TYPE(2);return r[0]=t,r[1]=n,r},n.copy=function(t,n){return t[0]=n[0],t[1]=n[1],t},n.set=function(t,n,r){return t[0]=n,t[1]=r,t},n.add=function(t,n,r){return t[0]=n[0]+r[0],t[1]=n[1]+r[1],t},n.subtract=u,n.multiply=o,n.divide=i,n.ceil=function(t,n){return t[0]=Math.ceil(n[0]),t[1]=Math.ceil(n[1]),t},n.floor=function(t,n){return t[0]=Math.floor(n[0]),t[1]=Math.floor(n[1]),t},n.min=function(t,n,r){return t[0]=Math.min(n[0],r[0]),t[1]=Math.min(n[1],r[1]),t},n.max=function(t,n,r){return t[0]=Math.max(n[0],r[0]),t[1]=Math.max(n[1],r[1]),t},n.round=function(t,n){return t[0]=Math.round(n[0]),t[1]=Math.round(n[1]),t},n.scale=function(t,n,r){return t[0]=n[0]*r,t[1]=n[1]*r,t},n.scaleAndAdd=function(t,n,r,a){return t[0]=n[0]+r[0]*a,t[1]=n[1]+r[1]*a,t},n.distance=s,n.squaredDistance=c,n.length=f,n.squaredLength=M,n.negate=function(t,n){return t[0]=-n[0],t[1]=-n[1],t},n.inverse=function(t,n){return t[0]=1/n[0],t[1]=1/n[1],t},n.normalize=function(t,n){var r=n[0],a=n[1],e=r*r+a*a;e>0&&(e=1/Math.sqrt(e),t[0]=n[0]*e,t[1]=n[1]*e);return t},n.dot=function(t,n){return t[0]*n[0]+t[1]*n[1]},n.cross=function(t,n,r){var a=n[0]*r[1]-n[1]*r[0];return t[0]=t[1]=0,t[2]=a,t},n.lerp=function(t,n,r,a){var e=n[0],u=n[1];return t[0]=e+a*(r[0]-e),t[1]=u+a*(r[1]-u),t},n.random=function(t,n){n=n||1;var r=2*a.RANDOM()*Math.PI;return t[0]=Math.cos(r)*n,t[1]=Math.sin(r)*n,t},n.transformMat2=function(t,n,r){var a=n[0],e=n[1];return t[0]=r[0]*a+r[2]*e,t[1]=r[1]*a+r[3]*e,t},n.transformMat2d=function(t,n,r){var a=n[0],e=n[1];return t[0]=r[0]*a+r[2]*e+r[4],t[1]=r[1]*a+r[3]*e+r[5],t},n.transformMat3=function(t,n,r){var a=n[0],e=n[1];return t[0]=r[0]*a+r[3]*e+r[6],t[1]=r[1]*a+r[4]*e+r[7],t},n.transformMat4=function(t,n,r){var a=n[0],e=n[1];return t[0]=r[0]*a+r[4]*e+r[12],t[1]=r[1]*a+r[5]*e+r[13],t},n.rotate=function(t,n,r,a){var e=n[0]-r[0],u=n[1]-r[1],o=Math.sin(a),i=Math.cos(a);return t[0]=e*i-u*o+r[0],t[1]=e*o+u*i+r[1],t},n.angle=function(t,n){var r=t[0],a=t[1],e=n[0],u=n[1],o=r*r+a*a;o>0&&(o=1/Math.sqrt(o));var i=e*e+u*u;i>0&&(i=1/Math.sqrt(i));var s=(r*e+a*u)*o*i;return s>1?0:s<-1?Math.PI:Math.acos(s)},n.str=function(t){return"vec2("+t[0]+", "+t[1]+")"},n.exactEquals=function(t,n){return t[0]===n[0]&&t[1]===n[1]},n.equals=function(t,n){var r=t[0],e=t[1],u=n[0],o=n[1];return Math.abs(r-u)<=a.EPSILON*Math.max(1,Math.abs(r),Math.abs(u))&&Math.abs(e-o)<=a.EPSILON*Math.max(1,Math.abs(e),Math.abs(o))};var a=function(t){if(t&&t.__esModule)return t;var n={};if(null!=t)for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&(n[r]=t[r]);return n.default=t,n}(r(0));function e(){var t=new a.ARRAY_TYPE(2);return a.ARRAY_TYPE!=Float32Array&&(t[0]=0,t[1]=0),t}function u(t,n,r){return t[0]=n[0]-r[0],t[1]=n[1]-r[1],t}function o(t,n,r){return t[0]=n[0]*r[0],t[1]=n[1]*r[1],t}function i(t,n,r){return t[0]=n[0]/r[0],t[1]=n[1]/r[1],t}function s(t,n){var r=n[0]-t[0],a=n[1]-t[1];return Math.sqrt(r*r+a*a)}function c(t,n){var r=n[0]-t[0],a=n[1]-t[1];return r*r+a*a}function f(t){var n=t[0],r=t[1];return Math.sqrt(n*n+r*r)}function M(t){var n=t[0],r=t[1];return n*n+r*r}n.len=f,n.sub=u,n.mul=o,n.div=i,n.dist=s,n.sqrDist=c,n.sqrLen=M,n.forEach=function(){var t=e();return function(n,r,a,e,u,o){var i=void 0,s=void 0;for(r||(r=2),a||(a=0),s=e?Math.min(e*r+a,n.length):n.length,i=a;i<s;i+=r)t[0]=n[i],t[1]=n[i+1],u(t,t,o),n[i]=t[0],n[i+1]=t[1];return n}}()},function(t,n,r){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.sqrLen=n.squaredLength=n.len=n.length=n.dot=n.mul=n.setReal=n.getReal=void 0,n.create=function(){var t=new a.ARRAY_TYPE(8);a.ARRAY_TYPE!=Float32Array&&(t[0]=0,t[1]=0,t[2]=0,t[4]=0,t[5]=0,t[6]=0,t[7]=0);return t[3]=1,t},n.clone=function(t){var n=new a.ARRAY_TYPE(8);return n[0]=t[0],n[1]=t[1],n[2]=t[2],n[3]=t[3],n[4]=t[4],n[5]=t[5],n[6]=t[6],n[7]=t[7],n},n.fromValues=function(t,n,r,e,u,o,i,s){var c=new a.ARRAY_TYPE(8);return c[0]=t,c[1]=n,c[2]=r,c[3]=e,c[4]=u,c[5]=o,c[6]=i,c[7]=s,c},n.fromRotationTranslationValues=function(t,n,r,e,u,o,i){var s=new a.ARRAY_TYPE(8);s[0]=t,s[1]=n,s[2]=r,s[3]=e;var c=.5*u,f=.5*o,M=.5*i;return s[4]=c*e+f*r-M*n,s[5]=f*e+M*t-c*r,s[6]=M*e+c*n-f*t,s[7]=-c*t-f*n-M*r,s},n.fromRotationTranslation=i,n.fromTranslation=function(t,n){return t[0]=0,t[1]=0,t[2]=0,t[3]=1,t[4]=.5*n[0],t[5]=.5*n[1],t[6]=.5*n[2],t[7]=0,t},n.fromRotation=function(t,n){return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=0,t[5]=0,t[6]=0,t[7]=0,t},n.fromMat4=function(t,n){var r=e.create();u.getRotation(r,n);var o=new a.ARRAY_TYPE(3);return u.getTranslation(o,n),i(t,r,o),t},n.copy=s,n.identity=function(t){return t[0]=0,t[1]=0,t[2]=0,t[3]=1,t[4]=0,t[5]=0,t[6]=0,t[7]=0,t},n.set=function(t,n,r,a,e,u,o,i,s){return t[0]=n,t[1]=r,t[2]=a,t[3]=e,t[4]=u,t[5]=o,t[6]=i,t[7]=s,t},n.getDual=function(t,n){return t[0]=n[4],t[1]=n[5],t[2]=n[6],t[3]=n[7],t},n.setDual=function(t,n){return t[4]=n[0],t[5]=n[1],t[6]=n[2],t[7]=n[3],t},n.getTranslation=function(t,n){var r=n[4],a=n[5],e=n[6],u=n[7],o=-n[0],i=-n[1],s=-n[2],c=n[3];return t[0]=2*(r*c+u*o+a*s-e*i),t[1]=2*(a*c+u*i+e*o-r*s),t[2]=2*(e*c+u*s+r*i-a*o),t},n.translate=function(t,n,r){var a=n[0],e=n[1],u=n[2],o=n[3],i=.5*r[0],s=.5*r[1],c=.5*r[2],f=n[4],M=n[5],h=n[6],l=n[7];return t[0]=a,t[1]=e,t[2]=u,t[3]=o,t[4]=o*i+e*c-u*s+f,t[5]=o*s+u*i-a*c+M,t[6]=o*c+a*s-e*i+h,t[7]=-a*i-e*s-u*c+l,t},n.rotateX=function(t,n,r){var a=-n[0],u=-n[1],o=-n[2],i=n[3],s=n[4],c=n[5],f=n[6],M=n[7],h=s*i+M*a+c*o-f*u,l=c*i+M*u+f*a-s*o,v=f*i+M*o+s*u-c*a,d=M*i-s*a-c*u-f*o;return e.rotateX(t,n,r),a=t[0],u=t[1],o=t[2],i=t[3],t[4]=h*i+d*a+l*o-v*u,t[5]=l*i+d*u+v*a-h*o,t[6]=v*i+d*o+h*u-l*a,t[7]=d*i-h*a-l*u-v*o,t},n.rotateY=function(t,n,r){var a=-n[0],u=-n[1],o=-n[2],i=n[3],s=n[4],c=n[5],f=n[6],M=n[7],h=s*i+M*a+c*o-f*u,l=c*i+M*u+f*a-s*o,v=f*i+M*o+s*u-c*a,d=M*i-s*a-c*u-f*o;return e.rotateY(t,n,r),a=t[0],u=t[1],o=t[2],i=t[3],t[4]=h*i+d*a+l*o-v*u,t[5]=l*i+d*u+v*a-h*o,t[6]=v*i+d*o+h*u-l*a,t[7]=d*i-h*a-l*u-v*o,t},n.rotateZ=function(t,n,r){var a=-n[0],u=-n[1],o=-n[2],i=n[3],s=n[4],c=n[5],f=n[6],M=n[7],h=s*i+M*a+c*o-f*u,l=c*i+M*u+f*a-s*o,v=f*i+M*o+s*u-c*a,d=M*i-s*a-c*u-f*o;return e.rotateZ(t,n,r),a=t[0],u=t[1],o=t[2],i=t[3],t[4]=h*i+d*a+l*o-v*u,t[5]=l*i+d*u+v*a-h*o,t[6]=v*i+d*o+h*u-l*a,t[7]=d*i-h*a-l*u-v*o,t},n.rotateByQuatAppend=function(t,n,r){var a=r[0],e=r[1],u=r[2],o=r[3],i=n[0],s=n[1],c=n[2],f=n[3];return t[0]=i*o+f*a+s*u-c*e,t[1]=s*o+f*e+c*a-i*u,t[2]=c*o+f*u+i*e-s*a,t[3]=f*o-i*a-s*e-c*u,i=n[4],s=n[5],c=n[6],f=n[7],t[4]=i*o+f*a+s*u-c*e,t[5]=s*o+f*e+c*a-i*u,t[6]=c*o+f*u+i*e-s*a,t[7]=f*o-i*a-s*e-c*u,t},n.rotateByQuatPrepend=function(t,n,r){var a=n[0],e=n[1],u=n[2],o=n[3],i=r[0],s=r[1],c=r[2],f=r[3];return t[0]=a*f+o*i+e*c-u*s,t[1]=e*f+o*s+u*i-a*c,t[2]=u*f+o*c+a*s-e*i,t[3]=o*f-a*i-e*s-u*c,i=r[4],s=r[5],c=r[6],f=r[7],t[4]=a*f+o*i+e*c-u*s,t[5]=e*f+o*s+u*i-a*c,t[6]=u*f+o*c+a*s-e*i,t[7]=o*f-a*i-e*s-u*c,t},n.rotateAroundAxis=function(t,n,r,e){if(Math.abs(e)<a.EPSILON)return s(t,n);var u=Math.sqrt(r[0]*r[0]+r[1]*r[1]+r[2]*r[2]);e*=.5;var o=Math.sin(e),i=o*r[0]/u,c=o*r[1]/u,f=o*r[2]/u,M=Math.cos(e),h=n[0],l=n[1],v=n[2],d=n[3];t[0]=h*M+d*i+l*f-v*c,t[1]=l*M+d*c+v*i-h*f,t[2]=v*M+d*f+h*c-l*i,t[3]=d*M-h*i-l*c-v*f;var b=n[4],m=n[5],p=n[6],P=n[7];return t[4]=b*M+P*i+m*f-p*c,t[5]=m*M+P*c+p*i-b*f,t[6]=p*M+P*f+b*c-m*i,t[7]=P*M-b*i-m*c-p*f,t},n.add=function(t,n,r){return t[0]=n[0]+r[0],t[1]=n[1]+r[1],t[2]=n[2]+r[2],t[3]=n[3]+r[3],t[4]=n[4]+r[4],t[5]=n[5]+r[5],t[6]=n[6]+r[6],t[7]=n[7]+r[7],t},n.multiply=c,n.scale=function(t,n,r){return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=n[3]*r,t[4]=n[4]*r,t[5]=n[5]*r,t[6]=n[6]*r,t[7]=n[7]*r,t},n.lerp=function(t,n,r,a){var e=1-a;f(n,r)<0&&(a=-a);return t[0]=n[0]*e+r[0]*a,t[1]=n[1]*e+r[1]*a,t[2]=n[2]*e+r[2]*a,t[3]=n[3]*e+r[3]*a,t[4]=n[4]*e+r[4]*a,t[5]=n[5]*e+r[5]*a,t[6]=n[6]*e+r[6]*a,t[7]=n[7]*e+r[7]*a,t},n.invert=function(t,n){var r=h(n);return t[0]=-n[0]/r,t[1]=-n[1]/r,t[2]=-n[2]/r,t[3]=n[3]/r,t[4]=-n[4]/r,t[5]=-n[5]/r,t[6]=-n[6]/r,t[7]=n[7]/r,t},n.conjugate=function(t,n){return t[0]=-n[0],t[1]=-n[1],t[2]=-n[2],t[3]=n[3],t[4]=-n[4],t[5]=-n[5],t[6]=-n[6],t[7]=n[7],t},n.normalize=function(t,n){var r=h(n);if(r>0){r=Math.sqrt(r);var a=n[0]/r,e=n[1]/r,u=n[2]/r,o=n[3]/r,i=n[4],s=n[5],c=n[6],f=n[7],M=a*i+e*s+u*c+o*f;t[0]=a,t[1]=e,t[2]=u,t[3]=o,t[4]=(i-a*M)/r,t[5]=(s-e*M)/r,t[6]=(c-u*M)/r,t[7]=(f-o*M)/r}return t},n.str=function(t){return"quat2("+t[0]+", "+t[1]+", "+t[2]+", "+t[3]+", "+t[4]+", "+t[5]+", "+t[6]+", "+t[7]+")"},n.exactEquals=function(t,n){return t[0]===n[0]&&t[1]===n[1]&&t[2]===n[2]&&t[3]===n[3]&&t[4]===n[4]&&t[5]===n[5]&&t[6]===n[6]&&t[7]===n[7]},n.equals=function(t,n){var r=t[0],e=t[1],u=t[2],o=t[3],i=t[4],s=t[5],c=t[6],f=t[7],M=n[0],h=n[1],l=n[2],v=n[3],d=n[4],b=n[5],m=n[6],p=n[7];return Math.abs(r-M)<=a.EPSILON*Math.max(1,Math.abs(r),Math.abs(M))&&Math.abs(e-h)<=a.EPSILON*Math.max(1,Math.abs(e),Math.abs(h))&&Math.abs(u-l)<=a.EPSILON*Math.max(1,Math.abs(u),Math.abs(l))&&Math.abs(o-v)<=a.EPSILON*Math.max(1,Math.abs(o),Math.abs(v))&&Math.abs(i-d)<=a.EPSILON*Math.max(1,Math.abs(i),Math.abs(d))&&Math.abs(s-b)<=a.EPSILON*Math.max(1,Math.abs(s),Math.abs(b))&&Math.abs(c-m)<=a.EPSILON*Math.max(1,Math.abs(c),Math.abs(m))&&Math.abs(f-p)<=a.EPSILON*Math.max(1,Math.abs(f),Math.abs(p))};var a=o(r(0)),e=o(r(3)),u=o(r(4));function o(t){if(t&&t.__esModule)return t;var n={};if(null!=t)for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&(n[r]=t[r]);return n.default=t,n}function i(t,n,r){var a=.5*r[0],e=.5*r[1],u=.5*r[2],o=n[0],i=n[1],s=n[2],c=n[3];return t[0]=o,t[1]=i,t[2]=s,t[3]=c,t[4]=a*c+e*s-u*i,t[5]=e*c+u*o-a*s,t[6]=u*c+a*i-e*o,t[7]=-a*o-e*i-u*s,t}function s(t,n){return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t}n.getReal=e.copy;n.setReal=e.copy;function c(t,n,r){var a=n[0],e=n[1],u=n[2],o=n[3],i=r[4],s=r[5],c=r[6],f=r[7],M=n[4],h=n[5],l=n[6],v=n[7],d=r[0],b=r[1],m=r[2],p=r[3];return t[0]=a*p+o*d+e*m-u*b,t[1]=e*p+o*b+u*d-a*m,t[2]=u*p+o*m+a*b-e*d,t[3]=o*p-a*d-e*b-u*m,t[4]=a*f+o*i+e*c-u*s+M*p+v*d+h*m-l*b,t[5]=e*f+o*s+u*i-a*c+h*p+v*b+l*d-M*m,t[6]=u*f+o*c+a*s-e*i+l*p+v*m+M*b-h*d,t[7]=o*f-a*i-e*s-u*c+v*p-M*d-h*b-l*m,t}n.mul=c;var f=n.dot=e.dot;var M=n.length=e.length,h=(n.len=M,n.squaredLength=e.squaredLength);n.sqrLen=h},function(t,n,r){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.sub=n.mul=void 0,n.create=function(){var t=new a.ARRAY_TYPE(6);a.ARRAY_TYPE!=Float32Array&&(t[1]=0,t[2]=0,t[4]=0,t[5]=0);return t[0]=1,t[3]=1,t},n.clone=function(t){var n=new a.ARRAY_TYPE(6);return n[0]=t[0],n[1]=t[1],n[2]=t[2],n[3]=t[3],n[4]=t[4],n[5]=t[5],n},n.copy=function(t,n){return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t},n.identity=function(t){return t[0]=1,t[1]=0,t[2]=0,t[3]=1,t[4]=0,t[5]=0,t},n.fromValues=function(t,n,r,e,u,o){var i=new a.ARRAY_TYPE(6);return i[0]=t,i[1]=n,i[2]=r,i[3]=e,i[4]=u,i[5]=o,i},n.set=function(t,n,r,a,e,u,o){return t[0]=n,t[1]=r,t[2]=a,t[3]=e,t[4]=u,t[5]=o,t},n.invert=function(t,n){var r=n[0],a=n[1],e=n[2],u=n[3],o=n[4],i=n[5],s=r*u-a*e;if(!s)return null;return s=1/s,t[0]=u*s,t[1]=-a*s,t[2]=-e*s,t[3]=r*s,t[4]=(e*i-u*o)*s,t[5]=(a*o-r*i)*s,t},n.determinant=function(t){return t[0]*t[3]-t[1]*t[2]},n.multiply=e,n.rotate=function(t,n,r){var a=n[0],e=n[1],u=n[2],o=n[3],i=n[4],s=n[5],c=Math.sin(r),f=Math.cos(r);return t[0]=a*f+u*c,t[1]=e*f+o*c,t[2]=a*-c+u*f,t[3]=e*-c+o*f,t[4]=i,t[5]=s,t},n.scale=function(t,n,r){var a=n[0],e=n[1],u=n[2],o=n[3],i=n[4],s=n[5],c=r[0],f=r[1];return t[0]=a*c,t[1]=e*c,t[2]=u*f,t[3]=o*f,t[4]=i,t[5]=s,t},n.translate=function(t,n,r){var a=n[0],e=n[1],u=n[2],o=n[3],i=n[4],s=n[5],c=r[0],f=r[1];return t[0]=a,t[1]=e,t[2]=u,t[3]=o,t[4]=a*c+u*f+i,t[5]=e*c+o*f+s,t},n.fromRotation=function(t,n){var r=Math.sin(n),a=Math.cos(n);return t[0]=a,t[1]=r,t[2]=-r,t[3]=a,t[4]=0,t[5]=0,t},n.fromScaling=function(t,n){return t[0]=n[0],t[1]=0,t[2]=0,t[3]=n[1],t[4]=0,t[5]=0,t},n.fromTranslation=function(t,n){return t[0]=1,t[1]=0,t[2]=0,t[3]=1,t[4]=n[0],t[5]=n[1],t},n.str=function(t){return"mat2d("+t[0]+", "+t[1]+", "+t[2]+", "+t[3]+", "+t[4]+", "+t[5]+")"},n.frob=function(t){return Math.sqrt(Math.pow(t[0],2)+Math.pow(t[1],2)+Math.pow(t[2],2)+Math.pow(t[3],2)+Math.pow(t[4],2)+Math.pow(t[5],2)+1)},n.add=function(t,n,r){return t[0]=n[0]+r[0],t[1]=n[1]+r[1],t[2]=n[2]+r[2],t[3]=n[3]+r[3],t[4]=n[4]+r[4],t[5]=n[5]+r[5],t},n.subtract=u,n.multiplyScalar=function(t,n,r){return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=n[3]*r,t[4]=n[4]*r,t[5]=n[5]*r,t},n.multiplyScalarAndAdd=function(t,n,r,a){return t[0]=n[0]+r[0]*a,t[1]=n[1]+r[1]*a,t[2]=n[2]+r[2]*a,t[3]=n[3]+r[3]*a,t[4]=n[4]+r[4]*a,t[5]=n[5]+r[5]*a,t},n.exactEquals=function(t,n){return t[0]===n[0]&&t[1]===n[1]&&t[2]===n[2]&&t[3]===n[3]&&t[4]===n[4]&&t[5]===n[5]},n.equals=function(t,n){var r=t[0],e=t[1],u=t[2],o=t[3],i=t[4],s=t[5],c=n[0],f=n[1],M=n[2],h=n[3],l=n[4],v=n[5];return Math.abs(r-c)<=a.EPSILON*Math.max(1,Math.abs(r),Math.abs(c))&&Math.abs(e-f)<=a.EPSILON*Math.max(1,Math.abs(e),Math.abs(f))&&Math.abs(u-M)<=a.EPSILON*Math.max(1,Math.abs(u),Math.abs(M))&&Math.abs(o-h)<=a.EPSILON*Math.max(1,Math.abs(o),Math.abs(h))&&Math.abs(i-l)<=a.EPSILON*Math.max(1,Math.abs(i),Math.abs(l))&&Math.abs(s-v)<=a.EPSILON*Math.max(1,Math.abs(s),Math.abs(v))};var a=function(t){if(t&&t.__esModule)return t;var n={};if(null!=t)for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&(n[r]=t[r]);return n.default=t,n}(r(0));function e(t,n,r){var a=n[0],e=n[1],u=n[2],o=n[3],i=n[4],s=n[5],c=r[0],f=r[1],M=r[2],h=r[3],l=r[4],v=r[5];return t[0]=a*c+u*f,t[1]=e*c+o*f,t[2]=a*M+u*h,t[3]=e*M+o*h,t[4]=a*l+u*v+i,t[5]=e*l+o*v+s,t}function u(t,n,r){return t[0]=n[0]-r[0],t[1]=n[1]-r[1],t[2]=n[2]-r[2],t[3]=n[3]-r[3],t[4]=n[4]-r[4],t[5]=n[5]-r[5],t}n.mul=e,n.sub=u},function(t,n,r){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.sub=n.mul=void 0,n.create=function(){var t=new a.ARRAY_TYPE(4);a.ARRAY_TYPE!=Float32Array&&(t[1]=0,t[2]=0);return t[0]=1,t[3]=1,t},n.clone=function(t){var n=new a.ARRAY_TYPE(4);return n[0]=t[0],n[1]=t[1],n[2]=t[2],n[3]=t[3],n},n.copy=function(t,n){return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t},n.identity=function(t){return t[0]=1,t[1]=0,t[2]=0,t[3]=1,t},n.fromValues=function(t,n,r,e){var u=new a.ARRAY_TYPE(4);return u[0]=t,u[1]=n,u[2]=r,u[3]=e,u},n.set=function(t,n,r,a,e){return t[0]=n,t[1]=r,t[2]=a,t[3]=e,t},n.transpose=function(t,n){if(t===n){var r=n[1];t[1]=n[2],t[2]=r}else t[0]=n[0],t[1]=n[2],t[2]=n[1],t[3]=n[3];return t},n.invert=function(t,n){var r=n[0],a=n[1],e=n[2],u=n[3],o=r*u-e*a;if(!o)return null;return o=1/o,t[0]=u*o,t[1]=-a*o,t[2]=-e*o,t[3]=r*o,t},n.adjoint=function(t,n){var r=n[0];return t[0]=n[3],t[1]=-n[1],t[2]=-n[2],t[3]=r,t},n.determinant=function(t){return t[0]*t[3]-t[2]*t[1]},n.multiply=e,n.rotate=function(t,n,r){var a=n[0],e=n[1],u=n[2],o=n[3],i=Math.sin(r),s=Math.cos(r);return t[0]=a*s+u*i,t[1]=e*s+o*i,t[2]=a*-i+u*s,t[3]=e*-i+o*s,t},n.scale=function(t,n,r){var a=n[0],e=n[1],u=n[2],o=n[3],i=r[0],s=r[1];return t[0]=a*i,t[1]=e*i,t[2]=u*s,t[3]=o*s,t},n.fromRotation=function(t,n){var r=Math.sin(n),a=Math.cos(n);return t[0]=a,t[1]=r,t[2]=-r,t[3]=a,t},n.fromScaling=function(t,n){return t[0]=n[0],t[1]=0,t[2]=0,t[3]=n[1],t},n.str=function(t){return"mat2("+t[0]+", "+t[1]+", "+t[2]+", "+t[3]+")"},n.frob=function(t){return Math.sqrt(Math.pow(t[0],2)+Math.pow(t[1],2)+Math.pow(t[2],2)+Math.pow(t[3],2))},n.LDU=function(t,n,r,a){return t[2]=a[2]/a[0],r[0]=a[0],r[1]=a[1],r[3]=a[3]-t[2]*r[1],[t,n,r]},n.add=function(t,n,r){return t[0]=n[0]+r[0],t[1]=n[1]+r[1],t[2]=n[2]+r[2],t[3]=n[3]+r[3],t},n.subtract=u,n.exactEquals=function(t,n){return t[0]===n[0]&&t[1]===n[1]&&t[2]===n[2]&&t[3]===n[3]},n.equals=function(t,n){var r=t[0],e=t[1],u=t[2],o=t[3],i=n[0],s=n[1],c=n[2],f=n[3];return Math.abs(r-i)<=a.EPSILON*Math.max(1,Math.abs(r),Math.abs(i))&&Math.abs(e-s)<=a.EPSILON*Math.max(1,Math.abs(e),Math.abs(s))&&Math.abs(u-c)<=a.EPSILON*Math.max(1,Math.abs(u),Math.abs(c))&&Math.abs(o-f)<=a.EPSILON*Math.max(1,Math.abs(o),Math.abs(f))},n.multiplyScalar=function(t,n,r){return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=n[3]*r,t},n.multiplyScalarAndAdd=function(t,n,r,a){return t[0]=n[0]+r[0]*a,t[1]=n[1]+r[1]*a,t[2]=n[2]+r[2]*a,t[3]=n[3]+r[3]*a,t};var a=function(t){if(t&&t.__esModule)return t;var n={};if(null!=t)for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&(n[r]=t[r]);return n.default=t,n}(r(0));function e(t,n,r){var a=n[0],e=n[1],u=n[2],o=n[3],i=r[0],s=r[1],c=r[2],f=r[3];return t[0]=a*i+u*s,t[1]=e*i+o*s,t[2]=a*c+u*f,t[3]=e*c+o*f,t}function u(t,n,r){return t[0]=n[0]-r[0],t[1]=n[1]-r[1],t[2]=n[2]-r[2],t[3]=n[3]-r[3],t}n.mul=e,n.sub=u},function(t,n,r){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.vec4=n.vec3=n.vec2=n.quat2=n.quat=n.mat4=n.mat3=n.mat2d=n.mat2=n.glMatrix=void 0;var a=l(r(0)),e=l(r(9)),u=l(r(8)),o=l(r(5)),i=l(r(4)),s=l(r(3)),c=l(r(7)),f=l(r(6)),M=l(r(2)),h=l(r(1));function l(t){if(t&&t.__esModule)return t;var n={};if(null!=t)for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&(n[r]=t[r]);return n.default=t,n}n.glMatrix=a,n.mat2=e,n.mat2d=u,n.mat3=o,n.mat4=i,n.quat=s,n.quat2=c,n.vec2=f,n.vec3=M,n.vec4=h}])});
},{}],10:[function(require,module,exports){
(function (process){
// Generated by CoffeeScript 1.12.2
(function() {
  var getNanoSeconds, hrtime, loadTime, moduleLoadTime, nodeLoadTime, upTime;

  if ((typeof performance !== "undefined" && performance !== null) && performance.now) {
    module.exports = function() {
      return performance.now();
    };
  } else if ((typeof process !== "undefined" && process !== null) && process.hrtime) {
    module.exports = function() {
      return (getNanoSeconds() - nodeLoadTime) / 1e6;
    };
    hrtime = process.hrtime;
    getNanoSeconds = function() {
      var hr;
      hr = hrtime();
      return hr[0] * 1e9 + hr[1];
    };
    moduleLoadTime = getNanoSeconds();
    upTime = process.uptime() * 1e9;
    nodeLoadTime = moduleLoadTime - upTime;
  } else if (Date.now) {
    module.exports = function() {
      return Date.now() - loadTime;
    };
    loadTime = Date.now();
  } else {
    module.exports = function() {
      return new Date().getTime() - loadTime;
    };
    loadTime = new Date().getTime();
  }

}).call(this);



}).call(this,require('_process'))
},{"_process":11}],11:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],12:[function(require,module,exports){
(function (global){
var now = require('performance-now')
  , root = typeof window === 'undefined' ? global : window
  , vendors = ['moz', 'webkit']
  , suffix = 'AnimationFrame'
  , raf = root['request' + suffix]
  , caf = root['cancel' + suffix] || root['cancelRequest' + suffix]

for(var i = 0; !raf && i < vendors.length; i++) {
  raf = root[vendors[i] + 'Request' + suffix]
  caf = root[vendors[i] + 'Cancel' + suffix]
      || root[vendors[i] + 'CancelRequest' + suffix]
}

// Some versions of FF have rAF but not cAF
if(!raf || !caf) {
  var last = 0
    , id = 0
    , queue = []
    , frameDuration = 1000 / 60

  raf = function(callback) {
    if(queue.length === 0) {
      var _now = now()
        , next = Math.max(0, frameDuration - (_now - last))
      last = next + _now
      setTimeout(function() {
        var cp = queue.slice(0)
        // Clear queue here to prevent
        // callbacks from appending listeners
        // to the current frame's queue
        queue.length = 0
        for(var i = 0; i < cp.length; i++) {
          if(!cp[i].cancelled) {
            try{
              cp[i].callback(last)
            } catch(e) {
              setTimeout(function() { throw e }, 0)
            }
          }
        }
      }, Math.round(next))
    }
    queue.push({
      handle: ++id,
      callback: callback,
      cancelled: false
    })
    return id
  }

  caf = function(handle) {
    for(var i = 0; i < queue.length; i++) {
      if(queue[i].handle === handle) {
        queue[i].cancelled = true
      }
    }
  }
}

module.exports = function(fn) {
  // Wrap in a new function to prevent
  // `cancel` potentially being assigned
  // to the native rAF function
  return raf.call(root, fn)
}
module.exports.cancel = function() {
  caf.apply(root, arguments)
}
module.exports.polyfill = function(object) {
  if (!object) {
    object = root;
  }
  object.requestAnimationFrame = raf
  object.cancelAnimationFrame = caf
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"performance-now":10}],13:[function(require,module,exports){
/**
 * @author mrdoob / http://mrdoob.com/
 */

var Stats = function () {

	var startTime = Date.now(), prevTime = startTime;
	var ms = 0, msMin = Infinity, msMax = 0;
	var fps = 0, fpsMin = Infinity, fpsMax = 0;
	var frames = 0, mode = 0;

	var container = document.createElement( 'div' );
	container.id = 'stats';
	container.addEventListener( 'mousedown', function ( event ) { event.preventDefault(); setMode( ++ mode % 2 ) }, false );
	container.style.cssText = 'width:80px;opacity:0.9;cursor:pointer';

	var fpsDiv = document.createElement( 'div' );
	fpsDiv.id = 'fps';
	fpsDiv.style.cssText = 'padding:0 0 3px 3px;text-align:left;background-color:#002';
	container.appendChild( fpsDiv );

	var fpsText = document.createElement( 'div' );
	fpsText.id = 'fpsText';
	fpsText.style.cssText = 'color:#0ff;font-family:Helvetica,Arial,sans-serif;font-size:9px;font-weight:bold;line-height:15px';
	fpsText.innerHTML = 'FPS';
	fpsDiv.appendChild( fpsText );

	var fpsGraph = document.createElement( 'div' );
	fpsGraph.id = 'fpsGraph';
	fpsGraph.style.cssText = 'position:relative;width:74px;height:30px;background-color:#0ff';
	fpsDiv.appendChild( fpsGraph );

	while ( fpsGraph.children.length < 74 ) {

		var bar = document.createElement( 'span' );
		bar.style.cssText = 'width:1px;height:30px;float:left;background-color:#113';
		fpsGraph.appendChild( bar );

	}

	var msDiv = document.createElement( 'div' );
	msDiv.id = 'ms';
	msDiv.style.cssText = 'padding:0 0 3px 3px;text-align:left;background-color:#020;display:none';
	container.appendChild( msDiv );

	var msText = document.createElement( 'div' );
	msText.id = 'msText';
	msText.style.cssText = 'color:#0f0;font-family:Helvetica,Arial,sans-serif;font-size:9px;font-weight:bold;line-height:15px';
	msText.innerHTML = 'MS';
	msDiv.appendChild( msText );

	var msGraph = document.createElement( 'div' );
	msGraph.id = 'msGraph';
	msGraph.style.cssText = 'position:relative;width:74px;height:30px;background-color:#0f0';
	msDiv.appendChild( msGraph );

	while ( msGraph.children.length < 74 ) {

		var bar = document.createElement( 'span' );
		bar.style.cssText = 'width:1px;height:30px;float:left;background-color:#131';
		msGraph.appendChild( bar );

	}

	var setMode = function ( value ) {

		mode = value;

		switch ( mode ) {

			case 0:
				fpsDiv.style.display = 'block';
				msDiv.style.display = 'none';
				break;
			case 1:
				fpsDiv.style.display = 'none';
				msDiv.style.display = 'block';
				break;
		}

	};

	var updateGraph = function ( dom, value ) {

		var child = dom.appendChild( dom.firstChild );
		child.style.height = value + 'px';

	};

	return {

		REVISION: 12,

		domElement: container,

		setMode: setMode,

		begin: function () {

			startTime = Date.now();

		},

		end: function () {

			var time = Date.now();

			ms = time - startTime;
			msMin = Math.min( msMin, ms );
			msMax = Math.max( msMax, ms );

			msText.textContent = ms + ' MS (' + msMin + '-' + msMax + ')';
			updateGraph( msGraph, Math.min( 30, 30 - ( ms / 200 ) * 30 ) );

			frames ++;

			if ( time > prevTime + 1000 ) {

				fps = Math.round( ( frames * 1000 ) / ( time - prevTime ) );
				fpsMin = Math.min( fpsMin, fps );
				fpsMax = Math.max( fpsMax, fps );

				fpsText.textContent = fps + ' FPS (' + fpsMin + '-' + fpsMax + ')';
				updateGraph( fpsGraph, Math.min( 30, 30 - ( fps / 100 ) * 30 ) );

				prevTime = time;
				frames = 0;

			}

			return time;

		},

		update: function () {

			startTime = this.end();

		}

	}

};

if ( typeof module === 'object' ) {

	module.exports = Stats;

}
},{}],14:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _glMatrix = require('gl-matrix');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Camera = function () {
  function Camera(origin) {
    _classCallCheck(this, Camera);

    this.origin = origin;
    this.vAngle = Math.PI / 6;
    this.hAngle = Math.PI / 5;
    this.fov = Math.PI / 4;
    this.aspect = 16 / 9;
    this.dist = 2;
    this.curZoom = .7;
    this.minZoom = .3;
    this.maxZoom = 5;
    this.near = 0.01;
    this.far = 100;
    this.speed = Math.PI / 3000;

    this.eye = _glMatrix.vec3.create();
    this.position = _glMatrix.vec3.create();
    this.view = _glMatrix.mat4.create();
    this.proj = _glMatrix.mat4.create();
    this.matrix = _glMatrix.mat4.create();
    this.update();
  }

  _createClass(Camera, [{
    key: 'setAspect',
    value: function setAspect(aspect) {
      this.aspect = aspect;
      this.update();
    }
  }, {
    key: 'rotate',
    value: function rotate(dx, dy) {
      this.vAngle += dy * this.speed;
      this.hAngle -= dx * this.speed;
      this.update();
    }
  }, {
    key: 'zoom',
    value: function zoom(dw) {
      var newZoom = this.curZoom * (1 - dw * this.speed);
      this.curZoom = Math.max(this.minZoom, Math.min(newZoom, this.maxZoom));
      this.update();
    }
  }, {
    key: 'update',
    value: function update() {
      this.calcProj();
      this.calcView();
      _glMatrix.mat4.multiply(this.matrix, this.proj, this.view);
    }
  }, {
    key: 'calcProj',
    value: function calcProj() {
      _glMatrix.mat4.perspective(this.proj, this.fov / this.curZoom, this.aspect, this.near, this.far);
    }
  }, {
    key: 'calcView',
    value: function calcView() {
      var _ref = [Math.cos(this.vAngle), Math.sin(this.vAngle)],
          vCos = _ref[0],
          vSin = _ref[1];
      var _ref2 = [Math.cos(this.hAngle), Math.sin(this.hAngle)],
          hCos = _ref2[0],
          hSin = _ref2[1];


      var eye = _glMatrix.vec3.fromValues(vCos * hSin, vSin, vCos * hCos);
      var right = _glMatrix.vec3.fromValues(-hCos, 0, hSin);

      _glMatrix.vec3.negate(this.eye, eye);

      var up = _glMatrix.vec3.cross(right, right, eye);
      this.position = _glMatrix.vec3.add(eye, _glMatrix.vec3.scale(eye, eye, this.dist), this.origin);

      _glMatrix.mat4.lookAt(this.view, this.position, this.origin, up);
    }
  }]);

  return Camera;
}();

exports.default = Camera;

},{"gl-matrix":9}],15:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Sphere = exports.BBox = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _glMatrix = require('gl-matrix');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var BBox = exports.BBox = function BBox() {
  _classCallCheck(this, BBox);

  this.vertices = [0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0];

  this.normals = [0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0];

  this.texCoords = [0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1];

  this.faces = [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23];

  this.edges = [4, 7, 7, 6, 6, 5, 5, 4, 0, 1, 1, 2, 2, 3, 3, 0, 4, 0, 7, 1, 6, 2, 5, 3];
};

var Sphere = exports.Sphere = function () {
  function Sphere(center, radius, detail) {
    _classCallCheck(this, Sphere);

    (0, _assert2.default)(radius > 0);
    (0, _assert2.default)(detail >= 0);

    this.center = center;
    this.radius = radius;
    this.detail = detail;

    // First approximation is icosahedron.
    var phi = (1 + Math.sqrt(5)) / 2;
    var a = 1 / 2;
    var b = 1 / (2 * phi);

    this.vertices = [[0, b, -a], [b, a, 0], [-b, a, 0], [0, b, a], [0, -b, a], [-a, 0, b], [a, 0, b], [0, -b, -a], [a, 0, -b], [-a, 0, -b], [b, -a, 0], [-b, -a, 0]];

    this.faces = [1, 0, 2, 2, 3, 1, 4, 3, 5, 6, 3, 4, 7, 0, 8, 9, 0, 7, 10, 4, 11, 11, 7, 10, 5, 2, 9, 9, 11, 5, 8, 1, 6, 6, 10, 8, 5, 3, 2, 1, 3, 6, 2, 0, 9, 8, 0, 1, 9, 7, 11, 10, 7, 8, 11, 4, 5, 6, 4, 10];

    this.edges = [0, 1, 0, 2, 0, 7, 0, 8, 0, 9, 1, 2, 1, 3, 1, 6, 1, 8, 2, 3, 2, 5, 2, 9, 3, 4, 3, 5, 3, 6, 4, 5, 4, 6, 4, 10, 4, 11, 5, 9, 5, 11, 6, 8, 6, 10, 7, 8, 7, 9, 7, 10, 7, 11, 8, 10, 9, 11, 10, 11];

    for (var i = 0; i < detail; ++i) {
      this.subdivide();
    }this.normalizeAndFlat();
  }

  _createClass(Sphere, [{
    key: 'subdivide',
    value: function subdivide() {
      var cache = {};
      var faces = [];

      for (var i = 0; i < this.faces.length - 2; i += 3) {
        var i0 = this.faces[i];
        var i1 = this.faces[i + 1];
        var i2 = this.faces[i + 2];

        var m01 = this.addMidpoint(cache, i0, i1);
        var m12 = this.addMidpoint(cache, i1, i2);
        var m02 = this.addMidpoint(cache, i2, i0);

        faces.push(i0, m01, m02, i1, m12, m01, i2, m02, m12, m02, m01, m12);
        this.edges.push(m01, m01, m01, m12, m12, m02);
      }

      this.faces = faces;
    }
  }, {
    key: 'addMidpoint',
    value: function addMidpoint(midpoints, i, j) {
      var key = Math.min(i, j) + '|' + Math.max(i, j);

      if (key in midpoints) return midpoints[key];

      var _ref = [this.vertices[i], this.vertices[j]],
          vi = _ref[0],
          vj = _ref[1];

      var mid = [];
      _glMatrix.vec3.add(mid, vi, vj);
      _glMatrix.vec3.scale(mid, mid, 1 / 2);

      var idx = this.vertices.push(mid) - 1;
      midpoints[key] = idx;

      return idx;
    }
  }, {
    key: 'normalizeAndFlat',
    value: function normalizeAndFlat() {
      var result = [];

      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = this.vertices[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var v = _step.value;

          _glMatrix.vec3.scale(v, _glMatrix.vec3.normalize(v, v), this.radius);
          result.push.apply(result, _toConsumableArray(v));
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      this.vertices = result;
    }
  }]);

  return Sphere;
}();

},{"assert":1,"gl-matrix":9}],16:[function(require,module,exports){
module.exports = function parse(params){
      var template = "#version 300 es \n" +
" \n" +
"in vec3 aposition; \n" +
"in vec3 anormal; \n" +
"in vec2 texCoord; \n" +
" \n" +
"uniform mat4 mvp; \n" +
" \n" +
"out vec3 position; \n" +
"out vec3 normal; \n" +
"out vec2 coord; \n" +
" \n" +
"void main(void) { \n" +
"  position = aposition; \n" +
"  normal = anormal; \n" +
"  coord = texCoord; \n" +
" \n" +
"  gl_Position = mvp * vec4(aposition, 1.); \n" +
"} \n" +
" \n" 
      params = params || {}
      for(var key in params) {
        var matcher = new RegExp("{{"+key+"}}","g")
        template = template.replace(matcher, params[key])
      }
      return template
    };

},{}],17:[function(require,module,exports){
module.exports = function parse(params){
      var template = "#version 300 es \n" +
" \n" +
"precision highp sampler2D; \n" +
" \n" +
"in vec2 texCoord; \n" +
" \n" +
"uniform sampler2D positions; \n" +
"uniform float nCells; \n" +
" \n" +
"out vec2 coord; \n" +
" \n" +
"void main(void) { \n" +
"  coord = texCoord; \n" +
"  vec3 position = texture(positions, coord).xyz; \n" +
" \n" +
"  vec3 cell = floor(position * nCells) + vec3(1.); \n" +
"  vec2 zCoord = vec2(mod(cell.z, {{zSize}}), floor(cell.z / {{zSize}})); \n" +
"  vec2 cellCoord = 2./{{totalSize}} * (cell.xy + {{xySize}}*zCoord + vec2(.5)) - vec2(1.); \n" +
" \n" +
"  gl_PointSize = 1.; \n" +
"  gl_Position = vec4(cellCoord, 0., 1.); \n" +
"} \n" +
" \n" 
      params = params || {}
      for(var key in params) {
        var matcher = new RegExp("{{"+key+"}}","g")
        template = template.replace(matcher, params[key])
      }
      return template
    };

},{}],18:[function(require,module,exports){
module.exports = function parse(params){
      var template = "#version 300 es \n" +
" \n" +
"precision mediump float; \n" +
" \n" +
"uniform vec3 eye; \n" +
"uniform float ambient; \n" +
"uniform float diffuse; \n" +
"uniform float specular; \n" +
"uniform float shininess; \n" +
"uniform float attenuation; \n" +
"uniform sampler2D texMap; \n" +
"uniform vec3 color; \n" +
"uniform float opacity; \n" +
" \n" +
"in vec3 position; \n" +
"in vec3 normal; \n" +
"in vec2 coord; \n" +
" \n" +
"out vec4 fragColor; \n" +
" \n" +
"const vec3 light = vec3(.5, 1., .5); \n" +
"const vec3 gamma = vec3(1./2.2); \n" +
" \n" +
"void main(void) { \n" +
"  vec3 norm = normalize(normal); \n" +
"  vec3 toLight = light - position; \n" +
"  float distToLight2 = dot(toLight, toLight); \n" +
"  toLight = normalize(toLight); \n" +
" \n" +
"  vec3 base = color + texture(texMap, coord).rgb; \n" +
" \n" +
"  float lightProj = dot(norm, toLight); \n" +
"  vec3 phong = base * diffuse * max(lightProj, 0.); \n" +
" \n" +
"  if (lightProj > 0.) \n" +
"    phong += specular * pow(max(dot(eye, reflect(toLight, norm)), 0.), shininess); \n" +
" \n" +
"  phong *= 1. / (1. + attenuation * distToLight2); \n" +
"  phong += vec3(base * ambient); \n" +
" \n" +
"  fragColor = vec4(pow(phong, gamma), opacity); \n" +
"} \n" +
" \n" 
      params = params || {}
      for(var key in params) {
        var matcher = new RegExp("{{"+key+"}}","g")
        template = template.replace(matcher, params[key])
      }
      return template
    };

},{}],19:[function(require,module,exports){
module.exports = function parse(params){
      var template = "#version 300 es \n" +
" \n" +
"uniform lowp vec4 color; \n" +
" \n" +
"out lowp vec4 fragColor; \n" +
" \n" +
"void main(void) { \n" +
"  fragColor = color; \n" +
"} \n" +
" \n" 
      params = params || {}
      for(var key in params) {
        var matcher = new RegExp("{{"+key+"}}","g")
        template = template.replace(matcher, params[key])
      }
      return template
    };

},{}],20:[function(require,module,exports){
module.exports = function parse(params){
      var template = "#version 300 es \n" +
" \n" +
"precision highp float; \n" +
"precision highp sampler2D; \n" +
" \n" +
"uniform sampler2D base; \n" +
"//#TODO: what about array of levels? \n" +
"uniform sampler2D pyramid; \n" +
" \n" +
"flat in float idx; \n" +
" \n" +
"out vec4 fragColor; \n" +
" \n" +
"const float invSize = 1./{{totalSize}}; \n" +
" \n" +
"void main(void) { \n" +
"  vec2 relPos = vec2(0.); \n" +
"  vec2 pos = vec2(0.); \n" +
"  float start = 0.; \n" +
"  float end = 0.; \n" +
"  vec4 starts = vec4(0.); \n" +
"  vec3 ends = vec3(0.); \n" +
"  float offset = {{totalSize}} - 2.; \n" +
" \n" +
"  for (int i = 1; i < int({{pyramidLvls}}); ++i) { \n" +
"    offset -= pow(2., float(i)); \n" +
"    relPos = pos + invSize * vec2(offset, 0.); \n" +
"    end = start + texture(pyramid, relPos).r; \n" +
"    vec2 pos1 = relPos; \n" +
"    starts.x= start; \n" +
"    ends.x = end; \n" +
"    vec2 pos2 = relPos + vec2(invSize, 0.); \n" +
"    starts.y = ends.x; \n" +
"    ends.y = ends.x + texture(pyramid, pos2).r; \n" +
"    vec2 pos3 = relPos + vec2(0., invSize); \n" +
"    starts.z = ends.y; \n" +
"    ends.z = ends.y + texture(pyramid, pos3).r; \n" +
"    vec2 pos4 = relPos + vec2(invSize, invSize); \n" +
"    starts.w = ends.z; \n" +
"    vec3 mask = vec3(greaterThanEqual(vec3(idx), starts.rgb)) * vec3(lessThan(vec3(idx), ends)); \n" +
"    vec4 m = vec4(mask, 1. - length(mask)); \n" +
"    relPos = m.x * pos1 + m.y * pos2 + m.z * pos3 + m.w * pos4; \n" +
"    start = m.x * starts.x + m.y * starts.y  + m.z * starts.z + m.w * starts.w; \n" +
"    pos = relPos - invSize * vec2(offset, 0.); \n" +
"    pos *= 2.; \n" +
"  } \n" +
" \n" +
"  end = start + texture(base, pos).r; \n" +
"  vec2 pos1 = pos; \n" +
"  starts.x= start; \n" +
"  ends.x = end; \n" +
"  vec2 pos2 = pos + vec2(invSize, 0.); \n" +
"  starts.y = ends.x; \n" +
"  ends.y = ends.x + texture(base, pos2).r; \n" +
"  vec2 pos3 = pos + vec2(0., invSize); \n" +
"  starts.z = ends.y; \n" +
"  ends.z = ends.y + texture(base, pos3).r; \n" +
"  vec2 pos4 = pos + vec2(invSize, invSize); \n" +
"  starts.w = ends.z; \n" +
"  vec3 mask = vec3(greaterThanEqual(vec3(idx), starts.rgb)) * vec3(lessThan(vec3(idx), ends)); \n" +
"  vec4 m = vec4(mask, 1. - length(mask)); \n" +
"  pos = m.x * pos1 + m.y * pos2 + m.z * pos3 + m.w * pos4; \n" +
"  vec2 index = pos * {{totalSize}}; \n" +
" \n" +
"  fragColor = vec4(vec3(mod(index, {{xySize}}), \n" +
"                        dot(floor(index / {{xySize}}), vec2(1., {{zSize}}))), \n" +
"                   texture(base, pos).a); \n" +
"} \n" +
" \n" 
      params = params || {}
      for(var key in params) {
        var matcher = new RegExp("{{"+key+"}}","g")
        template = template.replace(matcher, params[key])
      }
      return template
    };

},{}],21:[function(require,module,exports){
module.exports = function parse(params){
      var template = "#version 300 es \n" +
" \n" +
"precision highp float; \n" +
"precision highp sampler2D; \n" +
" \n" +
"uniform sampler2D positions; \n" +
"uniform sampler2D meanPositions; \n" +
"uniform float nCells; \n" +
"uniform float mass; \n" +
"uniform float ratio2; \n" +
"uniform float wDefault; \n" +
" \n" +
"in vec2 coord; \n" +
" \n" +
"out vec4 fragColor; \n" +
" \n" +
"void main(void) { \n" +
"  vec3 position = texture(positions, coord).xyz; \n" +
"  vec3 cell = floor(position * nCells) + vec3(1.); \n" +
" \n" +
"  float density = 0.; \n" +
" \n" +
"  for (int i = -1; i <= 1; ++i) { \n" +
"    float nbCellZ = cell.z + float(i); \n" +
"    vec2 zCoord = vec2(mod(nbCellZ, {{zSize}}), floor(nbCellZ / {{zSize}})); \n" +
" \n" +
"    for (int j = -1; j <= 1; ++j) \n" +
"      for (int k = -1; k <= 1; ++k) { \n" +
"        vec3 nbCell = cell + vec3(k, j, i); \n" +
" \n" +
"        vec2 cellCoord = (nbCell.xy + {{xySize}}*zCoord + vec2(.5))/{{totalSize}}; \n" +
"        vec4 nbPosition = texture(meanPositions, cellCoord); \n" +
" \n" +
"        if (nbPosition.w < 1.) \n" +
"          continue; \n" +
" \n" +
"        vec3 r = position - nbPosition.xyz / nbPosition.w; \n" +
"        float dr = max(ratio2 - dot(r, r), 0.); \n" +
"        density += nbPosition.w * dr*dr*dr; \n" +
"      } \n" +
"  } \n" +
" \n" +
"  fragColor = vec4(0., 0., 0., density * mass * wDefault); \n" +
"} \n" +
" \n" 
      params = params || {}
      for(var key in params) {
        var matcher = new RegExp("{{"+key+"}}","g")
        template = template.replace(matcher, params[key])
      }
      return template
    };

},{}],22:[function(require,module,exports){
module.exports = function parse(params){
      var template = "#version 300 es \n" +
" \n" +
"in vec2 texCoord; \n" +
" \n" +
"out vec2 coord; \n" +
" \n" +
"void main(void) { \n" +
"  coord = texCoord; \n" +
"  gl_PointSize = 1.; \n" +
"  gl_Position = vec4(2. * coord - vec2(1.), 0., 1.); \n" +
"} \n" +
" \n" 
      params = params || {}
      for(var key in params) {
        var matcher = new RegExp("{{"+key+"}}","g")
        template = template.replace(matcher, params[key])
      }
      return template
    };

},{}],23:[function(require,module,exports){
module.exports = function parse(params){
      var template = "#version 300 es \n" +
" \n" +
"precision highp float; \n" +
"precision highp sampler2D; \n" +
" \n" +
"uniform sampler2D positions; \n" +
"uniform sampler2D velDens; \n" +
"uniform sampler2D meanPositions; \n" +
"uniform sampler2D meanVelDens; \n" +
"uniform float nCells; \n" +
"uniform float ratio; \n" +
"uniform float ratio2; \n" +
"uniform float _3ratio2; \n" +
"uniform float pressureK; \n" +
"uniform float density0; \n" +
"uniform float viscosity; \n" +
"uniform float tension; \n" +
"uniform float threshold; \n" +
"uniform float restitution; \n" +
"uniform float deltaT; \n" +
"uniform float mass; \n" +
"uniform float gravity; \n" +
"uniform float wPressure; \n" +
"uniform float wViscosity; \n" +
"uniform float wTension; \n" +
"uniform vec3 sphereCenter; \n" +
" \n" +
"in vec2 coord; \n" +
" \n" +
"layout(location = 0) out vec4 outPosition; \n" +
"layout(location = 1) out vec4 outVelocity; \n" +
" \n" +
"const vec3 boxCenter = vec3(.5, .5, .5); \n" +
"const vec3 boxSize = vec3(.5, .5, .5); \n" +
"const float sphereRadius = {{sphereRadius}}; \n" +
"const float sphereRadius2 = sphereRadius * sphereRadius; \n" +
" \n" +
"void main(void) { \n" +
"  vec3 position = texture(positions, coord).xyz; \n" +
"  vec3 cell = floor(position * nCells) + vec3(1.); \n" +
"  vec4 piece = texture(velDens, coord); \n" +
"  vec3 velocity = piece.xyz; \n" +
"  float density = piece.w; \n" +
" \n" +
"  float pressure = max(pressureK * (density - density0), 0.); \n" +
" \n" +
"  vec3 surfaceNormal = vec3(0.); \n" +
"  vec3 pressureForce = vec3(0.); \n" +
"  vec3 viscosityForce = vec3(0.); \n" +
"  vec3 tensionForce = vec3(0.); \n" +
" \n" +
"  for (int i = -1; i <= 1; ++i) { \n" +
"    float nbCellZ = cell.z + float(i); \n" +
"    vec2 zCoord = vec2(mod(nbCellZ, {{zSize}}), floor(nbCellZ / {{zSize}})); \n" +
" \n" +
"    for (int j = -1; j <= 1; ++j) \n" +
"      for (int k = -1; k <= 1; ++k) { \n" +
"        vec3 nbCell = cell + vec3(k, j, i); \n" +
" \n" +
"        vec2 cellCoord = (nbCell.xy + {{xySize}}*zCoord + vec2(.5))/{{totalSize}}; \n" +
"        piece = texture(meanPositions, cellCoord); \n" +
"        float nbCount = piece.w; \n" +
" \n" +
"        if (nbCount < 1.) \n" +
"          continue; \n" +
" \n" +
"        float invNbCount = 1./nbCount; \n" +
"        vec3 diff = position - piece.xyz * invNbCount; \n" +
"        float distance2 = dot(diff, diff); \n" +
"        float distance = sqrt(distance2); \n" +
" \n" +
"        if (distance >= ratio) \n" +
"          continue; \n" +
" \n" +
"        piece = texture(meanVelDens, cellCoord) * invNbCount; \n" +
"        vec3 nbVelocity = piece.xyz; \n" +
"        float nbDensity = piece.w; \n" +
"        float nbCountPerDensity = nbCount / nbDensity; \n" +
" \n" +
"        float dr = ratio - distance; \n" +
"        float nbPressure = max(pressureK * (nbDensity - density0), 0.); \n" +
"        float coef = nbCountPerDensity * dr; \n" +
" \n" +
"        //#TODO: check advanced equation. \n" +
"        if (distance > 0.) \n" +
"          pressureForce += coef * (nbPressure + pressure) * diff/distance * dr; \n" +
"        viscosityForce += coef * (nbVelocity - velocity); \n" +
" \n" +
"        //#TODO: what about Becker'07? \n" +
"        float dr2 = ratio2 - distance2; \n" +
"        coef = nbCountPerDensity * dr2; \n" +
"        surfaceNormal += coef * diff * dr2; \n" +
"        tensionForce += coef * (_3ratio2 - 7.*distance2); \n" +
"      } \n" +
"  } \n" +
" \n" +
"  pressureForce *= .5 * wPressure; \n" +
"  viscosityForce *= viscosity * wViscosity; \n" +
" \n" +
"  surfaceNormal *= mass * wTension; \n" +
"  float surfaceNormalLength = length(surfaceNormal); \n" +
"  if (surfaceNormalLength >= threshold) \n" +
"    tensionForce *= tension * surfaceNormal/surfaceNormalLength * wTension; \n" +
" \n" +
"  vec3 volumeForce = viscosityForce - pressureForce - tensionForce; \n" +
" \n" +
"  //#TODO: use leap-frog scheme. \n" +
"  velocity += deltaT * (vec3(0., gravity, 0.) + mass/density * volumeForce); \n" +
"  position += velocity * deltaT; \n" +
" \n" +
"  // Collision detection against the sphere. \n" +
"  vec3 xLocal = position - sphereCenter; \n" +
"  float xRadius2 = dot(xLocal, xLocal); \n" +
" \n" +
"  if (xRadius2 < sphereRadius2) { \n" +
"    float xRadius = sqrt(xRadius2); \n" +
"    vec3 normal = xLocal/xRadius; \n" +
"    float distance = sphereRadius - xRadius; \n" +
"    float correction = distance / max(deltaT * length(velocity), 0.0001); \n" +
" \n" +
"    position += distance * normal; \n" +
"    velocity -= (1. + restitution * correction) * dot(velocity, normal) * normal; \n" +
"  } \n" +
" \n" +
"  // Collision detection against the bounding box. \n" +
"  xLocal = position - boxCenter; \n" +
"  vec3 depth = abs(xLocal) - boxSize; \n" +
"  float distance = max(depth.x, max(depth.y, depth.z)); \n" +
" \n" +
"  if (distance > 0.) { \n" +
"    vec3 contactPoint = min(boxSize, max(-boxSize, xLocal)) + boxCenter; \n" +
"    vec3 normal = normalize(sign(contactPoint - position)); \n" +
"    float correction = distance / max(deltaT * length(velocity), 0.0001); \n" +
" \n" +
"    position = contactPoint; \n" +
"    velocity -= (1. + restitution * correction) * dot(velocity, normal) * normal; \n" +
"  } \n" +
" \n" +
"  outPosition = vec4(position, 0.); \n" +
"  outVelocity = vec4(velocity, 0.); \n" +
"} \n" +
" \n" 
      params = params || {}
      for(var key in params) {
        var matcher = new RegExp("{{"+key+"}}","g")
        template = template.replace(matcher, params[key])
      }
      return template
    };

},{}],24:[function(require,module,exports){
module.exports = function parse(params){
      var template = "#version 300 es \n" +
" \n" +
"precision highp float; \n" +
"precision highp sampler2D; \n" +
" \n" +
"uniform sampler2D positions; \n" +
"uniform sampler2D velDens; \n" +
" \n" +
"in vec2 coord; \n" +
" \n" +
"layout(location = 0) out vec4 outData0; \n" +
"layout(location = 1) out vec4 outData1; \n" +
" \n" +
"void main(void) { \n" +
"  outData0 = vec4(texture(positions, coord).xyz, 1.); \n" +
"  outData1 = vec4(texture(velDens, coord).xyz, 0.); \n" +
"} \n" +
" \n" 
      params = params || {}
      for(var key in params) {
        var matcher = new RegExp("{{"+key+"}}","g")
        template = template.replace(matcher, params[key])
      }
      return template
    };

},{}],25:[function(require,module,exports){
module.exports = function parse(params){
      var template = "#version 300 es \n" +
" \n" +
"precision highp float; \n" +
"precision highp sampler2D; \n" +
" \n" +
"uniform sampler2D velDens; \n" +
" \n" +
"in vec2 coord; \n" +
" \n" +
"layout(location = 0) out vec4 outData0; \n" +
"layout(location = 1) out vec4 outData1; \n" +
" \n" +
"void main(void) { \n" +
"  outData0 = vec4(0.); \n" +
"  outData1 = vec4(0., 0., 0., texture(velDens, coord).w); \n" +
"} \n" +
" \n" 
      params = params || {}
      for(var key in params) {
        var matcher = new RegExp("{{"+key+"}}","g")
        template = template.replace(matcher, params[key])
      }
      return template
    };

},{}],26:[function(require,module,exports){
module.exports = function parse(params){
      var template = "#version 300 es \n" +
" \n" +
"precision highp float; \n" +
"precision highp sampler2D; \n" +
" \n" +
"uniform sampler2D cells; \n" +
" \n" +
"const float dXY = 1. / {{totalSize}}; \n" +
"const float dZ = 1. / {{zSize}}; \n" +
" \n" +
"vec2 subZ(vec2 cell2D) { \n" +
"  return vec2(mod(cell2D.x + 1. - dZ, 1.), cell2D.y - dZ * step(cell2D.x, dZ)); \n" +
"} \n" +
" \n" +
"out vec4 fragColor; \n" +
" \n" +
"void main(void) { \n" +
"  vec2 cell2D = gl_FragCoord.xy * dXY; \n" +
" \n" +
"  float value = texture(cells, cell2D).s \n" +
"              + texture(cells, subZ(cell2D + vec2(-dXY, -dXY))).s \n" +
"              + texture(cells, subZ(cell2D + vec2( 0., -dXY))).s \n" +
"              + texture(cells, subZ(cell2D + vec2( 0.,  0.))).s \n" +
"              + texture(cells, subZ(cell2D + vec2(-dXY,  0.))).s \n" +
"              + texture(cells, cell2D + vec2(-dXY)).s \n" +
"              + texture(cells, cell2D + vec2( 0., -dXY)).s \n" +
"              + texture(cells, cell2D + vec2(-dXY,  0.)).s; \n" +
" \n" +
"  fragColor = vec4(value * .125, 0., 0., 1.); \n" +
"} \n" +
" \n" 
      params = params || {}
      for(var key in params) {
        var matcher = new RegExp("{{"+key+"}}","g")
        template = template.replace(matcher, params[key])
      }
      return template
    };

},{}],27:[function(require,module,exports){
module.exports = function parse(params){
      var template = "#version 300 es \n" +
" \n" +
"/* \n" +
"   Since float values can not be read in javascript, this shader packs the value in a unsigned byte \n" +
"   format. This packing only works on 0 to 1 floating numbers, hence the final sum of the \n" +
"   histopymirad has to be normalized using a max value. This max value is the total cells that \n" +
"   could be active in one texture. \n" +
" */ \n" +
" \n" +
"precision highp float; \n" +
"precision highp sampler2D; \n" +
" \n" +
"uniform sampler2D data; \n" +
" \n" +
"// Max cells that could be active in a texture. \n" +
"uniform float invMax; \n" +
" \n" +
"out vec4 fragColor; \n" +
" \n" +
"void main(void) { \n" +
"  vec4 enc = fract(vec4(1., 255., 65025., 160581375.) * texture(data, vec2(0.)).s * invMax); \n" +
"  enc -= enc.yzww * vec4(vec3(.00392157), 0.); \n" +
"  fragColor = enc; \n" +
"} \n" +
" \n" 
      params = params || {}
      for(var key in params) {
        var matcher = new RegExp("{{"+key+"}}","g")
        template = template.replace(matcher, params[key])
      }
      return template
    };

},{}],28:[function(require,module,exports){
module.exports = function parse(params){
      var template = "#version 300 es \n" +
" \n" +
"in highp vec2 texCoord; \n" +
" \n" +
"uniform mat4 mvp; \n" +
"uniform sampler2D positions; \n" +
" \n" +
"out lowp vec4 color; \n" +
" \n" +
"void main(void) { \n" +
"  vec3 position = texture(positions, texCoord).xyz; \n" +
"  color = vec4(1.); \n" +
" \n" +
"  gl_PointSize = 2.; \n" +
"  gl_Position = mvp * vec4(position, 1.); \n" +
"} \n" +
" \n" 
      params = params || {}
      for(var key in params) {
        var matcher = new RegExp("{{"+key+"}}","g")
        template = template.replace(matcher, params[key])
      }
      return template
    };

},{}],29:[function(require,module,exports){
module.exports = function parse(params){
      var template = "#version 300 es \n" +
" \n" +
"precision highp float; \n" +
"precision highp sampler2D; \n" +
" \n" +
"uniform sampler2D data; \n" +
"uniform float size; \n" +
" \n" +
"out vec4 fragColor; \n" +
" \n" +
"void main(void) { \n" +
"  float hs = .5 * size; \n" +
"  vec2 pos = floor(gl_FragCoord.xy) * size; \n" +
" \n" +
"  fragColor = vec4(texture(data, pos).s \n" +
"                 + texture(data, pos + vec2(0., hs)).s \n" +
"                 + texture(data, pos + vec2(hs, 0.)).s \n" +
"                 + texture(data, pos + vec2(hs, hs)).s); \n" +
"} \n" +
" \n" 
      params = params || {}
      for(var key in params) {
        var matcher = new RegExp("{{"+key+"}}","g")
        template = template.replace(matcher, params[key])
      }
      return template
    };

},{}],30:[function(require,module,exports){
module.exports = function parse(params){
      var template = "#version 300 es \n" +
" \n" +
"in vec2 vertex; \n" +
" \n" +
"void main() { \n" +
"  gl_Position = vec4(vertex, 0., 1.); \n" +
"} \n" +
" \n" 
      params = params || {}
      for(var key in params) {
        var matcher = new RegExp("{{"+key+"}}","g")
        template = template.replace(matcher, params[key])
      }
      return template
    };

},{}],31:[function(require,module,exports){
module.exports = function parse(params){
      var template = "#version 300 es \n" +
" \n" +
"precision highp float; \n" +
"precision highp sampler2D; \n" +
" \n" +
"uniform sampler2D nodes; \n" +
"uniform float isolevel; \n" +
" \n" +
"const float dXY = 1. / {{totalSize}}; \n" +
"const float dZ = 1. / {{zSize}}; \n" +
" \n" +
"vec2 addZ(vec2 cell2D) { \n" +
"  float x = mod(cell2D.x - 1. + dZ, 1.); \n" +
"  return vec2(x, cell2D.y + dZ * step(x, dZ)); \n" +
"} \n" +
" \n" +
"out vec4 fragColor; \n" +
" \n" +
"void main(void) { \n" +
"  vec2 cell2D = gl_FragCoord.xy * dXY; \n" +
" \n" +
"  float mcCase = step(texture(nodes, cell2D).s, isolevel) \n" +
"      +   2. * step(texture(nodes, cell2D + vec2(dXY, 0.)).s, isolevel) \n" +
"      +   4. * step(texture(nodes, cell2D + vec2(dXY, dXY)).s, isolevel) \n" +
"      +   8. * step(texture(nodes, cell2D + vec2(0., dXY)).s, isolevel) \n" +
"      +  16. * step(texture(nodes, addZ(cell2D + vec2(0., 0.))).s, isolevel) \n" +
"      +  32. * step(texture(nodes, addZ(cell2D + vec2(dXY, 0.))).s, isolevel) \n" +
"      +  64. * step(texture(nodes, addZ(cell2D + vec2(dXY, dXY))).s, isolevel) \n" +
"      + 128. * step(texture(nodes, addZ(cell2D + vec2(0., dXY))).s, isolevel); \n" +
" \n" +
"  mcCase *= step(mcCase, 254.); \n" +
" \n" +
"  fragColor = vec4(step(-mcCase, -.5), 0., 0., mcCase); \n" +
"} \n" +
" \n" 
      params = params || {}
      for(var key in params) {
        var matcher = new RegExp("{{"+key+"}}","g")
        template = template.replace(matcher, params[key])
      }
      return template
    };

},{}],32:[function(require,module,exports){
module.exports = function parse(params){
      var template = "#version 300 es \n" +
" \n" +
"in float index; \n" +
"in vec2 texCoord; \n" +
" \n" +
"uniform highp sampler2D vertices[3]; \n" +
"uniform highp sampler2D normals[3]; \n" +
"uniform mat4 mvp; \n" +
" \n" +
"out vec3 position; \n" +
"out vec3 normal; \n" +
"out vec2 coord; \n" +
" \n" +
"void main(void) { \n" +
"  int i = int(mod(index, 3.)); \n" +
" \n" +
"  if (i == 0) { \n" +
"    position = texture(vertices[0], texCoord).xyz; \n" +
"    normal = texture(normals[0], texCoord).xyz; \n" +
"  } else if (i == 1) { \n" +
"    position = texture(vertices[1], texCoord).xyz; \n" +
"    normal = texture(normals[1], texCoord).xyz; \n" +
"  } else { \n" +
"    position = texture(vertices[2], texCoord).xyz; \n" +
"    normal = texture(normals[2], texCoord).xyz; \n" +
"  } \n" +
" \n" +
"  coord = texCoord; \n" +
"  gl_Position = mvp * vec4(position, 1.); \n" +
"} \n" +
" \n" 
      params = params || {}
      for(var key in params) {
        var matcher = new RegExp("{{"+key+"}}","g")
        template = template.replace(matcher, params[key])
      }
      return template
    };

},{}],33:[function(require,module,exports){
module.exports = function parse(params){
      var template = "#version 300 es \n" +
" \n" +
"in vec3 position; \n" +
" \n" +
"uniform mat4 mvp; \n" +
" \n" +
"void main(void) { \n" +
"  gl_Position = mvp * vec4(position, 1.); \n" +
"} \n" +
" \n" 
      params = params || {}
      for(var key in params) {
        var matcher = new RegExp("{{"+key+"}}","g")
        template = template.replace(matcher, params[key])
      }
      return template
    };

},{}],34:[function(require,module,exports){
module.exports = function parse(params){
      var template = "#version 300 es \n" +
" \n" +
"//#TODO: rename this! \n" +
"in vec3 aposition; \n" +
" \n" +
"uniform vec3 center; \n" +
"uniform mat4 vp; \n" +
" \n" +
"out vec3 position; \n" +
"out vec3 normal; \n" +
"out vec2 coord; \n" +
" \n" +
"void main(void) { \n" +
"  position = center + aposition; \n" +
"  normal = aposition; \n" +
"  gl_Position = vp * vec4(position, 1.); \n" +
"} \n" +
" \n" 
      params = params || {}
      for(var key in params) {
        var matcher = new RegExp("{{"+key+"}}","g")
        template = template.replace(matcher, params[key])
      }
      return template
    };

},{}],35:[function(require,module,exports){
module.exports = function parse(params){
      var template = "#version 300 es \n" +
" \n" +
"precision highp float; \n" +
"precision highp sampler2D; \n" +
" \n" +
"uniform sampler2D cells; \n" +
" \n" +
"float activity(vec3 cell) { \n" +
"  vec2 zCoord = vec2(mod(cell.z, {{zSize}}), floor(cell.z / {{zSize}})); \n" +
"  vec2 cellCoord = (cell.xy + {{xySize}}*zCoord + vec2(.5)) / {{totalSize}}; \n" +
"  return texture(cells, cellCoord).s; \n" +
"} \n" +
" \n" +
"out vec4 fragColor; \n" +
" \n" +
"void main(void) { \n" +
"  vec2 cell2D = floor(gl_FragCoord.xy); \n" +
"  vec3 cell = vec3(mod(cell2D, {{xySize}}), dot(floor(cell2D / {{xySize}}), vec2(1., {{zSize}}))); \n" +
" \n" +
"  float val = activity(cell) * 2. \n" +
"            + activity(cell + vec3(-1., 0., 0.)) \n" +
"            + activity(cell + vec3(0., -1., 0.)) \n" +
"            + activity(cell + vec3(1., 0., 0.)) \n" +
"            + activity(cell + vec3(0., 1., 0.)) \n" +
"            + activity(cell + vec3(0., 0., -1.)) \n" +
"            + activity(cell + vec3(0., 0., 1.)); \n" +
" \n" +
"  fragColor = vec4(val / 8.); \n" +
"} \n" +
" \n" 
      params = params || {}
      for(var key in params) {
        var matcher = new RegExp("{{"+key+"}}","g")
        template = template.replace(matcher, params[key])
      }
      return template
    };

},{}],36:[function(require,module,exports){
module.exports = function parse(params){
      var template = "#version 300 es \n" +
" \n" +
"in vec2 texCoord; \n" +
"in float index; \n" +
" \n" +
"flat out float idx; \n" +
" \n" +
"void main(void) { \n" +
"  idx = index; \n" +
"  gl_PointSize = 1.; \n" +
"  gl_Position = vec4(2. * texCoord - vec2(1.), 0., 1.); \n" +
"} \n" +
" \n" 
      params = params || {}
      for(var key in params) {
        var matcher = new RegExp("{{"+key+"}}","g")
        template = template.replace(matcher, params[key])
      }
      return template
    };

},{}],37:[function(require,module,exports){
module.exports = function parse(params){
      var template = "#version 300 es \n" +
" \n" +
"precision highp float; \n" +
"precision highp sampler2D; \n" +
" \n" +
"uniform float cellSize; \n" +
"uniform float isolevel; \n" +
"uniform sampler2D potentials; \n" +
"uniform sampler2D traversal; \n" +
"uniform sampler2D mcCases; \n" +
" \n" +
"flat in float idx; \n" +
" \n" +
"const float invSize = 1./{{totalSize}}; \n" +
" \n" +
"layout(location = 0) out vec4 outVert0; \n" +
"layout(location = 1) out vec4 outVert1; \n" +
"layout(location = 2) out vec4 outVert2; \n" +
"layout(location = 3) out vec4 outNorm0; \n" +
"layout(location = 4) out vec4 outNorm1; \n" +
"layout(location = 5) out vec4 outNorm2; \n" +
" \n" +
"float potential(vec3 cell) { \n" +
"  vec2 zCoord = vec2(mod(cell.z, {{zSize}}), floor(cell.z / {{zSize}})); \n" +
"  vec2 coord = invSize * (cell.xy + {{xySize}}*zCoord + vec2(.5)); \n" +
"  return texture(potentials, coord).s; \n" +
"} \n" +
" \n" +
"void triangleData(float index, vec3 cell, out vec3 pos, out vec3 norm, out float mcIdx) { \n" +
"  mcIdx = texture(mcCases, vec2(mod(index, 64.) + .5, floor(index / 64.) + .5) / 64.).s; \n" +
" \n" +
"  vec4 m0 = vec4(equal(vec4(mcIdx), vec4(0., 1., 2., 3.))); \n" +
"  vec4 m1 = vec4(equal(vec4(mcIdx), vec4(4., 5., 6., 7.))); \n" +
"  vec4 m2 = vec4(equal(vec4(mcIdx), vec4(8., 9., 10., 11.))); \n" +
" \n" +
"  vec4 m0pm2 = m0 + m2; \n" +
"  vec4 m1pm2 = m1 + m2.yzwx; \n" +
" \n" +
"  vec3 b0 = cell + vec3(m0pm2.yw + m0pm2.zz, m1.x + m1.w) + m1.ywy + m1.zzz; \n" +
"  vec3 b1 = cell + vec3(m0.xz + m0.yy, m1pm2.z + m1pm2.w) + m1pm2.xzx + m1pm2.yyy; \n" +
" \n" +
"  float n0 = potential(b0); \n" +
"  float n1 = potential(b1); \n" +
" \n" +
"  vec2 diff = vec2(isolevel - n0, n1 - n0); \n" +
"  vec3 mult = vec3(lessThan(abs(vec3(diff.x, isolevel - n1, -diff.y)), vec3(0.))); \n" +
" \n" +
"  float t = abs(diff.y) > 0. ? diff.x / diff.y : 0.5; \n" +
"  pos = (mult.x + mult.z)*b0 + mult.y*b1 + (1. - dot(mult, mult)) * mix(b0, b1, t); \n" +
"  pos = pos*cellSize + vec3(-cellSize); \n" +
" \n" +
"  vec3 norm0 = normalize(vec3(n0) - vec3(potential(b0 + vec3(1., 0., 0.)), \n" +
"                                         potential(b0 + vec3(0., 1., 0.)), \n" +
"                                         potential(b0 + vec3(0., 0., 1.)))); \n" +
" \n" +
"  vec3 norm1 = normalize(vec3(n1) - vec3(potential(b1 + vec3(1., 0., 0.)), \n" +
"                                         potential(b1 + vec3(0., 1., 0.)), \n" +
"                                         potential(b1 + vec3(0., 0., 1.)))); \n" +
" \n" +
"  norm = mix(norm0, norm1, n1 / (n0 + n1)); \n" +
"} \n" +
" \n" +
"void main(void) { \n" +
"  float traversalIdx = floor(idx * .25); \n" +
"  vec4 data = texture(traversal, vec2(mod(traversalIdx, {{totalSize}}) + .5, \n" +
"                                      floor(traversalIdx * invSize) + .5) * invSize); \n" +
"  float initIndex = 12. * data.w + 3. * mod(idx, 4.); \n" +
" \n" +
"  float mcIdx = 0.; \n" +
"  vec3 pos = vec3(0.); \n" +
"  vec3 norm = vec3(0.); \n" +
" \n" +
"  triangleData(initIndex, data.xyz, pos, norm, mcIdx); \n" +
"  outVert0 = vec4(pos, mcIdx); \n" +
"  outNorm0 = vec4(norm, 1.); \n" +
" \n" +
"  triangleData(initIndex + 1., data.xyz, pos, norm, mcIdx); \n" +
"  outVert1 = vec4(pos, 1.); \n" +
"  outNorm1 = vec4(norm, 1.); \n" +
" \n" +
"  triangleData(initIndex + 2., data.xyz, pos, norm, mcIdx); \n" +
"  outVert2 = vec4(pos, 1.); \n" +
"  outNorm2 = vec4(norm, 1.); \n" +
"} \n" +
" \n" 
      params = params || {}
      for(var key in params) {
        var matcher = new RegExp("{{"+key+"}}","g")
        template = template.replace(matcher, params[key])
      }
      return template
    };

},{}],38:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _templateObject = _taggedTemplateLiteral(['Restart'], ['Restart']),
    _templateObject2 = _taggedTemplateLiteral(['Pause'], ['Pause']),
    _templateObject3 = _taggedTemplateLiteral(['Resume'], ['Resume']),
    _templateObject4 = _taggedTemplateLiteral(['Environment'], ['Environment']),
    _templateObject5 = _taggedTemplateLiteral(['Gravity'], ['Gravity']),
    _templateObject6 = _taggedTemplateLiteral(['Time step'], ['Time step']),
    _templateObject7 = _taggedTemplateLiteral(['Real-time'], ['Real-time']),
    _templateObject8 = _taggedTemplateLiteral(['Fluid physics'], ['Fluid physics']),
    _templateObject9 = _taggedTemplateLiteral(['Density'], ['Density']),
    _templateObject10 = _taggedTemplateLiteral(['Viscosity'], ['Viscosity']),
    _templateObject11 = _taggedTemplateLiteral(['Gas stiffness'], ['Gas stiffness']),
    _templateObject12 = _taggedTemplateLiteral(['Surface tension'], ['Surface tension']),
    _templateObject13 = _taggedTemplateLiteral(['Restitution'], ['Restitution']),
    _templateObject14 = _taggedTemplateLiteral(['SPH'], ['SPH']),
    _templateObject15 = _taggedTemplateLiteral(['Particle count'], ['Particle count']),
    _templateObject16 = _taggedTemplateLiteral(['Mass of particle'], ['Mass of particle']),
    _templateObject17 = _taggedTemplateLiteral(['Support radius'], ['Support radius']),
    _templateObject18 = _taggedTemplateLiteral(['wireframe'], ['wireframe']),
    _templateObject19 = _taggedTemplateLiteral(['mockup'], ['mockup']),
    _templateObject20 = _taggedTemplateLiteral(['dual'], ['dual']),
    _templateObject21 = _taggedTemplateLiteral(['Mode'], ['Mode']),
    _templateObject22 = _taggedTemplateLiteral(['MC'], ['MC']),
    _templateObject23 = _taggedTemplateLiteral(['Spread'], ['Spread']),
    _templateObject24 = _taggedTemplateLiteral(['Voxel count'], ['Voxel count']),
    _templateObject25 = _taggedTemplateLiteral(['Isosurface level'], ['Isosurface level']),
    _templateObject26 = _taggedTemplateLiteral(['Optics'], ['Optics']),
    _templateObject27 = _taggedTemplateLiteral(['Ambient'], ['Ambient']),
    _templateObject28 = _taggedTemplateLiteral(['Diffuse'], ['Diffuse']),
    _templateObject29 = _taggedTemplateLiteral(['Specular'], ['Specular']),
    _templateObject30 = _taggedTemplateLiteral(['Shininess'], ['Shininess']),
    _templateObject31 = _taggedTemplateLiteral(['Color'], ['Color']),
    _templateObject32 = _taggedTemplateLiteral(['Opacity'], ['Opacity']);

var _datGui = require('dat-gui');

var _datGui2 = _interopRequireDefault(_datGui);

var _locale = require('./locale');

var _locale2 = _interopRequireDefault(_locale);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var GUI = function GUI(simulation) {
  var _sph$add;

  _classCallCheck(this, GUI);

  var gui = this.gui = new _datGui2.default.GUI();

  gui.add(simulation, 'restart').name((0, _locale2.default)(_templateObject));
  gui.add(simulation, 'pauseResume').name((0, _locale2.default)(_templateObject2)).onChange(function () {
    this.name(simulation.paused ? (0, _locale2.default)(_templateObject2) : (0, _locale2.default)(_templateObject3));
  });

  var env = this.env = gui.addFolder((0, _locale2.default)(_templateObject4));
  env.add(simulation, 'gravity', -15, 0, .01).name((0, _locale2.default)(_templateObject5));
  env.add(simulation, 'deltaT', .002, .02, .0001).name((0, _locale2.default)(_templateObject6));
  env.add(simulation, 'realtime').name((0, _locale2.default)(_templateObject7));
  env.open();

  var physics = this.physics = gui.addFolder((0, _locale2.default)(_templateObject8));
  physics.add(simulation, 'density0', 100, 5000, .01).name((0, _locale2.default)(_templateObject9));
  physics.add(simulation, 'viscosity', 1, 50, .1).name((0, _locale2.default)(_templateObject10));
  physics.add(simulation, 'pressureK', .5, 10, .5).name((0, _locale2.default)(_templateObject11));
  physics.add(simulation, 'tension', 0, .2, .01).name((0, _locale2.default)(_templateObject12));
  physics.add(simulation, 'restitution', 0, 1, .01).name((0, _locale2.default)(_templateObject13));
  physics.open();

  var sph = this.sph = gui.addFolder((0, _locale2.default)(_templateObject14));
  sph.add(simulation.wait, 'nParticles', 5000, 250000, 5000).name((0, _locale2.default)(_templateObject15));
  sph.add(simulation, 'mass', .0005, .01, .0005).name((0, _locale2.default)(_templateObject16));
  sph.add(simulation, 'ratio', .02, .1, .005).name((0, _locale2.default)(_templateObject17));
  sph.add(simulation, 'mode', (_sph$add = {}, _defineProperty(_sph$add, (0, _locale2.default)(_templateObject18), 'wireframe'), _defineProperty(_sph$add, (0, _locale2.default)(_templateObject19), 'mockup'), _defineProperty(_sph$add, (0, _locale2.default)(_templateObject20), 'dual'), _sph$add)).name((0, _locale2.default)(_templateObject21));
  sph.open();

  var mc = this.mc = gui.addFolder((0, _locale2.default)(_templateObject22));
  mc.add(simulation, 'spread', 0, 5, 1).name((0, _locale2.default)(_templateObject23));
  mc.add(simulation, 'nVoxels', 0, 70, 1).name((0, _locale2.default)(_templateObject24));
  mc.add(simulation, 'isolevel', .2, .99, .01).name((0, _locale2.default)(_templateObject25));
  mc.open();

  var material = this.material = gui.addFolder((0, _locale2.default)(_templateObject26));
  material.add(simulation, 'ambient', 0, 1, .01).name((0, _locale2.default)(_templateObject27));
  material.add(simulation, 'diffuse', 0, 1, .01).name((0, _locale2.default)(_templateObject28));
  material.add(simulation, 'specular', 0, 1, .01).name((0, _locale2.default)(_templateObject29));
  material.add(simulation, 'shininess', 0, 80, 1).name((0, _locale2.default)(_templateObject30));

  var proxy = { color: simulation.color.map(function (c) {
      return c * 255;
    }) };
  var h = _datGui2.default.color.color.math.component_from_hex;
  material.addColor(proxy, 'color').onChange(function (color) {
    if (typeof color === 'string') {
      var num = +('0x' + color.slice(1));
      simulation.color = [2, 1, 1].map(function (c) {
        return h(num, c) / 255;
      });
    } else simulation.color = color.map(function (c) {
      return c / 255;
    });
  }).name((0, _locale2.default)(_templateObject31));

  material.add(simulation, 'opacity', 0, 1, .01).name((0, _locale2.default)(_templateObject32));
  material.open();
};

exports.default = GUI;

},{"./locale":39,"dat-gui":5}],39:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = L;

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var useRuLang = (window.navigator.language || window.navigator.userLanguage) === 'ru';

var map = {
  'Simulation': 'Симуляция',
  'Rendering': 'Визуализация',
  'Restart': 'Перезапуск',
  'Pause': 'Приостановить',
  'Resume': 'Продолжить',
  'Environment': 'Среда',
  'Gravity': 'Гравитация',
  'Time step': 'Временной шаг',
  'Real-time': 'В реальном времени',
  'Fluid physics': 'Хар-ки жидкости',
  'Density': 'Плотность',
  'Viscosity': 'Вязкость',
  'Gas stiffness': 'Жёсткость',
  'Surface tension': 'Пов. натяжение',
  'Restitution': 'Восстановление',
  'SPH': 'ГСЧ',
  'Particle count': 'Кол-во частиц',
  'Mass of particle': 'Масса частицы',
  'Support radius': 'Радиус ядра',
  'Mode': 'Режим',
  'wireframe': 'каркас',
  'mockup': 'модель',
  'dual': 'двойной',
  'MC': 'ШК',
  'Spread': 'Сглаживание',
  'Voxel count': 'Кол-во вокселей',
  'Isosurface level': 'Уровень изопов.',
  'Optics': 'Оптика',
  'Ambient': 'Фоновое осв.',
  'Diffuse': 'Рассеянное осв.',
  'Specular': 'Зеркальное осв.',
  'Shininess': 'Глянцевость',
  'Color': 'Цвет',
  'Opacity': 'Непрозрачность'
};

function L(string) {
  _assert2.default.equal(string.length, 1);
  (0, _assert2.default)(string[0] in map);

  return useRuLang ? map[string[0]] : string[0];
}

},{"assert":1}],40:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
                value: true
});
exports.default = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 8, 3, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, 9, 0, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 8, 3, 1, 8, 1, 9, -1, -1, -1, -1, -1, -1, 10, 1, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, 8, 3, 0, 1, 2, 10, -1, -1, -1, -1, -1, -1, 9, 0, 2, 9, 2, 10, -1, -1, -1, -1, -1, -1, 3, 2, 8, 2, 10, 8, 8, 10, 9, -1, -1, -1, 11, 2, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, 11, 2, 0, 11, 0, 8, -1, -1, -1, -1, -1, -1, 11, 2, 3, 0, 1, 9, -1, -1, -1, -1, -1, -1, 2, 1, 11, 1, 9, 11, 11, 9, 8, -1, -1, -1, 10, 1, 3, 10, 3, 11, -1, -1, -1, -1, -1, -1, 1, 0, 10, 0, 8, 10, 10, 8, 11, -1, -1, -1, 0, 3, 9, 3, 11, 9, 9, 11, 10, -1, -1, -1, 8, 10, 9, 8, 11, 10, -1, -1, -1, -1, -1, -1, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, 3, 0, 4, 3, 4, 7, -1, -1, -1, -1, -1, -1, 1, 9, 0, 8, 4, 7, -1, -1, -1, -1, -1, -1, 9, 4, 1, 4, 7, 1, 1, 7, 3, -1, -1, -1, 10, 1, 2, 8, 4, 7, -1, -1, -1, -1, -1, -1, 2, 10, 1, 0, 4, 7, 0, 7, 3, -1, -1, -1, 4, 7, 8, 0, 2, 10, 0, 10, 9, -1, -1, -1, 2, 7, 3, 2, 9, 7, 7, 9, 4, 2, 10, 9, 2, 3, 11, 7, 8, 4, -1, -1, -1, -1, -1, -1, 7, 11, 4, 11, 2, 4, 4, 2, 0, -1, -1, -1, 3, 11, 2, 4, 7, 8, 9, 0, 1, -1, -1, -1, 2, 7, 11, 2, 1, 7, 1, 4, 7, 1, 9, 4, 8, 4, 7, 11, 10, 1, 11, 1, 3, -1, -1, -1, 11, 4, 7, 1, 4, 11, 1, 11, 10, 1, 0, 4, 3, 8, 0, 7, 11, 4, 11, 9, 4, 11, 10, 9, 7, 11, 4, 4, 11, 9, 11, 10, 9, -1, -1, -1, 9, 5, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, 3, 0, 8, 4, 9, 5, -1, -1, -1, -1, -1, -1, 5, 4, 0, 5, 0, 1, -1, -1, -1, -1, -1, -1, 4, 8, 5, 8, 3, 5, 5, 3, 1, -1, -1, -1, 2, 10, 1, 9, 5, 4, -1, -1, -1, -1, -1, -1, 0, 8, 3, 5, 4, 9, 10, 1, 2, -1, -1, -1, 10, 5, 2, 5, 4, 2, 2, 4, 0, -1, -1, -1, 3, 4, 8, 3, 2, 4, 2, 5, 4, 2, 10, 5, 11, 2, 3, 9, 5, 4, -1, -1, -1, -1, -1, -1, 9, 5, 4, 8, 11, 2, 8, 2, 0, -1, -1, -1, 3, 11, 2, 1, 5, 4, 1, 4, 0, -1, -1, -1, 8, 5, 4, 2, 5, 8, 2, 8, 11, 2, 1, 5, 5, 4, 9, 1, 3, 11, 1, 11, 10, -1, -1, -1, 0, 9, 1, 4, 8, 5, 8, 10, 5, 8, 11, 10, 3, 4, 0, 3, 10, 4, 4, 10, 5, 3, 11, 10, 4, 8, 5, 5, 8, 10, 8, 11, 10, -1, -1, -1, 9, 5, 7, 9, 7, 8, -1, -1, -1, -1, -1, -1, 0, 9, 3, 9, 5, 3, 3, 5, 7, -1, -1, -1, 8, 0, 7, 0, 1, 7, 7, 1, 5, -1, -1, -1, 1, 7, 3, 1, 5, 7, -1, -1, -1, -1, -1, -1, 1, 2, 10, 5, 7, 8, 5, 8, 9, -1, -1, -1, 9, 1, 0, 10, 5, 2, 5, 3, 2, 5, 7, 3, 5, 2, 10, 8, 2, 5, 8, 5, 7, 8, 0, 2, 10, 5, 2, 2, 5, 3, 5, 7, 3, -1, -1, -1, 11, 2, 3, 8, 9, 5, 8, 5, 7, -1, -1, -1, 9, 2, 0, 9, 7, 2, 2, 7, 11, 9, 5, 7, 0, 3, 8, 2, 1, 11, 1, 7, 11, 1, 5, 7, 2, 1, 11, 11, 1, 7, 1, 5, 7, -1, -1, -1, 3, 9, 1, 3, 8, 9, 7, 11, 10, 7, 10, 5, 9, 1, 0, 10, 7, 11, 10, 5, 7, -1, -1, -1, 3, 8, 0, 7, 10, 5, 7, 11, 10, -1, -1, -1, 11, 5, 7, 11, 10, 5, -1, -1, -1, -1, -1, -1, 10, 6, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, 8, 3, 0, 10, 6, 5, -1, -1, -1, -1, -1, -1, 0, 1, 9, 5, 10, 6, -1, -1, -1, -1, -1, -1, 10, 6, 5, 9, 8, 3, 9, 3, 1, -1, -1, -1, 1, 2, 6, 1, 6, 5, -1, -1, -1, -1, -1, -1, 0, 8, 3, 2, 6, 5, 2, 5, 1, -1, -1, -1, 5, 9, 6, 9, 0, 6, 6, 0, 2, -1, -1, -1, 9, 6, 5, 3, 6, 9, 3, 9, 8, 3, 2, 6, 3, 11, 2, 10, 6, 5, -1, -1, -1, -1, -1, -1, 6, 5, 10, 2, 0, 8, 2, 8, 11, -1, -1, -1, 1, 9, 0, 6, 5, 10, 11, 2, 3, -1, -1, -1, 1, 10, 2, 5, 9, 6, 9, 11, 6, 9, 8, 11, 11, 6, 3, 6, 5, 3, 3, 5, 1, -1, -1, -1, 0, 5, 1, 0, 11, 5, 5, 11, 6, 0, 8, 11, 0, 5, 9, 0, 3, 5, 3, 6, 5, 3, 11, 6, 5, 9, 6, 6, 9, 11, 9, 8, 11, -1, -1, -1, 10, 6, 5, 4, 7, 8, -1, -1, -1, -1, -1, -1, 5, 10, 6, 7, 3, 0, 7, 0, 4, -1, -1, -1, 5, 10, 6, 0, 1, 9, 8, 4, 7, -1, -1, -1, 4, 5, 9, 6, 7, 10, 7, 1, 10, 7, 3, 1, 7, 8, 4, 5, 1, 2, 5, 2, 6, -1, -1, -1, 4, 1, 0, 4, 5, 1, 6, 7, 3, 6, 3, 2, 9, 4, 5, 8, 0, 7, 0, 6, 7, 0, 2, 6, 4, 5, 9, 6, 3, 2, 6, 7, 3, -1, -1, -1, 7, 8, 4, 2, 3, 11, 10, 6, 5, -1, -1, -1, 11, 6, 7, 10, 2, 5, 2, 4, 5, 2, 0, 4, 11, 6, 7, 8, 0, 3, 1, 10, 2, 9, 4, 5, 6, 7, 11, 1, 10, 2, 9, 4, 5, -1, -1, -1, 6, 7, 11, 4, 5, 8, 5, 3, 8, 5, 1, 3, 6, 7, 11, 4, 1, 0, 4, 5, 1, -1, -1, -1, 4, 5, 9, 3, 8, 0, 11, 6, 7, -1, -1, -1, 9, 4, 5, 7, 11, 6, -1, -1, -1, -1, -1, -1, 10, 6, 4, 10, 4, 9, -1, -1, -1, -1, -1, -1, 8, 3, 0, 9, 10, 6, 9, 6, 4, -1, -1, -1, 1, 10, 0, 10, 6, 0, 0, 6, 4, -1, -1, -1, 8, 6, 4, 8, 1, 6, 6, 1, 10, 8, 3, 1, 9, 1, 4, 1, 2, 4, 4, 2, 6, -1, -1, -1, 1, 0, 9, 3, 2, 8, 2, 4, 8, 2, 6, 4, 2, 4, 0, 2, 6, 4, -1, -1, -1, -1, -1, -1, 3, 2, 8, 8, 2, 4, 2, 6, 4, -1, -1, -1, 2, 3, 11, 6, 4, 9, 6, 9, 10, -1, -1, -1, 0, 10, 2, 0, 9, 10, 4, 8, 11, 4, 11, 6, 10, 2, 1, 11, 6, 3, 6, 0, 3, 6, 4, 0, 10, 2, 1, 11, 4, 8, 11, 6, 4, -1, -1, -1, 1, 4, 9, 11, 4, 1, 11, 1, 3, 11, 6, 4, 0, 9, 1, 4, 11, 6, 4, 8, 11, -1, -1, -1, 11, 6, 3, 3, 6, 0, 6, 4, 0, -1, -1, -1, 8, 6, 4, 8, 11, 6, -1, -1, -1, -1, -1, -1, 6, 7, 10, 7, 8, 10, 10, 8, 9, -1, -1, -1, 9, 3, 0, 6, 3, 9, 6, 9, 10, 6, 7, 3, 6, 1, 10, 6, 7, 1, 7, 0, 1, 7, 8, 0, 6, 7, 10, 10, 7, 1, 7, 3, 1, -1, -1, -1, 7, 2, 6, 7, 9, 2, 2, 9, 1, 7, 8, 9, 1, 0, 9, 3, 6, 7, 3, 2, 6, -1, -1, -1, 8, 0, 7, 7, 0, 6, 0, 2, 6, -1, -1, -1, 2, 7, 3, 2, 6, 7, -1, -1, -1, -1, -1, -1, 7, 11, 6, 3, 8, 2, 8, 10, 2, 8, 9, 10, 11, 6, 7, 10, 0, 9, 10, 2, 0, -1, -1, -1, 2, 1, 10, 7, 11, 6, 8, 0, 3, -1, -1, -1, 1, 10, 2, 6, 7, 11, -1, -1, -1, -1, -1, -1, 7, 11, 6, 3, 9, 1, 3, 8, 9, -1, -1, -1, 9, 1, 0, 11, 6, 7, -1, -1, -1, -1, -1, -1, 0, 3, 8, 11, 6, 7, -1, -1, -1, -1, -1, -1, 11, 6, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, 11, 7, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, 0, 8, 3, 11, 7, 6, -1, -1, -1, -1, -1, -1, 9, 0, 1, 11, 7, 6, -1, -1, -1, -1, -1, -1, 7, 6, 11, 3, 1, 9, 3, 9, 8, -1, -1, -1, 1, 2, 10, 6, 11, 7, -1, -1, -1, -1, -1, -1, 2, 10, 1, 7, 6, 11, 8, 3, 0, -1, -1, -1, 11, 7, 6, 10, 9, 0, 10, 0, 2, -1, -1, -1, 7, 6, 11, 3, 2, 8, 8, 2, 10, 8, 10, 9, 2, 3, 7, 2, 7, 6, -1, -1, -1, -1, -1, -1, 8, 7, 0, 7, 6, 0, 0, 6, 2, -1, -1, -1, 1, 9, 0, 3, 7, 6, 3, 6, 2, -1, -1, -1, 7, 6, 2, 7, 2, 9, 2, 1, 9, 7, 9, 8, 6, 10, 7, 10, 1, 7, 7, 1, 3, -1, -1, -1, 6, 10, 1, 6, 1, 7, 7, 1, 0, 7, 0, 8, 9, 0, 3, 6, 9, 3, 6, 10, 9, 6, 3, 7, 6, 10, 7, 7, 10, 8, 10, 9, 8, -1, -1, -1, 8, 4, 6, 8, 6, 11, -1, -1, -1, -1, -1, -1, 11, 3, 6, 3, 0, 6, 6, 0, 4, -1, -1, -1, 0, 1, 9, 4, 6, 11, 4, 11, 8, -1, -1, -1, 1, 9, 4, 11, 1, 4, 11, 3, 1, 11, 4, 6, 10, 1, 2, 11, 8, 4, 11, 4, 6, -1, -1, -1, 10, 1, 2, 11, 3, 6, 6, 3, 0, 6, 0, 4, 0, 2, 10, 0, 10, 9, 4, 11, 8, 4, 6, 11, 2, 11, 3, 6, 9, 4, 6, 10, 9, -1, -1, -1, 3, 8, 2, 8, 4, 2, 2, 4, 6, -1, -1, -1, 2, 0, 4, 2, 4, 6, -1, -1, -1, -1, -1, -1, 1, 9, 0, 3, 8, 2, 2, 8, 4, 2, 4, 6, 9, 4, 1, 1, 4, 2, 4, 6, 2, -1, -1, -1, 8, 4, 6, 8, 6, 1, 6, 10, 1, 8, 1, 3, 1, 0, 10, 10, 0, 6, 0, 4, 6, -1, -1, -1, 8, 0, 3, 9, 6, 10, 9, 4, 6, -1, -1, -1, 10, 4, 6, 10, 9, 4, -1, -1, -1, -1, -1, -1, 9, 5, 4, 7, 6, 11, -1, -1, -1, -1, -1, -1, 4, 9, 5, 3, 0, 8, 11, 7, 6, -1, -1, -1, 6, 11, 7, 4, 0, 1, 4, 1, 5, -1, -1, -1, 6, 11, 7, 4, 8, 5, 5, 8, 3, 5, 3, 1, 6, 11, 7, 1, 2, 10, 9, 5, 4, -1, -1, -1, 11, 7, 6, 8, 3, 0, 1, 2, 10, 9, 5, 4, 11, 7, 6, 10, 5, 2, 2, 5, 4, 2, 4, 0, 7, 4, 8, 2, 11, 3, 10, 5, 6, -1, -1, -1, 4, 9, 5, 6, 2, 3, 6, 3, 7, -1, -1, -1, 9, 5, 4, 8, 7, 0, 0, 7, 6, 0, 6, 2, 4, 0, 1, 4, 1, 5, 6, 3, 7, 6, 2, 3, 7, 4, 8, 5, 2, 1, 5, 6, 2, -1, -1, -1, 4, 9, 5, 6, 10, 7, 7, 10, 1, 7, 1, 3, 5, 6, 10, 0, 9, 1, 8, 7, 4, -1, -1, -1, 5, 6, 10, 7, 0, 3, 7, 4, 0, -1, -1, -1, 10, 5, 6, 4, 8, 7, -1, -1, -1, -1, -1, -1, 5, 6, 9, 6, 11, 9, 9, 11, 8, -1, -1, -1, 0, 9, 5, 0, 5, 3, 3, 5, 6, 3, 6, 11, 0, 1, 5, 0, 5, 11, 5, 6, 11, 0, 11, 8, 11, 3, 6, 6, 3, 5, 3, 1, 5, -1, -1, -1, 1, 2, 10, 5, 6, 9, 9, 6, 11, 9, 11, 8, 1, 0, 9, 6, 10, 5, 11, 3, 2, -1, -1, -1, 6, 10, 5, 2, 8, 0, 2, 11, 8, -1, -1, -1, 3, 2, 11, 10, 5, 6, -1, -1, -1, -1, -1, -1, 9, 5, 6, 3, 9, 6, 3, 8, 9, 3, 6, 2, 5, 6, 9, 9, 6, 0, 6, 2, 0, -1, -1, -1, 0, 3, 8, 2, 5, 6, 2, 1, 5, -1, -1, -1, 1, 6, 2, 1, 5, 6, -1, -1, -1, -1, -1, -1, 10, 5, 6, 9, 3, 8, 9, 1, 3, -1, -1, -1, 0, 9, 1, 5, 6, 10, -1, -1, -1, -1, -1, -1, 8, 0, 3, 10, 5, 6, -1, -1, -1, -1, -1, -1, 10, 5, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, 11, 7, 5, 11, 5, 10, -1, -1, -1, -1, -1, -1, 3, 0, 8, 7, 5, 10, 7, 10, 11, -1, -1, -1, 9, 0, 1, 10, 11, 7, 10, 7, 5, -1, -1, -1, 3, 1, 9, 3, 9, 8, 7, 10, 11, 7, 5, 10, 2, 11, 1, 11, 7, 1, 1, 7, 5, -1, -1, -1, 0, 8, 3, 2, 11, 1, 1, 11, 7, 1, 7, 5, 9, 0, 2, 9, 2, 7, 2, 11, 7, 9, 7, 5, 11, 3, 2, 8, 5, 9, 8, 7, 5, -1, -1, -1, 10, 2, 5, 2, 3, 5, 5, 3, 7, -1, -1, -1, 5, 10, 2, 8, 5, 2, 8, 7, 5, 8, 2, 0, 9, 0, 1, 10, 2, 5, 5, 2, 3, 5, 3, 7, 1, 10, 2, 5, 8, 7, 5, 9, 8, -1, -1, -1, 1, 3, 7, 1, 7, 5, -1, -1, -1, -1, -1, -1, 8, 7, 0, 0, 7, 1, 7, 5, 1, -1, -1, -1, 0, 3, 9, 9, 3, 5, 3, 7, 5, -1, -1, -1, 9, 7, 5, 9, 8, 7, -1, -1, -1, -1, -1, -1, 4, 5, 8, 5, 10, 8, 8, 10, 11, -1, -1, -1, 3, 0, 4, 3, 4, 10, 4, 5, 10, 3, 10, 11, 0, 1, 9, 4, 5, 8, 8, 5, 10, 8, 10, 11, 5, 9, 4, 1, 11, 3, 1, 10, 11, -1, -1, -1, 8, 4, 5, 2, 8, 5, 2, 11, 8, 2, 5, 1, 3, 2, 11, 1, 4, 5, 1, 0, 4, -1, -1, -1, 9, 4, 5, 8, 2, 11, 8, 0, 2, -1, -1, -1, 11, 3, 2, 9, 4, 5, -1, -1, -1, -1, -1, -1, 3, 8, 4, 3, 4, 2, 2, 4, 5, 2, 5, 10, 10, 2, 5, 5, 2, 4, 2, 0, 4, -1, -1, -1, 0, 3, 8, 5, 9, 4, 10, 2, 1, -1, -1, -1, 2, 1, 10, 9, 4, 5, -1, -1, -1, -1, -1, -1, 4, 5, 8, 8, 5, 3, 5, 1, 3, -1, -1, -1, 5, 0, 4, 5, 1, 0, -1, -1, -1, -1, -1, -1, 3, 8, 0, 4, 5, 9, -1, -1, -1, -1, -1, -1, 9, 4, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, 7, 4, 11, 4, 9, 11, 11, 9, 10, -1, -1, -1, 3, 0, 8, 7, 4, 11, 11, 4, 9, 11, 9, 10, 11, 7, 4, 1, 11, 4, 1, 10, 11, 1, 4, 0, 8, 7, 4, 11, 1, 10, 11, 3, 1, -1, -1, -1, 2, 11, 7, 2, 7, 1, 1, 7, 4, 1, 4, 9, 3, 2, 11, 4, 8, 7, 9, 1, 0, -1, -1, -1, 7, 4, 11, 11, 4, 2, 4, 0, 2, -1, -1, -1, 2, 11, 3, 7, 4, 8, -1, -1, -1, -1, -1, -1, 2, 3, 7, 2, 7, 9, 7, 4, 9, 2, 9, 10, 4, 8, 7, 0, 10, 2, 0, 9, 10, -1, -1, -1, 2, 1, 10, 0, 7, 4, 0, 3, 7, -1, -1, -1, 10, 2, 1, 8, 7, 4, -1, -1, -1, -1, -1, -1, 9, 1, 4, 4, 1, 7, 1, 3, 7, -1, -1, -1, 1, 0, 9, 8, 7, 4, -1, -1, -1, -1, -1, -1, 3, 4, 0, 3, 7, 4, -1, -1, -1, -1, -1, -1, 8, 7, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, 8, 9, 10, 8, 10, 11, -1, -1, -1, -1, -1, -1, 0, 9, 3, 3, 9, 11, 9, 10, 11, -1, -1, -1, 1, 10, 0, 0, 10, 8, 10, 11, 8, -1, -1, -1, 10, 3, 1, 10, 11, 3, -1, -1, -1, -1, -1, -1, 2, 11, 1, 1, 11, 9, 11, 8, 9, -1, -1, -1, 11, 3, 2, 0, 9, 1, -1, -1, -1, -1, -1, -1, 11, 0, 2, 11, 8, 0, -1, -1, -1, -1, -1, -1, 11, 3, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, 3, 8, 2, 2, 8, 10, 8, 9, 10, -1, -1, -1, 9, 2, 0, 9, 10, 2, -1, -1, -1, -1, -1, -1, 8, 0, 3, 1, 10, 2, -1, -1, -1, -1, -1, -1, 10, 2, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 8, 1, 3, 8, 9, 1, -1, -1, -1, -1, -1, -1, 9, 1, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, 8, 0, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1];

},{}],41:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _events = require('events');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Mouse = function (_EventEmitter) {
  _inherits(Mouse, _EventEmitter);

  function Mouse(observable) {
    _classCallCheck(this, Mouse);

    var _this = _possibleConstructorReturn(this, (Mouse.__proto__ || Object.getPrototypeOf(Mouse)).call(this));

    _this.down = false;
    _this.cursor = { x: 0, y: 0 };

    observable.addEventListener('mousedown', function (e) {
      return _this.onMouseDown(e);
    });
    window.addEventListener('mousemove', function (e) {
      return _this.onMouseMove(e);
    });
    window.addEventListener('mouseup', function (e) {
      return _this.onMouseUp(e);
    });
    observable.addEventListener('wheel', function (e) {
      return _this.onMouseWheel(e);
    });

    var bodyStyle = getComputedStyle(observable);
    _this.lineHeight = parseInt(bodyStyle.fontSize, 10);
    _this.pageHeight = parseInt(bodyStyle.height, 10);
    return _this;
  }

  _createClass(Mouse, [{
    key: 'onMouseDown',
    value: function onMouseDown(e) {
      this.down = true;
      document.body.classList.add('mouse');
      this.cursor.x = e.clientX;
      this.cursor.y = e.clientY;
      e.preventDefault();

      this.emit('down');
    }
  }, {
    key: 'onMouseMove',
    value: function onMouseMove(e) {
      if (!this.down) return;

      var dx = e.clientX - this.cursor.x,
          dy = e.clientY - this.cursor.y;


      this.cursor.x = e.clientX;
      this.cursor.y = e.clientY;

      this.emit('move', dx, dy);
    }
  }, {
    key: 'onMouseUp',
    value: function onMouseUp(e) {
      this.down = false;
      document.body.classList.remove('mouse');
      this.emit('up');
    }
  }, {
    key: 'onMouseWheel',
    value: function onMouseWheel(e) {
      var deltaY = e.deltaMode === 0 ? e.deltaY : e.deltaMode === 1 ? this.lineHeight * e.deltaY : this.pageHeight * e.deltaY;
      this.emit('wheel', deltaY);
    }
  }]);

  return Mouse;
}(_events.EventEmitter);

exports.default = Mouse;

},{"events":8}],42:[function(require,module,exports){
'use strict';

var _datGui = require('dat-gui');

var _datGui2 = _interopRequireDefault(_datGui);

var _raf = require('raf');

var _raf2 = _interopRequireDefault(_raf);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

//#TODO: What about core-js (babel/polyfill)?
if (!requestAnimationFrame) window.requestAnimationFrame = _raf2.default;

if (!Math.log2) Math.log2 = function (x) {
  return Math.log(x) / Math.LN2;
};

// Fix step and precision bugs in dat.gui.
var buggyAdd = _datGui2.default.gui.GUI.prototype.add;
_datGui2.default.gui.GUI.prototype.add = function (object, property) {
  var ctrl = buggyAdd.apply(this, arguments);

  var step = arguments[4];
  if (step != null && ctrl.__impliedStep !== step) {
    var s = step.toString();
    var precision = ~s.indexOf('.') ? s.length - s.indexOf('.') - 1 : 0;

    var box = ctrl.updateDisplay(); // Yeah, `updateDisplay()` returns `NumberControllerBox`.
    box.__step = box.__impliedStep = ctrl.__step = ctrl.__impliedStep = step;
    box.__precision = ctrl.__precision = precision;
    ctrl.updateDisplay();
  }

  return ctrl;
};

},{"dat-gui":5,"raf":12}],43:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TRIANGLES_TEX_SIZE = exports.VOXELS_PYRAMID_LVLS = exports.VOXELS_TEX_SIZE = exports.VOXEL_Z_TEX_SIZE = exports.VOXEL_XY_TEX_SIZE = exports.CELLS_TEX_SIZE = exports.CELL_Z_TEX_SIZE = exports.CELL_XY_TEX_SIZE = exports.DATA_TEX_SIZE = exports.SPHERE_DETAIL = exports.SPHERE_RADIUS = exports.MAX_TRIANGLES = exports.MAX_VOXELS_PER_SIDE = exports.MIN_RATIO = exports.MAX_PARTICLES = undefined;

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _glMatrix = require('gl-matrix');

var _utils = require('./utils');

var utils = _interopRequireWildcard(_utils);

var _camera = require('./camera');

var _camera2 = _interopRequireDefault(_camera);

var _mouse = require('./mouse');

var _mouse2 = _interopRequireDefault(_mouse);

var _mc_cases = require('./mc_cases');

var _mc_cases2 = _interopRequireDefault(_mc_cases);

var _geometry = require('./geometry');

var _simple = require('./glsl/simple.vert');

var _simple2 = _interopRequireDefault(_simple);

var _cell = require('./glsl/cell.vert');

var _cell2 = _interopRequireDefault(_cell);

var _index2d = require('./glsl/index2d.vert');

var _index2d2 = _interopRequireDefault(_index2d);

var _particle = require('./glsl/particle.vert');

var _particle2 = _interopRequireDefault(_particle);

var _quad = require('./glsl/quad.vert');

var _quad2 = _interopRequireDefault(_quad);

var _traversal = require('./glsl/traversal.vert');

var _traversal2 = _interopRequireDefault(_traversal);

var _render_surface = require('./glsl/render_surface.vert');

var _render_surface2 = _interopRequireDefault(_render_surface);

var _bbox = require('./glsl/bbox.vert');

var _bbox2 = _interopRequireDefault(_bbox);

var _sphere = require('./glsl/sphere.vert');

var _sphere2 = _interopRequireDefault(_sphere);

var _color = require('./glsl/color.frag');

var _color2 = _interopRequireDefault(_color);

var _mean = require('./glsl/mean.frag');

var _mean2 = _interopRequireDefault(_mean);

var _density = require('./glsl/density.frag');

var _density2 = _interopRequireDefault(_density);

var _mean_density = require('./glsl/mean_density.frag');

var _mean_density2 = _interopRequireDefault(_mean_density);

var _lagrange = require('./glsl/lagrange.frag');

var _lagrange2 = _interopRequireDefault(_lagrange);

var _spread = require('./glsl/spread.frag');

var _spread2 = _interopRequireDefault(_spread);

var _node = require('./glsl/node.frag');

var _node2 = _interopRequireDefault(_node);

var _relevant = require('./glsl/relevant.frag');

var _relevant2 = _interopRequireDefault(_relevant);

var _pyramid = require('./glsl/pyramid.frag');

var _pyramid2 = _interopRequireDefault(_pyramid);

var _pack_float = require('./glsl/pack_float.frag');

var _pack_float2 = _interopRequireDefault(_pack_float);

var _compact = require('./glsl/compact.frag');

var _compact2 = _interopRequireDefault(_compact);

var _triangle_creator = require('./glsl/triangle_creator.frag');

var _triangle_creator2 = _interopRequireDefault(_triangle_creator);

var _classic = require('./glsl/classic.frag');

var _classic2 = _interopRequireDefault(_classic);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var MAX_PARTICLES = exports.MAX_PARTICLES = 262144;
var MIN_RATIO = exports.MIN_RATIO = .01172;
var MAX_VOXELS_PER_SIDE = exports.MAX_VOXELS_PER_SIDE = 64;
var MAX_TRIANGLES = exports.MAX_TRIANGLES = 1048576;
var SPHERE_RADIUS = exports.SPHERE_RADIUS = .15;
var SPHERE_DETAIL = exports.SPHERE_DETAIL = 4;

var DATA_TEX_SIZE = exports.DATA_TEX_SIZE = Math.pow(2, Math.ceil(Math.log2(MAX_PARTICLES) / 2));
var CELL_XY_TEX_SIZE = exports.CELL_XY_TEX_SIZE = Math.pow(2, Math.ceil(Math.log2(3 / (2 * MIN_RATIO))));
var CELL_Z_TEX_SIZE = exports.CELL_Z_TEX_SIZE = Math.pow(2, Math.ceil(Math.log2(CELL_XY_TEX_SIZE) / 2));
var CELLS_TEX_SIZE = exports.CELLS_TEX_SIZE = CELL_XY_TEX_SIZE * CELL_Z_TEX_SIZE;
var VOXEL_XY_TEX_SIZE = exports.VOXEL_XY_TEX_SIZE = Math.pow(2, Math.ceil(Math.log2(MAX_VOXELS_PER_SIDE)));
var VOXEL_Z_TEX_SIZE = exports.VOXEL_Z_TEX_SIZE = Math.pow(2, Math.ceil(Math.log2(VOXEL_XY_TEX_SIZE) / 2));
var VOXELS_TEX_SIZE = exports.VOXELS_TEX_SIZE = VOXEL_XY_TEX_SIZE * VOXEL_Z_TEX_SIZE;
var VOXELS_PYRAMID_LVLS = exports.VOXELS_PYRAMID_LVLS = Math.log2(VOXELS_TEX_SIZE);
var TRIANGLES_TEX_SIZE = exports.TRIANGLES_TEX_SIZE = Math.pow(2, Math.ceil(Math.log2(MAX_TRIANGLES) / 2));

if (console && console.group) {
  console.group('Limits');
  console.info('Max particles: %f', MAX_PARTICLES);
  console.info('Data tex size: %fx%1$f', DATA_TEX_SIZE);
  console.info('Min ratio: %f', MIN_RATIO);
  console.info('Cells shape: (%f, %1$f, %f)', CELL_XY_TEX_SIZE, Math.pow(CELL_Z_TEX_SIZE, 2));
  console.info('Cells tex size: %fx%1$f', CELLS_TEX_SIZE);
  console.info('Max voxels per side: %f', MAX_VOXELS_PER_SIDE);
  console.info('Voxels shape: (%f, %1$f, %f)', VOXEL_XY_TEX_SIZE, Math.pow(VOXEL_Z_TEX_SIZE, 2));
  console.info('Voxels tex size: %fx%1$f', VOXELS_TEX_SIZE);
  console.info('Histogram pyramid levels: %f', VOXELS_PYRAMID_LVLS);
  console.info('Max triangles: %f', MAX_TRIANGLES);
  console.info('Triangles tex size: %fx%1$f', TRIANGLES_TEX_SIZE);
  console.info('Sphere radius: %f, detail: %f', SPHERE_RADIUS, SPHERE_DETAIL);
  console.groupEnd('Limits');
}

var Simulation = function () {
  function Simulation(gl, resources) {
    var _this = this;

    _classCallCheck(this, Simulation);

    this.gl = gl;

    this.gravity = -9.81;
    this.deltaT = .007;
    this.realtime = false;
    this.paused = false;

    this.density0 = 998.29;
    this.viscosity = 3.5;
    this.pressureK = 3;
    this.tension = .0728;
    this.restitution = 0;

    this.nParticles = 50000;
    this.mass = .007;
    this.ratio = .0457;
    this.mode = 'dual';

    this.spread = 3;
    this.nVoxels = 40;
    this.isolevel = .53;

    this.ambient = .03;
    this.diffuse = .15;
    this.specular = .8;
    this.shininess = 10;
    this.attenuation = .8;
    this.color = [.4, .53, .7];
    this.opacity = .3;

    this.wait = {
      nParticles: this.nParticles
    };

    this.bbox = new _geometry.BBox();
    this.sphere = new _geometry.Sphere([.8, .15, .8], SPHERE_RADIUS, SPHERE_DETAIL);
    this.camera = new _camera2.default([.5, .3, .5]);

    var interactive = false;
    this.mouse = new _mouse2.default(gl.canvas).on('down', function () {
      return interactive = _this.isOverSphere();
    }).on('up', function () {
      return interactive = false;
    }).on('wheel', function (dw) {
      return _this.camera.zoom(dw);
    }).on('move', function (dx, dy) {
      return interactive ? _this.moveSphere(dx, dy) : _this.camera.rotate(dx, dy);
    });

    this.activeCells = 0;

    this.programs = this.createPrograms();
    this.buffers = this.createBuffers();
    this.textures = this.createTextures(resources);
    this.framebuffers = this.createFramebuffers();
  }

  _createClass(Simulation, [{
    key: 'createPrograms',
    value: function createPrograms() {
      var _this2 = this;

      var vs = function vs(tmpl, consts) {
        return utils.compileVertexShader(_this2.gl, tmpl(consts));
      };
      var fs = function fs(tmpl, consts) {
        return utils.compileFragmentShader(_this2.gl, tmpl(consts));
      };
      var link = function link(vs, fs) {
        return utils.createProgram(_this2.gl, vs, fs);
      };

      var cellConsts = {
        zSize: CELL_Z_TEX_SIZE + '.',
        xySize: CELL_XY_TEX_SIZE + '.',
        totalSize: CELLS_TEX_SIZE + '.',
        sphereRadius: SPHERE_RADIUS
      };

      var voxelConsts = {
        zSize: VOXEL_Z_TEX_SIZE + '.',
        xySize: VOXEL_XY_TEX_SIZE + '.',
        totalSize: VOXELS_TEX_SIZE + '.',
        pyramidLvls: VOXELS_PYRAMID_LVLS + '.'
      };

      var simple = vs(_simple2.default),
          cell = vs(_cell2.default, cellConsts),
          voxel = vs(_cell2.default, voxelConsts),
          index2d = vs(_index2d2.default),
          particle = vs(_particle2.default),
          quad = vs(_quad2.default),
          traversal = vs(_traversal2.default),
          renderSurface = vs(_render_surface2.default),
          bbox = vs(_bbox2.default),
          sphere = vs(_sphere2.default);

      var mean = fs(_mean2.default),
          density = fs(_density2.default, cellConsts),
          meanDensity = fs(_mean_density2.default),
          lagrange = fs(_lagrange2.default, cellConsts),
          color = fs(_color2.default),
          spread = fs(_spread2.default, voxelConsts),
          node = fs(_node2.default, voxelConsts),
          relevant = fs(_relevant2.default, voxelConsts),
          pyramid = fs(_pyramid2.default),
          packFloat = fs(_pack_float2.default),
          compact = fs(_compact2.default, voxelConsts),
          triangleCreator = fs(_triangle_creator2.default, voxelConsts),
          classic = fs(_classic2.default);

      return {
        mean: link(cell, mean),
        density: link(index2d, density),
        meanDensity: link(cell, meanDensity),
        lagrange: link(index2d, lagrange),
        wireframe: link(simple, color),
        particle: link(particle, color),
        activity: link(voxel, color),
        spread: link(quad, spread),
        node: link(quad, node),
        relevant: link(quad, relevant),
        pyramid: link(quad, pyramid),
        packFloat: link(quad, packFloat),
        compact: link(traversal, compact),
        triangleCreator: link(traversal, triangleCreator),
        renderSurface: link(renderSurface, classic),
        bbox: link(bbox, classic),
        sphere: link(sphere, classic)
      };
    }
  }, {
    key: 'createBuffers',
    value: function createBuffers() {
      var coords = new Float32Array(2 * Math.pow(DATA_TEX_SIZE, 2));
      for (var i = 0, n = Math.pow(DATA_TEX_SIZE, 2); i < n; ++i) {
        coords[i * 2] = (i % DATA_TEX_SIZE + .5) / DATA_TEX_SIZE;
        coords[i * 2 + 1] = ((i / DATA_TEX_SIZE | 0) + .5) / DATA_TEX_SIZE;
      }

      var quad = [-1, -1, 1, -1, -1, 1, 1, 1];

      var indexes = new Float32Array(Math.pow(Math.max(VOXELS_TEX_SIZE, TRIANGLES_TEX_SIZE), 2));

      var activeCellCoords = new Float32Array(2 * Math.pow(VOXELS_TEX_SIZE, 2));
      for (var _i = 0, _n = Math.pow(VOXELS_TEX_SIZE, 2); _i < _n; ++_i) {
        indexes[_i] = _i;
        activeCellCoords[2 * _i] = (_i % VOXELS_TEX_SIZE + .5) / VOXELS_TEX_SIZE;
        activeCellCoords[2 * _i + 1] = ((_i / VOXELS_TEX_SIZE | 0) + .5) / VOXELS_TEX_SIZE;
      }

      var triangleCoords = new Float32Array(2 * Math.pow(TRIANGLES_TEX_SIZE, 2));
      var vertexCoords = new Float32Array(2 * Math.pow(TRIANGLES_TEX_SIZE, 2));

      for (var _i2 = 0, _n2 = Math.pow(TRIANGLES_TEX_SIZE, 2); _i2 < _n2; ++_i2) {
        indexes[_i2] = _i2;
        triangleCoords[2 * _i2] = (_i2 % TRIANGLES_TEX_SIZE + .5) / TRIANGLES_TEX_SIZE;
        triangleCoords[2 * _i2 + 1] = ((_i2 / TRIANGLES_TEX_SIZE | 0) + .5) / TRIANGLES_TEX_SIZE;

        var j = _i2 / 3 | 0;
        vertexCoords[2 * _i2] = (j % TRIANGLES_TEX_SIZE + .5) / TRIANGLES_TEX_SIZE;
        vertexCoords[2 * _i2 + 1] = ((j / TRIANGLES_TEX_SIZE | 0) + .5) / TRIANGLES_TEX_SIZE;
      }

      return {
        particles: utils.createBuffers(this.gl, {
          texCoord: { dims: 2, data: coords }
        }),
        bbox: utils.createBuffers(this.gl, {
          aposition: { dims: 3, data: this.bbox.vertices },
          anormal: { dims: 3, data: this.bbox.normals },
          texCoord: { dims: 2, data: this.bbox.texCoords }
        }, this.bbox.faces),
        bboxWireframe: utils.createBuffers(this.gl, {
          position: { dims: 3, data: this.bbox.vertices }
        }, this.bbox.edges),
        quad: utils.createBuffers(this.gl, {
          vertex: { dims: 2, data: quad }
        }),
        compact: utils.createBuffers(this.gl, {
          index: { dims: 1, data: indexes },
          texCoord: { dims: 2, data: activeCellCoords }
        }),
        creator: utils.createBuffers(this.gl, {
          index: { dims: 1, data: indexes },
          texCoord: { dims: 2, data: triangleCoords }
        }),
        surface: utils.createBuffers(this.gl, {
          index: { dims: 1, data: indexes },
          texCoord: { dims: 2, data: vertexCoords }
        }),
        sphere: utils.createBuffers(this.gl, {
          aposition: { dims: 3, data: this.sphere.vertices }
        }, this.sphere.faces),
        sphereWireframe: utils.createBuffers(this.gl, {
          position: { dims: 3, data: this.sphere.vertices }
        }, this.sphere.edges)
      };
    }
  }, {
    key: 'createTextures',
    value: function createTextures(resources) {
      var positions = new Float32Array(4 * DATA_TEX_SIZE * DATA_TEX_SIZE);
      var volume = Math.pow(this.mass * this.nParticles / this.density0, 1 / 3);
      for (var i = 0, n = 4 * this.nParticles; i < n; i += 4) {
        positions[i] = Math.random() * volume;
        positions[i + 1] = 1 - Math.random() * volume;
        positions[i + 2] = Math.random() * volume;
      }

      var mcCasesTex = new Float32Array(4 * 64 * 64);
      for (var _i3 = 0; _i3 < _mc_cases2.default.length; ++_i3) {
        mcCasesTex[_i3 * 4] = _mc_cases2.default[_i3];
      }var gl = this.gl;
      var RGB = gl.RGB,
          RGBA = gl.RGBA,
          UNSIGNED_BYTE = gl.UNSIGNED_BYTE,
          NEAREST = gl.NEAREST,
          LINEAR = gl.LINEAR,
          LINEAR_MIPMAP_LINEAR = gl.LINEAR_MIPMAP_LINEAR;


      return {
        meanPositions: utils.createTexture(gl, CELLS_TEX_SIZE, RGBA, NEAREST, gl.FLOAT),
        meanVelDens: utils.createTexture(gl, CELLS_TEX_SIZE, RGBA, NEAREST, gl.FLOAT),
        positions: utils.createTexture(gl, DATA_TEX_SIZE, RGBA, NEAREST, gl.FLOAT, positions),
        _positions: utils.createTexture(gl, DATA_TEX_SIZE, RGBA, NEAREST, gl.FLOAT),
        velDens: utils.createTexture(gl, DATA_TEX_SIZE, RGBA, NEAREST, gl.FLOAT),
        _velDens: utils.createTexture(gl, DATA_TEX_SIZE, RGBA, NEAREST, gl.FLOAT),
        activity: utils.createTexture(gl, VOXELS_TEX_SIZE, RGBA, NEAREST, gl.FLOAT),
        nodes: utils.createTexture(gl, VOXELS_TEX_SIZE, RGBA, NEAREST, gl.FLOAT),
        pyramid: utils.createTexture(gl, VOXELS_TEX_SIZE, RGBA, NEAREST, gl.FLOAT),
        pyramidLvls: Array.apply(undefined, _toConsumableArray(Array(VOXELS_PYRAMID_LVLS))).map(function (_, i) {
          return utils.createTexture(gl, 1 << i, RGBA, NEAREST, gl.FLOAT);
        }),
        totalActive: utils.createTexture(gl, 1, RGBA, NEAREST, UNSIGNED_BYTE),
        traversal: utils.createTexture(gl, VOXELS_TEX_SIZE, RGBA, NEAREST, gl.FLOAT),
        mcCases: utils.createTexture(gl, 64, RGBA, NEAREST, gl.FLOAT, mcCasesTex),
        vertices: [0, 0, 0].map(function (_) {
          return utils.createTexture(gl, TRIANGLES_TEX_SIZE, RGBA, NEAREST, gl.FLOAT);
        }),
        normals: [0, 0, 0].map(function (_) {
          return utils.createTexture(gl, TRIANGLES_TEX_SIZE, RGBA, NEAREST, gl.FLOAT);
        }),
        bbox: utils.createTextureFromImage(gl, RGB, LINEAR, LINEAR_MIPMAP_LINEAR, resources.tiles)
      };
    }
  }, {
    key: 'createFramebuffers',
    value: function createFramebuffers() {
      var _this3 = this;

      return {
        cells: utils.createMRTFramebuffer(this.gl, this.textures.meanPositions, this.textures.meanVelDens),
        velDens: utils.createFramebuffer(this.gl, this.textures.velDens),
        _velDens: utils.createFramebuffer(this.gl, this.textures._velDens),
        lagrange: utils.createMRTFramebuffer(this.gl, this.textures._positions, this.textures._velDens),
        _lagrange: utils.createMRTFramebuffer(this.gl, this.textures.positions, this.textures.velDens),
        activity: utils.createFramebuffer(this.gl, this.textures.activity),
        nodes: utils.createFramebuffer(this.gl, this.textures.nodes),
        pyramidLvls: this.textures.pyramidLvls.map(function (tex) {
          return utils.createFramebuffer(_this3.gl, tex);
        }),
        totalActive: utils.createFramebuffer(this.gl, this.textures.totalActive),
        traversal: utils.createFramebuffer(this.gl, this.textures.traversal),
        triangles: utils.createMRTFramebuffer.apply(utils, [this.gl].concat(_toConsumableArray(this.textures.vertices), _toConsumableArray(this.textures.normals)))
      };
    }
  }, {
    key: 'pauseResume',
    value: function pauseResume() {
      this.paused = !this.paused;
    }
  }, {
    key: 'restart',
    value: function restart() {
      var gl = this.gl;


      var nParticles = this.wait.nParticles;
      var width = this.textures.positions.size;
      var height = Math.ceil(nParticles / width);
      var positions = new Float32Array(4 * width * height);

      utils.fillTexture(gl, this.textures.velDens, gl.RGBA, gl.FLOAT, positions);

      var volume = Math.pow(this.mass * nParticles / this.density0, 1 / 3);
      for (var i = 0, n = 4 * nParticles; i < n; i += 4) {
        positions[i] = Math.random() * volume;
        positions[i + 1] = 1 - Math.random() * volume;
        positions[i + 2] = Math.random() * volume;
      }

      utils.fillTexture(gl, this.textures.positions, gl.RGBA, gl.FLOAT, positions);
      this.nParticles = nParticles;

      if (this.paused && this.mode !== 'wireframe') this.generateSurface();
    }
  }, {
    key: 'resize',
    value: function resize() {
      this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
      this.camera.setAspect(this.gl.drawingBufferWidth / this.gl.drawingBufferHeight);
    }
  }, {
    key: 'isOverSphere',
    value: function isOverSphere() {
      var mx = this.mouse.cursor.x / this.gl.canvas.clientWidth * 2 - 1;
      var my = -(this.mouse.cursor.y / this.gl.canvas.clientHeight) * 2 + 1;

      var _vec3$transformMat = _glMatrix.vec3.transformMat4(_glMatrix.vec3.create(), this.sphere.center, this.camera.matrix),
          _vec3$transformMat2 = _slicedToArray(_vec3$transformMat, 2),
          cx = _vec3$transformMat2[0],
          cy = _vec3$transformMat2[1];

      if (this.mode === 'dual') mx += mx < 0 ? .5 : -.5;

      var r2 = Math.pow(this.sphere.radius, 2);
      var d2 = _glMatrix.vec3.sqrDist(this.sphere.center, this.camera.position);
      var fovy = this.camera.fov / this.camera.curZoom;
      var pr2 = r2 / (Math.pow(Math.tan(fovy / 2), 2) * (d2 - r2));
      return Math.pow((mx - cx) * this.camera.aspect, 2) + Math.pow(my - cy, 2) < pr2;
    }
  }, {
    key: 'moveSphere',
    value: function moveSphere(dx, dy) {
      var delta = [dx / this.gl.canvas.clientWidth * 2, -(dy / this.gl.canvas.clientHeight) * 2];

      var origin = _glMatrix.vec3.fromValues(0, 0, 0);
      var _ref = [_glMatrix.vec3.fromValues(1, 0, 0), _glMatrix.vec3.fromValues(0, 0, 1)],
          xAxis = _ref[0],
          zAxis = _ref[1];

      _glMatrix.vec3.transformMat4(origin, origin, this.camera.matrix);
      _glMatrix.vec2.sub(xAxis, _glMatrix.vec3.transformMat4(xAxis, xAxis, this.camera.matrix), origin);
      _glMatrix.vec2.sub(zAxis, _glMatrix.vec3.transformMat4(zAxis, zAxis, this.camera.matrix), origin);

      var sx = _glMatrix.vec2.dot(delta, xAxis) / _glMatrix.vec2.dot(xAxis, xAxis);
      var sz = _glMatrix.vec2.dot(delta, zAxis) / _glMatrix.vec2.dot(zAxis, zAxis);

      var cx = this.sphere.center[0];
      var cz = this.sphere.center[2];
      var r = this.sphere.radius;

      this.sphere.center[0] = Math.max(r, Math.min(cx + sx, 1 - r));
      this.sphere.center[2] = Math.max(r, Math.min(cz + sz, 1 - r));
    }
  }, {
    key: 'step',
    value: function step() {
      if (this.paused) return;

      this.evaluateMeans();
      this.evaluateDensities();
      this.evaluateMeanDensities();
      this.evaluateLagrange();
    }
  }, {
    key: 'evaluateMeans',
    value: function evaluateMeans() {
      this.drawParticles(this.programs.mean, this.framebuffers.cells, {
        positions: this.textures.positions,
        velDens: this.textures.velDens,
        nCells: 3 / (2 * this.ratio)
      }, true, true);
    }
  }, {
    key: 'evaluateDensities',
    value: function evaluateDensities() {
      this.drawParticles(this.programs.density, this.framebuffers.velDens, {
        positions: this.textures.positions,
        meanPositions: this.textures.meanPositions,
        nCells: 3 / (2 * this.ratio),
        mass: this.mass,
        ratio2: this.ratio * this.ratio,
        wDefault: 315 / (64 * Math.PI * Math.pow(this.ratio, 9))
      }, false, true);
    }
  }, {
    key: 'evaluateMeanDensities',
    value: function evaluateMeanDensities() {
      this.drawParticles(this.programs.meanDensity, this.framebuffers.cells, {
        positions: this.textures.positions,
        velDens: this.textures.velDens,
        nCells: 3 / (2 * this.ratio)
      }, false, true);
    }
  }, {
    key: 'evaluateLagrange',
    value: function evaluateLagrange() {
      this.drawParticles(this.programs.lagrange, this.framebuffers.lagrange, {
        positions: this.textures.positions,
        velDens: this.textures.velDens,
        meanPositions: this.textures.meanPositions,
        meanVelDens: this.textures.meanVelDens,
        nCells: 3 / (2 * this.ratio),
        ratio: this.ratio,
        ratio2: this.ratio * this.ratio,
        _3ratio2: 3 * this.ratio * this.ratio,
        pressureK: this.pressureK,
        density0: this.density0,
        viscosity: this.viscosity,
        tension: this.tension,
        threshold: Math.sqrt(3 * this.mass / (4 * Math.PI * Math.pow(this.ratio, 3))),
        restitution: this.restitution,
        deltaT: this.deltaT,
        mass: this.mass,
        gravity: this.gravity,
        wPressure: -45 / (Math.PI * Math.pow(this.ratio, 6)),
        wViscosity: 45 / (Math.PI * Math.pow(this.ratio, 6)),
        wTension: -945 / (32 * Math.PI * Math.pow(this.ratio, 9)),
        sphereCenter: this.sphere.center
      });

      var t = this.textures;
      var _ref2 = [t._positions, t.positions];
      t.positions = _ref2[0];
      t._positions = _ref2[1];
      var _ref3 = [t._velDens, t.velDens];
      t.velDens = _ref3[0];
      t._velDens = _ref3[1];


      var f = this.framebuffers;
      var _ref4 = [f._velDens, f.velDens];
      f.velDens = _ref4[0];
      f._velDens = _ref4[1];
      var _ref5 = [f._lagrange, f.lagrange];
      f.lagrange = _ref5[0];
      f._lagrange = _ref5[1];
    }
  }, {
    key: 'render',
    value: function render() {
      var gl = this.gl;


      if (this.mode !== 'wireframe' && !this.paused) this.generateSurface();

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);

      var vw = gl.drawingBufferWidth,
          vh = gl.drawingBufferHeight;


      switch (this.mode) {
        case 'wireframe':
          gl.viewport(0, 0, vw, vh);
          this.renderSphereWireframe();
          this.renderBBoxWireframe();
          this.renderParticles();
          break;

        case 'mockup':
          gl.viewport(0, 0, vw, vh);
          this.renderSphere();
          this.renderBBox();
          this.renderSurface();
          break;

        case 'dual':
          gl.enable(gl.SCISSOR_TEST);

          gl.viewport(-vw / 4, 0, vw, vh);
          gl.scissor(0, 0, vw / 2, vh);
          this.renderSphereWireframe();
          this.renderBBoxWireframe();
          this.renderParticles();

          gl.viewport(vw / 4, 0, vw, vh);
          gl.scissor(vw / 2, 0, vw / 2, vh);
          this.renderSphere();
          this.renderBBox();
          this.renderSurface();

          gl.disable(gl.SCISSOR_TEST);
          break;
      }

      gl.disable(gl.DEPTH_TEST);
    }
  }, {
    key: 'renderSphereWireframe',
    value: function renderSphereWireframe() {
      var _ref6 = [this.programs.wireframe, this.buffers.sphereWireframe],
          program = _ref6[0],
          buffer = _ref6[1];


      this.gl.useProgram(program);
      utils.setUniforms(program, {
        mvp: _glMatrix.mat4.translate(_glMatrix.mat4.create(), this.camera.matrix, this.sphere.center),
        color: [.39, .24, .02, 1]
      });

      utils.setBuffersAndAttributes(this.gl, program, buffer);
      this.gl.drawElements(this.gl.LINES, this.sphere.edges.length, this.gl.UNSIGNED_SHORT, 0);
    }
  }, {
    key: 'renderSphere',
    value: function renderSphere() {
      var _ref7 = [this.programs.sphere, this.buffers.sphere],
          program = _ref7[0],
          buffer = _ref7[1];


      this.gl.useProgram(program);
      utils.setUniforms(program, {
        center: this.sphere.center,
        vp: this.camera.matrix,
        eye: this.camera.eye,
        ambient: this.ambient,
        diffuse: .25,
        specular: .45,
        shininess: 20,
        color: [.39, .24, .02],
        opacity: 1,
        texMap: null
      });

      utils.setBuffersAndAttributes(this.gl, program, buffer);

      this.gl.enable(this.gl.CULL_FACE);
      this.gl.cullFace(this.gl.BACK);
      this.gl.drawElements(this.gl.TRIANGLES, this.sphere.faces.length, this.gl.UNSIGNED_SHORT, 0);
      this.gl.disable(this.gl.CULL_FACE);
    }
  }, {
    key: 'renderBBoxWireframe',
    value: function renderBBoxWireframe() {
      var _ref8 = [this.programs.wireframe, this.buffers.bboxWireframe],
          program = _ref8[0],
          buffer = _ref8[1];


      this.gl.useProgram(program);
      utils.setUniforms(program, {
        mvp: this.camera.matrix,
        color: [1, 1, 1, 1]
      });
      utils.setBuffersAndAttributes(this.gl, program, buffer);
      this.gl.drawElements(this.gl.LINES, this.bbox.edges.length, this.gl.UNSIGNED_SHORT, 0);
    }
  }, {
    key: 'renderBBox',
    value: function renderBBox() {
      var _ref9 = [this.programs.bbox, this.buffers.bbox],
          program = _ref9[0],
          buffer = _ref9[1];


      this.gl.useProgram(program);
      utils.setUniforms(program, {
        mvp: this.camera.matrix,
        eye: this.camera.eye,
        ambient: this.ambient,
        diffuse: .4,
        specular: .35,
        shininess: 80,
        attenuation: this.attenuation,
        texMap: this.textures.bbox,
        opacity: 1.
      });
      utils.setBuffersAndAttributes(this.gl, program, buffer);
      this.gl.enable(this.gl.CULL_FACE);
      this.gl.cullFace(this.gl.FRONT);
      this.gl.drawElements(this.gl.TRIANGLES, this.bbox.faces.length, this.gl.UNSIGNED_SHORT, 0);
      this.gl.disable(this.gl.CULL_FACE);
    }
  }, {
    key: 'renderParticles',
    value: function renderParticles() {
      var _ref10 = [this.programs.particle, this.buffers.particles],
          program = _ref10[0],
          buffer = _ref10[1];


      this.gl.useProgram(program);
      utils.setUniforms(program, {
        mvp: this.camera.matrix,
        positions: this.textures.positions,
        color: this.color.concat(1)
      });
      utils.setBuffersAndAttributes(this.gl, program, buffer);
      this.gl.drawArrays(this.gl.POINTS, 0, this.nParticles);
    }
  }, {
    key: 'renderSurface',
    value: function renderSurface() {
      var gl = this.gl;

      var program = this.programs.renderSurface;

      gl.useProgram(program);
      utils.setBuffersAndAttributes(gl, program, this.buffers.surface);

      utils.setUniforms(program, {
        vertices: this.textures.vertices,
        normals: this.textures.normals,
        mvp: this.camera.matrix,
        eye: this.camera.eye,
        ambient: this.ambient,
        diffuse: this.diffuse,
        specular: this.specular,
        shininess: this.shininess,
        attenuation: this.attenuation,
        color: this.color,
        opacity: this.opacity,
        texMap: null
      });

      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ZERO);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
      gl.depthMask(false);

      gl.drawArrays(gl.TRIANGLES, 0, 12 * this.activeCells);

      gl.depthMask(true);
      gl.disable(gl.CULL_FACE);
      gl.disable(gl.BLEND);
    }
  }, {
    key: 'generateSurface',
    value: function generateSurface() {
      this.evaluateActivity();
      this.spreadActivity();
      this.evaluateNodes();
      this.evaluateRelevant();
      this.createHystoPyramid();
      this.createTriangles();
    }
  }, {
    key: 'evaluateActivity',
    value: function evaluateActivity() {
      this.drawParticles(this.programs.activity, this.framebuffers.activity, {
        positions: this.textures.positions,
        nCells: this.nVoxels,
        color: [1, 1, 1, 1]
      }, true);
    }
  }, {
    key: 'spreadActivity',
    value: function spreadActivity() {
      for (var i = 0; i < this.spread; ++i) {
        this.drawQuad(this.programs.spread, this.framebuffers.nodes, {
          cells: this.textures.activity
        });

        var _ref11 = [this.textures, this.framebuffers],
            t = _ref11[0],
            f = _ref11[1];
        var _ref12 = [t.nodes, t.activity];
        t.activity = _ref12[0];
        t.nodes = _ref12[1];
        var _ref13 = [f.nodes, f.activity];
        f.activity = _ref13[0];
        f.nodes = _ref13[1];
      }
    }
  }, {
    key: 'evaluateNodes',
    value: function evaluateNodes() {
      this.drawQuad(this.programs.node, this.framebuffers.nodes, {
        cells: this.textures.activity
      });
    }
  }, {
    key: 'evaluateRelevant',
    value: function evaluateRelevant() {
      this.drawQuad(this.programs.relevant, this.framebuffers.activity, {
        nodes: this.textures.nodes,
        isolevel: this.isolevel
      });
    }
  }, {
    key: 'createHystoPyramid',
    value: function createHystoPyramid() {
      var gl = this.gl;


      var lvl = VOXELS_PYRAMID_LVLS;
      var offset = 0;

      while (lvl-- > 0) {
        var size = 1 << lvl;
        //if (size > 1) {
        //gl.enable(gl.SCISSOR_TEST);
        //gl.scissor(0, 0, size, size * .5);
        //}

        this.drawQuad(this.programs.pyramid, this.framebuffers.pyramidLvls[lvl], {
          data: this.textures.pyramidLvls[lvl + 1] || this.textures.activity,
          size: (1 << VOXELS_PYRAMID_LVLS - lvl) / VOXELS_TEX_SIZE
        });

        gl.bindTexture(gl.TEXTURE_2D, this.textures.pyramid);
        gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, offset, 0, 0, 0, size, size);
        gl.bindTexture(gl.TEXTURE_2D, null);

        offset += size;
        //gl.disable(gl.SCISSOR_TEST);
      }

      // Read the total active cells.
      this.drawQuad(this.programs.packFloat, this.framebuffers.totalActive, {
        data: this.textures.pyramidLvls[0],
        invMax: Math.pow(VOXELS_TEX_SIZE, -2)
      });

      var pixels = new Uint8Array(4);
      this.gl.readPixels(0, 0, 1, 1, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);
      var activeCells = pixels[0] + pixels[1] / 255 + pixels[2] / 65025 + pixels[3] / 160581375;
      activeCells *= Math.pow(VOXELS_TEX_SIZE, 2) / 255;
      this.activeCells = Math.round(activeCells);
    }
  }, {
    key: 'createTriangles',
    value: function createTriangles() {
      // Parse the pyramid for compaction.
      this.drawPoints(this.programs.compact, this.framebuffers.traversal, this.buffers.compact, {
        base: this.textures.activity,
        pyramid: this.textures.pyramid
      }, this.activeCells);

      // Create triangles.
      this.drawPoints(this.programs.triangleCreator, this.framebuffers.triangles, this.buffers.creator, {
        cellSize: 1 / this.nVoxels,
        isolevel: this.isolevel,
        potentials: this.textures.nodes,
        traversal: this.textures.traversal,
        mcCases: this.textures.mcCases
      }, 4 * this.activeCells);
    }
  }, {
    key: 'drawParticles',
    value: function drawParticles(program, framebuffer, uniforms) {
      var clear = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
      var add = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

      this.drawPoints(program, framebuffer, this.buffers.particles, uniforms, this.nParticles, clear, add);
    }
  }, {
    key: 'drawQuad',
    value: function drawQuad(program, framebuffer, uniforms) {
      var gl = this.gl;


      gl.useProgram(program);
      utils.setUniforms(program, uniforms);
      utils.setBuffersAndAttributes(gl, program, this.buffers.quad);

      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.viewport(0, 0, framebuffer.size, framebuffer.size);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  }, {
    key: 'drawPoints',
    value: function drawPoints(program, framebuffer, buffers, uniforms, count) {
      var clear = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : false;
      var add = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : false;
      var gl = this.gl;


      gl.useProgram(program);
      utils.setUniforms(program, uniforms);
      utils.setBuffersAndAttributes(gl, program, buffers);

      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.viewport(0, 0, framebuffer.size, framebuffer.size);

      if (add) {
        gl.enable(gl.BLEND);
        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFunc(gl.ONE, gl.ONE);
      }

      if (clear) {
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }

      gl.drawArrays(gl.POINTS, 0, count);
      if (add) gl.disable(gl.BLEND);
    }
  }]);

  return Simulation;
}();

exports.default = Simulation;

},{"./camera":14,"./geometry":15,"./glsl/bbox.vert":16,"./glsl/cell.vert":17,"./glsl/classic.frag":18,"./glsl/color.frag":19,"./glsl/compact.frag":20,"./glsl/density.frag":21,"./glsl/index2d.vert":22,"./glsl/lagrange.frag":23,"./glsl/mean.frag":24,"./glsl/mean_density.frag":25,"./glsl/node.frag":26,"./glsl/pack_float.frag":27,"./glsl/particle.vert":28,"./glsl/pyramid.frag":29,"./glsl/quad.vert":30,"./glsl/relevant.frag":31,"./glsl/render_surface.vert":32,"./glsl/simple.vert":33,"./glsl/sphere.vert":34,"./glsl/spread.frag":35,"./glsl/traversal.vert":36,"./glsl/triangle_creator.frag":37,"./mc_cases":40,"./mouse":41,"./utils":44,"gl-matrix":9}],44:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.compileVertexShader = compileVertexShader;
exports.compileFragmentShader = compileFragmentShader;
exports.createProgram = createProgram;
exports.setUniforms = setUniforms;
exports.setBuffersAndAttributes = setBuffersAndAttributes;
exports.createBuffers = createBuffers;
exports.createTexture = createTexture;
exports.createTextureFromImage = createTextureFromImage;
exports.fillTexture = fillTexture;
exports.createFramebuffer = createFramebuffer;
exports.createMRTFramebuffer = createMRTFramebuffer;

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function compileVertexShader(gl, source) {
  return compileShader(gl, source, gl.VERTEX_SHADER);
}

function compileFragmentShader(gl, source) {
  return compileShader(gl, source, gl.FRAGMENT_SHADER);
}

function compileShader(gl, source, type) {
  var shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Could not compile shader: ' + gl.getShaderInfoLog(shader));

  return shader;
}

function createProgram(gl, vs, fs) {
  var program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Program failed to link: ' + gl.getProgramInfoLog(program));

  program.uniformSetters = createUniformSetters(gl, program);
  program.attribSetters = createAttributeSetters(gl, program);

  return program;
}

function createUniformSetters(gl, program) {
  var setters = Object.create(null);
  var count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  var textureUnit = 0;

  for (var i = 0; i < count; ++i) {
    var info = gl.getActiveUniform(program, i);
    if (!info) break;

    var name = info.name.replace('[0]', '');
    setters[name] = createUniformSetter(info);
  }

  return setters;

  function createUniformSetter(info) {
    var location = gl.getUniformLocation(program, info.name);
    var isArray = info.size > 1 && ~info.name.indexOf('[0]');

    switch (info.type) {
      case gl.FLOAT:
        return isArray ? function (v) {
          return gl.uniform1fv(location, v);
        } : function (v) {
          return gl.uniform1f(location, v);
        };
      case gl.FLOAT_VEC2:
        return function (v) {
          return gl.uniform2fv(location, v);
        };
      case gl.FLOAT_VEC3:
        return function (v) {
          return gl.uniform3fv(location, v);
        };
      case gl.FLOAT_VEC4:
        return function (v) {
          return gl.uniform4fv(location, v);
        };
      case gl.INT:
        return isArray ? function (v) {
          return gl.uniform1iv(location, v);
        } : function (v) {
          return gl.uniform1i(location, v);
        };
      case gl.INT_VEC2:
        return function (v) {
          return gl.uniform2iv(location, v);
        };
      case gl.INT_VEC3:
        return function (v) {
          return gl.uniform3iv(location, v);
        };
      case gl.INT_VEC4:
        return function (v) {
          return gl.uniform4iv(location, v);
        };
      case gl.BOOL:
        return isArray ? function (v) {
          return gl.uniform1iv(location, v);
        } : function (v) {
          return gl.uniform1i(location, v);
        };
      case gl.BOOL_VEC2:
        return function (v) {
          return gl.uniform2iv(location, v);
        };
      case gl.BOOL_VEC3:
        return function (v) {
          return gl.uniform3iv(location, v);
        };
      case gl.BOOL_VEC4:
        return function (v) {
          return gl.uniform4iv(location, v);
        };
      case gl.FLOAT_MAT2:
        return function (v) {
          return gl.uniformMatrix2fv(location, false, v);
        };
      case gl.FLOAT_MAT3:
        return function (v) {
          return gl.uniformMatrix3fv(location, false, v);
        };
      case gl.FLOAT_MAT4:
        return function (v) {
          return gl.uniformMatrix4fv(location, false, v);
        };
      case gl.SAMPLER_2D:
      case gl.SAMPLER_CUBE:
        {
          var bindPoint = info.type === gl.SAMPLER_2D ? gl.TEXTURE_2D : gl.TEXTURE_CUBE_MAP;

          if (isArray) {
            var units = [];

            for (var _i = 0; _i < info.size; ++_i) {
              units.push(textureUnit++);
            }return function (textures) {
              gl.uniform1iv(location, units);
              for (var _i2 = 0; _i2 < textures.length; ++_i2) {
                gl.activeTexture(gl.TEXTURE0 + units[_i2]);
                gl.bindTexture(bindPoint, textures[_i2]);
              }
            };
          } else {
            var unit = textureUnit++;

            return function (texture) {
              gl.uniform1i(location, unit);
              gl.activeTexture(gl.TEXTURE0 + unit);
              gl.bindTexture(bindPoint, texture);
            };
          }
        }
      default:
        throw new Error('Unknown type: 0x' + info.type.toString(16));
    }
  }
}

function createAttributeSetters(gl, program) {
  var setters = Object.create(null);
  var count = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);

  for (var i = 0; i < count; ++i) {
    var info = gl.getActiveAttrib(program, i);
    if (!info) break;

    setters[info.name] = createAttributeSetter(info);
  }

  return setters;

  function createAttributeSetter(info) {
    var location = gl.getAttribLocation(program, info.name);

    return function (b) {
      gl.bindBuffer(gl.ARRAY_BUFFER, b.buffer);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, b.dims, gl.FLOAT, false, 0, 0);
    };
  }
}

function setUniforms(program, values) {
  var setters = program.uniformSetters;

  for (var name in values) {
    if (name in setters) setters[name](values[name]);
  }
}

function setBuffersAndAttributes(gl, program, buffers) {
  var attribs = buffers.attribs,
      indices = buffers.indices;

  var setters = program.attribSetters;

  for (var name in attribs) {
    if (name in setters) setters[name](attribs[name]);
  }if (indices) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
}

function createBuffers(gl, arrays, indices) {
  var attribs = Object.create(null);

  for (var name in arrays) {
    var _arrays$name = arrays[name],
        data = _arrays$name.data,
        dims = _arrays$name.dims;

    var typed = data instanceof Float32Array ? data : new Float32Array(data);

    attribs[name] = {
      buffer: createBufferFromTypedArray(gl, typed, gl.ARRAY_BUFFER),
      dims: dims
    };
  }

  if (indices) {
    indices = indices instanceof Uint16Array ? indices : new Uint16Array(indices);
    indices = createBufferFromTypedArray(gl, indices, gl.ELEMENT_ARRAY_BUFFER);
  }

  return { attribs: attribs, indices: indices };
}

function createBufferFromTypedArray(gl, array, type) {
  var buffer = gl.createBuffer();
  gl.bindBuffer(type, buffer);
  gl.bufferData(type, array, gl.STATIC_DRAW);
  return buffer;
}

function sizedInternalFormat(gl, format, type) {
  if (format === gl.RGBA) {
    if (type === gl.FLOAT) return gl.RGBA32F;
    if (type === gl.HALF_FLOAT) return gl.RGBA16F;
    if (type === gl.UNSIGNED_BYTE) return gl.RGBA8;
  }
  if (format === gl.RGB) {
    if (type === gl.FLOAT) return gl.RGB32F;
    if (type === gl.HALF_FLOAT) return gl.RGB16F;
    if (type === gl.UNSIGNED_BYTE) return gl.RGB8;
  }
  return format;
}

function createTexture(gl, size, format, filter, type) {
  var data = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : null;

  var texture = gl.createTexture();
  var internalFormat = sizedInternalFormat(gl, format, type);

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, size, size, 0, format, type, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindTexture(gl.TEXTURE_2D, null);

  texture.size = size;
  return texture;
}

function createTextureFromImage(gl, format, magFilter, minFilter, image) {
  (0, _assert2.default)(image.complete);

  var texture = gl.createTexture();
  var internalFormat = sizedInternalFormat(gl, format, gl.UNSIGNED_BYTE);

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, format, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  if (minFilter != gl.NEAREST && minFilter != gl.LINEAR) gl.generateMipmap(gl.TEXTURE_2D);

  gl.bindTexture(gl.TEXTURE_2D, null);
  return texture;
}

function fillTexture(gl, texture, format, type, data) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  var _ref = [texture.size, data.length / texture.size / 4],
      w = _ref[0],
      h = _ref[1];

  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w, h, format, type, data);
  gl.bindTexture(gl.TEXTURE_2D, null);
}

function createFramebuffer(gl, texture) {
  var framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  checkFramebuffer(gl, framebuffer);

  framebuffer.size = texture.size;
  return framebuffer;
}

function createMRTFramebuffer(gl) {
  for (var _len = arguments.length, textures = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    textures[_key - 1] = arguments[_key];
  }

  var size = textures[0].size;
  (0, _assert2.default)(textures.every(function (tex) {
    return tex.size === size;
  }));

  var framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

  var attach = textures.map(function (_, i) {
    return gl['COLOR_ATTACHMENT' + i];
  });

  for (var i = 0; i < attach.length; ++i) {
    gl.framebufferTexture2D(gl.FRAMEBUFFER, attach[i], gl.TEXTURE_2D, textures[i], 0);
  }gl.drawBuffers(attach);

  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  checkFramebuffer(gl, framebuffer);

  framebuffer.size = size;
  return framebuffer;
}

function checkFramebuffer(gl, framebuffer) {
  switch (gl.checkFramebufferStatus(gl.FRAMEBUFFER)) {
    case gl.FRAMEBUFFER_COMPLETE:
      break;
    case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
      throw new Error('Incomplete framebuffer: attachment');
    case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
      throw new Error('Incomplete framebuffer: missing attachment');
    case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
      throw new Error('Incomplete framebuffer: incomplete dimensions');
    case gl.FRAMEBUFFER_UNSUPPORTED:
      throw new Error('Incomplete framebuffer: unsupported');
    default:
      throw new Error('Incomplete framebuffer: 0x' + status.toString(16));
  }
}

},{"assert":1}],45:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['Simulation'], ['Simulation']),
    _templateObject2 = _taggedTemplateLiteral(['Rendering'], ['Rendering']);

var _stats = require('stats.js');

var _stats2 = _interopRequireDefault(_stats);

require('./polyfill');

var _gui = require('./gui');

var _gui2 = _interopRequireDefault(_gui);

var _simulation = require('./simulation');

var _simulation2 = _interopRequireDefault(_simulation);

var _locale = require('./locale');

var _locale2 = _interopRequireDefault(_locale);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

init();

function init() {
  var canvas = document.getElementById('area');
  var tiles = document.getElementById('tiles');

  tiles.complete ? onload() : tiles.onload = onload;

  function onload() {
    try {
      var simulation = initSimulation(canvas, tiles);
      var stats = initStats();

      runSimulation(canvas, simulation, stats);
    } catch (ex) {
      console && console.error(ex);
      document.body.innerHTML = 'Sorry, fatal error:<br>' + ex.message;
    }
  };
}

function initSimulation(canvas, tiles) {
  var gl = canvas.getContext('webgl2');

  // Required for RGBA32F framebuffer attachments (color-renderable float textures).
  var extColorBufferFloat = gl.getExtension('EXT_color_buffer_float');
  if (!extColorBufferFloat) throw new Error('EXT_color_buffer_float is not supported');

  // Required for gl.BLEND on float framebuffer attachments.
  gl.getExtension('EXT_float_blend');

  var simulation = new _simulation2.default(gl, { tiles: tiles });
  var gui = new _gui2.default(simulation);

  window.addEventListener('resize', adjustCanvasSize);
  adjustCanvasSize();

  function adjustCanvasSize() {
    var factor = window.devicePixelRatio || 1;
    canvas.width = Math.floor(canvas.clientWidth * factor);
    canvas.height = Math.floor(canvas.clientHeight * factor);
    simulation.resize();
  }

  return simulation;
}

function initStats() {
  var stats = document.getElementById('stats');

  stats.appendChild(document.createTextNode((0, _locale2.default)(_templateObject)));
  var logic = new _stats2.default();
  stats.appendChild(logic.domElement);

  stats.appendChild(document.createTextNode((0, _locale2.default)(_templateObject2)));
  var render = new _stats2.default();
  stats.appendChild(render.domElement);

  return { logic: logic, render: render };
}

function runSimulation(canvas, simulation, stats) {
  var past = void 0;

  requestAnimationFrame(function loop(now) {
    if (!past) past = now;

    if (!document.hidden) {
      var delta = now - past;

      if (simulation.realtime) {
        var amount = delta / (simulation.deltaT * 1000) | 0;
        now -= delta % (simulation.deltaT * 1000);

        for (var i = 0; i < amount; ++i) {
          simulation.step();
          stats.logic.update();
        }
      } else {
        simulation.step();
        stats.logic.update();
      }

      simulation.render();
      stats.render.update();
    }

    past = now;
    requestAnimationFrame(loop, canvas);
  }, canvas);
}

},{"./gui":38,"./locale":39,"./polyfill":42,"./simulation":43,"stats.js":13}]},{},[45]);
