import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';
import { buildHeaders } from './lib/apsystemsSign.js';
import { decideAlertState } from './lib/casaAngelaMonitor.js';
import { daysInMonth, previousYyyyMm, isMonthComplete, padMonthArray, archiveThroughDate } from './lib/energyArchive.js';

initializeApp();
const db = getFirestore();

const ALLOWED_EMAILS = ['johan.rodeyns@gmail.com', 'tinbogaerts@gmail.com'];
const SOURCES = ['airbnb', 'booking'];
const GMAIL_APP_PASSWORD = defineSecret('GMAIL_APP_PASSWORD');

function requireAllowedUser(request) {
  const email = request.auth?.token?.email?.toLowerCase();
  if (!email || !ALLOWED_EMAILS.includes(email)) {
    throw new HttpsError('permission-denied', 'Geen toegang.');
  }
  return email;
}

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

// Kept in sync by hand with logic.js's diffSyncedBlocks — see that file for why this diff
// exists at all (a naive per-run create/delete log would flood the audit log every 3 hours,
// since a sync run always deletes-and-recreates every block for a source).
function diffSyncedBlocks(before, after) {
  const beforeById = new Map(before.map((b) => [b.id, b]));
  const afterById = new Map(after.map((b) => [b.id, b]));
  const changes = [];

  afterById.forEach((block, id) => {
    const prior = beforeById.get(id);
    if (!prior) {
      changes.push({ docId: id, action: 'create', before: null, after: block });
    } else if (prior.dateFrom !== block.dateFrom || prior.dateTo !== block.dateTo) {
      changes.push({ docId: id, action: 'update', before: prior, after: block });
    }
  });
  beforeById.forEach((block, id) => {
    if (!afterById.has(id)) {
      changes.push({ docId: id, action: 'delete', before: block, after: null });
    }
  });

  return changes;
}

async function syncSource(source, actorEmail) {
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
  const changes = diffSyncedBlocks(existingBlocks, merged);

  const batch = db.batch();
  existingSnapshot.docs.forEach((d) => batch.delete(d.ref));
  merged.forEach(({ id, ...data }) => batch.set(db.collection('syncedBlocks').doc(id), data));
  batch.set(db.collection('icalFeeds').doc(source), { url, lastSyncedAt: new Date() }, { merge: true });
  changes.forEach((change) => {
    batch.set(db.collection('auditLog').doc(), {
      collection: 'syncedBlocks',
      docId: change.docId,
      action: change.action,
      email: actorEmail,
      timestamp: new Date(),
      before: change.before,
      after: change.after,
    });
  });
  await batch.commit();
}

async function syncAllSources(actorEmail) {
  for (const source of SOURCES) {
    await syncSource(source, actorEmail);
  }
}

export const syncIcalFeeds = onSchedule('every 3 hours', async () => {
  await syncAllSources('systeem (automatische sync)');
});

export const syncIcalFeedsNow = onCall(async (request) => {
  const email = requireAllowedUser(request);
  await syncAllSources(email);
  return { success: true };
});

// ===== Nuts (zonnepanelen via APsystems) — gekopieerd/geport uit de Huishouden-app =====
// CORS-proxy voor APsystems OpenAPI — directe browser-calls worden geblokkeerd omdat
// api.apsystemsema.com:9282 geen Access-Control-Allow-Origin headers stuurt.
const APSYSTEMS_BASE_URL = 'https://api.apsystemsema.com:9282';

function nutsSettingsDoc() {
  return db.collection('settings').doc('apsystems');
}

// Vertaal een APsystems response-code naar een leesbare NL-melding.
function nutsCodeMessage(code) {
  const map = {
    1001: 'Geen data beschikbaar voor deze periode.',
    2002: 'Account is niet geautoriseerd voor deze data.',
    2004: 'Account heeft geen toegang tot deze data.',
    2005: 'Maandelijkse API-limiet (1000 calls) bereikt.',
    3002: 'Authenticatie mislukt — controleer App ID en Secret.',
    7001: 'API-limiet overschreden.',
    7002: 'Te veel verzoeken — probeer straks opnieuw.',
    7003: 'APsystems is tijdelijk druk — probeer straks opnieuw.',
  };
  return map[code] || `APsystems gaf code ${code}.`;
}

