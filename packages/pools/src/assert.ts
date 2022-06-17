import { Route } from "./types";

export function assertRoutesHaveSameTokenInAndTokenOut(routes: Route[]) {
  if (routes.length === 0) {
    throw new Error("Routes is empty");
  }

  let tokenInDenom: string = "";
  let tokenOutDenom: string = "";

  for (let i = 0; i < routes.length; i++) {
    const route = routes[i];

    if (!route.tokenInDenom) {
      throw new Error("Empty token in denom");
    }

    if (route.tokenOutDenoms.length === 0) {
      throw new Error("Empty token out denoms");
    }

    if (!route.tokenOutDenoms[route.tokenOutDenoms.length - 1]) {
      throw new Error("Empty last token out");
    }

    if (i === 0) {
      tokenInDenom = route.tokenInDenom;
      tokenOutDenom = route.tokenOutDenoms[route.tokenOutDenoms.length - 1];
    } else {
      if (route.tokenInDenom !== tokenInDenom) {
        throw new Error("Routes have different token in");
      }
      if (
        route.tokenOutDenoms[route.tokenOutDenoms.length - 1] !== tokenOutDenom
      ) {
        throw new Error("Routes have different token out");
      }
    }
  }
}

export function assertRoutesHaveNoDuplicatedPool(routes: Route[]) {
  const usedPoolIds: Map<string, boolean> = new Map();

  for (const route of routes) {
    for (const pool of route.pools) {
      if (usedPoolIds.has(pool.id)) {
        throw new Error(`Routes have duplicated pool: ${pool.id}`);
      }

      usedPoolIds.set(pool.id, true);
    }
  }
}
