import { Dec } from "@keplr-wallet/unit";
import { powWithBinomialSeries } from "./pow";

const powPrecision = new Dec("0.00000001");

describe("Test common math", () => {
  test("Test powWithBinomialSeries", () => {
    const tests: ({
      base: Dec;
      exp: Dec;
    } & (
      | { expect: Dec; expectError?: undefined }
      | { expect?: undefined; expectError: true }
    ))[] = [
      {
        // Not positive base
        base: new Dec(0),
        exp: new Dec("0.5"),
        expectError: true,
      },
      {
        // Not positive base
        base: new Dec("-0.5"),
        exp: new Dec("0.5"),
        expectError: true,
      },
      {
        // Not converging
        base: new Dec("2"),
        exp: new Dec("0.5"),
        expectError: true,
      },
      {
        // Not converging
        base: new Dec("3.56"),
        exp: new Dec("0.5"),
        expectError: true,
      },
      {
        base: new Dec("1.68"),
        exp: new Dec("0.32"),
        expect: new Dec("1.18058965"),
      },
      {
        base: new Dec("1.68"),
        exp: new Dec("-0.32"),
        expect: new Dec("0.84703436"),
      },
      {
        base: new Dec("0.909090"),
        exp: new Dec("4"),
        expect: new Dec("0.68301072"),
      },
      {
        base: new Dec("0.909090"),
        exp: new Dec("4.5"),
        expect: new Dec("0.65122484"),
      },
      {
        base: new Dec("0.909090"),
        exp: new Dec("-4.5"),
        expect: new Dec("1.53556794"),
      },
      {
        base: new Dec("0.909090"),
        exp: new Dec("-4"),
        expect: new Dec("1.46410585"),
      },
      {
        base: new Dec("0.5"),
        exp: new Dec("9.3"),
        expect: new Dec("0.00158643"),
      },
    ];

    for (const test of tests) {
      if (test.expectError) {
        expect(() => {
          powWithBinomialSeries(test.base, test.exp);
        }).toThrow();
      } else {
        const r = powWithBinomialSeries(test.base, test.exp);
        expect(test.expect.sub(r).abs().lte(powPrecision)).toBe(true);
      }
    }
  });
});
