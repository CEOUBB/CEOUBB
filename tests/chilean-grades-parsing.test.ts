// Implements: REQ-EVAL-01, REQ-GRADE-01
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseChileanGradeInput } from "../lib/grades.ts";

describe("parseChileanGradeInput", () => {
  it("parses strings with dot decimals within 1.0 and 7.0", () => {
    assert.equal(parseChileanGradeInput("5.5"), 5.5);
    assert.equal(parseChileanGradeInput("4.0"), 4.0);
    assert.equal(parseChileanGradeInput("7.0"), 7.0);
    assert.equal(parseChileanGradeInput("1.0"), 1.0);
    assert.equal(parseChileanGradeInput("6.96"), 7.0);
    assert.equal(parseChileanGradeInput("3.94"), 3.9);
  });

  it("parses strings with comma decimals within 1.0 and 7.0", () => {
    assert.equal(parseChileanGradeInput("5,5"), 5.5);
    assert.equal(parseChileanGradeInput("4,0"), 4.0);
    assert.equal(parseChileanGradeInput("7,0"), 7.0);
    assert.equal(parseChileanGradeInput("1,0"), 1.0);
    assert.equal(parseChileanGradeInput("6,8"), 6.8);
  });

  it("parses 2-digit integer shortcut strings between 10 and 70", () => {
    assert.equal(parseChileanGradeInput("55"), 5.5);
    assert.equal(parseChileanGradeInput("40"), 4.0);
    assert.equal(parseChileanGradeInput("70"), 7.0);
    assert.equal(parseChileanGradeInput("10"), 1.0);
    assert.equal(parseChileanGradeInput("65"), 6.5);
  });

  it("parses direct numbers (both valid grades and 2-digit shortcuts)", () => {
    assert.equal(parseChileanGradeInput(5.5), 5.5);
    assert.equal(parseChileanGradeInput(4.0), 4.0);
    assert.equal(parseChileanGradeInput(7.0), 7.0);
    assert.equal(parseChileanGradeInput(1.0), 1.0);
    assert.equal(parseChileanGradeInput(55), 5.5);
    assert.equal(parseChileanGradeInput(40), 4.0);
    assert.equal(parseChileanGradeInput(70), 7.0);
    assert.equal(parseChileanGradeInput(10), 1.0);
  });

  it("parses single-digit strings from 1 to 7, including whitespace", () => {
    for (let grade = 1; grade <= 7; grade++) {
      assert.equal(parseChileanGradeInput(String(grade)), grade);
      assert.equal(parseChileanGradeInput(` ${grade} `), grade);
    }
  });

  it("rejects out-of-range or invalid values", () => {
    assert.equal(parseChileanGradeInput("80"), null);
    assert.equal(parseChileanGradeInput("5"), 5);
    assert.equal(parseChileanGradeInput("0"), null);
    assert.equal(parseChileanGradeInput("8"), null);
    assert.equal(parseChileanGradeInput("9"), null);
    assert.equal(parseChileanGradeInput(0), null);
    assert.equal(parseChileanGradeInput(8), null);
    assert.equal(parseChileanGradeInput("abc"), null);
    assert.equal(parseChileanGradeInput("05"), null);
    assert.equal(parseChileanGradeInput("99"), null);
    assert.equal(parseChileanGradeInput(0.9), null);
    assert.equal(parseChileanGradeInput(7.1), null);
    assert.equal(parseChileanGradeInput(-5), null);
    assert.equal(parseChileanGradeInput(Number.NaN), null);
    assert.equal(parseChileanGradeInput(Number.POSITIVE_INFINITY), null);
  });

  it("handles leading and trailing whitespace", () => {
    assert.equal(parseChileanGradeInput(" 6,2 "), 6.2);
    assert.equal(parseChileanGradeInput("  55  "), 5.5);
    assert.equal(parseChileanGradeInput(" 4.0 "), 4.0);
  });

  it("returns null for empty, null, or non-numeric types", () => {
    assert.equal(parseChileanGradeInput(""), null);
    assert.equal(parseChileanGradeInput("   "), null);
    assert.equal(parseChileanGradeInput(null), null);
    assert.equal(parseChileanGradeInput(undefined), null);
    assert.equal(parseChileanGradeInput({}), null);
    assert.equal(parseChileanGradeInput([]), null);
    assert.equal(parseChileanGradeInput(true), null);
  });
});
