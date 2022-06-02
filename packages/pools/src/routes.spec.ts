import { WeightedPool, WeightedPoolRaw } from "./weighted";
import { Dec, Int } from "@keplr-wallet/unit";
import { OptimizedRoutes } from "./routes";

const createMockWeightedPoolRaw = (
  id: string,
  swapFee: Dec,
  exitFee: Dec,
  poolAssets: {
    weight: Int;
    denom: string;
    amount: Int;
  }[]
): WeightedPoolRaw => {
  let totalWeight = new Int(0);
  for (const asset of poolAssets) {
    totalWeight = totalWeight.add(asset.weight);
  }

  return {
    id,
    poolAssets: poolAssets.map((asset) => {
      return {
        weight: asset.weight.toString(),
        token: {
          denom: asset.denom,
          amount: asset.amount.toString(),
        },
      };
    }),
    poolParams: {
      exitFee: exitFee.toString(),
      lock: false,
      smoothWeightChangeParams: null,
      swapFee: swapFee.toString(),
    },
    totalShares: { amount: "10000000000000000000", denom: `gamm/pool${id}` },
    totalWeight: totalWeight.toString(),
  };
};

describe("Test swap router", () => {
  // When swapping pool 1 with osmo->ion, the spot price is advantageous, but the slippage is large.
  // When swapping pool 2 with osmo->ion, the spot price is disadvantageous, but the slippage is small.
  // Therefore, if the amount increases when swapping, you should eventually mix 1 and 2.
  const createRouter1 = () => {
    const pools = [
      new WeightedPool(
        createMockWeightedPoolRaw("1", new Dec(0.01), new Dec(0), [
          {
            weight: new Int(105),
            denom: "uosmo",
            amount: new Int("1000000000"),
          },
          {
            weight: new Int(100),
            denom: "uion",
            amount: new Int("1000000000"),
          },
        ])
      ),
      new WeightedPool(
        createMockWeightedPoolRaw("2", new Dec(0.01), new Dec(0), [
          {
            weight: new Int(100),
            denom: "uosmo",
            amount: new Int("100000000000"),
          },
          {
            weight: new Int(100),
            denom: "uion",
            amount: new Int("100000000000"),
          },
          {
            weight: new Int(50),
            denom: "uatom",
            amount: new Int("100000000000"),
          },
        ])
      ),
      new WeightedPool(
        createMockWeightedPoolRaw("3", new Dec(0.01), new Dec(0), [
          {
            weight: new Int(100),
            denom: "uatom",
            amount: new Int("100000000"),
          },
          {
            weight: new Int(10),
            denom: "uluna",
            amount: new Int("1000000000000000000000000000000000"),
          },
        ])
      ),
    ];

    return new OptimizedRoutes(pools);
  };

  test("test weighted pool's derivative of after spot price", () => {
    const pool1 = new WeightedPool(
      createMockWeightedPoolRaw("1", new Dec(0), new Dec(0), [
        {
          weight: new Int(100),
          denom: "uosmo",
          amount: new Int("100"),
        },
        {
          weight: new Int(500),
          denom: "uion",
          amount: new Dec("100").mul(new Dec(5)).quo(new Dec(16)).truncate(),
        },
      ])
    );

    const dSP1 = pool1.getDerivativeSpotPriceAfterTokenOutByTokenIn(
      {
        denom: "uosmo",
        amount: new Int(10),
      },
      "uion"
    );

    expect(dSP1.sub(new Dec(0.197273)).abs().lte(new Dec(0.00001))).toBe(true);

    const pool2 = new WeightedPool(
      createMockWeightedPoolRaw("1", new Dec(0.05), new Dec(0), [
        {
          weight: new Int(100),
          denom: "uosmo",
          amount: new Int("100"),
        },
        {
          weight: new Int(500),
          denom: "uion",
          amount: new Dec("100").mul(new Dec(5)).quo(new Dec(16)).truncate(),
        },
      ])
    );

    const dSP2 = pool2.getDerivativeSpotPriceAfterTokenOutByTokenIn(
      {
        denom: "uosmo",
        amount: new Int(10),
      },
      "uion"
    );

    expect(dSP2.sub(new Dec(0.197093)).abs().lte(new Dec(0.00001))).toBe(true);

    const pool3 = new WeightedPool(
      createMockWeightedPoolRaw("1", new Dec(0), new Dec(0), [
        {
          weight: new Int(400),
          denom: "uosmo",
          amount: new Int("100"),
        },
        {
          weight: new Int(100),
          denom: "uion",
          amount: new Dec("100").quo(new Dec(32)).truncate(),
        },
      ])
    );

    const dSP3 = pool3.getDerivativeSpotPriceAfterTokenOutByTokenIn(
      {
        denom: "uosmo",
        amount: new Int(10),
      },
      "uion"
    );

    expect(dSP3.sub(new Dec(0.610041)).abs().lte(new Dec(0.00001))).toBe(true);
  });

  test("test swap router to be able to calculate best route with the most out token", () => {
    const router = createRouter1();

    let bestRoute = router.getBestRouteByTokenIn(
      {
        denom: "uosmo",
        amount: new Int("10000000"),
      },
      "uion",
      true
    );

    // Pool1 is advantageous because the amount of token in is not large.
    expect(bestRoute.pools.length).toBe(1);
    expect(bestRoute.pools[0].id).toBe("1");

    bestRoute = router.getBestRouteByTokenIn(
      {
        denom: "uosmo",
        amount: new Int("100000000"),
      },
      "uion",
      true
    );

    // Pool2 is advantageous because the amount of token in is large.
    expect(bestRoute.pools.length).toBe(1);
    expect(bestRoute.pools[0].id).toBe("2");
  });
});
