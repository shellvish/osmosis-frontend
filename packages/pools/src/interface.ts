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

  get poolAssets(): {
    denom: string;
    amount: Int;
    weight: Int;
  }[];
  getPoolAsset(denom: string): {
    denom: string;
    amount: Int;
    weight: Int;
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
      denom: string;
      amount: Int;
    },
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
  };
  getTokenInByTokenOut(
    tokenOut: {
      denom: string;
      amount: Int;
    },
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
  };

  getLimitAmountByTokenIn(denom: string): Int;
  getDerivativeSpotPriceAfterSwapTokenIn(
    tokenIn: {
      denom: string;
      amount: Int;
    },
    tokenOutDenom: string
  ): Dec;
}
