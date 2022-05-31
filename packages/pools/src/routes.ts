import { Dec, Int } from "@keplr-wallet/unit";
import { Pool } from "./interface";
import { NoPoolsError, NotEnoughLiquidityError } from "./errors";
import { CachedPool } from "./cache";

export interface Route {
  pools: ReadonlyArray<Pool>;
  // tokenOutDenoms means the token to come out from each pool.
  // This should the same length with the pools.
  // RoutePath consists of token in -> pool -> token out -> pool -> token out...
  // But, currently, only 1 intermediate can be supported.
  tokenOutDenoms: string[];
  tokenInDenom: string;
}

export interface RouteWithAmount extends Route {
  amount: Int;
}

export class OptimizedRoutes {
  protected static SymbolCachedPool = Symbol("cachedPool");

  protected _pools: ReadonlyArray<Pool>;
  protected candidatePathsCache = new Map<string, Route[]>();

  constructor(pools: ReadonlyArray<Pool>) {
    this._pools = pools;
  }

  setPools(pools: ReadonlyArray<Pool>) {
    this._pools = pools;
    this.clearCache();
  }

  get pools(): ReadonlyArray<Pool> {
    return this._pools;
  }

  protected clearCache() {
    this.candidatePathsCache = new Map();
    OptimizedRoutes.wrapCachedPools(this.pools).forEach((pool) => {
      if (pool instanceof CachedPool) {
        pool.clearCache();
      }
    });
  }

  /**
   * Returns best route to get the greatest token out.
   * NOTE: SwapFee is considered.
   * @param tokenIn
   * @param tokenOutDenom
   * @param permitIntermediate Calculate until level 1 multihop if true.
   */
  getBestRouteByTokenIn(
    tokenIn: {
      denom: string;
      amount: Int;
    },
    tokenOutDenom: string,
    permitIntermediate: boolean
  ): Route {
    if (this.pools.length === 0) {
      throw new NoPoolsError();
    }

    if (!tokenIn.amount.isPositive()) {
      throw new Error("Token in amount can't be zero or negative");
    }

    const sortedRoutes = this.getRoutesSortedByExpectedTokenOut(
      tokenIn,
      tokenOutDenom,
      permitIntermediate
    );

    if (sortedRoutes.length === 0) {
      throw new Error("Can't find any best route unexpectedly");
    }

    return sortedRoutes[0];
  }

  /**
   * Returns routes sorted by the expected token out amount by descending order.
   * If the route which doesn't have enough assets (if first pool's limit amount is lesser than token in),
   * that route would be filtered.
   * NOTE: SwapFee is considered.
   * @param tokenIn
   * @param tokenOutDenom
   * @param permitIntermediate Calculate until level 1 multihop if true.
   */
  getRoutesSortedByExpectedTokenOut(
    tokenIn: {
      denom: string;
      amount: Int;
    },
    tokenOutDenom: string,
    permitIntermediate: boolean
  ): Route[] {
    if (this.pools.length === 0) {
      throw new NoPoolsError();
    }

    if (!tokenIn.amount.isPositive()) {
      throw new Error("Token in amount can't be zero or negative");
    }

    const candidates = this.getCandidateRoutes(
      tokenIn.denom,
      tokenOutDenom,
      permitIntermediate
    );

    return OptimizedRoutes.unwrapCachedPoolRoutes(
      OptimizedRoutes.wrapCachedPoolRoutes(candidates)
        .filter((pool) => {
          if (pool.pools.length === 0) {
            return false;
          }

          if (pool.pools[0].getLimitAmount(tokenIn.denom).lt(tokenIn.amount)) {
            return false;
          }

          try {
            // The error can be thrown if pool's asset or token in amount is too low or due to other unknown reasons...
            // If we don't handle thrown error, the remaining calculations for other pools also aren't processed.
            // For convenience, just filter such case if error thrown.
            OptimizedRoutes.calculateTokenOutByTokenIn([
              {
                amount: tokenIn.amount,
                ...pool,
              },
            ]);
            return true;
          } catch {
            return false;
          }
        })
        .sort((pool1, pool2) => {
          const tokenOut1 = OptimizedRoutes.calculateTokenOutByTokenIn([
            {
              amount: tokenIn.amount,
              ...pool1,
            },
          ]);
          const tokenOut2 = OptimizedRoutes.calculateTokenOutByTokenIn([
            {
              amount: tokenIn.amount,
              ...pool2,
            },
          ]);

          return tokenOut1.amount.gt(tokenOut2.amount) ? -1 : 1;
        })
    );
  }

