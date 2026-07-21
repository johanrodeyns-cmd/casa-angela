// Pure helpers voor de dagelijkse energie-archivering (US-6.11) — geen IO, volledig testbaar.
// Kept in sync by hand with logic.js's daysInMonth/padSeriesValues (Cloud Functions only
// deploy this functions/ directory, zie de iCal-parser hierboven voor dezelfde reden).

export function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

export function previousYyyyMm(yyyymm) {
  const [y, m] = yyyymm.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

// Een maand is "compleet" (nooit meer wijzigend, mag permanent gecached blijven) zodra haar
// laatste dag al voorbij is t.o.v. todayIso.
export function isMonthComplete(yyyymm, todayIso) {
  const [y, m] = yyyymm.split('-').map(Number);
  const lastDate = `${yyyymm}-${String(daysInMonth(y, m)).padStart(2, '0')}`;
  return lastDate < todayIso;
}

export function padMonthArray(values, days) {
  const out = new Array(days).fill(0);
  for (let i = 0; i < Math.min(days, values.length); i++) {
    const v = Number(values[i]);
    out[i] = Number.isFinite(v) ? v : 0;
  }
  return out;
}
