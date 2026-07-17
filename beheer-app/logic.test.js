const test = require('node:test');
const assert = require('node:assert/strict');
const { getVersion } = require('./logic.js');

test('getVersion returns the current app version', () => {
  assert.equal(getVersion(), '0.1.0');
});
