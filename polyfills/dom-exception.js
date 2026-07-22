// Polyfill DOMException for Hermes (SDK 54 Hermes doesn't have it natively)
if (typeof global.DOMException === 'undefined') {
  function DOMException(message, name) {
    this.message = String(message);
    this.name = String(name || 'Error');
    var err = new Error(String(message));
    this.stack = err.stack;
  }
  DOMException.prototype = Object.create(Error.prototype);
  DOMException.prototype.constructor = DOMException;
  global.DOMException = DOMException;
}
