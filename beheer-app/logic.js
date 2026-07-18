const VERSION = '0.13.1';

function getVersion() {
  return VERSION;
}

function isAllowedEmail(email, allowedEmails) {
  const normalized = email.toLowerCase();
  return allowedEmails.some((allowed) => allowed.toLowerCase() === normalized);
}

function toIsoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function buildMonthGrid(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay(); // 0 = Sunday
  const leadingBlanks = (firstWeekday + 6) % 7; // Monday-first offset

  const cells = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(toIsoDate(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function computeDerivedPrice(airbnbPrice, formula) {
  if (airbnbPrice == null) return null;
  return airbnbPrice * formula.factor + formula.offset;
}

function computeDisplayPrice(mode, airbnbPrice, formulaSettings) {
  if (mode === 'airbnb') return airbnbPrice ?? null;
  return computeDerivedPrice(airbnbPrice, formulaSettings[mode]);
}

function getDateRange(dateA, dateB) {
  const [start, end] = dateA <= dateB ? [dateA, dateB] : [dateB, dateA];
  const dates = [];
  const cursor = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');
  while (cursor <= endDate) {
    dates.push(toIsoDate(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate()));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function getPreviousYearDate(date) {
  const year = Number(date.slice(0, 4));
  return `${year - 1}${date.slice(4)}`;
}

function nightsBetween(dateFrom, dateTo) {
  const from = new Date(dateFrom + 'T00:00:00');
  const to = new Date(dateTo + 'T00:00:00');
  return Math.round((to - from) / 86400000);
}

function validateBooking(booking) {
  const errors = {};
  if (!booking.dateFrom) errors.dateFrom = 'Datum van is verplicht.';
  if (!booking.dateTo) errors.dateTo = 'Datum tot is verplicht.';
  if (booking.dateFrom && booking.dateTo && booking.dateTo <= booking.dateFrom) {
    errors.dateTo = 'Datum tot moet na datum van liggen.';
  }
  if (!booking.name || !booking.name.trim()) errors.name = 'Naam is verplicht.';
  if (!booking.platform) errors.platform = 'Platform is verplicht.';
  return { valid: Object.keys(errors).length === 0, errors };
}

function overlapsExistingBooking(newBooking, existingBookings, syncedBlocks) {
  const rangesOverlap = (a, b) => a.dateFrom < b.dateTo && b.dateFrom < a.dateTo;
  const bookingOverlaps = existingBookings
    .filter((b) => b.id !== newBooking.id)
    .filter((b) => rangesOverlap(newBooking, b));
  const blockOverlaps = (syncedBlocks || []).filter((block) => rangesOverlap(newBooking, block));
  return [...bookingOverlaps, ...blockOverlaps];
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getVersion, isAllowedEmail, buildMonthGrid, computeDerivedPrice, computeDisplayPrice,
    getDateRange, getPreviousYearDate, nightsBetween, validateBooking, overlapsExistingBooking,
  };
}
