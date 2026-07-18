const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getVersion, isAllowedEmail, buildMonthGrid, computeDerivedPrice, computeDisplayPrice,
  getDateRange, getPreviousYearDate, nightsBetween, validateBooking, overlapsExistingBooking,
  parseIcalEvents, mergeSyncedBlocks, buildOccupancyMap, dayOccupancyState,
  upcomingBookings, formatBookingsListForContact, formatBookingsListForGardener,
  findUnmatchedBookings, findUnmatchedSyncedBlocks, dayDisplayLabel,
} = require('./logic.js');

test('getVersion returns the current app version', () => {
  assert.equal(getVersion(), '0.21.0');
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

const SAMPLE_ICAL_TEXT = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//Airbnb Inc//Hosting Calendar//EN',
  'CALSCALE:GREGORIAN',
  'BEGIN:VEVENT',
  'DTSTART;VALUE=DATE:20260710',
  'DTEND;VALUE=DATE:20260714',
  'DTSTAMP:20260101T000000Z',
  'UID:evt-1@airbnb.com',
  'SUMMARY:Reserved',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'DTSTART;VALUE=DATE:20260801',
  'DTEND;VALUE=DATE:20260805',
  'DTSTAMP:20260101T000000Z',
  'UID:evt-2@airbnb.com',
  'SUMMARY:Airbnb (Not available)',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

test('parseIcalEvents extracts every VEVENT block from raw iCal text', () => {
  const result = parseIcalEvents(SAMPLE_ICAL_TEXT);
  assert.equal(result.length, 2);
});

test('parseIcalEvents maps UID/DTSTART/DTEND to uid/dateFrom/dateTo', () => {
  const result = parseIcalEvents(SAMPLE_ICAL_TEXT);
  assert.deepEqual(result[0], { uid: 'evt-1@airbnb.com', dateFrom: '2026-07-10', dateTo: '2026-07-14' });
  assert.deepEqual(result[1], { uid: 'evt-2@airbnb.com', dateFrom: '2026-08-01', dateTo: '2026-08-05' });
});

test('parseIcalEvents also handles datetime-style DTSTART/DTEND values', () => {
  const text = [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    'DTSTART:20260710T140000Z',
    'DTEND:20260714T110000Z',
    'UID:evt-datetime@booking.com',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  assert.deepEqual(parseIcalEvents(text), [{ uid: 'evt-datetime@booking.com', dateFrom: '2026-07-10', dateTo: '2026-07-14' }]);
});

test('parseIcalEvents skips VEVENT blocks missing a UID, DTSTART or DTEND', () => {
  const text = [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    'DTSTART;VALUE=DATE:20260710',
    'DTEND;VALUE=DATE:20260714',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  assert.deepEqual(parseIcalEvents(text), []);
});

test('parseIcalEvents ignores non-VEVENT blocks such as VTIMEZONE', () => {
  const text = [
    'BEGIN:VCALENDAR',
    'BEGIN:VTIMEZONE',
    'TZID:Europe/Madrid',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    'DTSTART;VALUE=DATE:20260710',
    'DTEND;VALUE=DATE:20260714',
    'UID:evt-1@airbnb.com',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  assert.deepEqual(parseIcalEvents(text), [{ uid: 'evt-1@airbnb.com', dateFrom: '2026-07-10', dateTo: '2026-07-14' }]);
});

const EXISTING_SYNCED_BLOCKS = [
  { id: 'airbnb-old-uid', source: 'airbnb', icalUid: 'old-uid', dateFrom: '2026-06-01', dateTo: '2026-06-05' },
  { id: 'booking-keep-me', source: 'booking', icalUid: 'keep-me', dateFrom: '2026-07-01', dateTo: '2026-07-03' },
];

test('mergeSyncedBlocks replaces all blocks for the given source with the freshly parsed events', () => {
  const parsed = [{ uid: 'new-uid', dateFrom: '2026-09-01', dateTo: '2026-09-04' }];
  const result = mergeSyncedBlocks(EXISTING_SYNCED_BLOCKS, parsed, 'airbnb');
  const airbnbBlocks = result.filter((b) => b.source === 'airbnb');
  assert.equal(airbnbBlocks.length, 1);
  assert.equal(airbnbBlocks[0].icalUid, 'new-uid');
});

test('mergeSyncedBlocks leaves blocks from other sources untouched', () => {
  const result = mergeSyncedBlocks(EXISTING_SYNCED_BLOCKS, [], 'airbnb');
  const bookingBlocks = result.filter((b) => b.source === 'booking');
  assert.deepEqual(bookingBlocks, [EXISTING_SYNCED_BLOCKS[1]]);
});

test('mergeSyncedBlocks assigns a deterministic id per source+uid', () => {
  const parsed = [{ uid: 'abc', dateFrom: '2026-09-01', dateTo: '2026-09-04' }];
  const result = mergeSyncedBlocks([], parsed, 'booking');
  assert.equal(result[0].id, 'booking-abc');
});

test('mergeSyncedBlocks clears a source entirely when no events are parsed for it', () => {
  const result = mergeSyncedBlocks(EXISTING_SYNCED_BLOCKS, [], 'booking');
  assert.deepEqual(result, [EXISTING_SYNCED_BLOCKS[0]]);
});

test('buildOccupancyMap returns an empty map when there are no bookings or synced blocks', () => {
  assert.deepEqual(buildOccupancyMap([], []), {});
});

test('buildOccupancyMap marks every date in a booking range as occupied, inclusive', () => {
  const bookings = [{ id: 'b1', dateFrom: '2026-07-10', dateTo: '2026-07-12', name: 'Jan' }];
  const map = buildOccupancyMap(bookings, []);
  assert.deepEqual(Object.keys(map).sort(), ['2026-07-10', '2026-07-11', '2026-07-12']);
});

test('buildOccupancyMap tags booking entries with type booking and keeps the original fields', () => {
  const bookings = [{ id: 'b1', dateFrom: '2026-07-10', dateTo: '2026-07-11', name: 'Jan' }];
  const map = buildOccupancyMap(bookings, []);
  assert.deepEqual(map['2026-07-10'], [{ type: 'booking', id: 'b1', dateFrom: '2026-07-10', dateTo: '2026-07-11', name: 'Jan' }]);
});

test('buildOccupancyMap also marks synced blocks as occupied, tagged with type syncedBlock', () => {
  const syncedBlocks = [{ id: 'airbnb-x', source: 'airbnb', dateFrom: '2026-08-01', dateTo: '2026-08-02' }];
  const map = buildOccupancyMap([], syncedBlocks);
  assert.deepEqual(map['2026-08-01'], [{ type: 'syncedBlock', id: 'airbnb-x', source: 'airbnb', dateFrom: '2026-08-01', dateTo: '2026-08-02' }]);
});

test('buildOccupancyMap lists multiple entries on the same day (e.g. a same-day checkout/checkin turnover)', () => {
  const bookings = [
    { id: 'b1', dateFrom: '2026-07-10', dateTo: '2026-07-14', name: 'Jan' },
    { id: 'b2', dateFrom: '2026-07-14', dateTo: '2026-07-18', name: 'Mieke' },
  ];
  const map = buildOccupancyMap(bookings, []);
  assert.equal(map['2026-07-14'].length, 2);
});

const SINGLE_BOOKING = [{ id: 'b1', dateFrom: '2026-07-10', dateTo: '2026-07-14', name: 'Jan' }];
const SINGLE_BOOKING_MAP = buildOccupancyMap(SINGLE_BOOKING, []);

test('dayOccupancyState returns vrij for a date with no occupancy entries', () => {
  assert.equal(dayOccupancyState('2026-07-09', SINGLE_BOOKING_MAP), 'vrij');
});

test('dayOccupancyState returns aankomst on the check-in day', () => {
  assert.equal(dayOccupancyState('2026-07-10', SINGLE_BOOKING_MAP), 'aankomst');
});

test('dayOccupancyState returns bezet for a day strictly between check-in and check-out', () => {
  assert.equal(dayOccupancyState('2026-07-12', SINGLE_BOOKING_MAP), 'bezet');
});

test('dayOccupancyState returns vertrek on the check-out day', () => {
  assert.equal(dayOccupancyState('2026-07-14', SINGLE_BOOKING_MAP), 'vertrek');
});

test('dayOccupancyState returns bezet on a same-day turnover (departure + arrival both cover the day)', () => {
  const bookings = [
    { id: 'b1', dateFrom: '2026-07-10', dateTo: '2026-07-14', name: 'Jan' },
    { id: 'b2', dateFrom: '2026-07-14', dateTo: '2026-07-18', name: 'Mieke' },
  ];
  const map = buildOccupancyMap(bookings, []);
  assert.equal(dayOccupancyState('2026-07-14', map), 'bezet');
});

test('dayOccupancyState handles a single-night booking: arrival and departure on consecutive days', () => {
  const map = buildOccupancyMap([{ id: 'b1', dateFrom: '2026-07-10', dateTo: '2026-07-11', name: 'Jan' }], []);
  assert.equal(dayOccupancyState('2026-07-10', map), 'aankomst');
  assert.equal(dayOccupancyState('2026-07-11', map), 'vertrek');
});

test('dayOccupancyState works correctly at the first and last day of a month', () => {
  const map = buildOccupancyMap([{ id: 'b1', dateFrom: '2026-06-29', dateTo: '2026-07-01', name: 'Jan' }], []);
  assert.equal(dayOccupancyState('2026-07-01', map), 'vertrek');
  const map2 = buildOccupancyMap([{ id: 'b2', dateFrom: '2026-07-31', dateTo: '2026-08-03', name: 'Mieke' }], []);
  assert.equal(dayOccupancyState('2026-07-31', map2), 'aankomst');
});

const UPCOMING_BOOKINGS = [
  { id: 'past', dateFrom: '2026-06-01', dateTo: '2026-06-05', name: 'Voorbij' },
  { id: 'ongoing', dateFrom: '2026-06-28', dateTo: '2026-07-02', name: 'Lopend' },
  { id: 'future-1', dateFrom: '2026-08-01', dateTo: '2026-08-05', name: 'Later' },
  { id: 'future-2', dateFrom: '2026-07-10', dateTo: '2026-07-14', name: 'Eerder' },
];

test('upcomingBookings excludes bookings that have already fully ended before today', () => {
  const result = upcomingBookings(UPCOMING_BOOKINGS, '2026-07-01');
  assert.ok(!result.some((b) => b.id === 'past'));
});

test('upcomingBookings includes a booking that is still ongoing today (checkout today or later)', () => {
  const result = upcomingBookings(UPCOMING_BOOKINGS, '2026-07-01');
  assert.ok(result.some((b) => b.id === 'ongoing'));
});

test('upcomingBookings includes all future bookings with no upper bound', () => {
  const result = upcomingBookings(UPCOMING_BOOKINGS, '2026-07-01');
  assert.ok(result.some((b) => b.id === 'future-1'));
  assert.ok(result.some((b) => b.id === 'future-2'));
});

test('upcomingBookings returns results sorted by dateFrom ascending', () => {
  const result = upcomingBookings(UPCOMING_BOOKINGS, '2026-07-01');
  const dates = result.map((b) => b.dateFrom);
  assert.deepEqual(dates, [...dates].sort());
});

test('formatBookingsListForContact returns null when there are no bookings', () => {
  assert.equal(formatBookingsListForContact([], (a, b) => `${a} - ${b}`), null);
});

test('formatBookingsListForContact includes date range, nights, name+language, phone, guest counts and remark', () => {
  const booking = {
    dateFrom: '2026-07-10', dateTo: '2026-07-14', name: 'Jan Janssens', language: 'NL',
    phone: '0470123456', adultsCount: 2, childrenCount: 1, remark: 'late aankomst',
  };
  const text = formatBookingsListForContact([booking], (a, b) => `${a} - ${b}`);
  assert.match(text, /2026-07-10 - 2026-07-14/);
  assert.match(text, /4 nachten/);
  assert.match(text, /Jan Janssens \(NL\)/);
  assert.match(text, /0470123456/);
  assert.match(text, /2 volwassenen, 1 kind\b/);
  assert.match(text, /late aankomst/);
});

test('formatBookingsListForContact falls back to em-dash for missing phone/remark and omits language when blank', () => {
  const booking = { dateFrom: '2026-07-10', dateTo: '2026-07-11', name: 'Jan', language: '', phone: '', adultsCount: 1, childrenCount: 0, remark: '' };
  const text = formatBookingsListForContact([booking], (a, b) => `${a} - ${b}`);
  assert.match(text, /👤 Jan\n/);
  assert.match(text, /—/);
});

test('formatBookingsListForContact joins multiple bookings with a blank line separator', () => {
  const bookings = [
    { dateFrom: '2026-07-10', dateTo: '2026-07-11', name: 'Jan', language: '', phone: '', adultsCount: 1, childrenCount: 0, remark: '' },
    { dateFrom: '2026-08-01', dateTo: '2026-08-02', name: 'Mieke', language: '', phone: '', adultsCount: 1, childrenCount: 0, remark: '' },
  ];
  const text = formatBookingsListForContact(bookings, (a, b) => `${a} - ${b}`);
  assert.equal(text.split('\n\n').length, 2);
});

test('formatBookingsListForContact never includes a price field', () => {
  const booking = { dateFrom: '2026-07-10', dateTo: '2026-07-11', name: 'Jan', language: '', phone: '', adultsCount: 1, childrenCount: 0, remark: '', price: 999 };
  const text = formatBookingsListForContact([booking], (a, b) => `${a} - ${b}`);
  assert.ok(!text.includes('999'));
});

test('formatBookingsListForContact uses singular volwassene/kind for a count of 1', () => {
  const booking = { dateFrom: '2026-07-10', dateTo: '2026-07-11', name: 'Jan', language: '', phone: '', adultsCount: 1, childrenCount: 1, remark: '' };
  const text = formatBookingsListForContact([booking], (a, b) => `${a} - ${b}`);
  assert.match(text, /1 volwassene, 1 kind\b/);
});

test('formatBookingsListForGardener returns null when there are no bookings', () => {
  assert.equal(formatBookingsListForGardener([], (a, b) => `${a} - ${b}`), null);
});

test('formatBookingsListForGardener includes only date range and name+language', () => {
  const booking = {
    dateFrom: '2026-07-10', dateTo: '2026-07-14', name: 'Jan Janssens', language: 'NL',
    phone: '0470123456', adultsCount: 2, childrenCount: 1, remark: 'late aankomst', price: 480,
  };
  const text = formatBookingsListForGardener([booking], (a, b) => `${a} - ${b}`);
  assert.equal(text, '📅 2026-07-10 - 2026-07-14\n👤 Jan Janssens (NL)');
});

test('formatBookingsListForGardener omits the language suffix when blank', () => {
  const booking = { dateFrom: '2026-07-10', dateTo: '2026-07-11', name: 'Jan', language: '' };
  const text = formatBookingsListForGardener([booking], (a, b) => `${a} - ${b}`);
  assert.equal(text, '📅 2026-07-10 - 2026-07-11\n👤 Jan');
});

test('formatBookingsListForGardener joins multiple bookings with a blank line separator', () => {
  const bookings = [
    { dateFrom: '2026-07-10', dateTo: '2026-07-11', name: 'Jan', language: '' },
    { dateFrom: '2026-08-01', dateTo: '2026-08-02', name: 'Mieke', language: '' },
  ];
  const text = formatBookingsListForGardener(bookings, (a, b) => `${a} - ${b}`);
  assert.equal(text.split('\n\n').length, 2);
});

const SYNC_TEST_BLOCKS = [
  { id: 'airbnb-x', source: 'airbnb', dateFrom: '2026-07-10', dateTo: '2026-07-14', icalUid: 'x' },
  { id: 'booking-y', source: 'booking', dateFrom: '2026-08-01', dateTo: '2026-08-05', icalUid: 'y' },
];

test('findUnmatchedBookings excludes a booking whose platform, dateFrom and dateTo exactly match a synced block', () => {
  const bookings = [{ id: 'b1', platform: 'airbnb', dateFrom: '2026-07-10', dateTo: '2026-07-14', name: 'Jan' }];
  assert.deepEqual(findUnmatchedBookings(bookings, SYNC_TEST_BLOCKS), []);
});

test('findUnmatchedBookings includes an airbnb/booking booking with no matching synced block', () => {
  const bookings = [{ id: 'b1', platform: 'airbnb', dateFrom: '2026-07-11', dateTo: '2026-07-14', name: 'Jan' }];
  const result = findUnmatchedBookings(bookings, SYNC_TEST_BLOCKS);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'b1');
});

test('findUnmatchedBookings never flags direct/friends bookings, even with no synced blocks at all', () => {
  const bookings = [
    { id: 'b1', platform: 'direct', dateFrom: '2026-07-10', dateTo: '2026-07-14', name: 'Jan' },
    { id: 'b2', platform: 'friends', dateFrom: '2026-07-20', dateTo: '2026-07-22', name: 'Piet' },
  ];
  assert.deepEqual(findUnmatchedBookings(bookings, []), []);
});

test('findUnmatchedBookings does not cross-match a booking against a synced block from a different source', () => {
  const bookings = [{ id: 'b1', platform: 'booking', dateFrom: '2026-07-10', dateTo: '2026-07-14', name: 'Jan' }];
  // SYNC_TEST_BLOCKS has an airbnb block with these exact dates, but no booking.com block
  const result = findUnmatchedBookings(bookings, SYNC_TEST_BLOCKS);
  assert.equal(result.length, 1);
});

test('findUnmatchedSyncedBlocks excludes a block with a matching booking', () => {
  const bookings = [{ id: 'b1', platform: 'airbnb', dateFrom: '2026-07-10', dateTo: '2026-07-14', name: 'Jan' }];
  const result = findUnmatchedSyncedBlocks(bookings, SYNC_TEST_BLOCKS);
  assert.deepEqual(result, [SYNC_TEST_BLOCKS[1]]);
});

test('findUnmatchedSyncedBlocks includes a block with no matching booking at all', () => {
  const result = findUnmatchedSyncedBlocks([], SYNC_TEST_BLOCKS);
  assert.equal(result.length, 2);
});

test('dayDisplayLabel always returns Vrij for a free day, regardless of the occupancy map', () => {
  assert.equal(dayDisplayLabel('2026-07-15', { '2026-07-15': [{ type: 'booking', name: 'Jan' }] }, 'vrij'), 'Vrij');
});

test('dayDisplayLabel returns the guest name for an occupied day with a booking', () => {
  const map = { '2026-07-15': [{ type: 'booking', name: 'Jan Janssens' }] };
  assert.equal(dayDisplayLabel('2026-07-15', map, 'bezet'), 'Jan Janssens');
});

test('dayDisplayLabel returns the guest name on arrival and departure days too', () => {
  const map = { '2026-07-15': [{ type: 'booking', name: 'Jan Janssens' }] };
  assert.equal(dayDisplayLabel('2026-07-15', map, 'aankomst'), 'Jan Janssens');
  assert.equal(dayDisplayLabel('2026-07-15', map, 'vertrek'), 'Jan Janssens');
});

test('dayDisplayLabel falls back to Bezet when the day only has a synced block with no booking yet', () => {
  const map = { '2026-07-15': [{ type: 'syncedBlock', source: 'airbnb' }] };
  assert.equal(dayDisplayLabel('2026-07-15', map, 'bezet'), 'Bezet');
});

test('dayDisplayLabel joins multiple guest names on a same-day turnover', () => {
  const map = { '2026-07-14': [{ type: 'booking', name: 'Jan' }, { type: 'booking', name: 'Mieke' }] };
  assert.equal(dayDisplayLabel('2026-07-14', map, 'bezet'), 'Jan / Mieke');
});
