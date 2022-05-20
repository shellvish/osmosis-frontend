import { Pool } from "./interface";
import { Dec, Int } from "@keplr-wallet/unit";

/**
 * CachedPool maintains some pool's result to cache.
 * Used for simplifying complex calculation such as smart order router
 * by separating the actual logic and caching logic.
 * TODO: Currently, there is no logic to remove outdated cache data.
 *       Thus, memory leak can happen.
 *       Make the logic to remove outdated cache (by using LRU?)
 */
export class CachedPool implements Pool {
  protected cached: Map<string, any> = new Map();

  constructor(public readonly pool: Pool) {}

  clearCache() {
    this.cached = new Map();
  }

  protected getOrSetCache<R>(key: string, fn: () => R): R {
    const cached = this.cached.get(key);
    if (cached) {
      return cached;
    }

    const value = fn();
    this.cached.set(key, value);
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
    amount: Int;
    beforeSpotPriceInOverOut: Dec;
    beforeSpotPriceOutOverIn: Dec;
    afterSpotPriceInOverOut: Dec;
    afterSpotPriceOutOverIn: Dec;
    effectivePriceInOverOut: Dec;
    effectivePriceOutOverIn: Dec;
    slippage: Dec;
  } {
    return this.getOrSetCache(
      `getTokenInByTokenOut/${tokenOut.amount.toString()}${
        tokenOut.denom
      }/${tokenInDenom}`,
      () => {
        return this.pool.getTokenInByTokenOut(tokenOut, tokenInDenom);
      }
    );
  }

  getTokenOutByTokenIn(
    tokenIn: { denom: string; amount: Int },
    tokenOutDenom: string
  ): {
    amount: Int;
    beforeSpotPriceInOverOut: Dec;
    beforeSpotPriceOutOverIn: Dec;
    afterSpotPriceInOverOut: Dec;
    afterSpotPriceOutOverIn: Dec;
    effectivePriceInOverOut: Dec;
    effectivePriceOutOverIn: Dec;
    slippage: Dec;
  } {
    return this.getOrSetCache(
      `getTokenOutByTokenIn/${tokenIn.amount.toString()}${
        tokenIn.denom
      }/${tokenOutDenom}`,
      () => {
        return this.pool.getTokenOutByTokenIn(tokenIn, tokenOutDenom);
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
