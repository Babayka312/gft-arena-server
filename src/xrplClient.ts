import { Client, dropsToXrp } from 'xrpl';
import { API_BASE } from './apiConfig';

const XRPL_WS = 'wss://xrplcluster.com';

export type NftBonusCollection = {
  id: 'dualForce' | 'cryptoAlliance' | 'genesisCrown';
  name: string;
  available: boolean;
  owned: boolean;
  count: number;
  holdRewardBonus: number;
  gameRewardBonus: number;
};

export type NftBonuses = {
  collections: NftBonusCollection[];
  holdRewardBonus: number;
  gameRewardBonus: number;
  checkedAt: string;
};

export async function getXrpBalance(address: string): Promise<string> {
  const client = new Client(XRPL_WS);
  await client.connect();
  try {
    const resp = await client.request({
      command: 'account_info',
      account: address,
      ledger_index: 'validated',
    });
    const drops = resp.result.account_data.Balance;
    const xrp = dropsToXrp(String(drops));
    return String(xrp);
  } finally {
    await client.disconnect();
  }
}

export async function getNftBonuses(address: string): Promise<NftBonuses> {
  const r = await fetch(`${API_BASE}/api/xrpl/account/${encodeURIComponent(address)}/nft-bonuses`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

/** Бета: бонусы с учётом виртуальных NFT (nftSim) на сервере. */
export async function getNftBonusesForPlayer(playerId: string, address: string | null): Promise<NftBonuses> {
  const r = await fetch(
    `${API_BASE}/api/player/${encodeURIComponent(playerId)}/nft-bonuses?account=${encodeURIComponent(address ?? '')}`,
  );
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

