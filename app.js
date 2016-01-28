(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],2:[function(require,module,exports){

},{}],3:[function(require,module,exports){
(function (global){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('isarray')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var rootParent = {}

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Safari 5-7 lacks support for changing the `Object.prototype.constructor` property
 *     on objects.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

function typedArraySupport () {
  function Bar () {}
  try {
    var arr = new Uint8Array(1)
    arr.foo = function () { return 42 }
    arr.constructor = Bar
    return arr.foo() === 42 && // typed array instances can be augmented
        arr.constructor === Bar && // constructor can be set
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (arg) {
  if (!(this instanceof Buffer)) {
    // Avoid going through an ArgumentsAdaptorTrampoline in the common case.
    if (arguments.length > 1) return new Buffer(arg, arguments[1])
    return new Buffer(arg)
  }

  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    this.length = 0
    this.parent = undefined
  }

  // Common case.
  if (typeof arg === 'number') {
    return fromNumber(this, arg)
  }

  // Slightly less common case.
  if (typeof arg === 'string') {
    return fromString(this, arg, arguments.length > 1 ? arguments[1] : 'utf8')
  }

  // Unusual.
  return fromObject(this, arg)
}

function fromNumber (that, length) {
  that = allocate(that, length < 0 ? 0 : checked(length) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < length; i++) {
      that[i] = 0
    }
  }
  return that
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') encoding = 'utf8'

  // Assumption: byteLength() return value is always < kMaxLength.
  var length = byteLength(string, encoding) | 0
  that = allocate(that, length)

  that.write(string, encoding)
  return that
}

function fromObject (that, object) {
  if (Buffer.isBuffer(object)) return fromBuffer(that, object)

  if (isArray(object)) return fromArray(that, object)

  if (object == null) {
    throw new TypeError('must start with number, buffer, array or string')
  }

  if (typeof ArrayBuffer !== 'undefined') {
    if (object.buffer instanceof ArrayBuffer) {
      return fromTypedArray(that, object)
    }
    if (object instanceof ArrayBuffer) {
      return fromArrayBuffer(that, object)
    }
  }

  if (object.length) return fromArrayLike(that, object)

  return fromJsonObject(that, object)
}

function fromBuffer (that, buffer) {
  var length = checked(buffer.length) | 0
  that = allocate(that, length)
  buffer.copy(that, 0, 0, length)
  return that
}

function fromArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Duplicate of fromArray() to keep fromArray() monomorphic.
function fromTypedArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  // Truncating the elements is probably not what people expect from typed
  // arrays with BYTES_PER_ELEMENT > 1 but it's compatible with the behavior
  // of the old Buffer constructor.
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    array.byteLength
    that = Buffer._augment(new Uint8Array(array))
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromTypedArray(that, new Uint8Array(array))
  }
  return that
}

function fromArrayLike (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Deserialize { type: 'Buffer', data: [1,2,3,...] } into a Buffer object.
// Returns a zero-length buffer for inputs that don't conform to the spec.
function fromJsonObject (that, object) {
  var array
  var length = 0

  if (object.type === 'Buffer' && isArray(object.data)) {
    array = object.data
    length = checked(array.length) | 0
  }
  that = allocate(that, length)

  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
} else {
  // pre-set for values that may exist in the future
  Buffer.prototype.length = undefined
  Buffer.prototype.parent = undefined
}

function allocate (that, length) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = Buffer._augment(new Uint8Array(length))
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that.length = length
    that._isBuffer = true
  }

  var fromPool = length !== 0 && length <= Buffer.poolSize >>> 1
  if (fromPool) that.parent = rootParent

  return that
}

function checked (length) {
  // Note: cannot use `length < kMaxLength` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (subject, encoding) {
  if (!(this instanceof SlowBuffer)) return new SlowBuffer(subject, encoding)

  var buf = new Buffer(subject, encoding)
  delete buf.parent
  return buf
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  var i = 0
  var len = Math.min(x, y)
  while (i < len) {
    if (a[i] !== b[i]) break

    ++i
  }

  if (i !== len) {
    x = a[i]
    y = b[i]
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) throw new TypeError('list argument must be an Array of Buffers.')

  if (list.length === 0) {
    return new Buffer(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; i++) {
      length += list[i].length
    }
  }

  var buf = new Buffer(length)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

function byteLength (string, encoding) {
  if (typeof string !== 'string') string = '' + string

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'binary':
      // Deprecated
      case 'raw':
      case 'raws':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  start = start | 0
  end = end === undefined || end === Infinity ? this.length : end | 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return 0
  return Buffer.compare(this, b)
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset) {
  if (byteOffset > 0x7fffffff) byteOffset = 0x7fffffff
  else if (byteOffset < -0x80000000) byteOffset = -0x80000000
  byteOffset >>= 0

  if (this.length === 0) return -1
  if (byteOffset >= this.length) return -1

  // Negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

  if (typeof val === 'string') {
    if (val.length === 0) return -1 // special case: looking for empty string always fails
    return String.prototype.indexOf.call(this, val, byteOffset)
  }
  if (Buffer.isBuffer(val)) {
    return arrayIndexOf(this, val, byteOffset)
  }
  if (typeof val === 'number') {
    if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
      return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
    }
    return arrayIndexOf(this, [ val ], byteOffset)
  }

  function arrayIndexOf (arr, val, byteOffset) {
    var foundIndex = -1
    for (var i = 0; byteOffset + i < arr.length; i++) {
      if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === val.length) return byteOffset + foundIndex
      } else {
        foundIndex = -1
      }
    }
    return -1
  }

  throw new TypeError('val must be string, number or Buffer')
}

// `get` is deprecated
Buffer.prototype.get = function get (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` is deprecated
Buffer.prototype.set = function set (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) throw new Error('Invalid hex string')
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    var swap = encoding
    encoding = offset
    offset = length | 0
    length = swap
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'binary':
        return binaryWrite(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function binarySlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
  }

  if (newBuf.length) newBuf.parent = this.parent || this

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
  if (offset < 0) throw new RangeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; i--) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; i++) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), targetStart)
  }

  return len
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new RangeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function toArrayBuffer () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function _augment (arr) {
  arr.constructor = Buffer
  arr._isBuffer = true

  // save reference to original Uint8Array set method before overwriting
  arr._set = arr.set

  // deprecated
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.indexOf = BP.indexOf
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUIntLE = BP.readUIntLE
  arr.readUIntBE = BP.readUIntBE
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readIntLE = BP.readIntLE
  arr.readIntBE = BP.readIntBE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUIntLE = BP.writeUIntLE
  arr.writeUIntBE = BP.writeUIntBE
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeIntLE = BP.writeIntLE
  arr.writeIntBE = BP.writeIntBE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; i++) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"base64-js":1,"ieee754":5,"isarray":4}],4:[function(require,module,exports){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

},{}],5:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],6:[function(require,module,exports){
(function (global){
var topLevel = typeof global !== 'undefined' ? global :
    typeof window !== 'undefined' ? window : {}
var minDoc = require('min-document');

if (typeof document !== 'undefined') {
    module.exports = document;
} else {
    var doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'];

    if (!doccy) {
        doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'] = minDoc;
    }

    module.exports = doccy;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"min-document":2}],7:[function(require,module,exports){
"use strict";

module.exports = function isObject(x) {
	return typeof x === "object" && x !== null;
};

},{}],8:[function(require,module,exports){
var createElement = require("./vdom/create-element.js")

module.exports = createElement

},{"./vdom/create-element.js":12}],9:[function(require,module,exports){
var diff = require("./vtree/diff.js")

module.exports = diff

},{"./vtree/diff.js":29}],10:[function(require,module,exports){
var patch = require("./vdom/patch.js")

module.exports = patch

},{"./vdom/patch.js":15}],11:[function(require,module,exports){
var isObject = require("is-object")
var isHook = require("../vnode/is-vhook.js")

module.exports = applyProperties

function applyProperties(node, props, previous) {
    for (var propName in props) {
        var propValue = props[propName]

        if (propValue === undefined) {
            removeProperty(node, propName, propValue, previous);
        } else if (isHook(propValue)) {
            removeProperty(node, propName, propValue, previous)
            if (propValue.hook) {
                propValue.hook(node,
                    propName,
                    previous ? previous[propName] : undefined)
            }
        } else {
            if (isObject(propValue)) {
                patchObject(node, props, previous, propName, propValue);
            } else {
                node[propName] = propValue
            }
        }
    }
}

function removeProperty(node, propName, propValue, previous) {
    if (previous) {
        var previousValue = previous[propName]

        if (!isHook(previousValue)) {
            if (propName === "attributes") {
                for (var attrName in previousValue) {
                    node.removeAttribute(attrName)
                }
            } else if (propName === "style") {
                for (var i in previousValue) {
                    node.style[i] = ""
                }
            } else if (typeof previousValue === "string") {
                node[propName] = ""
            } else {
                node[propName] = null
            }
        } else if (previousValue.unhook) {
            previousValue.unhook(node, propName, propValue)
        }
    }
}

function patchObject(node, props, previous, propName, propValue) {
    var previousValue = previous ? previous[propName] : undefined

    // Set attributes
    if (propName === "attributes") {
        for (var attrName in propValue) {
            var attrValue = propValue[attrName]

            if (attrValue === undefined) {
                node.removeAttribute(attrName)
            } else {
                node.setAttribute(attrName, attrValue)
            }
        }

        return
    }

    if(previousValue && isObject(previousValue) &&
        getPrototype(previousValue) !== getPrototype(propValue)) {
        node[propName] = propValue
        return
    }

    if (!isObject(node[propName])) {
        node[propName] = {}
    }

    var replacer = propName === "style" ? "" : undefined

    for (var k in propValue) {
        var value = propValue[k]
        node[propName][k] = (value === undefined) ? replacer : value
    }
}

function getPrototype(value) {
    if (Object.getPrototypeOf) {
        return Object.getPrototypeOf(value)
    } else if (value.__proto__) {
        return value.__proto__
    } else if (value.constructor) {
        return value.constructor.prototype
    }
}

},{"../vnode/is-vhook.js":20,"is-object":7}],12:[function(require,module,exports){
var document = require("global/document")

var applyProperties = require("./apply-properties")

var isVNode = require("../vnode/is-vnode.js")
var isVText = require("../vnode/is-vtext.js")
var isWidget = require("../vnode/is-widget.js")
var handleThunk = require("../vnode/handle-thunk.js")

module.exports = createElement

function createElement(vnode, opts) {
    var doc = opts ? opts.document || document : document
    var warn = opts ? opts.warn : null

    vnode = handleThunk(vnode).a

    if (isWidget(vnode)) {
        return vnode.init()
    } else if (isVText(vnode)) {
        return doc.createTextNode(vnode.text)
    } else if (!isVNode(vnode)) {
        if (warn) {
            warn("Item is not a valid virtual dom node", vnode)
        }
        return null
    }

    var node = (vnode.namespace === null) ?
        doc.createElement(vnode.tagName) :
        doc.createElementNS(vnode.namespace, vnode.tagName)

    var props = vnode.properties
    applyProperties(node, props)

    var children = vnode.children

    for (var i = 0; i < children.length; i++) {
        var childNode = createElement(children[i], opts)
        if (childNode) {
            node.appendChild(childNode)
        }
    }

    return node
}

},{"../vnode/handle-thunk.js":18,"../vnode/is-vnode.js":21,"../vnode/is-vtext.js":22,"../vnode/is-widget.js":23,"./apply-properties":11,"global/document":6}],13:[function(require,module,exports){
// Maps a virtual DOM tree onto a real DOM tree in an efficient manner.
// We don't want to read all of the DOM nodes in the tree so we use
// the in-order tree indexing to eliminate recursion down certain branches.
// We only recurse into a DOM node if we know that it contains a child of
// interest.

var noChild = {}

module.exports = domIndex

function domIndex(rootNode, tree, indices, nodes) {
    if (!indices || indices.length === 0) {
        return {}
    } else {
        indices.sort(ascending)
        return recurse(rootNode, tree, indices, nodes, 0)
    }
}

function recurse(rootNode, tree, indices, nodes, rootIndex) {
    nodes = nodes || {}


    if (rootNode) {
        if (indexInRange(indices, rootIndex, rootIndex)) {
            nodes[rootIndex] = rootNode
        }

        var vChildren = tree.children

        if (vChildren) {

            var childNodes = rootNode.childNodes

            for (var i = 0; i < tree.children.length; i++) {
                rootIndex += 1

                var vChild = vChildren[i] || noChild
                var nextIndex = rootIndex + (vChild.count || 0)

                // skip recursion down the tree if there are no nodes down here
                if (indexInRange(indices, rootIndex, nextIndex)) {
                    recurse(childNodes[i], vChild, indices, nodes, rootIndex)
                }

                rootIndex = nextIndex
            }
        }
    }

    return nodes
}

// Binary search for an index in the interval [left, right]
function indexInRange(indices, left, right) {
    if (indices.length === 0) {
        return false
    }

    var minIndex = 0
    var maxIndex = indices.length - 1
    var currentIndex
    var currentItem

    while (minIndex <= maxIndex) {
        currentIndex = ((maxIndex + minIndex) / 2) >> 0
        currentItem = indices[currentIndex]

        if (minIndex === maxIndex) {
            return currentItem >= left && currentItem <= right
        } else if (currentItem < left) {
            minIndex = currentIndex + 1
        } else  if (currentItem > right) {
            maxIndex = currentIndex - 1
        } else {
            return true
        }
    }

    return false;
}

function ascending(a, b) {
    return a > b ? 1 : -1
}

},{}],14:[function(require,module,exports){
var applyProperties = require("./apply-properties")

var isWidget = require("../vnode/is-widget.js")
var VPatch = require("../vnode/vpatch.js")

var updateWidget = require("./update-widget")

module.exports = applyPatch

function applyPatch(vpatch, domNode, renderOptions) {
    var type = vpatch.type
    var vNode = vpatch.vNode
    var patch = vpatch.patch

    switch (type) {
        case VPatch.REMOVE:
            return removeNode(domNode, vNode)
        case VPatch.INSERT:
            return insertNode(domNode, patch, renderOptions)
        case VPatch.VTEXT:
            return stringPatch(domNode, vNode, patch, renderOptions)
        case VPatch.WIDGET:
            return widgetPatch(domNode, vNode, patch, renderOptions)
        case VPatch.VNODE:
            return vNodePatch(domNode, vNode, patch, renderOptions)
        case VPatch.ORDER:
            reorderChildren(domNode, patch)
            return domNode
        case VPatch.PROPS:
            applyProperties(domNode, patch, vNode.properties)
            return domNode
        case VPatch.THUNK:
            return replaceRoot(domNode,
                renderOptions.patch(domNode, patch, renderOptions))
        default:
            return domNode
    }
}

function removeNode(domNode, vNode) {
    var parentNode = domNode.parentNode

    if (parentNode) {
        parentNode.removeChild(domNode)
    }

    destroyWidget(domNode, vNode);

    return null
}

function insertNode(parentNode, vNode, renderOptions) {
    var newNode = renderOptions.render(vNode, renderOptions)

    if (parentNode) {
        parentNode.appendChild(newNode)
    }

    return parentNode
}

function stringPatch(domNode, leftVNode, vText, renderOptions) {
    var newNode

    if (domNode.nodeType === 3) {
        domNode.replaceData(0, domNode.length, vText.text)
        newNode = domNode
    } else {
        var parentNode = domNode.parentNode
        newNode = renderOptions.render(vText, renderOptions)

        if (parentNode && newNode !== domNode) {
            parentNode.replaceChild(newNode, domNode)
        }
    }

    return newNode
}

function widgetPatch(domNode, leftVNode, widget, renderOptions) {
    var updating = updateWidget(leftVNode, widget)
    var newNode

    if (updating) {
        newNode = widget.update(leftVNode, domNode) || domNode
    } else {
        newNode = renderOptions.render(widget, renderOptions)
    }

    var parentNode = domNode.parentNode

    if (parentNode && newNode !== domNode) {
        parentNode.replaceChild(newNode, domNode)
    }

    if (!updating) {
        destroyWidget(domNode, leftVNode)
    }

    return newNode
}

function vNodePatch(domNode, leftVNode, vNode, renderOptions) {
    var parentNode = domNode.parentNode
    var newNode = renderOptions.render(vNode, renderOptions)

    if (parentNode && newNode !== domNode) {
        parentNode.replaceChild(newNode, domNode)
    }

    return newNode
}

function destroyWidget(domNode, w) {
    if (typeof w.destroy === "function" && isWidget(w)) {
        w.destroy(domNode)
    }
}

function reorderChildren(domNode, moves) {
    var childNodes = domNode.childNodes
    var keyMap = {}
    var node
    var remove
    var insert

    for (var i = 0; i < moves.removes.length; i++) {
        remove = moves.removes[i]
        node = childNodes[remove.from]
        if (remove.key) {
            keyMap[remove.key] = node
        }
        domNode.removeChild(node)
    }

    var length = childNodes.length
    for (var j = 0; j < moves.inserts.length; j++) {
        insert = moves.inserts[j]
        node = keyMap[insert.key]
        // this is the weirdest bug i've ever seen in webkit
        domNode.insertBefore(node, insert.to >= length++ ? null : childNodes[insert.to])
    }
}

function replaceRoot(oldRoot, newRoot) {
    if (oldRoot && newRoot && oldRoot !== newRoot && oldRoot.parentNode) {
        oldRoot.parentNode.replaceChild(newRoot, oldRoot)
    }

    return newRoot;
}

},{"../vnode/is-widget.js":23,"../vnode/vpatch.js":26,"./apply-properties":11,"./update-widget":16}],15:[function(require,module,exports){
var document = require("global/document")
var isArray = require("x-is-array")

var render = require("./create-element")
var domIndex = require("./dom-index")
var patchOp = require("./patch-op")
module.exports = patch

function patch(rootNode, patches, renderOptions) {
    renderOptions = renderOptions || {}
    renderOptions.patch = renderOptions.patch && renderOptions.patch !== patch
        ? renderOptions.patch
        : patchRecursive
    renderOptions.render = renderOptions.render || render

    return renderOptions.patch(rootNode, patches, renderOptions)
}

function patchRecursive(rootNode, patches, renderOptions) {
    var indices = patchIndices(patches)

    if (indices.length === 0) {
        return rootNode
    }

    var index = domIndex(rootNode, patches.a, indices)
    var ownerDocument = rootNode.ownerDocument

    if (!renderOptions.document && ownerDocument !== document) {
        renderOptions.document = ownerDocument
    }

    for (var i = 0; i < indices.length; i++) {
        var nodeIndex = indices[i]
        rootNode = applyPatch(rootNode,
            index[nodeIndex],
            patches[nodeIndex],
            renderOptions)
    }

    return rootNode
}

function applyPatch(rootNode, domNode, patchList, renderOptions) {
    if (!domNode) {
        return rootNode
    }

    var newNode

    if (isArray(patchList)) {
        for (var i = 0; i < patchList.length; i++) {
            newNode = patchOp(patchList[i], domNode, renderOptions)

            if (domNode === rootNode) {
                rootNode = newNode
            }
        }
    } else {
        newNode = patchOp(patchList, domNode, renderOptions)

        if (domNode === rootNode) {
            rootNode = newNode
        }
    }

    return rootNode
}

function patchIndices(patches) {
    var indices = []

    for (var key in patches) {
        if (key !== "a") {
            indices.push(Number(key))
        }
    }

    return indices
}

},{"./create-element":12,"./dom-index":13,"./patch-op":14,"global/document":6,"x-is-array":30}],16:[function(require,module,exports){
var isWidget = require("../vnode/is-widget.js")

module.exports = updateWidget

function updateWidget(a, b) {
    if (isWidget(a) && isWidget(b)) {
        if ("name" in a && "name" in b) {
            return a.id === b.id
        } else {
            return a.init === b.init
        }
    }

    return false
}

},{"../vnode/is-widget.js":23}],17:[function(require,module,exports){
'use strict';

module.exports = SoftSetHook;

function SoftSetHook(value) {
    if (!(this instanceof SoftSetHook)) {
        return new SoftSetHook(value);
    }

    this.value = value;
}

SoftSetHook.prototype.hook = function (node, propertyName) {
    if (node[propertyName] !== this.value) {
        node[propertyName] = this.value;
    }
};

},{}],18:[function(require,module,exports){
var isVNode = require("./is-vnode")
var isVText = require("./is-vtext")
var isWidget = require("./is-widget")
var isThunk = require("./is-thunk")

module.exports = handleThunk

function handleThunk(a, b) {
    var renderedA = a
    var renderedB = b

    if (isThunk(b)) {
        renderedB = renderThunk(b, a)
    }

    if (isThunk(a)) {
        renderedA = renderThunk(a, null)
    }

    return {
        a: renderedA,
        b: renderedB
    }
}

function renderThunk(thunk, previous) {
    var renderedThunk = thunk.vnode

    if (!renderedThunk) {
        renderedThunk = thunk.vnode = thunk.render(previous)
    }

    if (!(isVNode(renderedThunk) ||
            isVText(renderedThunk) ||
            isWidget(renderedThunk))) {
        throw new Error("thunk did not return a valid node");
    }

    return renderedThunk
}

},{"./is-thunk":19,"./is-vnode":21,"./is-vtext":22,"./is-widget":23}],19:[function(require,module,exports){
module.exports = isThunk

function isThunk(t) {
    return t && t.type === "Thunk"
}

},{}],20:[function(require,module,exports){
module.exports = isHook

function isHook(hook) {
    return hook &&
      (typeof hook.hook === "function" && !hook.hasOwnProperty("hook") ||
       typeof hook.unhook === "function" && !hook.hasOwnProperty("unhook"))
}

},{}],21:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualNode

function isVirtualNode(x) {
    return x && x.type === "VirtualNode" && x.version === version
}

},{"./version":24}],22:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualText

function isVirtualText(x) {
    return x && x.type === "VirtualText" && x.version === version
}

},{"./version":24}],23:[function(require,module,exports){
module.exports = isWidget

function isWidget(w) {
    return w && w.type === "Widget"
}

},{}],24:[function(require,module,exports){
module.exports = "2"

},{}],25:[function(require,module,exports){
var version = require("./version")
var isVNode = require("./is-vnode")
var isWidget = require("./is-widget")
var isThunk = require("./is-thunk")
var isVHook = require("./is-vhook")

module.exports = VirtualNode

var noProperties = {}
var noChildren = []

function VirtualNode(tagName, properties, children, key, namespace) {
    this.tagName = tagName
    this.properties = properties || noProperties
    this.children = children || noChildren
    this.key = key != null ? String(key) : undefined
    this.namespace = (typeof namespace === "string") ? namespace : null

    var count = (children && children.length) || 0
    var descendants = 0
    var hasWidgets = false
    var hasThunks = false
    var descendantHooks = false
    var hooks

    for (var propName in properties) {
        if (properties.hasOwnProperty(propName)) {
            var property = properties[propName]
            if (isVHook(property) && property.unhook) {
                if (!hooks) {
                    hooks = {}
                }

                hooks[propName] = property
            }
        }
    }

    for (var i = 0; i < count; i++) {
        var child = children[i]
        if (isVNode(child)) {
            descendants += child.count || 0

            if (!hasWidgets && child.hasWidgets) {
                hasWidgets = true
            }

            if (!hasThunks && child.hasThunks) {
                hasThunks = true
            }

            if (!descendantHooks && (child.hooks || child.descendantHooks)) {
                descendantHooks = true
            }
        } else if (!hasWidgets && isWidget(child)) {
            if (typeof child.destroy === "function") {
                hasWidgets = true
            }
        } else if (!hasThunks && isThunk(child)) {
            hasThunks = true;
        }
    }

    this.count = count + descendants
    this.hasWidgets = hasWidgets
    this.hasThunks = hasThunks
    this.hooks = hooks
    this.descendantHooks = descendantHooks
}

VirtualNode.prototype.version = version
VirtualNode.prototype.type = "VirtualNode"

},{"./is-thunk":19,"./is-vhook":20,"./is-vnode":21,"./is-widget":23,"./version":24}],26:[function(require,module,exports){
var version = require("./version")

VirtualPatch.NONE = 0
VirtualPatch.VTEXT = 1
VirtualPatch.VNODE = 2
VirtualPatch.WIDGET = 3
VirtualPatch.PROPS = 4
VirtualPatch.ORDER = 5
VirtualPatch.INSERT = 6
VirtualPatch.REMOVE = 7
VirtualPatch.THUNK = 8

module.exports = VirtualPatch

function VirtualPatch(type, vNode, patch) {
    this.type = Number(type)
    this.vNode = vNode
    this.patch = patch
}

VirtualPatch.prototype.version = version
VirtualPatch.prototype.type = "VirtualPatch"

},{"./version":24}],27:[function(require,module,exports){
var version = require("./version")

module.exports = VirtualText

function VirtualText(text) {
    this.text = String(text)
}

VirtualText.prototype.version = version
VirtualText.prototype.type = "VirtualText"

},{"./version":24}],28:[function(require,module,exports){
var isObject = require("is-object")
var isHook = require("../vnode/is-vhook")

module.exports = diffProps

function diffProps(a, b) {
    var diff

    for (var aKey in a) {
        if (!(aKey in b)) {
            diff = diff || {}
            diff[aKey] = undefined
        }

        var aValue = a[aKey]
        var bValue = b[aKey]

        if (aValue === bValue) {
            continue
        } else if (isObject(aValue) && isObject(bValue)) {
            if (getPrototype(bValue) !== getPrototype(aValue)) {
                diff = diff || {}
                diff[aKey] = bValue
            } else if (isHook(bValue)) {
                 diff = diff || {}
                 diff[aKey] = bValue
            } else {
                var objectDiff = diffProps(aValue, bValue)
                if (objectDiff) {
                    diff = diff || {}
                    diff[aKey] = objectDiff
                }
            }
        } else {
            diff = diff || {}
            diff[aKey] = bValue
        }
    }

    for (var bKey in b) {
        if (!(bKey in a)) {
            diff = diff || {}
            diff[bKey] = b[bKey]
        }
    }

    return diff
}

function getPrototype(value) {
  if (Object.getPrototypeOf) {
    return Object.getPrototypeOf(value)
  } else if (value.__proto__) {
    return value.__proto__
  } else if (value.constructor) {
    return value.constructor.prototype
  }
}

},{"../vnode/is-vhook":20,"is-object":7}],29:[function(require,module,exports){
var isArray = require("x-is-array")

var VPatch = require("../vnode/vpatch")
var isVNode = require("../vnode/is-vnode")
var isVText = require("../vnode/is-vtext")
var isWidget = require("../vnode/is-widget")
var isThunk = require("../vnode/is-thunk")
var handleThunk = require("../vnode/handle-thunk")

var diffProps = require("./diff-props")

module.exports = diff

function diff(a, b) {
    var patch = { a: a }
    walk(a, b, patch, 0)
    return patch
}

function walk(a, b, patch, index) {
    if (a === b) {
        return
    }

    var apply = patch[index]
    var applyClear = false

    if (isThunk(a) || isThunk(b)) {
        thunks(a, b, patch, index)
    } else if (b == null) {

        // If a is a widget we will add a remove patch for it
        // Otherwise any child widgets/hooks must be destroyed.
        // This prevents adding two remove patches for a widget.
        if (!isWidget(a)) {
            clearState(a, patch, index)
            apply = patch[index]
        }

        apply = appendPatch(apply, new VPatch(VPatch.REMOVE, a, b))
    } else if (isVNode(b)) {
        if (isVNode(a)) {
            if (a.tagName === b.tagName &&
                a.namespace === b.namespace &&
                a.key === b.key) {
                var propsPatch = diffProps(a.properties, b.properties)
                if (propsPatch) {
                    apply = appendPatch(apply,
                        new VPatch(VPatch.PROPS, a, propsPatch))
                }
                apply = diffChildren(a, b, patch, apply, index)
            } else {
                apply = appendPatch(apply, new VPatch(VPatch.VNODE, a, b))
                applyClear = true
            }
        } else {
            apply = appendPatch(apply, new VPatch(VPatch.VNODE, a, b))
            applyClear = true
        }
    } else if (isVText(b)) {
        if (!isVText(a)) {
            apply = appendPatch(apply, new VPatch(VPatch.VTEXT, a, b))
            applyClear = true
        } else if (a.text !== b.text) {
            apply = appendPatch(apply, new VPatch(VPatch.VTEXT, a, b))
        }
    } else if (isWidget(b)) {
        if (!isWidget(a)) {
            applyClear = true
        }

        apply = appendPatch(apply, new VPatch(VPatch.WIDGET, a, b))
    }

    if (apply) {
        patch[index] = apply
    }

    if (applyClear) {
        clearState(a, patch, index)
    }
}

function diffChildren(a, b, patch, apply, index) {
    var aChildren = a.children
    var orderedSet = reorder(aChildren, b.children)
    var bChildren = orderedSet.children

    var aLen = aChildren.length
    var bLen = bChildren.length
    var len = aLen > bLen ? aLen : bLen

    for (var i = 0; i < len; i++) {
        var leftNode = aChildren[i]
        var rightNode = bChildren[i]
        index += 1

        if (!leftNode) {
            if (rightNode) {
                // Excess nodes in b need to be added
                apply = appendPatch(apply,
                    new VPatch(VPatch.INSERT, null, rightNode))
            }
        } else {
            walk(leftNode, rightNode, patch, index)
        }

        if (isVNode(leftNode) && leftNode.count) {
            index += leftNode.count
        }
    }

    if (orderedSet.moves) {
        // Reorder nodes last
        apply = appendPatch(apply, new VPatch(
            VPatch.ORDER,
            a,
            orderedSet.moves
        ))
    }

    return apply
}

function clearState(vNode, patch, index) {
    // TODO: Make this a single walk, not two
    unhook(vNode, patch, index)
    destroyWidgets(vNode, patch, index)
}

// Patch records for all destroyed widgets must be added because we need
// a DOM node reference for the destroy function
function destroyWidgets(vNode, patch, index) {
    if (isWidget(vNode)) {
        if (typeof vNode.destroy === "function") {
            patch[index] = appendPatch(
                patch[index],
                new VPatch(VPatch.REMOVE, vNode, null)
            )
        }
    } else if (isVNode(vNode) && (vNode.hasWidgets || vNode.hasThunks)) {
        var children = vNode.children
        var len = children.length
        for (var i = 0; i < len; i++) {
            var child = children[i]
            index += 1

            destroyWidgets(child, patch, index)

            if (isVNode(child) && child.count) {
                index += child.count
            }
        }
    } else if (isThunk(vNode)) {
        thunks(vNode, null, patch, index)
    }
}

// Create a sub-patch for thunks
function thunks(a, b, patch, index) {
    var nodes = handleThunk(a, b)
    var thunkPatch = diff(nodes.a, nodes.b)
    if (hasPatches(thunkPatch)) {
        patch[index] = new VPatch(VPatch.THUNK, null, thunkPatch)
    }
}

function hasPatches(patch) {
    for (var index in patch) {
        if (index !== "a") {
            return true
        }
    }

    return false
}

// Execute hooks when two nodes are identical
function unhook(vNode, patch, index) {
    if (isVNode(vNode)) {
        if (vNode.hooks) {
            patch[index] = appendPatch(
                patch[index],
                new VPatch(
                    VPatch.PROPS,
                    vNode,
                    undefinedKeys(vNode.hooks)
                )
            )
        }

        if (vNode.descendantHooks || vNode.hasThunks) {
            var children = vNode.children
            var len = children.length
            for (var i = 0; i < len; i++) {
                var child = children[i]
                index += 1

                unhook(child, patch, index)

                if (isVNode(child) && child.count) {
                    index += child.count
                }
            }
        }
    } else if (isThunk(vNode)) {
        thunks(vNode, null, patch, index)
    }
}

function undefinedKeys(obj) {
    var result = {}

    for (var key in obj) {
        result[key] = undefined
    }

    return result
}

// List diff, naive left to right reordering
function reorder(aChildren, bChildren) {
    // O(M) time, O(M) memory
    var bChildIndex = keyIndex(bChildren)
    var bKeys = bChildIndex.keys
    var bFree = bChildIndex.free

    if (bFree.length === bChildren.length) {
        return {
            children: bChildren,
            moves: null
        }
    }

    // O(N) time, O(N) memory
    var aChildIndex = keyIndex(aChildren)
    var aKeys = aChildIndex.keys
    var aFree = aChildIndex.free

    if (aFree.length === aChildren.length) {
        return {
            children: bChildren,
            moves: null
        }
    }

    // O(MAX(N, M)) memory
    var newChildren = []

    var freeIndex = 0
    var freeCount = bFree.length
    var deletedItems = 0

    // Iterate through a and match a node in b
    // O(N) time,
    for (var i = 0 ; i < aChildren.length; i++) {
        var aItem = aChildren[i]
        var itemIndex

        if (aItem.key) {
            if (bKeys.hasOwnProperty(aItem.key)) {
                // Match up the old keys
                itemIndex = bKeys[aItem.key]
                newChildren.push(bChildren[itemIndex])

            } else {
                // Remove old keyed items
                itemIndex = i - deletedItems++
                newChildren.push(null)
            }
        } else {
            // Match the item in a with the next free item in b
            if (freeIndex < freeCount) {
                itemIndex = bFree[freeIndex++]
                newChildren.push(bChildren[itemIndex])
            } else {
                // There are no free items in b to match with
                // the free items in a, so the extra free nodes
                // are deleted.
                itemIndex = i - deletedItems++
                newChildren.push(null)
            }
        }
    }

    var lastFreeIndex = freeIndex >= bFree.length ?
        bChildren.length :
        bFree[freeIndex]

    // Iterate through b and append any new keys
    // O(M) time
    for (var j = 0; j < bChildren.length; j++) {
        var newItem = bChildren[j]

        if (newItem.key) {
            if (!aKeys.hasOwnProperty(newItem.key)) {
                // Add any new keyed items
                // We are adding new items to the end and then sorting them
                // in place. In future we should insert new items in place.
                newChildren.push(newItem)
            }
        } else if (j >= lastFreeIndex) {
            // Add any leftover non-keyed items
            newChildren.push(newItem)
        }
    }

    var simulate = newChildren.slice()
    var simulateIndex = 0
    var removes = []
    var inserts = []
    var simulateItem

    for (var k = 0; k < bChildren.length;) {
        var wantedItem = bChildren[k]
        simulateItem = simulate[simulateIndex]

        // remove items
        while (simulateItem === null && simulate.length) {
            removes.push(remove(simulate, simulateIndex, null))
            simulateItem = simulate[simulateIndex]
        }

        if (!simulateItem || simulateItem.key !== wantedItem.key) {
            // if we need a key in this position...
            if (wantedItem.key) {
                if (simulateItem && simulateItem.key) {
                    // if an insert doesn't put this key in place, it needs to move
                    if (bKeys[simulateItem.key] !== k + 1) {
                        removes.push(remove(simulate, simulateIndex, simulateItem.key))
                        simulateItem = simulate[simulateIndex]
                        // if the remove didn't put the wanted item in place, we need to insert it
                        if (!simulateItem || simulateItem.key !== wantedItem.key) {
                            inserts.push({key: wantedItem.key, to: k})
                        }
                        // items are matching, so skip ahead
                        else {
                            simulateIndex++
                        }
                    }
                    else {
                        inserts.push({key: wantedItem.key, to: k})
                    }
                }
                else {
                    inserts.push({key: wantedItem.key, to: k})
                }
                k++
            }
            // a key in simulate has no matching wanted key, remove it
            else if (simulateItem && simulateItem.key) {
                removes.push(remove(simulate, simulateIndex, simulateItem.key))
            }
        }
        else {
            simulateIndex++
            k++
        }
    }

    // remove all the remaining nodes from simulate
    while(simulateIndex < simulate.length) {
        simulateItem = simulate[simulateIndex]
        removes.push(remove(simulate, simulateIndex, simulateItem && simulateItem.key))
    }

    // If the only moves we have are deletes then we can just
    // let the delete patch remove these items.
    if (removes.length === deletedItems && !inserts.length) {
        return {
            children: newChildren,
            moves: null
        }
    }

    return {
        children: newChildren,
        moves: {
            removes: removes,
            inserts: inserts
        }
    }
}

function remove(arr, index, key) {
    arr.splice(index, 1)

    return {
        from: index,
        key: key
    }
}

function keyIndex(children) {
    var keys = {}
    var free = []
    var length = children.length

    for (var i = 0; i < length; i++) {
        var child = children[i]

        if (child.key) {
            keys[child.key] = i
        } else {
            free.push(i)
        }
    }

    return {
        keys: keys,     // A hash of key name to index
        free: free      // An array of unkeyed item indices
    }
}

function appendPatch(apply, patch) {
    if (apply) {
        if (isArray(apply)) {
            apply.push(patch)
        } else {
            apply = [apply, patch]
        }

        return apply
    } else {
        return patch
    }
}

},{"../vnode/handle-thunk":18,"../vnode/is-thunk":19,"../vnode/is-vnode":21,"../vnode/is-vtext":22,"../vnode/is-widget":23,"../vnode/vpatch":26,"./diff-props":28,"x-is-array":30}],30:[function(require,module,exports){
var nativeIsArray = Array.isArray
var toString = Object.prototype.toString

module.exports = nativeIsArray || isArray

function isArray(obj) {
    return toString.call(obj) === "[object Array]"
}

},{}],31:[function(require,module,exports){
(function (Buffer){
// Generated by psc-bundle 0.7.6.1
var PS = { };
(function(exports) {
  /* global exports */
  "use strict";

  // module Prelude

  //- Functor --------------------------------------------------------------------

  exports.arrayMap = function (f) {
    return function (arr) {
      var l = arr.length;
      var result = new Array(l);
      for (var i = 0; i < l; i++) {
        result[i] = f(arr[i]);
      }
      return result;
    };
  };

  //- Bind -----------------------------------------------------------------------

  exports.arrayBind = function (arr) {
    return function (f) {
      var result = [];
      for (var i = 0, l = arr.length; i < l; i++) {
        Array.prototype.push.apply(result, f(arr[i]));
      }
      return result;
    };
  };

  exports.concatArray = function (xs) {
    return function (ys) {
      return xs.concat(ys);
    };
  };

  exports.numAdd = function (n1) {
    return function (n2) {
      return n1 + n2;
    };
  };

  exports.numMul = function (n1) {
    return function (n2) {
      return n1 * n2;
    };
  };

  //- Eq -------------------------------------------------------------------------

  exports.refEq = function (r1) {
    return function (r2) {
      return r1 === r2;
    };
  };

  //- Ord ------------------------------------------------------------------------

  exports.unsafeCompareImpl = function (lt) {
    return function (eq) {
      return function (gt) {
        return function (x) {
          return function (y) {
            return x < y ? lt : x > y ? gt : eq;
          };
        };
      };
    };
  };                                          

  //- BooleanAlgebra -------------------------------------------------------------

  exports.boolOr = function (b1) {
    return function (b2) {
      return b1 || b2;
    };
  };

  exports.boolAnd = function (b1) {
    return function (b2) {
      return b1 && b2;
    };
  };

  exports.boolNot = function (b) {
    return !b;
  };

  //- Show -----------------------------------------------------------------------

  exports.showIntImpl = function (n) {
    return n.toString();
  };

  exports.showNumberImpl = function (n) {
    /* jshint bitwise: false */
    return n === (n | 0) ? n + ".0" : n.toString();
  };
 
})(PS["Prelude"] = PS["Prelude"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["Prelude"];
  var LT = (function () {
      function LT() {

      };
      LT.value = new LT();
      return LT;
  })();
  var GT = (function () {
      function GT() {

      };
      GT.value = new GT();
      return GT;
  })();
  var EQ = (function () {
      function EQ() {

      };
      EQ.value = new EQ();
      return EQ;
  })();
  var Semigroupoid = function (compose) {
      this.compose = compose;
  };
  var Category = function (__superclass_Prelude$dotSemigroupoid_0, id) {
      this["__superclass_Prelude.Semigroupoid_0"] = __superclass_Prelude$dotSemigroupoid_0;
      this.id = id;
  };
  var Functor = function (map) {
      this.map = map;
  };
  var Apply = function (__superclass_Prelude$dotFunctor_0, apply) {
      this["__superclass_Prelude.Functor_0"] = __superclass_Prelude$dotFunctor_0;
      this.apply = apply;
  };
  var Applicative = function (__superclass_Prelude$dotApply_0, pure) {
      this["__superclass_Prelude.Apply_0"] = __superclass_Prelude$dotApply_0;
      this.pure = pure;
  };
  var Bind = function (__superclass_Prelude$dotApply_0, bind) {
      this["__superclass_Prelude.Apply_0"] = __superclass_Prelude$dotApply_0;
      this.bind = bind;
  };
  var Monad = function (__superclass_Prelude$dotApplicative_0, __superclass_Prelude$dotBind_1) {
      this["__superclass_Prelude.Applicative_0"] = __superclass_Prelude$dotApplicative_0;
      this["__superclass_Prelude.Bind_1"] = __superclass_Prelude$dotBind_1;
  };
  var Semigroup = function (append) {
      this.append = append;
  };
  var Semiring = function (add, mul, one, zero) {
      this.add = add;
      this.mul = mul;
      this.one = one;
      this.zero = zero;
  };
  var Ring = function (__superclass_Prelude$dotSemiring_0, sub) {
      this["__superclass_Prelude.Semiring_0"] = __superclass_Prelude$dotSemiring_0;
      this.sub = sub;
  };
  var Eq = function (eq) {
      this.eq = eq;
  };
  var Ord = function (__superclass_Prelude$dotEq_0, compare) {
      this["__superclass_Prelude.Eq_0"] = __superclass_Prelude$dotEq_0;
      this.compare = compare;
  };
  var Bounded = function (bottom, top) {
      this.bottom = bottom;
      this.top = top;
  };
  var BooleanAlgebra = function (__superclass_Prelude$dotBounded_0, conj, disj, not) {
      this["__superclass_Prelude.Bounded_0"] = __superclass_Prelude$dotBounded_0;
      this.conj = conj;
      this.disj = disj;
      this.not = not;
  };
  var Show = function (show) {
      this.show = show;
  };
  var zero = function (dict) {
      return dict.zero;
  };
  var unsafeCompare = $foreign.unsafeCompareImpl(LT.value)(EQ.value)(GT.value);
  var unit = {};
  var top = function (dict) {
      return dict.top;
  };
  var sub = function (dict) {
      return dict.sub;
  };
  var $minus = function (__dict_Ring_0) {
      return sub(__dict_Ring_0);
  }; 
  var showNumber = new Show($foreign.showNumberImpl);
  var showInt = new Show($foreign.showIntImpl);
  var show = function (dict) {
      return dict.show;
  };             
  var semiringNumber = new Semiring($foreign.numAdd, $foreign.numMul, 1.0, 0.0);
  var semigroupoidFn = new Semigroupoid(function (f) {
      return function (g) {
          return function (x) {
              return f(g(x));
          };
      };
  });
  var semigroupArray = new Semigroup($foreign.concatArray);
  var pure = function (dict) {
      return dict.pure;
  };
  var $$return = function (__dict_Applicative_2) {
      return pure(__dict_Applicative_2);
  };
  var otherwise = true;
  var one = function (dict) {
      return dict.one;
  };
  var not = function (dict) {
      return dict.not;
  };
  var mul = function (dict) {
      return dict.mul;
  };
  var map = function (dict) {
      return dict.map;
  };
  var $less$dollar$greater = function (__dict_Functor_5) {
      return map(__dict_Functor_5);
  };
  var id = function (dict) {
      return dict.id;
  };
  var functorArray = new Functor($foreign.arrayMap);
  var flip = function (f) {
      return function (b) {
          return function (a) {
              return f(a)(b);
          };
      };
  }; 
  var eqString = new Eq($foreign.refEq);
  var eqNumber = new Eq($foreign.refEq);
  var ordNumber = new Ord(function () {
      return eqNumber;
  }, unsafeCompare);
  var eqInt = new Eq($foreign.refEq);
  var eqChar = new Eq($foreign.refEq);
  var eq = function (dict) {
      return dict.eq;
  };
  var $eq$eq = function (__dict_Eq_7) {
      return eq(__dict_Eq_7);
  };
  var disj = function (dict) {
      return dict.disj;
  };
  var $$const = function (a) {
      return function (_3) {
          return a;
      };
  };
  var $$void = function (__dict_Functor_12) {
      return function (fa) {
          return $less$dollar$greater(__dict_Functor_12)($$const(unit))(fa);
      };
  };
  var conj = function (dict) {
      return dict.conj;
  };
  var compose = function (dict) {
      return dict.compose;
  };
  var $greater$greater$greater = function (__dict_Semigroupoid_15) {
      return flip(compose(__dict_Semigroupoid_15));
  };
  var compare = function (dict) {
      return dict.compare;
  };
  var $less = function (__dict_Ord_17) {
      return function (a1) {
          return function (a2) {
              var _47 = compare(__dict_Ord_17)(a1)(a2);
              if (_47 instanceof LT) {
                  return true;
              };
              return false;
          };
      };
  };
  var $less$eq = function (__dict_Ord_18) {
      return function (a1) {
          return function (a2) {
              var _48 = compare(__dict_Ord_18)(a1)(a2);
              if (_48 instanceof GT) {
                  return false;
              };
              return true;
          };
      };
  };
  var $greater$eq = function (__dict_Ord_20) {
      return function (a1) {
          return function (a2) {
              var _50 = compare(__dict_Ord_20)(a1)(a2);
              if (_50 instanceof LT) {
                  return false;
              };
              return true;
          };
      };
  };
  var categoryFn = new Category(function () {
      return semigroupoidFn;
  }, function (x) {
      return x;
  });
  var boundedBoolean = new Bounded(false, true);
  var bottom = function (dict) {
      return dict.bottom;
  };
  var booleanAlgebraBoolean = new BooleanAlgebra(function () {
      return boundedBoolean;
  }, $foreign.boolAnd, $foreign.boolOr, $foreign.boolNot);
  var $div$eq = function (__dict_Eq_9) {
      return function (x) {
          return function (y) {
              return not(booleanAlgebraBoolean)($eq$eq(__dict_Eq_9)(x)(y));
          };
      };
  };
  var bind = function (dict) {
      return dict.bind;
  };
  var liftM1 = function (__dict_Monad_23) {
      return function (f) {
          return function (a) {
              return bind(__dict_Monad_23["__superclass_Prelude.Bind_1"]())(a)(function (_0) {
                  return $$return(__dict_Monad_23["__superclass_Prelude.Applicative_0"]())(f(_0));
              });
          };
      };
  };
  var $greater$greater$eq = function (__dict_Bind_24) {
      return bind(__dict_Bind_24);
  }; 
  var apply = function (dict) {
      return dict.apply;
  };
  var $less$times$greater = function (__dict_Apply_25) {
      return apply(__dict_Apply_25);
  };
  var liftA1 = function (__dict_Applicative_26) {
      return function (f) {
          return function (a) {
              return $less$times$greater(__dict_Applicative_26["__superclass_Prelude.Apply_0"]())(pure(__dict_Applicative_26)(f))(a);
          };
      };
  }; 
  var append = function (dict) {
      return dict.append;
  };
  var $plus$plus = function (__dict_Semigroup_27) {
      return append(__dict_Semigroup_27);
  };
  var $less$greater = function (__dict_Semigroup_28) {
      return append(__dict_Semigroup_28);
  };
  var ap = function (__dict_Monad_30) {
      return function (f) {
          return function (a) {
              return bind(__dict_Monad_30["__superclass_Prelude.Bind_1"]())(f)(function (_2) {
                  return bind(__dict_Monad_30["__superclass_Prelude.Bind_1"]())(a)(function (_1) {
                      return $$return(__dict_Monad_30["__superclass_Prelude.Applicative_0"]())(_2(_1));
                  });
              });
          };
      };
  };
  var monadArray = new Monad(function () {
      return applicativeArray;
  }, function () {
      return bindArray;
  });
  var bindArray = new Bind(function () {
      return applyArray;
  }, $foreign.arrayBind);
  var applyArray = new Apply(function () {
      return functorArray;
  }, ap(monadArray));
  var applicativeArray = new Applicative(function () {
      return applyArray;
  }, function (x) {
      return [ x ];
  });
  var add = function (dict) {
      return dict.add;
  };
  var $plus = function (__dict_Semiring_31) {
      return add(__dict_Semiring_31);
  };
  exports["LT"] = LT;
  exports["GT"] = GT;
  exports["EQ"] = EQ;
  exports["Show"] = Show;
  exports["BooleanAlgebra"] = BooleanAlgebra;
  exports["Bounded"] = Bounded;
  exports["Ord"] = Ord;
  exports["Eq"] = Eq;
  exports["Ring"] = Ring;
  exports["Semiring"] = Semiring;
  exports["Semigroup"] = Semigroup;
  exports["Monad"] = Monad;
  exports["Bind"] = Bind;
  exports["Applicative"] = Applicative;
  exports["Apply"] = Apply;
  exports["Functor"] = Functor;
  exports["Category"] = Category;
  exports["Semigroupoid"] = Semigroupoid;
  exports["show"] = show;
  exports["not"] = not;
  exports["disj"] = disj;
  exports["conj"] = conj;
  exports["bottom"] = bottom;
  exports["top"] = top;
  exports["unsafeCompare"] = unsafeCompare;
  exports[">="] = $greater$eq;
  exports["<="] = $less$eq;
  exports["<"] = $less;
  exports["compare"] = compare;
  exports["/="] = $div$eq;
  exports["=="] = $eq$eq;
  exports["eq"] = eq;
  exports["-"] = $minus;
  exports["sub"] = sub;
  exports["+"] = $plus;
  exports["one"] = one;
  exports["mul"] = mul;
  exports["zero"] = zero;
  exports["add"] = add;
  exports["++"] = $plus$plus;
  exports["<>"] = $less$greater;
  exports["append"] = append;
  exports["ap"] = ap;
  exports["liftM1"] = liftM1;
  exports["return"] = $$return;
  exports[">>="] = $greater$greater$eq;
  exports["bind"] = bind;
  exports["liftA1"] = liftA1;
  exports["pure"] = pure;
  exports["<*>"] = $less$times$greater;
  exports["apply"] = apply;
  exports["void"] = $$void;
  exports["<$>"] = $less$dollar$greater;
  exports["map"] = map;
  exports["id"] = id;
  exports[">>>"] = $greater$greater$greater;
  exports["compose"] = compose;
  exports["otherwise"] = otherwise;
  exports["const"] = $$const;
  exports["flip"] = flip;
  exports["unit"] = unit;
  exports["semigroupoidFn"] = semigroupoidFn;
  exports["categoryFn"] = categoryFn;
  exports["functorArray"] = functorArray;
  exports["applyArray"] = applyArray;
  exports["applicativeArray"] = applicativeArray;
  exports["bindArray"] = bindArray;
  exports["monadArray"] = monadArray;
  exports["semigroupArray"] = semigroupArray;
  exports["semiringNumber"] = semiringNumber;
  exports["eqInt"] = eqInt;
  exports["eqNumber"] = eqNumber;
  exports["eqChar"] = eqChar;
  exports["eqString"] = eqString;
  exports["ordNumber"] = ordNumber;
  exports["boundedBoolean"] = boundedBoolean;
  exports["booleanAlgebraBoolean"] = booleanAlgebraBoolean;
  exports["showInt"] = showInt;
  exports["showNumber"] = showNumber;;
 
})(PS["Prelude"] = PS["Prelude"] || {});
(function(exports) {
  /* global exports, console */
  "use strict";

  // module Control.Monad.Eff.Console

  exports.log = function (s) {
    return function () {
      console.log(s);
      return {};
    };
  };
 
})(PS["Control.Monad.Eff.Console"] = PS["Control.Monad.Eff.Console"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // module Control.Monad.Eff

  exports.returnE = function (a) {
    return function () {
      return a;
    };
  };

  exports.bindE = function (a) {
    return function (f) {
      return function () {
        return f(a())();
      };
    };
  };
 
})(PS["Control.Monad.Eff"] = PS["Control.Monad.Eff"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["Control.Monad.Eff"];
  var Prelude = PS["Prelude"];     
  var monadEff = new Prelude.Monad(function () {
      return applicativeEff;
  }, function () {
      return bindEff;
  });
  var bindEff = new Prelude.Bind(function () {
      return applyEff;
  }, $foreign.bindE);
  var applyEff = new Prelude.Apply(function () {
      return functorEff;
  }, Prelude.ap(monadEff));
  var applicativeEff = new Prelude.Applicative(function () {
      return applyEff;
  }, $foreign.returnE);
  var functorEff = new Prelude.Functor(Prelude.liftA1(applicativeEff));
  exports["functorEff"] = functorEff;
  exports["applyEff"] = applyEff;
  exports["applicativeEff"] = applicativeEff;
  exports["bindEff"] = bindEff;
  exports["monadEff"] = monadEff;;
 
})(PS["Control.Monad.Eff"] = PS["Control.Monad.Eff"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["Control.Monad.Eff.Console"];
  var Prelude = PS["Prelude"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  exports["log"] = $foreign.log;;
 
})(PS["Control.Monad.Eff.Console"] = PS["Control.Monad.Eff.Console"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // module Data.Array

  //------------------------------------------------------------------------------
  // Array creation --------------------------------------------------------------
  //------------------------------------------------------------------------------

  exports.range = function (start) {
    return function (end) {
      var step = start > end ? -1 : 1;
      var result = [];
      for (var i = start, n = 0; i !== end; i += step) {
        result[n++] = i;
      }
      result[n] = i;
      return result;
    };
  };

  //------------------------------------------------------------------------------
  // Array size ------------------------------------------------------------------
  //------------------------------------------------------------------------------

  exports.length = function (xs) {
    return xs.length;
  };

  //------------------------------------------------------------------------------
  // Extending arrays ------------------------------------------------------------
  //------------------------------------------------------------------------------

  exports.cons = function (e) {
    return function (l) {
      return [e].concat(l);
    };
  };

  //------------------------------------------------------------------------------
  // Non-indexed reads -----------------------------------------------------------
  //------------------------------------------------------------------------------

  exports["uncons'"] = function (empty) {
    return function (next) {
      return function (xs) {
        return xs.length === 0 ? empty({}) : next(xs[0])(xs.slice(1));
      };
    };
  };

  //------------------------------------------------------------------------------
  // Transformations -------------------------------------------------------------
  //------------------------------------------------------------------------------

  exports.reverse = function (l) {
    return l.slice().reverse();
  };

  exports.concat = function (xss) {
    var result = [];
    for (var i = 0, l = xss.length; i < l; i++) {
      var xs = xss[i];
      for (var j = 0, m = xs.length; j < m; j++) {
        result.push(xs[j]);
      }
    }
    return result;
  };

  //------------------------------------------------------------------------------
  // Subarrays -------------------------------------------------------------------
  //------------------------------------------------------------------------------

  exports.slice = function (s) {
    return function (e) {
      return function (l) {
        return l.slice(s, e);
      };
    };
  };

  exports.drop = function (n) {
    return function (l) {
      return n < 1 ? l : l.slice(n);
    };
  };

  //------------------------------------------------------------------------------
  // Zipping ---------------------------------------------------------------------
  //------------------------------------------------------------------------------

  exports.zipWith = function (f) {
    return function (xs) {
      return function (ys) {
        var l = xs.length < ys.length ? xs.length : ys.length;
        var result = new Array(l);
        for (var i = 0; i < l; i++) {
          result[i] = f(xs[i])(ys[i]);
        }
        return result;
      };
    };
  };
 
})(PS["Data.Array"] = PS["Data.Array"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];     
  var Alt = function (__superclass_Prelude$dotFunctor_0, alt) {
      this["__superclass_Prelude.Functor_0"] = __superclass_Prelude$dotFunctor_0;
      this.alt = alt;
  };                                         
  var alt = function (dict) {
      return dict.alt;
  };
  exports["Alt"] = Alt;
  exports["alt"] = alt;;
 
})(PS["Control.Alt"] = PS["Control.Alt"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Alt = PS["Control.Alt"];     
  var Plus = function (__superclass_Control$dotAlt$dotAlt_0, empty) {
      this["__superclass_Control.Alt.Alt_0"] = __superclass_Control$dotAlt$dotAlt_0;
      this.empty = empty;
  };       
  var empty = function (dict) {
      return dict.empty;
  };
  exports["Plus"] = Plus;
  exports["empty"] = empty;;
 
})(PS["Control.Plus"] = PS["Control.Plus"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // module Data.Foldable

  exports.foldrArray = function (f) {
    return function (init) {
      return function (xs) {
        var acc = init;
        var len = xs.length;
        for (var i = len - 1; i >= 0; i--) {
          acc = f(xs[i])(acc);
        }
        return acc;
      };
    };
  };

  exports.foldlArray = function (f) {
    return function (init) {
      return function (xs) {
        var acc = init;
        var len = xs.length;
        for (var i = 0; i < len; i++) {
          acc = f(acc)(xs[i]);
        }
        return acc;
      };
    };
  };
 
})(PS["Data.Foldable"] = PS["Data.Foldable"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var $times$greater = function (__dict_Apply_1) {
      return function (a) {
          return function (b) {
              return Prelude["<*>"](__dict_Apply_1)(Prelude["<$>"](__dict_Apply_1["__superclass_Prelude.Functor_0"]())(Prelude["const"](Prelude.id(Prelude.categoryFn)))(a))(b);
          };
      };
  };
  exports["*>"] = $times$greater;;
 
})(PS["Control.Apply"] = PS["Control.Apply"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];     
  var Monoid = function (__superclass_Prelude$dotSemigroup_0, mempty) {
      this["__superclass_Prelude.Semigroup_0"] = __superclass_Prelude$dotSemigroup_0;
      this.mempty = mempty;
  };     
  var monoidArray = new Monoid(function () {
      return Prelude.semigroupArray;
  }, [  ]);
  var mempty = function (dict) {
      return dict.mempty;
  };
  exports["Monoid"] = Monoid;
  exports["mempty"] = mempty;
  exports["monoidArray"] = monoidArray;;
 
})(PS["Data.Monoid"] = PS["Data.Monoid"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Alt = PS["Control.Alt"];
  var Control_Alternative = PS["Control.Alternative"];
  var Control_Extend = PS["Control.Extend"];
  var Control_MonadPlus = PS["Control.MonadPlus"];
  var Control_Plus = PS["Control.Plus"];
  var Data_Functor_Invariant = PS["Data.Functor.Invariant"];
  var Data_Monoid = PS["Data.Monoid"];     
  var Nothing = (function () {
      function Nothing() {

      };
      Nothing.value = new Nothing();
      return Nothing;
  })();
  var Just = (function () {
      function Just(value0) {
          this.value0 = value0;
      };
      Just.create = function (value0) {
          return new Just(value0);
      };
      return Just;
  })();
  var maybe = function (b) {
      return function (f) {
          return function (_0) {
              if (_0 instanceof Nothing) {
                  return b;
              };
              if (_0 instanceof Just) {
                  return f(_0.value0);
              };
              throw new Error("Failed pattern match at Data.Maybe line 26, column 1 - line 27, column 1: " + [ b.constructor.name, f.constructor.name, _0.constructor.name ]);
          };
      };
  };                                                
  var functorMaybe = new Prelude.Functor(function (fn) {
      return function (_2) {
          if (_2 instanceof Just) {
              return new Just(fn(_2.value0));
          };
          return Nothing.value;
      };
  });
  exports["Nothing"] = Nothing;
  exports["Just"] = Just;
  exports["maybe"] = maybe;
  exports["functorMaybe"] = functorMaybe;;
 
})(PS["Data.Maybe"] = PS["Data.Maybe"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Comonad = PS["Control.Comonad"];
  var Control_Extend = PS["Control.Extend"];
  var Data_Functor_Invariant = PS["Data.Functor.Invariant"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Monoid = PS["Data.Monoid"];     
  var First = function (x) {
      return x;
  };
  var semigroupFirst = new Prelude.Semigroup(function (_11) {
      return function (second) {
          if (_11 instanceof Data_Maybe.Just) {
              return _11;
          };
          return second;
      };
  });
  var runFirst = function (_0) {
      return _0;
  };
  var monoidFirst = new Data_Monoid.Monoid(function () {
      return semigroupFirst;
  }, Data_Maybe.Nothing.value);
  exports["First"] = First;
  exports["runFirst"] = runFirst;
  exports["semigroupFirst"] = semigroupFirst;
  exports["monoidFirst"] = monoidFirst;;
 
})(PS["Data.Maybe.First"] = PS["Data.Maybe.First"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Comonad = PS["Control.Comonad"];
  var Control_Extend = PS["Control.Extend"];
  var Data_Monoid = PS["Data.Monoid"];     
  var Disj = function (x) {
      return x;
  };
  var semigroupDisj = function (__dict_BooleanAlgebra_2) {
      return new Prelude.Semigroup(function (_10) {
          return function (_11) {
              return Prelude.disj(__dict_BooleanAlgebra_2)(_10)(_11);
          };
      });
  };
  var runDisj = function (_0) {
      return _0;
  };
  var monoidDisj = function (__dict_BooleanAlgebra_4) {
      return new Data_Monoid.Monoid(function () {
          return semigroupDisj(__dict_BooleanAlgebra_4);
      }, Prelude.bottom(__dict_BooleanAlgebra_4["__superclass_Prelude.Bounded_0"]()));
  };
  exports["Disj"] = Disj;
  exports["runDisj"] = runDisj;
  exports["semigroupDisj"] = semigroupDisj;
  exports["monoidDisj"] = monoidDisj;;
 
})(PS["Data.Monoid.Disj"] = PS["Data.Monoid.Disj"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["Data.Foldable"];
  var Prelude = PS["Prelude"];
  var Control_Apply = PS["Control.Apply"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Maybe_First = PS["Data.Maybe.First"];
  var Data_Maybe_Last = PS["Data.Maybe.Last"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Monoid_Additive = PS["Data.Monoid.Additive"];
  var Data_Monoid_Conj = PS["Data.Monoid.Conj"];
  var Data_Monoid_Disj = PS["Data.Monoid.Disj"];
  var Data_Monoid_Dual = PS["Data.Monoid.Dual"];
  var Data_Monoid_Endo = PS["Data.Monoid.Endo"];
  var Data_Monoid_Multiplicative = PS["Data.Monoid.Multiplicative"];     
  var Foldable = function (foldMap, foldl, foldr) {
      this.foldMap = foldMap;
      this.foldl = foldl;
      this.foldr = foldr;
  };
  var foldr = function (dict) {
      return dict.foldr;
  };
  var traverse_ = function (__dict_Applicative_0) {
      return function (__dict_Foldable_1) {
          return function (f) {
              return foldr(__dict_Foldable_1)(function (_109) {
                  return Control_Apply["*>"](__dict_Applicative_0["__superclass_Prelude.Apply_0"]())(f(_109));
              })(Prelude.pure(__dict_Applicative_0)(Prelude.unit));
          };
      };
  };
  var for_ = function (__dict_Applicative_2) {
      return function (__dict_Foldable_3) {
          return Prelude.flip(traverse_(__dict_Applicative_2)(__dict_Foldable_3));
      };
  };
  var foldl = function (dict) {
      return dict.foldl;
  }; 
  var foldMapDefaultR = function (__dict_Foldable_26) {
      return function (__dict_Monoid_27) {
          return function (f) {
              return function (xs) {
                  return foldr(__dict_Foldable_26)(function (x) {
                      return function (acc) {
                          return Prelude["<>"](__dict_Monoid_27["__superclass_Prelude.Semigroup_0"]())(f(x))(acc);
                      };
                  })(Data_Monoid.mempty(__dict_Monoid_27))(xs);
              };
          };
      };
  };
  var foldableArray = new Foldable(function (__dict_Monoid_28) {
      return foldMapDefaultR(foldableArray)(__dict_Monoid_28);
  }, $foreign.foldlArray, $foreign.foldrArray);
  var foldMap = function (dict) {
      return dict.foldMap;
  };
  var any = function (__dict_Foldable_38) {
      return function (__dict_BooleanAlgebra_39) {
          return function (p) {
              return function (_112) {
                  return Data_Monoid_Disj.runDisj(foldMap(__dict_Foldable_38)(Data_Monoid_Disj.monoidDisj(__dict_BooleanAlgebra_39))(function (_113) {
                      return Data_Monoid_Disj.Disj(p(_113));
                  })(_112));
              };
          };
      };
  };
  var elem = function (__dict_Foldable_40) {
      return function (__dict_Eq_41) {
          return function (_114) {
              return any(__dict_Foldable_40)(Prelude.booleanAlgebraBoolean)(Prelude["=="](__dict_Eq_41)(_114));
          };
      };
  };
  exports["Foldable"] = Foldable;
  exports["elem"] = elem;
  exports["any"] = any;
  exports["for_"] = for_;
  exports["traverse_"] = traverse_;
  exports["foldMapDefaultR"] = foldMapDefaultR;
  exports["foldMap"] = foldMap;
  exports["foldl"] = foldl;
  exports["foldr"] = foldr;
  exports["foldableArray"] = foldableArray;;
 
})(PS["Data.Foldable"] = PS["Data.Foldable"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // module Data.Traversable

  // jshint maxparams: 3

  exports.traverseArrayImpl = function () {
    function Cont (fn) {
      this.fn = fn;
    }

    var emptyList = {};

    var ConsCell = function (head, tail) {
      this.head = head;
      this.tail = tail;
    };

    function consList (x) {
      return function (xs) {
        return new ConsCell(x, xs);
      };
    }

    function listToArray (list) {
      var arr = [];
      while (list !== emptyList) {
        arr.push(list.head);
        list = list.tail;
      }
      return arr;
    }

    return function (apply) {
      return function (map) {
        return function (pure) {
          return function (f) {
            var buildFrom = function (x, ys) {
              return apply(map(consList)(f(x)))(ys);
            };

            var go = function (acc, currentLen, xs) {
              if (currentLen === 0) {
                return acc;
              } else {
                var last = xs[currentLen - 1];
                return new Cont(function () {
                  return go(buildFrom(last, acc), currentLen - 1, xs);
                });
              }
            };

            return function (array) {
              var result = go(pure(emptyList), array.length, array);
              while (result instanceof Cont) {
                result = result.fn();
              }

              return map(listToArray)(result);
            };
          };
        };
      };
    };
  }();
 
})(PS["Data.Traversable"] = PS["Data.Traversable"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["Data.Traversable"];
  var Prelude = PS["Prelude"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Maybe_First = PS["Data.Maybe.First"];
  var Data_Maybe_Last = PS["Data.Maybe.Last"];
  var Data_Monoid_Additive = PS["Data.Monoid.Additive"];
  var Data_Monoid_Conj = PS["Data.Monoid.Conj"];
  var Data_Monoid_Disj = PS["Data.Monoid.Disj"];
  var Data_Monoid_Dual = PS["Data.Monoid.Dual"];
  var Data_Monoid_Multiplicative = PS["Data.Monoid.Multiplicative"];
  var Traversable = function (__superclass_Data$dotFoldable$dotFoldable_1, __superclass_Prelude$dotFunctor_0, sequence, traverse) {
      this["__superclass_Data.Foldable.Foldable_1"] = __superclass_Data$dotFoldable$dotFoldable_1;
      this["__superclass_Prelude.Functor_0"] = __superclass_Prelude$dotFunctor_0;
      this.sequence = sequence;
      this.traverse = traverse;
  };
  var traverse = function (dict) {
      return dict.traverse;
  };
  var sequenceDefault = function (__dict_Traversable_12) {
      return function (__dict_Applicative_13) {
          return function (tma) {
              return traverse(__dict_Traversable_12)(__dict_Applicative_13)(Prelude.id(Prelude.categoryFn))(tma);
          };
      };
  };
  var traversableArray = new Traversable(function () {
      return Data_Foldable.foldableArray;
  }, function () {
      return Prelude.functorArray;
  }, function (__dict_Applicative_15) {
      return sequenceDefault(traversableArray)(__dict_Applicative_15);
  }, function (__dict_Applicative_14) {
      return $foreign.traverseArrayImpl(Prelude.apply(__dict_Applicative_14["__superclass_Prelude.Apply_0"]()))(Prelude.map((__dict_Applicative_14["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]()))(Prelude.pure(__dict_Applicative_14));
  });
  var sequence = function (dict) {
      return dict.sequence;
  };
  exports["Traversable"] = Traversable;
  exports["sequenceDefault"] = sequenceDefault;
  exports["sequence"] = sequence;
  exports["traverse"] = traverse;
  exports["traversableArray"] = traversableArray;;
 
})(PS["Data.Traversable"] = PS["Data.Traversable"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];     
  var Bifunctor = function (bimap) {
      this.bimap = bimap;
  };
  var bimap = function (dict) {
      return dict.bimap;
  };
  var rmap = function (__dict_Bifunctor_1) {
      return bimap(__dict_Bifunctor_1)(Prelude.id(Prelude.categoryFn));
  };
  exports["Bifunctor"] = Bifunctor;
  exports["rmap"] = rmap;
  exports["bimap"] = bimap;;
 
})(PS["Data.Bifunctor"] = PS["Data.Bifunctor"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Biapplicative = PS["Control.Biapplicative"];
  var Control_Biapply = PS["Control.Biapply"];
  var Control_Comonad = PS["Control.Comonad"];
  var Control_Extend = PS["Control.Extend"];
  var Control_Lazy = PS["Control.Lazy"];
  var Data_Bifoldable = PS["Data.Bifoldable"];
  var Data_Bifunctor = PS["Data.Bifunctor"];
  var Data_Bitraversable = PS["Data.Bitraversable"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Functor_Invariant = PS["Data.Functor.Invariant"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Maybe_First = PS["Data.Maybe.First"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Traversable = PS["Data.Traversable"];     
  var Tuple = (function () {
      function Tuple(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      Tuple.create = function (value0) {
          return function (value1) {
              return new Tuple(value0, value1);
          };
      };
      return Tuple;
  })();
  var uncurry = function (f) {
      return function (_5) {
          return f(_5.value0)(_5.value1);
      };
  };
  var lookup = function (__dict_Foldable_19) {
      return function (__dict_Eq_20) {
          return function (a) {
              return function (f) {
                  return Data_Maybe_First.runFirst(Data_Foldable.foldMap(__dict_Foldable_19)(Data_Maybe_First.monoidFirst)(function (_2) {
                      var _105 = Prelude["=="](__dict_Eq_20)(a)(_2.value0);
                      if (_105) {
                          return new Data_Maybe.Just(_2.value1);
                      };
                      if (!_105) {
                          return Data_Maybe.Nothing.value;
                      };
                      throw new Error("Failed pattern match at Data.Tuple line 173, column 1 - line 174, column 1: " + [ _105.constructor.name ]);
                  })(f));
              };
          };
      };
  };
  var functorTuple = new Prelude.Functor(function (f) {
      return function (_31) {
          return new Tuple(_31.value0, f(_31.value1));
      };
  });
  var bifunctorTuple = new Data_Bifunctor.Bifunctor(function (f) {
      return function (g) {
          return function (_32) {
              return new Tuple(f(_32.value0), g(_32.value1));
          };
      };
  });
  exports["Tuple"] = Tuple;
  exports["lookup"] = lookup;
  exports["uncurry"] = uncurry;
  exports["functorTuple"] = functorTuple;
  exports["bifunctorTuple"] = bifunctorTuple;;
 
})(PS["Data.Tuple"] = PS["Data.Tuple"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // module Data.Maybe.Unsafe

  exports.unsafeThrow = function (msg) {
    throw new Error(msg);
  };
 
})(PS["Data.Maybe.Unsafe"] = PS["Data.Maybe.Unsafe"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["Data.Maybe.Unsafe"];
  var Prelude = PS["Prelude"];
  var Data_Maybe = PS["Data.Maybe"];     
  var fromJust = function (_0) {
      if (_0 instanceof Data_Maybe.Just) {
          return _0.value0;
      };
      if (_0 instanceof Data_Maybe.Nothing) {
          return $foreign.unsafeThrow("Data.Maybe.Unsafe.fromJust called on Nothing");
      };
      throw new Error("Failed pattern match at Data.Maybe.Unsafe line 10, column 1 - line 11, column 1: " + [ _0.constructor.name ]);
  };
  exports["fromJust"] = fromJust;
  exports["unsafeThrow"] = $foreign.unsafeThrow;;
 
})(PS["Data.Maybe.Unsafe"] = PS["Data.Maybe.Unsafe"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["Data.Array"];
  var Prelude = PS["Prelude"];
  var Control_Alt = PS["Control.Alt"];
  var Control_Alternative = PS["Control.Alternative"];
  var Control_Lazy = PS["Control.Lazy"];
  var Control_MonadPlus = PS["Control.MonadPlus"];
  var Control_Plus = PS["Control.Plus"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Functor_Invariant = PS["Data.Functor.Invariant"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Traversable = PS["Data.Traversable"];
  var Data_Tuple = PS["Data.Tuple"];
  var Data_Maybe_Unsafe = PS["Data.Maybe.Unsafe"];     
  var $colon = $foreign.cons;
  var zip = $foreign.zipWith(Data_Tuple.Tuple.create);
  var uncons = $foreign["uncons'"](Prelude["const"](Data_Maybe.Nothing.value))(function (x) {
      return function (xs) {
          return new Data_Maybe.Just({
              head: x, 
              tail: xs
          });
      };
  });
  var take = $foreign.slice(0);
  var tail = $foreign["uncons'"](Prelude["const"](Data_Maybe.Nothing.value))(function (_7) {
      return function (xs) {
          return new Data_Maybe.Just(xs);
      };
  });
  var span = function (p) {
      var go = function (__copy_acc) {
          return function (__copy_xs) {
              var acc = __copy_acc;
              var xs = __copy_xs;
              tco: while (true) {
                  var _21 = uncons(xs);
                  if (_21 instanceof Data_Maybe.Just && p(_21.value0.head)) {
                      var __tco_acc = $colon(_21.value0.head)(acc);
                      acc = __tco_acc;
                      xs = _21.value0.tail;
                      continue tco;
                  };
                  return {
                      init: $foreign.reverse(acc), 
                      rest: xs
                  };
              };
          };
      };
      return go([  ]);
  };
  var singleton = function (a) {
      return [ a ];
  };
  var $$null = function (xs) {
      return $foreign.length(xs) === 0;
  };                                                                                  
  var init = function (xs) {
      if ($$null(xs)) {
          return Data_Maybe.Nothing.value;
      };
      if (Prelude.otherwise) {
          return new Data_Maybe.Just($foreign.slice(0)($foreign.length(xs) - 1)(xs));
      };
      throw new Error("Failed pattern match at Data.Array line 226, column 1 - line 227, column 1: " + [ xs.constructor.name ]);
  };
  var head = $foreign["uncons'"](Prelude["const"](Data_Maybe.Nothing.value))(function (x) {
      return function (_6) {
          return new Data_Maybe.Just(x);
      };
  });
  var concatMap = Prelude.flip(Prelude.bind(Prelude.bindArray));
  var mapMaybe = function (f) {
      return concatMap(function (_48) {
          return Data_Maybe.maybe([  ])(singleton)(f(_48));
      });
  };
  var catMaybes = mapMaybe(Prelude.id(Prelude.categoryFn));
  exports["zip"] = zip;
  exports["span"] = span;
  exports["take"] = take;
  exports["catMaybes"] = catMaybes;
  exports["mapMaybe"] = mapMaybe;
  exports["concatMap"] = concatMap;
  exports["uncons"] = uncons;
  exports["init"] = init;
  exports["tail"] = tail;
  exports["head"] = head;
  exports["singleton"] = singleton;
  exports["drop"] = $foreign.drop;
  exports["concat"] = $foreign.concat;
  exports["length"] = $foreign.length;
  exports["range"] = $foreign.range;;
 
})(PS["Data.Array"] = PS["Data.Array"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Alt = PS["Control.Alt"];
  var Control_Extend = PS["Control.Extend"];
  var Data_Bifoldable = PS["Data.Bifoldable"];
  var Data_Bifunctor = PS["Data.Bifunctor"];
  var Data_Bitraversable = PS["Data.Bitraversable"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Traversable = PS["Data.Traversable"];     
  var Left = (function () {
      function Left(value0) {
          this.value0 = value0;
      };
      Left.create = function (value0) {
          return new Left(value0);
      };
      return Left;
  })();
  var Right = (function () {
      function Right(value0) {
          this.value0 = value0;
      };
      Right.create = function (value0) {
          return new Right(value0);
      };
      return Right;
  })();
  var functorEither = new Prelude.Functor(function (f) {
      return function (_2) {
          if (_2 instanceof Left) {
              return new Left(_2.value0);
          };
          if (_2 instanceof Right) {
              return new Right(f(_2.value0));
          };
          throw new Error("Failed pattern match at Data.Either line 52, column 1 - line 56, column 1: " + [ f.constructor.name, _2.constructor.name ]);
      };
  });
  var either = function (f) {
      return function (g) {
          return function (_1) {
              if (_1 instanceof Left) {
                  return f(_1.value0);
              };
              if (_1 instanceof Right) {
                  return g(_1.value0);
              };
              throw new Error("Failed pattern match at Data.Either line 28, column 1 - line 29, column 1: " + [ f.constructor.name, g.constructor.name, _1.constructor.name ]);
          };
      };
  };
  var bifunctorEither = new Data_Bifunctor.Bifunctor(function (f) {
      return function (g) {
          return function (_3) {
              if (_3 instanceof Left) {
                  return new Left(f(_3.value0));
              };
              if (_3 instanceof Right) {
                  return new Right(g(_3.value0));
              };
              throw new Error("Failed pattern match at Data.Either line 56, column 1 - line 92, column 1: " + [ f.constructor.name, g.constructor.name, _3.constructor.name ]);
          };
      };
  });
  var applyEither = new Prelude.Apply(function () {
      return functorEither;
  }, function (_4) {
      return function (r) {
          if (_4 instanceof Left) {
              return new Left(_4.value0);
          };
          if (_4 instanceof Right) {
              return Prelude["<$>"](functorEither)(_4.value0)(r);
          };
          throw new Error("Failed pattern match at Data.Either line 92, column 1 - line 116, column 1: " + [ _4.constructor.name, r.constructor.name ]);
      };
  });
  var bindEither = new Prelude.Bind(function () {
      return applyEither;
  }, either(function (e) {
      return function (_0) {
          return new Left(e);
      };
  })(function (a) {
      return function (f) {
          return f(a);
      };
  }));
  var applicativeEither = new Prelude.Applicative(function () {
      return applyEither;
  }, Right.create);
  exports["Left"] = Left;
  exports["Right"] = Right;
  exports["either"] = either;
  exports["functorEither"] = functorEither;
  exports["bifunctorEither"] = bifunctorEither;
  exports["applyEither"] = applyEither;
  exports["applicativeEither"] = applicativeEither;
  exports["bindEither"] = bindEither;;
 
})(PS["Data.Either"] = PS["Data.Either"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // module Data.Foreign

  // jshint maxparams: 3
  exports.parseJSONImpl = function (left, right, str) {
    try {
      return right(JSON.parse(str));
    } catch (e) {
      return left(e.toString());
    }
  };

  exports.unsafeFromForeign = function (value) {
    return value;
  };

  exports.typeOf = function (value) {
    return typeof value;
  };

  exports.tagOf = function (value) {
    return Object.prototype.toString.call(value).slice(8, -1);
  };

  exports.isNull = function (value) {
    return value === null;
  };

  exports.isUndefined = function (value) {
    return value === undefined;
  };
 
})(PS["Data.Foreign"] = PS["Data.Foreign"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  exports.runFn2 = function (fn) {
    return function (a) {
      return function (b) {
        return fn(a, b);
      };
    };
  };
 
})(PS["Data.Function"] = PS["Data.Function"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["Data.Function"];
  var Prelude = PS["Prelude"];
  exports["runFn2"] = $foreign.runFn2;;
 
})(PS["Data.Function"] = PS["Data.Function"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // module Data.Int

  exports.fromNumberImpl = function (just) {
    return function (nothing) {
      return function (n) {
        /* jshint bitwise: false */
        return (n | 0) === n ? just(n) : nothing;
      };
    };
  };

  exports.toNumber = function (n) {
    return n;
  };
 
})(PS["Data.Int"] = PS["Data.Int"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // module Math

  exports.abs = Math.abs;

  exports.floor = Math.floor;

  exports.log = Math.log;

  exports.pow = function (n) {
    return function (p) {
      return Math.pow(n, p);
    };
  };                         
 
})(PS["Math"] = PS["Math"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["Math"];
  exports["pow"] = $foreign.pow;
  exports["log"] = $foreign.log;
  exports["floor"] = $foreign.floor;
  exports["abs"] = $foreign.abs;;
 
})(PS["Math"] = PS["Math"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["Data.Int"];
  var Prelude = PS["Prelude"];
  var Data_Int_Bits = PS["Data.Int.Bits"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Maybe_Unsafe = PS["Data.Maybe.Unsafe"];
  var $$Math = PS["Math"];                                                                   
  var fromNumber = $foreign.fromNumberImpl(Data_Maybe.Just.create)(Data_Maybe.Nothing.value);
  exports["fromNumber"] = fromNumber;
  exports["toNumber"] = $foreign.toNumber;;
 
})(PS["Data.Int"] = PS["Data.Int"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  exports.fromCharArray = function (a) {
    return a.join("");
  };

  exports.length = function (s) {
    return s.length;
  };

  exports.split = function (sep) {
    return function (s) {
      return s.split(sep);
    };
  };

  exports.toCharArray = function (s) {
    return s.split("");
  };
 
})(PS["Data.String"] = PS["Data.String"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  exports.toCharCode = function (c) {
    return c.charCodeAt(0);
  };

  exports.fromCharCode = function (c) {
    return String.fromCharCode(c);
  };
 
})(PS["Data.Char"] = PS["Data.Char"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["Data.Char"];
  var Prelude = PS["Prelude"];
  exports["toCharCode"] = $foreign.toCharCode;
  exports["fromCharCode"] = $foreign.fromCharCode;;
 
})(PS["Data.Char"] = PS["Data.Char"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["Data.String"];
  var Prelude = PS["Prelude"];
  var Data_Char = PS["Data.Char"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_String_Unsafe = PS["Data.String.Unsafe"];
  var $$null = function (s) {
      return $foreign.length(s) === 0;
  };
  exports["null"] = $$null;
  exports["toCharArray"] = $foreign.toCharArray;
  exports["fromCharArray"] = $foreign.fromCharArray;;
 
})(PS["Data.String"] = PS["Data.String"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["Data.Foreign"];
  var Prelude = PS["Prelude"];
  var Data_Either = PS["Data.Either"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Function = PS["Data.Function"];
  var Data_Int = PS["Data.Int"];
  var Data_String = PS["Data.String"];     
  var TypeMismatch = (function () {
      function TypeMismatch(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      TypeMismatch.create = function (value0) {
          return function (value1) {
              return new TypeMismatch(value0, value1);
          };
      };
      return TypeMismatch;
  })();
  var ErrorAtProperty = (function () {
      function ErrorAtProperty(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      ErrorAtProperty.create = function (value0) {
          return function (value1) {
              return new ErrorAtProperty(value0, value1);
          };
      };
      return ErrorAtProperty;
  })();
  var JSONError = (function () {
      function JSONError(value0) {
          this.value0 = value0;
      };
      JSONError.create = function (value0) {
          return new JSONError(value0);
      };
      return JSONError;
  })();
  var unsafeReadTagged = function (tag) {
      return function (value) {
          if (Prelude["=="](Prelude.eqString)($foreign.tagOf(value))(tag)) {
              return Prelude.pure(Data_Either.applicativeEither)($foreign.unsafeFromForeign(value));
          };
          return new Data_Either.Left(new TypeMismatch(tag, $foreign.tagOf(value)));
      };
  };                                          
  var readNumber = unsafeReadTagged("Number");
  var readInt = function (value) {
      var error = Data_Either.Left.create(new TypeMismatch("Int", $foreign.tagOf(value)));
      var fromNumber = function (_30) {
          return Data_Maybe.maybe(error)(Prelude.pure(Data_Either.applicativeEither))(Data_Int.fromNumber(_30));
      };
      return Data_Either.either(Prelude["const"](error))(fromNumber)(readNumber(value));
  };
  var parseJSON = function (json) {
      return $foreign.parseJSONImpl(function (_32) {
          return Data_Either.Left.create(JSONError.create(_32));
      }, Data_Either.Right.create, json);
  };
  exports["TypeMismatch"] = TypeMismatch;
  exports["ErrorAtProperty"] = ErrorAtProperty;
  exports["JSONError"] = JSONError;
  exports["readInt"] = readInt;
  exports["readNumber"] = readNumber;
  exports["unsafeReadTagged"] = unsafeReadTagged;
  exports["parseJSON"] = parseJSON;
  exports["isUndefined"] = $foreign.isUndefined;
  exports["isNull"] = $foreign.isNull;
  exports["typeOf"] = $foreign.typeOf;;
 
})(PS["Data.Foreign"] = PS["Data.Foreign"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // module Data.Foreign.Index

  // jshint maxparams: 4
  exports.unsafeReadPropImpl = function (f, s, key, value) {
    return value == null ? f : s(value[key]);
  };

  // jshint maxparams: 2
  exports.unsafeHasOwnProperty = function (prop, value) {
    return Object.prototype.hasOwnProperty.call(value, prop);
  };

  exports.unsafeHasProperty = function (prop, value) {
    return prop in value;
  };
 
})(PS["Data.Foreign.Index"] = PS["Data.Foreign.Index"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["Data.Foreign.Index"];
  var Prelude = PS["Prelude"];
  var Data_Either = PS["Data.Either"];
  var Data_Foreign = PS["Data.Foreign"];
  var Data_Function = PS["Data.Function"];
  var Data_Int = PS["Data.Int"];     
  var Index = function (errorAt, hasOwnProperty, hasProperty, ix) {
      this.errorAt = errorAt;
      this.hasOwnProperty = hasOwnProperty;
      this.hasProperty = hasProperty;
      this.ix = ix;
  };
  var unsafeReadProp = function (k) {
      return function (value) {
          return $foreign.unsafeReadPropImpl(new Data_Either.Left(new Data_Foreign.TypeMismatch("object", Data_Foreign.typeOf(value))), Prelude.pure(Data_Either.applicativeEither), k, value);
      };
  };
  var prop = unsafeReadProp;
  var ix = function (dict) {
      return dict.ix;
  };
  var $bang = function (__dict_Index_0) {
      return ix(__dict_Index_0);
  };                         
  var hasPropertyImpl = function (p) {
      return function (value) {
          if (Data_Foreign.isNull(value)) {
              return false;
          };
          if (Data_Foreign.isUndefined(value)) {
              return false;
          };
          if (Prelude["=="](Prelude.eqString)(Data_Foreign.typeOf(value))("object") || Prelude["=="](Prelude.eqString)(Data_Foreign.typeOf(value))("function")) {
              return $foreign.unsafeHasProperty(p, value);
          };
          return false;
      };
  };
  var hasProperty = function (dict) {
      return dict.hasProperty;
  };
  var hasOwnPropertyImpl = function (p) {
      return function (value) {
          if (Data_Foreign.isNull(value)) {
              return false;
          };
          if (Data_Foreign.isUndefined(value)) {
              return false;
          };
          if (Prelude["=="](Prelude.eqString)(Data_Foreign.typeOf(value))("object") || Prelude["=="](Prelude.eqString)(Data_Foreign.typeOf(value))("function")) {
              return $foreign.unsafeHasOwnProperty(p, value);
          };
          return false;
      };
  };                                                                                                                   
  var indexString = new Index(Data_Foreign.ErrorAtProperty.create, hasOwnPropertyImpl, hasPropertyImpl, Prelude.flip(prop));
  var hasOwnProperty = function (dict) {
      return dict.hasOwnProperty;
  };
  var errorAt = function (dict) {
      return dict.errorAt;
  };
  exports["Index"] = Index;
  exports["errorAt"] = errorAt;
  exports["hasOwnProperty"] = hasOwnProperty;
  exports["hasProperty"] = hasProperty;
  exports["!"] = $bang;
  exports["ix"] = ix;
  exports["prop"] = prop;
  exports["indexString"] = indexString;;
 
})(PS["Data.Foreign.Index"] = PS["Data.Foreign.Index"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Array = PS["Data.Array"];
  var Data_Either = PS["Data.Either"];
  var Data_Foreign = PS["Data.Foreign"];
  var Data_Foreign_Index = PS["Data.Foreign.Index"];
  var Data_Foreign_Null = PS["Data.Foreign.Null"];
  var Data_Foreign_NullOrUndefined = PS["Data.Foreign.NullOrUndefined"];
  var Data_Foreign_Undefined = PS["Data.Foreign.Undefined"];
  var Data_Int = PS["Data.Int"];
  var Data_Traversable = PS["Data.Traversable"];     
  var IsForeign = function (read) {
      this.read = read;
  };                                                           
  var read = function (dict) {
      return dict.read;
  };
  var readWith = function (__dict_IsForeign_1) {
      return function (f) {
          return function (value) {
              return Data_Either.either(function (_0) {
                  return Data_Either.Left.create(f(_0));
              })(Data_Either.Right.create)(read(__dict_IsForeign_1)(value));
          };
      };
  };
  var readProp = function (__dict_IsForeign_2) {
      return function (__dict_Index_3) {
          return function (prop) {
              return function (value) {
                  return Prelude[">>="](Data_Either.bindEither)(Data_Foreign_Index["!"](__dict_Index_3)(value)(prop))(readWith(__dict_IsForeign_2)(Data_Foreign_Index.errorAt(__dict_Index_3)(prop)));
              };
          };
      };
  };
  var intIsForeign = new IsForeign(Data_Foreign.readInt);
  exports["IsForeign"] = IsForeign;
  exports["readProp"] = readProp;
  exports["readWith"] = readWith;
  exports["read"] = read;
  exports["intIsForeign"] = intIsForeign;;
 
})(PS["Data.Foreign.Class"] = PS["Data.Foreign.Class"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // module Data.Date

  exports.nowEpochMilliseconds = function () {
    return Date.now();
  };
 
})(PS["Data.Date"] = PS["Data.Date"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Milliseconds = function (x) {
      return x;
  };           
  var semiringMilliseconds = new Prelude.Semiring(function (_65) {
      return function (_66) {
          return _65 + _66;
      };
  }, function (_67) {
      return function (_68) {
          return _67 * _68;
      };
  }, 1.0, 0.0);
  var ringMilliseconds = new Prelude.Ring(function () {
      return semiringMilliseconds;
  }, function (_69) {
      return function (_70) {
          return _69 - _70;
      };
  });
  exports["Milliseconds"] = Milliseconds;
  exports["semiringMilliseconds"] = semiringMilliseconds;
  exports["ringMilliseconds"] = ringMilliseconds;;
 
})(PS["Data.Time"] = PS["Data.Time"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["Data.Date"];
  var Global = PS["Global"];
  var Prelude = PS["Prelude"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Data_Enum = PS["Data.Enum"];
  var Data_Function = PS["Data.Function"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Time = PS["Data.Time"];
  exports["nowEpochMilliseconds"] = $foreign.nowEpochMilliseconds;;
 
})(PS["Data.Date"] = PS["Data.Date"] || {});
(function(exports) {
  "use strict";

  // module Browser.WebStorage

  exports.localStorage = window.localStorage;    

  exports.unsafeLength= function(storage) {
    return function(){
      return storage.length;
    }
  };

  exports.unsafeKey = function(null2Maybe,storage,num) {
    return function(){
      return null2Maybe(storage.key(num));
    }
  };

  exports.unsafeGetItem = function(null2Maybe,storage,str) {
    return function(){
      return null2Maybe(storage.getItem(str));
    }
  };

  exports.unsafeSetItem = function(storage,str,val) {
    return function(){
      storage.setItem(str, val);
      return {};
    }
  };

  exports.unsafeRemoveItem = function(storage,str) {
    return function(){
      storage.removeItem(str);
      return {};
    }
  };

  exports.unsafeClear = function(storage) {
    return function(){
      storage.clear();
      return {};
    }
  };

  exports.null2MaybeImpl = function(just, nothing, n) {
    return n == null ? nothing : just(n);
  };

 
})(PS["Browser.WebStorage"] = PS["Browser.WebStorage"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["Browser.WebStorage"];
  var Prelude = PS["Prelude"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Function = PS["Data.Function"];     
  var Storage = function (clear, getItem, key, length, removeItem, setItem) {
      this.clear = clear;
      this.getItem = getItem;
      this.key = key;
      this.length = length;
      this.removeItem = removeItem;
      this.setItem = setItem;
  };
  var setItem = function (dict) {
      return dict.setItem;
  };
  var removeItem = function (dict) {
      return dict.removeItem;
  };
  var null2Maybe = function (n) {
      return $foreign.null2MaybeImpl(Data_Maybe.Just.create, Data_Maybe.Nothing.value, n);
  };
  var storageLocalStorage = new Storage(function (_5) {
      return $foreign.unsafeClear($foreign.localStorage);
  }, function (_2) {
      return function (k) {
          return $foreign.unsafeGetItem(null2Maybe, $foreign.localStorage, k);
      };
  }, function (_1) {
      return function (n) {
          return $foreign.unsafeKey(null2Maybe, $foreign.localStorage, n);
      };
  }, function (_0) {
      return $foreign.unsafeLength($foreign.localStorage);
  }, function (_4) {
      return function (k) {
          return $foreign.unsafeRemoveItem($foreign.localStorage, k);
      };
  }, function (_3) {
      return function (k) {
          return function (v) {
              return $foreign.unsafeSetItem($foreign.localStorage, k, v);
          };
      };
  });
  var length = function (dict) {
      return dict.length;
  };
  var key = function (dict) {
      return dict.key;
  };
  var getItem = function (dict) {
      return dict.getItem;
  };
  var clear = function (dict) {
      return dict.clear;
  };
  exports["Storage"] = Storage;
  exports["setItem"] = setItem;
  exports["removeItem"] = removeItem;
  exports["length"] = length;
  exports["key"] = key;
  exports["getItem"] = getItem;
  exports["clear"] = clear;
  exports["storageLocalStorage"] = storageLocalStorage;
  exports["localStorage"] = $foreign.localStorage;;
 
})(PS["Browser.WebStorage"] = PS["Browser.WebStorage"] || {});
(function(exports) {
  "use strict";

  // module Unsafe.Coerce

  exports.unsafeCoerce = function(x) { return x; }
 
})(PS["Unsafe.Coerce"] = PS["Unsafe.Coerce"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["Unsafe.Coerce"];
  exports["unsafeCoerce"] = $foreign.unsafeCoerce;;
 
})(PS["Unsafe.Coerce"] = PS["Unsafe.Coerce"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // module Data.Exists

  exports.mkExists = function (fa) {
    return fa;
  };

  exports.runExists = function (f) {
    return function (fa) {
      return f(fa);
    };
  };
 
})(PS["Data.Exists"] = PS["Data.Exists"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["Data.Exists"];
  var Prelude = PS["Prelude"];
  exports["runExists"] = $foreign.runExists;
  exports["mkExists"] = $foreign.mkExists;;
 
})(PS["Data.Exists"] = PS["Data.Exists"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Unsafe_Coerce = PS["Unsafe.Coerce"];     
  var runExistsR = Unsafe_Coerce.unsafeCoerce;
  var mkExistsR = Unsafe_Coerce.unsafeCoerce;
  exports["runExistsR"] = runExistsR;
  exports["mkExistsR"] = mkExistsR;;
 
})(PS["Data.ExistsR"] = PS["Data.ExistsR"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var DOM_Event_Types = PS["DOM.Event.Types"];
  var Unsafe_Coerce = PS["Unsafe.Coerce"];                           
  var elementToNode = Unsafe_Coerce.unsafeCoerce;
  exports["elementToNode"] = elementToNode;;
 
})(PS["DOM.Node.Types"] = PS["DOM.Node.Types"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["DOM.HTML.Types"];
  var Prelude = PS["Prelude"];
  var Data_Either = PS["Data.Either"];
  var Data_Foreign = PS["Data.Foreign"];
  var Data_Foreign_Class = PS["Data.Foreign.Class"];
  var DOM_Event_Types = PS["DOM.Event.Types"];
  var DOM_Node_Types = PS["DOM.Node.Types"];
  var Unsafe_Coerce = PS["Unsafe.Coerce"];     
  var windowToEventTarget = Unsafe_Coerce.unsafeCoerce;                  
  var htmlElementToNode = Unsafe_Coerce.unsafeCoerce;   
  var htmlDocumentToParentNode = Unsafe_Coerce.unsafeCoerce;
  exports["htmlElementToNode"] = htmlElementToNode;
  exports["htmlDocumentToParentNode"] = htmlDocumentToParentNode;
  exports["windowToEventTarget"] = windowToEventTarget;;
 
})(PS["DOM.HTML.Types"] = PS["DOM.HTML.Types"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // module Halogen.HTML.Events.Handler

  exports.preventDefaultImpl = function (e) {
    return function () {
      e.preventDefault();
    };
  };

  exports.stopPropagationImpl = function (e) {
    return function () {
      e.stopPropagation();
    };
  };

  exports.stopImmediatePropagationImpl = function (e) {
    return function () {
      e.stopImmediatePropagation();
    };
  };
 
})(PS["Halogen.HTML.Events.Handler"] = PS["Halogen.HTML.Events.Handler"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];     
  var MonadEff = function (__superclass_Prelude$dotMonad_0, liftEff) {
      this["__superclass_Prelude.Monad_0"] = __superclass_Prelude$dotMonad_0;
      this.liftEff = liftEff;
  };
  var monadEffEff = new MonadEff(function () {
      return Control_Monad_Eff.monadEff;
  }, Prelude.id(Prelude.categoryFn));
  var liftEff = function (dict) {
      return dict.liftEff;
  };
  exports["MonadEff"] = MonadEff;
  exports["liftEff"] = liftEff;
  exports["monadEffEff"] = monadEffEff;;
 
})(PS["Control.Monad.Eff.Class"] = PS["Control.Monad.Eff.Class"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Either = PS["Data.Either"];     
  var MonadError = function (__superclass_Prelude$dotMonad_0, catchError, throwError) {
      this["__superclass_Prelude.Monad_0"] = __superclass_Prelude$dotMonad_0;
      this.catchError = catchError;
      this.throwError = throwError;
  };
  var throwError = function (dict) {
      return dict.throwError;
  };                          
  var catchError = function (dict) {
      return dict.catchError;
  };
  exports["MonadError"] = MonadError;
  exports["catchError"] = catchError;
  exports["throwError"] = throwError;;
 
})(PS["Control.Monad.Error.Class"] = PS["Control.Monad.Error.Class"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];     
  var $less$dollar = function (__dict_Functor_0) {
      return function (x) {
          return function (f) {
              return Prelude["<$>"](__dict_Functor_0)(Prelude["const"](x))(f);
          };
      };
  };
  var $dollar$greater = function (__dict_Functor_1) {
      return function (f) {
          return function (x) {
              return Prelude["<$>"](__dict_Functor_1)(Prelude["const"](x))(f);
          };
      };
  };
  exports["$>"] = $dollar$greater;
  exports["<$"] = $less$dollar;;
 
})(PS["Data.Functor"] = PS["Data.Functor"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Comonad = PS["Control.Comonad"];
  var Control_Extend = PS["Control.Extend"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Functor_Invariant = PS["Data.Functor.Invariant"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Traversable = PS["Data.Traversable"];     
  var Identity = function (x) {
      return x;
  };
  var runIdentity = function (_0) {
      return _0;
  };
  var functorIdentity = new Prelude.Functor(function (f) {
      return function (_23) {
          return f(_23);
      };
  });
  var applyIdentity = new Prelude.Apply(function () {
      return functorIdentity;
  }, function (_24) {
      return function (_25) {
          return _24(_25);
      };
  });
  var bindIdentity = new Prelude.Bind(function () {
      return applyIdentity;
  }, function (_26) {
      return function (f) {
          return f(_26);
      };
  });
  var applicativeIdentity = new Prelude.Applicative(function () {
      return applyIdentity;
  }, Identity);
  var monadIdentity = new Prelude.Monad(function () {
      return applicativeIdentity;
  }, function () {
      return bindIdentity;
  });
  exports["Identity"] = Identity;
  exports["runIdentity"] = runIdentity;
  exports["functorIdentity"] = functorIdentity;
  exports["applyIdentity"] = applyIdentity;
  exports["applicativeIdentity"] = applicativeIdentity;
  exports["bindIdentity"] = bindIdentity;
  exports["monadIdentity"] = monadIdentity;;
 
})(PS["Data.Identity"] = PS["Data.Identity"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Monad_ST = PS["Control.Monad.ST"];
  var Data_Either = PS["Data.Either"];
  var Data_Functor = PS["Data.Functor"];
  var Data_Identity = PS["Data.Identity"];
  var Control_Monad_Eff_Unsafe = PS["Control.Monad.Eff.Unsafe"];
  var Data_Either_Unsafe = PS["Data.Either.Unsafe"];     
  var MonadRec = function (__superclass_Prelude$dotMonad_0, tailRecM) {
      this["__superclass_Prelude.Monad_0"] = __superclass_Prelude$dotMonad_0;
      this.tailRecM = tailRecM;
  };
  var tailRecM = function (dict) {
      return dict.tailRecM;
  };             
  var forever = function (__dict_MonadRec_2) {
      return function (ma) {
          return tailRecM(__dict_MonadRec_2)(function (u) {
              return Data_Functor["<$"]((((__dict_MonadRec_2["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Bind_1"]())["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(new Data_Either.Left(u))(ma);
          })(Prelude.unit);
      };
  };
  exports["MonadRec"] = MonadRec;
  exports["forever"] = forever;
  exports["tailRecM"] = tailRecM;;
 
})(PS["Control.Monad.Rec.Class"] = PS["Control.Monad.Rec.Class"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Tuple = PS["Data.Tuple"];     
  var MonadState = function (__superclass_Prelude$dotMonad_0, state) {
      this["__superclass_Prelude.Monad_0"] = __superclass_Prelude$dotMonad_0;
      this.state = state;
  };
  var state = function (dict) {
      return dict.state;
  };
  var put = function (__dict_MonadState_0) {
      return function (s) {
          return state(__dict_MonadState_0)(function (_0) {
              return new Data_Tuple.Tuple(Prelude.unit, s);
          });
      };
  };
  var modify = function (__dict_MonadState_1) {
      return function (f) {
          return state(__dict_MonadState_1)(function (s) {
              return new Data_Tuple.Tuple(Prelude.unit, f(s));
          });
      };
  };
  var gets = function (__dict_MonadState_2) {
      return function (f) {
          return state(__dict_MonadState_2)(function (s) {
              return new Data_Tuple.Tuple(f(s), s);
          });
      };
  };
  var get = function (__dict_MonadState_3) {
      return state(__dict_MonadState_3)(function (s) {
          return new Data_Tuple.Tuple(s, s);
      });
  };
  exports["MonadState"] = MonadState;
  exports["modify"] = modify;
  exports["put"] = put;
  exports["gets"] = gets;
  exports["get"] = get;
  exports["state"] = state;;
 
})(PS["Control.Monad.State.Class"] = PS["Control.Monad.State.Class"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];     
  var MonadTrans = function (lift) {
      this.lift = lift;
  };
  var lift = function (dict) {
      return dict.lift;
  };
  exports["MonadTrans"] = MonadTrans;
  exports["lift"] = lift;;
 
})(PS["Control.Monad.Trans"] = PS["Control.Monad.Trans"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Either = PS["Data.Either"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Tuple = PS["Data.Tuple"];
  var Control_Alt = PS["Control.Alt"];
  var Control_Alternative = PS["Control.Alternative"];
  var Control_Monad_Cont_Class = PS["Control.Monad.Cont.Class"];
  var Control_Monad_Eff_Class = PS["Control.Monad.Eff.Class"];
  var Control_Monad_Error_Class = PS["Control.Monad.Error.Class"];
  var Control_Monad_Reader_Class = PS["Control.Monad.Reader.Class"];
  var Control_Monad_Rec_Class = PS["Control.Monad.Rec.Class"];
  var Control_Monad_State_Class = PS["Control.Monad.State.Class"];
  var Control_Monad_Trans = PS["Control.Monad.Trans"];
  var Control_Monad_Writer_Class = PS["Control.Monad.Writer.Class"];
  var Control_MonadPlus = PS["Control.MonadPlus"];
  var Control_Plus = PS["Control.Plus"];     
  var WriterT = function (x) {
      return x;
  };
  var runWriterT = function (_7) {
      return _7;
  };
  var mapWriterT = function (f) {
      return function (m) {
          return WriterT(f(runWriterT(m)));
      };
  };
  var functorWriterT = function (__dict_Functor_22) {
      return new Prelude.Functor(function (f) {
          return mapWriterT(Prelude["<$>"](__dict_Functor_22)(function (_6) {
              return new Data_Tuple.Tuple(f(_6.value0), _6.value1);
          }));
      });
  };
  var applyWriterT = function (__dict_Semigroup_26) {
      return function (__dict_Apply_27) {
          return new Prelude.Apply(function () {
              return functorWriterT(__dict_Apply_27["__superclass_Prelude.Functor_0"]());
          }, function (f) {
              return function (v) {
                  return WriterT((function () {
                      var k = function (_8) {
                          return function (_9) {
                              return new Data_Tuple.Tuple(_8.value0(_9.value0), Prelude["<>"](__dict_Semigroup_26)(_8.value1)(_9.value1));
                          };
                      };
                      return Prelude["<*>"](__dict_Apply_27)(Prelude["<$>"](__dict_Apply_27["__superclass_Prelude.Functor_0"]())(k)(runWriterT(f)))(runWriterT(v));
                  })());
              };
          });
      };
  };
  var applicativeWriterT = function (__dict_Monoid_28) {
      return function (__dict_Applicative_29) {
          return new Prelude.Applicative(function () {
              return applyWriterT(__dict_Monoid_28["__superclass_Prelude.Semigroup_0"]())(__dict_Applicative_29["__superclass_Prelude.Apply_0"]());
          }, function (a) {
              return WriterT(Prelude.pure(__dict_Applicative_29)(new Data_Tuple.Tuple(a, Data_Monoid.mempty(__dict_Monoid_28))));
          });
      };
  };
  exports["WriterT"] = WriterT;
  exports["mapWriterT"] = mapWriterT;
  exports["runWriterT"] = runWriterT;
  exports["functorWriterT"] = functorWriterT;
  exports["applyWriterT"] = applyWriterT;
  exports["applicativeWriterT"] = applicativeWriterT;;
 
})(PS["Control.Monad.Writer.Trans"] = PS["Control.Monad.Writer.Trans"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Monad_Writer_Class = PS["Control.Monad.Writer.Class"];
  var Control_Monad_Writer_Trans = PS["Control.Monad.Writer.Trans"];
  var Data_Identity = PS["Data.Identity"];
  var Data_Tuple = PS["Data.Tuple"];     
  var runWriter = function (_0) {
      return Data_Identity.runIdentity(Control_Monad_Writer_Trans.runWriterT(_0));
  };
  exports["runWriter"] = runWriter;;
 
})(PS["Control.Monad.Writer"] = PS["Control.Monad.Writer"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["Halogen.HTML.Events.Handler"];
  var Prelude = PS["Prelude"];
  var Control_Apply = PS["Control.Apply"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Monad_Eff_Class = PS["Control.Monad.Eff.Class"];
  var Control_Monad_Writer = PS["Control.Monad.Writer"];
  var Control_Monad_Writer_Class = PS["Control.Monad.Writer.Class"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Tuple = PS["Data.Tuple"];
  var DOM = PS["DOM"];
  var Halogen_HTML_Events_Types = PS["Halogen.HTML.Events.Types"];
  var Data_Monoid = PS["Data.Monoid"];
  var Control_Monad_Writer_Trans = PS["Control.Monad.Writer.Trans"];
  var Data_Identity = PS["Data.Identity"];     
  var PreventDefault = (function () {
      function PreventDefault() {

      };
      PreventDefault.value = new PreventDefault();
      return PreventDefault;
  })();
  var StopPropagation = (function () {
      function StopPropagation() {

      };
      StopPropagation.value = new StopPropagation();
      return StopPropagation;
  })();
  var StopImmediatePropagation = (function () {
      function StopImmediatePropagation() {

      };
      StopImmediatePropagation.value = new StopImmediatePropagation();
      return StopImmediatePropagation;
  })();
  var EventHandler = function (x) {
      return x;
  };                                                                                                                                                                                                                                                                                                                              
  var runEventHandler = function (__dict_Monad_0) {
      return function (__dict_MonadEff_1) {
          return function (e) {
              return function (_1) {
                  var applyUpdate = function (_6) {
                      if (_6 instanceof PreventDefault) {
                          return $foreign.preventDefaultImpl(e);
                      };
                      if (_6 instanceof StopPropagation) {
                          return $foreign.stopPropagationImpl(e);
                      };
                      if (_6 instanceof StopImmediatePropagation) {
                          return $foreign.stopImmediatePropagationImpl(e);
                      };
                      throw new Error("Failed pattern match at Halogen.HTML.Events.Handler line 88, column 3 - line 89, column 3: " + [ _6.constructor.name ]);
                  };
                  var _11 = Control_Monad_Writer.runWriter(_1);
                  return Control_Monad_Eff_Class.liftEff(__dict_MonadEff_1)(Control_Apply["*>"](Control_Monad_Eff.applyEff)(Data_Foldable.for_(Control_Monad_Eff.applicativeEff)(Data_Foldable.foldableArray)(_11.value1)(applyUpdate))(Prelude["return"](Control_Monad_Eff.applicativeEff)(_11.value0)));
              };
          };
      };
  };                                                                                                                                                                                                                                                                                                          
  var functorEventHandler = new Prelude.Functor(function (f) {
      return function (_2) {
          return Prelude["<$>"](Control_Monad_Writer_Trans.functorWriterT(Data_Identity.functorIdentity))(f)(_2);
      };
  });
  var applyEventHandler = new Prelude.Apply(function () {
      return functorEventHandler;
  }, function (_3) {
      return function (_4) {
          return Prelude["<*>"](Control_Monad_Writer_Trans.applyWriterT(Prelude.semigroupArray)(Data_Identity.applyIdentity))(_3)(_4);
      };
  });
  var applicativeEventHandler = new Prelude.Applicative(function () {
      return applyEventHandler;
  }, function (_21) {
      return EventHandler(Prelude.pure(Control_Monad_Writer_Trans.applicativeWriterT(Data_Monoid.monoidArray)(Data_Identity.applicativeIdentity))(_21));
  });
  exports["runEventHandler"] = runEventHandler;
  exports["functorEventHandler"] = functorEventHandler;
  exports["applyEventHandler"] = applyEventHandler;
  exports["applicativeEventHandler"] = applicativeEventHandler;;
 
})(PS["Halogen.HTML.Events.Handler"] = PS["Halogen.HTML.Events.Handler"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Bifunctor = PS["Data.Bifunctor"];
  var Data_Exists = PS["Data.Exists"];
  var Data_ExistsR = PS["Data.ExistsR"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Traversable = PS["Data.Traversable"];
  var Data_Tuple = PS["Data.Tuple"];
  var DOM_HTML_Types = PS["DOM.HTML.Types"];
  var Halogen_HTML_Events_Handler = PS["Halogen.HTML.Events.Handler"];
  var Halogen_HTML_Events_Types = PS["Halogen.HTML.Events.Types"];     
  var TagName = function (x) {
      return x;
  };
  var PropName = function (x) {
      return x;
  };
  var EventName = function (x) {
      return x;
  };
  var HandlerF = (function () {
      function HandlerF(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      HandlerF.create = function (value0) {
          return function (value1) {
              return new HandlerF(value0, value1);
          };
      };
      return HandlerF;
  })();
  var ClassName = function (x) {
      return x;
  };
  var AttrName = function (x) {
      return x;
  };
  var PropF = (function () {
      function PropF(value0, value1, value2) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
      };
      PropF.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return new PropF(value0, value1, value2);
              };
          };
      };
      return PropF;
  })();
  var Prop = (function () {
      function Prop(value0) {
          this.value0 = value0;
      };
      Prop.create = function (value0) {
          return new Prop(value0);
      };
      return Prop;
  })();
  var Attr = (function () {
      function Attr(value0, value1, value2) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
      };
      Attr.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return new Attr(value0, value1, value2);
              };
          };
      };
      return Attr;
  })();
  var Key = (function () {
      function Key(value0) {
          this.value0 = value0;
      };
      Key.create = function (value0) {
          return new Key(value0);
      };
      return Key;
  })();
  var Handler = (function () {
      function Handler(value0) {
          this.value0 = value0;
      };
      Handler.create = function (value0) {
          return new Handler(value0);
      };
      return Handler;
  })();
  var Initializer = (function () {
      function Initializer(value0) {
          this.value0 = value0;
      };
      Initializer.create = function (value0) {
          return new Initializer(value0);
      };
      return Initializer;
  })();
  var Finalizer = (function () {
      function Finalizer(value0) {
          this.value0 = value0;
      };
      Finalizer.create = function (value0) {
          return new Finalizer(value0);
      };
      return Finalizer;
  })();
  var Text = (function () {
      function Text(value0) {
          this.value0 = value0;
      };
      Text.create = function (value0) {
          return new Text(value0);
      };
      return Text;
  })();
  var Element = (function () {
      function Element(value0, value1, value2, value3) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
          this.value3 = value3;
      };
      Element.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return function (value3) {
                      return new Element(value0, value1, value2, value3);
                  };
              };
          };
      };
      return Element;
  })();
  var Slot = (function () {
      function Slot(value0) {
          this.value0 = value0;
      };
      Slot.create = function (value0) {
          return new Slot(value0);
      };
      return Slot;
  })();
  var IsProp = function (toPropString) {
      this.toPropString = toPropString;
  };
  var toPropString = function (dict) {
      return dict.toPropString;
  };
  var tagName = TagName;
  var stringIsProp = new IsProp(function (_10) {
      return function (_11) {
          return function (s) {
              return s;
          };
      };
  });
  var runTagName = function (_3) {
      return _3;
  };
  var runPropName = function (_4) {
      return _4;
  };
  var runNamespace = function (_2) {
      return _2;
  };
  var runEventName = function (_6) {
      return _6;
  };
  var runClassName = function (_7) {
      return _7;
  };
  var runAttrName = function (_5) {
      return _5;
  };
  var propName = PropName;
  var prop = function (__dict_IsProp_0) {
      return function (name) {
          return function (attr) {
              return function (v) {
                  return new Prop(Data_Exists.mkExists(new PropF(name, v, Prelude["<$>"](Data_Maybe.functorMaybe)(Prelude.flip(Data_Tuple.Tuple.create)(toPropString(__dict_IsProp_0)))(attr))));
              };
          };
      };
  };
  var handler = function (name) {
      return function (k) {
          return new Handler(Data_ExistsR.mkExistsR(new HandlerF(name, function (_56) {
              return Prelude.map(Halogen_HTML_Events_Handler.functorEventHandler)(Data_Maybe.Just.create)(k(_56));
          })));
      };
  };
  var functorProp = new Prelude.Functor(function (f) {
      return function (_9) {
          if (_9 instanceof Prop) {
              return new Prop(_9.value0);
          };
          if (_9 instanceof Key) {
              return new Key(_9.value0);
          };
          if (_9 instanceof Attr) {
              return new Attr(_9.value0, _9.value1, _9.value2);
          };
          if (_9 instanceof Handler) {
              return Data_ExistsR.runExistsR(function (_0) {
                  return new Handler(Data_ExistsR.mkExistsR(new HandlerF(_0.value0, function (_57) {
                      return Prelude.map(Halogen_HTML_Events_Handler.functorEventHandler)(Prelude.map(Data_Maybe.functorMaybe)(f))(_0.value1(_57));
                  })));
              })(_9.value0);
          };
          if (_9 instanceof Initializer) {
              return new Initializer(function (_58) {
                  return f(_9.value0(_58));
              });
          };
          if (_9 instanceof Finalizer) {
              return new Finalizer(function (_59) {
                  return f(_9.value0(_59));
              });
          };
          throw new Error("Failed pattern match at Halogen.HTML.Core line 101, column 1 - line 111, column 1: " + [ f.constructor.name, _9.constructor.name ]);
      };
  });
  var fillSlot = function (__dict_Applicative_1) {
      return function (f) {
          return function (g) {
              return function (_1) {
                  if (_1 instanceof Text) {
                      return Prelude.pure(__dict_Applicative_1)(new Text(_1.value0));
                  };
                  if (_1 instanceof Element) {
                      return Prelude["<$>"]((__dict_Applicative_1["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Element.create(_1.value0)(_1.value1)(Prelude["<$>"](Prelude.functorArray)(Prelude["<$>"](functorProp)(g))(_1.value2)))(Data_Traversable.traverse(Data_Traversable.traversableArray)(__dict_Applicative_1)(fillSlot(__dict_Applicative_1)(f)(g))(_1.value3));
                  };
                  if (_1 instanceof Slot) {
                      return f(_1.value0);
                  };
                  throw new Error("Failed pattern match: " + [ f.constructor.name, g.constructor.name, _1.constructor.name ]);
              };
          };
      };
  };
  var eventName = EventName;
  var element = Element.create(Data_Maybe.Nothing.value);
  var className = ClassName;
  var bifunctorHTML = new Data_Bifunctor.Bifunctor(function (f) {
      return function (g) {
          var go = function (_8) {
              if (_8 instanceof Text) {
                  return new Text(_8.value0);
              };
              if (_8 instanceof Element) {
                  return new Element(_8.value0, _8.value1, Prelude["<$>"](Prelude.functorArray)(Prelude["<$>"](functorProp)(g))(_8.value2), Prelude["<$>"](Prelude.functorArray)(go)(_8.value3));
              };
              if (_8 instanceof Slot) {
                  return new Slot(f(_8.value0));
              };
              throw new Error("Failed pattern match at Halogen.HTML.Core line 62, column 1 - line 69, column 1: " + [ _8.constructor.name ]);
          };
          return go;
      };
  });
  var functorHTML = new Prelude.Functor(Data_Bifunctor.rmap(bifunctorHTML));
  var attrName = AttrName;
  exports["HandlerF"] = HandlerF;
  exports["PropF"] = PropF;
  exports["Prop"] = Prop;
  exports["Attr"] = Attr;
  exports["Key"] = Key;
  exports["Handler"] = Handler;
  exports["Initializer"] = Initializer;
  exports["Finalizer"] = Finalizer;
  exports["Text"] = Text;
  exports["Element"] = Element;
  exports["Slot"] = Slot;
  exports["IsProp"] = IsProp;
  exports["runClassName"] = runClassName;
  exports["className"] = className;
  exports["runEventName"] = runEventName;
  exports["eventName"] = eventName;
  exports["runAttrName"] = runAttrName;
  exports["attrName"] = attrName;
  exports["runPropName"] = runPropName;
  exports["propName"] = propName;
  exports["runTagName"] = runTagName;
  exports["tagName"] = tagName;
  exports["runNamespace"] = runNamespace;
  exports["toPropString"] = toPropString;
  exports["handler"] = handler;
  exports["prop"] = prop;
  exports["fillSlot"] = fillSlot;
  exports["element"] = element;
  exports["bifunctorHTML"] = bifunctorHTML;
  exports["functorHTML"] = functorHTML;
  exports["functorProp"] = functorProp;
  exports["stringIsProp"] = stringIsProp;;
 
})(PS["Halogen.HTML.Core"] = PS["Halogen.HTML.Core"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Halogen_HTML_Core = PS["Halogen.HTML.Core"];
  var span = function (xs) {
      return Halogen_HTML_Core.element(Halogen_HTML_Core.tagName("span"))(xs);
  };
  var p = function (xs) {
      return Halogen_HTML_Core.element(Halogen_HTML_Core.tagName("p"))(xs);
  };
  var p_ = p([  ]);
  var img = function (props) {
      return Halogen_HTML_Core.element(Halogen_HTML_Core.tagName("img"))(props)([  ]);
  };
  var i = function (xs) {
      return Halogen_HTML_Core.element(Halogen_HTML_Core.tagName("i"))(xs);
  };                 
  var h3 = function (xs) {
      return Halogen_HTML_Core.element(Halogen_HTML_Core.tagName("h3"))(xs);
  };
  var h3_ = h3([  ]);
  var h1 = function (xs) {
      return Halogen_HTML_Core.element(Halogen_HTML_Core.tagName("h1"))(xs);
  };                 
  var div = function (xs) {
      return Halogen_HTML_Core.element(Halogen_HTML_Core.tagName("div"))(xs);
  };
  var div_ = div([  ]);      
  var br = function (props) {
      return Halogen_HTML_Core.element(Halogen_HTML_Core.tagName("br"))(props)([  ]);
  };
  var br_ = br([  ]);    
  var a = function (xs) {
      return Halogen_HTML_Core.element(Halogen_HTML_Core.tagName("a"))(xs);
  };
  exports["span"] = span;
  exports["p_"] = p_;
  exports["p"] = p;
  exports["img"] = img;
  exports["i"] = i;
  exports["h3_"] = h3_;
  exports["h3"] = h3;
  exports["h1"] = h1;
  exports["div_"] = div_;
  exports["div"] = div;
  exports["br_"] = br_;
  exports["br"] = br;
  exports["a"] = a;;
 
})(PS["Halogen.HTML.Elements"] = PS["Halogen.HTML.Elements"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var $eq$less$less = function (__dict_Bind_1) {
      return function (f) {
          return function (m) {
              return Prelude[">>="](__dict_Bind_1)(m)(f);
          };
      };
  };
  var $less$eq$less = function (__dict_Bind_2) {
      return function (f) {
          return function (g) {
              return function (a) {
                  return $eq$less$less(__dict_Bind_2)(f)(g(a));
              };
          };
      };
  };
  exports["<=<"] = $less$eq$less;
  exports["=<<"] = $eq$less$less;;
 
})(PS["Control.Bind"] = PS["Control.Bind"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Alt = PS["Control.Alt"];
  var Control_Alternative = PS["Control.Alternative"];
  var Control_Lazy = PS["Control.Lazy"];
  var Control_MonadPlus = PS["Control.MonadPlus"];
  var Control_Plus = PS["Control.Plus"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Traversable = PS["Data.Traversable"];
  var Data_Tuple = PS["Data.Tuple"];
  var Data_Unfoldable = PS["Data.Unfoldable"];     
  var Nil = (function () {
      function Nil() {

      };
      Nil.value = new Nil();
      return Nil;
  })();
  var Cons = (function () {
      function Cons(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      Cons.create = function (value0) {
          return function (value1) {
              return new Cons(value0, value1);
          };
      };
      return Cons;
  })();
  var reverse = (function () {
      var go = function (__copy_acc) {
          return function (__copy__41) {
              var acc = __copy_acc;
              var _41 = __copy__41;
              tco: while (true) {
                  var acc_1 = acc;
                  if (_41 instanceof Nil) {
                      return acc_1;
                  };
                  if (_41 instanceof Cons) {
                      var __tco_acc = new Cons(_41.value0, acc);
                      var __tco__41 = _41.value1;
                      acc = __tco_acc;
                      _41 = __tco__41;
                      continue tco;
                  };
                  throw new Error("Failed pattern match at Data.List line 368, column 1 - line 369, column 1: " + [ acc.constructor.name, _41.constructor.name ]);
              };
          };
      };
      return go(Nil.value);
  })();
  var foldableList = new Data_Foldable.Foldable(function (__dict_Monoid_18) {
      return function (f) {
          return Data_Foldable.foldl(foldableList)(function (acc) {
              return function (_318) {
                  return Prelude.append(__dict_Monoid_18["__superclass_Prelude.Semigroup_0"]())(acc)(f(_318));
              };
          })(Data_Monoid.mempty(__dict_Monoid_18));
      };
  }, (function () {
      var go = function (__copy_o) {
          return function (__copy_b) {
              return function (__copy__66) {
                  var o = __copy_o;
                  var b = __copy_b;
                  var _66 = __copy__66;
                  tco: while (true) {
                      var b_1 = b;
                      if (_66 instanceof Nil) {
                          return b_1;
                      };
                      if (_66 instanceof Cons) {
                          var __tco_o = o;
                          var __tco_b = o(b)(_66.value0);
                          var __tco__66 = _66.value1;
                          o = __tco_o;
                          b = __tco_b;
                          _66 = __tco__66;
                          continue tco;
                      };
                      throw new Error("Failed pattern match: " + [ o.constructor.name, b.constructor.name, _66.constructor.name ]);
                  };
              };
          };
      };
      return go;
  })(), function (o) {
      return function (b) {
          return function (_65) {
              if (_65 instanceof Nil) {
                  return b;
              };
              if (_65 instanceof Cons) {
                  return o(_65.value0)(Data_Foldable.foldr(foldableList)(o)(b)(_65.value1));
              };
              throw new Error("Failed pattern match: " + [ o.constructor.name, b.constructor.name, _65.constructor.name ]);
          };
      };
  });
  exports["Nil"] = Nil;
  exports["Cons"] = Cons;
  exports["reverse"] = reverse;
  exports["foldableList"] = foldableList;;
 
})(PS["Data.List"] = PS["Data.List"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_List = PS["Data.List"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Tuple = PS["Data.Tuple"];     
  var CatQueue = (function () {
      function CatQueue(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      CatQueue.create = function (value0) {
          return function (value1) {
              return new CatQueue(value0, value1);
          };
      };
      return CatQueue;
  })();
  var uncons = function (__copy__2) {
      var _2 = __copy__2;
      tco: while (true) {
          if (_2.value0 instanceof Data_List.Nil && _2.value1 instanceof Data_List.Nil) {
              return Data_Maybe.Nothing.value;
          };
          if (_2.value0 instanceof Data_List.Nil) {
              var __tco__2 = new CatQueue(Data_List.reverse(_2.value1), Data_List.Nil.value);
              _2 = __tco__2;
              continue tco;
          };
          if (_2.value0 instanceof Data_List.Cons) {
              return new Data_Maybe.Just(new Data_Tuple.Tuple(_2.value0.value0, new CatQueue(_2.value0.value1, _2.value1)));
          };
          throw new Error("Failed pattern match: " + [ _2.constructor.name ]);
      };
  };
  var snoc = function (_1) {
      return function (a) {
          return new CatQueue(_1.value0, new Data_List.Cons(a, _1.value1));
      };
  };
  var $$null = function (_0) {
      if (_0.value0 instanceof Data_List.Nil && _0.value1 instanceof Data_List.Nil) {
          return true;
      };
      return false;
  };
  var empty = new CatQueue(Data_List.Nil.value, Data_List.Nil.value);
  exports["CatQueue"] = CatQueue;
  exports["uncons"] = uncons;
  exports["snoc"] = snoc;
  exports["null"] = $$null;
  exports["empty"] = empty;;
 
})(PS["Data.CatQueue"] = PS["Data.CatQueue"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Tuple = PS["Data.Tuple"];
  var Data_CatQueue = PS["Data.CatQueue"];
  var Data_List = PS["Data.List"];     
  var CatNil = (function () {
      function CatNil() {

      };
      CatNil.value = new CatNil();
      return CatNil;
  })();
  var CatCons = (function () {
      function CatCons(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      CatCons.create = function (value0) {
          return function (value1) {
              return new CatCons(value0, value1);
          };
      };
      return CatCons;
  })();
  var link = function (_4) {
      return function (cat) {
          if (_4 instanceof CatNil) {
              return cat;
          };
          if (_4 instanceof CatCons) {
              return new CatCons(_4.value0, Data_CatQueue.snoc(_4.value1)(cat));
          };
          throw new Error("Failed pattern match at Data.CatList line 88, column 1 - line 89, column 1: " + [ _4.constructor.name, cat.constructor.name ]);
      };
  };
  var foldr = function (k) {
      return function (b) {
          return function (q) {
              var foldl = function (__copy_k_1) {
                  return function (__copy_c) {
                      return function (__copy__5) {
                          var k_1 = __copy_k_1;
                          var c = __copy_c;
                          var _5 = __copy__5;
                          tco: while (true) {
                              var c_1 = c;
                              if (_5 instanceof Data_List.Nil) {
                                  return c_1;
                              };
                              if (_5 instanceof Data_List.Cons) {
                                  var __tco_k_1 = k_1;
                                  var __tco_c = k_1(c)(_5.value0);
                                  var __tco__5 = _5.value1;
                                  k_1 = __tco_k_1;
                                  c = __tco_c;
                                  _5 = __tco__5;
                                  continue tco;
                              };
                              throw new Error("Failed pattern match at Data.CatList line 95, column 1 - line 96, column 1: " + [ k_1.constructor.name, c.constructor.name, _5.constructor.name ]);
                          };
                      };
                  };
              };
              var go = function (__copy_xs) {
                  return function (__copy_ys) {
                      var xs = __copy_xs;
                      var ys = __copy_ys;
                      tco: while (true) {
                          var _20 = Data_CatQueue.uncons(xs);
                          if (_20 instanceof Data_Maybe.Nothing) {
                              return foldl(function (x) {
                                  return function (i) {
                                      return i(x);
                                  };
                              })(b)(ys);
                          };
                          if (_20 instanceof Data_Maybe.Just) {
                              var __tco_ys = new Data_List.Cons(k(_20.value0.value0), ys);
                              xs = _20.value0.value1;
                              ys = __tco_ys;
                              continue tco;
                          };
                          throw new Error("Failed pattern match at Data.CatList line 95, column 1 - line 96, column 1: " + [ _20.constructor.name ]);
                      };
                  };
              };
              return go(q)(Data_List.Nil.value);
          };
      };
  };
  var uncons = function (_3) {
      if (_3 instanceof CatNil) {
          return Data_Maybe.Nothing.value;
      };
      if (_3 instanceof CatCons) {
          return new Data_Maybe.Just(new Data_Tuple.Tuple(_3.value0, (function () {
              var _25 = Data_CatQueue["null"](_3.value1);
              if (_25) {
                  return CatNil.value;
              };
              if (!_25) {
                  return foldr(link)(CatNil.value)(_3.value1);
              };
              throw new Error("Failed pattern match at Data.CatList line 79, column 1 - line 80, column 1: " + [ _25.constructor.name ]);
          })()));
      };
      throw new Error("Failed pattern match at Data.CatList line 79, column 1 - line 80, column 1: " + [ _3.constructor.name ]);
  };
  var empty = CatNil.value;
  var append = function (_1) {
      return function (_2) {
          if (_2 instanceof CatNil) {
              return _1;
          };
          if (_1 instanceof CatNil) {
              return _2;
          };
          return link(_1)(_2);
      };
  };
  var semigroupCatList = new Prelude.Semigroup(append);
  var snoc = function (cat) {
      return function (a) {
          return append(cat)(new CatCons(a, Data_CatQueue.empty));
      };
  };
  exports["CatNil"] = CatNil;
  exports["CatCons"] = CatCons;
  exports["uncons"] = uncons;
  exports["snoc"] = snoc;
  exports["append"] = append;
  exports["empty"] = empty;
  exports["semigroupCatList"] = semigroupCatList;;
 
})(PS["Data.CatList"] = PS["Data.CatList"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Monad_Rec_Class = PS["Control.Monad.Rec.Class"];
  var Control_Monad_Trans = PS["Control.Monad.Trans"];
  var Data_CatList = PS["Data.CatList"];
  var Data_Either = PS["Data.Either"];
  var Data_Identity = PS["Data.Identity"];
  var Data_Inject = PS["Data.Inject"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_NaturalTransformation = PS["Data.NaturalTransformation"];
  var Data_Tuple = PS["Data.Tuple"];
  var Unsafe_Coerce = PS["Unsafe.Coerce"];
  var Free = (function () {
      function Free(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      Free.create = function (value0) {
          return function (value1) {
              return new Free(value0, value1);
          };
      };
      return Free;
  })();
  var Return = (function () {
      function Return(value0) {
          this.value0 = value0;
      };
      Return.create = function (value0) {
          return new Return(value0);
      };
      return Return;
  })();
  var Bind = (function () {
      function Bind(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      Bind.create = function (value0) {
          return function (value1) {
              return new Bind(value0, value1);
          };
      };
      return Bind;
  })();
  var toView = function (__copy__0) {
      var _0 = __copy__0;
      tco: while (true) {
          var runExpF = function (_3) {
              return _3;
          };
          var concatF = function (_2) {
              return function (r) {
                  return new Free(_2.value0, Prelude["<>"](Data_CatList.semigroupCatList)(_2.value1)(r));
              };
          };
          if (_0.value0 instanceof Return) {
              var _11 = Data_CatList.uncons(_0.value1);
              if (_11 instanceof Data_Maybe.Nothing) {
                  return new Return(Unsafe_Coerce.unsafeCoerce(_0.value0.value0));
              };
              if (_11 instanceof Data_Maybe.Just) {
                  var __tco__0 = Unsafe_Coerce.unsafeCoerce(concatF(runExpF(_11.value0.value0)(_0.value0.value0))(_11.value0.value1));
                  _0 = __tco__0;
                  continue tco;
              };
              throw new Error("Failed pattern match: " + [ _11.constructor.name ]);
          };
          if (_0.value0 instanceof Bind) {
              return new Bind(_0.value0.value0, function (a) {
                  return Unsafe_Coerce.unsafeCoerce(concatF(_0.value0.value1(a))(_0.value1));
              });
          };
          throw new Error("Failed pattern match: " + [ _0.value0.constructor.name ]);
      };
  };
  var runFreeM = function (__dict_Functor_0) {
      return function (__dict_MonadRec_1) {
          return function (k) {
              var go = function (f) {
                  var _20 = toView(f);
                  if (_20 instanceof Return) {
                      return Prelude["<$>"]((((__dict_MonadRec_1["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Bind_1"]())["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Either.Right.create)(Prelude.pure((__dict_MonadRec_1["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Applicative_0"]())(_20.value0));
                  };
                  if (_20 instanceof Bind) {
                      return Prelude["<$>"]((((__dict_MonadRec_1["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Bind_1"]())["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Either.Left.create)(k(Prelude["<$>"](__dict_Functor_0)(_20.value1)(_20.value0)));
                  };
                  throw new Error("Failed pattern match at Control.Monad.Free line 123, column 3 - line 124, column 3: " + [ _20.constructor.name ]);
              };
              return Control_Monad_Rec_Class.tailRecM(__dict_MonadRec_1)(go);
          };
      };
  };
  var fromView = function (f) {
      return new Free(Unsafe_Coerce.unsafeCoerce(f), Data_CatList.empty);
  };
  var freeMonad = new Prelude.Monad(function () {
      return freeApplicative;
  }, function () {
      return freeBind;
  });
  var freeFunctor = new Prelude.Functor(function (k) {
      return function (f) {
          return Prelude[">>="](freeBind)(f)(function (_35) {
              return Prelude["return"](freeApplicative)(k(_35));
          });
      };
  });
  var freeBind = new Prelude.Bind(function () {
      return freeApply;
  }, function (_1) {
      return function (k) {
          return new Free(_1.value0, Data_CatList.snoc(_1.value1)(Unsafe_Coerce.unsafeCoerce(k)));
      };
  });
  var freeApply = new Prelude.Apply(function () {
      return freeFunctor;
  }, Prelude.ap(freeMonad));
  var freeApplicative = new Prelude.Applicative(function () {
      return freeApply;
  }, function (_36) {
      return fromView(Return.create(_36));
  });
  var liftF = function (f) {
      return fromView(new Bind(Unsafe_Coerce.unsafeCoerce(f), function (_37) {
          return Prelude.pure(freeApplicative)(Unsafe_Coerce.unsafeCoerce(_37));
      }));
  };
  exports["runFreeM"] = runFreeM;
  exports["liftF"] = liftF;
  exports["freeFunctor"] = freeFunctor;
  exports["freeBind"] = freeBind;
  exports["freeApplicative"] = freeApplicative;
  exports["freeApply"] = freeApply;
  exports["freeMonad"] = freeMonad;;
 
})(PS["Control.Monad.Free"] = PS["Control.Monad.Free"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Exists = PS["Data.Exists"];
  var Data_Either = PS["Data.Either"];
  var Data_Bifunctor = PS["Data.Bifunctor"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Monad_Rec_Class = PS["Control.Monad.Rec.Class"];
  var Control_Monad_Trans = PS["Control.Monad.Trans"];     
  var Bound = (function () {
      function Bound(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      Bound.create = function (value0) {
          return function (value1) {
              return new Bound(value0, value1);
          };
      };
      return Bound;
  })();
  var FreeT = (function () {
      function FreeT(value0) {
          this.value0 = value0;
      };
      FreeT.create = function (value0) {
          return new FreeT(value0);
      };
      return FreeT;
  })();
  var Bind = (function () {
      function Bind(value0) {
          this.value0 = value0;
      };
      Bind.create = function (value0) {
          return new Bind(value0);
      };
      return Bind;
  })();
  var monadTransFreeT = function (__dict_Functor_4) {
      return new Control_Monad_Trans.MonadTrans(function (__dict_Monad_5) {
          return function (ma) {
              return new FreeT(function (_11) {
                  return Prelude.map(((__dict_Monad_5["__superclass_Prelude.Bind_1"]())["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Either.Left.create)(ma);
              });
          };
      });
  };
  var freeT = FreeT.create;
  var bound = function (m) {
      return function (f) {
          return new Bind(Data_Exists.mkExists(new Bound(m, f)));
      };
  };
  var functorFreeT = function (__dict_Functor_12) {
      return function (__dict_Functor_13) {
          return new Prelude.Functor(function (f) {
              return function (_17) {
                  if (_17 instanceof FreeT) {
                      return new FreeT(function (_5) {
                          return Prelude.map(__dict_Functor_13)(Data_Bifunctor.bimap(Data_Either.bifunctorEither)(f)(Prelude.map(__dict_Functor_12)(Prelude.map(functorFreeT(__dict_Functor_12)(__dict_Functor_13))(f))))(_17.value0(Prelude.unit));
                      });
                  };
                  if (_17 instanceof Bind) {
                      return Data_Exists.runExists(function (_6) {
                          return bound(_6.value0)(function (_72) {
                              return Prelude.map(functorFreeT(__dict_Functor_12)(__dict_Functor_13))(f)(_6.value1(_72));
                          });
                      })(_17.value0);
                  };
                  throw new Error("Failed pattern match: " + [ f.constructor.name, _17.constructor.name ]);
              };
          });
      };
  };
  var bimapFreeT = function (__dict_Functor_16) {
      return function (__dict_Functor_17) {
          return function (nf) {
              return function (nm) {
                  return function (_15) {
                      if (_15 instanceof Bind) {
                          return Data_Exists.runExists(function (_13) {
                              return bound(function (_73) {
                                  return bimapFreeT(__dict_Functor_16)(__dict_Functor_17)(nf)(nm)(_13.value0(_73));
                              })(function (_74) {
                                  return bimapFreeT(__dict_Functor_16)(__dict_Functor_17)(nf)(nm)(_13.value1(_74));
                              });
                          })(_15.value0);
                      };
                      if (_15 instanceof FreeT) {
                          return new FreeT(function (_14) {
                              return Prelude["<$>"](__dict_Functor_17)(Prelude.map(Data_Either.functorEither)(function (_75) {
                                  return nf(Prelude.map(__dict_Functor_16)(bimapFreeT(__dict_Functor_16)(__dict_Functor_17)(nf)(nm))(_75));
                              }))(nm(_15.value0(Prelude.unit)));
                          });
                      };
                      throw new Error("Failed pattern match: " + [ nf.constructor.name, nm.constructor.name, _15.constructor.name ]);
                  };
              };
          };
      };
  };
  var hoistFreeT = function (__dict_Functor_18) {
      return function (__dict_Functor_19) {
          return bimapFreeT(__dict_Functor_18)(__dict_Functor_19)(Prelude.id(Prelude.categoryFn));
      };
  };
  var monadFreeT = function (__dict_Functor_8) {
      return function (__dict_Monad_9) {
          return new Prelude.Monad(function () {
              return applicativeFreeT(__dict_Functor_8)(__dict_Monad_9);
          }, function () {
              return bindFreeT(__dict_Functor_8)(__dict_Monad_9);
          });
      };
  };
  var bindFreeT = function (__dict_Functor_14) {
      return function (__dict_Monad_15) {
          return new Prelude.Bind(function () {
              return applyFreeT(__dict_Functor_14)(__dict_Monad_15);
          }, function (_18) {
              return function (f) {
                  if (_18 instanceof Bind) {
                      return Data_Exists.runExists(function (_9) {
                          return bound(_9.value0)(function (x) {
                              return bound(function (_8) {
                                  return _9.value1(x);
                              })(f);
                          });
                      })(_18.value0);
                  };
                  return bound(function (_10) {
                      return _18;
                  })(f);
              };
          });
      };
  };
  var applyFreeT = function (__dict_Functor_22) {
      return function (__dict_Monad_23) {
          return new Prelude.Apply(function () {
              return functorFreeT(__dict_Functor_22)(((__dict_Monad_23["__superclass_Prelude.Bind_1"]())["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]());
          }, Prelude.ap(monadFreeT(__dict_Functor_22)(__dict_Monad_23)));
      };
  };
  var applicativeFreeT = function (__dict_Functor_24) {
      return function (__dict_Monad_25) {
          return new Prelude.Applicative(function () {
              return applyFreeT(__dict_Functor_24)(__dict_Monad_25);
          }, function (a) {
              return new FreeT(function (_7) {
                  return Prelude.pure(__dict_Monad_25["__superclass_Prelude.Applicative_0"]())(new Data_Either.Left(a));
              });
          });
      };
  };
  var liftFreeT = function (__dict_Functor_10) {
      return function (__dict_Monad_11) {
          return function (fa) {
              return new FreeT(function (_12) {
                  return Prelude["return"](__dict_Monad_11["__superclass_Prelude.Applicative_0"]())(new Data_Either.Right(Prelude.map(__dict_Functor_10)(Prelude.pure(applicativeFreeT(__dict_Functor_10)(__dict_Monad_11)))(fa)));
              });
          };
      };
  };
  var resume = function (__dict_Functor_0) {
      return function (__dict_MonadRec_1) {
          var go = function (_16) {
              if (_16 instanceof FreeT) {
                  return Prelude.map((((__dict_MonadRec_1["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Bind_1"]())["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Either.Right.create)(_16.value0(Prelude.unit));
              };
              if (_16 instanceof Bind) {
                  return Data_Exists.runExists(function (_4) {
                      var _51 = _4.value0(Prelude.unit);
                      if (_51 instanceof FreeT) {
                          return Prelude.bind((__dict_MonadRec_1["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Bind_1"]())(_51.value0(Prelude.unit))(function (_0) {
                              if (_0 instanceof Data_Either.Left) {
                                  return Prelude["return"]((__dict_MonadRec_1["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Applicative_0"]())(new Data_Either.Left(_4.value1(_0.value0)));
                              };
                              if (_0 instanceof Data_Either.Right) {
                                  return Prelude["return"]((__dict_MonadRec_1["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Applicative_0"]())(new Data_Either.Right(new Data_Either.Right(Prelude.map(__dict_Functor_0)(function (h) {
                                      return Prelude[">>="](bindFreeT(__dict_Functor_0)(__dict_MonadRec_1["__superclass_Prelude.Monad_0"]()))(h)(_4.value1);
                                  })(_0.value0))));
                              };
                              throw new Error("Failed pattern match at Control.Monad.Free.Trans line 43, column 3 - line 44, column 3: " + [ _0.constructor.name ]);
                          });
                      };
                      if (_51 instanceof Bind) {
                          return Data_Exists.runExists(function (_3) {
                              return Prelude["return"]((__dict_MonadRec_1["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Applicative_0"]())(new Data_Either.Left(Prelude.bind(bindFreeT(__dict_Functor_0)(__dict_MonadRec_1["__superclass_Prelude.Monad_0"]()))(_3.value0(Prelude.unit))(function (z) {
                                  return Prelude[">>="](bindFreeT(__dict_Functor_0)(__dict_MonadRec_1["__superclass_Prelude.Monad_0"]()))(_3.value1(z))(_4.value1);
                              })));
                          })(_51.value0);
                      };
                      throw new Error("Failed pattern match at Control.Monad.Free.Trans line 43, column 3 - line 44, column 3: " + [ _51.constructor.name ]);
                  })(_16.value0);
              };
              throw new Error("Failed pattern match at Control.Monad.Free.Trans line 43, column 3 - line 44, column 3: " + [ _16.constructor.name ]);
          };
          return Control_Monad_Rec_Class.tailRecM(__dict_MonadRec_1)(go);
      };
  };
  var runFreeT = function (__dict_Functor_2) {
      return function (__dict_MonadRec_3) {
          return function (interp) {
              var go = function (_19) {
                  if (_19 instanceof Data_Either.Left) {
                      return Prelude["return"]((__dict_MonadRec_3["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Applicative_0"]())(new Data_Either.Right(_19.value0));
                  };
                  if (_19 instanceof Data_Either.Right) {
                      return Prelude.bind((__dict_MonadRec_3["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Bind_1"]())(interp(_19.value0))(function (_2) {
                          return Prelude["return"]((__dict_MonadRec_3["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Applicative_0"]())(new Data_Either.Left(_2));
                      });
                  };
                  throw new Error("Failed pattern match at Control.Monad.Free.Trans line 103, column 3 - line 104, column 3: " + [ _19.constructor.name ]);
              };
              return Control_Monad_Rec_Class.tailRecM(__dict_MonadRec_3)(Control_Bind["<=<"]((__dict_MonadRec_3["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Bind_1"]())(go)(resume(__dict_Functor_2)(__dict_MonadRec_3)));
          };
      };
  };
  var monadRecFreeT = function (__dict_Functor_6) {
      return function (__dict_Monad_7) {
          return new Control_Monad_Rec_Class.MonadRec(function () {
              return monadFreeT(__dict_Functor_6)(__dict_Monad_7);
          }, function (f) {
              var go = function (s) {
                  return Prelude.bind(bindFreeT(__dict_Functor_6)(__dict_Monad_7))(f(s))(function (_1) {
                      if (_1 instanceof Data_Either.Left) {
                          return go(_1.value0);
                      };
                      if (_1 instanceof Data_Either.Right) {
                          return Prelude["return"](applicativeFreeT(__dict_Functor_6)(__dict_Monad_7))(_1.value0);
                      };
                      throw new Error("Failed pattern match at Control.Monad.Free.Trans line 73, column 1 - line 83, column 1: " + [ _1.constructor.name ]);
                  });
              };
              return go;
          });
      };
  };
  exports["runFreeT"] = runFreeT;
  exports["resume"] = resume;
  exports["bimapFreeT"] = bimapFreeT;
  exports["hoistFreeT"] = hoistFreeT;
  exports["liftFreeT"] = liftFreeT;
  exports["freeT"] = freeT;
  exports["functorFreeT"] = functorFreeT;
  exports["applyFreeT"] = applyFreeT;
  exports["applicativeFreeT"] = applicativeFreeT;
  exports["bindFreeT"] = bindFreeT;
  exports["monadFreeT"] = monadFreeT;
  exports["monadTransFreeT"] = monadTransFreeT;
  exports["monadRecFreeT"] = monadRecFreeT;;
 
})(PS["Control.Monad.Free.Trans"] = PS["Control.Monad.Free.Trans"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Tuple = PS["Data.Tuple"];
  var Data_Either = PS["Data.Either"];
  var Control_Alt = PS["Control.Alt"];
  var Control_Alternative = PS["Control.Alternative"];
  var Control_Lazy = PS["Control.Lazy"];
  var Control_Monad_Cont_Class = PS["Control.Monad.Cont.Class"];
  var Control_Monad_Eff_Class = PS["Control.Monad.Eff.Class"];
  var Control_Monad_Error_Class = PS["Control.Monad.Error.Class"];
  var Control_Monad_Reader_Class = PS["Control.Monad.Reader.Class"];
  var Control_Monad_Rec_Class = PS["Control.Monad.Rec.Class"];
  var Control_Monad_State_Class = PS["Control.Monad.State.Class"];
  var Control_Monad_Trans = PS["Control.Monad.Trans"];
  var Control_Monad_Writer_Class = PS["Control.Monad.Writer.Class"];
  var Control_MonadPlus = PS["Control.MonadPlus"];
  var Control_Plus = PS["Control.Plus"];     
  var StateT = function (x) {
      return x;
  };
  var runStateT = function (_6) {
      return _6;
  };
  var monadStateT = function (__dict_Monad_5) {
      return new Prelude.Monad(function () {
          return applicativeStateT(__dict_Monad_5);
      }, function () {
          return bindStateT(__dict_Monad_5);
      });
  };
  var functorStateT = function (__dict_Monad_14) {
      return new Prelude.Functor(Prelude.liftM1(monadStateT(__dict_Monad_14)));
  };
  var bindStateT = function (__dict_Monad_17) {
      return new Prelude.Bind(function () {
          return applyStateT(__dict_Monad_17);
      }, function (_7) {
          return function (f) {
              return function (s) {
                  return Prelude.bind(__dict_Monad_17["__superclass_Prelude.Bind_1"]())(_7(s))(function (_0) {
                      return runStateT(f(_0.value0))(_0.value1);
                  });
              };
          };
      });
  };
  var applyStateT = function (__dict_Monad_18) {
      return new Prelude.Apply(function () {
          return functorStateT(__dict_Monad_18);
      }, Prelude.ap(monadStateT(__dict_Monad_18)));
  };
  var applicativeStateT = function (__dict_Monad_19) {
      return new Prelude.Applicative(function () {
          return applyStateT(__dict_Monad_19);
      }, function (a) {
          return StateT(function (s) {
              return Prelude["return"](__dict_Monad_19["__superclass_Prelude.Applicative_0"]())(new Data_Tuple.Tuple(a, s));
          });
      });
  };
  var monadStateStateT = function (__dict_Monad_6) {
      return new Control_Monad_State_Class.MonadState(function () {
          return monadStateT(__dict_Monad_6);
      }, function (f) {
          return StateT(function (_39) {
              return Prelude["return"](__dict_Monad_6["__superclass_Prelude.Applicative_0"]())(f(_39));
          });
      });
  };
  exports["StateT"] = StateT;
  exports["runStateT"] = runStateT;
  exports["functorStateT"] = functorStateT;
  exports["applyStateT"] = applyStateT;
  exports["applicativeStateT"] = applicativeStateT;
  exports["bindStateT"] = bindStateT;
  exports["monadStateT"] = monadStateT;
  exports["monadStateStateT"] = monadStateStateT;;
 
})(PS["Control.Monad.State.Trans"] = PS["Control.Monad.State.Trans"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Monad_State_Class = PS["Control.Monad.State.Class"];
  var Control_Monad_State_Trans = PS["Control.Monad.State.Trans"];
  var Data_Identity = PS["Data.Identity"];
  var Data_Tuple = PS["Data.Tuple"];                   
  var runState = function (s) {
      return function (_0) {
          return Data_Identity.runIdentity(Control_Monad_State_Trans.runStateT(s)(_0));
      };
  };
  exports["runState"] = runState;;
 
})(PS["Control.Monad.State"] = PS["Control.Monad.State"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Either = PS["Data.Either"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Traversable = PS["Data.Traversable"];     
  var Coproduct = function (x) {
      return x;
  };
  var right = function (_2) {
      return Coproduct(Data_Either.Right.create(_2));
  };
  var left = function (_3) {
      return Coproduct(Data_Either.Left.create(_3));
  };
  exports["Coproduct"] = Coproduct;
  exports["right"] = right;
  exports["left"] = left;;
 
})(PS["Data.Functor.Coproduct"] = PS["Data.Functor.Coproduct"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_List = PS["Data.List"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Maybe_Unsafe = PS["Data.Maybe.Unsafe"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Traversable = PS["Data.Traversable"];
  var Data_Tuple = PS["Data.Tuple"];     
  var Leaf = (function () {
      function Leaf() {

      };
      Leaf.value = new Leaf();
      return Leaf;
  })();
  var Two = (function () {
      function Two(value0, value1, value2, value3) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
          this.value3 = value3;
      };
      Two.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return function (value3) {
                      return new Two(value0, value1, value2, value3);
                  };
              };
          };
      };
      return Two;
  })();
  var Three = (function () {
      function Three(value0, value1, value2, value3, value4, value5, value6) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
          this.value3 = value3;
          this.value4 = value4;
          this.value5 = value5;
          this.value6 = value6;
      };
      Three.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return function (value3) {
                      return function (value4) {
                          return function (value5) {
                              return function (value6) {
                                  return new Three(value0, value1, value2, value3, value4, value5, value6);
                              };
                          };
                      };
                  };
              };
          };
      };
      return Three;
  })();
  var TwoLeft = (function () {
      function TwoLeft(value0, value1, value2) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
      };
      TwoLeft.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return new TwoLeft(value0, value1, value2);
              };
          };
      };
      return TwoLeft;
  })();
  var TwoRight = (function () {
      function TwoRight(value0, value1, value2) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
      };
      TwoRight.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return new TwoRight(value0, value1, value2);
              };
          };
      };
      return TwoRight;
  })();
  var ThreeLeft = (function () {
      function ThreeLeft(value0, value1, value2, value3, value4, value5) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
          this.value3 = value3;
          this.value4 = value4;
          this.value5 = value5;
      };
      ThreeLeft.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return function (value3) {
                      return function (value4) {
                          return function (value5) {
                              return new ThreeLeft(value0, value1, value2, value3, value4, value5);
                          };
                      };
                  };
              };
          };
      };
      return ThreeLeft;
  })();
  var ThreeMiddle = (function () {
      function ThreeMiddle(value0, value1, value2, value3, value4, value5) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
          this.value3 = value3;
          this.value4 = value4;
          this.value5 = value5;
      };
      ThreeMiddle.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return function (value3) {
                      return function (value4) {
                          return function (value5) {
                              return new ThreeMiddle(value0, value1, value2, value3, value4, value5);
                          };
                      };
                  };
              };
          };
      };
      return ThreeMiddle;
  })();
  var ThreeRight = (function () {
      function ThreeRight(value0, value1, value2, value3, value4, value5) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
          this.value3 = value3;
          this.value4 = value4;
          this.value5 = value5;
      };
      ThreeRight.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return function (value3) {
                      return function (value4) {
                          return function (value5) {
                              return new ThreeRight(value0, value1, value2, value3, value4, value5);
                          };
                      };
                  };
              };
          };
      };
      return ThreeRight;
  })();
  var KickUp = (function () {
      function KickUp(value0, value1, value2, value3) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
          this.value3 = value3;
      };
      KickUp.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return function (value3) {
                      return new KickUp(value0, value1, value2, value3);
                  };
              };
          };
      };
      return KickUp;
  })();
  var lookup = function (__copy___dict_Ord_6) {
      return function (__copy_k) {
          return function (__copy__4) {
              var __dict_Ord_6 = __copy___dict_Ord_6;
              var k = __copy_k;
              var _4 = __copy__4;
              tco: while (true) {
                  if (_4 instanceof Leaf) {
                      return Data_Maybe.Nothing.value;
                  };
                  var k_1 = k;
                  if (_4 instanceof Two && Prelude["=="](__dict_Ord_6["__superclass_Prelude.Eq_0"]())(k_1)(_4.value1)) {
                      return new Data_Maybe.Just(_4.value2);
                  };
                  var k_1 = k;
                  if (_4 instanceof Two && Prelude["<"](__dict_Ord_6)(k_1)(_4.value1)) {
                      var __tco___dict_Ord_6 = __dict_Ord_6;
                      var __tco__4 = _4.value0;
                      __dict_Ord_6 = __tco___dict_Ord_6;
                      k = k_1;
                      _4 = __tco__4;
                      continue tco;
                  };
                  var k_1 = k;
                  if (_4 instanceof Two) {
                      var __tco___dict_Ord_6 = __dict_Ord_6;
                      var __tco__4 = _4.value3;
                      __dict_Ord_6 = __tco___dict_Ord_6;
                      k = k_1;
                      _4 = __tco__4;
                      continue tco;
                  };
                  var k_1 = k;
                  if (_4 instanceof Three && Prelude["=="](__dict_Ord_6["__superclass_Prelude.Eq_0"]())(k_1)(_4.value1)) {
                      return new Data_Maybe.Just(_4.value2);
                  };
                  var k_1 = k;
                  if (_4 instanceof Three && Prelude["=="](__dict_Ord_6["__superclass_Prelude.Eq_0"]())(k_1)(_4.value4)) {
                      return new Data_Maybe.Just(_4.value5);
                  };
                  var k_1 = k;
                  if (_4 instanceof Three && Prelude["<"](__dict_Ord_6)(k_1)(_4.value1)) {
                      var __tco___dict_Ord_6 = __dict_Ord_6;
                      var __tco__4 = _4.value0;
                      __dict_Ord_6 = __tco___dict_Ord_6;
                      k = k_1;
                      _4 = __tco__4;
                      continue tco;
                  };
                  var k_1 = k;
                  if (_4 instanceof Three && (Prelude["<"](__dict_Ord_6)(_4.value1)(k_1) && Prelude["<="](__dict_Ord_6)(k_1)(_4.value4))) {
                      var __tco___dict_Ord_6 = __dict_Ord_6;
                      var __tco__4 = _4.value3;
                      __dict_Ord_6 = __tco___dict_Ord_6;
                      k = k_1;
                      _4 = __tco__4;
                      continue tco;
                  };
                  if (_4 instanceof Three) {
                      var __tco___dict_Ord_6 = __dict_Ord_6;
                      var __tco_k = k;
                      var __tco__4 = _4.value6;
                      __dict_Ord_6 = __tco___dict_Ord_6;
                      k = __tco_k;
                      _4 = __tco__4;
                      continue tco;
                  };
                  throw new Error("Failed pattern match: " + [ k.constructor.name, _4.constructor.name ]);
              };
          };
      };
  }; 
  var fromZipper = function (__copy___dict_Ord_8) {
      return function (__copy__5) {
          return function (__copy__6) {
              var __dict_Ord_8 = __copy___dict_Ord_8;
              var _5 = __copy__5;
              var _6 = __copy__6;
              tco: while (true) {
                  if (_5 instanceof Data_List.Nil) {
                      return _6;
                  };
                  if (_5 instanceof Data_List.Cons && _5.value0 instanceof TwoLeft) {
                      var __tco___dict_Ord_8 = __dict_Ord_8;
                      var __tco__5 = _5.value1;
                      var __tco__6 = new Two(_6, _5.value0.value0, _5.value0.value1, _5.value0.value2);
                      __dict_Ord_8 = __tco___dict_Ord_8;
                      _5 = __tco__5;
                      _6 = __tco__6;
                      continue tco;
                  };
                  if (_5 instanceof Data_List.Cons && _5.value0 instanceof TwoRight) {
                      var __tco___dict_Ord_8 = __dict_Ord_8;
                      var __tco__5 = _5.value1;
                      var __tco__6 = new Two(_5.value0.value0, _5.value0.value1, _5.value0.value2, _6);
                      __dict_Ord_8 = __tco___dict_Ord_8;
                      _5 = __tco__5;
                      _6 = __tco__6;
                      continue tco;
                  };
                  if (_5 instanceof Data_List.Cons && _5.value0 instanceof ThreeLeft) {
                      var __tco___dict_Ord_8 = __dict_Ord_8;
                      var __tco__5 = _5.value1;
                      var __tco__6 = new Three(_6, _5.value0.value0, _5.value0.value1, _5.value0.value2, _5.value0.value3, _5.value0.value4, _5.value0.value5);
                      __dict_Ord_8 = __tco___dict_Ord_8;
                      _5 = __tco__5;
                      _6 = __tco__6;
                      continue tco;
                  };
                  if (_5 instanceof Data_List.Cons && _5.value0 instanceof ThreeMiddle) {
                      var __tco___dict_Ord_8 = __dict_Ord_8;
                      var __tco__5 = _5.value1;
                      var __tco__6 = new Three(_5.value0.value0, _5.value0.value1, _5.value0.value2, _6, _5.value0.value3, _5.value0.value4, _5.value0.value5);
                      __dict_Ord_8 = __tco___dict_Ord_8;
                      _5 = __tco__5;
                      _6 = __tco__6;
                      continue tco;
                  };
                  if (_5 instanceof Data_List.Cons && _5.value0 instanceof ThreeRight) {
                      var __tco___dict_Ord_8 = __dict_Ord_8;
                      var __tco__5 = _5.value1;
                      var __tco__6 = new Three(_5.value0.value0, _5.value0.value1, _5.value0.value2, _5.value0.value3, _5.value0.value4, _5.value0.value5, _6);
                      __dict_Ord_8 = __tco___dict_Ord_8;
                      _5 = __tco__5;
                      _6 = __tco__6;
                      continue tco;
                  };
                  throw new Error("Failed pattern match: " + [ _5.constructor.name, _6.constructor.name ]);
              };
          };
      };
  };
  var insert = function (__dict_Ord_9) {
      var up = function (__copy__13) {
          return function (__copy__14) {
              var _13 = __copy__13;
              var _14 = __copy__14;
              tco: while (true) {
                  if (_13 instanceof Data_List.Nil) {
                      return new Two(_14.value0, _14.value1, _14.value2, _14.value3);
                  };
                  if (_13 instanceof Data_List.Cons && _13.value0 instanceof TwoLeft) {
                      return fromZipper(__dict_Ord_9)(_13.value1)(new Three(_14.value0, _14.value1, _14.value2, _14.value3, _13.value0.value0, _13.value0.value1, _13.value0.value2));
                  };
                  if (_13 instanceof Data_List.Cons && _13.value0 instanceof TwoRight) {
                      return fromZipper(__dict_Ord_9)(_13.value1)(new Three(_13.value0.value0, _13.value0.value1, _13.value0.value2, _14.value0, _14.value1, _14.value2, _14.value3));
                  };
                  if (_13 instanceof Data_List.Cons && _13.value0 instanceof ThreeLeft) {
                      var __tco__13 = _13.value1;
                      var __tco__14 = new KickUp(new Two(_14.value0, _14.value1, _14.value2, _14.value3), _13.value0.value0, _13.value0.value1, new Two(_13.value0.value2, _13.value0.value3, _13.value0.value4, _13.value0.value5));
                      _13 = __tco__13;
                      _14 = __tco__14;
                      continue tco;
                  };
                  if (_13 instanceof Data_List.Cons && _13.value0 instanceof ThreeMiddle) {
                      var __tco__13 = _13.value1;
                      var __tco__14 = new KickUp(new Two(_13.value0.value0, _13.value0.value1, _13.value0.value2, _14.value0), _14.value1, _14.value2, new Two(_14.value3, _13.value0.value3, _13.value0.value4, _13.value0.value5));
                      _13 = __tco__13;
                      _14 = __tco__14;
                      continue tco;
                  };
                  if (_13 instanceof Data_List.Cons && _13.value0 instanceof ThreeRight) {
                      var __tco__13 = _13.value1;
                      var __tco__14 = new KickUp(new Two(_13.value0.value0, _13.value0.value1, _13.value0.value2, _13.value0.value3), _13.value0.value4, _13.value0.value5, new Two(_14.value0, _14.value1, _14.value2, _14.value3));
                      _13 = __tco__13;
                      _14 = __tco__14;
                      continue tco;
                  };
                  throw new Error("Failed pattern match at Data.Map line 150, column 1 - line 151, column 1: " + [ _13.constructor.name, _14.constructor.name ]);
              };
          };
      };
      var down = function (__copy_ctx) {
          return function (__copy_k) {
              return function (__copy_v) {
                  return function (__copy__12) {
                      var ctx = __copy_ctx;
                      var k = __copy_k;
                      var v = __copy_v;
                      var _12 = __copy__12;
                      tco: while (true) {
                          var ctx_1 = ctx;
                          var k_1 = k;
                          var v_1 = v;
                          if (_12 instanceof Leaf) {
                              return up(ctx_1)(new KickUp(Leaf.value, k_1, v_1, Leaf.value));
                          };
                          var ctx_1 = ctx;
                          var k_1 = k;
                          var v_1 = v;
                          if (_12 instanceof Two && Prelude["=="](__dict_Ord_9["__superclass_Prelude.Eq_0"]())(k_1)(_12.value1)) {
                              return fromZipper(__dict_Ord_9)(ctx_1)(new Two(_12.value0, k_1, v_1, _12.value3));
                          };
                          var ctx_1 = ctx;
                          var k_1 = k;
                          var v_1 = v;
                          if (_12 instanceof Two && Prelude["<"](__dict_Ord_9)(k_1)(_12.value1)) {
                              var __tco_ctx = new Data_List.Cons(new TwoLeft(_12.value1, _12.value2, _12.value3), ctx_1);
                              var __tco__12 = _12.value0;
                              ctx = __tco_ctx;
                              k = k_1;
                              v = v_1;
                              _12 = __tco__12;
                              continue tco;
                          };
                          var ctx_1 = ctx;
                          var k_1 = k;
                          var v_1 = v;
                          if (_12 instanceof Two) {
                              var __tco_ctx = new Data_List.Cons(new TwoRight(_12.value0, _12.value1, _12.value2), ctx_1);
                              var __tco__12 = _12.value3;
                              ctx = __tco_ctx;
                              k = k_1;
                              v = v_1;
                              _12 = __tco__12;
                              continue tco;
                          };
                          var ctx_1 = ctx;
                          var k_1 = k;
                          var v_1 = v;
                          if (_12 instanceof Three && Prelude["=="](__dict_Ord_9["__superclass_Prelude.Eq_0"]())(k_1)(_12.value1)) {
                              return fromZipper(__dict_Ord_9)(ctx_1)(new Three(_12.value0, k_1, v_1, _12.value3, _12.value4, _12.value5, _12.value6));
                          };
                          var ctx_1 = ctx;
                          var k_1 = k;
                          var v_1 = v;
                          if (_12 instanceof Three && Prelude["=="](__dict_Ord_9["__superclass_Prelude.Eq_0"]())(k_1)(_12.value4)) {
                              return fromZipper(__dict_Ord_9)(ctx_1)(new Three(_12.value0, _12.value1, _12.value2, _12.value3, k_1, v_1, _12.value6));
                          };
                          var ctx_1 = ctx;
                          var k_1 = k;
                          var v_1 = v;
                          if (_12 instanceof Three && Prelude["<"](__dict_Ord_9)(k_1)(_12.value1)) {
                              var __tco_ctx = new Data_List.Cons(new ThreeLeft(_12.value1, _12.value2, _12.value3, _12.value4, _12.value5, _12.value6), ctx_1);
                              var __tco__12 = _12.value0;
                              ctx = __tco_ctx;
                              k = k_1;
                              v = v_1;
                              _12 = __tco__12;
                              continue tco;
                          };
                          var ctx_1 = ctx;
                          var k_1 = k;
                          var v_1 = v;
                          if (_12 instanceof Three && (Prelude["<"](__dict_Ord_9)(_12.value1)(k_1) && Prelude["<="](__dict_Ord_9)(k_1)(_12.value4))) {
                              var __tco_ctx = new Data_List.Cons(new ThreeMiddle(_12.value0, _12.value1, _12.value2, _12.value4, _12.value5, _12.value6), ctx_1);
                              var __tco__12 = _12.value3;
                              ctx = __tco_ctx;
                              k = k_1;
                              v = v_1;
                              _12 = __tco__12;
                              continue tco;
                          };
                          if (_12 instanceof Three) {
                              var __tco_ctx = new Data_List.Cons(new ThreeRight(_12.value0, _12.value1, _12.value2, _12.value3, _12.value4, _12.value5), ctx);
                              var __tco_k = k;
                              var __tco_v = v;
                              var __tco__12 = _12.value6;
                              ctx = __tco_ctx;
                              k = __tco_k;
                              v = __tco_v;
                              _12 = __tco__12;
                              continue tco;
                          };
                          throw new Error("Failed pattern match at Data.Map line 150, column 1 - line 151, column 1: " + [ ctx.constructor.name, k.constructor.name, v.constructor.name, _12.constructor.name ]);
                      };
                  };
              };
          };
      };
      return down(Data_List.Nil.value);
  };
  var empty = Leaf.value;
  var $$delete = function (__dict_Ord_17) {
      var up = function (__copy__16) {
          return function (__copy__17) {
              var _16 = __copy__16;
              var _17 = __copy__17;
              tco: while (true) {
                  if (_16 instanceof Data_List.Nil) {
                      return _17;
                  };
                  if (_16 instanceof Data_List.Cons && (_16.value0 instanceof TwoLeft && (_16.value0.value2 instanceof Leaf && _17 instanceof Leaf))) {
                      return fromZipper(__dict_Ord_17)(_16.value1)(new Two(Leaf.value, _16.value0.value0, _16.value0.value1, Leaf.value));
                  };
                  if (_16 instanceof Data_List.Cons && (_16.value0 instanceof TwoRight && (_16.value0.value0 instanceof Leaf && _17 instanceof Leaf))) {
                      return fromZipper(__dict_Ord_17)(_16.value1)(new Two(Leaf.value, _16.value0.value1, _16.value0.value2, Leaf.value));
                  };
                  if (_16 instanceof Data_List.Cons && (_16.value0 instanceof TwoLeft && _16.value0.value2 instanceof Two)) {
                      var __tco__16 = _16.value1;
                      var __tco__17 = new Three(_17, _16.value0.value0, _16.value0.value1, _16.value0.value2.value0, _16.value0.value2.value1, _16.value0.value2.value2, _16.value0.value2.value3);
                      _16 = __tco__16;
                      _17 = __tco__17;
                      continue tco;
                  };
                  if (_16 instanceof Data_List.Cons && (_16.value0 instanceof TwoRight && _16.value0.value0 instanceof Two)) {
                      var __tco__16 = _16.value1;
                      var __tco__17 = new Three(_16.value0.value0.value0, _16.value0.value0.value1, _16.value0.value0.value2, _16.value0.value0.value3, _16.value0.value1, _16.value0.value2, _17);
                      _16 = __tco__16;
                      _17 = __tco__17;
                      continue tco;
                  };
                  if (_16 instanceof Data_List.Cons && (_16.value0 instanceof TwoLeft && _16.value0.value2 instanceof Three)) {
                      return fromZipper(__dict_Ord_17)(_16.value1)(new Two(new Two(_17, _16.value0.value0, _16.value0.value1, _16.value0.value2.value0), _16.value0.value2.value1, _16.value0.value2.value2, new Two(_16.value0.value2.value3, _16.value0.value2.value4, _16.value0.value2.value5, _16.value0.value2.value6)));
                  };
                  if (_16 instanceof Data_List.Cons && (_16.value0 instanceof TwoRight && _16.value0.value0 instanceof Three)) {
                      return fromZipper(__dict_Ord_17)(_16.value1)(new Two(new Two(_16.value0.value0.value0, _16.value0.value0.value1, _16.value0.value0.value2, _16.value0.value0.value3), _16.value0.value0.value4, _16.value0.value0.value5, new Two(_16.value0.value0.value6, _16.value0.value1, _16.value0.value2, _17)));
                  };
                  if (_16 instanceof Data_List.Cons && (_16.value0 instanceof ThreeLeft && (_16.value0.value2 instanceof Leaf && (_16.value0.value5 instanceof Leaf && _17 instanceof Leaf)))) {
                      return fromZipper(__dict_Ord_17)(_16.value1)(new Three(Leaf.value, _16.value0.value0, _16.value0.value1, Leaf.value, _16.value0.value3, _16.value0.value4, Leaf.value));
                  };
                  if (_16 instanceof Data_List.Cons && (_16.value0 instanceof ThreeMiddle && (_16.value0.value0 instanceof Leaf && (_16.value0.value5 instanceof Leaf && _17 instanceof Leaf)))) {
                      return fromZipper(__dict_Ord_17)(_16.value1)(new Three(Leaf.value, _16.value0.value1, _16.value0.value2, Leaf.value, _16.value0.value3, _16.value0.value4, Leaf.value));
                  };
                  if (_16 instanceof Data_List.Cons && (_16.value0 instanceof ThreeRight && (_16.value0.value0 instanceof Leaf && (_16.value0.value3 instanceof Leaf && _17 instanceof Leaf)))) {
                      return fromZipper(__dict_Ord_17)(_16.value1)(new Three(Leaf.value, _16.value0.value1, _16.value0.value2, Leaf.value, _16.value0.value4, _16.value0.value5, Leaf.value));
                  };
                  if (_16 instanceof Data_List.Cons && (_16.value0 instanceof ThreeLeft && _16.value0.value2 instanceof Two)) {
                      return fromZipper(__dict_Ord_17)(_16.value1)(new Two(new Three(_17, _16.value0.value0, _16.value0.value1, _16.value0.value2.value0, _16.value0.value2.value1, _16.value0.value2.value2, _16.value0.value2.value3), _16.value0.value3, _16.value0.value4, _16.value0.value5));
                  };
                  if (_16 instanceof Data_List.Cons && (_16.value0 instanceof ThreeMiddle && _16.value0.value0 instanceof Two)) {
                      return fromZipper(__dict_Ord_17)(_16.value1)(new Two(new Three(_16.value0.value0.value0, _16.value0.value0.value1, _16.value0.value0.value2, _16.value0.value0.value3, _16.value0.value1, _16.value0.value2, _17), _16.value0.value3, _16.value0.value4, _16.value0.value5));
                  };
                  if (_16 instanceof Data_List.Cons && (_16.value0 instanceof ThreeMiddle && _16.value0.value5 instanceof Two)) {
                      return fromZipper(__dict_Ord_17)(_16.value1)(new Two(_16.value0.value0, _16.value0.value1, _16.value0.value2, new Three(_17, _16.value0.value3, _16.value0.value4, _16.value0.value5.value0, _16.value0.value5.value1, _16.value0.value5.value2, _16.value0.value5.value3)));
                  };
                  if (_16 instanceof Data_List.Cons && (_16.value0 instanceof ThreeRight && _16.value0.value3 instanceof Two)) {
                      return fromZipper(__dict_Ord_17)(_16.value1)(new Two(_16.value0.value0, _16.value0.value1, _16.value0.value2, new Three(_16.value0.value3.value0, _16.value0.value3.value1, _16.value0.value3.value2, _16.value0.value3.value3, _16.value0.value4, _16.value0.value5, _17)));
                  };
                  if (_16 instanceof Data_List.Cons && (_16.value0 instanceof ThreeLeft && _16.value0.value2 instanceof Three)) {
                      return fromZipper(__dict_Ord_17)(_16.value1)(new Three(new Two(_17, _16.value0.value0, _16.value0.value1, _16.value0.value2.value0), _16.value0.value2.value1, _16.value0.value2.value2, new Two(_16.value0.value2.value3, _16.value0.value2.value4, _16.value0.value2.value5, _16.value0.value2.value6), _16.value0.value3, _16.value0.value4, _16.value0.value5));
                  };
                  if (_16 instanceof Data_List.Cons && (_16.value0 instanceof ThreeMiddle && _16.value0.value0 instanceof Three)) {
                      return fromZipper(__dict_Ord_17)(_16.value1)(new Three(new Two(_16.value0.value0.value0, _16.value0.value0.value1, _16.value0.value0.value2, _16.value0.value0.value3), _16.value0.value0.value4, _16.value0.value0.value5, new Two(_16.value0.value0.value6, _16.value0.value1, _16.value0.value2, _17), _16.value0.value3, _16.value0.value4, _16.value0.value5));
                  };
                  if (_16 instanceof Data_List.Cons && (_16.value0 instanceof ThreeMiddle && _16.value0.value5 instanceof Three)) {
                      return fromZipper(__dict_Ord_17)(_16.value1)(new Three(_16.value0.value0, _16.value0.value1, _16.value0.value2, new Two(_17, _16.value0.value3, _16.value0.value4, _16.value0.value5.value0), _16.value0.value5.value1, _16.value0.value5.value2, new Two(_16.value0.value5.value3, _16.value0.value5.value4, _16.value0.value5.value5, _16.value0.value5.value6)));
                  };
                  if (_16 instanceof Data_List.Cons && (_16.value0 instanceof ThreeRight && _16.value0.value3 instanceof Three)) {
                      return fromZipper(__dict_Ord_17)(_16.value1)(new Three(_16.value0.value0, _16.value0.value1, _16.value0.value2, new Two(_16.value0.value3.value0, _16.value0.value3.value1, _16.value0.value3.value2, _16.value0.value3.value3), _16.value0.value3.value4, _16.value0.value3.value5, new Two(_16.value0.value3.value6, _16.value0.value4, _16.value0.value5, _17)));
                  };
                  return Data_Maybe_Unsafe.unsafeThrow("Impossible case in 'up'");
              };
          };
      };
      var removeMaxNode = function (__copy_ctx) {
          return function (__copy__19) {
              var ctx = __copy_ctx;
              var _19 = __copy__19;
              tco: while (true) {
                  var ctx_1 = ctx;
                  if (_19 instanceof Two && (_19.value0 instanceof Leaf && _19.value3 instanceof Leaf)) {
                      return up(ctx_1)(Leaf.value);
                  };
                  var ctx_1 = ctx;
                  if (_19 instanceof Two) {
                      var __tco_ctx = new Data_List.Cons(new TwoRight(_19.value0, _19.value1, _19.value2), ctx_1);
                      var __tco__19 = _19.value3;
                      ctx = __tco_ctx;
                      _19 = __tco__19;
                      continue tco;
                  };
                  var ctx_1 = ctx;
                  if (_19 instanceof Three && (_19.value0 instanceof Leaf && (_19.value3 instanceof Leaf && _19.value6 instanceof Leaf))) {
                      return up(new Data_List.Cons(new TwoRight(Leaf.value, _19.value1, _19.value2), ctx_1))(Leaf.value);
                  };
                  if (_19 instanceof Three) {
                      var __tco_ctx = new Data_List.Cons(new ThreeRight(_19.value0, _19.value1, _19.value2, _19.value3, _19.value4, _19.value5), ctx);
                      var __tco__19 = _19.value6;
                      ctx = __tco_ctx;
                      _19 = __tco__19;
                      continue tco;
                  };
                  if (_19 instanceof Leaf) {
                      return Data_Maybe_Unsafe.unsafeThrow("Impossible case in 'removeMaxNode'");
                  };
                  throw new Error("Failed pattern match at Data.Map line 173, column 1 - line 174, column 1: " + [ ctx.constructor.name, _19.constructor.name ]);
              };
          };
      };
      var maxNode = function (__copy__18) {
          var _18 = __copy__18;
          tco: while (true) {
              if (_18 instanceof Two && _18.value3 instanceof Leaf) {
                  return {
                      key: _18.value1, 
                      value: _18.value2
                  };
              };
              if (_18 instanceof Two) {
                  var __tco__18 = _18.value3;
                  _18 = __tco__18;
                  continue tco;
              };
              if (_18 instanceof Three && _18.value6 instanceof Leaf) {
                  return {
                      key: _18.value4, 
                      value: _18.value5
                  };
              };
              if (_18 instanceof Three) {
                  var __tco__18 = _18.value6;
                  _18 = __tco__18;
                  continue tco;
              };
              if (_18 instanceof Leaf) {
                  return Data_Maybe_Unsafe.unsafeThrow("Impossible case in 'maxNode'");
              };
              throw new Error("Failed pattern match at Data.Map line 173, column 1 - line 174, column 1: " + [ _18.constructor.name ]);
          };
      };
      var down = function (__copy_ctx) {
          return function (__copy_k) {
              return function (__copy__15) {
                  var ctx = __copy_ctx;
                  var k = __copy_k;
                  var _15 = __copy__15;
                  tco: while (true) {
                      var ctx_1 = ctx;
                      if (_15 instanceof Leaf) {
                          return fromZipper(__dict_Ord_17)(ctx_1)(Leaf.value);
                      };
                      var ctx_1 = ctx;
                      var k_1 = k;
                      if (_15 instanceof Two && (_15.value0 instanceof Leaf && (_15.value3 instanceof Leaf && Prelude["=="](__dict_Ord_17["__superclass_Prelude.Eq_0"]())(k_1)(_15.value1)))) {
                          return up(ctx_1)(Leaf.value);
                      };
                      var ctx_1 = ctx;
                      var k_1 = k;
                      if (_15 instanceof Two) {
                          if (Prelude["=="](__dict_Ord_17["__superclass_Prelude.Eq_0"]())(k_1)(_15.value1)) {
                              var max = maxNode(_15.value0);
                              return removeMaxNode(new Data_List.Cons(new TwoLeft(max.key, max.value, _15.value3), ctx_1))(_15.value0);
                          };
                          if (Prelude["<"](__dict_Ord_17)(k_1)(_15.value1)) {
                              var __tco_ctx = new Data_List.Cons(new TwoLeft(_15.value1, _15.value2, _15.value3), ctx_1);
                              var __tco__15 = _15.value0;
                              ctx = __tco_ctx;
                              k = k_1;
                              _15 = __tco__15;
                              continue tco;
                          };
                          if (Prelude.otherwise) {
                              var __tco_ctx = new Data_List.Cons(new TwoRight(_15.value0, _15.value1, _15.value2), ctx_1);
                              var __tco__15 = _15.value3;
                              ctx = __tco_ctx;
                              k = k_1;
                              _15 = __tco__15;
                              continue tco;
                          };
                      };
                      var ctx_1 = ctx;
                      var k_1 = k;
                      if (_15 instanceof Three && (_15.value0 instanceof Leaf && (_15.value3 instanceof Leaf && _15.value6 instanceof Leaf))) {
                          if (Prelude["=="](__dict_Ord_17["__superclass_Prelude.Eq_0"]())(k_1)(_15.value1)) {
                              return fromZipper(__dict_Ord_17)(ctx_1)(new Two(Leaf.value, _15.value4, _15.value5, Leaf.value));
                          };
                          if (Prelude["=="](__dict_Ord_17["__superclass_Prelude.Eq_0"]())(k_1)(_15.value4)) {
                              return fromZipper(__dict_Ord_17)(ctx_1)(new Two(Leaf.value, _15.value1, _15.value2, Leaf.value));
                          };
                      };
                      if (_15 instanceof Three) {
                          if (Prelude["=="](__dict_Ord_17["__superclass_Prelude.Eq_0"]())(k)(_15.value1)) {
                              var max = maxNode(_15.value0);
                              return removeMaxNode(new Data_List.Cons(new ThreeLeft(max.key, max.value, _15.value3, _15.value4, _15.value5, _15.value6), ctx))(_15.value0);
                          };
                          if (Prelude["=="](__dict_Ord_17["__superclass_Prelude.Eq_0"]())(k)(_15.value4)) {
                              var max = maxNode(_15.value3);
                              return removeMaxNode(new Data_List.Cons(new ThreeMiddle(_15.value0, _15.value1, _15.value2, max.key, max.value, _15.value6), ctx))(_15.value3);
                          };
                          if (Prelude["<"](__dict_Ord_17)(k)(_15.value1)) {
                              var __tco_ctx = new Data_List.Cons(new ThreeLeft(_15.value1, _15.value2, _15.value3, _15.value4, _15.value5, _15.value6), ctx);
                              var __tco_k = k;
                              var __tco__15 = _15.value0;
                              ctx = __tco_ctx;
                              k = __tco_k;
                              _15 = __tco__15;
                              continue tco;
                          };
                          if (Prelude["<"](__dict_Ord_17)(_15.value1)(k) && Prelude["<"](__dict_Ord_17)(k)(_15.value4)) {
                              var __tco_ctx = new Data_List.Cons(new ThreeMiddle(_15.value0, _15.value1, _15.value2, _15.value4, _15.value5, _15.value6), ctx);
                              var __tco_k = k;
                              var __tco__15 = _15.value3;
                              ctx = __tco_ctx;
                              k = __tco_k;
                              _15 = __tco__15;
                              continue tco;
                          };
                          if (Prelude.otherwise) {
                              var __tco_ctx = new Data_List.Cons(new ThreeRight(_15.value0, _15.value1, _15.value2, _15.value3, _15.value4, _15.value5), ctx);
                              var __tco_k = k;
                              var __tco__15 = _15.value6;
                              ctx = __tco_ctx;
                              k = __tco_k;
                              _15 = __tco__15;
                              continue tco;
                          };
                      };
                      throw new Error("Failed pattern match at Data.Map line 173, column 1 - line 174, column 1: " + [ ctx.constructor.name, k.constructor.name, _15.constructor.name ]);
                  };
              };
          };
      };
      return down(Data_List.Nil.value);
  };
  var alter = function (__dict_Ord_18) {
      return function (f) {
          return function (k) {
              return function (m) {
                  var _553 = f(lookup(__dict_Ord_18)(k)(m));
                  if (_553 instanceof Data_Maybe.Nothing) {
                      return $$delete(__dict_Ord_18)(k)(m);
                  };
                  if (_553 instanceof Data_Maybe.Just) {
                      return insert(__dict_Ord_18)(k)(_553.value0)(m);
                  };
                  throw new Error("Failed pattern match at Data.Map line 235, column 1 - line 236, column 1: " + [ _553.constructor.name ]);
              };
          };
      };
  };
  exports["alter"] = alter;
  exports["lookup"] = lookup;
  exports["insert"] = insert;
  exports["empty"] = empty;;
 
})(PS["Data.Map"] = PS["Data.Map"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  exports._setTimeout = function (nonCanceler, millis, aff) {
    var set = setTimeout, clear = clearTimeout;
    if (millis <= 0 && typeof setImmediate === "function") {
      set = setImmediate;
      clear = clearImmediate;
    }
    return function(success, error) {
      var canceler;

      var timeout = set(function() {
        canceler = aff(success, error);
      }, millis);

      return function(e) {
        return function(s, f) {
          if (canceler !== undefined) {
            return canceler(e)(s, f);
          } else {
            clear(timeout);

            try {
              s(true);
            } catch (e) {
              f(e);
            }

            return nonCanceler;
          }
        };
      };
    };
  }

  exports._forkAff = function (nonCanceler, aff) {
    var voidF = function(){};

    return function(success, error) {
      var canceler = aff(voidF, voidF);

      try {
        success(canceler);
      } catch (e) {
        error(e);
      }

      return nonCanceler;
    };
  }

  exports._pure = function (nonCanceler, v) {
    return function(success, error) {
      try {
        success(v);
      } catch (e) {
        error(e);
      }

      return nonCanceler;
    };
  }

  exports._throwError = function (nonCanceler, e) {
    return function(success, error) {
      error(e);

      return nonCanceler;
    };
  }

  exports._fmap = function (f, aff) {
    return function(success, error) {
      return aff(function(v) {
        try {
          success(f(v));
        } catch (e) {
          error(e);
        }
      }, error);
    };
  }

  exports._bind = function (alwaysCanceler, aff, f) {
    return function(success, error) {
      var canceler1, canceler2;

      var isCanceled    = false;
      var requestCancel = false;

      var onCanceler = function(){};

      canceler1 = aff(function(v) {
        if (requestCancel) {
          isCanceled = true;

          return alwaysCanceler;
        } else {
          canceler2 = f(v)(success, error);

          onCanceler(canceler2);

          return canceler2;
        }
      }, error);

      return function(e) {
        return function(s, f) {
          requestCancel = true;

          if (canceler2 !== undefined) {
            return canceler2(e)(s, f);
          } else {
            return canceler1(e)(function(bool) {
              if (bool || isCanceled) {
                try {
                  s(true);
                } catch (e) {
                  f(e);
                }
              } else {
                onCanceler = function(canceler) {
                  canceler(e)(s, f);
                };
              }
            }, f);
          }
        };
      };
    };
  }

  exports._attempt = function (Left, Right, aff) {
    return function(success, error) {
      return aff(function(v) {
        try {
          success(Right(v));
        } catch (e) {
          error(e);
        }
      }, function(e) {
        try {
          success(Left(e));
        } catch (e) {
          error(e);
        }
      });
    };
  }

  exports._runAff = function (errorT, successT, aff) {
    return function() {
      return aff(function(v) {
        try {
          successT(v)();
        } catch (e) {
          errorT(e)();
        }
      }, function(e) {
        errorT(e)();
      });
    };
  }

  exports._liftEff = function (nonCanceler, e) {
    return function(success, error) {
      try {
        success(e());
      } catch (e) {
        error(e);
      }

      return nonCanceler;
    };
  }
 
})(PS["Control.Monad.Aff"] = PS["Control.Monad.Aff"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  exports.error = function (msg) {
    return new Error(msg);
  };

  exports.throwException = function (e) {
    return function () {
      throw e;
    };
  };
 
})(PS["Control.Monad.Eff.Exception"] = PS["Control.Monad.Eff.Exception"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["Control.Monad.Eff.Exception"];
  var Prelude = PS["Prelude"];
  var Data_Maybe = PS["Data.Maybe"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  exports["throwException"] = $foreign.throwException;
  exports["error"] = $foreign.error;;
 
})(PS["Control.Monad.Eff.Exception"] = PS["Control.Monad.Eff.Exception"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["Control.Monad.Aff"];
  var Prelude = PS["Prelude"];
  var Control_Alt = PS["Control.Alt"];
  var Control_Alternative = PS["Control.Alternative"];
  var Control_Monad_Cont_Class = PS["Control.Monad.Cont.Class"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Monad_Eff_Class = PS["Control.Monad.Eff.Class"];
  var Control_Monad_Eff_Exception = PS["Control.Monad.Eff.Exception"];
  var Control_Monad_Error_Class = PS["Control.Monad.Error.Class"];
  var Control_Monad_Rec_Class = PS["Control.Monad.Rec.Class"];
  var Control_MonadPlus = PS["Control.MonadPlus"];
  var Control_Plus = PS["Control.Plus"];
  var Data_Either = PS["Data.Either"];
  var Data_Function = PS["Data.Function"];
  var Data_Monoid = PS["Data.Monoid"];
  var runAff = function (ex) {
      return function (f) {
          return function (aff) {
              return $foreign._runAff(ex, f, aff);
          };
      };
  };
  var functorAff = new Prelude.Functor(function (f) {
      return function (fa) {
          return $foreign._fmap(f, fa);
      };
  });
  var attempt = function (aff) {
      return $foreign._attempt(Data_Either.Left.create, Data_Either.Right.create, aff);
  };
  var applyAff = new Prelude.Apply(function () {
      return functorAff;
  }, function (ff) {
      return function (fa) {
          return $foreign._bind(alwaysCanceler, ff, function (f) {
              return Prelude["<$>"](functorAff)(f)(fa);
          });
      };
  });
  var applicativeAff = new Prelude.Applicative(function () {
      return applyAff;
  }, function (v) {
      return $foreign._pure(nonCanceler, v);
  });
  var nonCanceler = Prelude["const"](Prelude.pure(applicativeAff)(false));
  var alwaysCanceler = Prelude["const"](Prelude.pure(applicativeAff)(true));
  var forkAff = function (aff) {
      return $foreign._forkAff(nonCanceler, aff);
  };
  var later$prime = function (n) {
      return function (aff) {
          return $foreign._setTimeout(nonCanceler, n, aff);
      };
  };
  var later = later$prime(0);                              
  var bindAff = new Prelude.Bind(function () {
      return applyAff;
  }, function (fa) {
      return function (f) {
          return $foreign._bind(alwaysCanceler, fa, f);
      };
  });
  var monadAff = new Prelude.Monad(function () {
      return applicativeAff;
  }, function () {
      return bindAff;
  });
  var monadEffAff = new Control_Monad_Eff_Class.MonadEff(function () {
      return monadAff;
  }, function (eff) {
      return $foreign._liftEff(nonCanceler, eff);
  });
  var monadErrorAff = new Control_Monad_Error_Class.MonadError(function () {
      return monadAff;
  }, function (aff) {
      return function (ex) {
          return Prelude[">>="](bindAff)(attempt(aff))(Data_Either.either(ex)(Prelude.pure(applicativeAff)));
      };
  }, function (e) {
      return $foreign._throwError(nonCanceler, e);
  });
  var monadRecAff = new Control_Monad_Rec_Class.MonadRec(function () {
      return monadAff;
  }, function (f) {
      return function (a) {
          var go = function (size) {
              return function (f_1) {
                  return function (a_1) {
                      return Prelude.bind(bindAff)(f_1(a_1))(function (_1) {
                          if (_1 instanceof Data_Either.Left) {
                              if (size < 100) {
                                  return go(size + 1 | 0)(f_1)(_1.value0);
                              };
                              if (Prelude.otherwise) {
                                  return later(Control_Monad_Rec_Class.tailRecM(monadRecAff)(f_1)(_1.value0));
                              };
                          };
                          if (_1 instanceof Data_Either.Right) {
                              return Prelude.pure(applicativeAff)(_1.value0);
                          };
                          throw new Error("Failed pattern match: " + [ _1.constructor.name ]);
                      });
                  };
              };
          };
          return go(0)(f)(a);
      };
  });
  var altAff = new Control_Alt.Alt(function () {
      return functorAff;
  }, function (a1) {
      return function (a2) {
          return Prelude[">>="](bindAff)(attempt(a1))(Data_Either.either(Prelude["const"](a2))(Prelude.pure(applicativeAff)));
      };
  });
  var plusAff = new Control_Plus.Plus(function () {
      return altAff;
  }, Control_Monad_Error_Class.throwError(monadErrorAff)(Control_Monad_Eff_Exception.error("Always fails")));
  exports["runAff"] = runAff;
  exports["nonCanceler"] = nonCanceler;
  exports["later'"] = later$prime;
  exports["later"] = later;
  exports["forkAff"] = forkAff;
  exports["attempt"] = attempt;
  exports["functorAff"] = functorAff;
  exports["applyAff"] = applyAff;
  exports["applicativeAff"] = applicativeAff;
  exports["bindAff"] = bindAff;
  exports["monadAff"] = monadAff;
  exports["monadEffAff"] = monadEffAff;
  exports["monadErrorAff"] = monadErrorAff;
  exports["altAff"] = altAff;
  exports["plusAff"] = plusAff;
  exports["monadRecAff"] = monadRecAff;;
 
})(PS["Control.Monad.Aff"] = PS["Control.Monad.Aff"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Either = PS["Data.Either"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Tuple = PS["Data.Tuple"];
  var Data_Monoid = PS["Data.Monoid"];
  var Control_Alt = PS["Control.Alt"];
  var Control_Alternative = PS["Control.Alternative"];
  var Control_Monad_Cont_Class = PS["Control.Monad.Cont.Class"];
  var Control_Monad_Eff_Class = PS["Control.Monad.Eff.Class"];
  var Control_Monad_Error_Class = PS["Control.Monad.Error.Class"];
  var Control_Monad_Reader_Class = PS["Control.Monad.Reader.Class"];
  var Control_Monad_Rec_Class = PS["Control.Monad.Rec.Class"];
  var Control_Monad_RWS_Class = PS["Control.Monad.RWS.Class"];
  var Control_Monad_State_Class = PS["Control.Monad.State.Class"];
  var Control_Monad_Trans = PS["Control.Monad.Trans"];
  var Control_Monad_Writer_Class = PS["Control.Monad.Writer.Class"];
  var Control_MonadPlus = PS["Control.MonadPlus"];
  var Control_Plus = PS["Control.Plus"];     
  var MaybeT = function (x) {
      return x;
  };
  var runMaybeT = function (_5) {
      return _5;
  };
  var monadMaybeT = function (__dict_Monad_7) {
      return new Prelude.Monad(function () {
          return applicativeMaybeT(__dict_Monad_7);
      }, function () {
          return bindMaybeT(__dict_Monad_7);
      });
  };
  var functorMaybeT = function (__dict_Monad_14) {
      return new Prelude.Functor(Prelude.liftA1(applicativeMaybeT(__dict_Monad_14)));
  };
  var bindMaybeT = function (__dict_Monad_15) {
      return new Prelude.Bind(function () {
          return applyMaybeT(__dict_Monad_15);
      }, function (x) {
          return function (f) {
              return MaybeT(Prelude.bind(__dict_Monad_15["__superclass_Prelude.Bind_1"]())(runMaybeT(x))(function (_0) {
                  if (_0 instanceof Data_Maybe.Nothing) {
                      return Prelude["return"](__dict_Monad_15["__superclass_Prelude.Applicative_0"]())(Data_Maybe.Nothing.value);
                  };
                  if (_0 instanceof Data_Maybe.Just) {
                      return runMaybeT(f(_0.value0));
                  };
                  throw new Error("Failed pattern match: " + [ _0.constructor.name ]);
              }));
          };
      });
  };
  var applyMaybeT = function (__dict_Monad_16) {
      return new Prelude.Apply(function () {
          return functorMaybeT(__dict_Monad_16);
      }, Prelude.ap(monadMaybeT(__dict_Monad_16)));
  };
  var applicativeMaybeT = function (__dict_Monad_17) {
      return new Prelude.Applicative(function () {
          return applyMaybeT(__dict_Monad_17);
      }, function (_28) {
          return MaybeT(Prelude.pure(__dict_Monad_17["__superclass_Prelude.Applicative_0"]())(Data_Maybe.Just.create(_28)));
      });
  };
  var monadRecMaybeT = function (__dict_MonadRec_3) {
      return new Control_Monad_Rec_Class.MonadRec(function () {
          return monadMaybeT(__dict_MonadRec_3["__superclass_Prelude.Monad_0"]());
      }, function (f) {
          return function (_31) {
              return MaybeT(Control_Monad_Rec_Class.tailRecM(__dict_MonadRec_3)(function (a) {
                  return Prelude.bind((__dict_MonadRec_3["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Bind_1"]())(runMaybeT(f(a)))(function (_2) {
                      return Prelude["return"]((__dict_MonadRec_3["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Applicative_0"]())((function () {
                          if (_2 instanceof Data_Maybe.Nothing) {
                              return new Data_Either.Right(Data_Maybe.Nothing.value);
                          };
                          if (_2 instanceof Data_Maybe.Just && _2.value0 instanceof Data_Either.Left) {
                              return new Data_Either.Left(_2.value0.value0);
                          };
                          if (_2 instanceof Data_Maybe.Just && _2.value0 instanceof Data_Either.Right) {
                              return new Data_Either.Right(new Data_Maybe.Just(_2.value0.value0));
                          };
                          throw new Error("Failed pattern match at Control.Monad.Maybe.Trans line 78, column 1 - line 86, column 1: " + [ _2.constructor.name ]);
                      })());
                  });
              })(_31));
          };
      });
  };
  var altMaybeT = function (__dict_Monad_19) {
      return new Control_Alt.Alt(function () {
          return functorMaybeT(__dict_Monad_19);
      }, function (m1) {
          return function (m2) {
              return Prelude.bind(__dict_Monad_19["__superclass_Prelude.Bind_1"]())(runMaybeT(m1))(function (_1) {
                  if (_1 instanceof Data_Maybe.Nothing) {
                      return runMaybeT(m2);
                  };
                  return Prelude["return"](__dict_Monad_19["__superclass_Prelude.Applicative_0"]())(_1);
              });
          };
      });
  };
  var plusMaybeT = function (__dict_Monad_0) {
      return new Control_Plus.Plus(function () {
          return altMaybeT(__dict_Monad_0);
      }, Prelude.pure(__dict_Monad_0["__superclass_Prelude.Applicative_0"]())(Data_Maybe.Nothing.value));
  };
  exports["MaybeT"] = MaybeT;
  exports["runMaybeT"] = runMaybeT;
  exports["functorMaybeT"] = functorMaybeT;
  exports["applyMaybeT"] = applyMaybeT;
  exports["applicativeMaybeT"] = applicativeMaybeT;
  exports["bindMaybeT"] = bindMaybeT;
  exports["monadMaybeT"] = monadMaybeT;
  exports["altMaybeT"] = altMaybeT;
  exports["plusMaybeT"] = plusMaybeT;
  exports["monadRecMaybeT"] = monadRecMaybeT;;
 
})(PS["Control.Monad.Maybe.Trans"] = PS["Control.Monad.Maybe.Trans"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Monad_Aff = PS["Control.Monad.Aff"];
  var Control_Monad_Cont_Trans = PS["Control.Monad.Cont.Trans"];
  var Control_Monad_Except_Trans = PS["Control.Monad.Except.Trans"];
  var Control_Monad_List_Trans = PS["Control.Monad.List.Trans"];
  var Control_Monad_Maybe_Trans = PS["Control.Monad.Maybe.Trans"];
  var Control_Monad_Reader_Trans = PS["Control.Monad.Reader.Trans"];
  var Control_Monad_RWS_Trans = PS["Control.Monad.RWS.Trans"];
  var Control_Monad_State_Trans = PS["Control.Monad.State.Trans"];
  var Control_Monad_Trans = PS["Control.Monad.Trans"];
  var Control_Monad_Writer_Trans = PS["Control.Monad.Writer.Trans"];
  var Data_Monoid = PS["Data.Monoid"];     
  var MonadAff = function (liftAff) {
      this.liftAff = liftAff;
  };
  var monadAffAff = new MonadAff(Prelude.id(Prelude.categoryFn));
  var liftAff = function (dict) {
      return dict.liftAff;
  };
  exports["MonadAff"] = MonadAff;
  exports["liftAff"] = liftAff;
  exports["monadAffAff"] = monadAffAff;;
 
})(PS["Control.Monad.Aff.Class"] = PS["Control.Monad.Aff.Class"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];     
  var Profunctor = function (dimap) {
      this.dimap = dimap;
  };
  var profunctorFn = new Profunctor(function (a2b) {
      return function (c2d) {
          return function (b2c) {
              return Prelude[">>>"](Prelude.semigroupoidFn)(a2b)(Prelude[">>>"](Prelude.semigroupoidFn)(b2c)(c2d));
          };
      };
  });
  var dimap = function (dict) {
      return dict.dimap;
  };
  var rmap = function (__dict_Profunctor_1) {
      return function (b2c) {
          return dimap(__dict_Profunctor_1)(Prelude.id(Prelude.categoryFn))(b2c);
      };
  };
  exports["Profunctor"] = Profunctor;
  exports["rmap"] = rmap;
  exports["dimap"] = dimap;
  exports["profunctorFn"] = profunctorFn;;
 
})(PS["Data.Profunctor"] = PS["Data.Profunctor"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Tuple = PS["Data.Tuple"];
  var Data_Either = PS["Data.Either"];
  var Data_Identity = PS["Data.Identity"];
  var Data_Functor = PS["Data.Functor"];
  var Data_Bifunctor = PS["Data.Bifunctor"];
  var Data_Profunctor = PS["Data.Profunctor"];
  var Control_Monad_Trans = PS["Control.Monad.Trans"];
  var Control_Monad_Free_Trans = PS["Control.Monad.Free.Trans"];
  var Control_Monad_Rec_Class = PS["Control.Monad.Rec.Class"];
  var profunctorAwait = new Data_Profunctor.Profunctor(function (f) {
      return function (g) {
          return function (_22) {
              return Data_Profunctor.dimap(Data_Profunctor.profunctorFn)(f)(g)(_22);
          };
      };
  });
  var fuseWith = function (__dict_Functor_4) {
      return function (__dict_Functor_5) {
          return function (__dict_Functor_6) {
              return function (__dict_MonadRec_7) {
                  return function (zap) {
                      return function (fs) {
                          return function (gs) {
                              var go = function (_20) {
                                  return Prelude.bind((__dict_MonadRec_7["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Bind_1"]())(Control_Monad_Free_Trans.resume(__dict_Functor_5)(__dict_MonadRec_7)(_20.value1))(function (_1) {
                                      return Prelude.bind((__dict_MonadRec_7["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Bind_1"]())(Control_Monad_Free_Trans.resume(__dict_Functor_4)(__dict_MonadRec_7)(_20.value0))(function (_0) {
                                          var _31 = Prelude["<*>"](Data_Either.applyEither)(Prelude["<$>"](Data_Either.functorEither)(zap(Data_Tuple.Tuple.create))(_0))(_1);
                                          if (_31 instanceof Data_Either.Left) {
                                              return Prelude["return"]((__dict_MonadRec_7["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Applicative_0"]())(new Data_Either.Left(_31.value0));
                                          };
                                          if (_31 instanceof Data_Either.Right) {
                                              return Prelude["return"]((__dict_MonadRec_7["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Applicative_0"]())(new Data_Either.Right(Prelude.map(__dict_Functor_6)(function (t) {
                                                  return Control_Monad_Free_Trans.freeT(function (_5) {
                                                      return go(t);
                                                  });
                                              })(_31.value0)));
                                          };
                                          throw new Error("Failed pattern match at Control.Coroutine line 49, column 1 - line 54, column 1: " + [ _31.constructor.name ]);
                                      });
                                  });
                              };
                              return Control_Monad_Free_Trans.freeT(function (_6) {
                                  return go(new Data_Tuple.Tuple(fs, gs));
                              });
                          };
                      };
                  };
              };
          };
      };
  };
  var functorAwait = new Prelude.Functor(Data_Profunctor.rmap(profunctorAwait));
  var await = function (__dict_Monad_16) {
      return Control_Monad_Free_Trans.liftFreeT(functorAwait)(__dict_Monad_16)(Prelude.id(Prelude.categoryFn));
  };
  exports["await"] = await;
  exports["fuseWith"] = fuseWith;
  exports["profunctorAwait"] = profunctorAwait;
  exports["functorAwait"] = functorAwait;;
 
})(PS["Control.Coroutine"] = PS["Control.Coroutine"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Coroutine = PS["Control.Coroutine"];
  var Control_Monad_Free_Trans = PS["Control.Monad.Free.Trans"];
  var Control_Monad_Maybe_Trans = PS["Control.Monad.Maybe.Trans"];
  var Control_Monad_Rec_Class = PS["Control.Monad.Rec.Class"];
  var Control_Monad_Trans = PS["Control.Monad.Trans"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Plus = PS["Control.Plus"];
  var Data_Functor = PS["Data.Functor"];
  var Data_Bifunctor = PS["Data.Bifunctor"];
  var Data_Either = PS["Data.Either"];
  var Data_Identity = PS["Data.Identity"];
  var Data_Maybe = PS["Data.Maybe"];     
  var Emit = (function () {
      function Emit(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      Emit.create = function (value0) {
          return function (value1) {
              return new Emit(value0, value1);
          };
      };
      return Emit;
  })();
  var Stall = (function () {
      function Stall(value0) {
          this.value0 = value0;
      };
      Stall.create = function (value0) {
          return new Stall(value0);
      };
      return Stall;
  })();
  var runStallingProcess = function (__dict_MonadRec_2) {
      return function (_19) {
          return Control_Monad_Maybe_Trans.runMaybeT(Control_Monad_Free_Trans.runFreeT(Data_Maybe.functorMaybe)(Control_Monad_Maybe_Trans.monadRecMaybeT(__dict_MonadRec_2))(Data_Maybe.maybe(Control_Plus.empty(Control_Monad_Maybe_Trans.plusMaybeT(__dict_MonadRec_2["__superclass_Prelude.Monad_0"]())))(Prelude.pure(Control_Monad_Maybe_Trans.applicativeMaybeT(__dict_MonadRec_2["__superclass_Prelude.Monad_0"]()))))(Control_Monad_Free_Trans.hoistFreeT(Data_Maybe.functorMaybe)(Control_Monad_Maybe_Trans.functorMaybeT(__dict_MonadRec_2["__superclass_Prelude.Monad_0"]()))(function (_20) {
              return Control_Monad_Maybe_Trans.MaybeT(Prelude.map((((__dict_MonadRec_2["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Bind_1"]())["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Maybe.Just.create)(_20));
          })(_19)));
      };
  };
  var bifunctorStallF = new Data_Bifunctor.Bifunctor(function (f) {
      return function (g) {
          return function (q) {
              if (q instanceof Emit) {
                  return new Emit(f(q.value0), g(q.value1));
              };
              if (q instanceof Stall) {
                  return new Stall(g(q.value0));
              };
              throw new Error("Failed pattern match at Control.Coroutine.Stalling line 50, column 1 - line 56, column 1: " + [ q.constructor.name ]);
          };
      };
  });
  var functorStallF = new Prelude.Functor(function (f) {
      return Data_Bifunctor.rmap(bifunctorStallF)(f);
  });
  var $dollar$dollar$qmark = function (__dict_MonadRec_0) {
      return Control_Coroutine.fuseWith(functorStallF)(Control_Coroutine.functorAwait)(Data_Maybe.functorMaybe)(__dict_MonadRec_0)(function (f) {
          return function (q) {
              return function (_0) {
                  if (q instanceof Emit) {
                      return new Data_Maybe.Just(f(q.value1)(_0(q.value0)));
                  };
                  if (q instanceof Stall) {
                      return Data_Maybe.Nothing.value;
                  };
                  throw new Error("Failed pattern match at Control.Coroutine.Stalling line 79, column 1 - line 85, column 1: " + [ q.constructor.name ]);
              };
          };
      });
  };
  exports["Emit"] = Emit;
  exports["Stall"] = Stall;
  exports["$$?"] = $dollar$dollar$qmark;
  exports["runStallingProcess"] = runStallingProcess;
  exports["bifunctorStallF"] = bifunctorStallF;
  exports["functorStallF"] = functorStallF;;
 
})(PS["Control.Coroutine.Stalling"] = PS["Control.Coroutine.Stalling"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // module Control.Monad.Aff.AVar

  exports._makeVar = function (nonCanceler) {
    return function(success, error) {
      try {
        success({
          consumers: [],
          producers: [],
          error: undefined 
        });
      } catch (e) {
        error(e);
      }

      return nonCanceler;
    }
  }

  exports._takeVar = function (nonCanceler, avar) {
    return function(success, error) {
      if (avar.error !== undefined) {
        error(avar.error);
      } else if (avar.producers.length > 0) {
        var producer = avar.producers.shift();

        producer(success, error);
      } else {
        avar.consumers.push({success: success, error: error});
      }

      return nonCanceler;
    } 
  }

  exports._putVar = function (nonCanceler, avar, a) {
    return function(success, error) {
      if (avar.error !== undefined) {
        error(avar.error);
      } else if (avar.consumers.length === 0) {
        avar.producers.push(function(success, error) {
          try {
            success(a);
          } catch (e) {
            error(e);
          }
        });

        success({});
      } else {
        var consumer = avar.consumers.shift();

        try {
          consumer.success(a);
        } catch (e) {
          error(e);

          return;                  
        }

        success({});
      }

      return nonCanceler;
    }
  }
 
})(PS["Control.Monad.Aff.AVar"] = PS["Control.Monad.Aff.AVar"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["Control.Monad.Aff.AVar"];
  var Prelude = PS["Prelude"];
  var Control_Monad_Aff = PS["Control.Monad.Aff"];
  var Control_Monad_Eff_Exception = PS["Control.Monad.Eff.Exception"];
  var Data_Function = PS["Data.Function"];     
  var takeVar = function (q) {
      return $foreign._takeVar(Control_Monad_Aff.nonCanceler, q);
  };
  var putVar = function (q) {
      return function (a) {
          return $foreign._putVar(Control_Monad_Aff.nonCanceler, q, a);
      };
  };
  var makeVar = $foreign._makeVar(Control_Monad_Aff.nonCanceler);
  exports["takeVar"] = takeVar;
  exports["putVar"] = putVar;
  exports["makeVar"] = makeVar;;
 
})(PS["Control.Monad.Aff.AVar"] = PS["Control.Monad.Aff.AVar"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Contravariant = function (cmap) {
      this.cmap = cmap;
  };
  var cmap = function (dict) {
      return dict.cmap;
  };
  exports["Contravariant"] = Contravariant;
  exports["cmap"] = cmap;;
 
})(PS["Data.Functor.Contravariant"] = PS["Data.Functor.Contravariant"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Bifoldable = PS["Data.Bifoldable"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Functor_Contravariant = PS["Data.Functor.Contravariant"];
  var Data_Functor_Invariant = PS["Data.Functor.Invariant"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Traversable = PS["Data.Traversable"];     
  var Const = function (x) {
      return x;
  };
  var getConst = function (_0) {
      return _0;
  };
  var functorConst = new Prelude.Functor(function (_10) {
      return function (_11) {
          return _11;
      };
  });
  var contravariantConst = new Data_Functor_Contravariant.Contravariant(function (_17) {
      return function (_18) {
          return _18;
      };
  });
  var applyConst = function (__dict_Semigroup_10) {
      return new Prelude.Apply(function () {
          return functorConst;
      }, function (_12) {
          return function (_13) {
              return Prelude["<>"](__dict_Semigroup_10)(_12)(_13);
          };
      });
  };
  var applicativeConst = function (__dict_Monoid_11) {
      return new Prelude.Applicative(function () {
          return applyConst(__dict_Monoid_11["__superclass_Prelude.Semigroup_0"]());
      }, function (_16) {
          return Data_Monoid.mempty(__dict_Monoid_11);
      });
  };
  exports["Const"] = Const;
  exports["getConst"] = getConst;
  exports["functorConst"] = functorConst;
  exports["applyConst"] = applyConst;
  exports["applicativeConst"] = applicativeConst;
  exports["contravariantConst"] = contravariantConst;;
 
})(PS["Data.Const"] = PS["Data.Const"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Coroutine_Aff = PS["Control.Coroutine.Aff"];
  var Control_Coroutine_Stalling = PS["Control.Coroutine.Stalling"];
  var Control_Monad_Aff_AVar = PS["Control.Monad.Aff.AVar"];
  var Control_Monad_Aff_Class = PS["Control.Monad.Aff.Class"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Monad_Rec_Class = PS["Control.Monad.Rec.Class"];
  var Control_Monad_Free = PS["Control.Monad.Free"];
  var Data_Const = PS["Data.Const"];
  var Data_Either = PS["Data.Either"];
  var Data_Functor_Coproduct = PS["Data.Functor.Coproduct"];
  var Data_Maybe = PS["Data.Maybe"];
  var Unsafe_Coerce = PS["Unsafe.Coerce"];             
  var runEventSource = function (_0) {
      return _0;
  };
  exports["runEventSource"] = runEventSource;;
 
})(PS["Halogen.Query.EventSource"] = PS["Halogen.Query.EventSource"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Control_Monad_State_Class = PS["Control.Monad.State.Class"];
  var Prelude = PS["Prelude"];
  var Control_Monad_State = PS["Control.Monad.State"];
  var Data_Functor = PS["Data.Functor"];
  var Data_NaturalTransformation = PS["Data.NaturalTransformation"];     
  var Get = (function () {
      function Get(value0) {
          this.value0 = value0;
      };
      Get.create = function (value0) {
          return new Get(value0);
      };
      return Get;
  })();
  var Modify = (function () {
      function Modify(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      Modify.create = function (value0) {
          return function (value1) {
              return new Modify(value0, value1);
          };
      };
      return Modify;
  })();
  var stateN = function (__dict_Monad_0) {
      return function (__dict_MonadState_1) {
          return function (_3) {
              if (_3 instanceof Get) {
                  return Prelude[">>="](__dict_Monad_0["__superclass_Prelude.Bind_1"]())(Control_Monad_State_Class.get(__dict_MonadState_1))(function (_20) {
                      return Prelude.pure(__dict_Monad_0["__superclass_Prelude.Applicative_0"]())(_3.value0(_20));
                  });
              };
              if (_3 instanceof Modify) {
                  return Data_Functor["$>"](((__dict_Monad_0["__superclass_Prelude.Bind_1"]())["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Control_Monad_State_Class.modify(__dict_MonadState_1)(_3.value0))(_3.value1);
              };
              throw new Error("Failed pattern match at Halogen.Query.StateF line 33, column 1 - line 34, column 1: " + [ _3.constructor.name ]);
          };
      };
  };
  var functorStateF = new Prelude.Functor(function (f) {
      return function (_4) {
          if (_4 instanceof Get) {
              return new Get(function (_22) {
                  return f(_4.value0(_22));
              });
          };
          if (_4 instanceof Modify) {
              return new Modify(_4.value0, f(_4.value1));
          };
          throw new Error("Failed pattern match at Halogen.Query.StateF line 21, column 1 - line 27, column 1: " + [ f.constructor.name, _4.constructor.name ]);
      };
  });
  exports["Get"] = Get;
  exports["Modify"] = Modify;
  exports["stateN"] = stateN;
  exports["functorStateF"] = functorStateF;;
 
})(PS["Halogen.Query.StateF"] = PS["Halogen.Query.StateF"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Alt = PS["Control.Alt"];
  var Control_Plus = PS["Control.Plus"];
  var Control_Monad_Free_Trans = PS["Control.Monad.Free.Trans"];
  var Data_Bifunctor = PS["Data.Bifunctor"];
  var Data_Functor_Aff = PS["Data.Functor.Aff"];
  var Data_Functor_Eff = PS["Data.Functor.Eff"];
  var Data_Inject = PS["Data.Inject"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_NaturalTransformation = PS["Data.NaturalTransformation"];
  var Halogen_Query_StateF = PS["Halogen.Query.StateF"];
  var Halogen_Query_EventSource = PS["Halogen.Query.EventSource"];
  var Control_Coroutine_Stalling = PS["Control.Coroutine.Stalling"];     
  var StateHF = (function () {
      function StateHF(value0) {
          this.value0 = value0;
      };
      StateHF.create = function (value0) {
          return new StateHF(value0);
      };
      return StateHF;
  })();
  var SubscribeHF = (function () {
      function SubscribeHF(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      SubscribeHF.create = function (value0) {
          return function (value1) {
              return new SubscribeHF(value0, value1);
          };
      };
      return SubscribeHF;
  })();
  var QueryHF = (function () {
      function QueryHF(value0) {
          this.value0 = value0;
      };
      QueryHF.create = function (value0) {
          return new QueryHF(value0);
      };
      return QueryHF;
  })();
  var HaltHF = (function () {
      function HaltHF() {

      };
      HaltHF.value = new HaltHF();
      return HaltHF;
  })();
  var functorHalogenF = function (__dict_Functor_4) {
      return new Prelude.Functor(function (f) {
          return function (h) {
              if (h instanceof StateHF) {
                  return new StateHF(Prelude.map(Halogen_Query_StateF.functorStateF)(f)(h.value0));
              };
              if (h instanceof SubscribeHF) {
                  return new SubscribeHF(h.value0, f(h.value1));
              };
              if (h instanceof QueryHF) {
                  return new QueryHF(Prelude.map(__dict_Functor_4)(f)(h.value0));
              };
              if (h instanceof HaltHF) {
                  return HaltHF.value;
              };
              throw new Error("Failed pattern match at Halogen.Query.HalogenF line 33, column 1 - line 41, column 1: " + [ h.constructor.name ]);
          };
      });
  };
  exports["StateHF"] = StateHF;
  exports["SubscribeHF"] = SubscribeHF;
  exports["QueryHF"] = QueryHF;
  exports["HaltHF"] = HaltHF;
  exports["functorHalogenF"] = functorHalogenF;;
 
})(PS["Halogen.Query.HalogenF"] = PS["Halogen.Query.HalogenF"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Alt = PS["Control.Alt"];
  var Control_Monad_Aff = PS["Control.Monad.Aff"];
  var Control_Monad_Aff_Class = PS["Control.Monad.Aff.Class"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Monad_Eff_Class = PS["Control.Monad.Eff.Class"];
  var Control_Monad_Free = PS["Control.Monad.Free"];
  var Data_Inject = PS["Data.Inject"];
  var Halogen_Query_EventSource = PS["Halogen.Query.EventSource"];
  var Halogen_Query_HalogenF = PS["Halogen.Query.HalogenF"];
  var Halogen_Query_StateF = PS["Halogen.Query.StateF"];
  var modify = function (f) {
      return Control_Monad_Free.liftF(new Halogen_Query_HalogenF.StateHF(new Halogen_Query_StateF.Modify(f, Prelude.unit)));
  };
  var liftH = function (_1) {
      return Control_Monad_Free.liftF(Halogen_Query_HalogenF.QueryHF.create(_1));
  };
  var liftEff$prime = function (__dict_MonadEff_0) {
      return function (_2) {
          return liftH(Control_Monad_Eff_Class.liftEff(__dict_MonadEff_0)(_2));
      };
  };
  var liftAff$prime = function (__dict_MonadAff_1) {
      return function (_3) {
          return liftH(Control_Monad_Aff_Class.liftAff(__dict_MonadAff_1)(_3));
      };
  };
  var gets = function (_4) {
      return Control_Monad_Free.liftF(Halogen_Query_HalogenF.StateHF.create(Halogen_Query_StateF.Get.create(_4)));
  };
  var get = gets(Prelude.id(Prelude.categoryFn));
  var action = function (act) {
      return act(Prelude.unit);
  };
  exports["liftEff'"] = liftEff$prime;
  exports["liftAff'"] = liftAff$prime;
  exports["liftH"] = liftH;
  exports["modify"] = modify;
  exports["gets"] = gets;
  exports["get"] = get;
  exports["action"] = action;;
 
})(PS["Halogen.Query"] = PS["Halogen.Query"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Apply = PS["Control.Apply"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Monad_Eff_Class = PS["Control.Monad.Eff.Class"];
  var Control_Monad_Free = PS["Control.Monad.Free"];
  var Control_Monad_Free_Trans = PS["Control.Monad.Free.Trans"];
  var Control_Monad_State = PS["Control.Monad.State"];
  var Control_Monad_State_Class = PS["Control.Monad.State.Class"];
  var Control_Monad_State_Trans = PS["Control.Monad.State.Trans"];
  var Data_Bifunctor = PS["Data.Bifunctor"];
  var Data_Functor_Coproduct = PS["Data.Functor.Coproduct"];
  var Data_Map = PS["Data.Map"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Maybe_Unsafe = PS["Data.Maybe.Unsafe"];
  var Data_NaturalTransformation = PS["Data.NaturalTransformation"];
  var Data_Profunctor_Choice = PS["Data.Profunctor.Choice"];
  var Data_Traversable = PS["Data.Traversable"];
  var Data_Tuple = PS["Data.Tuple"];
  var Data_Void = PS["Data.Void"];
  var Halogen_Component_ChildPath = PS["Halogen.Component.ChildPath"];
  var Halogen_HTML_Core = PS["Halogen.HTML.Core"];
  var Halogen_Query = PS["Halogen.Query"];
  var Halogen_Query_EventSource = PS["Halogen.Query.EventSource"];
  var Halogen_Query_HalogenF = PS["Halogen.Query.HalogenF"];
  var Halogen_Query_StateF = PS["Halogen.Query.StateF"];
  var Data_Identity = PS["Data.Identity"];
  var Control_Coroutine_Stalling = PS["Control.Coroutine.Stalling"];
  var ChildF = (function () {
      function ChildF(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      ChildF.create = function (value0) {
          return function (value1) {
              return new ChildF(value0, value1);
          };
      };
      return ChildF;
  })();
  var renderComponent = function (_14) {
      return Control_Monad_State.runState(_14.render);
  };
  var render = function (__dict_Ord_2) {
      return function (rc) {
          var renderChild$prime = function (p) {
              return function (c) {
                  return function (s) {
                      var _36 = renderComponent(c)(s);
                      return Prelude.bind(Control_Monad_State_Trans.bindStateT(Data_Identity.monadIdentity))(Control_Monad_State_Class.modify(Control_Monad_State_Trans.monadStateStateT(Data_Identity.monadIdentity))(function (_8) {
                          return {
                              parent: _8.parent, 
                              children: Data_Map.insert(__dict_Ord_2)(p)(new Data_Tuple.Tuple(c, _36.value1))(_8.children), 
                              memo: _8.memo
                          };
                      }))(function () {
                          return Prelude.pure(Control_Monad_State_Trans.applicativeStateT(Data_Identity.monadIdentity))(Prelude["<$>"](Halogen_HTML_Core.functorHTML)(function (_82) {
                              return Data_Functor_Coproduct.right(ChildF.create(p)(_82));
                          })(_36.value0));
                      });
                  };
              };
          };
          var renderChild = function (_17) {
              return function (_18) {
                  var childState = Data_Map.lookup(__dict_Ord_2)(_18.value0)(_17.children);
                  var _42 = Data_Map.lookup(__dict_Ord_2)(_18.value0)(_17.memo);
                  if (_42 instanceof Data_Maybe.Just) {
                      return Prelude.bind(Control_Monad_State_Trans.bindStateT(Data_Identity.monadIdentity))(Control_Monad_State_Class.modify(Control_Monad_State_Trans.monadStateStateT(Data_Identity.monadIdentity))(function (_7) {
                          return {
                              parent: _7.parent, 
                              children: Data_Map.alter(__dict_Ord_2)(Prelude["const"](childState))(_18.value0)(_7.children), 
                              memo: Data_Map.insert(__dict_Ord_2)(_18.value0)(_42.value0)(_7.memo)
                          };
                      }))(function () {
                          return Prelude.pure(Control_Monad_State_Trans.applicativeStateT(Data_Identity.monadIdentity))(_42.value0);
                      });
                  };
                  if (_42 instanceof Data_Maybe.Nothing) {
                      if (childState instanceof Data_Maybe.Just) {
                          return renderChild$prime(_18.value0)(childState.value0.value0)(childState.value0.value1);
                      };
                      if (childState instanceof Data_Maybe.Nothing) {
                          var def$prime = _18.value1(Prelude.unit);
                          return renderChild$prime(_18.value0)(def$prime.component)(def$prime.initialState);
                      };
                      throw new Error("Failed pattern match at Halogen.Component line 244, column 1 - line 249, column 1: " + [ childState.constructor.name ]);
                  };
                  throw new Error("Failed pattern match at Halogen.Component line 244, column 1 - line 249, column 1: " + [ _42.constructor.name ]);
              };
          };
          return Prelude.bind(Control_Monad_State_Trans.bindStateT(Data_Identity.monadIdentity))(Control_Monad_State_Class.get(Control_Monad_State_Trans.monadStateStateT(Data_Identity.monadIdentity)))(function (_1) {
              var html = rc(_1.parent);
              return Prelude.bind(Control_Monad_State_Trans.bindStateT(Data_Identity.monadIdentity))(Control_Monad_State_Class.put(Control_Monad_State_Trans.monadStateStateT(Data_Identity.monadIdentity))({
                  parent: _1.parent, 
                  children: Data_Map.empty, 
                  memo: Data_Map.empty
              }))(function () {
                  return Halogen_HTML_Core.fillSlot(Control_Monad_State_Trans.applicativeStateT(Data_Identity.monadIdentity))(renderChild(_1))(Data_Functor_Coproduct.left)(html);
              });
          });
      };
  };
  var queryComponent = function (_15) {
      return _15["eval"];
  };
  var component = function (r) {
      return function (e) {
          return {
              render: Control_Monad_State_Class.gets(Control_Monad_State_Trans.monadStateStateT(Data_Identity.monadIdentity))(r), 
              "eval": e
          };
      };
  };
  exports["ChildF"] = ChildF;
  exports["queryComponent"] = queryComponent;
  exports["renderComponent"] = renderComponent;
  exports["component"] = component;;
 
})(PS["Halogen.Component"] = PS["Halogen.Component"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Halogen_Component = PS["Halogen.Component"];
  var Halogen_Component_ChildPath = PS["Halogen.Component.ChildPath"];
  var Halogen_HTML_Core = PS["Halogen.HTML.Core"];
  var Halogen_HTML_Elements = PS["Halogen.HTML.Elements"];     
  var text = Halogen_HTML_Core.Text.create;
  exports["text"] = text;;
 
})(PS["Halogen.HTML"] = PS["Halogen.HTML"] || {});
(function(exports) {
  // module Text.Base64

  exports.encode64 = function (str) {
    if (typeof(btoa) == 'undefined') {
      var btoa = null;
      var atob = null;
      return new Buffer(str).toString('base64');
    } else {
      return btoa(str);
    }
  }

  exports.decode64 = function (code) {
    if (typeof(atob) == 'undefined') {
      var btoa = null;
      var atob = null;
      return new Buffer(code, 'base64').toString('ascii');
    } else {
      return atob(code);
    }
  }
 
})(PS["Text.Base64"] = PS["Text.Base64"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["Text.Base64"];
  exports["encode64"] = $foreign.encode64;
  exports["decode64"] = $foreign.decode64;;
 
})(PS["Text.Base64"] = PS["Text.Base64"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_String = PS["Data.String"];
  var DOM_HTML_Types = PS["DOM.HTML.Types"];
  var Halogen_HTML_Core = PS["Halogen.HTML.Core"];                                                                                                                   
  var title = Halogen_HTML_Core.prop(Halogen_HTML_Core.stringIsProp)(Halogen_HTML_Core.propName("title"))(Data_Maybe.Just.create(Halogen_HTML_Core.attrName("title")));   
  var src = Halogen_HTML_Core.prop(Halogen_HTML_Core.stringIsProp)(Halogen_HTML_Core.propName("src"))(Data_Maybe.Just.create(Halogen_HTML_Core.attrName("src")));
  var id_ = Halogen_HTML_Core.prop(Halogen_HTML_Core.stringIsProp)(Halogen_HTML_Core.propName("id"))(Data_Maybe.Just.create(Halogen_HTML_Core.attrName("id")));
  var href = Halogen_HTML_Core.prop(Halogen_HTML_Core.stringIsProp)(Halogen_HTML_Core.propName("href"))(Data_Maybe.Just.create(Halogen_HTML_Core.attrName("href")));
  var class_ = function (_9) {
      return Halogen_HTML_Core.prop(Halogen_HTML_Core.stringIsProp)(Halogen_HTML_Core.propName("className"))(Data_Maybe.Just.create(Halogen_HTML_Core.attrName("class")))(Halogen_HTML_Core.runClassName(_9));
  };
  var alt = Halogen_HTML_Core.prop(Halogen_HTML_Core.stringIsProp)(Halogen_HTML_Core.propName("alt"))(Data_Maybe.Just.create(Halogen_HTML_Core.attrName("alt")));
  exports["title"] = title;
  exports["src"] = src;
  exports["id_"] = id_;
  exports["href"] = href;
  exports["class_"] = class_;
  exports["alt"] = alt;;
 
})(PS["Halogen.HTML.Properties"] = PS["Halogen.HTML.Properties"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Tuple = PS["Data.Tuple"];
  var Data_Array = PS["Data.Array"];
  var Unsafe_Coerce = PS["Unsafe.Coerce"];
  var DOM_HTML_Types = PS["DOM.HTML.Types"];
  var Halogen_HTML_Core = PS["Halogen.HTML.Core"];
  var Halogen_HTML_Properties = PS["Halogen.HTML.Properties"];
  var Data_Monoid = PS["Data.Monoid"];                                  
  var title = Unsafe_Coerce.unsafeCoerce(Halogen_HTML_Properties.title);  
  var src = Unsafe_Coerce.unsafeCoerce(Halogen_HTML_Properties.src);                
  var id_ = Unsafe_Coerce.unsafeCoerce(Halogen_HTML_Properties.id_);
  var href = Unsafe_Coerce.unsafeCoerce(Halogen_HTML_Properties.href);      
  var class_ = Unsafe_Coerce.unsafeCoerce(Halogen_HTML_Properties.class_);            
  var alt = Unsafe_Coerce.unsafeCoerce(Halogen_HTML_Properties.alt);
  exports["title"] = title;
  exports["src"] = src;
  exports["id_"] = id_;
  exports["href"] = href;
  exports["class_"] = class_;
  exports["alt"] = alt;;
 
})(PS["Halogen.HTML.Properties.Indexed"] = PS["Halogen.HTML.Properties.Indexed"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Halogen_HTML_Elements = PS["Halogen.HTML.Elements"];
  var Halogen_HTML = PS["Halogen.HTML"];
  var Prelude = PS["Prelude"];
  var Text_Base64 = PS["Text.Base64"];
  var $$Math = PS["Math"];
  var Unsafe_Coerce = PS["Unsafe.Coerce"];
  var Halogen_HTML_Core = PS["Halogen.HTML.Core"];
  var Halogen_HTML_Indexed = PS["Halogen.HTML.Indexed"];
  var Halogen_HTML_Properties_Indexed = PS["Halogen.HTML.Properties.Indexed"];
  var Data_Array = PS["Data.Array"];
  var Data_Either = PS["Data.Either"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Maybe_Unsafe = PS["Data.Maybe.Unsafe"];
  var Data_Tuple = PS["Data.Tuple"];
  var Data_List = PS["Data.List"];
  var Data_String = PS["Data.String"];
  var Data_Char = PS["Data.Char"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Traversable = PS["Data.Traversable"];
  var Data_Time = PS["Data.Time"];
  var Control_Monad_Aff = PS["Control.Monad.Aff"];
  var Control_Monad_Rec_Class = PS["Control.Monad.Rec.Class"];     
  var $up = $$Math.pow;
  var $dot$dot$dot = function (inf) {
      return function (sup) {
          if (inf <= sup) {
              return Data_Array.range(inf)(sup);
          };
          if (Prelude.otherwise) {
              return [  ];
          };
          throw new Error("Failed pattern match at Util line 118, column 1 - line 119, column 1: " + [ inf.constructor.name, sup.constructor.name ]);
      };
  };
  var transformDigits = function (f) {
      return Prelude[">>>"](Prelude.semigroupoidFn)(Prelude.show(Prelude.showNumber))(Prelude[">>>"](Prelude.semigroupoidFn)(Data_String.toCharArray)(Prelude[">>>"](Prelude.semigroupoidFn)(f)(Data_String.fromCharArray)));
  };
  var sigFigs = function (n) {
      var arr = Data_String.toCharArray(Prelude.show(Prelude.showNumber)(n));
      var split = Data_Array.span(function (_0) {
          return Prelude["/="](Prelude.eqChar)(_0)(".");
      })(arr);
      return Data_Array.length(split.init);
  };
  var secondsMS = function (_5) {
      return _5 / 1000.0;
  };
  var rot13 = (function () {
      var rotate = function (c) {
          if (Data_Char.toCharCode(c) <= 90 && Data_Char.toCharCode(c) >= 65) {
              return Data_Char.fromCharCode(65 + (Data_Char.toCharCode(c) - 52) % 26 | 0);
          };
          if (Data_Char.toCharCode(c) <= 122 && Data_Char.toCharCode(c) >= 97) {
              return Data_Char.fromCharCode(97 + (Data_Char.toCharCode(c) - 84) % 26 | 0);
          };
          if (Prelude.otherwise) {
              return c;
          };
          throw new Error("Failed pattern match at Util line 41, column 5 - line 42, column 5: " + [ c.constructor.name ]);
      };
      return function (_33) {
          return Data_String.fromCharArray(Prelude.map(Prelude.functorArray)(rotate)(Data_String.toCharArray(_33)));
      };
  })();
  var scramble = function (_34) {
      return rot13(Text_Base64.encode64(rot13(_34)));
  };
  var unscramble = function (_35) {
      return rot13(Text_Base64.decode64(rot13(_35)));
  };
  var renderParagraphs = function (_36) {
      return Halogen_HTML_Elements.div_(Prelude.map(Prelude.functorArray)(function (_37) {
          return Halogen_HTML_Elements.p_(Prelude.pure(Prelude.applicativeArray)(Halogen_HTML.text(_37)));
      })(_36));
  };
  var mkClass = function (_38) {
      return Halogen_HTML_Properties_Indexed.class_(Halogen_HTML_Core.className(_38));
  };
  var minutesMS = function (n) {
      return secondsMS(n) / 60.0;
  };
  var insertDecimal = function (i) {
      return function (num) {
          var shown = Data_Array.take(i + 1 | 0)(Data_String.toCharArray(Prelude.show(Prelude.showNumber)(num)));
          var len = Data_Array.length(shown);
          var small = Prelude["++"](Prelude.semigroupArray)([ "." ])(Data_Array.drop(len - 1)(shown));
          var large = Data_Array.take(len - 1)(shown);
          return Data_String.fromCharArray(Prelude["++"](Prelude.semigroupArray)(large)(small));
      };
  };
  var hoursMS = function (n) {
      return minutesMS(n) / 60.0;
  };
  var gcd = function (__copy_m) {
      return function (__copy_n) {
          var m = __copy_m;
          var n = __copy_n;
          tco: while (true) {
              if (n === 0) {
                  return m;
              };
              if (Prelude.otherwise) {
                  var __tco_m = n;
                  var __tco_n = m % n;
                  m = __tco_m;
                  n = __tco_n;
                  continue tco;
              };
              throw new Error("Failed pattern match: " + [ m.constructor.name, n.constructor.name ]);
          };
      };
  };
  var foldGCD = function (__dict_Foldable_0) {
      var foldGCD$prime = function (_7) {
          return function (y) {
              if (_7 instanceof Data_Maybe.Nothing) {
                  return new Data_Maybe.Just(y);
              };
              if (_7 instanceof Data_Maybe.Just) {
                  return new Data_Maybe.Just(gcd(_7.value0)(y));
              };
              throw new Error("Failed pattern match at Util line 103, column 5 - line 104, column 5: " + [ _7.constructor.name, y.constructor.name ]);
          };
      };
      return Data_Foldable.foldl(__dict_Foldable_0)(foldGCD$prime)(Data_Maybe.Nothing.value);
  };
  var extractFsts = function (__dict_Foldable_1) {
      return Data_Foldable.foldl(__dict_Foldable_1)(function (acc) {
          return function (_4) {
              return new Data_List.Cons(_4.value0, acc);
          };
      })(Data_List.Nil.value);
  };
  var schedule = function (arr) {
      var timers = extractFsts(Data_Foldable.foldableArray)(arr);
      var theGCD = Data_Maybe_Unsafe.fromJust(foldGCD(Data_List.foldableList)(timers));
      var goElt = function (_6) {
          var _21 = _6.numbalert >= _6.timer;
          if (_21) {
              return Prelude.bind(Control_Monad_Aff.bindAff)(_6.comp)(function () {
                  return Prelude.pure(Control_Monad_Aff.applicativeAff)((function () {
                      var _22 = {};
                      for (var _23 in _6) {
                          if (_6.hasOwnProperty(_23)) {
                              _22[_23] = _6[_23];
                          };
                      };
                      _22.numbalert = theGCD;
                      return _22;
                  })());
              });
          };
          if (!_21) {
              return Prelude.pure(Control_Monad_Aff.applicativeAff)((function () {
                  var _24 = {};
                  for (var _25 in _6) {
                      if (_6.hasOwnProperty(_25)) {
                          _24[_25] = _6[_25];
                      };
                  };
                  _24.numbalert = _6.numbalert + theGCD | 0;
                  return _24;
              })());
          };
          throw new Error("Failed pattern match at Util line 79, column 1 - line 80, column 1: " + [ _21.constructor.name ]);
      };
      var go = function (comps) {
          return Prelude.bind(Control_Monad_Aff.bindAff)(Data_Traversable.traverse(Data_Traversable.traversableArray)(Control_Monad_Aff.applicativeAff)(goElt)(comps))(function (_2) {
              return Control_Monad_Aff["later'"](theGCD)(Prelude.pure(Control_Monad_Aff.applicativeAff)(new Data_Either.Left(_2)));
          });
      };
      return Control_Monad_Rec_Class.tailRecM(Control_Monad_Aff.monadRecAff)(go)(Prelude.map(Prelude.functorArray)(function (_3) {
          return {
              timer: _3.value0, 
              comp: _3.value1, 
              numbalert: theGCD
          };
      })(arr));
  };
  var daysMS = function (n) {
      return hoursMS(n) / 24.0;
  };   
  var chopDigits = function (n) {
      return function (arr) {
          var split = Data_Array.span(function (_1) {
              return Prelude["/="](Prelude.eqChar)(_1)(".");
          })(arr);
          var small = Data_Array.take(n)(split.rest);
          return Prelude["++"](Prelude.semigroupArray)(split.init)(small);
      };
  };
  var noDecimal = transformDigits(chopDigits(0));
  var oneDecimal = transformDigits(chopDigits(2));
  exports["daysMS"] = daysMS;
  exports["hoursMS"] = hoursMS;
  exports["minutesMS"] = minutesMS;
  exports["secondsMS"] = secondsMS;
  exports["mkClass"] = mkClass;
  exports["renderParagraphs"] = renderParagraphs;
  exports["..."] = $dot$dot$dot;
  exports["gcd"] = gcd;
  exports["extractFsts"] = extractFsts;
  exports["foldGCD"] = foldGCD;
  exports["schedule"] = schedule;
  exports["insertDecimal"] = insertDecimal;
  exports["transformDigits"] = transformDigits;
  exports["noDecimal"] = noDecimal;
  exports["oneDecimal"] = oneDecimal;
  exports["chopDigits"] = chopDigits;
  exports["sigFigs"] = sigFigs;
  exports["rot13"] = rot13;
  exports["unscramble"] = unscramble;
  exports["scramble"] = scramble;
  exports["^"] = $up;;
 
})(PS["Util"] = PS["Util"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Monad_Eff_Console = PS["Control.Monad.Eff.Console"];
  var Control_Monad_Eff_Random = PS["Control.Monad.Eff.Random"];
  var Data_Array = PS["Data.Array"];
  var Data_Foreign_Class = PS["Data.Foreign.Class"];
  var Data_Date = PS["Data.Date"];
  var Data_Time = PS["Data.Time"];
  var Browser_WebStorage = PS["Browser.WebStorage"];
  var Halogen = PS["Halogen"];
  var Unsafe_Coerce = PS["Unsafe.Coerce"];
  var Util = PS["Util"];
  var Data_Either = PS["Data.Either"];
  var Data_Foreign_Index = PS["Data.Foreign.Index"];     
  var Misc1 = (function () {
      function Misc1(value0) {
          this.value0 = value0;
      };
      Misc1.create = function (value0) {
          return new Misc1(value0);
      };
      return Misc1;
  })();
  var Misc2 = (function () {
      function Misc2(value0) {
          this.value0 = value0;
      };
      Misc2.create = function (value0) {
          return new Misc2(value0);
      };
      return Misc2;
  })();
  var Tech1 = (function () {
      function Tech1(value0) {
          this.value0 = value0;
      };
      Tech1.create = function (value0) {
          return new Tech1(value0);
      };
      return Tech1;
  })();
  var Tech2 = (function () {
      function Tech2(value0) {
          this.value0 = value0;
      };
      Tech2.create = function (value0) {
          return new Tech2(value0);
      };
      return Tech2;
  })();
  var Phil1 = (function () {
      function Phil1(value0) {
          this.value0 = value0;
      };
      Phil1.create = function (value0) {
          return new Phil1(value0);
      };
      return Phil1;
  })();
  var Phil2 = (function () {
      function Phil2(value0) {
          this.value0 = value0;
      };
      Phil2.create = function (value0) {
          return new Phil2(value0);
      };
      return Phil2;
  })();
  var Poli1 = (function () {
      function Poli1(value0) {
          this.value0 = value0;
      };
      Poli1.create = function (value0) {
          return new Poli1(value0);
      };
      return Poli1;
  })();
  var Poli2 = (function () {
      function Poli2(value0) {
          this.value0 = value0;
      };
      Poli2.create = function (value0) {
          return new Poli2(value0);
      };
      return Poli2;
  })();
  var Science1 = (function () {
      function Science1(value0) {
          this.value0 = value0;
      };
      Science1.create = function (value0) {
          return new Science1(value0);
      };
      return Science1;
  })();
  var Science2 = (function () {
      function Science2(value0) {
          this.value0 = value0;
      };
      Science2.create = function (value0) {
          return new Science2(value0);
      };
      return Science2;
  })();
  var UpgradesTab = (function () {
      function UpgradesTab() {

      };
      UpgradesTab.value = new UpgradesTab();
      return UpgradesTab;
  })();
  var AdvanceTab = (function () {
      function AdvanceTab() {

      };
      AdvanceTab.value = new AdvanceTab();
      return AdvanceTab;
  })();
  var PopulationTab = (function () {
      function PopulationTab() {

      };
      PopulationTab.value = new PopulationTab();
      return PopulationTab;
  })();
  var HeroesTab = (function () {
      function HeroesTab() {

      };
      HeroesTab.value = new HeroesTab();
      return HeroesTab;
  })();
  var TechTreeTab = (function () {
      function TechTreeTab() {

      };
      TechTreeTab.value = new TechTreeTab();
      return TechTreeTab;
  })();
  var Clicks = function (x) {
      return x;
  };
  var Stone = (function () {
      function Stone() {

      };
      Stone.value = new Stone();
      return Stone;
  })();
  var Bronze = (function () {
      function Bronze() {

      };
      Bronze.value = new Bronze();
      return Bronze;
  })();
  var Iron = (function () {
      function Iron() {

      };
      Iron.value = new Iron();
      return Iron;
  })();
  var Classical = (function () {
      function Classical() {

      };
      Classical.value = new Classical();
      return Classical;
  })();
  var Dark = (function () {
      function Dark() {

      };
      Dark.value = new Dark();
      return Dark;
  })();
  var Medieval = (function () {
      function Medieval() {

      };
      Medieval.value = new Medieval();
      return Medieval;
  })();
  var Renaissance = (function () {
      function Renaissance() {

      };
      Renaissance.value = new Renaissance();
      return Renaissance;
  })();
  var Imperial = (function () {
      function Imperial() {

      };
      Imperial.value = new Imperial();
      return Imperial;
  })();
  var Industrial = (function () {
      function Industrial() {

      };
      Industrial.value = new Industrial();
      return Industrial;
  })();
  var Nuclear = (function () {
      function Nuclear() {

      };
      Nuclear.value = new Nuclear();
      return Nuclear;
  })();
  var Information = (function () {
      function Information() {

      };
      Information.value = new Information();
      return Information;
  })();
  var Global = (function () {
      function Global() {

      };
      Global.value = new Global();
      return Global;
  })();
  var Space = (function () {
      function Space() {

      };
      Space.value = new Space();
      return Space;
  })();
  var Solar = (function () {
      function Solar() {

      };
      Solar.value = new Solar();
      return Solar;
  })();
  var Click = (function () {
      function Click(value0) {
          this.value0 = value0;
      };
      Click.create = function (value0) {
          return new Click(value0);
      };
      return Click;
  })();
  var Autoclick = (function () {
      function Autoclick(value0) {
          this.value0 = value0;
      };
      Autoclick.create = function (value0) {
          return new Autoclick(value0);
      };
      return Autoclick;
  })();
  var Reset = (function () {
      function Reset(value0) {
          this.value0 = value0;
      };
      Reset.create = function (value0) {
          return new Reset(value0);
      };
      return Reset;
  })();
  var Save = (function () {
      function Save(value0) {
          this.value0 = value0;
      };
      Save.create = function (value0) {
          return new Save(value0);
      };
      return Save;
  })();
  var Buy = (function () {
      function Buy(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      Buy.create = function (value0) {
          return function (value1) {
              return new Buy(value0, value1);
          };
      };
      return Buy;
  })();
  var Suffer = (function () {
      function Suffer(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      Suffer.create = function (value0) {
          return function (value1) {
              return new Suffer(value0, value1);
          };
      };
      return Suffer;
  })();
  var View = (function () {
      function View(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      View.create = function (value0) {
          return function (value1) {
              return new View(value0, value1);
          };
      };
      return View;
  })();
  var Advance = (function () {
      function Advance(value0) {
          this.value0 = value0;
      };
      Advance.create = function (value0) {
          return new Advance(value0);
      };
      return Advance;
  })();
  var Pretty = function (prettify) {
      this.prettify = prettify;
  };
  var Serialize = function (serialize) {
      this.serialize = serialize;
  };
  var welcomeMessage = "";                                    
  var showView = new Prelude.Show(function (_31) {
      if (_31 instanceof UpgradesTab) {
          return "Upgrades";
      };
      if (_31 instanceof AdvanceTab) {
          return "Advance";
      };
      if (_31 instanceof PopulationTab) {
          return "Population";
      };
      if (_31 instanceof HeroesTab) {
          return "Heroes";
      };
      if (_31 instanceof TechTreeTab) {
          return "Tech Tree";
      };
      throw new Error("Failed pattern match at Types line 115, column 1 - line 122, column 1: " + [ _31.constructor.name ]);
  });                                                                 
  var serializeNumber = new Serialize(Util.oneDecimal);
  var serializeInt = new Serialize(Prelude.show(Prelude.showInt));
  var serialize = function (dict) {
      return dict.serialize;
  };
  var serializeClicks = new Serialize(function (_36) {
      return serialize(serializeNumber)(_36);
  });
  var serializeMilliseconds = new Serialize(function (_40) {
      return serialize(serializeNumber)(_40);
  });
  var serializeUpgrade = new Serialize(function (_38) {
      if (_38 instanceof Misc1) {
          return serialize(serializeInt)(_38.value0);
      };
      if (_38 instanceof Misc2) {
          return serialize(serializeInt)(_38.value0);
      };
      if (_38 instanceof Tech1) {
          return serialize(serializeInt)(_38.value0);
      };
      if (_38 instanceof Tech2) {
          return serialize(serializeInt)(_38.value0);
      };
      if (_38 instanceof Phil1) {
          return serialize(serializeInt)(_38.value0);
      };
      if (_38 instanceof Phil2) {
          return serialize(serializeInt)(_38.value0);
      };
      if (_38 instanceof Poli1) {
          return serialize(serializeInt)(_38.value0);
      };
      if (_38 instanceof Poli2) {
          return serialize(serializeInt)(_38.value0);
      };
      if (_38 instanceof Science1) {
          return serialize(serializeInt)(_38.value0);
      };
      if (_38 instanceof Science2) {
          return serialize(serializeInt)(_38.value0);
      };
      throw new Error("Failed pattern match at Types line 272, column 1 - line 284, column 1: " + [ _38.constructor.name ]);
  });
  var serializeUpgrades = new Serialize(function (_39) {
      return "{ \"misc1\": " + (serialize(serializeUpgrade)(_39.misc1) + (", \"misc2\": " + (serialize(serializeUpgrade)(_39.misc2) + (", \"tech1\": " + (serialize(serializeUpgrade)(_39.tech1) + (", \"tech2\": " + (serialize(serializeUpgrade)(_39.tech2) + (", \"phil1\": " + (serialize(serializeUpgrade)(_39.phil1) + (", \"phil2\": " + (serialize(serializeUpgrade)(_39.phil2) + (", \"poli1\": " + (serialize(serializeUpgrade)(_39.poli1) + (", \"poli2\": " + (serialize(serializeUpgrade)(_39.poli2) + (", \"science1\": " + (serialize(serializeUpgrade)(_39.science1) + (", \"science2\": " + (serialize(serializeUpgrade)(_39.science2) + "}")))))))))))))))))));
  });      
  var semiringClicks = new Prelude.Semiring(function (_20) {
      return function (_21) {
          return _20 + _21;
      };
  }, function (_18) {
      return function (_19) {
          return _18 * _19;
      };
  }, 1, 0);
  var ringClicks = new Prelude.Ring(function () {
      return semiringClicks;
  }, function (_26) {
      return function (_27) {
          return _26 - _27;
      };
  });
  var prettyNumber = new Pretty(function (n) {
      if (Util.sigFigs(n) <= 3) {
          return Util.oneDecimal(n);
      };
      if (Util.sigFigs(n) <= 4) {
          return Util.noDecimal(n);
      };
      if (Util.sigFigs(n) <= 5) {
          return Util.insertDecimal(2)(n) + "k";
      };
      if (Util.sigFigs(n) <= 6) {
          return Util.insertDecimal(3)(n) + "k";
      };
      if (Util.sigFigs(n) <= 7) {
          return Util.insertDecimal(4)(n) + "k";
      };
      if (Util.sigFigs(n) <= 8) {
          return Util.insertDecimal(2)(n) + "m";
      };
      if (Util.sigFigs(n) <= 9) {
          return Util.insertDecimal(3)(n) + "m";
      };
      if (Util.sigFigs(n) <= 10) {
          return Util.insertDecimal(4)(n) + "m";
      };
      if (Util.sigFigs(n) <= 11) {
          return Util.insertDecimal(2)(n) + "b";
      };
      if (Util.sigFigs(n) <= 12) {
          return Util.insertDecimal(3)(n) + "b";
      };
      if (Util.sigFigs(n) <= 13) {
          return Util.insertDecimal(4)(n) + "b";
      };
      if (Util.sigFigs(n) <= 14) {
          return Util.insertDecimal(2)(n) + "t";
      };
      if (Util.sigFigs(n) <= 15) {
          return Util.insertDecimal(3)(n) + "t";
      };
      if (Util.sigFigs(n) <= 16) {
          return Util.insertDecimal(4)(n) + "t";
      };
      if (Util.sigFigs(n) <= 17) {
          return Util.insertDecimal(2)(n) + "q";
      };
      if (Util.sigFigs(n) <= 18) {
          return Util.insertDecimal(3)(n) + "q";
      };
      if (Util.sigFigs(n) <= 19) {
          return Util.insertDecimal(4)(n) + "q";
      };
      if (Util.sigFigs(n) <= 20) {
          return Util.insertDecimal(2)(n) + "qi";
      };
      if (Util.sigFigs(n) <= 21) {
          return Util.insertDecimal(3)(n) + "qi";
      };
      if (Util.sigFigs(n) <= 22) {
          return Util.insertDecimal(4)(n) + "qi";
      };
      if (Prelude.otherwise) {
          return "Your civilization can't count this high!";
      };
      throw new Error("Failed pattern match at Types line 215, column 1 - line 239, column 1: " + [ n.constructor.name ]);
  });                                                       
  var prettify = function (dict) {
      return dict.prettify;
  }; 
  var prettyClicks = new Pretty(function (_34) {
      return prettify(prettyNumber)(_34) + " c";
  });
  var prettyClicksPerSecond = new Pretty(function (_35) {
      return prettify(prettyNumber)(_35) + " cps";
  });
  var prettyPopulation = new Pretty(function (_30) {
      return prettify(prettyNumber)(_30) + " Clickonians";
  });
  var isForeignUpgrades = new Data_Foreign_Class.IsForeign(function (value) {
      return Prelude.bind(Data_Either.bindEither)(Data_Foreign_Class.readProp(Data_Foreign_Class.intIsForeign)(Data_Foreign_Index.indexString)("misc1")(value))(function (_9) {
          return Prelude.bind(Data_Either.bindEither)(Data_Foreign_Class.readProp(Data_Foreign_Class.intIsForeign)(Data_Foreign_Index.indexString)("misc2")(value))(function (_8) {
              return Prelude.bind(Data_Either.bindEither)(Data_Foreign_Class.readProp(Data_Foreign_Class.intIsForeign)(Data_Foreign_Index.indexString)("tech1")(value))(function (_7) {
                  return Prelude.bind(Data_Either.bindEither)(Data_Foreign_Class.readProp(Data_Foreign_Class.intIsForeign)(Data_Foreign_Index.indexString)("tech2")(value))(function (_6) {
                      return Prelude.bind(Data_Either.bindEither)(Data_Foreign_Class.readProp(Data_Foreign_Class.intIsForeign)(Data_Foreign_Index.indexString)("phil1")(value))(function (_5) {
                          return Prelude.bind(Data_Either.bindEither)(Data_Foreign_Class.readProp(Data_Foreign_Class.intIsForeign)(Data_Foreign_Index.indexString)("phil2")(value))(function (_4) {
                              return Prelude.bind(Data_Either.bindEither)(Data_Foreign_Class.readProp(Data_Foreign_Class.intIsForeign)(Data_Foreign_Index.indexString)("poli1")(value))(function (_3) {
                                  return Prelude.bind(Data_Either.bindEither)(Data_Foreign_Class.readProp(Data_Foreign_Class.intIsForeign)(Data_Foreign_Index.indexString)("poli2")(value))(function (_2) {
                                      return Prelude.bind(Data_Either.bindEither)(Data_Foreign_Class.readProp(Data_Foreign_Class.intIsForeign)(Data_Foreign_Index.indexString)("science1")(value))(function (_1) {
                                          return Prelude.bind(Data_Either.bindEither)(Data_Foreign_Class.readProp(Data_Foreign_Class.intIsForeign)(Data_Foreign_Index.indexString)("science2")(value))(function (_0) {
                                              return Prelude.pure(Data_Either.applicativeEither)({
                                                  misc1: new Misc1(_9), 
                                                  misc2: new Misc2(_8), 
                                                  tech1: new Tech1(_7), 
                                                  tech2: new Tech2(_6), 
                                                  phil1: new Phil1(_5), 
                                                  phil2: new Phil2(_4), 
                                                  poli1: new Poli1(_3), 
                                                  poli2: new Poli2(_2), 
                                                  science1: new Science1(_1), 
                                                  science2: new Science2(_0)
                                              });
                                          });
                                      });
                                  });
                              });
                          });
                      });
                  });
              });
          });
      });
  });
  var initialUpgrades = {
      misc1: new Misc1(0), 
      misc2: new Misc2(0), 
      tech1: new Tech1(0), 
      tech2: new Tech2(0), 
      phil1: new Phil1(0), 
      phil2: new Phil2(0), 
      poli1: new Poli1(0), 
      poli2: new Poli2(0), 
      science1: new Science1(0), 
      science2: new Science2(0)
  };
  var initialState = {
      currentClicks: 0.0, 
      totalClicks: 0.0, 
      cps: 0.0, 
      age: Stone.value, 
      burst: 1.0, 
      upgrades: initialUpgrades, 
      message: welcomeMessage, 
      now: Prelude.zero(Data_Time.semiringMilliseconds), 
      view: UpgradesTab.value
  }; 
  var eqClicks = new Prelude.Eq(function (_10) {
      return function (_11) {
          return _10 === _11;
      };
  });
  var ordClicks = new Prelude.Ord(function () {
      return eqClicks;
  }, function (_14) {
      return function (_15) {
          return Prelude.compare(Prelude.ordNumber)(_14)(_15);
      };
  });
  var ageShow = new Prelude.Show(function (_32) {
      if (_32 instanceof Stone) {
          return "Stone";
      };
      if (_32 instanceof Bronze) {
          return "Bronze";
      };
      if (_32 instanceof Iron) {
          return "Iron";
      };
      if (_32 instanceof Classical) {
          return "Classical";
      };
      if (_32 instanceof Dark) {
          return "Dark";
      };
      if (_32 instanceof Medieval) {
          return "Medieval";
      };
      if (_32 instanceof Renaissance) {
          return "Renaissance";
      };
      if (_32 instanceof Imperial) {
          return "Imperial";
      };
      if (_32 instanceof Industrial) {
          return "Industrial";
      };
      if (_32 instanceof Nuclear) {
          return "Nuclear";
      };
      if (_32 instanceof Information) {
          return "Information";
      };
      if (_32 instanceof Global) {
          return "Global";
      };
      if (_32 instanceof Space) {
          return "Space";
      };
      if (_32 instanceof Solar) {
          return "Solar";
      };
      throw new Error("Failed pattern match at Types line 184, column 1 - line 200, column 1: " + [ _32.constructor.name ]);
  });                                               
  var serializeAge = new Serialize(Prelude.show(ageShow));
  exports["Stone"] = Stone;
  exports["Bronze"] = Bronze;
  exports["Iron"] = Iron;
  exports["Classical"] = Classical;
  exports["Dark"] = Dark;
  exports["Medieval"] = Medieval;
  exports["Renaissance"] = Renaissance;
  exports["Imperial"] = Imperial;
  exports["Industrial"] = Industrial;
  exports["Nuclear"] = Nuclear;
  exports["Information"] = Information;
  exports["Global"] = Global;
  exports["Space"] = Space;
  exports["Solar"] = Solar;
  exports["Misc1"] = Misc1;
  exports["Misc2"] = Misc2;
  exports["Tech1"] = Tech1;
  exports["Tech2"] = Tech2;
  exports["Phil1"] = Phil1;
  exports["Phil2"] = Phil2;
  exports["Poli1"] = Poli1;
  exports["Poli2"] = Poli2;
  exports["Science1"] = Science1;
  exports["Science2"] = Science2;
  exports["UpgradesTab"] = UpgradesTab;
  exports["AdvanceTab"] = AdvanceTab;
  exports["PopulationTab"] = PopulationTab;
  exports["HeroesTab"] = HeroesTab;
  exports["TechTreeTab"] = TechTreeTab;
  exports["Clicks"] = Clicks;
  exports["Click"] = Click;
  exports["Autoclick"] = Autoclick;
  exports["Reset"] = Reset;
  exports["Save"] = Save;
  exports["Buy"] = Buy;
  exports["Suffer"] = Suffer;
  exports["View"] = View;
  exports["Advance"] = Advance;
  exports["Serialize"] = Serialize;
  exports["Pretty"] = Pretty;
  exports["initialUpgrades"] = initialUpgrades;
  exports["welcomeMessage"] = welcomeMessage;
  exports["initialState"] = initialState;
  exports["serialize"] = serialize;
  exports["prettify"] = prettify;
  exports["eqClicks"] = eqClicks;
  exports["ordClicks"] = ordClicks;
  exports["semiringClicks"] = semiringClicks;
  exports["ringClicks"] = ringClicks;
  exports["prettyPopulation"] = prettyPopulation;
  exports["showView"] = showView;
  exports["isForeignUpgrades"] = isForeignUpgrades;
  exports["ageShow"] = ageShow;
  exports["prettyNumber"] = prettyNumber;
  exports["prettyClicks"] = prettyClicks;
  exports["prettyClicksPerSecond"] = prettyClicksPerSecond;
  exports["serializeInt"] = serializeInt;
  exports["serializeNumber"] = serializeNumber;
  exports["serializeClicks"] = serializeClicks;
  exports["serializeAge"] = serializeAge;
  exports["serializeUpgrade"] = serializeUpgrade;
  exports["serializeUpgrades"] = serializeUpgrades;
  exports["serializeMilliseconds"] = serializeMilliseconds;;
 
})(PS["Types"] = PS["Types"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Types = PS["Types"];     
  var nextAge = function (_1) {
      if (_1 instanceof Types.Stone) {
          return Types.Bronze.value;
      };
      if (_1 instanceof Types.Bronze) {
          return Types.Iron.value;
      };
      if (_1 instanceof Types.Iron) {
          return Types.Classical.value;
      };
      if (_1 instanceof Types.Classical) {
          return Types.Dark.value;
      };
      if (_1 instanceof Types.Dark) {
          return Types.Medieval.value;
      };
      if (_1 instanceof Types.Medieval) {
          return Types.Renaissance.value;
      };
      if (_1 instanceof Types.Renaissance) {
          return Types.Imperial.value;
      };
      if (_1 instanceof Types.Imperial) {
          return Types.Industrial.value;
      };
      if (_1 instanceof Types.Industrial) {
          return Types.Nuclear.value;
      };
      if (_1 instanceof Types.Nuclear) {
          return Types.Information.value;
      };
      if (_1 instanceof Types.Information) {
          return Types.Global.value;
      };
      if (_1 instanceof Types.Global) {
          return Types.Space.value;
      };
      return Types.Solar.value;
  };
  var ageDescription = function (_0) {
      if (_0 instanceof Types.Stone) {
          return [ "You are a member of the hardy but technologically primitive Clickonian\n  people. The other Clickonians generally defer to you when it comes to making\n  important decisions. It is your task to shepherd your people through the\n  Stone Age into a brighter, more prosperous future.", "The tribe must develop various technologies and cultural achievements\n  to stand any hope of surviving more than a few years." ];
      };
      if (_0 instanceof Types.Bronze) {
          return [ "Earthquake! While you and your tribe have developed enough as a society\n  to discover bronze's superiority as a material, perils still beset you.", "In the aftermath of the tremors, you notice a previously-traversable path\n  has transformed into an impassable barrier of rock. Unfortunately, the barrier\n  now separates you and a small group of Clickonians from the rest of the tribe.\n  ", "Your reduced population means everyone must work harder to survive. At\n  nights, your fellow survivors whisper to each other in the hopes that they'll\n  reunite with their lost friends and family on the other side ... " ];
      };
      return [ "Not implemented yet." ];
  };
  exports["nextAge"] = nextAge;
  exports["ageDescription"] = ageDescription;;
 
})(PS["Age"] = PS["Age"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // module DOM.Event.EventTarget

  exports.eventListener = function (fn) {
    return function (event) {
      return fn(event)();
    };
  };

  exports.addEventListener = function (type) {
    return function (listener) {
      return function (useCapture) {
        return function (target) {
          return function () {
            target.addEventListener(type, listener, useCapture);
            return {};
          };
        };
      };
    };
  };
 
})(PS["DOM.Event.EventTarget"] = PS["DOM.Event.EventTarget"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["DOM.Event.EventTarget"];
  var Prelude = PS["Prelude"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Monad_Eff_Exception = PS["Control.Monad.Eff.Exception"];
  var DOM = PS["DOM"];
  var DOM_Event_Types = PS["DOM.Event.Types"];
  exports["addEventListener"] = $foreign.addEventListener;
  exports["eventListener"] = $foreign.eventListener;;
 
})(PS["DOM.Event.EventTarget"] = PS["DOM.Event.EventTarget"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var DOM_Event_Types = PS["DOM.Event.Types"];
  var load = "load";
  exports["load"] = load;;
 
})(PS["DOM.Event.EventTypes"] = PS["DOM.Event.EventTypes"] || {});
(function(exports) {
  /* global exports, window */
  "use strict";

  // module DOM.HTML

  exports.window = function () {
    return window;
  };
 
})(PS["DOM.HTML"] = PS["DOM.HTML"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["DOM.HTML"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var DOM = PS["DOM"];
  var DOM_HTML_Types = PS["DOM.HTML.Types"];
  exports["window"] = $foreign.window;;
 
})(PS["DOM.HTML"] = PS["DOM.HTML"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // module DOM.HTML.Window

  exports.document = function (window) {
    return function () {
      return window.document;
    };
  };
 
})(PS["DOM.HTML.Window"] = PS["DOM.HTML.Window"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["DOM.HTML.Window"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var DOM = PS["DOM"];
  var DOM_HTML_Types = PS["DOM.HTML.Types"];
  exports["document"] = $foreign.document;;
 
})(PS["DOM.HTML.Window"] = PS["DOM.HTML.Window"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  exports.appendChild = function (node) {
    return function (parent) {
      return function () {
        return parent.appendChild(node);
      };
    };
  };
 
})(PS["DOM.Node.Node"] = PS["DOM.Node.Node"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // module Data.Nullable

  exports["null"] = null;

  exports.nullable = function(a, r, f) {
      return a == null ? r : f(a);
  };

  exports.notNull = function(x) {
      return x;
  }; 
 
})(PS["Data.Nullable"] = PS["Data.Nullable"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["Data.Nullable"];
  var Prelude = PS["Prelude"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Function = PS["Data.Function"];     
  var toNullable = Data_Maybe.maybe($foreign["null"])($foreign.notNull);
  var toMaybe = function (n) {
      return $foreign.nullable(n, Data_Maybe.Nothing.value, Data_Maybe.Just.create);
  };
  exports["toNullable"] = toNullable;
  exports["toMaybe"] = toMaybe;;
 
})(PS["Data.Nullable"] = PS["Data.Nullable"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["DOM.Node.Node"];
  var Prelude = PS["Prelude"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Data_Enum = PS["Data.Enum"];
  var Data_Nullable = PS["Data.Nullable"];
  var Data_Maybe_Unsafe = PS["Data.Maybe.Unsafe"];
  var DOM = PS["DOM"];
  var DOM_Node_NodeType = PS["DOM.Node.NodeType"];
  var DOM_Node_Types = PS["DOM.Node.Types"];
  exports["appendChild"] = $foreign.appendChild;;
 
})(PS["DOM.Node.Node"] = PS["DOM.Node.Node"] || {});
(function(exports) {
  /* global exports */
  "use strict";                                               

  exports.querySelector = function (selector) {
    return function (node) {
      return function () {
        return node.querySelector(selector);
      };
    };
  };
 
})(PS["DOM.Node.ParentNode"] = PS["DOM.Node.ParentNode"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["DOM.Node.ParentNode"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Data_Nullable = PS["Data.Nullable"];
  var DOM = PS["DOM"];
  var DOM_Node_Types = PS["DOM.Node.Types"];
  exports["querySelector"] = $foreign.querySelector;;
 
})(PS["DOM.Node.ParentNode"] = PS["DOM.Node.ParentNode"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Maybe_First = PS["Data.Maybe.First"];
  var Data_Const = PS["Data.Const"];
  var Data_Either = PS["Data.Either"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Functor_Contravariant = PS["Data.Functor.Contravariant"];
  var Data_Foreign = PS["Data.Foreign"];
  var Data_Foreign_Index = PS["Data.Foreign.Index"];
  var Data_Foreign_Keys = PS["Data.Foreign.Keys"];
  var getMap = function (__dict_Monoid_0) {
      return function (f) {
          return function (g) {
              return function (_3) {
                  return Data_Const.getConst(g(Data_Const.contravariantConst)(Data_Const.applicativeConst(__dict_Monoid_0))(function (_4) {
                      return Data_Const.Const(f(_4));
                  })(_3));
              };
          };
      };
  };
  var get = function (g) {
      return function (_5) {
          return Data_Maybe_First.runFirst(getMap(Data_Maybe_First.monoidFirst)(function (_6) {
              return Data_Maybe_First.First(Data_Maybe.Just.create(_6));
          })(function (__dict_Contravariant_1) {
              return function (__dict_Applicative_2) {
                  return g(__dict_Contravariant_1)(__dict_Applicative_2);
              };
          })(_5));
      };
  };
  var coerce = function (__dict_Contravariant_3) {
      return function (__dict_Functor_4) {
          var absurd = function (__copy_a) {
              var a = __copy_a;
              tco: while (true) {
                  var __tco_a = a;
                  a = __tco_a;
                  continue tco;
              };
          };
          return function (_7) {
              return Prelude.map(__dict_Functor_4)(absurd)(Data_Functor_Contravariant.cmap(__dict_Contravariant_3)(absurd)(_7));
          };
      };
  };
  var getter = function (f) {
      return function (__dict_Contravariant_5) {
          return function (__dict_Applicative_6) {
              return function (g) {
                  return function (s) {
                      var _0 = f(s);
                      if (_0 instanceof Data_Either.Left) {
                          return coerce(__dict_Contravariant_5)((__dict_Applicative_6["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Prelude.pure(__dict_Applicative_6)(Prelude.unit));
                      };
                      if (_0 instanceof Data_Either.Right) {
                          return coerce(__dict_Contravariant_5)((__dict_Applicative_6["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(g(_0.value0));
                      };
                      throw new Error("Failed pattern match at Data.Foreign.Lens line 54, column 1 - line 55, column 1: " + [ _0.constructor.name ]);
                  };
              };
          };
      };
  };
  var json = function (__dict_Contravariant_11) {
      return function (__dict_Applicative_12) {
          return getter(Data_Foreign.parseJSON)(__dict_Contravariant_11)(__dict_Applicative_12);
      };
  };
  var number = function (__dict_Contravariant_15) {
      return function (__dict_Applicative_16) {
          return getter(Data_Foreign.readNumber)(__dict_Contravariant_15)(__dict_Applicative_16);
      };
  };
  exports["number"] = number;
  exports["json"] = json;
  exports["getMap"] = getMap;
  exports["get"] = get;
  exports["getter"] = getter;;
 
})(PS["Data.Foreign.Lens"] = PS["Data.Foreign.Lens"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Profunctor = PS["Data.Profunctor"];
  var Data_Tuple = PS["Data.Tuple"];     
  var Strong = function (__superclass_Data$dotProfunctor$dotProfunctor_0, first, second) {
      this["__superclass_Data.Profunctor.Profunctor_0"] = __superclass_Data$dotProfunctor$dotProfunctor_0;
      this.first = first;
      this.second = second;
  };
  var strongFn = new Strong(function () {
      return Data_Profunctor.profunctorFn;
  }, function (a2b) {
      return function (_0) {
          return new Data_Tuple.Tuple(a2b(_0.value0), _0.value1);
      };
  }, Prelude["<$>"](Data_Tuple.functorTuple));
  var second = function (dict) {
      return dict.second;
  };
  var first = function (dict) {
      return dict.first;
  };
  exports["Strong"] = Strong;
  exports["second"] = second;
  exports["first"] = first;
  exports["strongFn"] = strongFn;;
 
})(PS["Data.Profunctor.Strong"] = PS["Data.Profunctor.Strong"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Tuple = PS["Data.Tuple"];
  var Data_Either = PS["Data.Either"];
  var Data_Profunctor = PS["Data.Profunctor"];
  var Data_Profunctor_Strong = PS["Data.Profunctor.Strong"];
  var Data_Profunctor_Choice = PS["Data.Profunctor.Choice"];
  var runStar = function (_3) {
      return _3;
  };
  var profunctorStar = function (__dict_Functor_1) {
      return new Data_Profunctor.Profunctor(function (f) {
          return function (g) {
              return function (_4) {
                  return Prelude[">>>"](Prelude.semigroupoidFn)(f)(Prelude[">>>"](Prelude.semigroupoidFn)(_4)(Prelude.map(__dict_Functor_1)(g)));
              };
          };
      });
  };
  var strongStar = function (__dict_Functor_0) {
      return new Data_Profunctor_Strong.Strong(function () {
          return profunctorStar(__dict_Functor_0);
      }, function (_5) {
          return function (_1) {
              return Prelude.map(__dict_Functor_0)(function (_0) {
                  return new Data_Tuple.Tuple(_0, _1.value1);
              })(_5(_1.value0));
          };
      }, function (_6) {
          return function (_2) {
              return Prelude.map(__dict_Functor_0)(Data_Tuple.Tuple.create(_2.value0))(_6(_2.value1));
          };
      });
  };
  exports["runStar"] = runStar;
  exports["profunctorStar"] = profunctorStar;
  exports["strongStar"] = strongStar;;
 
})(PS["Data.Profunctor.Star"] = PS["Data.Profunctor.Star"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Const = PS["Data.Const"];
  var Data_Functor_Contravariant = PS["Data.Functor.Contravariant"];
  var Data_Profunctor_Star = PS["Data.Profunctor.Star"];
  var Data_Lens_Types = PS["Data.Lens.Types"];     
  var view = function (l) {
      return function (s) {
          return Data_Const.getConst(Data_Profunctor_Star.runStar(l(Data_Const.Const))(s));
      };
  };
  var $up$dot = function (s) {
      return function (l) {
          return view(l)(s);
      };
  };
  var to = function (__dict_Contravariant_0) {
      return function (f) {
          return function (p) {
              return function (_0) {
                  return Data_Functor_Contravariant.cmap(__dict_Contravariant_0)(f)(Data_Profunctor_Star.runStar(p)(f(_0)));
              };
          };
      };
  };
  exports["to"] = to;
  exports["view"] = view;
  exports["^."] = $up$dot;;
 
})(PS["Data.Lens.Getter"] = PS["Data.Lens.Getter"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Profunctor = PS["Data.Profunctor"];
  var Data_Profunctor_Strong = PS["Data.Profunctor.Strong"];
  var Data_Tuple = PS["Data.Tuple"];
  var Data_Lens_Internal_Shop = PS["Data.Lens.Internal.Shop"];
  var Data_Lens_Types = PS["Data.Lens.Types"];
  var lens$prime = function (to) {
      return function (__dict_Strong_0) {
          return function (pab) {
              return Data_Profunctor.dimap(__dict_Strong_0["__superclass_Data.Profunctor.Profunctor_0"]())(to)(function (_0) {
                  return _0.value1(_0.value0);
              })(Data_Profunctor_Strong.first(__dict_Strong_0)(pab));
          };
      };
  };
  var lens = function (get) {
      return function (set) {
          return function (__dict_Strong_1) {
              return lens$prime(function (s) {
                  return new Data_Tuple.Tuple(get(s), function (b) {
                      return set(s)(b);
                  });
              })(__dict_Strong_1);
          };
      };
  };
  exports["lens"] = lens;;
 
})(PS["Data.Lens.Lens"] = PS["Data.Lens.Lens"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Lens_Types = PS["Data.Lens.Types"];     
  var over = function (l) {
      return l;
  };
  var set = function (l) {
      return function (b) {
          return over(l)(Prelude["const"](b));
      };
  };
  var $dot$tilde = set;
  var $plus$tilde = function (__dict_Semiring_3) {
      return function (p) {
          return function (_4) {
              return over(p)(Prelude.add(__dict_Semiring_3)(_4));
          };
      };
  };
  var $minus$tilde = function (__dict_Ring_4) {
      return function (p) {
          return function (_5) {
              return over(p)(Prelude.flip(Prelude.sub(__dict_Ring_4))(_5));
          };
      };
  };
  exports["set"] = set;
  exports["over"] = over;
  exports["-~"] = $minus$tilde;
  exports["+~"] = $plus$tilde;
  exports[".~"] = $dot$tilde;;
 
})(PS["Data.Lens.Setter"] = PS["Data.Lens.Setter"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Types = PS["Types"];     
  var suffer = function (_0) {
      return Prelude.id(Prelude.categoryFn);
  };
  exports["suffer"] = suffer;;
 
})(PS["Disaster"] = PS["Disaster"] || {});
(function(exports) {
  /* global exports, require */
  "use strict";

  // module Halogen.Internal.VirtualDOM

  // jshint maxparams: 2
  exports.prop = function (key, value) {
    var props = {};
    props[key] = value;
    return props;
  };

  // jshint maxparams: 2
  exports.attr = function (key, value) {
    var props = { attributes: {} };
    props.attributes[key] = value;
    return props;
  };

  function HandlerHook (key, f) {
    this.key = key;
    this.callback = function (e) {
      f(e)();
    };
  }

  HandlerHook.prototype = {
    hook: function (node) {
      node.addEventListener(this.key, this.callback);
    },
    unhook: function (node) {
      node.removeEventListener(this.key, this.callback);
    }
  };

  // jshint maxparams: 2
  exports.handlerProp = function (key, f) {
    var props = {};
    props["halogen-hook-" + key] = new HandlerHook(key, f);
    return props;
  };

  // jshint maxparams: 3
  function ifHookFn (node, prop, diff) {
    // jshint validthis: true
    if (typeof diff === "undefined") {
      this.f(node)();
    }
  }

  // jshint maxparams: 1
  function InitHook (f) {
    this.f = f;
  }

  InitHook.prototype = {
    hook: ifHookFn
  };

  exports.initProp = function (f) {
    return { "halogen-init": new InitHook(f) };
  };

  function FinalHook (f) {
    this.f = f;
  }

  FinalHook.prototype = {
    unhook: ifHookFn
  };

  exports.finalizerProp = function (f) {
    return { "halogen-final": new FinalHook(f) };
  };

  exports.concatProps = function () {
    // jshint maxparams: 2
    var hOP = Object.prototype.hasOwnProperty;
    var copy = function (props, result) {
      for (var key in props) {
        if (hOP.call(props, key)) {
          if (key === "attributes") {
            var attrs = props[key];
            var resultAttrs = result[key] || (result[key] = {});
            for (var attr in attrs) {
              if (hOP.call(attrs, attr)) {
                resultAttrs[attr] = attrs[attr];
              }
            }
          } else {
            result[key] = props[key];
          }
        }
      }
      return result;
    };
    return function (p1, p2) {
      return copy(p2, copy(p1, {}));
    };
  }();

  exports.emptyProps = {};

  exports.createElement = function () {
    var vcreateElement = require("virtual-dom/create-element");
    return function (vtree) {
      return vcreateElement(vtree);
    };
  }();

  exports.diff = function () {
    var vdiff = require("virtual-dom/diff");
    return function (vtree1) {
      return function (vtree2) {
        return vdiff(vtree1, vtree2);
      };
    };
  }();

  exports.patch = function () {
    var vpatch = require("virtual-dom/patch");
    return function (p) {
      return function (node) {
        return function () {
          return vpatch(node, p);
        };
      };
    };
  }();

  exports.vtext = function () {
    var VText = require("virtual-dom/vnode/vtext");
    return function (s) {
      return new VText(s);
    };
  }();

  exports.vnode = function () {
    var VirtualNode = require("virtual-dom/vnode/vnode");
    var SoftSetHook = require("virtual-dom/virtual-hyperscript/hooks/soft-set-hook");
    return function (namespace) {
      return function (name) {
        return function (key) {
          return function (props) {
            return function (children) {
              if (name === "input" && props.value !== undefined) {
                props.value = new SoftSetHook(props.value);
              }
              return new VirtualNode(name, props, children, key, namespace);
            };
          };
        };
      };
    };
  }();
 
})(PS["Halogen.Internal.VirtualDOM"] = PS["Halogen.Internal.VirtualDOM"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["Halogen.Internal.VirtualDOM"];
  var Prelude = PS["Prelude"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Nullable = PS["Data.Nullable"];
  var Data_Function = PS["Data.Function"];
  var DOM = PS["DOM"];
  var DOM_HTML_Types = PS["DOM.HTML.Types"];     
  var semigroupProps = new Prelude.Semigroup(Data_Function.runFn2($foreign.concatProps));
  var monoidProps = new Data_Monoid.Monoid(function () {
      return semigroupProps;
  }, $foreign.emptyProps);
  exports["semigroupProps"] = semigroupProps;
  exports["monoidProps"] = monoidProps;
  exports["vnode"] = $foreign.vnode;
  exports["vtext"] = $foreign.vtext;
  exports["patch"] = $foreign.patch;
  exports["diff"] = $foreign.diff;
  exports["createElement"] = $foreign.createElement;
  exports["finalizerProp"] = $foreign.finalizerProp;
  exports["initProp"] = $foreign.initProp;
  exports["handlerProp"] = $foreign.handlerProp;
  exports["attr"] = $foreign.attr;
  exports["prop"] = $foreign.prop;;
 
})(PS["Halogen.Internal.VirtualDOM"] = PS["Halogen.Internal.VirtualDOM"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Monad_Aff = PS["Control.Monad.Aff"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Monad_Eff_Exception = PS["Control.Monad.Eff.Exception"];
  var Data_Exists = PS["Data.Exists"];
  var Data_ExistsR = PS["Data.ExistsR"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Function = PS["Data.Function"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Nullable = PS["Data.Nullable"];
  var Halogen_Effects = PS["Halogen.Effects"];
  var Halogen_HTML_Core = PS["Halogen.HTML.Core"];
  var Halogen_HTML_Events_Handler = PS["Halogen.HTML.Events.Handler"];
  var Halogen_Internal_VirtualDOM = PS["Halogen.Internal.VirtualDOM"];     
  var handleAff = Control_Monad_Aff.runAff(Control_Monad_Eff_Exception.throwException)(Prelude["const"](Prelude.pure(Control_Monad_Eff.applicativeEff)(Prelude.unit)));
  var renderProp = function (dr) {
      return function (_2) {
          if (_2 instanceof Halogen_HTML_Core.Prop) {
              return Data_Exists.runExists(function (_0) {
                  return Halogen_Internal_VirtualDOM.prop(Halogen_HTML_Core.runPropName(_0.value0), _0.value1);
              })(_2.value0);
          };
          if (_2 instanceof Halogen_HTML_Core.Attr) {
              var attrName = Data_Maybe.maybe("")(function (ns$prime) {
                  return Halogen_HTML_Core.runNamespace(ns$prime) + ":";
              })(_2.value0) + Halogen_HTML_Core.runAttrName(_2.value1);
              return Halogen_Internal_VirtualDOM.attr(attrName, _2.value2);
          };
          if (_2 instanceof Halogen_HTML_Core.Handler) {
              return Data_ExistsR.runExistsR(function (_1) {
                  return Halogen_Internal_VirtualDOM.handlerProp(Halogen_HTML_Core.runEventName(_1.value0), function (ev) {
                      return handleAff(Prelude[">>="](Control_Monad_Aff.bindAff)(Halogen_HTML_Events_Handler.runEventHandler(Control_Monad_Aff.monadAff)(Control_Monad_Aff.monadEffAff)(ev)(_1.value1(ev)))(Data_Maybe.maybe(Prelude.pure(Control_Monad_Aff.applicativeAff)(Prelude.unit))(dr)));
                  });
              })(_2.value0);
          };
          if (_2 instanceof Halogen_HTML_Core.Initializer) {
              return Halogen_Internal_VirtualDOM.initProp(function (_31) {
                  return handleAff(dr(_2.value0(_31)));
              });
          };
          if (_2 instanceof Halogen_HTML_Core.Finalizer) {
              return Halogen_Internal_VirtualDOM.finalizerProp(function (_32) {
                  return handleAff(dr(_2.value0(_32)));
              });
          };
          return Data_Monoid.mempty(Halogen_Internal_VirtualDOM.monoidProps);
      };
  };
  var findKey = function (r) {
      return function (_3) {
          if (_3 instanceof Halogen_HTML_Core.Key) {
              return new Data_Maybe.Just(_3.value0);
          };
          return r;
      };
  };
  var renderHTML = function (f) {
      var go = function (_4) {
          if (_4 instanceof Halogen_HTML_Core.Text) {
              return Halogen_Internal_VirtualDOM.vtext(_4.value0);
          };
          if (_4 instanceof Halogen_HTML_Core.Element) {
              var tag = Halogen_HTML_Core.runTagName(_4.value1);
              var ns$prime = Data_Nullable.toNullable(Prelude["<$>"](Data_Maybe.functorMaybe)(Halogen_HTML_Core.runNamespace)(_4.value0));
              var key = Data_Nullable.toNullable(Data_Foldable.foldl(Data_Foldable.foldableArray)(findKey)(Data_Maybe.Nothing.value)(_4.value2));
              return Halogen_Internal_VirtualDOM.vnode(ns$prime)(tag)(key)(Data_Foldable.foldMap(Data_Foldable.foldableArray)(Halogen_Internal_VirtualDOM.monoidProps)(renderProp(f))(_4.value2))(Prelude.map(Prelude.functorArray)(go)(_4.value3));
          };
          if (_4 instanceof Halogen_HTML_Core.Slot) {
              return Halogen_Internal_VirtualDOM.vtext("");
          };
          throw new Error("Failed pattern match at Halogen.HTML.Renderer.VirtualDOM line 27, column 1 - line 28, column 1: " + [ _4.constructor.name ]);
      };
      return go;
  };
  exports["renderHTML"] = renderHTML;;
 
})(PS["Halogen.HTML.Renderer.VirtualDOM"] = PS["Halogen.HTML.Renderer.VirtualDOM"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Coroutine = PS["Control.Coroutine"];
  var Control_Coroutine_Stalling = PS["Control.Coroutine.Stalling"];
  var Control_Monad_Aff = PS["Control.Monad.Aff"];
  var Control_Monad_Aff_AVar = PS["Control.Monad.Aff.AVar"];
  var Control_Monad_Eff_Class = PS["Control.Monad.Eff.Class"];
  var Control_Monad_Free = PS["Control.Monad.Free"];
  var Control_Monad_Rec_Class = PS["Control.Monad.Rec.Class"];
  var Control_Monad_State = PS["Control.Monad.State"];
  var Control_Monad_Trans = PS["Control.Monad.Trans"];
  var Control_Plus = PS["Control.Plus"];
  var Data_NaturalTransformation = PS["Data.NaturalTransformation"];
  var Data_Tuple = PS["Data.Tuple"];
  var DOM_HTML_Types = PS["DOM.HTML.Types"];
  var Halogen_Component = PS["Halogen.Component"];
  var Halogen_Effects = PS["Halogen.Effects"];
  var Halogen_HTML_Renderer_VirtualDOM = PS["Halogen.HTML.Renderer.VirtualDOM"];
  var Halogen_Internal_VirtualDOM = PS["Halogen.Internal.VirtualDOM"];
  var Halogen_Query = PS["Halogen.Query"];
  var Halogen_Query_StateF = PS["Halogen.Query.StateF"];
  var Halogen_Query_EventSource = PS["Halogen.Query.EventSource"];
  var Halogen_Query_HalogenF = PS["Halogen.Query.HalogenF"];
  var Control_Monad_State_Trans = PS["Control.Monad.State.Trans"];
  var Data_Identity = PS["Data.Identity"];
  var Control_Monad_Free_Trans = PS["Control.Monad.Free.Trans"];     
  var runUI = function (c) {
      return function (s) {
          var render = function (ref) {
              return Prelude.bind(Control_Monad_Aff.bindAff)(Control_Monad_Aff_AVar.takeVar(ref))(function (_3) {
                  var _6 = !_3.renderPending;
                  if (_6) {
                      return Control_Monad_Aff_AVar.putVar(ref)(_3);
                  };
                  if (!_6) {
                      var _7 = Halogen_Component.renderComponent(c)(_3.state);
                      var vtree$prime = Halogen_HTML_Renderer_VirtualDOM.renderHTML(driver(ref))(_7.value0);
                      return Prelude.bind(Control_Monad_Aff.bindAff)(Control_Monad_Eff_Class.liftEff(Control_Monad_Aff.monadEffAff)(Halogen_Internal_VirtualDOM.patch(Halogen_Internal_VirtualDOM.diff(_3.vtree)(vtree$prime))(_3.node)))(function (_2) {
                          return Control_Monad_Aff_AVar.putVar(ref)({
                              node: _2, 
                              vtree: vtree$prime, 
                              state: _7.value1, 
                              renderPending: false
                          });
                      });
                  };
                  throw new Error("Failed pattern match at Halogen.Driver line 56, column 1 - line 61, column 1: " + [ _6.constructor.name ]);
              });
          };
          var $$eval = function (ref) {
              return function (h) {
                  if (h instanceof Halogen_Query_HalogenF.StateHF) {
                      return Prelude.bind(Control_Monad_Aff.bindAff)(Control_Monad_Aff_AVar.takeVar(ref))(function (_1) {
                          var _13 = Control_Monad_State.runState(Halogen_Query_StateF.stateN(Control_Monad_State_Trans.monadStateT(Data_Identity.monadIdentity))(Control_Monad_State_Trans.monadStateStateT(Data_Identity.monadIdentity))(h.value0))(_1.state);
                          return Prelude.bind(Control_Monad_Aff.bindAff)(Control_Monad_Aff_AVar.putVar(ref)({
                              node: _1.node, 
                              vtree: _1.vtree, 
                              state: _13.value1, 
                              renderPending: true
                          }))(function () {
                              return Prelude.pure(Control_Monad_Aff.applicativeAff)(_13.value0);
                          });
                      });
                  };
                  if (h instanceof Halogen_Query_HalogenF.SubscribeHF) {
                      var producer = Halogen_Query_EventSource.runEventSource(h.value0);
                      var consumer = Control_Monad_Rec_Class.forever(Control_Monad_Free_Trans.monadRecFreeT(Control_Coroutine.functorAwait)(Control_Monad_Aff.monadAff))(Control_Bind["=<<"](Control_Monad_Free_Trans.bindFreeT(Control_Coroutine.functorAwait)(Control_Monad_Aff.monadAff))(function (_25) {
                          return Control_Monad_Trans.lift(Control_Monad_Free_Trans.monadTransFreeT(Control_Coroutine.functorAwait))(Control_Monad_Aff.monadAff)(driver(ref)(_25));
                      })(Control_Coroutine.await(Control_Monad_Aff.monadAff)));
                      return Prelude.bind(Control_Monad_Aff.bindAff)(Control_Monad_Aff.forkAff(Control_Coroutine_Stalling.runStallingProcess(Control_Monad_Aff.monadRecAff)(Control_Coroutine_Stalling["$$?"](Control_Monad_Aff.monadRecAff)(producer)(consumer))))(function () {
                          return Prelude.pure(Control_Monad_Aff.applicativeAff)(h.value1);
                      });
                  };
                  if (h instanceof Halogen_Query_HalogenF.QueryHF) {
                      return Prelude.bind(Control_Monad_Aff.bindAff)(render(ref))(function () {
                          return h.value0;
                      });
                  };
                  if (h instanceof Halogen_Query_HalogenF.HaltHF) {
                      return Control_Plus.empty(Control_Monad_Aff.plusAff);
                  };
                  throw new Error("Failed pattern match at Halogen.Driver line 56, column 1 - line 61, column 1: " + [ h.constructor.name ]);
              };
          };
          var driver = function (ref) {
              return function (q) {
                  return Prelude.bind(Control_Monad_Aff.bindAff)(Control_Monad_Free.runFreeM(Halogen_Query_HalogenF.functorHalogenF(Control_Monad_Aff.functorAff))(Control_Monad_Aff.monadRecAff)($$eval(ref))(Halogen_Component.queryComponent(c)(q)))(function (_0) {
                      return Prelude.bind(Control_Monad_Aff.bindAff)(render(ref))(function () {
                          return Prelude.pure(Control_Monad_Aff.applicativeAff)(_0);
                      });
                  });
              };
          };
          var _21 = Halogen_Component.renderComponent(c)(s);
          return Prelude.bind(Control_Monad_Aff.bindAff)(Control_Monad_Aff_AVar.makeVar)(function (_4) {
              var vtree = Halogen_HTML_Renderer_VirtualDOM.renderHTML(driver(_4))(_21.value0);
              var node = Halogen_Internal_VirtualDOM.createElement(vtree);
              return Prelude.bind(Control_Monad_Aff.bindAff)(Control_Monad_Aff_AVar.putVar(_4)({
                  node: node, 
                  vtree: vtree, 
                  state: _21.value1, 
                  renderPending: false
              }))(function () {
                  return Prelude.pure(Control_Monad_Aff.applicativeAff)({
                      node: node, 
                      driver: driver(_4)
                  });
              });
          });
      };
  };
  exports["runUI"] = runUI;;
 
})(PS["Halogen.Driver"] = PS["Halogen.Driver"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Halogen_HTML_Core = PS["Halogen.HTML.Core"];
  var Halogen_HTML_Properties_Indexed = PS["Halogen.HTML.Properties.Indexed"];
  var Halogen_HTML_Elements = PS["Halogen.HTML.Elements"];
  var Unsafe_Coerce = PS["Unsafe.Coerce"];                              
  var span = Unsafe_Coerce.unsafeCoerce(Halogen_HTML_Elements.span);  
  var img = Unsafe_Coerce.unsafeCoerce(Halogen_HTML_Elements.img);      
  var i = Unsafe_Coerce.unsafeCoerce(Halogen_HTML_Elements.i);  
  var h3 = Unsafe_Coerce.unsafeCoerce(Halogen_HTML_Elements.h3);
  var h1 = Unsafe_Coerce.unsafeCoerce(Halogen_HTML_Elements.h1);
  var div = Unsafe_Coerce.unsafeCoerce(Halogen_HTML_Elements.div);
  var a = Unsafe_Coerce.unsafeCoerce(Halogen_HTML_Elements.a);
  exports["span"] = span;
  exports["img"] = img;
  exports["i"] = i;
  exports["h3"] = h3;
  exports["h1"] = h1;
  exports["div"] = div;
  exports["a"] = a;;
 
})(PS["Halogen.HTML.Elements.Indexed"] = PS["Halogen.HTML.Elements.Indexed"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Halogen_Query = PS["Halogen.Query"];
  var Halogen_HTML_Events_Handler = PS["Halogen.HTML.Events.Handler"];
  var Halogen_HTML_Events_Types = PS["Halogen.HTML.Events.Types"];
  var Halogen_HTML_Core = PS["Halogen.HTML.Core"];                                        
  var onMouseDown = Halogen_HTML_Core.handler(Halogen_HTML_Core.eventName("mousedown"));
  var input_ = function (f) {
      return function (_0) {
          return Prelude.pure(Halogen_HTML_Events_Handler.applicativeEventHandler)(Halogen_Query.action(f));
      };
  };
  exports["onMouseDown"] = onMouseDown;
  exports["input_"] = input_;;
 
})(PS["Halogen.HTML.Events"] = PS["Halogen.HTML.Events"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Unsafe_Coerce = PS["Unsafe.Coerce"];
  var Halogen_HTML_Events_Handler = PS["Halogen.HTML.Events.Handler"];
  var Halogen_HTML_Events_Types = PS["Halogen.HTML.Events.Types"];
  var Halogen_HTML_Properties_Indexed = PS["Halogen.HTML.Properties.Indexed"];
  var Halogen_HTML_Events = PS["Halogen.HTML.Events"];
  var Halogen_HTML_Events_Forms = PS["Halogen.HTML.Events.Forms"];                
  var onMouseDown = Unsafe_Coerce.unsafeCoerce(Halogen_HTML_Events.onMouseDown);
  exports["onMouseDown"] = onMouseDown;;
 
})(PS["Halogen.HTML.Events.Indexed"] = PS["Halogen.HTML.Events.Indexed"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Monad_Eff_Class = PS["Control.Monad.Eff.Class"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Nullable = PS["Data.Nullable"];
  var DOM = PS["DOM"];
  var DOM_Event_EventTarget = PS["DOM.Event.EventTarget"];
  var DOM_Event_EventTypes = PS["DOM.Event.EventTypes"];
  var DOM_HTML = PS["DOM.HTML"];
  var DOM_HTML_Types = PS["DOM.HTML.Types"];
  var DOM_HTML_Window = PS["DOM.HTML.Window"];
  var DOM_Node_Node = PS["DOM.Node.Node"];
  var DOM_Node_ParentNode = PS["DOM.Node.ParentNode"];
  var DOM_Node_Types = PS["DOM.Node.Types"];     
  var onLoad = function (__dict_MonadEff_0) {
      return function (callback) {
          return Control_Monad_Eff_Class.liftEff(__dict_MonadEff_0)(Control_Bind["=<<"](Control_Monad_Eff.bindEff)(function (_6) {
              return DOM_Event_EventTarget.addEventListener(DOM_Event_EventTypes.load)(DOM_Event_EventTarget.eventListener(function (_1) {
                  return callback;
              }))(false)(DOM_HTML_Types.windowToEventTarget(_6));
          })(DOM_HTML.window));
      };
  };
  var appendTo = function (__dict_MonadEff_1) {
      return function (query) {
          return function (elem) {
              return Control_Monad_Eff_Class.liftEff(__dict_MonadEff_1)(function __do() {
                  var _0 = Prelude["<$>"](Control_Monad_Eff.functorEff)(Data_Nullable.toMaybe)(Control_Bind["=<<"](Control_Monad_Eff.bindEff)(Control_Bind["<=<"](Control_Monad_Eff.bindEff)(function (_7) {
                      return DOM_Node_ParentNode.querySelector(query)(DOM_HTML_Types.htmlDocumentToParentNode(_7));
                  })(DOM_HTML_Window.document))(DOM_HTML.window))();
                  return (function () {
                      if (_0 instanceof Data_Maybe.Nothing) {
                          return Prelude.pure(Control_Monad_Eff.applicativeEff)(Prelude.unit);
                      };
                      if (_0 instanceof Data_Maybe.Just) {
                          return Prelude["void"](Control_Monad_Eff.functorEff)(DOM_Node_Node.appendChild(DOM_HTML_Types.htmlElementToNode(elem))(DOM_Node_Types.elementToNode(_0.value0)));
                      };
                      throw new Error("Failed pattern match at Halogen.Util line 28, column 1 - line 30, column 1: " + [ _0.constructor.name ]);
                  })()();
              });
          };
      };
  };
  var appendToBody = function (__dict_MonadEff_2) {
      return appendTo(__dict_MonadEff_2)("body");
  };
  exports["onLoad"] = onLoad;
  exports["appendToBody"] = appendToBody;
  exports["appendTo"] = appendTo;;
 
})(PS["Halogen.Util"] = PS["Halogen.Util"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Data_Lens_Lens = PS["Data.Lens.Lens"];
  var Data_Lens_Getter = PS["Data.Lens.Getter"];
  var Prelude = PS["Prelude"];
  var Data_Lens = PS["Data.Lens"];
  var Data_Time = PS["Data.Time"];
  var Types = PS["Types"];
  var Data_Const = PS["Data.Const"];     
  var viewLevel = (function () {
      var viewLevel$prime = function (_52) {
          if (_52 instanceof Types.Misc1) {
              return _52.value0;
          };
          if (_52 instanceof Types.Misc2) {
              return _52.value0;
          };
          if (_52 instanceof Types.Tech1) {
              return _52.value0;
          };
          if (_52 instanceof Types.Tech2) {
              return _52.value0;
          };
          if (_52 instanceof Types.Phil1) {
              return _52.value0;
          };
          if (_52 instanceof Types.Phil2) {
              return _52.value0;
          };
          if (_52 instanceof Types.Poli1) {
              return _52.value0;
          };
          if (_52 instanceof Types.Poli2) {
              return _52.value0;
          };
          if (_52 instanceof Types.Science1) {
              return _52.value0;
          };
          if (_52 instanceof Types.Science2) {
              return _52.value0;
          };
          throw new Error("Failed pattern match at Lenses line 85, column 5 - line 86, column 5: " + [ _52.constructor.name ]);
      };
      return Data_Lens_Getter.to(Data_Const.contravariantConst)(viewLevel$prime);
  })();
  var upgrades = function (__dict_Strong_0) {
      return Data_Lens_Lens.lens(function (_21) {
          return _21.upgrades;
      })(function (_22) {
          return function (_23) {
              var _64 = {};
              for (var _65 in _22) {
                  if (_22.hasOwnProperty(_65)) {
                      _64[_65] = _22[_65];
                  };
              };
              _64.upgrades = _23;
              return _64;
          };
      })(__dict_Strong_0);
  };
  var totalClicks = function (__dict_Strong_1) {
      return Data_Lens_Lens.lens(function (_3) {
          return _3.totalClicks;
      })(function (_4) {
          return function (_5) {
              var _66 = {};
              for (var _67 in _4) {
                  if (_4.hasOwnProperty(_67)) {
                      _66[_67] = _4[_67];
                  };
              };
              _66.totalClicks = _5;
              return _66;
          };
      })(__dict_Strong_1);
  };
  var tab = function (__dict_Strong_2) {
      return Data_Lens_Lens.lens(function (_34) {
          return _34.view;
      })(function (_35) {
          return function (_36) {
              var _68 = {};
              for (var _69 in _35) {
                  if (_35.hasOwnProperty(_69)) {
                      _68[_69] = _35[_69];
                  };
              };
              _68.view = _36;
              return _68;
          };
      })(__dict_Strong_2);
  };
  var runUpgrades = function (_51) {
      return _51;
  };
  var science1 = function (__dict_Strong_3) {
      return Data_Lens_Lens.lens(function (_117) {
          return (function (_32) {
              return _32.science1;
          })(runUpgrades(_117));
      })(function (_49) {
          return function (v) {
              var _72 = {};
              for (var _73 in _49) {
                  if (_49.hasOwnProperty(_73)) {
                      _72[_73] = _49[_73];
                  };
              };
              _72.science1 = v;
              return _72;
          };
      })(__dict_Strong_3);
  };
  var science2 = function (__dict_Strong_4) {
      return Data_Lens_Lens.lens(function (_118) {
          return (function (_33) {
              return _33.science2;
          })(runUpgrades(_118));
      })(function (_50) {
          return function (v) {
              var _75 = {};
              for (var _76 in _50) {
                  if (_50.hasOwnProperty(_76)) {
                      _75[_76] = _50[_76];
                  };
              };
              _75.science2 = v;
              return _75;
          };
      })(__dict_Strong_4);
  };
  var tech1 = function (__dict_Strong_5) {
      return Data_Lens_Lens.lens(function (_119) {
          return (function (_26) {
              return _26.tech1;
          })(runUpgrades(_119));
      })(function (_43) {
          return function (v) {
              var _78 = {};
              for (var _79 in _43) {
                  if (_43.hasOwnProperty(_79)) {
                      _78[_79] = _43[_79];
                  };
              };
              _78.tech1 = v;
              return _78;
          };
      })(__dict_Strong_5);
  };
  var tech2 = function (__dict_Strong_6) {
      return Data_Lens_Lens.lens(function (_120) {
          return (function (_27) {
              return _27.tech2;
          })(runUpgrades(_120));
      })(function (_44) {
          return function (v) {
              var _81 = {};
              for (var _82 in _44) {
                  if (_44.hasOwnProperty(_82)) {
                      _81[_82] = _44[_82];
                  };
              };
              _81.tech2 = v;
              return _81;
          };
      })(__dict_Strong_6);
  };
  var poli2 = function (__dict_Strong_7) {
      return Data_Lens_Lens.lens(function (_121) {
          return (function (_31) {
              return _31.poli2;
          })(runUpgrades(_121));
      })(function (_48) {
          return function (v) {
              var _84 = {};
              for (var _85 in _48) {
                  if (_48.hasOwnProperty(_85)) {
                      _84[_85] = _48[_85];
                  };
              };
              _84.poli2 = v;
              return _84;
          };
      })(__dict_Strong_7);
  };
  var poli1 = function (__dict_Strong_8) {
      return Data_Lens_Lens.lens(function (_122) {
          return (function (_30) {
              return _30.poli1;
          })(runUpgrades(_122));
      })(function (_47) {
          return function (v) {
              var _87 = {};
              for (var _88 in _47) {
                  if (_47.hasOwnProperty(_88)) {
                      _87[_88] = _47[_88];
                  };
              };
              _87.poli1 = v;
              return _87;
          };
      })(__dict_Strong_8);
  };
  var phil2 = function (__dict_Strong_9) {
      return Data_Lens_Lens.lens(function (_123) {
          return (function (_29) {
              return _29.phil2;
          })(runUpgrades(_123));
      })(function (_46) {
          return function (v) {
              var _90 = {};
              for (var _91 in _46) {
                  if (_46.hasOwnProperty(_91)) {
                      _90[_91] = _46[_91];
                  };
              };
              _90.phil2 = v;
              return _90;
          };
      })(__dict_Strong_9);
  };
  var phil1 = function (__dict_Strong_10) {
      return Data_Lens_Lens.lens(function (_124) {
          return (function (_28) {
              return _28.phil1;
          })(runUpgrades(_124));
      })(function (_45) {
          return function (v) {
              var _93 = {};
              for (var _94 in _45) {
                  if (_45.hasOwnProperty(_94)) {
                      _93[_94] = _45[_94];
                  };
              };
              _93.phil1 = v;
              return _93;
          };
      })(__dict_Strong_10);
  };
  var now = function (__dict_Strong_11) {
      return Data_Lens_Lens.lens(function (_18) {
          return _18.now;
      })(function (_19) {
          return function (_20) {
              var _95 = {};
              for (var _96 in _19) {
                  if (_19.hasOwnProperty(_96)) {
                      _95[_96] = _19[_96];
                  };
              };
              _95.now = _20;
              return _95;
          };
      })(__dict_Strong_11);
  };
  var misc2 = function (__dict_Strong_12) {
      return Data_Lens_Lens.lens(function (_125) {
          return (function (_25) {
              return _25.misc2;
          })(runUpgrades(_125));
      })(function (_42) {
          return function (v) {
              var _98 = {};
              for (var _99 in _42) {
                  if (_42.hasOwnProperty(_99)) {
                      _98[_99] = _42[_99];
                  };
              };
              _98.misc2 = v;
              return _98;
          };
      })(__dict_Strong_12);
  };
  var misc1 = function (__dict_Strong_13) {
      return Data_Lens_Lens.lens(function (_126) {
          return (function (_24) {
              return _24.misc1;
          })(runUpgrades(_126));
      })(function (_41) {
          return function (v) {
              var _101 = {};
              for (var _102 in _41) {
                  if (_41.hasOwnProperty(_102)) {
                      _101[_102] = _41[_102];
                  };
              };
              _101.misc1 = v;
              return _101;
          };
      })(__dict_Strong_13);
  };
  var message = function (__dict_Strong_14) {
      return Data_Lens_Lens.lens(function (_15) {
          return _15.message;
      })(function (_16) {
          return function (_17) {
              var _103 = {};
              for (var _104 in _16) {
                  if (_16.hasOwnProperty(_104)) {
                      _103[_104] = _16[_104];
                  };
              };
              _103.message = _17;
              return _103;
          };
      })(__dict_Strong_14);
  };
  var currentClicks = function (__dict_Strong_15) {
      return Data_Lens_Lens.lens(function (_0) {
          return _0.currentClicks;
      })(function (_1) {
          return function (_2) {
              var _105 = {};
              for (var _106 in _1) {
                  if (_1.hasOwnProperty(_106)) {
                      _105[_106] = _1[_106];
                  };
              };
              _105.currentClicks = _2;
              return _105;
          };
      })(__dict_Strong_15);
  };
  var cps = function (__dict_Strong_16) {
      return Data_Lens_Lens.lens(function (_6) {
          return _6.cps;
      })(function (_7) {
          return function (_8) {
              var _107 = {};
              for (var _108 in _7) {
                  if (_7.hasOwnProperty(_108)) {
                      _107[_108] = _7[_108];
                  };
              };
              _107.cps = _8;
              return _107;
          };
      })(__dict_Strong_16);
  };
  var clicksPerSecond = function (__dict_Strong_17) {
      return Data_Lens_Lens.lens(function (_39) {
          return _39;
      })(function (_40) {
          return function (m) {
              return m;
          };
      })(__dict_Strong_17);
  };
  var cpsNumber = function (__dict_Strong_18) {
      return function (_127) {
          return cps(__dict_Strong_18)(clicksPerSecond(__dict_Strong_18)(_127));
      };
  };
  var clicks = function (__dict_Strong_19) {
      return Data_Lens_Lens.lens(function (_37) {
          return _37;
      })(function (_38) {
          return function (m) {
              return m;
          };
      })(__dict_Strong_19);
  };
  var currentClicksNumber = function (__dict_Strong_20) {
      return function (_128) {
          return currentClicks(__dict_Strong_20)(clicks(__dict_Strong_20)(_128));
      };
  };
  var totalClicksNumber = function (__dict_Strong_21) {
      return function (_129) {
          return totalClicks(__dict_Strong_21)(clicks(__dict_Strong_21)(_129));
      };
  };
  var burst = function (__dict_Strong_22) {
      return Data_Lens_Lens.lens(function (_9) {
          return _9.burst;
      })(function (_10) {
          return function (_11) {
              var _113 = {};
              for (var _114 in _10) {
                  if (_10.hasOwnProperty(_114)) {
                      _113[_114] = _10[_114];
                  };
              };
              _113.burst = _11;
              return _113;
          };
      })(__dict_Strong_22);
  };
  var burstNumber = function (__dict_Strong_23) {
      return function (_130) {
          return burst(__dict_Strong_23)(clicks(__dict_Strong_23)(_130));
      };
  };
  var age = function (__dict_Strong_24) {
      return Data_Lens_Lens.lens(function (_12) {
          return _12.age;
      })(function (_13) {
          return function (_14) {
              var _115 = {};
              for (var _116 in _13) {
                  if (_13.hasOwnProperty(_116)) {
                      _115[_116] = _13[_116];
                  };
              };
              _115.age = _14;
              return _115;
          };
      })(__dict_Strong_24);
  };
  exports["tab"] = tab;
  exports["viewLevel"] = viewLevel;
  exports["science2"] = science2;
  exports["science1"] = science1;
  exports["poli2"] = poli2;
  exports["poli1"] = poli1;
  exports["phil2"] = phil2;
  exports["phil1"] = phil1;
  exports["tech2"] = tech2;
  exports["tech1"] = tech1;
  exports["misc2"] = misc2;
  exports["misc1"] = misc1;
  exports["runUpgrades"] = runUpgrades;
  exports["upgrades"] = upgrades;
  exports["now"] = now;
  exports["message"] = message;
  exports["age"] = age;
  exports["burstNumber"] = burstNumber;
  exports["burst"] = burst;
  exports["cpsNumber"] = cpsNumber;
  exports["cps"] = cps;
  exports["totalClicksNumber"] = totalClicksNumber;
  exports["totalClicks"] = totalClicks;
  exports["currentClicksNumber"] = currentClicksNumber;
  exports["currentClicks"] = currentClicks;
  exports["clicksPerSecond"] = clicksPerSecond;
  exports["clicks"] = clicks;;
 
})(PS["Lenses"] = PS["Lenses"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Data_Lens_Getter = PS["Data.Lens.Getter"];
  var Data_Lens_Setter = PS["Data.Lens.Setter"];
  var Prelude = PS["Prelude"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Array = PS["Data.Array"];
  var Data_Int = PS["Data.Int"];
  var Data_Lens = PS["Data.Lens"];
  var Types = PS["Types"];
  var Lenses = PS["Lenses"];
  var Util = PS["Util"];
  var Data_Profunctor_Strong = PS["Data.Profunctor.Strong"];
  var Data_Profunctor_Star = PS["Data.Profunctor.Star"];
  var Data_Const = PS["Data.Const"];     
  var upgradeName = function (_1) {
      return function (_2) {
          if (_1 instanceof Types.Misc1 && _2 instanceof Types.Stone) {
              return "language";
          };
          if (_1 instanceof Types.Misc2 && _2 instanceof Types.Stone) {
              return "spear tips";
          };
          if (_1 instanceof Types.Tech1 && _2 instanceof Types.Stone) {
              return "fire!";
          };
          if (_1 instanceof Types.Tech2 && _2 instanceof Types.Stone) {
              return "stone tools";
          };
          if (_1 instanceof Types.Phil1 && _2 instanceof Types.Stone) {
              return "funeral rites";
          };
          if (_1 instanceof Types.Phil2 && _2 instanceof Types.Stone) {
              return "cave paintings";
          };
          if (_1 instanceof Types.Poli1 && _2 instanceof Types.Stone) {
              return "basic fishing";
          };
          if (_1 instanceof Types.Poli2 && _2 instanceof Types.Stone) {
              return "rudimentary farming";
          };
          if (_1 instanceof Types.Science1 && _2 instanceof Types.Stone) {
              return "dog domestication";
          };
          if (_1 instanceof Types.Science2 && _2 instanceof Types.Stone) {
              return "bronze smelting";
          };
          if (_1 instanceof Types.Science1 && _2 instanceof Types.Bronze) {
              return "abstract numbers";
          };
          return "Not implemented";
      };
  };
  var upgradeDescription = function (_3) {
      return function (_4) {
          if (_3 instanceof Types.Misc1 && _4 instanceof Types.Stone) {
              return "No more grunt-and-point for you!";
          };
          if (_3 instanceof Types.Misc2 && _4 instanceof Types.Stone) {
              return "Tip: a well-balanced spear is crucial for hunting.";
          };
          if (_3 instanceof Types.Tech1 && _4 instanceof Types.Stone) {
              return "We DID start the fire.";
          };
          if (_3 instanceof Types.Tech2 && _4 instanceof Types.Stone) {
              return "Never leave the Stone Age without 'em.";
          };
          if (_3 instanceof Types.Phil1 && _4 instanceof Types.Stone) {
              return "Funerals are a basic human rite.";
          };
          if (_3 instanceof Types.Phil2 && _4 instanceof Types.Stone) {
              return "You're no Picasso, but your paintings will last longer.";
          };
          if (_3 instanceof Types.Poli1 && _4 instanceof Types.Stone) {
              return "Fishing for landsharks?";
          };
          if (_3 instanceof Types.Poli2 && _4 instanceof Types.Stone) {
              return "Can I interest you in some delicious BEETS?";
          };
          if (_3 instanceof Types.Science1 && _4 instanceof Types.Stone) {
              return "A Clickonian's best friend.";
          };
          if (_3 instanceof Types.Science2 && _4 instanceof Types.Stone) {
              return "The holy grail of the Stone Age, except the real holy grail was made out of wood.";
          };
          if (_3 instanceof Types.Science1 && _4 instanceof Types.Bronze) {
              return "You've discovered that two clicks and two dogs both share 'twoness.' You also almost discovered the ultrafilter lemma, but you couldn't write it down fast enough. Because you haven't discovered writing yet.";
          };
          return "Not implemented";
      };
  };
  var upgradeCostModifier = function (n) {
      if (n <= 10) {
          return 1.5;
      };
      if (n <= 25) {
          return 1.0;
      };
      if (n <= 50) {
          return 0.75;
      };
      if (n <= 75) {
          return 0.5;
      };
      if (n <= 100) {
          return 0.25;
      };
      if (Prelude.otherwise) {
          return 0.125;
      };
      throw new Error("Failed pattern match at Upgrades line 39, column 1 - line 40, column 1: " + [ n.constructor.name ]);
  };
  var upgradeCostPolynomial = function (coeff) {
      return function (level) {
          return upgradeCostModifier(level) * coeff * Util["^"](1.2)(Data_Int.toNumber(level));
      };
  };
  var upgradeCost = function (_0) {
      if (_0 instanceof Types.Misc1) {
          return upgradeCostPolynomial(10.0)(_0.value0);
      };
      if (_0 instanceof Types.Misc2) {
          return upgradeCostPolynomial(500.0)(_0.value0);
      };
      if (_0 instanceof Types.Tech1) {
          return upgradeCostPolynomial(7500.0)(_0.value0);
      };
      if (_0 instanceof Types.Tech2) {
          return upgradeCostPolynomial(950000.0)(_0.value0);
      };
      if (_0 instanceof Types.Phil1) {
          return upgradeCostPolynomial(8250000.0)(_0.value0);
      };
      if (_0 instanceof Types.Phil2) {
          return upgradeCostPolynomial(5.2e7)(_0.value0);
      };
      if (_0 instanceof Types.Poli1) {
          return upgradeCostPolynomial(8.0e8)(_0.value0);
      };
      if (_0 instanceof Types.Poli2) {
          return upgradeCostPolynomial(6.05e9)(_0.value0);
      };
      if (_0 instanceof Types.Science1) {
          return upgradeCostPolynomial(6.00500004e11)(_0.value0);
      };
      if (_0 instanceof Types.Science2) {
          return upgradeCostPolynomial(6.50000700008e12)(_0.value0);
      };
      throw new Error("Failed pattern match at Upgrades line 24, column 1 - line 25, column 1: " + [ _0.constructor.name ]);
  };
  var upgradeBoostModifier = function (n) {
      if (n <= 10) {
          return 1.0;
      };
      if (n <= 25) {
          return 4.0;
      };
      if (n <= 50) {
          return 16.0;
      };
      if (n <= 75) {
          return 64.0;
      };
      if (n <= 100) {
          return 256.0;
      };
      if (Prelude.otherwise) {
          return 1024.0;
      };
      throw new Error("Failed pattern match at Upgrades line 108, column 1 - line 109, column 1: " + [ n.constructor.name ]);
  };
  var upgradeBoost = function (_6) {
      if (_6 instanceof Types.Misc1) {
          return 0.5 * upgradeBoostModifier(_6.value0);
      };
      if (_6 instanceof Types.Misc2) {
          return 4.0 * upgradeBoostModifier(_6.value0);
      };
      if (_6 instanceof Types.Tech1) {
          return 30.0 * upgradeBoostModifier(_6.value0);
      };
      if (_6 instanceof Types.Tech2) {
          return 400.0 * upgradeBoostModifier(_6.value0);
      };
      if (_6 instanceof Types.Phil1) {
          return 6000.0 * upgradeBoostModifier(_6.value0);
      };
      if (_6 instanceof Types.Phil2) {
          return 12220.5 * upgradeBoostModifier(_6.value0);
      };
      if (_6 instanceof Types.Poli1) {
          return 214592.6 * upgradeBoostModifier(_6.value0);
      };
      if (_6 instanceof Types.Poli2) {
          return 1712818.2 * upgradeBoostModifier(_6.value0);
      };
      if (_6 instanceof Types.Science1) {
          return 4.9e7 * upgradeBoostModifier(_6.value0);
      };
      if (_6 instanceof Types.Science2) {
          return 1.0e8 * upgradeBoostModifier(_6.value0);
      };
      throw new Error("Failed pattern match at Upgrades line 96, column 1 - line 97, column 1: " + [ _6.constructor.name ]);
  };
  var recordPurchase = function (up) {
      return function (optic) {
          return function (_80) {
              return Data_Lens_Setter["-~"](Types.ringClicks)(Lenses.currentClicks(Data_Profunctor_Strong.strongFn))(upgradeCost(up))(Data_Lens_Setter[".~"](function (_81) {
                  return Lenses.upgrades(Data_Profunctor_Strong.strongFn)(optic(Data_Profunctor_Strong.strongFn)(_81));
              })(up)(_80));
          };
      };
  };
  var nextUpgrade = function (_5) {
      if (_5 instanceof Types.Misc1) {
          return new Types.Misc1(_5.value0 + 1 | 0);
      };
      if (_5 instanceof Types.Misc2) {
          return new Types.Misc2(_5.value0 + 1 | 0);
      };
      if (_5 instanceof Types.Tech1) {
          return new Types.Tech1(_5.value0 + 1 | 0);
      };
      if (_5 instanceof Types.Tech2) {
          return new Types.Tech2(_5.value0 + 1 | 0);
      };
      if (_5 instanceof Types.Phil1) {
          return new Types.Phil1(_5.value0 + 1 | 0);
      };
      if (_5 instanceof Types.Phil2) {
          return new Types.Phil2(_5.value0 + 1 | 0);
      };
      if (_5 instanceof Types.Poli1) {
          return new Types.Poli1(_5.value0 + 1 | 0);
      };
      if (_5 instanceof Types.Poli2) {
          return new Types.Poli2(_5.value0 + 1 | 0);
      };
      if (_5 instanceof Types.Science1) {
          return new Types.Science1(_5.value0 + 1 | 0);
      };
      if (_5 instanceof Types.Science2) {
          return new Types.Science2(_5.value0 + 1 | 0);
      };
      throw new Error("Failed pattern match at Upgrades line 76, column 1 - line 77, column 1: " + [ _5.constructor.name ]);
  };
  var isInflectionUpgrade = function (up) {
      return Data_Foldable.elem(Data_Foldable.foldableArray)(Prelude.eqInt)(Data_Lens_Getter["^."](up)(Lenses.viewLevel))([ 10, 25, 50, 75, 100 ]);
  };
  var installUpgrade = function (up) {
      return function (optic) {
          return function (coeff) {
              return Data_Lens_Setter["+~"](Prelude.semiringNumber)(optic(Data_Profunctor_Strong.strongFn))(coeff * upgradeBoost(up));
          };
      };
  };
  var inflectionUpgradeMessage = function (up) {
      return function (age) {
          return upgradeName(up)(age) + " cost down, boost up";
      };
  };
  var canBuyUpgrade = function (state) {
      return function (optic) {
          var currUpgrade = Data_Lens_Getter["^."](state)(function (_82) {
              return Lenses.upgrades(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(optic(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(_82));
          });
          var next = nextUpgrade(currUpgrade);
          var nextCost = upgradeCost(next);
          var currClicks = Data_Lens_Getter["^."](state)(Lenses.currentClicks(Data_Profunctor_Star.strongStar(Data_Const.functorConst)));
          return Prelude[">="](Types.ordClicks)(currClicks)(nextCost);
      };
  };
  var buyUpgrade = function (_7) {
      if (_7 instanceof Types.Misc1) {
          return function (_83) {
              return installUpgrade(_7)(function (__dict_Strong_0) {
                  return Lenses.cpsNumber(__dict_Strong_0);
              })(0.75)(installUpgrade(_7)(function (__dict_Strong_1) {
                  return Lenses.burstNumber(__dict_Strong_1);
              })(0.3)(recordPurchase(_7)(function (__dict_Strong_2) {
                  return Lenses.misc1(__dict_Strong_2);
              })(_83)));
          };
      };
      if (_7 instanceof Types.Misc2) {
          return function (_84) {
              return installUpgrade(_7)(function (__dict_Strong_3) {
                  return Lenses.cpsNumber(__dict_Strong_3);
              })(0.75)(installUpgrade(_7)(function (__dict_Strong_4) {
                  return Lenses.burstNumber(__dict_Strong_4);
              })(0.3)(recordPurchase(_7)(function (__dict_Strong_5) {
                  return Lenses.misc2(__dict_Strong_5);
              })(_84)));
          };
      };
      if (_7 instanceof Types.Tech1) {
          return function (_85) {
              return installUpgrade(_7)(function (__dict_Strong_6) {
                  return Lenses.cpsNumber(__dict_Strong_6);
              })(0.75)(installUpgrade(_7)(function (__dict_Strong_7) {
                  return Lenses.burstNumber(__dict_Strong_7);
              })(0.3)(recordPurchase(_7)(function (__dict_Strong_8) {
                  return Lenses.tech1(__dict_Strong_8);
              })(_85)));
          };
      };
      if (_7 instanceof Types.Tech2) {
          return function (_86) {
              return installUpgrade(_7)(function (__dict_Strong_9) {
                  return Lenses.cpsNumber(__dict_Strong_9);
              })(0.75)(installUpgrade(_7)(function (__dict_Strong_10) {
                  return Lenses.burstNumber(__dict_Strong_10);
              })(0.3)(recordPurchase(_7)(function (__dict_Strong_11) {
                  return Lenses.tech2(__dict_Strong_11);
              })(_86)));
          };
      };
      if (_7 instanceof Types.Phil1) {
          return function (_87) {
              return installUpgrade(_7)(function (__dict_Strong_12) {
                  return Lenses.cpsNumber(__dict_Strong_12);
              })(0.75)(installUpgrade(_7)(function (__dict_Strong_13) {
                  return Lenses.burstNumber(__dict_Strong_13);
              })(0.3)(recordPurchase(_7)(function (__dict_Strong_14) {
                  return Lenses.phil1(__dict_Strong_14);
              })(_87)));
          };
      };
      if (_7 instanceof Types.Phil2) {
          return function (_88) {
              return installUpgrade(_7)(function (__dict_Strong_15) {
                  return Lenses.cpsNumber(__dict_Strong_15);
              })(0.75)(installUpgrade(_7)(function (__dict_Strong_16) {
                  return Lenses.burstNumber(__dict_Strong_16);
              })(0.3)(recordPurchase(_7)(function (__dict_Strong_17) {
                  return Lenses.phil2(__dict_Strong_17);
              })(_88)));
          };
      };
      if (_7 instanceof Types.Poli1) {
          return function (_89) {
              return installUpgrade(_7)(function (__dict_Strong_18) {
                  return Lenses.cpsNumber(__dict_Strong_18);
              })(0.75)(installUpgrade(_7)(function (__dict_Strong_19) {
                  return Lenses.burstNumber(__dict_Strong_19);
              })(0.3)(recordPurchase(_7)(function (__dict_Strong_20) {
                  return Lenses.poli1(__dict_Strong_20);
              })(_89)));
          };
      };
      if (_7 instanceof Types.Poli2) {
          return function (_90) {
              return installUpgrade(_7)(function (__dict_Strong_21) {
                  return Lenses.cpsNumber(__dict_Strong_21);
              })(0.75)(installUpgrade(_7)(function (__dict_Strong_22) {
                  return Lenses.burstNumber(__dict_Strong_22);
              })(0.3)(recordPurchase(_7)(function (__dict_Strong_23) {
                  return Lenses.poli2(__dict_Strong_23);
              })(_90)));
          };
      };
      if (_7 instanceof Types.Science1) {
          return function (_91) {
              return installUpgrade(_7)(function (__dict_Strong_24) {
                  return Lenses.cpsNumber(__dict_Strong_24);
              })(0.75)(installUpgrade(_7)(function (__dict_Strong_25) {
                  return Lenses.burstNumber(__dict_Strong_25);
              })(0.3)(recordPurchase(_7)(function (__dict_Strong_26) {
                  return Lenses.science1(__dict_Strong_26);
              })(_91)));
          };
      };
      if (_7 instanceof Types.Science2) {
          return function (_92) {
              return installUpgrade(_7)(function (__dict_Strong_27) {
                  return Lenses.cpsNumber(__dict_Strong_27);
              })(0.75)(installUpgrade(_7)(function (__dict_Strong_28) {
                  return Lenses.burstNumber(__dict_Strong_28);
              })(0.3)(recordPurchase(_7)(function (__dict_Strong_29) {
                  return Lenses.science2(__dict_Strong_29);
              })(_92)));
          };
      };
      throw new Error("Failed pattern match at Upgrades line 117, column 1 - line 118, column 1: " + [ _7.constructor.name ]);
  };
  var makeUpgradedState = function (u) {
      var tech2arr = Prelude["<$>"](Prelude.functorArray)(Types.Tech2.create)(Util["..."](1)(Data_Lens_Getter["^."](u)(function (_93) {
          return Lenses.tech2(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(Lenses.viewLevel(_93));
      })));
      var tech1arr = Prelude["<$>"](Prelude.functorArray)(Types.Tech1.create)(Util["..."](1)(Data_Lens_Getter["^."](u)(function (_94) {
          return Lenses.tech1(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(Lenses.viewLevel(_94));
      })));
      var science2arr = Prelude["<$>"](Prelude.functorArray)(Types.Science2.create)(Util["..."](1)(Data_Lens_Getter["^."](u)(function (_95) {
          return Lenses.science2(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(Lenses.viewLevel(_95));
      })));
      var science1arr = Prelude["<$>"](Prelude.functorArray)(Types.Science1.create)(Util["..."](1)(Data_Lens_Getter["^."](u)(function (_96) {
          return Lenses.science1(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(Lenses.viewLevel(_96));
      })));
      var poli2arr = Prelude["<$>"](Prelude.functorArray)(Types.Poli2.create)(Util["..."](1)(Data_Lens_Getter["^."](u)(function (_97) {
          return Lenses.poli2(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(Lenses.viewLevel(_97));
      })));
      var poli1arr = Prelude["<$>"](Prelude.functorArray)(Types.Poli1.create)(Util["..."](1)(Data_Lens_Getter["^."](u)(function (_98) {
          return Lenses.poli1(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(Lenses.viewLevel(_98));
      })));
      var phil2arr = Prelude["<$>"](Prelude.functorArray)(Types.Phil2.create)(Util["..."](1)(Data_Lens_Getter["^."](u)(function (_99) {
          return Lenses.phil2(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(Lenses.viewLevel(_99));
      })));
      var phil1arr = Prelude["<$>"](Prelude.functorArray)(Types.Phil1.create)(Util["..."](1)(Data_Lens_Getter["^."](u)(function (_100) {
          return Lenses.phil1(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(Lenses.viewLevel(_100));
      })));
      var misc2arr = Prelude["<$>"](Prelude.functorArray)(Types.Misc2.create)(Util["..."](1)(Data_Lens_Getter["^."](u)(function (_101) {
          return Lenses.misc2(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(Lenses.viewLevel(_101));
      })));
      var misc1arr = Prelude["<$>"](Prelude.functorArray)(Types.Misc1.create)(Util["..."](1)(Data_Lens_Getter["^."](u)(function (_102) {
          return Lenses.misc1(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(Lenses.viewLevel(_102));
      })));
      var upArray = Data_Array.concat([ misc1arr, misc2arr, tech1arr, tech2arr, phil1arr, phil2arr, poli1arr, poli2arr, science1arr, science2arr ]);
      return Data_Foldable.foldl(Data_Foldable.foldableArray)(Prelude.flip(buyUpgrade))(Types.initialState)(upArray);
  };
  var cpsFromUpgrades = function (_103) {
      return Data_Lens_Getter.view(Lenses.cps(Data_Profunctor_Star.strongStar(Data_Const.functorConst)))(makeUpgradedState(_103));
  };
  var burstFromUpgrades = function (_104) {
      return Data_Lens_Getter.view(Lenses.burst(Data_Profunctor_Star.strongStar(Data_Const.functorConst)))(makeUpgradedState(_104));
  };
  exports["burstFromUpgrades"] = burstFromUpgrades;
  exports["cpsFromUpgrades"] = cpsFromUpgrades;
  exports["inflectionUpgradeMessage"] = inflectionUpgradeMessage;
  exports["isInflectionUpgrade"] = isInflectionUpgrade;
  exports["buyUpgrade"] = buyUpgrade;
  exports["upgradeDescription"] = upgradeDescription;
  exports["canBuyUpgrade"] = canBuyUpgrade;
  exports["nextUpgrade"] = nextUpgrade;
  exports["upgradeName"] = upgradeName;
  exports["upgradeCost"] = upgradeCost;;
 
})(PS["Upgrades"] = PS["Upgrades"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Data_Lens_Getter = PS["Data.Lens.Getter"];
  var Prelude = PS["Prelude"];
  var $$Math = PS["Math"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Monad_Eff_Console = PS["Control.Monad.Eff.Console"];
  var Browser_WebStorage = PS["Browser.WebStorage"];
  var Data_Bifunctor = PS["Data.Bifunctor"];
  var Data_Array = PS["Data.Array"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Either = PS["Data.Either"];
  var Data_Tuple = PS["Data.Tuple"];
  var Data_Traversable = PS["Data.Traversable"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Foreign = PS["Data.Foreign"];
  var Data_Foreign_Class = PS["Data.Foreign.Class"];
  var Data_Foreign_Lens = PS["Data.Foreign.Lens"];
  var Data_Lens = PS["Data.Lens"];
  var Data_Date = PS["Data.Date"];
  var Data_Time = PS["Data.Time"];
  var Util = PS["Util"];
  var Types = PS["Types"];
  var Lenses = PS["Lenses"];
  var Upgrades = PS["Upgrades"];
  var Data_Profunctor_Star = PS["Data.Profunctor.Star"];
  var Data_Const = PS["Data.Const"];     
  var storageKeys = Prelude.map(Prelude.functorArray)(Util.scramble)([ "totalClicks", "currentClicks", "age", "upgrades", "now" ]);
  var stateValueMaker = function ($$default) {
      return function (parser) {
          return function (key) {
              return function (arr) {
                  return Data_Maybe.maybe($$default(Types.initialState))(parser)(Data_Tuple.lookup(Data_Foldable.foldableArray)(Prelude.eqString)(Util.scramble(key))(arr));
              };
          };
      };
  };
  var stateTuples = function (state) {
      var makeTuple = function (__dict_Serialize_0) {
          return function (key) {
              return function (_14) {
                  return Data_Bifunctor.bimap(Data_Tuple.bifunctorTuple)(Util.scramble)(function (_15) {
                      return Util.scramble(Types.serialize(__dict_Serialize_0)(_15));
                  })(Data_Tuple.Tuple.create(key)(_14));
              };
          };
      };
      return [ makeTuple(Types.serializeClicks)("currentClicks")(state.currentClicks), makeTuple(Types.serializeClicks)("totalClicks")(state.totalClicks), makeTuple(Types.serializeUpgrades)("upgrades")(state.upgrades), makeTuple(Types.serializeAge)("age")(state.age), makeTuple(Types.serializeMilliseconds)("now")(state.now) ];
  };
  var saveSingleState = Data_Tuple.uncurry(Browser_WebStorage.setItem(Browser_WebStorage.storageLocalStorage)(Browser_WebStorage.localStorage));
  var saveState = function (_16) {
      return Data_Foldable.traverse_(Control_Monad_Eff.applicativeEff)(Data_Foldable.foldableArray)(saveSingleState)(stateTuples(_16));
  };
  var parseUpgrades = (function () {
      var ups = function (__dict_Contravariant_1) {
          return function (__dict_Applicative_2) {
              return Data_Foreign_Lens.getter(Data_Foreign_Class.read(Types.isForeignUpgrades))(__dict_Contravariant_1)(__dict_Applicative_2);
          };
      };
      return function (_17) {
          return Data_Maybe.maybe(Types.initialState.upgrades)(Prelude.id(Prelude.categoryFn))(Data_Foreign_Lens.get(function (__dict_Contravariant_3) {
              return function (__dict_Applicative_4) {
                  return function (_18) {
                      return Data_Foreign_Lens.json(__dict_Contravariant_3)(__dict_Applicative_4)(ups(__dict_Contravariant_3)(__dict_Applicative_4)(_18));
                  };
              };
          })(Util.unscramble(_17)));
      };
  })();
  var parseAge = (function () {
      var age = function (_7) {
          if (_7 === "Stone") {
              return new Data_Either.Right(Types.Stone.value);
          };
          if (_7 === "Bronze") {
              return new Data_Either.Right(Types.Bronze.value);
          };
          if (_7 === "Iron") {
              return new Data_Either.Right(Types.Iron.value);
          };
          if (_7 === "Classical") {
              return new Data_Either.Right(Types.Classical.value);
          };
          if (_7 === "Dark") {
              return new Data_Either.Right(Types.Dark.value);
          };
          if (_7 === "Medieval") {
              return new Data_Either.Right(Types.Medieval.value);
          };
          if (_7 === "Renaissance") {
              return new Data_Either.Right(Types.Renaissance.value);
          };
          if (_7 === "Imperial") {
              return new Data_Either.Right(Types.Imperial.value);
          };
          if (_7 === "Industrial") {
              return new Data_Either.Right(Types.Industrial.value);
          };
          if (_7 === "Nuclear") {
              return new Data_Either.Right(Types.Nuclear.value);
          };
          if (_7 === "Information") {
              return new Data_Either.Right(Types.Information.value);
          };
          if (_7 === "Global") {
              return new Data_Either.Right(Types.Global.value);
          };
          if (_7 === "Space") {
              return new Data_Either.Right(Types.Space.value);
          };
          if (_7 === "Solar") {
              return new Data_Either.Right(Types.Solar.value);
          };
          return new Data_Either.Left(Prelude.unit);
      };
      return function (_19) {
          return Data_Maybe.maybe(Types.initialState.age)(Prelude.id(Prelude.categoryFn))(Data_Foreign_Lens.get(function (__dict_Contravariant_5) {
              return function (__dict_Applicative_6) {
                  return Data_Foreign_Lens.getter(age)(__dict_Contravariant_5)(__dict_Applicative_6);
              };
          })(Util.unscramble(_19)));
      };
  })();
  var getNumber = function ($$default) {
      return function (_20) {
          return Data_Maybe.maybe($$default)(Prelude.id(Prelude.categoryFn))(Data_Foreign_Lens.get(function (__dict_Contravariant_7) {
              return function (__dict_Applicative_8) {
                  return function (_21) {
                      return Data_Foreign_Lens.json(__dict_Contravariant_7)(__dict_Applicative_8)(Data_Foreign_Lens.number(__dict_Contravariant_7)(__dict_Applicative_8)(_21));
                  };
              };
          })(Util.unscramble(_20)));
      };
  };
  var parseCurrentClicks = function (_22) {
      return Types.Clicks(getNumber(Data_Lens_Getter["^."](Types.initialState)(Lenses.currentClicksNumber(Data_Profunctor_Star.strongStar(Data_Const.functorConst))))(_22));
  };
  var parseNow = function (_23) {
      return Data_Time.Milliseconds(getNumber(0)(_23));
  };
  var parseTotalClicks = function (_24) {
      return Types.Clicks(getNumber(Data_Lens_Getter["^."](Types.initialState)(Lenses.totalClicksNumber(Data_Profunctor_Star.strongStar(Data_Const.functorConst))))(_24));
  };
  var calculateTimeDifferential = function (delta) {
      return function (_6) {
          var clickDebt = _6 * $$Math.abs(Util.secondsMS(delta));
          var f = function (t) {
              if (Util.minutesMS(t) < 5.0) {
                  return clickDebt;
              };
              if (Util.hoursMS(t) < 1.0) {
                  return clickDebt * 0.9;
              };
              if (Util.hoursMS(t) < 12.0) {
                  return clickDebt * 0.75;
              };
              if (Util.daysMS(t) < 1.0) {
                  return clickDebt * 0.6;
              };
              if (Prelude.otherwise) {
                  return clickDebt * 0.5;
              };
              throw new Error("Failed pattern match at Save line 127, column 1 - line 128, column 1: " + [ t.constructor.name ]);
          };
          return f(delta);
      };
  };
  var getSavedState = function __do() {
      var _5 = Prelude["<$>"](Control_Monad_Eff.functorEff)(function (_25) {
          return Data_Array.zip(storageKeys)(Data_Array.catMaybes(_25));
      })(Data_Traversable.sequence(Data_Traversable.traversableArray)(Control_Monad_Eff.applicativeEff)(Prelude["<$>"](Prelude.functorArray)(Browser_WebStorage.getItem(Browser_WebStorage.storageLocalStorage)(Browser_WebStorage.localStorage))(storageKeys)))();
      var _4 = Data_Date.nowEpochMilliseconds();
      return (function () {
          var _upgrades = stateValueMaker(Data_Lens_Getter.view(Lenses.upgrades(Data_Profunctor_Star.strongStar(Data_Const.functorConst))))(parseUpgrades)("upgrades")(_5);
          var _totalClicks = stateValueMaker(function (_1) {
              return _1.totalClicks;
          })(parseTotalClicks)("totalClicks")(_5);
          var _now = stateValueMaker(function (_3) {
              return _3.now;
          })(parseNow)("now")(_5);
          var _currentClicks = stateValueMaker(function (_0) {
              return _0.currentClicks;
          })(parseCurrentClicks)("currentClicks")(_5);
          var _cps = Upgrades.cpsFromUpgrades(_upgrades);
          var _cc = calculateTimeDifferential(Prelude["-"](Data_Time.ringMilliseconds)(_now)(_4))(_cps);
          var _burst = Upgrades.burstFromUpgrades(_upgrades);
          var _age = stateValueMaker(function (_2) {
              return _2.age;
          })(parseAge)("age")(_5);
          return Prelude.pure(Control_Monad_Eff.applicativeEff)({
              currentClicks: Prelude["+"](Types.semiringClicks)(_currentClicks)(_cc), 
              totalClicks: Prelude["+"](Types.semiringClicks)(_totalClicks)(_cc), 
              upgrades: _upgrades, 
              age: _age, 
              message: Types.welcomeMessage, 
              cps: _cps, 
              burst: _burst, 
              now: _4, 
              view: Types.UpgradesTab.value
          });
      })()();
  };
  exports["calculateTimeDifferential"] = calculateTimeDifferential;
  exports["saveState"] = saveState;
  exports["getSavedState"] = getSavedState;;
 
})(PS["Save"] = PS["Save"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Types = PS["Types"];
  var Browser_WebStorage = PS["Browser.WebStorage"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];     
  var resetState = function (_0) {
      return Types.initialState;
  };
  var resetSave = Browser_WebStorage.clear(Browser_WebStorage.storageLocalStorage)(Browser_WebStorage.localStorage);
  exports["resetSave"] = resetSave;
  exports["resetState"] = resetState;;
 
})(PS["Reset"] = PS["Reset"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Data_Lens_Getter = PS["Data.Lens.Getter"];
  var Prelude = PS["Prelude"];
  var Types = PS["Types"];
  var $$Math = PS["Math"];
  var Lenses = PS["Lenses"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Int = PS["Data.Int"];
  var Data_Lens = PS["Data.Lens"];
  var Data_Profunctor_Star = PS["Data.Profunctor.Star"];
  var Data_Const = PS["Data.Const"];     
  var sumUpgrades = function (u) {
      var g = function (acc) {
          return function (uplens) {
              return acc + Data_Lens_Getter["^."](u)(function (_1) {
                  return uplens(Lenses.viewLevel(_1));
              }) | 0;
          };
      };
      var $$int = Data_Foldable.foldl(Data_Foldable.foldableArray)(g)(0)([ Lenses.misc1(Data_Profunctor_Star.strongStar(Data_Const.functorConst)), Lenses.misc2(Data_Profunctor_Star.strongStar(Data_Const.functorConst)), Lenses.tech1(Data_Profunctor_Star.strongStar(Data_Const.functorConst)), Lenses.tech2(Data_Profunctor_Star.strongStar(Data_Const.functorConst)), Lenses.phil1(Data_Profunctor_Star.strongStar(Data_Const.functorConst)), Lenses.phil2(Data_Profunctor_Star.strongStar(Data_Const.functorConst)), Lenses.poli1(Data_Profunctor_Star.strongStar(Data_Const.functorConst)), Lenses.poli2(Data_Profunctor_Star.strongStar(Data_Const.functorConst)), Lenses.science1(Data_Profunctor_Star.strongStar(Data_Const.functorConst)), Lenses.science2(Data_Profunctor_Star.strongStar(Data_Const.functorConst)) ]);
      return Data_Int.toNumber($$int);
  };
  var populationAtStone = function (state) {
      var c = sumUpgrades(state.upgrades);
      var a = $$Math.log($$Math.log(1.0 + Data_Lens_Getter["^."](state)(Lenses.totalClicksNumber(Data_Profunctor_Star.strongStar(Data_Const.functorConst)))) + 1.0);
      return $$Math.floor(2.0 * a + c + 2.0);
  };
  var populationAfterStone = function (state) {
      return 10.0;
  };
  var population = function (state) {
      if (state.age instanceof Types.Stone) {
          return populationAtStone(state);
      };
      return populationAfterStone(state);
  };
  exports["population"] = population;;
 
})(PS["Population"] = PS["Population"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Halogen_Component = PS["Halogen.Component"];
  var Halogen_HTML_Elements_Indexed = PS["Halogen.HTML.Elements.Indexed"];
  var Halogen_HTML = PS["Halogen.HTML"];
  var Halogen_HTML_Elements = PS["Halogen.HTML.Elements"];
  var Halogen_HTML_Events = PS["Halogen.HTML.Events"];
  var Data_Lens_Getter = PS["Data.Lens.Getter"];
  var Halogen_Query = PS["Halogen.Query"];
  var Data_Lens_Setter = PS["Data.Lens.Setter"];
  var Halogen_Driver = PS["Halogen.Driver"];
  var Prelude = PS["Prelude"];
  var Types = PS["Types"];
  var Lenses = PS["Lenses"];
  var Save = PS["Save"];
  var Upgrades = PS["Upgrades"];
  var Reset = PS["Reset"];
  var Disaster = PS["Disaster"];
  var Age = PS["Age"];
  var Util = PS["Util"];
  var Population = PS["Population"];
  var Data_Lens = PS["Data.Lens"];
  var Data_Tuple = PS["Data.Tuple"];
  var Data_String = PS["Data.String"];
  var Data_Functor = PS["Data.Functor"];
  var Data_Date = PS["Data.Date"];
  var Data_Void = PS["Data.Void"];
  var Control_Monad_Aff = PS["Control.Monad.Aff"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Monad_Eff_Class = PS["Control.Monad.Eff.Class"];
  var Control_Monad_Eff_Exception = PS["Control.Monad.Eff.Exception"];
  var Control_Monad_Eff_Console = PS["Control.Monad.Eff.Console"];
  var Halogen = PS["Halogen"];
  var Halogen_Util = PS["Halogen.Util"];
  var Halogen_HTML_Core = PS["Halogen.HTML.Core"];
  var Halogen_HTML_Indexed = PS["Halogen.HTML.Indexed"];
  var Halogen_HTML_Events_Indexed = PS["Halogen.HTML.Events.Indexed"];
  var Halogen_HTML_Properties_Indexed = PS["Halogen.HTML.Properties.Indexed"];
  var Data_Profunctor_Star = PS["Data.Profunctor.Star"];
  var Data_Const = PS["Data.Const"];
  var Control_Monad_Free = PS["Control.Monad.Free"];
  var Data_Profunctor_Strong = PS["Data.Profunctor.Strong"];
  var Data_Time = PS["Data.Time"];
  var Control_Monad_Aff_Class = PS["Control.Monad.Aff.Class"];     
  var upgradeProps = function (uplens) {
      return function (state) {
          var hoverText = function (state_1) {
              return function (uplens_1) {
                  return [ Halogen_HTML_Properties_Indexed.title(Upgrades.upgradeDescription(Data_Lens_Getter["^."](state_1)(function (_35) {
                      return Lenses.upgrades(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(uplens_1(_35));
                  }))(state_1.age)) ];
              };
          };
          var clickAction = Halogen_HTML_Events_Indexed.onMouseDown(Halogen_HTML_Events.input_(Types.Buy.create(Upgrades.nextUpgrade(Data_Lens_Getter["^."](state)(function (_36) {
              return Lenses.upgrades(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(uplens(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(_36));
          })))));
          return Prelude["++"](Prelude.semigroupArray)(hoverText(state)(uplens(Data_Profunctor_Star.strongStar(Data_Const.functorConst))))((function () {
              var _11 = Upgrades.canBuyUpgrade(state)(function (__dict_Strong_0) {
                  return uplens(__dict_Strong_0);
              });
              if (_11) {
                  return [ clickAction, Util.mkClass("upgrade") ];
              };
              if (!_11) {
                  return [ Util.mkClass("upgrade disabled") ];
              };
              throw new Error("Failed pattern match at Main line 230, column 1 - line 231, column 1: " + [ _11.constructor.name ]);
          })());
      };
  };
  var upgradeButton = function (uplens) {
      return function (state) {
          return Halogen_HTML_Elements_Indexed.div(upgradeProps(function (__dict_Strong_1) {
              return uplens(__dict_Strong_1);
          })(state))([ Halogen_HTML_Elements_Indexed.div([ Util.mkClass("name") ])([ Halogen_HTML.text(Upgrades.upgradeName(Data_Lens_Getter["^."](state)(function (_37) {
              return Lenses.upgrades(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(uplens(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(_37));
          }))(state.age)), Halogen_HTML_Elements_Indexed.span([ Util.mkClass("level") ])([ Halogen_HTML.text(" " + Prelude.show(Prelude.showInt)(Data_Lens_Getter["^."](state)(function (_38) {
              return Lenses.upgrades(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(uplens(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(Lenses.viewLevel(_38)));
          }))) ]) ]), Halogen_HTML_Elements_Indexed.div([ Util.mkClass("cost") ])([ Halogen_HTML.text(Types.prettify(Types.prettyClicks)(Upgrades.upgradeCost(Upgrades.nextUpgrade(Data_Lens_Getter["^."](state)(function (_39) {
              return Lenses.upgrades(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(uplens(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(_39));
          }))))) ]) ]);
      };
  };
  var upgradesComponent = function (state) {
      return Halogen_HTML_Elements.div_([ Halogen_HTML_Elements_Indexed.div([ Util.mkClass("upgrades") ])([ upgradeButton(function (__dict_Strong_2) {
          return Lenses.misc1(__dict_Strong_2);
      })(state), upgradeButton(function (__dict_Strong_3) {
          return Lenses.misc2(__dict_Strong_3);
      })(state), upgradeButton(function (__dict_Strong_4) {
          return Lenses.tech1(__dict_Strong_4);
      })(state), upgradeButton(function (__dict_Strong_5) {
          return Lenses.tech2(__dict_Strong_5);
      })(state), upgradeButton(function (__dict_Strong_6) {
          return Lenses.phil1(__dict_Strong_6);
      })(state), upgradeButton(function (__dict_Strong_7) {
          return Lenses.phil2(__dict_Strong_7);
      })(state), upgradeButton(function (__dict_Strong_8) {
          return Lenses.poli1(__dict_Strong_8);
      })(state), upgradeButton(function (__dict_Strong_9) {
          return Lenses.poli2(__dict_Strong_9);
      })(state), upgradeButton(function (__dict_Strong_10) {
          return Lenses.science1(__dict_Strong_10);
      })(state), upgradeButton(function (__dict_Strong_11) {
          return Lenses.science2(__dict_Strong_11);
      })(state) ]) ]);
  };
  var techTreeComponent = function (state) {
      return Halogen_HTML_Elements.div_([ Halogen_HTML_Elements_Indexed.div([ Util.mkClass("techTree") ])([ Halogen_HTML.text("") ]) ]);
  };
  var populationComponent = function (state) {
      return Halogen_HTML_Elements.div_([ Halogen_HTML_Elements_Indexed.div([ Util.mkClass("population") ])([ Halogen_HTML.text("") ]) ]);
  };
  var heroesComponent = function (state) {
      return Halogen_HTML_Elements.div_([ Halogen_HTML_Elements_Indexed.div([ Util.mkClass("heroes") ])([ Halogen_HTML.text("") ]) ]);
  };
  var $$eval = function (_9) {
      if (_9 instanceof Types.Click) {
          return Data_Functor["<$"](Control_Monad_Free.freeFunctor)(_9.value0)(Halogen_Query.modify(function (state) {
              return Data_Lens_Setter["+~"](Prelude.semiringNumber)(Lenses.currentClicksNumber(Data_Profunctor_Strong.strongFn))(Data_Lens_Getter["^."](state)(Lenses.burstNumber(Data_Profunctor_Star.strongStar(Data_Const.functorConst))))(Data_Lens_Setter["+~"](Prelude.semiringNumber)(Lenses.totalClicksNumber(Data_Profunctor_Strong.strongFn))(Data_Lens_Getter["^."](state)(Lenses.burstNumber(Data_Profunctor_Star.strongStar(Data_Const.functorConst))))(state));
          }));
      };
      if (_9 instanceof Types.Autoclick) {
          return Data_Functor["<$"](Control_Monad_Free.freeFunctor)(_9.value0)(Prelude.bind(Control_Monad_Free.freeBind)(Halogen_Query.gets(function (_0) {
              return _0.now;
          }))(function (_4) {
              return Prelude.bind(Control_Monad_Free.freeBind)(Halogen_Query.gets(function (_1) {
                  return _1.cps;
              }))(function (_3) {
                  return Prelude.bind(Control_Monad_Free.freeBind)(Halogen_Query["liftEff'"](Control_Monad_Aff.monadEffAff)(Data_Date.nowEpochMilliseconds))(function (_2) {
                      var delta = Prelude["-"](Data_Time.ringMilliseconds)(_2)(_4);
                      var summand = Save.calculateTimeDifferential(delta)(_3);
                      return Halogen_Query.modify(function (_40) {
                          return Data_Lens_Setter["+~"](Types.semiringClicks)(Lenses.currentClicks(Data_Profunctor_Strong.strongFn))(summand)(Data_Lens_Setter["+~"](Types.semiringClicks)(Lenses.totalClicks(Data_Profunctor_Strong.strongFn))(summand)(Data_Lens_Setter[".~"](Lenses.now(Data_Profunctor_Strong.strongFn))(_2)(_40)));
                      });
                  });
              });
          }));
      };
      if (_9 instanceof Types.Reset) {
          return Data_Functor["<$"](Control_Monad_Free.freeFunctor)(_9.value0)(Prelude.bind(Control_Monad_Free.freeBind)(Halogen_Query.modify(Reset.resetState))(function () {
              return Halogen_Query["liftEff'"](Control_Monad_Aff.monadEffAff)(Reset.resetSave);
          }));
      };
      if (_9 instanceof Types.Save) {
          return Data_Functor["<$"](Control_Monad_Free.freeFunctor)(_9.value0)(Prelude.bind(Control_Monad_Free.freeBind)(Halogen_Query.get)(function (_5) {
              return Prelude.bind(Control_Monad_Free.freeBind)(Halogen_Query["liftEff'"](Control_Monad_Aff.monadEffAff)(Control_Monad_Eff_Console.log("Saving game ... ")))(function () {
                  return Halogen_Query["liftEff'"](Control_Monad_Aff.monadEffAff)(Save.saveState(_5));
              });
          }));
      };
      if (_9 instanceof Types.Buy) {
          return Data_Functor["<$"](Control_Monad_Free.freeFunctor)(_9.value1)(Prelude.bind(Control_Monad_Free.freeBind)(Halogen_Query.modify(Data_Lens_Setter.set(Lenses.message(Data_Profunctor_Strong.strongFn))("")))(function () {
              return Prelude.bind(Control_Monad_Free.freeBind)(Halogen_Query["liftAff'"](Control_Monad_Aff_Class.monadAffAff)(Control_Monad_Aff.later(Prelude.pure(Control_Monad_Aff.applicativeAff)(Prelude.unit))))(function () {
                  return Prelude.bind(Control_Monad_Free.freeBind)(Halogen_Query.modify(Upgrades.buyUpgrade(_9.value0)))(function () {
                      var _21 = Upgrades.isInflectionUpgrade(_9.value0);
                      if (_21) {
                          return Halogen_Query.modify(function (state) {
                              return Data_Lens_Setter.set(Lenses.message(Data_Profunctor_Strong.strongFn))(Upgrades.inflectionUpgradeMessage(_9.value0)(state.age))(state);
                          });
                      };
                      if (!_21) {
                          return Halogen_Query.modify(function (state) {
                              return Data_Lens_Setter.set(Lenses.message(Data_Profunctor_Strong.strongFn))("Upgraded " + Upgrades.upgradeName(_9.value0)(state.age))(state);
                          });
                      };
                      throw new Error("Failed pattern match at Main line 241, column 1 - line 242, column 1: " + [ _21.constructor.name ]);
                  });
              });
          }));
      };
      if (_9 instanceof Types.Suffer) {
          return Data_Functor["<$"](Control_Monad_Free.freeFunctor)(_9.value1)(Halogen_Query.modify(Disaster.suffer(_9.value0)));
      };
      if (_9 instanceof Types.View) {
          return Data_Functor["<$"](Control_Monad_Free.freeFunctor)(_9.value1)(Halogen_Query.modify(Data_Lens_Setter.set(Lenses.tab(Data_Profunctor_Strong.strongFn))(_9.value0)));
      };
      if (_9 instanceof Types.Advance) {
          return Data_Functor["<$"](Control_Monad_Free.freeFunctor)(_9.value0)(Prelude.bind(Control_Monad_Free.freeBind)(Halogen_Query.get)(function (_6) {
              return Halogen_Query.modify(Data_Lens_Setter.set(Lenses.age(Data_Profunctor_Strong.strongFn))(Age.nextAge(_6.age)));
          }));
      };
      throw new Error("Failed pattern match at Main line 241, column 1 - line 242, column 1: " + [ _9.constructor.name ]);
  };
  var divider = Halogen_HTML_Elements_Indexed.span([ Util.mkClass("divide") ])([ Halogen_HTML.text(" | ") ]);
  var unlockViewTabs = function (state) {
      var tabByAge = function (_10) {
          if (_10 instanceof Types.Stone) {
              return [  ];
          };
          if (_10 instanceof Types.Bronze) {
              return [ divider, Halogen_HTML_Elements_Indexed.span([ Util.mkClass("tab") ])([ Halogen_HTML.text(Prelude.show(Types.showView)(Types.PopulationTab.value)) ]) ];
          };
          return Prelude["++"](Prelude.semigroupArray)(tabByAge(Types.Bronze.value))([ divider, Halogen_HTML_Elements_Indexed.span([ Util.mkClass("tab") ])([ Halogen_HTML.text(Prelude.show(Types.showView)(Types.TechTreeTab.value)) ]) ]);
      };
      return Halogen_HTML_Elements_Indexed.h3([ Util.mkClass("title") ])(Prelude["++"](Prelude.semigroupArray)([ Halogen_HTML_Elements_Indexed.span([ Util.mkClass("tab"), Halogen_HTML_Events_Indexed.onMouseDown(Halogen_HTML_Events.input_(Types.View.create(Types.UpgradesTab.value))) ])([ Halogen_HTML.text(Prelude.show(Types.showView)(Types.UpgradesTab.value)) ]), divider, Halogen_HTML_Elements_Indexed.span([ Util.mkClass("tab"), Halogen_HTML_Events_Indexed.onMouseDown(Halogen_HTML_Events.input_(Types.View.create(Types.AdvanceTab.value))) ])([ Halogen_HTML.text(Prelude.show(Types.showView)(Types.AdvanceTab.value)) ]) ])(tabByAge(state.age)));
  };
  var advanceComponent = function (state) {
      return Halogen_HTML_Elements.div_([ Halogen_HTML_Elements_Indexed.div([ Util.mkClass("advance") ])([ Halogen_HTML_Elements_Indexed.div([ Halogen_HTML_Events_Indexed.onMouseDown(Halogen_HTML_Events.input_(Types.Advance.create)) ])([ Halogen_HTML.text("Advance") ]) ]) ]);
  };
  var viewTabs = function (state) {
      if (state.view instanceof Types.UpgradesTab) {
          return upgradesComponent(state);
      };
      if (state.view instanceof Types.AdvanceTab) {
          return advanceComponent(state);
      };
      if (state.view instanceof Types.PopulationTab) {
          return populationComponent(state);
      };
      if (state.view instanceof Types.HeroesTab) {
          return heroesComponent(state);
      };
      if (state.view instanceof Types.TechTreeTab) {
          return techTreeComponent(state);
      };
      throw new Error("Failed pattern match at Main line 159, column 1 - line 160, column 1: " + [ state.view.constructor.name ]);
  };
  var render = function (state) {
      var top = Halogen_HTML_Elements_Indexed.h1([ Halogen_HTML_Properties_Indexed.id_("title") ])([ Halogen_HTML.text("clicker builder: the "), Halogen_HTML_Elements_Indexed.span([ Util.mkClass(Prelude.show(Types.ageShow)(state.age)) ])([ Halogen_HTML.text(Prelude.show(Types.ageShow)(state.age)) ]), Halogen_HTML.text(" Age.") ]);
      var side = Halogen_HTML_Elements_Indexed.div([ Halogen_HTML_Properties_Indexed.id_("side") ])([ Halogen_HTML_Elements.div_([ Halogen_HTML.text("Current clicks:"), Halogen_HTML_Elements.br_, Halogen_HTML_Elements_Indexed.span([ Util.mkClass("current-clicks bold") ])([ Halogen_HTML.text(Types.prettify(Types.prettyClicks)(state.currentClicks)) ]), Halogen_HTML_Elements.br_, Halogen_HTML.text("Total clicks:"), Halogen_HTML_Elements.br_, Halogen_HTML.text(Types.prettify(Types.prettyClicks)(state.totalClicks)), Halogen_HTML_Elements.br_, Halogen_HTML.text("My click power:"), Halogen_HTML_Elements.br_, Halogen_HTML.text(Types.prettify(Types.prettyClicks)(state.burst)), Halogen_HTML_Elements.br_, Halogen_HTML.text("Tribal click power:"), Halogen_HTML_Elements.br_, Halogen_HTML.text(Types.prettify(Types.prettyClicksPerSecond)(state.cps)), Halogen_HTML_Elements.br_, Halogen_HTML.text("Population:"), Halogen_HTML_Elements.br_, Halogen_HTML.text(Types.prettify(Types.prettyPopulation)(Population.population(state))) ]), Halogen_HTML_Elements.br_, Halogen_HTML_Elements_Indexed.div([ Halogen_HTML_Properties_Indexed.id_("clicker-wrapper") ])([ Halogen_HTML_Elements_Indexed.div([ Halogen_HTML_Events_Indexed.onMouseDown(Halogen_HTML_Events.input_(Types.Click.create)), Halogen_HTML_Properties_Indexed.id_("the-button") ])([ Halogen_HTML_Elements_Indexed.a([ Halogen_HTML_Properties_Indexed.href("#") ])([ Halogen_HTML_Elements_Indexed.i([ Util.mkClass("fa fa-hand-pointer-o") ])([  ]) ]) ]) ]), Halogen_HTML_Elements.br_, Halogen_HTML_Elements_Indexed.span([ Halogen_HTML_Events_Indexed.onMouseDown(Halogen_HTML_Events.input_(Types.Save.create)), Util.mkClass("button") ])([ Halogen_HTML.text("Save") ]), Halogen_HTML.text(" | "), Halogen_HTML_Elements_Indexed.span([ Halogen_HTML_Events_Indexed.onMouseDown(Halogen_HTML_Events.input_(Types.Reset.create)), Util.mkClass("button") ])([ Halogen_HTML.text("Reset") ]) ]);
      var main$prime = Halogen_HTML_Elements_Indexed.div([ Halogen_HTML_Properties_Indexed.id_("main") ])([ Halogen_HTML_Elements_Indexed.div([ Halogen_HTML_Properties_Indexed.id_("view") ])([ unlockViewTabs(state), viewTabs(state) ]), (function () {
          var _32 = Data_String["null"](state.message);
          if (_32) {
              return Halogen_HTML_Elements.div_([  ]);
          };
          if (!_32) {
              return Halogen_HTML_Elements_Indexed.div([ Util.mkClass("fade messages") ])([ Halogen_HTML.text(state.message) ]);
          };
          throw new Error("Failed pattern match at Main line 42, column 1 - line 43, column 1: " + [ _32.constructor.name ]);
      })() ]);
      var bottom = Halogen_HTML_Elements_Indexed.div([ Halogen_HTML_Properties_Indexed.id_("bottom") ])([ Halogen_HTML_Elements.h3_([ Halogen_HTML.text("About") ]), Util.renderParagraphs(Age.ageDescription(state.age)), Halogen_HTML_Elements.h3_([ Halogen_HTML.text("Changelog") ]), Util.renderParagraphs([ "Bronze age implemented, population, disasters, graphics" ]), Halogen_HTML_Elements.h3_([ Halogen_HTML.text("Upcoming") ]), Halogen_HTML_Elements.p_([ Halogen_HTML.text("Iron Age, heroes.") ]), Halogen_HTML_Elements.h3_([ Halogen_HTML.text("Credits") ]), Util.renderParagraphs([ "Font: Silkscreen by Jason Kottke.", "Icons: fontawesome by Dave Gandy.", "Ideas and feedback: Himrin." ]) ]);
      return Halogen_HTML_Elements_Indexed.div([ Halogen_HTML_Properties_Indexed.id_("body"), Util.mkClass(Prelude.show(Types.ageShow)(state.age)) ])([ Halogen_HTML_Elements_Indexed.a([ Halogen_HTML_Properties_Indexed.href("https://github.com/thimoteus/clicker-builder"), Halogen_HTML_Properties_Indexed.id_("fork-me") ])([ Halogen_HTML_Elements_Indexed.img([ Halogen_HTML_Properties_Indexed.src("https://camo.githubusercontent.com/365986a132ccd6a44c23a9169022c0b5c890c387/68747470733a2f2f73332e616d617a6f6e6177732e636f6d2f6769746875622f726962626f6e732f666f726b6d655f72696768745f7265645f6161303030302e706e67"), Halogen_HTML_Properties_Indexed.alt("Fork me on Github") ]) ]), Halogen_HTML_Elements_Indexed.div([ Halogen_HTML_Properties_Indexed.id_("container") ])([ top, side, main$prime, bottom ]) ]);
  };
  var $$interface = Halogen_Component.component(render)($$eval);
  var main = Control_Monad_Aff.runAff(Control_Monad_Eff_Exception.throwException)(Prelude["const"](Prelude.pure(Control_Monad_Eff.applicativeEff)(Prelude.unit)))(Prelude.bind(Control_Monad_Aff.bindAff)(Control_Monad_Eff_Class.liftEff(Control_Monad_Aff.monadEffAff)(Save.getSavedState))(function (_8) {
      return Prelude.bind(Control_Monad_Aff.bindAff)(Halogen_Driver.runUI($$interface)(_8))(function (_7) {
          return Prelude.bind(Control_Monad_Aff.bindAff)(Halogen_Util.onLoad(Control_Monad_Aff.monadEffAff)(Halogen_Util.appendToBody(Control_Monad_Eff_Class.monadEffEff)(_7.node)))(function () {
              return Util.schedule([ Data_Tuple.Tuple.create(100)(_7.driver(Halogen_Query.action(Types.Autoclick.create))), Data_Tuple.Tuple.create(15000)(_7.driver(Halogen_Query.action(Types.Save.create))) ]);
          });
      });
  }));
  exports["main"] = main;
  exports["eval"] = $$eval;
  exports["upgradeProps"] = upgradeProps;
  exports["upgradeButton"] = upgradeButton;
  exports["upgradesComponent"] = upgradesComponent;
  exports["advanceComponent"] = advanceComponent;
  exports["techTreeComponent"] = techTreeComponent;
  exports["heroesComponent"] = heroesComponent;
  exports["populationComponent"] = populationComponent;
  exports["viewTabs"] = viewTabs;
  exports["divider"] = divider;
  exports["unlockViewTabs"] = unlockViewTabs;
  exports["render"] = render;
  exports["interface"] = $$interface;;
 
})(PS["Main"] = PS["Main"] || {});

PS["Main"].main();

}).call(this,require("buffer").Buffer)
},{"buffer":3,"virtual-dom/create-element":8,"virtual-dom/diff":9,"virtual-dom/patch":10,"virtual-dom/virtual-hyperscript/hooks/soft-set-hook":17,"virtual-dom/vnode/vnode":25,"virtual-dom/vnode/vtext":27}]},{},[31]);