// Gedeelde GET-helper voor de End User API: fetch + JSON-parse + code-check.
// Geeft parsed.data terug, of gooit een HttpsError. App Secret wordt nooit gelogd.
async function nutsGetJson(url, headers) {
  let res;
  try {
    res = await fetch(url, { method: 'GET', headers });
  } catch (err) {
    console.error('APsystems network error:', err.message);
    throw new HttpsError('unavailable', `Netwerkfout: ${err.message}`);
  }
  const bodyText = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    console.error('APsystems non-JSON response, HTTP', res.status);
    throw new HttpsError('unavailable', `Onverwacht antwoord (HTTP ${res.status}).`);
  }
  if (parsed.code !== 0) {
    throw new HttpsError('internal', nutsCodeMessage(parsed.code));
  }
  return parsed.data;
}

// Validatie van de basis-credentials uit request.data. Retourneert {id, appSecret, systemId}.
function nutsRequireCreds(data) {
  const { appId, appSecret, sid } = data || {};
  if (typeof appId !== 'string' || appId.trim() === '') {
    throw new HttpsError('invalid-argument', 'appId ontbreekt.');
  }
  if (typeof appSecret !== 'string' || appSecret === '') {
    throw new HttpsError('invalid-argument', 'appSecret ontbreekt.');
  }
  if (typeof sid !== 'string' || sid.trim() === '') {
    throw new HttpsError('invalid-argument', 'sid ontbreekt.');
  }
  return { id: appId.trim(), appSecret, systemId: sid.trim() };
}

// Dagoverzicht (today/month/year/lifetime kWh).
export const casaAngelaSummary = onCall({ timeoutSeconds: 30 }, async (request) => {
  requireAllowedUser(request);
  const { id, appSecret, systemId } = nutsRequireCreds(request.data);
  const headers = await buildHeaders(id, appSecret, systemId, 'GET');
  const d = (await nutsGetJson(
    `${APSYSTEMS_BASE_URL}/user/api/v2/systems/summary/${systemId}`,
    headers,
  )) || {};
  return { today: d.today, month: d.month, year: d.year, lifetime: d.lifetime };
});

// ECU's van het systeem — levert de EID('s) zodat de gebruiker die niet handmatig hoeft
// op te zoeken.
export const casaAngelaInverters = onCall({ timeoutSeconds: 30 }, async (request) => {
  requireAllowedUser(request);
  const { id, appSecret, systemId } = nutsRequireCreds(request.data);
  const headers = await buildHeaders(id, appSecret, systemId, 'GET');
  const data = await nutsGetJson(
    `${APSYSTEMS_BASE_URL}/user/api/v2/systems/inverters/${systemId}`,
    headers,
  );
  const devices = Array.isArray(data) ? data.map((x) => ({ eid: x.eid, type: x.type })) : [];
  return { devices };
});

// Vermogen per tijdstip vandaag (minutely) → grafiek + huidig vermogen.
export const casaAngelaToday = onCall({ timeoutSeconds: 30 }, async (request) => {
  requireAllowedUser(request);
  const { id, appSecret, systemId } = nutsRequireCreds(request.data);
  const { eid, date } = request.data || {};
  if (typeof eid !== 'string' || eid.trim() === '') {
    throw new HttpsError('invalid-argument', 'eid ontbreekt.');
  }
  const ecuId = eid.trim();
  const dateRange = (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date))
    ? date
    : new Date().toISOString().slice(0, 10);
  const headers = await buildHeaders(id, appSecret, ecuId, 'GET');
  const data = await nutsGetJson(
    `${APSYSTEMS_BASE_URL}/user/api/v2/systems/${systemId}/devices/ecu/energy/${ecuId}` +
      `?energy_level=minutely&date_range=${dateRange}`,
    headers,
  ) || {};
  return {
    time: Array.isArray(data.time) ? data.time : [],
    power: Array.isArray(data.power) ? data.power : [],
    energy: Array.isArray(data.energy) ? data.energy : [],
    today: data.today,
  };
});

