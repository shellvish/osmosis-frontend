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
