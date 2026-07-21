import { test } from "node:test";
import assert from "node:assert/strict";
import { daysInMonth, previousYyyyMm, isMonthComplete, padMonthArray, archiveThroughDate } from "../lib/energyArchive.js";

test("daysInMonth returns the correct day count, including leap years", () => {
  assert.equal(daysInMonth(2026, 2), 28);
  assert.equal(daysInMonth(2024, 2), 29);
  assert.equal(daysInMonth(2026, 4), 30);
  assert.equal(daysInMonth(2026, 7), 31);
});

test("previousYyyyMm steps back one month, including a year rollover", () => {
  assert.equal(previousYyyyMm("2026-07"), "2026-06");
  assert.equal(previousYyyyMm("2026-01"), "2025-12");
});

test("isMonthComplete is true once the month's last day lies before today", () => {
  assert.equal(isMonthComplete("2026-06", "2026-07-21"), true);
  assert.equal(isMonthComplete("2026-07", "2026-07-21"), false);
  assert.equal(isMonthComplete("2026-07", "2026-08-01"), true);
});

test("padMonthArray pads a shorter array with zeros up to the requested length", () => {
  assert.deepEqual(padMonthArray([1, 2, 3], 5), [1, 2, 3, 0, 0]);
});

test("padMonthArray truncates an array longer than the requested length", () => {
  assert.deepEqual(padMonthArray([1, 2, 3, 4, 5], 3), [1, 2, 3]);
});

test("padMonthArray coerces non-finite entries to 0", () => {
  assert.deepEqual(padMonthArray([1, null, undefined, NaN, "3"], 5), [1, 0, 0, 0, 3]);
});

test("archiveThroughDate returns the last day of a fully-elapsed month", () => {
  assert.equal(archiveThroughDate("2026-06", "2026-07-21"), "2026-06-30");
});

test("archiveThroughDate returns yesterday for the current, still-open month", () => {
  assert.equal(archiveThroughDate("2026-07", "2026-07-21"), "2026-07-20");
});

test("archiveThroughDate handles a month boundary for yesterday", () => {
  assert.equal(archiveThroughDate("2026-07", "2026-08-01"), "2026-07-31");
});

test("archiveThroughDate returns null when the month has no archived days yet (today is day 1)", () => {
  assert.equal(archiveThroughDate("2026-08", "2026-08-01"), null);
});