// Historie — system-level energie per periode (kWh-lijst).
// level: daily (date_range=YYYY-MM) | monthly (date_range=YYYY) | yearly (geen date_range).
export const casaAngelaEnergy = onCall({ timeoutSeconds: 30 }, async (request) => {
  requireAllowedUser(request);
  const { id, appSecret, systemId } = nutsRequireCreds(request.data);
  const { level, dateRange } = request.data || {};
  if (!['daily', 'monthly', 'yearly'].includes(level)) {
    throw new HttpsError('invalid-argument', 'level moet daily, monthly of yearly zijn.');
  }
  let qs = `?energy_level=${level}`;
  if (level !== 'yearly') {
    if (typeof dateRange !== 'string' || !/^\d{4}(-\d{2})?$/.test(dateRange)) {
      throw new HttpsError('invalid-argument', 'dateRange ontbreekt of heeft fout formaat.');
    }
    qs += `&date_range=${dateRange}`;
  }
  const headers = await buildHeaders(id, appSecret, systemId, 'GET');
  const data = await nutsGetJson(
    `${APSYSTEMS_BASE_URL}/user/api/v2/systems/energy/${systemId}${qs}`,
    headers,
  );
  return { values: Array.isArray(data) ? data : [] };
});

// Netstroom (exported): Meter-level Data API, onderdeel van de officiële, ondertekende
// Open API sinds diens v1.3. Zelfde credentials/HMAC-signing als Zonnestroom, enkel een
// "meter"-eid i.p.v. het inverter/ECU-eid — in de praktijk vaak dezelfde ECU (type 'ECU
// with meter activated'), dus hergebruikt de UI voorlopig hetzelfde EID-veld als Zonnestroom.
// level: hourly (date_range=YYYY-MM-DD) | daily (date_range=YYYY-MM) | monthly (date_range=YYYY)
// | yearly (geen date_range).
// LET OP (gevonden bij het naspeuren van HTTP 500-fouten in US-6.11): het pad hoort volgens
// de officiële "APsystems OpenAPI User Manual" (§3.4.2) onder /user/api/v2/..., NIET onder
// /installer/api/v2/... — dat laatste is enkel gedocumenteerd voor de storage/battery-
// endpoints. Was hier eerder foutief gebruikt; "hourly" (vandaag-per-uur) werkte toevallig nog
// via het foute pad, maar "minutely" en (na US-6.11) "daily"/"monthly" gaven allebei een
// niet-JSON HTTP 500 terug — vermoedelijk crasht APsystems' server op de installer-namespace
// zodra de aanvraag méér dan één dag data omvat.
export const casaAngelaMeterEnergy = onCall({ timeoutSeconds: 30 }, async (request) => {
  requireAllowedUser(request);
  const { id, appSecret, systemId } = nutsRequireCreds(request.data);
  const { eid, level, dateRange } = request.data || {};
  if (typeof eid !== 'string' || eid.trim() === '') {
    throw new HttpsError('invalid-argument', 'eid ontbreekt.');
  }
  if (!['hourly', 'daily', 'monthly', 'yearly'].includes(level)) {
    throw new HttpsError('invalid-argument', 'level moet hourly, daily, monthly of yearly zijn.');
  }
  const meterEid = eid.trim();
  let qs = `?energy_level=${level}`;
  if (level !== 'yearly') {
    if (typeof dateRange !== 'string' || !/^\d{4}(-\d{2}(-\d{2})?)?$/.test(dateRange)) {
      throw new HttpsError('invalid-argument', 'dateRange ontbreekt of heeft fout formaat.');
    }
    qs += `&date_range=${dateRange}`;
  }
  const headers = await buildHeaders(id, appSecret, meterEid, 'GET');
  const data = await nutsGetJson(
    `${APSYSTEMS_BASE_URL}/user/api/v2/systems/${systemId}/devices/meter/period/${meterEid}${qs}`,
    headers,
  ) || {};
  return { values: Array.isArray(data.exported) ? data.exported : [] };
});

