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
