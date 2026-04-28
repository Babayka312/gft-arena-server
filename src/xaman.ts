import { API_BASE } from './apiConfig';

export type XamanSignInResponse = {
  uuid: string;
  next?: {
    always?: string; // deep link / URL
  };
  refs?: {
    qr_png?: string;
    qr_matrix?: string;
  };
  pushed?: boolean;
};

export type XamanPayload = {
  meta?: {
    uuid?: string;
    exists?: boolean;
    expired?: boolean;
    resolved?: boolean;
    signed?: boolean;
    cancelled?: boolean;
  };
  response?: {
    account?: string;
  };
};

export async function xamanCreateSignIn(): Promise<XamanSignInResponse> {
  const r = await fetch(`${API_BASE}/api/xaman/signin`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function xamanGetPayload(uuid: string): Promise<XamanPayload> {
  const r = await fetch(`${API_BASE}/api/xaman/payload/${encodeURIComponent(uuid)}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export type GftDepositCreateResponse = XamanSignInResponse;

export type GftDepositVerifyResponse =
  | { status: 'pending' | 'submitted' | 'cancelled' | 'expired' | 'not_signed' }
  | { status: 'invalid'; reason: string; txid?: string; account?: string }
  | { status: 'credited'; account?: string; txid: string; amount: string; currency: string; issuer: string };

export async function gftCreateDeposit(amount: string, account: string): Promise<GftDepositCreateResponse> {
  const r = await fetch(`${API_BASE}/api/gft/deposit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ amount, account }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function gftVerifyDeposit(uuid: string): Promise<GftDepositVerifyResponse> {
  const r = await fetch(`${API_BASE}/api/gft/deposit/${encodeURIComponent(uuid)}/verify`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

