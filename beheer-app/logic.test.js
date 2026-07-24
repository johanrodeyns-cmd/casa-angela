const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getVersion, isAllowedEmail, buildMonthGrid, buildMonthTimeline, buildYearGrid,
  getEasterSunday, getBelgianPublicHolidays, computeDerivedPrice, computeDisplayPrice,
  getDateRange, getPreviousYearDate, nightsBetween, validateBooking, overlapsExistingBooking,
  parseIcalEvents, mergeSyncedBlocks, buildOccupancyMap, dayOccupancyState,
  upcomingBookings, buildContactImageRows, formatBookingsListForGardener,
  getArchiveDailySeries, buildMonthlySeriesFromArchive, buildYearlySeriesFromArchive,
  sumArchiveDateRange, averageDailyConsumption,
  findUnmatchedBookings, findUnmatchedSyncedBlocks, dayDisplayLabel, weekdayAbbreviation,
  sortChecklistItems, addChecklistItem, renameChecklistItem, removeChecklistItem,
  toggleChecklistItem, resetChecklistItems, moveChecklistItem, escapeHtml, diffSyncedBlocks,
  computeMeterIntervals, extrapolateDailyConsumption, buildMonthlyConsumption,
  buildYearlyConsumption, validateMeterReading, daysInMonth, padSeriesValues,
  padTodaySeries,
} = require('./logic.js');

