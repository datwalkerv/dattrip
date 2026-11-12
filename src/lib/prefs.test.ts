import { expect, test } from "vitest";
import { parsePrefs } from "./prefs";

test("remembered search: valid values pass, anything else is ignored", () => {
  expect(parsePrefs('{"from":["BUD","VIE"],"adults":2,"children":0,"currency":"HUF"}')).toEqual({ from: ["BUD", "VIE"], adults: 2, children: 0, currency: "HUF" });
  expect(parsePrefs('{"from":["BUD"]}')).toEqual({ from: ["BUD"] });
  for (const bad of [null, "", "not json", "[]", '{"from":[]}', '{"from":["budapest"]}', '{"from":["BUD"],"adults":40}', '{"from":["BUD"],"currency":"XXX"}']) expect(parsePrefs(bad)).toBeUndefined();
});
