import { Pool } from "./interface";
import { Coin, Dec, Int } from "@keplr-wallet/unit";
import { WeightedPoolMath } from "@osmosis-labs/math";

export interface WeightedPoolRaw {
  readonly id: string;
  readonly poolParams: {
    readonly lock: boolean;
    // Dec
    readonly swapFee: string;
    // Dec
    readonly exitFee: string;
    readonly smoothWeightChangeParams: {
      // Timestamp
      readonly start_time: string;
      // Seconds with s suffix. Ex) 3600s
      readonly duration: string;
      readonly initialPoolWeights: ReadonlyArray<{
        readonly token: {
          readonly denom: string;
          // Int
          readonly amount: string;
        };
        // Int
        readonly weight: string;
      }>;
      readonly targetPoolWeights: ReadonlyArray<{
        readonly token: {
          readonly denom: string;
          // Int
          readonly amount: string;
        };
        // Int
        readonly weight: string;
      }>;
    } | null;
  };
  // Int
  readonly totalWeight: string;
  readonly totalShares: {
    readonly denom: string;
    // Int
    readonly amount: string;
  };
  readonly poolAssets: ReadonlyArray<{
    // Int
    readonly weight: string;
    readonly token: {
      readonly denom: string;
      // Int
      readonly amount: string;
    };
  }>;
}

export class WeightedPool implements Pool {
  constructor(public readonly raw: WeightedPoolRaw) {}

  get exitFee(): Dec {
    return new Dec(this.raw.poolParams.exitFee);
  }

  get id(): string {
    return this.raw.id;
  }

  get poolAssets(): { denom: string; amount: Int; weight: Int }[] {
    return this.raw.poolAssets.map((asset) => {
      return {
        denom: asset.token.denom,
        amount: new Int(asset.token.amount),
        weight: new Int(asset.weight),
      };
    });
  }

  get shareDenom(): string {
    return this.raw.totalShares.denom;
  }

  get swapFee(): Dec {
    return new Dec(this.raw.poolParams.swapFee);
  }

  get totalShare(): Int {
    return new Int(this.raw.totalShares.amount);
  }

  getPoolAsset(denom: string): { denom: string; amount: Int; weight: Int } {
    const poolAsset = this.poolAssets.find((asset) => asset.denom === denom);
    if (!poolAsset) {
      throw new Error(
        `Pool ${this.id} doesn't have the pool asset for ${denom}`
      );
    }

    return poolAsset;
  }

  hasPoolAsset(denom: string): boolean {
    const poolAsset = this.poolAssets.find((asset) => asset.denom === denom);
    return poolAsset != null;
  }

  get totalWeight(): Int {
    return new Int(this.raw.totalWeight);
  }

  getSpotPriceInOverOut(tokenInDenom: string, tokenOutDenom: string): Dec {
    const inPoolAsset = this.getPoolAsset(tokenInDenom);
    const outPoolAsset = this.getPoolAsset(tokenOutDenom);

    return WeightedPoolMath.calcSpotPrice(
      new Dec(inPoolAsset.amount),
      new Dec(inPoolAsset.weight),
      new Dec(outPoolAsset.amount),
      new Dec(outPoolAsset.weight),
      this.swapFee
    );
  }

  getSpotPriceInOverOutWithoutSwapFee(
    tokenInDenom: string,
    tokenOutDenom: string
  ): Dec {
    const inPoolAsset = this.getPoolAsset(tokenInDenom);
    const outPoolAsset = this.getPoolAsset(tokenOutDenom);

    return WeightedPoolMath.calcSpotPrice(
      new Dec(inPoolAsset.amount),
      new Dec(inPoolAsset.weight),
      new Dec(outPoolAsset.amount),
      new Dec(outPoolAsset.weight),
      new Dec(0)
    );
  }

  getSpotPriceOutOverIn(tokenInDenom: string, tokenOutDenom: string): Dec {
    return new Dec(1).quoTruncate(
      this.getSpotPriceInOverOut(tokenInDenom, tokenOutDenom)
    );
  }