  /**
   * Returns the routes which includes token in and token out.
   * @param tokenInDenom
   * @param tokenOutDenom
   * @param permitIntermediate Calculate until level 1 multihop if true
   * @protected
   */
  getCandidateRoutes(
    tokenInDenom: string,
    tokenOutDenom: string,
    permitIntermediate: boolean
  ): Route[] {
    if (this.pools.length === 0) {
      return [];
    }

    const cacheKey = `${tokenInDenom}/${tokenOutDenom}/${permitIntermediate}`;
    const cached = this.candidatePathsCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const filteredRoutePaths: Route[] = [];

    // Key is denom.
    const multihopCandiateHasOnlyInIntermediates: Map<string, Pool[]> =
      new Map();
    const multihopCandiateHasOnlyOutIntermediates: Map<string, Pool[]> =
      new Map();

    const cachedPools = OptimizedRoutes.wrapCachedPools(this.pools);
    for (const pool of cachedPools) {
      const hasTokenIn = pool.hasPoolAsset(tokenInDenom);
      const hasTokenOut = pool.hasPoolAsset(tokenOutDenom);
      if (hasTokenIn && hasTokenOut) {
        // If the pool has both token in and token out, we can swap directly from this pool.
        filteredRoutePaths.push({
          pools: [pool],
          tokenOutDenoms: [tokenOutDenom],
          tokenInDenom,
        });
      } else {
        if (permitIntermediate && (hasTokenIn || hasTokenOut)) {
          for (const poolAsset of pool.poolAssets) {
            const denom = poolAsset.denom;
            if (denom !== tokenInDenom && denom !== tokenOutDenom) {
              if (hasTokenIn) {
                const candiateData =
                  multihopCandiateHasOnlyInIntermediates.get(denom);
                if (candiateData) {
                  candiateData.push(pool);
                  multihopCandiateHasOnlyInIntermediates.set(
                    denom,
                    candiateData
                  );
                } else {
                  multihopCandiateHasOnlyInIntermediates.set(denom, [pool]);
                }
              } else {
                const candiateData =
                  multihopCandiateHasOnlyOutIntermediates.get(denom);
                if (candiateData) {
                  candiateData.push(pool);
                  multihopCandiateHasOnlyOutIntermediates.set(
                    denom,
                    candiateData
                  );
                } else {
                  multihopCandiateHasOnlyOutIntermediates.set(denom, [pool]);
                }
              }
            }
          }
        }
      }
    }

    this.candidatePathsCache.set(cacheKey, filteredRoutePaths);

    return OptimizedRoutes.unwrapCachedPoolRoutes(filteredRoutePaths);
  }