// Stuur een storings- of herstelmail via Gmail SMTP. account = het Gmail-adres dat het
// app-wachtwoord bezit (= afzender = ontvanger). Secret nooit loggen.
async function sendNutsAlertMail(account, kind, ctx) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: account, pass: GMAIL_APP_PASSWORD.value() },
  });
  const when = new Date(ctx.nowMs).toLocaleString('nl-BE', { timeZone: 'Europe/Madrid' });
  const subject = kind === 'down'
    ? '⚠️ Nuts: geen zonnepaneel-data'
    : '✅ Nuts: panelen weer online';
  const text = kind === 'down'
    ? `Casa Angela stuurt geen productiedata meer door (gecontroleerd ${when}, Spaanse tijd).\n` +
      `Laatst bekende opbrengst vandaag: ${ctx.todayKwh} kWh.\n\n` +
      `Mogelijk is de zekering afgeslagen. Stuur iemand om ze te resetten.`
    : `Casa Angela stuurt weer data door (gecontroleerd ${when}, Spaanse tijd).\n` +
      `Opbrengst vandaag tot nu: ${ctx.todayKwh} kWh.`;
  await transporter.sendMail({ from: account, to: account, subject, text });
}

// Verwerk de (enige, gedeelde) monitor-settings — gedeeld door de cron en de force-knop.
async function processNutsMonitor(nowMs, todayDateStr) {
  const docSnap = await nutsSettingsDoc().get();
  const data = docSnap.data() || {};
  const account = data.alertEmail;
  if (!data.appId || !data.appSecret || !data.sid || !account) {
    return { status: 'skipped', reason: 'Configuratie onvolledig (App ID/Secret/SID/Alert-mail).' };
  }

  let todayKwh;
  try {
    const headers = await buildHeaders(String(data.appId).trim(), data.appSecret, String(data.sid).trim(), 'GET');
    const summary = await nutsGetJson(
      `${APSYSTEMS_BASE_URL}/user/api/v2/systems/summary/${String(data.sid).trim()}`,
      headers,
    );
    todayKwh = Number(summary && summary.today);
  } catch (err) {
    console.error('Nuts-monitor: summary-fout, monitor overgeslagen:', err.message);
    return { status: 'skipped', reason: 'APsystems-fout: ' + err.message };
  }
  if (!Number.isFinite(todayKwh)) {
    return { status: 'skipped', reason: 'today niet parseerbaar' };
  }

  const prevState = data.monitorState || null;
  const decision = decideAlertState(prevState, todayKwh, nowMs, todayDateStr);

  let mailKind = null;
  try {
    if (decision.sendAlert) { await sendNutsAlertMail(account, 'down', { nowMs, todayKwh }); mailKind = 'down'; }
    else if (decision.sendRecovery) { await sendNutsAlertMail(account, 'up', { nowMs, todayKwh }); mailKind = 'up'; }
  } catch (err) {
    console.error('Nuts-monitor: mail versturen mislukt:', err.message);
  }

  await docSnap.ref.set({ monitorState: decision.newState }, { merge: true });

  return {
    status: mailKind === 'down' ? 'alerted' : mailKind === 'up' ? 'recovered' : 'ok',
    todayKwh,
    consecutiveFlat: decision.newState.consecutiveFlat,
    alerted: decision.newState.alerted,
  };
}

// Elk uur 9–18u Spaanse tijd checken of er nog productiedata binnenkomt.
export const casaAngelaMonitor = onSchedule(
  { schedule: '0 9-18 * * *', timeZone: 'Europe/Madrid', secrets: [GMAIL_APP_PASSWORD], timeoutSeconds: 120 },
  async () => {
    const nowMs = Date.now();
    const todayDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
    await processNutsMonitor(nowMs, todayDateStr);
  },
);

// Handmatig één check forceren (om te testen). Twee opeenvolgende klikken met de
// zekering uit = storingsmail.
export const casaAngelaMonitorRunNow = onCall(
  { secrets: [GMAIL_APP_PASSWORD], timeoutSeconds: 30 },
  async (request) => {
    requireAllowedUser(request);
    const nowMs = Date.now();
    const todayDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
    return await processNutsMonitor(nowMs, todayDateStr);
  },
);

