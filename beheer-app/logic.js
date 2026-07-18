const VERSION = '0.23.0';

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

function icsDateValueToIso(value) {
  const digits = value.replace(/[^0-9]/g, '').slice(0, 8);
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

// Minimal, dependency-free VEVENT parser (no node-ical/axios — those pulled in
// a hanging dependency chain that broke Cloud Functions deploy on a slow/network
// filesystem). functions/index.js keeps its own copy — keep both in sync.
function parseIcalEvents(icsText) {
  const lines = icsText.split(/\r\n|\n|\r/);
  const events = [];
  let current = null;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === 'BEGIN:VEVENT') {
      current = {};
    } else if (line === 'END:VEVENT') {
      if (current && current.uid && current.dateFrom && current.dateTo) {
        events.push({ uid: current.uid, dateFrom: current.dateFrom, dateTo: current.dateTo });
      }
      current = null;
    } else if (current) {
      const separatorIndex = line.indexOf(':');
      if (separatorIndex === -1) continue;
      const key = line.slice(0, separatorIndex).split(';')[0];
      const value = line.slice(separatorIndex + 1);
      if (key === 'UID') current.uid = value;
      else if (key === 'DTSTART') current.dateFrom = icsDateValueToIso(value);
      else if (key === 'DTEND') current.dateTo = icsDateValueToIso(value);
    }
  }
  return events;
}

// Computes the full desired syncedBlocks list for one source (full replace, not a diff).
// functions/index.js keeps its own copy of this function — keep both in sync.
function mergeSyncedBlocks(existingBlocks, parsedEvents, source) {
  const otherSourceBlocks = existingBlocks.filter((b) => b.source !== source);
  const newSourceBlocks = parsedEvents.map((e) => ({
    id: `${source}-${e.uid}`,
    source,
    icalUid: e.uid,
    dateFrom: e.dateFrom,
    dateTo: e.dateTo,
  }));
  return [...otherSourceBlocks, ...newSourceBlocks];
}

function buildOccupancyMap(bookings, syncedBlocks) {
  const map = {};
  const addEntries = (items, type) => {
    items.forEach((item) => {
      getDateRange(item.dateFrom, item.dateTo).forEach((date) => {
        if (!map[date]) map[date] = [];
        map[date].push({ type, ...item });
      });
    });
  };
  addEntries(bookings, 'booking');
  addEntries(syncedBlocks, 'syncedBlock');
  return map;
}

function dayOccupancyState(date, occupancyMap) {
  const entries = occupancyMap[date] || [];
  if (entries.length === 0) return 'vrij';

  // Bookings are manually verified and authoritative; a synced block can be stale
  // (host changed the external calendar since the last sync) so it must never override
  // a booking's own boundary classification for a date the booking already covers.
  const bookingEntries = entries.filter((e) => e.type === 'booking');
  const relevantEntries = bookingEntries.length > 0 ? bookingEntries : entries;

  const isFullDay = relevantEntries.some((e) => e.dateFrom !== date && e.dateTo !== date);
  if (isFullDay) return 'bezet';

  const hasArrival = relevantEntries.some((e) => e.dateFrom === date && e.dateTo !== date);
  const hasDeparture = relevantEntries.some((e) => e.dateTo === date && e.dateFrom !== date);
  if (hasArrival && hasDeparture) return 'bezet'; // same-day turnover: both halves covered
  if (hasArrival) return 'aankomst';
  if (hasDeparture) return 'vertrek';
  return 'bezet'; // fallback: a same-day dateFrom===dateTo entry
}

function upcomingBookings(bookings, today) {
  return bookings
    .filter((b) => b.dateTo >= today)
    .sort((a, b) => a.dateFrom.localeCompare(b.dateFrom));
}

// formatDateRange(dateFrom, dateTo) is injected so this stays locale-agnostic —
// the caller (index.html) supplies the actual nl-BE date formatting.
function formatBookingsListForContact(bookings, formatDateRange) {
  if (bookings.length === 0) return null;
  return bookings
    .map((b) => {
      const nights = nightsBetween(b.dateFrom, b.dateTo);
      const nameLine = b.language ? `👤 ${b.name} (${b.language})` : `👤 ${b.name}`;
      const adults = b.adultsCount ?? 0;
      const children = b.childrenCount ?? 0;
      return [
        `📅 ${formatDateRange(b.dateFrom, b.dateTo)} (${nights} ${nights === 1 ? 'nacht' : 'nachten'})`,
        nameLine,
        `📞 ${b.phone || '—'}`,
        `👥 ${adults} ${adults === 1 ? 'volwassene' : 'volwassenen'}, ${children} ${children === 1 ? 'kind' : 'kinderen'}`,
        `📝 ${b.remark || '—'}`,
      ].join('\n');
    })
    .join('\n\n');
}

// Same date/name-formatting convention as formatBookingsListForContact, but limited to
// the fields the tuinier (gardener) needs: no phone, guest counts or remark.
function formatBookingsListForGardener(bookings, formatDateRange) {
  if (bookings.length === 0) return null;
  return bookings
    .map((b) => {
      const nameLine = b.language ? `👤 ${b.name} (${b.language})` : `👤 ${b.name}`;
      return [`📅 ${formatDateRange(b.dateFrom, b.dateTo)}`, nameLine].join('\n');
    })
    .join('\n\n');
}

const SYNCABLE_PLATFORMS = ['airbnb', 'booking'];

function findUnmatchedBookings(bookings, syncedBlocks) {
  return bookings.filter((b) => {
    if (!SYNCABLE_PLATFORMS.includes(b.platform)) return false;
    return !syncedBlocks.some(
      (block) => block.source === b.platform && block.dateFrom === b.dateFrom && block.dateTo === b.dateTo
    );
  });
}

function findUnmatchedSyncedBlocks(bookings, syncedBlocks) {
  return syncedBlocks.filter((block) => {
    return !bookings.some(
      (b) => b.platform === block.source && b.dateFrom === block.dateFrom && b.dateTo === block.dateTo
    );
  });
}

function dayDisplayLabel(date, occupancyMap, state) {
  if (state === 'vrij') return 'Vrij';
  const guestNames = (occupancyMap[date] || [])
    .filter((e) => e.type === 'booking')
    // On a same-day turnover, list who's leaving before who's arriving.
    .sort((a, b) => (a.dateTo === date ? 0 : 1) - (b.dateTo === date ? 0 : 1))
    .map((e) => e.name);
  if (guestNames.length === 0) return 'Bezet';
  if (guestNames.length === 1) return guestNames[0];
  // Same-day turnover: first names only, so both guests still fit in a narrow calendar cell.
  // The full names remain available in the day-detail view.
  return guestNames.map((name) => name.trim().split(/\s+/)[0]).join(' / ');
}

const WEEKDAY_ABBREVIATIONS = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za']; // index = Date#getDay()

function weekdayAbbreviation(date) {
  return WEEKDAY_ABBREVIATIONS[new Date(date + 'T00:00:00').getDay()];
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getVersion, isAllowedEmail, buildMonthGrid, computeDerivedPrice, computeDisplayPrice,
    getDateRange, getPreviousYearDate, nightsBetween, validateBooking, overlapsExistingBooking,
    parseIcalEvents, mergeSyncedBlocks, buildOccupancyMap, dayOccupancyState,
    upcomingBookings, formatBookingsListForContact, formatBookingsListForGardener,
    findUnmatchedBookings, findUnmatchedSyncedBlocks, dayDisplayLabel, weekdayAbbreviation,
  };
}
