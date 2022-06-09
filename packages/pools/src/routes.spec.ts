import { WeightedPool, WeightedPoolRaw } from "./weighted";
import { Dec, Int } from "@keplr-wallet/unit";
import { OptimizedRoutes, RouteWithAmount } from "./routes";

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

/**
 * Used for testing protected and private methods.
 *
 * This class has direct relationships with protected, private methods, all methods should be tested thoroughly.
 */
class TestingOptimizedRoutes extends OptimizedRoutes {
  static calculateDerivativeSpotPriceInOverOutAfterSwapByTokenIn(
    route: RouteWithAmount
  ): Dec {
    return OptimizedRoutes.calculateDerivativeSpotPriceInOverOutAfterSwapByTokenIn(
      route
    );
  }
}

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

  test("test multihop weighted pool's derivative of after spot price", () => {
    const pool1 = new WeightedPool(
      createMockWeightedPoolRaw("1", new Dec(0), new Dec(0), [
        {
          weight: new Int(100),
          denom: "uosmo",
          amount: new Int("1000"),
        },
        {
          weight: new Int(500),
          denom: "ufoo",
          amount: new Dec("1000").mul(new Dec(5)).quo(new Dec(16)).truncate(),
        },
      ])
    );
    const sp1 = pool1.getSpotPriceInOverOut("uosmo", "ufoo");
    expect(sp1.sub(new Dec(16.02564)).abs().lte(new Dec(0.00001))).toBe(true);
    const tokenOut1 = pool1.getTokenOutByTokenIn(
      {
        denom: "uosmo",
        amount: new Int(100),
      },
      "ufoo"
    ).amount;
    expect(tokenOut1.toString()).toBe("5");
    const spotPriceAfterSwap1 = pool1
      .getTokenOutByTokenIn(
        {
          denom: "uosmo",
          amount: new Int(100),
        },
        "ufoo"
      )
      .afterPool.getSpotPriceInOverOut("uosmo", "ufoo");
    expect(
      spotPriceAfterSwap1.sub(new Dec(17.9153)).abs().lte(new Dec(0.00001))
    ).toBe(true);
    const dSpotPriceAfterSwap1 =
      pool1.getDerivativeSpotPriceAfterTokenOutByTokenIn(
        {
          denom: "uosmo",
          amount: new Int(100),
        },
        "ufoo"
      );
    expect(
      dSpotPriceAfterSwap1.sub(new Dec(0.0196)).abs().lte(new Dec(0.00001))
    ).toBe(true);

    const pool2 = new WeightedPool(
      createMockWeightedPoolRaw("2", new Dec(0.05), new Dec(0), [
        {
          weight: new Int(100),
          denom: "ufoo",
          amount: new Int("100"),
        },
        {
          weight: new Int(500),
          denom: "ubar",
          amount: new Int("1000"),
        },
      ])
    );
    const sp2 = pool2.getSpotPriceInOverOut("ufoo", "ubar");
    expect(sp2.sub(new Dec(0.52631)).abs().lte(new Dec(0.00001))).toBe(true);
    const tokenOut2 = pool2.getTokenOutByTokenIn(
      {
        denom: "ufoo",
        amount: new Int(5),
      },
      "ubar"
    ).amount;
    expect(tokenOut2.toString()).toBe("9");
    const spotPriceAfterSwap2 = pool2
      .getTokenOutByTokenIn(
        {
          denom: "ufoo",
          amount: new Int(5),
        },
        "ubar"
      )
      .afterPool.getSpotPriceInOverOut("ufoo", "ubar");
    expect(
      spotPriceAfterSwap2.sub(new Dec(0.55765)).abs().lte(new Dec(0.00001))
    ).toBe(true);
    const dSpotPriceAfterSwap2 =
      pool2.getDerivativeSpotPriceAfterTokenOutByTokenIn(
        {
          denom: "ufoo",
          amount: new Int(5),
        },
        "ubar"
      );
    expect(
      dSpotPriceAfterSwap2.sub(new Dec(0.00605)).abs().lte(new Dec(0.00001))
    ).toBe(true);

    const pool3 = new WeightedPool(
      createMockWeightedPoolRaw("3", new Dec(0), new Dec(0), [
        {
          weight: new Int(50),
          denom: "ubar",
          amount: new Int("5000"),
        },
        {
          weight: new Int(60),
          denom: "ubaz",
          amount: new Int("4400"),
        },
      ])
    );
    const sp3 = pool3.getSpotPriceInOverOut("ubar", "ubaz");
    expect(sp3.sub(new Dec(1.36363)).abs().lte(new Dec(0.00001))).toBe(true);
    const tokenOut3 = pool3.getTokenOutByTokenIn(
      {
        denom: "ubar",
        amount: new Int(9),
      },
      "ubaz"
    ).amount;
    expect(tokenOut3.toString()).toBe("6");
    const spotPriceAfterSwap3 = pool3
      .getTokenOutByTokenIn(
        {
          denom: "ubar",
          amount: new Int(9),
        },
        "ubaz"
      )
      .afterPool.getSpotPriceInOverOut("ubar", "ubaz");
    expect(
      spotPriceAfterSwap3.sub(new Dec(1.36795)).abs().lte(new Dec(0.00001))
    ).toBe(true);
    const dSpotPriceAfterSwap3 =
      pool3.getDerivativeSpotPriceAfterTokenOutByTokenIn(
        {
          denom: "ubar",
          amount: new Int(9),
        },
        "ubaz"
      );
    expect(
      dSpotPriceAfterSwap3.sub(new Dec(0.0005)).abs().lte(new Dec(0.00001))
    ).toBe(true);

    const multihopDSPaS12 =
      TestingOptimizedRoutes.calculateDerivativeSpotPriceInOverOutAfterSwapByTokenIn(
        {
          pools: [pool1, pool2],
          tokenInDenom: "uosmo",
          tokenOutDenoms: ["ufoo", "ubar"],
          amount: new Int(100),
        }
      );

    // SPaS'(x) = SPaS1'(x) * SPaS2(TokenOut1(x)) * SPaS3(TokenOut2(TokenOut1(x)))
    //            + SPaS2'(TokenOut1(x)) * SPaS3(TokenOut2(TokenOut1(x)))
    //            + SPaS3'(TokenOut2(TokenOut1(x))) ...
    expect(
      multihopDSPaS12.equals(
        dSpotPriceAfterSwap1.mul(spotPriceAfterSwap2).add(dSpotPriceAfterSwap2)
      )
    ).toBe(true);

    const multihopDSPaS123 =
      TestingOptimizedRoutes.calculateDerivativeSpotPriceInOverOutAfterSwapByTokenIn(
        {
          pools: [pool1, pool2, pool3],
          tokenInDenom: "uosmo",
          tokenOutDenoms: ["ufoo", "ubar", "ubaz"],
          amount: new Int(100),
        }
      );

    // SPaS'(x) = SPaS1'(x) * SPaS2(TokenOut1(x)) * SPaS3(TokenOut2(TokenOut1(x)))
    //            + SPaS2'(TokenOut1(x)) * SPaS3(TokenOut2(TokenOut1(x)))
    //            + SPaS3'(TokenOut2(TokenOut1(x))) ...
    expect(
      multihopDSPaS123.equals(
        dSpotPriceAfterSwap1
          .mul(spotPriceAfterSwap2)
          .mul(spotPriceAfterSwap3)
          .add(dSpotPriceAfterSwap2.mul(spotPriceAfterSwap3))
          .add(dSpotPriceAfterSwap3)
      )
    ).toBe(true);
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
    expect(tokenOutPool1.amount.equals(new Int(9))).toBe(true);
    expect(tokenOutPool1.afterSpotPriceInOverOut.equals(new Dec(12.5))).toBe(
      true
    );
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
    ).toBe(true);

    const tokenOutPool2 = OptimizedRoutes.calculateTokenOutByTokenIn([
      {
        pools: [pool2],
        tokenInDenom: "uosmo",
        tokenOutDenoms: ["uion"],
        amount: new Int(100),
      },
    ]);
    expect(tokenOutPool2.amount.equals(new Int(5))).toBe(true);
    expect(
      tokenOutPool2.afterSpotPriceInOverOut
        .sub(new Dec("17.91530944"))
        .abs()
        .lte(new Dec("0.00001"))
    ).toBe(true);
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
    ).toBe(true);

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

  test("test approximateOptimizedRoutesByTokenIn's assertion", () => {
    const pool1 = new WeightedPool(
      createMockWeightedPoolRaw("1", new Dec(0), new Dec(0), [
        {
          weight: new Int(400),
          denom: "uosmo",
          amount: new Int("100000000000"),
        },
        {
          weight: new Int(400),
          denom: "uatom",
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
        {
          weight: new Int(400),
          denom: "ufoo",
          amount: new Int("100000000000"),
        },
      ])
    );

    expect(() => {
      // Empty routes is allowed
      const r = OptimizedRoutes.approximateOptimizedRoutesByTokenIn([], 10);
      expect(r.length).toBe(0);
    }).not.toThrow();

    expect(() => {
      // Success case
      OptimizedRoutes.approximateOptimizedRoutesByTokenIn(
        [
          {
            pools: [pool1],
            tokenInDenom: "uosmo",
            tokenOutDenoms: ["uion"],
            amount: new Int(1000000),
          },
          {
            pools: [pool2],
            tokenInDenom: "uosmo",
            tokenOutDenoms: ["uion"],
            amount: new Int(1000000),
          },
        ],
        10
      );
    }).not.toThrow();

    expect(() => {
      // Should be rejected if pool is duplicated
      OptimizedRoutes.approximateOptimizedRoutesByTokenIn(
        [
          {
            pools: [pool1],
            tokenInDenom: "uosmo",
            tokenOutDenoms: ["uion"],
            amount: new Int(1000000),
          },
          {
            pools: [pool1],
            tokenInDenom: "uosmo",
            tokenOutDenoms: ["uion"],
            amount: new Int(1000000),
          },
        ],
        10
      );
    }).toThrow();

    expect(() => {
      // Should be rejected if token in is empty
      OptimizedRoutes.approximateOptimizedRoutesByTokenIn(
        [
          {
            pools: [pool1],
            tokenInDenom: "",
            tokenOutDenoms: ["uion"],
            amount: new Int(1000000),
          },
          {
            pools: [pool2],
            tokenInDenom: "uosmo",
            tokenOutDenoms: ["uion"],
            amount: new Int(1000000),
          },
        ],
        10
      );
    }).toThrow();

    expect(() => {
      // Should be rejected if token out is empty
      OptimizedRoutes.approximateOptimizedRoutesByTokenIn(
        [
          {
            pools: [pool1],
            tokenInDenom: "uosmo",
            tokenOutDenoms: ["uion"],
            amount: new Int(1000000),
          },
          {
            pools: [pool2],
            tokenInDenom: "uosmo",
            tokenOutDenoms: [],
            amount: new Int(1000000),
          },
        ],
        10
      );
    }).toThrow();

    expect(() => {
      // Should be rejected if token out is empty
      OptimizedRoutes.approximateOptimizedRoutesByTokenIn(
        [
          {
            pools: [pool1],
            tokenInDenom: "uosmo",
            tokenOutDenoms: ["uion"],
            amount: new Int(1000000),
          },
          {
            pools: [pool2],
            tokenInDenom: "uosmo",
            tokenOutDenoms: [""],
            amount: new Int(1000000),
          },
        ],
        10
      );
    }).toThrow();

    expect(() => {
      // Should be rejected if token in is different per route
      OptimizedRoutes.approximateOptimizedRoutesByTokenIn(
        [
          {
            pools: [pool1],
            tokenInDenom: "uatom",
            tokenOutDenoms: ["uion"],
            amount: new Int(1000000),
          },
          {
            pools: [pool2],
            tokenInDenom: "uosmo",
            tokenOutDenoms: ["uion"],
            amount: new Int(1000000),
          },
        ],
        10
      );
    }).toThrow();

    expect(() => {
      // Should be rejected if token out is different per route
      OptimizedRoutes.approximateOptimizedRoutesByTokenIn(
        [
          {
            pools: [pool1],
            tokenInDenom: "uosmo",
            tokenOutDenoms: ["uion"],
            amount: new Int(1000000),
          },
          {
            pools: [pool2],
            tokenInDenom: "uosmo",
            tokenOutDenoms: ["ufoo"],
            amount: new Int(1000000),
          },
        ],
        10
      );
    }).toThrow();
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
        ).toBe(true);
        expect(
          routes
            .find((r) => r.pools[0].id === "2")
            ?.amount.sub(expectedTokenInPool2)
            .abs()
            .lte(new Int(10))
        ).toBe(true);
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
    expect(sp1.lt(sp2)).toBe(true);

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
    expect(afterSP1.gt(afterSP2)).toBe(true);

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

    expect(optimizedTokenOut.amount.gt(tokenOut1.amount)).toBe(true);
    expect(optimizedTokenOut.amount.gt(tokenOut2.amount)).toBe(true);

    const pool1TokenInAmount = routes.find(
      (r) => r.pools[0].id === "1"
    )!.amount;
    const pool2TokenInAmount = routes.find(
      (r) => r.pools[0].id === "2"
    )!.amount;
    // If you draw the graph roughly, you can see that it is advantageous to put more amount in pool1.
    expect(pool1TokenInAmount.gt(pool2TokenInAmount)).toBe(true);
  });

  test("test swap router to be able to calculate better swap by token in with mixed and multihop routes", () => {
    // When swapping pool (2,3) with osmo->ufoo->ion, the spot price is advantageous, but the slippage is large.
    // When swapping pool 1 with osmo->ion, the spot price is disadvantageous, but the slippage is small.
    // Therefore, if the amount increases when swapping, you should eventually mix 1 and (2,3).
    // The after spot price that meets each other exists around 20000000000 roughly.
    const router = new OptimizedRoutes([
      new WeightedPool(
        createMockWeightedPoolRaw("1", new Dec(0), new Dec(0), [
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
      new WeightedPool(
        createMockWeightedPoolRaw("2", new Dec(0), new Dec(0), [
          {
            weight: new Int(200),
            denom: "ufoo",
            amount: new Int("100000000000"),
          },
          {
            weight: new Int(100),
            denom: "uion",
            amount: new Int("6250000000"),
          },
        ])
      ),
      new WeightedPool(
        createMockWeightedPoolRaw("3", new Dec(0), new Dec(0), [
          {
            weight: new Int(100),
            denom: "ufoo",
            amount: new Int("100000000000"),
          },
          {
            weight: new Int(100),
            denom: "uosmo",
            amount: new Int("100000000000"),
          },
        ])
      ),
    ]);

    const sp1 = router.pools[0].getSpotPriceInOverOut("uosmo", "uion");
    const sp2 = router.pools[2]
      .getSpotPriceInOverOut("uosmo", "ufoo")
      .mul(router.pools[1].getSpotPriceInOverOut("ufoo", "uion"));

    // Definitely, for testing, pool1's spot price should be more disadvantageous than pool(2,3).
    expect(sp1.gt(sp2)).toBe(true);

    const tokenIn = {
      denom: "uosmo",
      amount: new Int("25000000000"),
    };

    const afterSP1 = router.pools[0]
      .getTokenOutByTokenIn(tokenIn, "uion")
      .afterPool.getSpotPriceInOverOut("uosmo", "uion");
    const tokenOutPool3 = router.pools[2].getTokenOutByTokenIn(tokenIn, "ufoo");
    const afterSP2 = tokenOutPool3.afterPool
      .getSpotPriceInOverOut("uosmo", "ufoo")
      .mul(
        router.pools[1]
          .getTokenOutByTokenIn(
            {
              denom: "ufoo",
              amount: tokenOutPool3.amount,
            },
            "uion"
          )
          .afterPool.getSpotPriceInOverOut("ufoo", "uion")
      );

    // For testing, after spot price should be
    expect(afterSP1.lt(afterSP2)).toBe(true);

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
        pools: [router.pools[2], router.pools[1]],
        tokenInDenom: tokenIn.denom,
        tokenOutDenoms: ["ufoo", "uion"],
        amount: tokenIn.amount,
      },
    ]);

    expect(optimizedTokenOut.amount.gt(tokenOut1.amount)).toBe(true);
    expect(optimizedTokenOut.amount.gt(tokenOut2.amount)).toBe(true);

    const pool1TokenInAmount = routes.find(
      (r) => r.pools[0].id === "1"
    )!.amount;
    const pool2TokenInAmount = routes.find(
      (r) => r.pools[0].id === "3" && r.pools[1].id === "2"
    )!.amount;
    // If you draw the graph roughly, you can see that it is advantageous to put more amount in multihop (pool3 -> pool2).
    expect(pool1TokenInAmount.lt(pool2TokenInAmount)).toBe(true);
  });
});