// Handmatige test — stuurt één testmail zodat we mailverzending kunnen valideren zonder
// op de cron te wachten.
export const casaAngelaMonitorTest = onCall(
  { secrets: [GMAIL_APP_PASSWORD], timeoutSeconds: 30 },
  async (request) => {
    requireAllowedUser(request);
    const email = request.data && request.data.email;
    if (typeof email !== 'string' || !email.includes('@')) {
      throw new HttpsError('invalid-argument', 'Geldig e-mailadres vereist.');
    }
    try {
      await sendNutsAlertMail(email, 'down', { nowMs: Date.now(), todayKwh: '—' });
    } catch (err) {
      console.error('Nuts testmail mislukt:', err.message);
      throw new HttpsError('internal', `Mail mislukt: ${err.message}`);
    }
    return { ok: true };
  },
);

// Dagelijkse archivering van zonnestroom-/netstroom-dagverbruik in energyHistory/{YYYY-MM}
// (US-6.11) — bedoeld om toekomstige rapportages (bv. gemiddeld verbruik per boeking) op
// goedkope Firestore-reads te laten draaien i.p.v. telkens opnieuw APsystems-calls te doen
// (1000/maand-quota). Enkel volledige dagen tellen mee, dus enkel "daily"-niveau per maand
// (intraday-detail is hier niet nodig, zie US-6.11-bespreking). Elke run ververst de huidige
// maand (nooit compleet, dus altijd opnieuw) en de vorige maand (enkel als die nog niet als
// compleet in Firestore staat), en bouwt daarna terugwaarts de historie op tot APsystems een
// "geen data"-antwoord geeft (vóór de meter-installatie) — zelf-hervattend over meerdere
// dagelijkse runs via de MAX_BACKFILL_MONTHS_PER_RUN-cap, zodat één run nooit te lang duurt.
const MAX_BACKFILL_MONTHS_PER_RUN = 60;
const APSYSTEMS_NO_DATA_CODE = 1001;

function energyHistoryDoc(yyyymm) {
  return db.collection('energyHistory').doc(yyyymm);
}
function energyHistoryMetaDoc() {
  return db.collection('energyHistory').doc('_meta');
}

// Zelfde vorm als nutsGetJson, maar gooit nooit — geeft een resultaat-object terug zodat de
// backfill-lus zelf kan beslissen of "geen data" de terugwaartse grens betekent, dan wel een
// gewone (mogelijk tijdelijke) fout is die morgen opnieuw geprobeerd moet worden.
async function archiveFetchJson(url, headers) {
  let res;
  try {
    res = await fetch(url, { method: 'GET', headers });
  } catch (err) {
    return { ok: false, noData: false, error: `Netwerkfout: ${err.message}` };
  }
  const bodyText = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return { ok: false, noData: false, error: `Onverwacht antwoord (HTTP ${res.status}).` };
  }
  if (parsed.code !== 0) {
    return { ok: false, noData: parsed.code === APSYSTEMS_NO_DATA_CODE, error: nutsCodeMessage(parsed.code) };
  }
  return { ok: true, data: parsed.data };
}

