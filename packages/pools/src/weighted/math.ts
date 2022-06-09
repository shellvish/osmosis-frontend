import { Dec } from "@keplr-wallet/unit";
import { powWithBinomialSeries } from "../math";

export class WeightedPoolMath {
  protected static oneDec = new Dec(1);

  static calcSpotPrice(
    tokenBalanceIn: Dec,
    tokenWeightIn: Dec,
    tokenBalanceOut: Dec,
    tokenWeightOut: Dec,
    swapFee: Dec
  ): Dec {
    const number = tokenBalanceIn.quo(tokenWeightIn);
    const denom = tokenBalanceOut.quo(tokenWeightOut);
    const scale = WeightedPoolMath.oneDec.quo(
      WeightedPoolMath.oneDec.sub(swapFee)
    );

    return number.quo(denom).mul(scale);
  }

  public static calcOutGivenIn(
    tokenBalanceIn: Dec,
    tokenWeightIn: Dec,
    tokenBalanceOut: Dec,
    tokenWeightOut: Dec,
    tokenAmountIn: Dec,
    swapFee: Dec
  ): Dec {
    const weightRatio = tokenWeightIn.quo(tokenWeightOut);
    let adjustedIn = WeightedPoolMath.oneDec.sub(swapFee);
    adjustedIn = tokenAmountIn.mul(adjustedIn);
    const y = tokenBalanceIn.quo(tokenBalanceIn.add(adjustedIn));
    const foo = powWithBinomialSeries(y, weightRatio);
    const bar = WeightedPoolMath.oneDec.sub(foo);
    return tokenBalanceOut.mul(bar);
  }

  public static calcInGivenOut(
    tokenBalanceIn: Dec,
    tokenWeightIn: Dec,
    tokenBalanceOut: Dec,
    tokenWeightOut: Dec,
    tokenAmountOut: Dec,
    swapFee: Dec
  ): Dec {
    const weightRatio = tokenWeightOut.quo(tokenWeightIn);
    const diff = tokenBalanceOut.sub(tokenAmountOut);
    const y = tokenBalanceOut.quo(diff);
    let foo = powWithBinomialSeries(y, weightRatio);
    foo = foo.sub(WeightedPoolMath.oneDec);
    const tokenAmountIn = WeightedPoolMath.oneDec.sub(swapFee);
    return tokenBalanceIn.mul(foo).quo(tokenAmountIn);
  }
}