  getOptimizedRoutesByTokenIn(
    tokenIn: {
      denom: string;
      amount: Int;
    },
    tokenOutDenom: string,
    maxRoutes: number,
    iterations: number
  ): RouteWithAmount[] {
    if (!tokenIn.amount.isPositive()) {
      throw new Error("Token in amount can't be zero or negative");
    }

    // Sort routes by expected token out.
    let sortedRoutes = OptimizedRoutes.wrapCachedPoolRoutes(
      this.getRoutesSortedByExpectedTokenOut(tokenIn, tokenOutDenom, true)
    );

    // Do not need more routes than max routes.
    sortedRoutes = sortedRoutes.slice(0, maxRoutes);

    const initialSwapAmounts: Int[] = [];
    let totalLimitAmount = new Int(0);
    for (const route of sortedRoutes) {
      const limitAmount = route.pools[0].getLimitAmount(tokenIn.denom);

      totalLimitAmount = totalLimitAmount.add(limitAmount);

      if (totalLimitAmount.lt(tokenIn.amount)) {
        initialSwapAmounts.push(limitAmount);
      } else {
        let sumInitialSwapAmounts = new Int(0);
        for (const initialSwapAmount of initialSwapAmounts) {
          sumInitialSwapAmounts = sumInitialSwapAmounts.add(initialSwapAmount);
        }

        const diff = tokenIn.amount.sub(sumInitialSwapAmounts);
        initialSwapAmounts.push(diff);

        break;
      }
    }

    // No enough liquidity
    if (totalLimitAmount.lt(tokenIn.amount)) {
      throw new NotEnoughLiquidityError();
    }

    let bestRoutes = initialSwapAmounts.map((amount, i) => {
      return {
        ...sortedRoutes[i],
        amount,
      };
    });
    let bestTokenOut: Int =
      OptimizedRoutes.calculateTokenOutByTokenIn(bestRoutes).amount;

    // If there is only one route, the approximation result is the same. So there is no need to do that.
    if (bestRoutes.length > 1) {
      const candidateRoutes =
        OptimizedRoutes.approximateOptimizedRoutesByTokenIn(
          bestRoutes,
          iterations
        );
      const candidateTokenOut =
        OptimizedRoutes.calculateTokenOutByTokenIn(candidateRoutes).amount;
      if (candidateTokenOut.gt(bestTokenOut)) {
        bestRoutes = candidateRoutes;
        bestTokenOut = candidateTokenOut;
      } else {
        return OptimizedRoutes.unwrapCachedPoolRoutes(bestRoutes);
      }
    }

    const initialNumBestRoutes = initialSwapAmounts.length;

    for (let i = initialNumBestRoutes; i < sortedRoutes.length; i++) {
      const scaleFactor = new Dec(bestRoutes.length).quo(
        new Dec(bestRoutes.length + 1)
      );
      const candidateRoute = sortedRoutes[i];
      let candidateRoutes = bestRoutes.map((route) => {
        return {
          ...route,
          amount: route.amount.toDec().mul(scaleFactor).truncate(),
        };
      });
      let tempSumCandidateRouteAmounts = new Int(0);
      for (const route of candidateRoutes) {
        tempSumCandidateRouteAmounts = tempSumCandidateRouteAmounts.add(
          route.amount
        );
      }
      candidateRoutes.push({
        ...candidateRoute,
        amount: tokenIn.amount.sub(tempSumCandidateRouteAmounts),
      });

      let candidateTokenOut =
        OptimizedRoutes.calculateTokenOutByTokenIn(candidateRoutes).amount;

      if (candidateTokenOut.gt(bestTokenOut)) {
        bestRoutes = candidateRoutes;
        bestTokenOut = candidateTokenOut;
      }

      candidateRoutes = OptimizedRoutes.approximateOptimizedRoutesByTokenIn(
        candidateRoutes,
        iterations
      );
      candidateTokenOut =
        OptimizedRoutes.calculateTokenOutByTokenIn(candidateRoutes).amount;

      if (candidateTokenOut.gt(bestTokenOut)) {
        bestRoutes = candidateRoutes;
        bestTokenOut = candidateTokenOut;
      } else {
        return OptimizedRoutes.unwrapCachedPoolRoutes(bestRoutes);
      }
    }

    return OptimizedRoutes.unwrapCachedPoolRoutes(bestRoutes);
  }

