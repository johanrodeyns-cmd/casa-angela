const test = require('node:test');
const assert = require('node:assert/strict');
const { getVersion, isAllowedEmail, buildMonthGrid, computeDerivedPrice, computeDisplayPrice } = require('./logic.js');

test('getVersion returns the current app version', () => {
  assert.equal(getVersion(), '0.9.0');
});

test('isAllowedEmail returns true for an email in the whitelist', () => {
  assert.equal(isAllowedEmail('johan.rodeyns@gmail.com', ['johan.rodeyns@gmail.com', 'tinbogaerts@gmail.com']), true);
});

test('isAllowedEmail returns false for an email not in the whitelist', () => {
  assert.equal(isAllowedEmail('onbekend@gmail.com', ['johan.rodeyns@gmail.com', 'tinbogaerts@gmail.com']), false);
});

test('isAllowedEmail compares case-insensitively', () => {
  assert.equal(isAllowedEmail('Johan.Rodeyns@Gmail.com', ['johan.rodeyns@gmail.com']), true);
});

test('buildMonthGrid starts the first week on Monday with no leading padding when the month starts on a Monday', () => {
  const grid = buildMonthGrid(2024, 1); // 2024-01-01 is a Monday
  assert.deepEqual(grid[0], ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05', '2024-01-06', '2024-01-07']);
});

test('buildMonthGrid pads leading days with null when the month does not start on a Monday', () => {
  const grid = buildMonthGrid(2024, 2); // 2024-02-01 is a Thursday
  assert.deepEqual(grid[0], [null, null, null, '2024-02-01', '2024-02-02', '2024-02-03', '2024-02-04']);
});

test('buildMonthGrid pads trailing days with null in the last week', () => {
  const grid = buildMonthGrid(2024, 1); // January has 31 days, last week is 29/30/31 + padding
  const lastWeek = grid[grid.length - 1];
  assert.deepEqual(lastWeek, ['2024-01-29', '2024-01-30', '2024-01-31', null, null, null, null]);
});

test('buildMonthGrid always returns weeks of exactly 7 cells', () => {
  const grid = buildMonthGrid(2024, 2);
  grid.forEach((week) => assert.equal(week.length, 7));
});

test('buildMonthGrid contains exactly one cell per day of the month, no duplicates or gaps', () => {
  const grid = buildMonthGrid(2024, 2); // leap year, 29 days
  const days = grid.flat().filter((cell) => cell !== null);
  assert.equal(days.length, 29);
  assert.equal(days[0], '2024-02-01');
  assert.equal(days[days.length - 1], '2024-02-29');
});

test('computeDerivedPrice multiplies by the factor and adds the offset', () => {
  assert.equal(computeDerivedPrice(100, { factor: 0.9, offset: -5 }), 85);
});

test('computeDerivedPrice returns null when the Airbnb price is null', () => {
  assert.equal(computeDerivedPrice(null, { factor: 1, offset: 10 }), null);
});

test('computeDerivedPrice returns null when the Airbnb price is undefined', () => {
  assert.equal(computeDerivedPrice(undefined, { factor: 1, offset: 10 }), null);
});

test('computeDerivedPrice handles a factor of 0', () => {
  assert.equal(computeDerivedPrice(100, { factor: 0, offset: 20 }), 20);
});

test('computeDerivedPrice handles a negative offset', () => {
  assert.equal(computeDerivedPrice(10, { factor: 1, offset: -50 }), -40);
});

const SAMPLE_FORMULAS = {
  booking: { factor: 0.9, offset: -5 },
  direct: { factor: 0.95, offset: 0 },
  friends: { factor: 0.8, offset: -10 },
};

test('computeDisplayPrice returns the raw Airbnb price in airbnb mode', () => {
  assert.equal(computeDisplayPrice('airbnb', 100, SAMPLE_FORMULAS), 100);
});

test('computeDisplayPrice returns the derived price for the booking mode', () => {
  assert.equal(computeDisplayPrice('booking', 100, SAMPLE_FORMULAS), 85);
});

test('computeDisplayPrice returns the derived price for the direct mode', () => {
  assert.equal(computeDisplayPrice('direct', 100, SAMPLE_FORMULAS), 95);
});

test('computeDisplayPrice returns the derived price for the friends mode', () => {
  assert.equal(computeDisplayPrice('friends', 100, SAMPLE_FORMULAS), 70);
});

test('computeDisplayPrice returns null when the Airbnb price is null, regardless of mode', () => {
  assert.equal(computeDisplayPrice('booking', null, SAMPLE_FORMULAS), null);
  assert.equal(computeDisplayPrice('airbnb', null, SAMPLE_FORMULAS), null);
});
