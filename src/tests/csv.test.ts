import { describe, expect, it } from "vitest";
import { toCsv } from "../utils/csv";

describe("toCsv", () => {
  it("quotes cells and escapes quotes", () => {
    expect(toCsv([["a", 'say "hi"'], [1, 2]])).toBe('"a","say ""hi"""\r\n"1","2"');
  });
  it("neutralises spreadsheet formulas in text", () => {
    expect(toCsv([["=SUM(A1)", "-5x"]])).toBe(`"'=SUM(A1)","'-5x"`);
  });
  it("leaves negative numbers alone", () => {
    expect(toCsv([[-500]])).toBe('"-500"');
  });
});
