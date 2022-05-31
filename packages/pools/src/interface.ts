import { Dec, Int } from "@keplr-wallet/unit";

/**
 * Pool is the interface to generalize multiple type of pools.
 * Implementations of this interface must be immutable.
 * Many logics using this interface assume that the implementation of this interface is immutable,
 * so if the implementation is not immutable, the problems occur.
 */
export interface Pool {
  get id(): string;

  get totalWeight(): Int;

  get totalShare(): Int;
  get shareDenom(): string;

  get swapFee(): Dec;
  get exitFee(): Dec;

  get poolAssets(): ReadonlyArray<{
    readonly denom: string;
    readonly amount: Int;
    readonly weight: Int;
  }>;
  getPoolAsset(denom: string): {
    readonly denom: string;
    readonly amount: Int;
    readonly weight: Int;
  };
  hasPoolAsset(denom: string): boolean;

  getSpotPriceInOverOut(tokenInDenom: string, tokenOutDenom: string): Dec;
  getSpotPriceOutOverIn(tokenInDenom: string, tokenOutDenom: string): Dec;
  getSpotPriceInOverOutWithoutSwapFee(
    tokenInDenom: string,
    tokenOutDenom: string
  ): Dec;
  getSpotPriceOutOverInWithoutSwapFee(
    tokenInDenom: string,
    tokenOutDenom: string
  ): Dec;

  getTokenOutByTokenIn(
    tokenIn: {
      readonly denom: string;
      readonly amount: Int;
    },
    tokenOutDenom: string
  ): {
    readonly afterPool: Pool;

    readonly amount: Int;
    readonly beforeSpotPriceInOverOut: Dec;
    readonly beforeSpotPriceOutOverIn: Dec;
    readonly effectivePriceInOverOut: Dec;
    readonly effectivePriceOutOverIn: Dec;
    readonly slippage: Dec;
  };
  getTokenInByTokenOut(
    tokenOut: {
      readonly denom: string;
      readonly amount: Int;
    },
    tokenInDenom: string
  ): {
    readonly afterPool: Pool;

    readonly amount: Int;
    readonly beforeSpotPriceInOverOut: Dec;
    readonly beforeSpotPriceOutOverIn: Dec;
    readonly effectivePriceInOverOut: Dec;
    readonly effectivePriceOutOverIn: Dec;
    readonly slippage: Dec;
  };

  getLimitAmount(denom: string): Int;
  getDerivativeSpotPriceAfterTokenOutByTokenIn(
    tokenIn: {
      readonly denom: string;
      readonly amount: Int;
    },
    tokenOutDenom: string
  ): Dec;
}
