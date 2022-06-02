import assert from "assert";
import { WeightedPoolMath } from "./weighted";
import { Dec } from "@keplr-wallet/unit";

const powPrecision = new Dec("0.00000001");

describe("Test osmosis math", () => {
  test("Test pow", () => {
    const tests: {
      base: Dec;
      exp: Dec;
      expect: Dec;
    }[] = [
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
    ];

    for (const test of tests) {
      const r = WeightedPoolMath.pow(test.base, test.exp);
      expect(test.expect.sub(r).abs().lte(powPrecision)).toBe(true);
    }
  });

  test("Test calcSpotPrice", () => {
    const actual = WeightedPoolMath.calcSpotPrice(
      new Dec("100"),
      new Dec("0.1"),
      new Dec("200"),
      new Dec("0.3"),
      new Dec("0")
    );
    const expected = new Dec("1.5");
    assert.strictEqual(
      expected.sub(actual).abs().lte(powPrecision),
      true,
      "expected value & actual value's difference should less than precision"
    );
  });

  test("Test calcSpotPriceWithSwapFee", () => {
    const actual = WeightedPoolMath.calcSpotPrice(
      new Dec("100"),
      new Dec("0.1"),
      new Dec("200"),
      new Dec("0.3"),
      new Dec("0.01")
    );
    const expected = new Dec("1.51515151");
    assert.strictEqual(
      expected.sub(actual).abs().lte(powPrecision),
      true,
      "expected value & actual value's difference should less than precision"
    );
  });

  test("Test calcOutGivenIn", () => {
    const actual = WeightedPoolMath.calcOutGivenIn(
      new Dec("100"),
      new Dec("0.1"),
      new Dec("200"),
      new Dec("0.3"),
      new Dec("40"),
      new Dec("0.01")
    );
    const expected = new Dec("21.0487006");
    assert.strictEqual(
      expected
        .sub(actual)
        .abs()
        .lte(powPrecision.mul(new Dec("10000"))),
      true,
      "expected value & actual value's difference should less than precision*10000"
    );
  });

  test("Test calcInGivenOut", () => {
    const actual = WeightedPoolMath.calcInGivenOut(
      new Dec("100"),
      new Dec("0.1"),
      new Dec("200"),
      new Dec("0.3"),
      new Dec("70"),
      new Dec("0.01")
    );
    const expected = new Dec("266.8009177");
    assert.strictEqual(
      expected
        .sub(actual)
        .abs()
        .lte(powPrecision.mul(new Dec("10"))),
      true,
      "expected value & actual value's difference should less than precision*10"
    );
  });

  test("Test calcPoolOutGivenSingleIn", () => {
    const actual = WeightedPoolMath.calcPoolOutGivenSingleIn(
      new Dec("100"),
      new Dec("0.2"),
      new Dec("300"),
      new Dec("1"),
      new Dec("40"),
      new Dec("0.15")
    );
    const expected = new Dec("18.6519592");
    assert.strictEqual(
      expected
        .sub(actual)
        .abs()
        .lte(powPrecision.mul(new Dec("10000"))),
      true,
      "expected value & actual value's difference should less than precision*10000"
    );
  });

  test("Test calcSingleInGivenPoolOut", () => {
    const actual = WeightedPoolMath.calcSingleInGivenPoolOut(
      new Dec("100"),
      new Dec("0.2"),
      new Dec("300"),
      new Dec("1"),
      new Dec("70"),
      new Dec("0.15")
    );
    const expected = new Dec("210.64327066965955");
    assert.strictEqual(
      expected
        .sub(actual)
        .abs()
        .lte(powPrecision.mul(new Dec("10000"))),
      true,
      "expected value & actual value's difference should less than precision*10000"
    );
  });

  test("Test calcSingleOutGivenPoolIn", () => {
    const actual = WeightedPoolMath.calcSingleOutGivenPoolIn(
      new Dec("200"),
      new Dec("0.8"),
      new Dec("300"),
      new Dec("1"),
      new Dec("40"),
      new Dec("0.15")
    );
    const expected = new Dec("31.77534976");
    assert.strictEqual(
      expected
        .sub(actual)
        .abs()
        .lte(powPrecision.mul(new Dec("10000"))),
      true,
      "expected value & actual value's difference should less than precision*10000"
    );
  });

  test("Test calcPoolInGivenSingleOut", () => {
    const actual = WeightedPoolMath.calcPoolInGivenSingleOut(
      new Dec("200"),
      new Dec("0.8"),
      new Dec("300"),
      new Dec("1"),
      new Dec("70"),
      new Dec("0.15")
    );
    const expected = new Dec("90.29092777");
    assert.strictEqual(
      expected
        .sub(actual)
        .abs()
        .lte(powPrecision.mul(new Dec("10000"))),
      true,
      "expected value & actual value's difference should less than precision*10000"
    );
  });
});
