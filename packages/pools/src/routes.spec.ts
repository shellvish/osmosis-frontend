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
    // When swapping pool 1 with osmo->ion, the spot price is advantageous, but the slippage is large.
    // When swapping pool 2 with osmo->ion, the spot price is disadvantageous, but the slippage is small.
    const router = new OptimizedRoutes([
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
        ])
      ),
    ]);

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

  test("test approximateOptimizedRoutesByTokenIn return the same result for each iteration", () => {
    const pool1 = new WeightedPool(
      createMockWeightedPoolRaw("1", new Dec(0), new Dec(0), [
        {
          weight: new Int(400),
          denom: "uosmo",
          amount: new Int("1000"),
        },
        {
          weight: new Int(100),
          denom: "uion",
          amount: new Dec("1000").quo(new Dec(32)).truncate(),
        },
      ])
    );

    const pool2 = new WeightedPool(
      createMockWeightedPoolRaw("2", new Dec(0), new Dec(0), [
        {
          weight: new Int(100),
          denom: "uosmo",
          amount: new Int("1000"),
        },
        {
          weight: new Int(500),
          denom: "uion",
          amount: new Dec("1000").mul(new Dec(5)).quo(new Dec(16)).truncate(),
        },
      ])
    );

    const tokenOutPool1 = OptimizedRoutes.calculateTokenOutByTokenIn([
      {
        pools: [pool1],
        tokenInDenom: "uosmo",
        tokenOutDenoms: ["uion"],
        amount: new Int(100),
      },
    ]);
    expect(tokenOutPool1.amount.equals(new Int(9))).toBeTruthy();
    expect(
      tokenOutPool1.afterSpotPriceInOverOut.equals(new Dec(12.5))
    ).toBeTruthy();
    expect(
      pool1
        .getDerivativeSpotPriceAfterTokenOutByTokenIn(
          {
            denom: "uosmo",
            amount: new Int(100),
          },
          "uion"
        )
        .sub(new Dec("0.059036"))
        .abs()
        .lte(new Dec("0.000001"))
    ).toBeTruthy();

    const tokenOutPool2 = OptimizedRoutes.calculateTokenOutByTokenIn([
      {
        pools: [pool2],
        tokenInDenom: "uosmo",
        tokenOutDenoms: ["uion"],
        amount: new Int(100),
      },
    ]);
    expect(tokenOutPool2.amount.equals(new Int(5))).toBeTruthy();
    expect(
      tokenOutPool2.afterSpotPriceInOverOut
        .sub(new Dec("17.91530944"))
        .abs()
        .lte(new Dec("0.00001"))
    ).toBeTruthy();
    expect(
      pool2
        .getDerivativeSpotPriceAfterTokenOutByTokenIn(
          {
            denom: "uosmo",
            amount: new Int(100),
          },
          "uion"
        )
        .sub(new Dec("0.019600"))
        .abs()
        .lte(new Dec("0.000001"))
    ).toBeTruthy();

    // Execute one iteration
    let routes = OptimizedRoutes.approximateOptimizedRoutesByTokenIn(
      [
        {
          pools: [pool1],
          tokenInDenom: "uosmo",
          tokenOutDenoms: ["uion"],
          amount: new Int(100),
        },
        {
          pools: [pool2],
          tokenInDenom: "uosmo",
          tokenOutDenoms: ["uion"],
          amount: new Int(100),
        },
      ],
      1
    );

    expect(routes.length).toBe(2);

    expect(routes[0].pools[0].id).toBe("1");
    expect(routes[0].amount.toString()).toBe("168");
    expect(routes[1].pools[0].id).toBe("2");
    expect(routes[1].amount.toString()).toBe("32");

    // Executes one iteration from the previous result.
    routes = OptimizedRoutes.approximateOptimizedRoutesByTokenIn(
      [
        {
          pools: [pool1],
          tokenInDenom: "uosmo",
          tokenOutDenoms: ["uion"],
          amount: new Int(168),
        },
        {
          pools: [pool2],
          tokenInDenom: "uosmo",
          tokenOutDenoms: ["uion"],
          amount: new Int(32),
        },
      ],
      1
    );

    expect(routes.length).toBe(2);

    expect(routes[0].pools[0].id).toBe("1");
    expect(routes[0].amount.toString()).toBe("162");
    expect(routes[1].pools[0].id).toBe("2");
    expect(routes[1].amount.toString()).toBe("38");

    // Running iteration twice once and running it twice should give the same result
    routes = OptimizedRoutes.approximateOptimizedRoutesByTokenIn(
      [
        {
          pools: [pool1],
          tokenInDenom: "uosmo",
          tokenOutDenoms: ["uion"],
          amount: new Int(100),
        },
        {
          pools: [pool2],
          tokenInDenom: "uosmo",
          tokenOutDenoms: ["uion"],
          amount: new Int(100),
        },
      ],
      2
    );

    expect(routes.length).toBe(2);

    expect(routes[0].pools[0].id).toBe("1");
    expect(routes[0].amount.toString()).toBe("162");
    expect(routes[1].pools[0].id).toBe("2");
    expect(routes[1].amount.toString()).toBe("38");
  });

  test("test approximateOptimizedRoutesByTokenIn able to find converging spot price", () => {
    // When swapping pool 1 with osmo->ion, the spot price is advantageous, but the slippage is large.
    // When swapping pool 2 with osmo->ion, the spot price is disadvantageous, but the slippage is small.
    // Therefore, if the amount increases when swapping, you should eventually mix 1 and 2.
    // The after spot price that meets each other exists around 20000000000.
    const pool1 = new WeightedPool(
      createMockWeightedPoolRaw("1", new Dec(0), new Dec(0), [
        {
          weight: new Int(400),
          denom: "uosmo",
          amount: new Int("100000000000"),
        },
        {
          weight: new Int(100),
          denom: "uion",
          amount: new Dec("100000000000").quo(new Dec(32)).truncate(),
        },
      ])
    );
    const pool2 = new WeightedPool(
      createMockWeightedPoolRaw("2", new Dec(0), new Dec(0), [
        {
          weight: new Int(100),
          denom: "uosmo",
          amount: new Int("100000000000"),
        },
        {
          weight: new Int(500),
          denom: "uion",
          amount: new Dec("100000000000")
            .mul(new Dec(5))
            .quo(new Dec(16))
            .truncate(),
        },
      ])
    );

    const sumTokenIn = new Int("25000000000");
    let expectedTokenInPool1: Int | undefined;
    let expectedTokenInPool2: Int | undefined;

    // The target spot price should converge.
    // This convergence should be the same if sum of token ins is same.
    for (let i = 1; i < 10; i++) {
      const routes = OptimizedRoutes.approximateOptimizedRoutesByTokenIn(
        [
          {
            pools: [pool1],
            tokenInDenom: "uosmo",
            tokenOutDenoms: ["uion"],
            amount: sumTokenIn
              .toDec()
              .mul(new Dec(i))
              .quo(new Dec(10))
              .truncate(),
          },
          {
            pools: [pool2],
            tokenInDenom: "uosmo",
            tokenOutDenoms: ["uion"],
            amount: sumTokenIn
              .toDec()
              .mul(new Dec(10 - i))
              .quo(new Dec(10))
              .truncate(),
          },
        ],
        50
      );

      if (i === 1) {
        // First try
        expectedTokenInPool1 = routes.find(
          (r) => r.pools[0].id === "1"
        )?.amount;
        expectedTokenInPool2 = routes.find(
          (r) => r.pools[0].id === "2"
        )?.amount;
      } else {
        if (!expectedTokenInPool1 || !expectedTokenInPool2) {
          throw new Error("Test not executed properly");
        }

        expect(
          routes
            .find((r) => r.pools[0].id === "1")
            ?.amount.sub(expectedTokenInPool1)
            .abs()
            .lte(new Int(10))
        ).toBeTruthy();
        expect(
          routes
            .find((r) => r.pools[0].id === "2")
            ?.amount.sub(expectedTokenInPool2)
            .abs()
            .lte(new Int(10))
        ).toBeTruthy();
      }
    }
    if (!expectedTokenInPool1 || !expectedTokenInPool2) {
      throw new Error("Test not executed properly");
    }
  });

  test("test swap router to be able to calculate better swap by token in with mixed routes", () => {
    // When swapping pool 1 with osmo->ion, the spot price is advantageous, but the slippage is large.
    // When swapping pool 2 with osmo->ion, the spot price is disadvantageous, but the slippage is small.
    // Therefore, if the amount increases when swapping, you should eventually mix 1 and 2.
    // The after spot price that meets each other exists around 20000000000.
    const router = new OptimizedRoutes([
      new WeightedPool(
        createMockWeightedPoolRaw("1", new Dec(0), new Dec(0), [
          {
            weight: new Int(400),
            denom: "uosmo",
            amount: new Int("100000000000"),
          },
          {
            weight: new Int(100),
            denom: "uion",
            amount: new Dec("100000000000").quo(new Dec(32)).truncate(),
          },
        ])
      ),
      new WeightedPool(
        createMockWeightedPoolRaw("2", new Dec(0), new Dec(0), [
          {
            weight: new Int(100),
            denom: "uosmo",
            amount: new Int("100000000000"),
          },
          {
            weight: new Int(500),
            denom: "uion",
            amount: new Dec("100000000000")
              .mul(new Dec(5))
              .quo(new Dec(16))
              .truncate(),
          },
        ])
      ),
    ]);

    const sp1 = router.pools[0].getSpotPriceInOverOut("uosmo", "uion");
    const sp2 = router.pools[1].getSpotPriceInOverOut("uosmo", "uion");

    // Definitely, for testing, pool1's spot price should be more advantageous than pool2.
    expect(sp1.lt(sp2)).toBeTruthy();

    const tokenIn = {
      denom: "uosmo",
      amount: new Int("25000000000"),
    };

    const afterSP1 = router.pools[0]
      .getTokenOutByTokenIn(tokenIn, "uion")
      .afterPool.getSpotPriceInOverOut("uosmo", "uion");
    const afterSP2 = router.pools[1]
      .getTokenOutByTokenIn(tokenIn, "uion")
      .afterPool.getSpotPriceInOverOut("uosmo", "uion");

    // For testing, after spot price should be
    expect(afterSP1.gt(afterSP2)).toBeTruthy();

    const routes = router.getOptimizedRoutesByTokenIn(tokenIn, "uion", 3, 30);

    expect(routes.length).toBe(2);

    const optimizedTokenOut =
      OptimizedRoutes.calculateTokenOutByTokenIn(routes);
    const tokenOut1 = OptimizedRoutes.calculateTokenOutByTokenIn([
      {
        pools: [router.pools[0]],
        tokenInDenom: tokenIn.denom,
        tokenOutDenoms: ["uion"],
        amount: tokenIn.amount,
      },
    ]);
    const tokenOut2 = OptimizedRoutes.calculateTokenOutByTokenIn([
      {
        pools: [router.pools[1]],
        tokenInDenom: tokenIn.denom,
        tokenOutDenoms: ["uion"],
        amount: tokenIn.amount,
      },
    ]);

    expect(optimizedTokenOut.amount.gt(tokenOut1.amount)).toBeTruthy();
    expect(optimizedTokenOut.amount.gt(tokenOut2.amount)).toBeTruthy();

    const pool1TokenInAmount = routes.find(
      (r) => r.pools[0].id === "1"
    )!.amount;
    const pool2TokenInAmount = routes.find(
      (r) => r.pools[0].id === "2"
    )!.amount;
    // If you draw the graph roughly, you can see that it is advantageous to put more amount in pool1.
    expect(pool1TokenInAmount.gt(pool2TokenInAmount)).toBeTruthy();
  });
});
