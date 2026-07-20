// Pure beslis-logica voor de Casa Angela storingsmelder (US-CA-07).
// Geen IO/DOM — volledig testbaar.

export const FLAT_CHECKS_BEFORE_ALERT = 2;

// prevState: { date, lastToday, consecutiveFlat, alerted } | undefined/null
// todayKwh: number (mag NaN zijn → inconclusive)
// nowMs: number (timestamp)
// todayDateStr: "YYYY-MM-DD" in lokale (Madrid) tijd
// → { newState, sendAlert, sendRecovery }
export function decideAlertState(prevState, todayKwh, nowMs, todayDateStr) {
  const prev = prevState || { date: null, lastToday: 0, consecutiveFlat: 0, alerted: false };

  if (!Number.isFinite(todayKwh)) {
    return { newState: prev, sendAlert: false, sendRecovery: false };
  }

  if (prev.date !== todayDateStr) {
    return {
      newState: { date: todayDateStr, lastToday: todayKwh, consecutiveFlat: 0, alerted: prev.alerted === true, lastCheckAt: nowMs },
      sendAlert: false,
      sendRecovery: false,
    };
  }

  if (todayKwh > prev.lastToday) {
    const recovered = prev.alerted === true;
    return {
      newState: { date: todayDateStr, lastToday: todayKwh, consecutiveFlat: 0, alerted: false, lastCheckAt: nowMs },
      sendAlert: false,
      sendRecovery: recovered,
    };
  }

  const consecutiveFlat = (prev.consecutiveFlat || 0) + 1;
  const shouldAlert = consecutiveFlat >= FLAT_CHECKS_BEFORE_ALERT && prev.alerted !== true;
  return {
    newState: {
      date: todayDateStr,
      lastToday: prev.lastToday,
      consecutiveFlat,
      alerted: prev.alerted === true || shouldAlert,
      lastCheckAt: nowMs,
    },
    sendAlert: shouldAlert,
    sendRecovery: false,
  };
}
