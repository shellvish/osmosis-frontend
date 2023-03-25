import { when } from "mobx";
import type { NextApiRequest, NextApiResponse } from "next";

import { RootStore } from "~/stores/root";

export default async function poolsWithMetrics(
  _req: NextApiRequest,
  res: NextApiResponse<{
    data: any[] | undefined;
  }>
) {
  const rootStore = new RootStore(new Promise((res) => res(undefined)) as any);

  const {
    derivedDataStore,
    chainStore: { osmosis },
  } = rootStore;

  await when(() => {
    const poolsWithMetrics =
      derivedDataStore.poolsWithMetrics.get(osmosis.chainId).getAllPools() ??
      [];
    return (
      poolsWithMetrics.every((pool) =>
        Boolean(Number(pool.apr.toDec().toString()))
      ) && poolsWithMetrics.length > 0
    );
  });

  const data = derivedDataStore.poolsWithMetrics
    .get(osmosis.chainId)
    .getAllPools("apr", true)
    .map(({ pool }) => pool.id);

  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate"); // 1 minute cache
  res.status(200).json({
    data,
  });
}
