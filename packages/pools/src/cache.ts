import { Pool } from "./interface";
import { Dec, Int } from "@keplr-wallet/unit";
import { SimpleLRUCache } from "./lru-cache";

/**
 * CachedPool maintains some pool's result to cache.
 * Used for simplifying complex calculation such as smart order router
 * by separating the actual logic and caching logic.
 */
export class CachedPool implements Pool {
  protected cache: SimpleLRUCache;

  constructor(
    public readonly pool: Pool,
    public readonly cacheMaxSize: number = 30
  ) {
    this.cache = new SimpleLRUCache(cacheMaxSize);
  }

  clearCache() {
    this.cache.clear();
  }

  protected getOrSetCache<R>(key: string, fn: () => R): R {
    const cached = this.cache.get(key);
    if (cached) {
      return cached;
    }

    const value = fn();
    this.cache.set(key, value);
    return value;
  }

  get exitFee(): Dec {
    return this.getOrSetCache("exitFee", () => {
      return this.pool.exitFee;
    });
  }

  get id(): string {
    return this.getOrSetCache("id", () => {
      return this.pool.id;
    });
  }

  get poolAssets(): { denom: string; amount: Int; weight: Int }[] {
    return this.getOrSetCache("poolAssets", () => {
      return this.pool.poolAssets;
    });
  }

  get shareDenom(): string {
    return this.getOrSetCache("shareDenom", () => {
      return this.pool.shareDenom;
    });
  }

  get swapFee(): Dec {
    return this.getOrSetCache("swapFee", () => {
      return this.pool.swapFee;
    });
  }

  get totalShare(): Int {
    return this.getOrSetCache("totalShare", () => {
      return this.pool.totalShare;
    });
  }

  getPoolAsset(denom: string): { denom: string; amount: Int; weight: Int } {
    return this.getOrSetCache(`getPoolAsset/${denom}`, () => {
      return this.pool.getPoolAsset(denom);
    });
  }

  hasPoolAsset(denom: string): boolean {
    return this.getOrSetCache(`hasPoolAsset/${denom}`, () => {
      return this.pool.hasPoolAsset(denom);
    });
  }

  get totalWeight(): Int {
    return this.getOrSetCache("totalWeight", () => {
      return this.pool.totalWeight;
    });
  }

  getSpotPriceInOverOut(tokenInDenom: string, tokenOutDenom: string): Dec {
    return this.getOrSetCache(
      `getSpotPriceInOverOut/${tokenInDenom}/${tokenOutDenom}`,
      () => {
        return this.pool.getSpotPriceInOverOut(tokenInDenom, tokenOutDenom);
      }
    );
  }

  getSpotPriceInOverOutWithoutSwapFee(
    tokenInDenom: string,
    tokenOutDenom: string
  ): Dec {
    return this.getOrSetCache(
      `getSpotPriceInOverOutWithoutSwapFee/${tokenInDenom}/${tokenOutDenom}`,
      () => {
        return this.pool.getSpotPriceInOverOutWithoutSwapFee(
          tokenInDenom,
          tokenOutDenom
        );
      }
    );
  }

  getSpotPriceOutOverIn(tokenInDenom: string, tokenOutDenom: string): Dec {
    return this.getOrSetCache(
      `getSpotPriceOutOverIn/${tokenInDenom}/${tokenOutDenom}`,
      () => {
        return this.pool.getSpotPriceOutOverIn(tokenInDenom, tokenOutDenom);
      }
    );
  }

  getSpotPriceOutOverInWithoutSwapFee(
    tokenInDenom: string,
    tokenOutDenom: string
  ): Dec {
    return this.getOrSetCache(
      `getSpotPriceOutOverInWithoutSwapFee/${tokenInDenom}/${tokenOutDenom}`,
      () => {
        return this.pool.getSpotPriceOutOverInWithoutSwapFee(
          tokenInDenom,
          tokenOutDenom
        );
      }
    );
  }

  getTokenInByTokenOut(
    tokenOut: { denom: string; amount: Int },
    tokenInDenom: string
  ): {
    afterPool: Pool;

    amount: Int;
    beforeSpotPriceInOverOut: Dec;
    beforeSpotPriceOutOverIn: Dec;
    effectivePriceInOverOut: Dec;
    effectivePriceOutOverIn: Dec;
    slippage: Dec;
  } {
    return this.getOrSetCache(
      `getTokenInByTokenOut/${tokenOut.amount.toString()}${
        tokenOut.denom
      }/${tokenInDenom}`,
      () => {
        const res = this.pool.getTokenInByTokenOut(tokenOut, tokenInDenom);
        return {
          ...res,
          afterPool: new CachedPool(res.afterPool),
        };
      }
    );
  }

  getTokenOutByTokenIn(
    tokenIn: { denom: string; amount: Int },
    tokenOutDenom: string
  ): {
    afterPool: Pool;

    amount: Int;
    beforeSpotPriceInOverOut: Dec;
    beforeSpotPriceOutOverIn: Dec;
    effectivePriceInOverOut: Dec;
    effectivePriceOutOverIn: Dec;
    slippage: Dec;
  } {
    return this.getOrSetCache(
      `getTokenOutByTokenIn/${tokenIn.amount.toString()}${
        tokenIn.denom
      }/${tokenOutDenom}`,
      () => {
        const res = this.pool.getTokenOutByTokenIn(tokenIn, tokenOutDenom);
        return {
          ...res,
          afterPool: new CachedPool(res.afterPool),
        };
      }
    );
  }

  getLimitAmountByTokenIn(denom: string): Int {
    return this.getOrSetCache(`getLimitAmountByTokenIn/${denom}`, () => {
      return this.pool.getLimitAmountByTokenIn(denom);
    });
  }

  getDerivativeSpotPriceAfterSwapTokenIn(
    tokenIn: { denom: string; amount: Int },
    tokenOutDenom: string
  ): Dec {
    return this.getOrSetCache(
      `getDerivativeSpotPriceAfterSwapTokenIn/${tokenIn.amount.toString()}${
        tokenIn.denom
      }/${tokenOutDenom}`,
      () => {
        return this.pool.getDerivativeSpotPriceAfterSwapTokenIn(
          tokenIn,
          tokenOutDenom
        );
      }
    );
  }
}