  static approximateOptimizedRoutesByTokenIn(
    routes: RouteWithAmount[],
    iterations: number
  ): RouteWithAmount[] {
    // It's ideal that the swap result converges to the spot price
    // Impossible to get the exact spot price to converge, thus iterate and return routes cloesest to spotprice

    if (routes.length === 0) {
      return [];
    }

    if (routes.length === 1) {
      // No need to calculate if route is just one.
      return routes.slice();
    }

    let totalTokenInAmount = new Int(0);
    for (const route of routes) {
      totalTokenInAmount = totalTokenInAmount.add(route.amount);
    }

    let tokenInAmounts = routes.map((route) => route.amount);

    for (let i = 0; i < iterations; i++) {
      const spotPricesAfterSwap: Dec[] = [];
      const derivativeSPaSs: Dec[] = [];
      let sumInverseDerivativeSPaSs = new Dec(0);
      let sumSPaSDividedByDerivativeSPaSs = new Dec(0);

      for (const route of routes) {
        const spotPriceAfterSwap = OptimizedRoutes.calculateTokenOutByTokenIn([
          route,
        ]).afterSpotPriceInOverOut;
        const derivativeSPaS =
          OptimizedRoutes.calculateDerivativeSpotPriceInOverOutAfterSwapByTokenIn(
            route
          );

        spotPricesAfterSwap.push(spotPriceAfterSwap);
        derivativeSPaSs.push(derivativeSPaS);

        sumInverseDerivativeSPaSs = sumInverseDerivativeSPaSs.add(
          new Dec(1).quo(derivativeSPaS)
        );
        sumSPaSDividedByDerivativeSPaSs = sumSPaSDividedByDerivativeSPaSs.add(
          spotPriceAfterSwap.quo(derivativeSPaS)
        );
      }

      const targetSpotPriceInOverOut = sumSPaSDividedByDerivativeSPaSs.quo(
        sumInverseDerivativeSPaSs
      );

      const newTokenInAmounts: Int[] = tokenInAmounts.slice();
      let breakIteration = false;

      for (let j = 0; j < routes.length; j++) {
        const route = routes[j];

        const newTokenInAmount: Int = (() => {
          if (j === routes.length - 1) {
            // The last one would be subtraction of total amount and sum of prior amounts.
            // If this is done by actually calculating, the total amount could be  something like 999999uosmo
            // This could cause confusion to the users in the UI
            // thus this is done to set the exact token it amount set by the user
            let sub = new Int(0);

            for (let k = 0; k < j; k++) {
              sub = sub.add(newTokenInAmounts[k]);
            }

            return totalTokenInAmount.sub(sub);
          }

          return tokenInAmounts[j].add(
            targetSpotPriceInOverOut
              .sub(spotPricesAfterSwap[j])
              .quo(derivativeSPaSs[j])
              .truncate()
          );
        })();

        if (newTokenInAmount.lte(new Int(0))) {
          breakIteration = true;
          break;
        }

        if (
          route.pools[0]
            .getLimitAmount(route.tokenInDenom)
            .lte(newTokenInAmount)
        ) {
          breakIteration = true;
          break;
        }

        newTokenInAmounts[j] = newTokenInAmount;
      }

      if (breakIteration) {
        break;
      }
      tokenInAmounts = newTokenInAmounts;
    }

    return routes.map((route, i) => {
      return {
        ...route,
        amount: tokenInAmounts[i],
      };
    });
  }

