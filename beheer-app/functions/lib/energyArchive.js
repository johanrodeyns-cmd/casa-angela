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

// Laatste dag waarvoor dit maand-document effectief afgeronde data bevat — een afgesloten
// maand is dat de laatste dag van de maand, de huidige (nog lopende) maand is dat gisteren
// (via Date-aritmetiek, zodat een maandwissel correct wordt afgehandeld). `null` als er nog
// geen enkele dag van deze maand gearchiveerd is (todayIso is de 1e van de maand).
export function archiveThroughDate(yyyymm, todayIso) {
  const [y, m] = yyyymm.split('-').map(Number);
  const lastDayIso = `${yyyymm}-${String(daysInMonth(y, m)).padStart(2, '0')}`;
  if (lastDayIso < todayIso) return lastDayIso;
  const yesterday = new Date(todayIso + 'T00:00:00');
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayIso = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  return yesterdayIso.slice(0, 7) === yyyymm ? yesterdayIso : null;
}
