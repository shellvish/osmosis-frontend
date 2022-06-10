import { Pool } from "./interface";
import { Int } from "@keplr-wallet/unit";

export interface Route {
  readonly pools: ReadonlyArray<Pool>;
  // tokenOutDenoms means the token to come out from each pool.
  // This should the same length with the pools.
  // RoutePath consists of token in -> pool -> token out -> pool -> token out...
  // But, currently, only 1 intermediate can be supported.
  readonly tokenOutDenoms: ReadonlyArray<string>;
  readonly tokenInDenom: string;
}

export interface RouteWithAmount extends Route {
  readonly amount: Int;
}