  protected static calculateDerivativeSpotPriceInOverOutAfterSwapByTokenIn(
    route: RouteWithAmount
  ): Dec {
    // Method name too long… but meaningful

    if (route.pools.length === 0) {
      throw new Error("Can't calculate derivative because no pool provided");
    }

    if (route.pools.length === 1) {
      return route.pools[0].getDerivativeSpotPriceAfterTokenOutByTokenIn(
        {
          denom: route.tokenInDenom,
          amount: route.amount,
        },
        route.tokenOutDenoms[0]
      );
    }

    // Formula of SpotPriceAfterSwap(TokenIn) is below
    // SPaS(x) = SPaS1(x) * SPaS2(TokenOut1(x)) * SPaS3(TokenOut2(TokenOut1(x))) ...
    // We need the derivative of that
    // (Use product rule and chain rule)
    // SPaS'(x) = SPaS1'(x) * SPaS2(TokenOut1(x)) * SPaS3(TokenOut2(TokenOut1(x)))
    //            + SPaS2'(TokenOut1(x)) * SPaS1(x) * TokenOut1'(x) * SPaS3(TokenOut2(TokenOut1(x)))
    //            + SPaS3'(TokenOut2(TokenOut1(x))) * SPaS1(x) * TokenOut1'(x) * SPaS2(TokenOut1(x)) * TokenOut2'(TokenOut1(x)) ...
    // And, we can know "limit(h->0) (TokenOut(x+h)-TokenOut(x))/h = 1/SPaS(x)" intuitively. (TODO: Prove?)
    // Thus, below expression can be derived.
    // SPaS'(x) = SPaS1'(x) * SPaS2(TokenOut1(x)) * SPaS3(TokenOut2(TokenOut1(x)))
    //            + SPaS2'(TokenOut1(x)) * SPaS3(TokenOut2(TokenOut1(x)))
    //            + SPaS3'(TokenOut2(TokenOut1(x))) ...
    const spotPrices: Dec[] = [];
    const tokenIns: {
      denom: string;
      amount: Int;
    }[] = [
      {
        denom: route.tokenInDenom,
        amount: route.amount,
      },
    ];
    for (let i = 0; i < route.pools.length; i++) {
      const pool = route.pools[i];
      const tokenOutDenom = route.tokenOutDenoms[i];
      const tokenOut = pool.getTokenOutByTokenIn(tokenIns[i], tokenOutDenom);
      tokenIns.push({
        denom: tokenOutDenom,
        amount: tokenOut.amount,
      });
      spotPrices.push(
        tokenOut.afterPool.getSpotPriceInOverOut(
          tokenIns[i].denom,
          tokenOutDenom
        )
      );
    }

    let dec = new Dec(0);
    for (let i = 0; i < route.pools.length; i++) {
      const pool = route.pools[i];

      const derivativeSPaS = pool.getDerivativeSpotPriceAfterTokenOutByTokenIn(
        tokenIns[i],
        route.tokenOutDenoms[i]
      );

      const spotPriceProduct = (() => {
        let dec = new Dec(1);

        for (let j = i + 1; j < spotPrices.length; j++) {
          dec = dec.mul(spotPrices[j]);
        }

        return dec;
      })();

      dec = dec.add(derivativeSPaS.mul(spotPriceProduct));
    }

    return dec;
  }

  static calculateTokenOutByTokenIn(paths: RouteWithAmount[]): {
    amount: Int;
    beforeSpotPriceInOverOut: Dec;
    beforeSpotPriceOutOverIn: Dec;
    afterSpotPriceInOverOut: Dec;
    afterSpotPriceOutOverIn: Dec;
    effectivePriceInOverOut: Dec;
    effectivePriceOutOverIn: Dec;
    swapFee: Dec;
    slippage: Dec;
  } {
    if (paths.length === 0) {
      throw new Error("Paths are empty");
    }

    let totalOutAmount: Int = new Int(0);
    let totalBeforeSpotPriceInOverOut: Dec = new Dec(0);
    let totalAfterSpotPriceInOverOut: Dec = new Dec(0);
    let totalEffectivePriceInOverOut: Dec = new Dec(0);
    let totalSwapFee: Dec = new Dec(0);

    let sumAmount = new Int(0);
    for (const path of paths) {
      sumAmount = sumAmount.add(path.amount);
    }

    let outDenom: string | undefined;
    for (const path of paths) {
      if (
        path.pools.length !== path.tokenOutDenoms.length ||
        path.pools.length === 0
      ) {
        throw new Error("Invalid path");
      }

      if (!outDenom) {
        outDenom = path.tokenOutDenoms[path.tokenOutDenoms.length - 1];
      } else if (
        outDenom !== path.tokenOutDenoms[path.tokenOutDenoms.length - 1]
      ) {
        throw new Error("Paths have different out denom");
      }

      const amountFraction = path.amount.toDec().quoTruncate(sumAmount.toDec());

      let previousInDenom = path.tokenInDenom;
      let previousInAmount = path.amount;

      let beforeSpotPriceInOverOut: Dec = new Dec(1);
      let afterSpotPriceInOverOut: Dec = new Dec(1);
      let effectivePriceInOverOut: Dec = new Dec(1);
      let swapFee: Dec = new Dec(0);

      for (let i = 0; i < path.pools.length; i++) {
        const pool = path.pools[i];
        const outDenom = path.tokenOutDenoms[i];

        const tokenOut = pool.getTokenOutByTokenIn(
          { denom: previousInDenom, amount: previousInAmount },
          outDenom
        );

        beforeSpotPriceInOverOut = beforeSpotPriceInOverOut.mulTruncate(
          tokenOut.beforeSpotPriceInOverOut
        );
        afterSpotPriceInOverOut = afterSpotPriceInOverOut.mulTruncate(
          tokenOut.afterPool.getSpotPriceInOverOut(previousInDenom, outDenom)
        );
        effectivePriceInOverOut = effectivePriceInOverOut.mulTruncate(
          tokenOut.effectivePriceInOverOut
        );
        swapFee = swapFee.add(
          new Dec(1).sub(swapFee).mulTruncate(pool.swapFee)
        );

        if (i === path.pools.length - 1) {
          totalOutAmount = totalOutAmount.add(tokenOut.amount);

          totalBeforeSpotPriceInOverOut = totalBeforeSpotPriceInOverOut.add(
            beforeSpotPriceInOverOut.mulTruncate(amountFraction)
          );
          totalAfterSpotPriceInOverOut = totalAfterSpotPriceInOverOut.add(
            afterSpotPriceInOverOut.mulTruncate(amountFraction)
          );
          totalEffectivePriceInOverOut = totalEffectivePriceInOverOut.add(
            effectivePriceInOverOut.mulTruncate(amountFraction)
          );
          totalSwapFee = totalSwapFee.add(swapFee.mulTruncate(amountFraction));
        } else {
          previousInDenom = outDenom;
          previousInAmount = tokenOut.amount;
        }
      }
    }

    const slippage = totalEffectivePriceInOverOut
      .quo(totalBeforeSpotPriceInOverOut)
      .sub(new Dec("1"));

    return {
      amount: totalOutAmount,
      beforeSpotPriceInOverOut: totalBeforeSpotPriceInOverOut,
      beforeSpotPriceOutOverIn: new Dec(1).quoTruncate(
        totalBeforeSpotPriceInOverOut
      ),
      afterSpotPriceInOverOut: totalAfterSpotPriceInOverOut,
      afterSpotPriceOutOverIn: new Dec(1).quoTruncate(
        totalAfterSpotPriceInOverOut
      ),
      effectivePriceInOverOut: totalEffectivePriceInOverOut,
      effectivePriceOutOverIn: new Dec(1).quoTruncate(
        totalEffectivePriceInOverOut
      ),
      swapFee: totalSwapFee,
      slippage,
    };
  }