  getSpotPriceOutOverInWithoutSwapFee(
    tokenInDenom: string,
    tokenOutDenom: string
  ): Dec {
    return new Dec(1).quoTruncate(
      this.getSpotPriceInOverOutWithoutSwapFee(tokenInDenom, tokenOutDenom)
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
    const inPoolAsset = this.getPoolAsset(tokenInDenom);
    const outPoolAsset = this.getPoolAsset(tokenOut.denom);

    const beforeSpotPriceInOverOut = WeightedPoolMath.calcSpotPrice(
      new Dec(inPoolAsset.amount),
      new Dec(inPoolAsset.weight),
      new Dec(outPoolAsset.amount),
      new Dec(outPoolAsset.weight),
      this.swapFee
    );

    const tokenInAmount = WeightedPoolMath.calcInGivenOut(
      new Dec(inPoolAsset.amount),
      new Dec(inPoolAsset.weight),
      new Dec(outPoolAsset.amount),
      new Dec(outPoolAsset.weight),
      new Dec(tokenOut.amount),
      this.swapFee
    ).truncate();

    const effectivePrice = new Dec(tokenInAmount).quo(new Dec(tokenOut.amount));
    const slippage = effectivePrice
      .quo(beforeSpotPriceInOverOut)
      .sub(new Dec("1"));

    return {
      afterPool: WeightedPool.applyWeightedPoolRawPoolAssetChanges(this.raw, [
        {
          denom: tokenInDenom,
          amount: tokenInAmount,
        },
        {
          denom: tokenOut.denom,
          amount: tokenOut.amount.neg(),
        },
      ]),

      amount: tokenInAmount,
      beforeSpotPriceInOverOut,
      beforeSpotPriceOutOverIn: new Dec(1).quoTruncate(
        beforeSpotPriceInOverOut
      ),
      effectivePriceInOverOut: effectivePrice,
      effectivePriceOutOverIn: new Dec(1).quoTruncate(effectivePrice),
      slippage: slippage,
    };
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
    const inPoolAsset = this.getPoolAsset(tokenIn.denom);
    const outPoolAsset = this.getPoolAsset(tokenOutDenom);

    const beforeSpotPriceInOverOut = WeightedPoolMath.calcSpotPrice(
      new Dec(inPoolAsset.amount),
      new Dec(inPoolAsset.weight),
      new Dec(outPoolAsset.amount),
      new Dec(outPoolAsset.weight),
      this.swapFee
    );

    const tokenOutAmount = WeightedPoolMath.calcOutGivenIn(
      new Dec(inPoolAsset.amount),
      new Dec(inPoolAsset.weight),
      new Dec(outPoolAsset.amount),
      new Dec(outPoolAsset.weight),
      new Dec(tokenIn.amount),
      this.swapFee
    ).truncate();

    const effectivePrice = new Dec(tokenIn.amount).quo(new Dec(tokenOutAmount));
    const slippage = effectivePrice
      .quo(beforeSpotPriceInOverOut)
      .sub(new Dec("1"));

    return {
      afterPool: WeightedPool.applyWeightedPoolRawPoolAssetChanges(this.raw, [
        {
          denom: tokenIn.denom,
          amount: tokenIn.amount,
        },
        {
          denom: tokenOutDenom,
          amount: tokenOutAmount.neg(),
        },
      ]),

      amount: tokenOutAmount,
      beforeSpotPriceInOverOut,
      beforeSpotPriceOutOverIn: new Dec(1).quoTruncate(
        beforeSpotPriceInOverOut
      ),
      effectivePriceInOverOut: effectivePrice,
      effectivePriceOutOverIn: new Dec(1).quoTruncate(effectivePrice),
      slippage: slippage,
    };
  }

  getLimitAmount(denom: string): Int {
    return this.getPoolAsset(denom)
      .amount.toDec()
      .mul(new Dec("0.3"))
      .truncate();
  }

  getDerivativeSpotPriceAfterTokenOutByTokenIn(
    tokenIn: { denom: string; amount: Int },
    tokenOutDenom: string
  ): Dec {
    // spot price after token out by token in =
    //     - (Bi * Wo) / (Bo * (-1 + swap fee) * (Bi / (x + Bi - (x * swap fee))) ^ ((Wi + Wo) / Wo) * Wi)
    // derivative of above =
    //     (Wi + Wo) * (Bi / (Bi - (x * swap fee) + x)) ^ -(Wi / Wo) / (Bo * Wi)

    const inPoolAsset = this.getPoolAsset(tokenIn.denom);
    const outPoolAsset = this.getPoolAsset(tokenOutDenom);

    const temp = WeightedPoolMath.pow(
      inPoolAsset.amount
        .toDec()
        .quo(
          inPoolAsset.amount
            .toDec()
            .sub(tokenIn.amount.toDec().mul(this.swapFee))
            .add(tokenIn.amount.toDec())
        ),
      inPoolAsset.weight.toDec().quo(outPoolAsset.weight.toDec()).neg()
    );

    return inPoolAsset.weight
      .add(outPoolAsset.weight)
      .toDec()
      .mul(temp)
      .quo(outPoolAsset.amount.toDec().mul(inPoolAsset.weight.toDec()));
  }

  protected static applyWeightedPoolRawPoolAssetChanges(
    raw: WeightedPoolRaw,
    changes: Coin[]
  ): WeightedPool {
    const poolAssets = raw.poolAssets as {
      // Int
      weight: string;
      token: {
        denom: string;
        // Int
        amount: string;
      };
    }[];

    const changesMap: Map<string, Int> = new Map();
    for (const change of changes) {
      if (changesMap.has(change.denom)) {
        throw new Error(`Changes are duplicated: ${change.denom}`);
      }

      changesMap.set(change.denom, change.amount);
    }

    for (const poolAsset of poolAssets) {
      const change = changesMap.get(poolAsset.token.denom);
      if (change) {
        poolAsset.token.amount = new Int(poolAsset.token.amount)
          .add(change)
          .toString();

        changesMap.delete(poolAsset.token.denom);
      }
    }

    if (changesMap.size > 0) {
      throw new Error("There are remaining changes");
    }

    return new WeightedPool({
      ...raw,
      poolAssets,
    });
  }
}
