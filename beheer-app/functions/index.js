import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore();

const ALLOWED_EMAILS = ['johan.rodeyns@gmail.com', 'tinbogaerts@gmail.com'];
const SOURCES = ['airbnb', 'booking'];

// Kept in sync by hand with logic.js's parseIcalEvents/mergeSyncedBlocks — Cloud Functions
// only deploy this functions/ directory, so importing ../logic.js would not survive deploy.
// No iCal library dependency on purpose: node-ical (via axios) hung indefinitely on require
// in this environment, blocking `firebase deploy`'s local source-analysis step entirely.
function icsDateValueToIso(value) {
  const digits = value.replace(/[^0-9]/g, '').slice(0, 8);
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

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

async function syncSource(source) {
  const feedDoc = await db.collection('icalFeeds').doc(source).get();
  const url = feedDoc.exists ? feedDoc.data().url : null;
  if (!url) return;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`iCal-feed ophalen mislukt voor ${source}: HTTP ${response.status}`);
  const icsText = await response.text();
  const events = parseIcalEvents(icsText);

  const existingSnapshot = await db.collection('syncedBlocks').where('source', '==', source).get();
  const existingBlocks = existingSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  const merged = mergeSyncedBlocks(existingBlocks, events, source);

  const batch = db.batch();
  existingSnapshot.docs.forEach((d) => batch.delete(d.ref));
  merged.forEach(({ id, ...data }) => batch.set(db.collection('syncedBlocks').doc(id), data));
  batch.set(db.collection('icalFeeds').doc(source), { url, lastSyncedAt: new Date() }, { merge: true });
  await batch.commit();
}

async function syncAllSources() {
  for (const source of SOURCES) {
    await syncSource(source);
  }
}

export const syncIcalFeeds = onSchedule('every 3 hours', async () => {
  await syncAllSources();
});

export const syncIcalFeedsNow = onCall(async (request) => {
  const email = request.auth?.token?.email?.toLowerCase();
  if (!email || !ALLOWED_EMAILS.includes(email)) {
    throw new HttpsError('permission-denied', 'Geen toegang.');
  }
  await syncAllSources();
  return { success: true };
});