  /**
   * Returns the cached pools from pools.
   * If the element of pools is instance of CachedPools, just use as it is.
   * If the element of pools has `SymbolCachedPool` field, use that field.
   * If not, create new CachedPool and set that to `SymbolCachedPool` field.
   *
   *
   * `CachedPool` is used internally. Even if each method returns a `CachedPool`, it is safe in the `Pool` interface for the developers.
   * But they can't use `instanceof` or typecasting. Make sure to return unwrapped pools so that they don't have to care about type of `CachedPools`.
   * @param pools
   * @protected
   */
  static wrapCachedPools(pools: ReadonlyArray<Pool>): ReadonlyArray<Pool> {
    return pools.map((pool) => {
      if (pool instanceof CachedPool) {
        return pool;
      }

      if ((pool as any)[OptimizedRoutes.SymbolCachedPool]) {
        return (pool as any)[OptimizedRoutes.SymbolCachedPool] as Pool;
      }

      const cachedPool = new CachedPool(pool);
      (pool as any)[OptimizedRoutes.SymbolCachedPool] = cachedPool;
      return cachedPool;
    });
  }

  static unwrapCachedPools(pools: ReadonlyArray<Pool>): ReadonlyArray<Pool> {
    return pools.map((pool) => {
      if (pool instanceof CachedPool) {
        return pool.pool;
      }
      return pool;
    });
  }

  static wrapCachedPoolRoutes<R extends Route>(routes: R[]): R[] {
    return routes.map((r) => {
      return {
        ...r,
        pools: OptimizedRoutes.wrapCachedPools(r.pools),
      };
    });
  }

  static unwrapCachedPoolRoutes<R extends Route>(routes: R[]): R[] {
    return routes.map((r) => {
      return {
        ...r,
        pools: OptimizedRoutes.unwrapCachedPools(r.pools),
      };
    });
  }
}
