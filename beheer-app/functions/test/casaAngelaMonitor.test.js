import { test } from "node:test";
import assert from "node:assert/strict";
import { decideAlertState, FLAT_CHECKS_BEFORE_ALERT } from "../lib/casaAngelaMonitor.js";

const T = "2026-05-29";
const NOW = 1780000000000;

test("decideAlertState — storingsdetectie (US-CA-07)", async (t) => {
  await t.test("nieuwe dag → baseline, geen mail, alerted bewaard", () => {
    const r = decideAlertState({ date: "2026-05-28", lastToday: 40, consecutiveFlat: 3, alerted: true }, 0, NOW, T);
    assert.equal(r.sendAlert, false);
    assert.equal(r.sendRecovery, false);
    assert.equal(r.newState.date, T);
    assert.equal(r.newState.lastToday, 0);
    assert.equal(r.newState.consecutiveFlat, 0);
    assert.equal(r.newState.alerted, true);
  });

  await t.test("stijging → flat 0, geen mail", () => {
    const r = decideAlertState({ date: T, lastToday: 5, consecutiveFlat: 0, alerted: false }, 6, NOW, T);
    assert.equal(r.sendAlert, false);
    assert.equal(r.sendRecovery, false);
    assert.equal(r.newState.lastToday, 6);
    assert.equal(r.newState.consecutiveFlat, 0);
  });

  await t.test("één keer vlak → flat 1, geen mail", () => {
    const r = decideAlertState({ date: T, lastToday: 5, consecutiveFlat: 0, alerted: false }, 5, NOW, T);
    assert.equal(r.sendAlert, false);
    assert.equal(r.newState.consecutiveFlat, 1);
    assert.equal(r.newState.lastToday, 5);
  });

  await t.test("twee keer vlak → storingsmail", () => {
    const r = decideAlertState({ date: T, lastToday: 5, consecutiveFlat: 1, alerted: false }, 5, NOW, T);
    assert.equal(r.sendAlert, true);
    assert.equal(r.newState.alerted, true);
    assert.equal(r.newState.consecutiveFlat, 2);
  });

  await t.test("derde keer vlak, al gealarmeerd → geen tweede mail", () => {
    const r = decideAlertState({ date: T, lastToday: 5, consecutiveFlat: 2, alerted: true }, 5, NOW, T);
    assert.equal(r.sendAlert, false);
    assert.equal(r.newState.consecutiveFlat, 3);
    assert.equal(r.newState.alerted, true);
  });

  await t.test("stijging na alarm → herstelmail", () => {
    const r = decideAlertState({ date: T, lastToday: 5, consecutiveFlat: 3, alerted: true }, 7, NOW, T);
    assert.equal(r.sendRecovery, true);
    assert.equal(r.sendAlert, false);
    assert.equal(r.newState.alerted, false);
    assert.equal(r.newState.lastToday, 7);
    assert.equal(r.newState.consecutiveFlat, 0);
  });

  await t.test("nieuwe dag terwijl alerted, daarna stijging → herstelmail", () => {
    const day2 = decideAlertState({ date: T, lastToday: 30, consecutiveFlat: 4, alerted: true }, 0, NOW, "2026-05-30");
    assert.equal(day2.sendRecovery, false);
    assert.equal(day2.newState.alerted, true);
    const rise = decideAlertState(day2.newState, 2, NOW + 3600000, "2026-05-30");
    assert.equal(rise.sendRecovery, true);
    assert.equal(rise.newState.alerted, false);
  });

  await t.test("nieuwe dag nog steeds down → geen tweede storingsmail", () => {
    const day2 = decideAlertState({ date: T, lastToday: 30, consecutiveFlat: 4, alerted: true }, 0, NOW, "2026-05-30");
    const flat1 = decideAlertState(day2.newState, 0, NOW + 3600000, "2026-05-30");
    const flat2 = decideAlertState(flat1.newState, 0, NOW + 7200000, "2026-05-30");
    assert.equal(flat1.sendAlert, false);
    assert.equal(flat2.sendAlert, false);
  });

  await t.test("inconclusive (NaN) → state ongewijzigd, geen mail", () => {
    const prev = { date: T, lastToday: 5, consecutiveFlat: 1, alerted: false };
    const r = decideAlertState(prev, NaN, NOW, T);
    assert.equal(r.sendAlert, false);
    assert.equal(r.sendRecovery, false);
    assert.deepEqual(r.newState, prev);
  });

  await t.test("FLAT_CHECKS_BEFORE_ALERT = 2", () => {
    assert.equal(FLAT_CHECKS_BEFORE_ALERT, 2);
  });

  await t.test("geen prevState (eerste run ooit) → baseline", () => {
    const r = decideAlertState(undefined, 12, NOW, T);
    assert.equal(r.sendAlert, false);
    assert.equal(r.newState.date, T);
    assert.equal(r.newState.lastToday, 12);
  });
});
