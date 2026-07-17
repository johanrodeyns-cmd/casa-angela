const test = require('node:test');
const assert = require('node:assert/strict');
const { getVersion, isAllowedEmail, buildMonthGrid, computeDerivedPrice, computeDisplayPrice, getDateRange, getPreviousYearDate, nightsBetween, validateBooking, overlapsExistingBooking } = require('./logic.js');

test('getVersion returns the current app version', () => {
  assert.equal(getVersion(), '0.13.0');
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

test('getDateRange returns every date between start and end, inclusive', () => {
  assert.deepEqual(
    getDateRange('2026-07-05', '2026-07-08'),
    ['2026-07-05', '2026-07-06', '2026-07-07', '2026-07-08']
  );
});

test('getDateRange returns a single date when start equals end', () => {
  assert.deepEqual(getDateRange('2026-07-05', '2026-07-05'), ['2026-07-05']);
});

test('getDateRange swaps start and end when given in reverse order', () => {
  assert.deepEqual(
    getDateRange('2026-07-08', '2026-07-05'),
    ['2026-07-05', '2026-07-06', '2026-07-07', '2026-07-08']
  );
});

test('getDateRange handles ranges spanning a month boundary', () => {
  assert.deepEqual(
    getDateRange('2026-07-30', '2026-08-02'),
    ['2026-07-30', '2026-07-31', '2026-08-01', '2026-08-02']
  );
});

test('getPreviousYearDate subtracts exactly one year, keeping month and day', () => {
  assert.equal(getPreviousYearDate('2026-07-15'), '2025-07-15');
});

test('getPreviousYearDate works at the start and end of the year', () => {
  assert.equal(getPreviousYearDate('2026-01-01'), '2025-01-01');
  assert.equal(getPreviousYearDate('2026-12-31'), '2025-12-31');
});

test('getPreviousYearDate handles a leap day by keeping the same month/day string', () => {
  assert.equal(getPreviousYearDate('2024-02-29'), '2023-02-29');
});

test('nightsBetween counts the number of nights between two dates', () => {
  assert.equal(nightsBetween('2026-07-10', '2026-07-14'), 4);
});

test('nightsBetween returns 1 for a single-night stay', () => {
  assert.equal(nightsBetween('2026-07-10', '2026-07-11'), 1);
});

test('nightsBetween handles a range spanning a month boundary', () => {
  assert.equal(nightsBetween('2026-07-30', '2026-08-02'), 3);
});

const VALID_BOOKING = {
  dateFrom: '2026-07-10',
  dateTo: '2026-07-14',
  name: 'Jan Janssens',
  language: 'NL',
  phone: '0470123456',
  adultsCount: 2,
  childrenCount: 0,
  remark: '',
  platform: 'airbnb',
  price: 480,
};

test('validateBooking accepts a fully filled-in booking', () => {
  const result = validateBooking(VALID_BOOKING);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, {});
});

test('validateBooking requires dateFrom', () => {
  const result = validateBooking({ ...VALID_BOOKING, dateFrom: '' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.dateFrom);
});

test('validateBooking requires dateTo', () => {
  const result = validateBooking({ ...VALID_BOOKING, dateTo: '' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.dateTo);
});

test('validateBooking rejects a dateTo before dateFrom', () => {
  const result = validateBooking({ ...VALID_BOOKING, dateFrom: '2026-07-14', dateTo: '2026-07-10' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.dateTo);
});

test('validateBooking rejects a dateTo equal to dateFrom (zero nights)', () => {
  const result = validateBooking({ ...VALID_BOOKING, dateTo: VALID_BOOKING.dateFrom });
  assert.equal(result.valid, false);
  assert.ok(result.errors.dateTo);
});

test('validateBooking requires a non-blank name', () => {
  assert.equal(validateBooking({ ...VALID_BOOKING, name: '' }).valid, false);
  assert.equal(validateBooking({ ...VALID_BOOKING, name: '   ' }).valid, false);
});

test('validateBooking requires a platform', () => {
  const result = validateBooking({ ...VALID_BOOKING, platform: '' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.platform);
});

const EXISTING_BOOKINGS = [
  { id: 'a', dateFrom: '2026-07-10', dateTo: '2026-07-14', name: 'Jan' },
];

test('overlapsExistingBooking returns an empty array when there is no overlap', () => {
  const result = overlapsExistingBooking({ dateFrom: '2026-07-15', dateTo: '2026-07-18' }, EXISTING_BOOKINGS, []);
  assert.deepEqual(result, []);
});

test('overlapsExistingBooking detects a new booking fully inside an existing one', () => {
  const result = overlapsExistingBooking({ dateFrom: '2026-07-11', dateTo: '2026-07-12' }, EXISTING_BOOKINGS, []);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'a');
});

test('overlapsExistingBooking detects a partial overlap', () => {
  const result = overlapsExistingBooking({ dateFrom: '2026-07-08', dateTo: '2026-07-11' }, EXISTING_BOOKINGS, []);
  assert.equal(result.length, 1);
});

test('overlapsExistingBooking treats back-to-back bookings as non-overlapping (checkout day = checkin day)', () => {
  const beforeResult = overlapsExistingBooking({ dateFrom: '2026-07-06', dateTo: '2026-07-10' }, EXISTING_BOOKINGS, []);
  const afterResult = overlapsExistingBooking({ dateFrom: '2026-07-14', dateTo: '2026-07-18' }, EXISTING_BOOKINGS, []);
  assert.deepEqual(beforeResult, []);
  assert.deepEqual(afterResult, []);
});

test('overlapsExistingBooking excludes the booking being edited (matching id)', () => {
  const result = overlapsExistingBooking({ id: 'a', dateFrom: '2026-07-10', dateTo: '2026-07-14' }, EXISTING_BOOKINGS, []);
  assert.deepEqual(result, []);
});

test('overlapsExistingBooking also checks synced blocks', () => {
  const syncedBlocks = [{ dateFrom: '2026-08-01', dateTo: '2026-08-05', source: 'airbnb' }];
  const result = overlapsExistingBooking({ dateFrom: '2026-08-03', dateTo: '2026-08-06' }, [], syncedBlocks);
  assert.equal(result.length, 1);
  assert.equal(result[0].source, 'airbnb');
});
