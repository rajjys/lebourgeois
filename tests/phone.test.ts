import { test } from "node:test";
import assert from "node:assert/strict";
import { isPhoneNumber } from "../lib/validations/request";

test("isPhoneNumber accepts Congolese numbers as people write them", () => {
  for (const n of ["+243 81 234 56 78", "+243812345678", "0812345678", "081 234 5678", "+243 (0) 81-234-56-78", "  +243975092470  "]) {
    assert.equal(isPhoneNumber(n), true, n);
  }
});

test("isPhoneNumber accepts foreign numbers up to 15 digits", () => {
  assert.equal(isPhoneNumber("+33 6 12 34 56 78"), true);
  assert.equal(isPhoneNumber("+1 202 555 0143"), true);
});

test("isPhoneNumber rejects what cannot be called", () => {
  for (const n of ["", "   ", "12345678", "+243 81", "abc", "081234567x", "nom@exemple.cd", "+243 81 234 56 78 12 34 56", "++243812345678"]) {
    assert.equal(isPhoneNumber(n), false, n);
  }
});