test('getVersion returns the current app version', () => {
  assert.equal(getVersion(), '0.49.1');
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

function timelineByDay(timeline) {
  const byDay = {};
  timeline.forEach((c) => {
    if (c.type !== 'blank') byDay[c.day] = c;
  });
  return byDay;
}

test('buildMonthTimeline marks Saturdays and Sundays as weekend for free days', () => {
  const timeline = buildMonthTimeline(2024, 2, {}); // 2024-02-01 is a Thursday
  const byDay = timelineByDay(timeline);
  assert.equal(byDay[1].weekend, false); // Thu
  assert.equal(byDay[3].weekend, true); // Sat
  assert.equal(byDay[4].weekend, true); // Sun
  assert.equal(byDay[5].weekend, false); // Mon
});

test('buildMonthTimeline pads leading/trailing days outside the month as blank cells, matching buildMonthGrid', () => {
  const flat = buildMonthGrid(2024, 2).flat();
  const timeline = buildMonthTimeline(2024, 2, {});
  assert.equal(timeline.length, flat.length);
  flat.forEach((date, i) => {
    assert.equal(timeline[i].type, date === null ? 'blank' : 'free');
  });
});

test('buildMonthTimeline places every weekend day at column index 5 or 6 within its 7-day block, so weekends align vertically across all months', () => {
  for (let month = 1; month <= 12; month++) {
    const timeline = buildMonthTimeline(2026, month, {});
    timeline.forEach((cell, index) => {
      if (cell.type === 'free' && cell.weekend) {
        assert.ok(index % 7 === 5 || index % 7 === 6, `month ${month}, day ${cell.day}, index ${index}`);
      }
    });
  }
});

test('getEasterSunday computes the correct date for known reference years', () => {
  assert.equal(getEasterSunday(2024), '2024-03-31');
  assert.equal(getEasterSunday(2025), '2025-04-20');
  assert.equal(getEasterSunday(2026), '2026-04-05');
});

test('getBelgianPublicHolidays returns the 10 fixed and Easter-based holidays for a given year', () => {
  const holidays = getBelgianPublicHolidays(2026).slice().sort();
  assert.deepEqual(holidays, [
    '2026-01-01', // Nieuwjaar
    '2026-04-06', // Paasmaandag (Easter + 1)
    '2026-05-01', // Dag van de Arbeid
    '2026-05-14', // O.L.H. Hemelvaart (Easter + 39)
    '2026-05-25', // Pinkstermaandag (Easter + 50)
    '2026-07-21', // Nationale feestdag
    '2026-08-15', // O.L.V. Hemelvaart
    '2026-11-01', // Allerheiligen
    '2026-11-11', // Wapenstilstand
    '2026-12-25', // Kerstmis
  ].sort());
});

test('buildMonthTimeline marks a Belgian public holiday that falls on a weekday as a holiday', () => {
  const timeline = buildMonthTimeline(2026, 7, {}); // 2026-07-21 is a Tuesday (Nationale feestdag)
  const byDay = timelineByDay(timeline);
  assert.equal(byDay[21].holiday, true);
  assert.equal(byDay[21].weekend, false);
  assert.equal(byDay[20].holiday, false);
});

test('buildMonthTimeline returns one free entry per real day when there is no occupancy', () => {
  const timeline = buildMonthTimeline(2024, 2, {}); // leap year, 29 days
  const freeDays = timeline.filter((c) => c.type === 'free');
  assert.equal(freeDays.length, 29);
});

test('buildMonthTimeline splits off the check-in/check-out day as a standalone edge cell, merging only the fully-booked days in between', () => {
  const bookings = [{ id: 'b1', dateFrom: '2026-07-10', dateTo: '2026-07-14', name: 'Jan' }];
  const occupancyMap = buildOccupancyMap(bookings, []);
  const timeline = buildMonthTimeline(2026, 7, occupancyMap);
  const relevant = timeline.filter((c) => c.type === 'edge' || c.type === 'booked');
  assert.deepEqual(relevant, [
    { type: 'edge', day: 10, edge: 'aankomst', label: 'Jan' },
    { type: 'booked', day: 11, span: 3, label: 'Jan' },
    { type: 'edge', day: 14, edge: 'vertrek', label: 'Jan' },
  ]);
});

test('buildMonthTimeline marks a same-day turnover as its own standalone turnover cell, not merged and not a booked segment', () => {
  const bookings = [
    { id: 'b1', dateFrom: '2026-07-05', dateTo: '2026-07-10', name: 'Jan' },
    { id: 'b2', dateFrom: '2026-07-10', dateTo: '2026-07-15', name: 'Mieke' },
  ];
  const occupancyMap = buildOccupancyMap(bookings, []);
  const timeline = buildMonthTimeline(2026, 7, occupancyMap);
  const relevant = timeline.filter((c) => c.type === 'edge' || c.type === 'booked' || c.type === 'turnover');
  assert.deepEqual(relevant, [
    { type: 'edge', day: 5, edge: 'aankomst', label: 'Jan' },
    { type: 'booked', day: 6, span: 4, label: 'Jan' },
    { type: 'turnover', day: 10, label: 'Jan / Mieke' },
    { type: 'booked', day: 11, span: 4, label: 'Mieke' },
    { type: 'edge', day: 15, edge: 'vertrek', label: 'Mieke' },
  ]);
});

test('buildMonthTimeline treats a 1-night stay as two adjacent, un-merged edge cells (no bezet day in between)', () => {
  const bookings = [{ id: 'b1', dateFrom: '2026-07-10', dateTo: '2026-07-11', name: 'Jan' }];
  const occupancyMap = buildOccupancyMap(bookings, []);
  const timeline = buildMonthTimeline(2026, 7, occupancyMap);
  const relevant = timeline.filter((c) => c.type === 'edge' || c.type === 'booked');
  assert.deepEqual(relevant, [
    { type: 'edge', day: 10, edge: 'aankomst', label: 'Jan' },
    { type: 'edge', day: 11, edge: 'vertrek', label: 'Jan' },
  ]);
});

test('buildMonthTimeline does not treat a single-guest 2-night stay\'s lone middle day as a turnover', () => {
  const bookings = [{ id: 'b1', dateFrom: '2026-07-10', dateTo: '2026-07-12', name: 'Jan' }];
  const occupancyMap = buildOccupancyMap(bookings, []);
  const timeline = buildMonthTimeline(2026, 7, occupancyMap);
  const relevant = timeline.filter((c) => c.type === 'edge' || c.type === 'booked' || c.type === 'turnover');
  assert.deepEqual(relevant, [
    { type: 'edge', day: 10, edge: 'aankomst', label: 'Jan' },
    { type: 'booked', day: 11, span: 1, label: 'Jan' },
    { type: 'edge', day: 12, edge: 'vertrek', label: 'Jan' },
  ]);
});

test('buildYearGrid returns 12 entries, one per month in order, each built from buildMonthTimeline', () => {
  const bookings = [{ id: 'b1', dateFrom: '2026-07-10', dateTo: '2026-07-14', name: 'Jan' }];
  const occupancyMap = buildOccupancyMap(bookings, []);
  const year = buildYearGrid(2026, occupancyMap);
  assert.equal(year.length, 12);
  assert.deepEqual(year.map((m) => m.month), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.deepEqual(year[6].cells, buildMonthTimeline(2026, 7, occupancyMap));
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

test('diffSyncedBlocks reports nothing when nothing actually changed, even if ids were recreated', () => {
  const before = [{ id: 'airbnb-x', source: 'airbnb', dateFrom: '2026-07-10', dateTo: '2026-07-14' }];
  const after = [{ id: 'airbnb-x', source: 'airbnb', dateFrom: '2026-07-10', dateTo: '2026-07-14' }];
  assert.deepEqual(diffSyncedBlocks(before, after), []);
});

test('diffSyncedBlocks reports a create for a block id that did not exist before', () => {
  const after = [{ id: 'airbnb-new', source: 'airbnb', dateFrom: '2026-07-10', dateTo: '2026-07-14' }];
  const result = diffSyncedBlocks([], after);
  assert.deepEqual(result, [{ docId: 'airbnb-new', action: 'create', before: null, after: after[0] }]);
});

test('diffSyncedBlocks reports a delete for a block id that disappeared', () => {
  const before = [{ id: 'airbnb-gone', source: 'airbnb', dateFrom: '2026-07-10', dateTo: '2026-07-14' }];
  const result = diffSyncedBlocks(before, []);
  assert.deepEqual(result, [{ docId: 'airbnb-gone', action: 'delete', before: before[0], after: null }]);
});

test('diffSyncedBlocks reports an update when the same id now has different dates', () => {
  const before = [{ id: 'airbnb-x', source: 'airbnb', dateFrom: '2026-07-10', dateTo: '2026-07-14' }];
  const after = [{ id: 'airbnb-x', source: 'airbnb', dateFrom: '2026-07-11', dateTo: '2026-07-14' }];
  const result = diffSyncedBlocks(before, after);
  assert.deepEqual(result, [{ docId: 'airbnb-x', action: 'update', before: before[0], after: after[0] }]);
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

test("dayOccupancyState lets a booking's own boundary win over a stale synced block covering the same range", () => {
  const bookings = [
    { id: 'b1', dateFrom: '2026-07-09', dateTo: '2026-07-19', name: 'Paul Collier' },
    { id: 'b2', dateFrom: '2026-07-20', dateTo: '2026-07-25', name: 'Klakel Boras' },
  ];
  // Stale synced block from an earlier sync (e.g. host later changed the Airbnb calendar);
  // it no longer matches either booking but still overlaps their boundary days.
  const syncedBlocks = [{ id: 'airbnb-stale', source: 'airbnb', dateFrom: '2026-07-16', dateTo: '2026-07-20' }];
  const map = buildOccupancyMap(bookings, syncedBlocks);
  assert.equal(dayOccupancyState('2026-07-19', map), 'vertrek');
  assert.equal(dayOccupancyState('2026-07-20', map), 'aankomst');
});

test('dayOccupancyState still classifies an unmatched synced block on its own when no booking covers that date', () => {
  const syncedBlocks = [{ id: 'airbnb-x', source: 'airbnb', dateFrom: '2026-08-01', dateTo: '2026-08-05' }];
  const map = buildOccupancyMap([], syncedBlocks);
  assert.equal(dayOccupancyState('2026-08-01', map), 'aankomst');
  assert.equal(dayOccupancyState('2026-08-03', map), 'bezet');
  assert.equal(dayOccupancyState('2026-08-05', map), 'vertrek');
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

test('buildContactImageRows returns an empty array for no bookings', () => {
  assert.deepEqual(buildContactImageRows([]), []);
});

test('buildContactImageRows maps date range, computed nights, name, language, phone and guest counts', () => {
  const booking = {
    dateFrom: '2026-07-10', dateTo: '2026-07-14', name: 'Jan Janssens', language: 'NL',
    phone: '0470123456', adultsCount: 2, childrenCount: 1, remark: 'late aankomst',
  };
  const [row] = buildContactImageRows([booking]);
  assert.deepEqual(row, {
    dateFrom: '2026-07-10', dateTo: '2026-07-14', nights: 4, name: 'Jan Janssens',
    language: 'NL', phone: '0470123456', adults: 2, children: 1, remark: 'late aankomst',
  });
});

test('buildContactImageRows defaults missing language/phone/remark to an empty string and missing guest counts to 0', () => {
  const booking = { dateFrom: '2026-07-10', dateTo: '2026-07-11', name: 'Jan' };
  const [row] = buildContactImageRows([booking]);
  assert.equal(row.language, '');
  assert.equal(row.phone, '');
  assert.equal(row.remark, '');
  assert.equal(row.adults, 0);
  assert.equal(row.children, 0);
});

test('buildContactImageRows never includes a price field', () => {
  const booking = { dateFrom: '2026-07-10', dateTo: '2026-07-11', name: 'Jan', price: 999 };
  const [row] = buildContactImageRows([booking]);
  assert.equal(row.price, undefined);
});

test('formatBookingsListForGardener returns null when there are no bookings', () => {
  assert.equal(formatBookingsListForGardener([], (d) => d), null);
});

test('formatBookingsListForGardener returns a plain Desde/Hasta table with only the date range, no name/icons/code-fence', () => {
  const booking = {
    dateFrom: '2026-07-10', dateTo: '2026-07-14', name: 'Jan Janssens', language: 'NL',
    phone: '0470123456', adultsCount: 2, childrenCount: 1, remark: 'late aankomst', price: 480,
  };
  const text = formatBookingsListForGardener([booking], (d) => d);
  const lines = text.split('\n');
  assert.equal(lines.length, 2);
  assert.ok(lines[0].startsWith('Desde'));
  assert.ok(lines[0].includes('Hasta'));
  assert.ok(!text.includes('```'));
  assert.ok(!text.includes('Jan'));
});

test('formatBookingsListForGardener aligns the Hasta column across all rows, with a clear gap after Desde', () => {
  const bookings = [
    { dateFrom: '2026-07-10', dateTo: '2026-07-14' },
    { dateFrom: '2026-08-01', dateTo: '2026-08-02' },
  ];
  const text = formatBookingsListForGardener(bookings, (d) => d);
  const lines = text.split('\n');
  const hastaIndex = lines[0].indexOf('Hasta');
  assert.equal(lines[1].indexOf('2026-07-14'), hastaIndex);
  assert.equal(lines[2].indexOf('2026-08-02'), hastaIndex);
  assert.ok(hastaIndex - 'Desde'.length >= 4);
});

const SYNC_TEST_BLOCKS = [
  { id: 'airbnb-x', source: 'airbnb', dateFrom: '2026-07-10', dateTo: '2026-07-14', icalUid: 'x' },
  { id: 'booking-y', source: 'booking', dateFrom: '2026-08-01', dateTo: '2026-08-05', icalUid: 'y' },
];

test('findUnmatchedBookings excludes a booking whose platform, dateFrom and dateTo exactly match a synced block', () => {
  const bookings = [{ id: 'b1', platform: 'airbnb', dateFrom: '2026-07-10', dateTo: '2026-07-14', name: 'Jan' }];
  assert.deepEqual(findUnmatchedBookings(bookings, SYNC_TEST_BLOCKS, '2026-07-01'), []);
});

test('findUnmatchedBookings includes an airbnb/booking booking with no matching synced block', () => {
  const bookings = [{ id: 'b1', platform: 'airbnb', dateFrom: '2026-07-11', dateTo: '2026-07-14', name: 'Jan' }];
  const result = findUnmatchedBookings(bookings, SYNC_TEST_BLOCKS, '2026-07-01');
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'b1');
});

test('findUnmatchedBookings never flags direct/friends bookings, even with no synced blocks at all', () => {
  const bookings = [
    { id: 'b1', platform: 'direct', dateFrom: '2026-07-10', dateTo: '2026-07-14', name: 'Jan' },
    { id: 'b2', platform: 'friends', dateFrom: '2026-07-20', dateTo: '2026-07-22', name: 'Piet' },
  ];
  assert.deepEqual(findUnmatchedBookings(bookings, [], '2026-07-01'), []);
});

test('findUnmatchedBookings does not cross-match a booking against a synced block from a different source', () => {
  const bookings = [{ id: 'b1', platform: 'booking', dateFrom: '2026-07-10', dateTo: '2026-07-14', name: 'Jan' }];
  // SYNC_TEST_BLOCKS has an airbnb block with these exact dates, but no booking.com block
  const result = findUnmatchedBookings(bookings, SYNC_TEST_BLOCKS, '2026-07-01');
  assert.equal(result.length, 1);
});

test('findUnmatchedBookings excludes an unmatched booking that already ended before today', () => {
  const bookings = [{ id: 'b1', platform: 'airbnb', dateFrom: '2026-06-01', dateTo: '2026-06-05', name: 'Jan' }];
  assert.deepEqual(findUnmatchedBookings(bookings, [], '2026-07-01'), []);
});

test('findUnmatchedBookings includes an unmatched booking whose checkout is today or later', () => {
  const bookings = [{ id: 'b1', platform: 'airbnb', dateFrom: '2026-06-28', dateTo: '2026-07-01', name: 'Jan' }];
  const result = findUnmatchedBookings(bookings, [], '2026-07-01');
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

test('findUnmatchedSyncedBlocks excludes a block whose dates match a booking recorded under a different platform (e.g. eigen verblijf geboekt als "Rechtstreeks")', () => {
  const bookings = [{ id: 'b1', platform: 'direct', dateFrom: '2026-07-10', dateTo: '2026-07-14', name: 'Tinneke&Johan' }];
  const result = findUnmatchedSyncedBlocks(bookings, SYNC_TEST_BLOCKS);
  assert.deepEqual(result, [SYNC_TEST_BLOCKS[1]]);
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

test('dayDisplayLabel lists the departing guest before the arriving guest on a same-day turnover, regardless of input order', () => {
  const map = {
    '2026-07-14': [
      { type: 'booking', name: 'Mieke', dateFrom: '2026-07-14', dateTo: '2026-07-18' },
      { type: 'booking', name: 'Jan', dateFrom: '2026-07-10', dateTo: '2026-07-14' },
    ],
  };
  assert.equal(dayDisplayLabel('2026-07-14', map, 'bezet'), 'Jan / Mieke');
});

test('dayDisplayLabel uses first names only for a same-day turnover, so both guests fit in a narrow calendar cell', () => {
  const map = {
    '2026-07-25': [
      { type: 'booking', name: 'Klakel Boras', dateFrom: '2026-07-20', dateTo: '2026-07-25' },
      { type: 'booking', name: 'Frederic Martineau', dateFrom: '2026-07-25', dateTo: '2026-08-08' },
    ],
  };
  assert.equal(dayDisplayLabel('2026-07-25', map, 'bezet'), 'Klakel / Frederic');
});

test('dayDisplayLabel keeps the full name when only one guest occupies the day', () => {
  const map = {
    '2026-07-10': [{ type: 'booking', name: 'Frederic Martineau', dateFrom: '2026-07-05', dateTo: '2026-07-15' }],
  };
  assert.equal(dayDisplayLabel('2026-07-10', map, 'bezet'), 'Frederic Martineau');
});

test('weekdayAbbreviation matches the app-wide Ma/Di/Wo/Do/Vr/Za/Zo convention', () => {
  assert.equal(weekdayAbbreviation('2026-07-06'), 'Ma');
  assert.equal(weekdayAbbreviation('2026-07-07'), 'Di');
  assert.equal(weekdayAbbreviation('2026-07-08'), 'Wo');
  assert.equal(weekdayAbbreviation('2026-07-09'), 'Do');
  assert.equal(weekdayAbbreviation('2026-07-10'), 'Vr');
  assert.equal(weekdayAbbreviation('2026-07-11'), 'Za');
  assert.equal(weekdayAbbreviation('2026-07-12'), 'Zo');
});

test('sortChecklistItems returns items ordered by the order field ascending', () => {
  const items = [
    { id: 'b', text: 'Beddengoed', checked: false, order: 2 },
    { id: 'a', text: 'Zwembad', checked: false, order: 0 },
    { id: 'c', text: 'Luiken', checked: false, order: 1 },
  ];
  assert.deepEqual(sortChecklistItems(items).map((i) => i.id), ['a', 'c', 'b']);
});

test('sortChecklistItems does not mutate the original array', () => {
  const items = [{ id: 'a', text: 'X', checked: false, order: 1 }, { id: 'b', text: 'Y', checked: false, order: 0 }];
  const original = items.map((i) => ({ ...i }));
  sortChecklistItems(items);
  assert.deepEqual(items, original);
});

test('addChecklistItem appends a new unchecked item with the next order value', () => {
  const items = [{ id: 'a', text: 'Zwembad', checked: false, order: 0 }];
  const result = addChecklistItem(items, 'b', 'Luiken sluiten');
  assert.equal(result.length, 2);
  assert.deepEqual(result[1], { id: 'b', text: 'Luiken sluiten', checked: false, order: 1 });
});

test('addChecklistItem starts order at 0 for the first item in an empty list', () => {
  assert.deepEqual(addChecklistItem([], 'a', 'Zwembad checken'), [
    { id: 'a', text: 'Zwembad checken', checked: false, order: 0 },
  ]);
});

test('addChecklistItem does not mutate the original items array', () => {
  const items = [{ id: 'a', text: 'X', checked: false, order: 0 }];
  addChecklistItem(items, 'b', 'Y');
  assert.equal(items.length, 1);
});

test('renameChecklistItem updates only the matching item text, leaving others untouched', () => {
  const items = [
    { id: 'a', text: 'Zwembad', checked: false, order: 0 },
    { id: 'b', text: 'Luiken', checked: true, order: 1 },
  ];
  const result = renameChecklistItem(items, 'b', 'Luiken sluiten');
  assert.equal(result[0].text, 'Zwembad');
  assert.equal(result[1].text, 'Luiken sluiten');
  assert.equal(result[1].checked, true);
});

test('removeChecklistItem drops the matching item and keeps the rest', () => {
  const items = [
    { id: 'a', text: 'Zwembad', checked: false, order: 0 },
    { id: 'b', text: 'Luiken', checked: false, order: 1 },
  ];
  assert.deepEqual(removeChecklistItem(items, 'a').map((i) => i.id), ['b']);
});

test('toggleChecklistItem flips checked on the matching item only, and flips back the second time', () => {
  const items = [
    { id: 'a', text: 'Zwembad', checked: false, order: 0 },
    { id: 'b', text: 'Luiken', checked: false, order: 1 },
  ];
  const toggled = toggleChecklistItem(items, 'a');
  assert.equal(toggled[0].checked, true);
  assert.equal(toggled[1].checked, false);
  assert.equal(toggleChecklistItem(toggled, 'a')[0].checked, false);
});

test('resetChecklistItems sets checked to false on every item without removing any', () => {
  const items = [
    { id: 'a', text: 'Zwembad', checked: true, order: 0 },
    { id: 'b', text: 'Luiken', checked: true, order: 1 },
  ];
  const result = resetChecklistItems(items);
  assert.equal(result.length, 2);
  assert.ok(result.every((i) => i.checked === false));
});

test('moveChecklistItem swaps order with the previous item when moving up', () => {
  const items = [
    { id: 'a', text: 'Zwembad', checked: false, order: 0 },
    { id: 'b', text: 'Luiken', checked: false, order: 1 },
  ];
  const result = sortChecklistItems(moveChecklistItem(items, 'b', 'up'));
  assert.deepEqual(result.map((i) => i.id), ['b', 'a']);
});

test('moveChecklistItem swaps order with the next item when moving down', () => {
  const items = [
    { id: 'a', text: 'Zwembad', checked: false, order: 0 },
    { id: 'b', text: 'Luiken', checked: false, order: 1 },
  ];
  const result = sortChecklistItems(moveChecklistItem(items, 'a', 'down'));
  assert.deepEqual(result.map((i) => i.id), ['b', 'a']);
});

test('moveChecklistItem is a no-op when the item is already at the top and moving up', () => {
  const items = [
    { id: 'a', text: 'Zwembad', checked: false, order: 0 },
    { id: 'b', text: 'Luiken', checked: false, order: 1 },
  ];
  assert.deepEqual(moveChecklistItem(items, 'a', 'up'), items);
});

test('moveChecklistItem is a no-op when the item is already at the bottom and moving down', () => {
  const items = [
    { id: 'a', text: 'Zwembad', checked: false, order: 0 },
    { id: 'b', text: 'Luiken', checked: false, order: 1 },
  ];
  assert.deepEqual(moveChecklistItem(items, 'b', 'down'), items);
});

test('escapeHtml escapes the 5 HTML-sensitive characters', () => {
  assert.equal(
    escapeHtml(`<script>alert("x")</script> & 'quotes'`),
    '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;quotes&#39;'
  );
});

test('computeMeterIntervals returns one interval per consecutive pair of readings, sorted by date', () => {
  const readings = [
    { date: '2026-03-01', reading: 100 },
    { date: '2026-01-01', reading: 40 },
    { date: '2026-02-01', reading: 70 },
  ];
  assert.deepEqual(computeMeterIntervals(readings), [
    { dateFrom: '2026-01-01', dateTo: '2026-02-01', days: 31, consumption: 30, avgPerDay: 30 / 31 },
    { dateFrom: '2026-02-01', dateTo: '2026-03-01', days: 28, consumption: 30, avgPerDay: 30 / 28 },
  ]);
});

test('computeMeterIntervals returns an empty array for fewer than 2 readings', () => {
  assert.deepEqual(computeMeterIntervals([]), []);
  assert.deepEqual(computeMeterIntervals([{ date: '2026-01-01', reading: 40 }]), []);
});

test('computeMeterIntervals skips a pair with duplicate/out-of-order dates instead of dividing by zero', () => {
  const readings = [
    { date: '2026-01-01', reading: 40 },
    { date: '2026-01-01', reading: 41 },
    { date: '2026-02-01', reading: 70 },
  ];
  assert.deepEqual(computeMeterIntervals(readings), [
    { dateFrom: '2026-01-01', dateTo: '2026-02-01', days: 31, consumption: 29, avgPerDay: 29 / 31 },
  ]);
});

test('extrapolateDailyConsumption spreads each interval evenly over its days, excluding the closing day (owned by the next interval)', () => {
  const readings = [
    { date: '2026-01-01', reading: 0 },
    { date: '2026-01-04', reading: 6 },
  ];
  assert.deepEqual(extrapolateDailyConsumption(readings), {
    '2026-01-01': 2,
    '2026-01-02': 2,
    '2026-01-03': 2,
  });
});

test('buildMonthlyConsumption returns 12 monthly totals for the given year, extrapolated from readings', () => {
  const readings = [
    { date: '2026-01-01', reading: 0 },
    { date: '2026-03-01', reading: 59 },
  ];
  const totals = buildMonthlyConsumption(readings, 2026);
  assert.equal(totals.length, 12);
  assert.equal(totals[0], 31);
  assert.equal(totals[1], 28);
  assert.equal(totals[2], 0);
});

test('buildMonthlyConsumption ignores days that fall outside the requested year', () => {
  const readings = [
    { date: '2025-12-01', reading: 0 },
    { date: '2026-01-11', reading: 41 },
  ];
  const totals = buildMonthlyConsumption(readings, 2026);
  assert.equal(totals[0], 10);
});

test('buildYearlyConsumption returns totals per calendar year, sorted ascending', () => {
  const readings = [
    { date: '2025-12-01', reading: 0 },
    { date: '2026-01-01', reading: 31 },
    { date: '2026-02-01', reading: 62 },
  ];
  const totals = buildYearlyConsumption(readings);
  assert.deepEqual(totals.map((t) => t.year), ['2025', '2026']);
  assert.equal(totals[0].total, 31);
  assert.equal(totals[1].total, 31);
});

test('validateMeterReading requires a date and a numeric reading', () => {
  const result = validateMeterReading([], { date: '', reading: '' });
  assert.equal(result.valid, false);
  assert.equal(result.errors.date, 'Datum is verplicht.');
  assert.equal(result.errors.reading, 'Meterstand is verplicht.');
});

test('validateMeterReading accepts a first reading with no history', () => {
  const result = validateMeterReading([], { date: '2026-01-01', reading: 100 });
  assert.equal(result.valid, true);
});

test('validateMeterReading rejects a reading lower than the previous (older) reading', () => {
  const existing = [{ date: '2026-01-01', reading: 100 }];
  const result = validateMeterReading(existing, { date: '2026-02-01', reading: 90 });
  assert.equal(result.valid, false);
  assert.match(result.errors.reading, /minstens 100/);
});

test('validateMeterReading rejects a reading higher than the next (newer) reading', () => {
  const existing = [{ date: '2026-03-01', reading: 100 }];
  const result = validateMeterReading(existing, { date: '2026-02-01', reading: 110 });
  assert.equal(result.valid, false);
  assert.match(result.errors.reading, /hoogstens 100/);
});

test('validateMeterReading accepts a reading correctly between an older and newer reading', () => {
  const existing = [
    { date: '2026-01-01', reading: 100 },
    { date: '2026-03-01', reading: 160 },
  ];
  const result = validateMeterReading(existing, { date: '2026-02-01', reading: 130 });
  assert.equal(result.valid, true);
});

test('daysInMonth returns the correct day count, including February in a leap vs. non-leap year', () => {
  assert.equal(daysInMonth(2026, 1), 31);
  assert.equal(daysInMonth(2026, 2), 28);
  assert.equal(daysInMonth(2024, 2), 29);
  assert.equal(daysInMonth(2026, 4), 30);
});

test('padSeriesValues pads a shorter array with zeros up to the requested length', () => {
  assert.deepEqual(padSeriesValues([1, 2, 3], 7), [1, 2, 3, 0, 0, 0, 0]);
});

test('padSeriesValues returns exactly the requested length even when values is empty', () => {
  assert.deepEqual(padSeriesValues([], 3), [0, 0, 0]);
});

test('padSeriesValues truncates an array longer than the requested length', () => {
  assert.deepEqual(padSeriesValues([1, 2, 3, 4, 5], 3), [1, 2, 3]);
});

test('padTodaySeries fills a full day (00:00-23:55) at the observed step, with 0 outside the known range', () => {
  const { labels, values } = padTodaySeries(['06:40', '06:45', '06:50'], [10, 20, 30]);
  assert.equal(labels[0], '00:00');
  assert.equal(labels[labels.length - 1], '23:55');
  assert.equal(labels.length, 288); // 24h / 5 min
  assert.equal(values[labels.indexOf('06:40')], 10);
  assert.equal(values[labels.indexOf('06:45')], 20);
  assert.equal(values[labels.indexOf('06:50')], 30);
  assert.equal(values[0], 0);
  assert.equal(values[values.length - 1], 0);
});

test('padTodaySeries defaults to a 5-minute step when fewer than 2 data points are available', () => {
  const { labels, values } = padTodaySeries([], []);
  assert.equal(labels.length, 288);
  assert.ok(values.every((v) => v === 0));
});

test('getArchiveDailySeries returns the requested field of a month document', () => {
  const docs = { '2026-07': { solar: [1, 2, 3], grid: [4, 5, 6] } };
  assert.deepEqual(getArchiveDailySeries(docs, '2026-07', 'solar'), [1, 2, 3]);
  assert.deepEqual(getArchiveDailySeries(docs, '2026-07', 'grid'), [4, 5, 6]);
});

test('getArchiveDailySeries returns an empty array for a missing month', () => {
  assert.deepEqual(getArchiveDailySeries({}, '2026-07', 'solar'), []);
});

test('buildMonthlySeriesFromArchive sums each month of a year, using 0 for months without a document', () => {
  const docs = {
    '2026-01': { solar: [1, 2, 3] },
    '2026-03': { solar: [10, 10] },
  };
  const result = buildMonthlySeriesFromArchive(docs, 2026, 'solar');
  assert.equal(result.length, 12);
  assert.equal(result[0], 6);
  assert.equal(result[1], 0);
  assert.equal(result[2], 20);
  assert.equal(result[11], 0);
});

test('buildMonthlySeriesFromArchive coerces non-finite entries to 0 while summing', () => {
  const docs = { '2026-05': { grid: [1, null, 'x', 2] } };
  assert.equal(buildMonthlySeriesFromArchive(docs, 2026, 'grid')[4], 3);
});

test('buildYearlySeriesFromArchive sums all months per year and sorts years ascending', () => {
  const docs = {
    '2025-12': { grid: [5] },
    '2026-01': { grid: [1, 2] },
    '2026-02': { grid: [3] },
  };
  const result = buildYearlySeriesFromArchive(docs, 'grid');
  assert.deepEqual(result.years, ['2025', '2026']);
  assert.deepEqual(result.values, [5, 6]);
});

test('buildYearlySeriesFromArchive returns empty arrays when there is no archive data', () => {
  const result = buildYearlySeriesFromArchive({}, 'grid');
  assert.deepEqual(result.years, []);
  assert.deepEqual(result.values, []);
});

test('sumArchiveDateRange sums a range within a single month, excluding the exclusive end date', () => {
  const docs = { '2026-07': { grid: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] } };
  // dagen 8 t.e.m. 10 (index 7,8,9) van juli, dateTo exclusief
  assert.equal(sumArchiveDateRange(docs, '2026-07-08', '2026-07-11', 'grid'), 8 + 9 + 10);
});

test('sumArchiveDateRange sums across a month boundary', () => {
  const docs = {
    '2026-07': { grid: new Array(31).fill(1) },
    '2026-08': { grid: new Array(31).fill(2) },
  };
  // 30 en 31 juli (2×1) + 1 augustus (1×2), dateTo exclusief
  assert.equal(sumArchiveDateRange(docs, '2026-07-30', '2026-08-02', 'grid'), 1 + 1 + 2);
});

test('sumArchiveDateRange treats missing months/days as 0', () => {
  assert.equal(sumArchiveDateRange({}, '2026-07-01', '2026-07-05', 'grid'), 0);
});

test('averageDailyConsumption divides the summed grid consumption by the number of nights', () => {
  const docs = { '2026-07': { grid: [0, 0, 0, 0, 0, 0, 0, 10, 20, 30] } };
  // 8-11 juli = 3 nachten (checkoutdag 11 telt niet mee), dagen 8/9/10 -> 10+20+30
  const booking = { dateFrom: '2026-07-08', dateTo: '2026-07-11' };
  assert.equal(averageDailyConsumption(booking, docs), 20);
});

test('averageDailyConsumption returns null for a same-day (0-night) booking', () => {
  const booking = { dateFrom: '2026-07-08', dateTo: '2026-07-08' };
  assert.equal(averageDailyConsumption(booking, {}), null);
});
