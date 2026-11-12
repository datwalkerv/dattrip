import { expect, test } from "vitest";
import { dateWindow, inWindow, providerQueries } from "./dates";
import { fromQuery, SearchParamsSchema, toQuery } from "./search-params";

const P = (o: object) => SearchParamsSchema.parse({ from: ["BUD"], ...o });

test("whole month: one provider query per month pair, nights enforced", () => {
  const w = dateWindow(P({ month: "2027-03", minNights: 4, maxNights: 6 }), "2026-11-12");
  expect(w).toMatchObject({ depFrom: "2027-03-01", depTo: "2027-03-31", retFrom: "2027-03-05", retTo: "2027-04-06" });
  expect(providerQueries(w)).toEqual([
    { departure: "2027-03", ret: "2027-03" },
    { departure: "2027-03", ret: "2027-04" },
  ]);
  expect(inWindow(w, "2027-03-30", "2027-04-04")).toBe(true);
  expect(inWindow(w, "2027-03-10", "2027-03-13")).toBe(false); // 3 nights
  expect(inWindow(w, "2027-03-10", "2027-03-17")).toBe(false); // 7 nights
  expect(inWindow(w, "2027-02-28", "2027-03-04")).toBe(false);
});

test("current month never searches the past; return month caps the window", () => {
  const w = dateWindow(P({ month: "2026-11", retMonth: "2026-11" }), "2026-11-12");
  expect(w.depFrom).toBe("2026-11-12");
  expect(w.retTo).toBe("2026-11-30");
  expect(providerQueries(w)).toEqual([{ departure: "2026-11", ret: "2026-11" }]);
});

test("exact dates: a single day query; flexible widens across a month edge", () => {
  const exact = dateWindow(P({ dateMode: "exact", depart: "2027-01-30", ret: "2027-02-03" }), "2026-11-12");
  expect(providerQueries(exact)).toEqual([{ departure: "2027-01-30", ret: "2027-02-03" }]);
  expect(inWindow(exact, "2027-01-30", "2027-02-03")).toBe(true);
  expect(inWindow(exact, "2027-01-30", "2027-02-04")).toBe(false);
  const flex = dateWindow(P({ dateMode: "flex", depart: "2027-01-30", ret: "2027-02-03", flexDays: 2 }), "2026-11-12");
  expect(flex).toMatchObject({ depFrom: "2027-01-28", depTo: "2027-02-01", retFrom: "2027-02-01", retTo: "2027-02-05" });
  expect(providerQueries(flex)).toEqual([
    { departure: "2027-01", ret: "2027-02" },
    { departure: "2027-02", ret: "2027-02" },
  ]);
});

test("one-way has no return window", () => {
  const w = dateWindow(P({ tripType: "oneway", dateMode: "exact", depart: "2027-01-30" }), "2026-11-12");
  expect(providerQueries(w)).toEqual([{ departure: "2027-01-30" }]);
  expect(inWindow(w, "2027-01-30")).toBe(true);
});

test("search params survive the URL round trip and reject nonsense", () => {
  const p = P({ from: ["BUD", "VIE"], to: ["BCN", "c:ES"], month: "2027-03", minNights: 4, maxNights: 6, adults: 3, children: 1, direct: true, maxBudget: 900, currency: "HUF" });
  const back = fromQuery(new URLSearchParams(toQuery(p)));
  expect(back.success && back.data).toEqual(p);
  const exact = P({ dateMode: "flex", depart: "2027-01-30", ret: "2027-02-03", flexDays: 3 });
  expect(fromQuery(new URLSearchParams(toQuery(exact))).data).toEqual(exact);
  expect(fromQuery({ from: "BUD" }).success).toBe(false); // no month
  expect(fromQuery({ from: "budapest", month: "2027-03" }).success).toBe(false);
  expect(fromQuery({ from: "BUD", dates: "exact", depart: "2027-02-03", ret: "2027-02-01" }).success).toBe(false);
});