// Haalt zonnestroom + netstroom dagverbruik op voor één kalendermaand en schrijft ze samen
// weg. status: 'stored' (gelukt), 'no-data' (APsystems-grens bereikt, bv. vóór installatie)
// of 'error' (tijdelijke/onbekende fout, morgen opnieuw proberen).
async function archiveMonth(creds, yyyymm, todayIso) {
  const solarHeaders = await buildHeaders(creds.appId, creds.appSecret, creds.sid, 'GET');
  const solarRes = await archiveFetchJson(
    `${APSYSTEMS_BASE_URL}/user/api/v2/systems/energy/${creds.sid}?energy_level=daily&date_range=${yyyymm}`,
    solarHeaders,
  );
  const gridHeaders = await buildHeaders(creds.appId, creds.appSecret, creds.eid, 'GET');
  const gridRes = await archiveFetchJson(
    `${APSYSTEMS_BASE_URL}/user/api/v2/systems/${creds.sid}/devices/meter/period/${creds.eid}?energy_level=daily&date_range=${yyyymm}`,
    gridHeaders,
  );

  if (!solarRes.ok && !gridRes.ok && solarRes.noData && gridRes.noData) {
    return { status: 'no-data' };
  }
  if (!solarRes.ok || !gridRes.ok) {
    return { status: 'error', error: solarRes.error || gridRes.error };
  }

  const solarArr = Array.isArray(solarRes.data) ? solarRes.data : [];
  const gridArr = Array.isArray(gridRes.data && gridRes.data.exported) ? gridRes.data.exported : [];
  const [y, m] = yyyymm.split('-').map(Number);
  const days = daysInMonth(y, m);
  await energyHistoryDoc(yyyymm).set({
    solar: padMonthArray(solarArr, days),
    grid: padMonthArray(gridArr, days),
    daysInMonth: days,
    complete: isMonthComplete(yyyymm, todayIso),
    throughDate: archiveThroughDate(yyyymm, todayIso),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return { status: 'stored' };
}

// Gedeeld door de dagelijkse cron en de "Forceer archivering nu"-knop (casaAngelaArchiveEnergyRunNow
// hieronder) — zelfde reden als processNutsMonitor hierboven.
async function runEnergyArchive() {
  const settingsSnap = await nutsSettingsDoc().get();
  const s = settingsSnap.data() || {};
  if (!s.appId || !s.appSecret || !s.sid || !s.eid) {
    return { skipped: true, reason: 'App ID/Secret/SID/EID nog niet ingesteld.' };
  }
  const creds = {
    appId: String(s.appId).trim(), appSecret: s.appSecret,
    sid: String(s.sid).trim(), eid: String(s.eid).trim(),
  };
  const todayIso = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
  const thisMonth = todayIso.slice(0, 7);
  const lastMonth = previousYyyyMm(thisMonth);

  const thisMonthResult = await archiveMonth(creds, thisMonth, todayIso);
  if (thisMonthResult.status !== 'stored') {
    console.error('Energy-archive: huidige maand niet ververst:', thisMonthResult);
  }

  let lastMonthResult = { status: 'skipped' };
  const lastMonthSnap = await energyHistoryDoc(lastMonth).get();
  if (!lastMonthSnap.exists || !lastMonthSnap.data().complete) {
    lastMonthResult = await archiveMonth(creds, lastMonth, todayIso);
    if (lastMonthResult.status !== 'stored') {
      console.error('Energy-archive: vorige maand niet ververst:', lastMonthResult);
    }
  }

  const metaSnap = await energyHistoryMetaDoc().get();
  const earliestKnown = metaSnap.exists ? metaSnap.data().earliestAvailableMonth : null;
  let cursor = previousYyyyMm(lastMonth);
  let monthsBackfilled = 0;
  let stoppedReason = 'cap';
  for (let i = 0; i < MAX_BACKFILL_MONTHS_PER_RUN; i++) {
    if (earliestKnown && cursor < earliestKnown) { stoppedReason = 'known-boundary'; break; }
    const existing = await energyHistoryDoc(cursor).get();
    if (existing.exists && existing.data().complete) { stoppedReason = 'already-complete'; break; }

    const result = await archiveMonth(creds, cursor, todayIso);
    if (result.status === 'no-data') {
      await energyHistoryMetaDoc().set({ earliestAvailableMonth: cursor }, { merge: true });
      stoppedReason = 'no-data';
      break;
    }
    if (result.status === 'error') {
      console.error('Energy-archive: backfill gestopt bij', cursor, result.error);
      stoppedReason = 'error: ' + result.error;
      break;
    }
    monthsBackfilled += 1;
    cursor = previousYyyyMm(cursor);
  }

  return {
    skipped: false,
    thisMonth: { month: thisMonth, status: thisMonthResult.status },
    lastMonth: { month: lastMonth, status: lastMonthResult.status },
    monthsBackfilled,
    stoppedReason,
  };
}

export const casaAngelaArchiveEnergy = onSchedule(
  { schedule: '0 3 * * *', timeZone: 'Europe/Madrid', timeoutSeconds: 300 },
  async () => { await runEnergyArchive(); },
);

// "Forceer archivering nu"-knop (Zonnestroom > Instellingen) — zelfde patroon als
// casaAngelaMonitorRunNow, om niet op de nachtelijke cron te moeten wachten.
export const casaAngelaArchiveEnergyRunNow = onCall(
  { timeoutSeconds: 300 },
  async (request) => {
    requireAllowedUser(request);
    return await runEnergyArchive();
  },
);
