import type { CSSProperties, ReactNode } from 'react';
import type { ShopCoinPacksResponse } from '../shopCoinPacks';
import { Background } from '../components/ui/Background';

function shopPanelStyle(accentRgb: string): CSSProperties {
  return {
    background: 'linear-gradient(155deg, rgba(15,23,42,0.94) 0%, rgba(15,23,42,0.72) 100%)',
    border: `1px solid ${accentRgb}`,
    borderRadius: '18px',
    padding: '14px',
    textAlign: 'left',
    boxShadow: `0 0 0 1px ${accentRgb}22, 0 18px 44px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)`,
  };
}

const titleStyle: CSSProperties = {
  color: '#eab308',
  margin: '0 0 18px',
  fontSize: 'clamp(20px, 4.5vw, 30px)',
  lineHeight: 1.05,
  fontWeight: 950,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  textShadow: '0 0 18px #eab30844, 0 4px 14px rgba(0,0,0,0.85)',
};

function ShopSubShell({
  background,
  contentInset,
  title,
  onBack,
  children,
}: {
  background: string;
  contentInset: CSSProperties;
  title: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <Background
      background={background}
      gradient="linear-gradient(180deg, rgba(2,6,23,0.82) 0%, rgba(15,23,42,0.5) 35%, rgba(2,6,23,0.78) 100%)"
      style={{
        ...contentInset,
        textAlign: 'center',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '8px 12px 20px', width: '100%', boxSizing: 'border-box' }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            marginBottom: '12px',
            padding: '10px 16px',
            background: 'rgba(15,23,42,0.85)',
            color: '#e2e8f0',
            border: '1px solid rgba(148,163,184,0.4)',
            borderRadius: '12px',
            fontWeight: 800,
            cursor: 'pointer',
            fontSize: 'clamp(12px, 3vw, 14px)',
          }}
        >
          ← В магазин
        </button>
        <h2 style={titleStyle}>{title}</h2>
        {children}
      </div>
    </Background>
  );
}

export type ShopXrpSubscreenProps = {
  background: string;
  contentInset: CSSProperties;
  shopCoinPacks: ShopCoinPacksResponse | null;
  xrpCoinBusy: boolean;
  onBack: () => void;
  onStartXrpCoinPurchase: (packId: string) => void;
};

export function ShopXrpSubscreen({
  background,
  contentInset,
  shopCoinPacks,
  xrpCoinBusy,
  onBack,
  onStartXrpCoinPurchase,
}: ShopXrpSubscreenProps) {
  return (
    <ShopSubShell background={background} contentInset={contentInset} title="⛓️ Покупки за XRP" onBack={onBack}>
      <section style={shopPanelStyle('rgba(56,189,248,0.4)')}>
        <p style={{ color: '#94a3b8', fontSize: 'clamp(10px, 2.6vw, 12px)', margin: '0 0 10px 0', lineHeight: 1.45, textAlign: 'left' }}>
          Оплата в XRP через Xaman (как при депозите GFT). Курс и цены паков задаются на сервере.
        </p>
        {!shopCoinPacks && <div style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'left' }}>Загрузка паков…</div>}
        {shopCoinPacks && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '6px' }}>
            {shopCoinPacks.xrp.map(p => (
              <button
                type="button"
                key={p.id}
                onClick={() => void onStartXrpCoinPurchase(p.id)}
                disabled={xrpCoinBusy}
                style={{
                  padding: '9px 10px',
                  minWidth: 0,
                  background: xrpCoinBusy ? '#334155' : '#0369a1',
                  color: '#f0f9ff',
                  border: '1px solid #38bdf8',
                  borderRadius: '12px',
                  fontWeight: 900,
                  textAlign: 'left',
                  cursor: xrpCoinBusy ? 'not-allowed' : 'pointer',
                  fontSize: 'clamp(10px, 2.7vw, 12px)',
                }}
              >
                <div>🪙 {p.coins.toLocaleString('ru-RU')} монет</div>
                <div style={{ fontSize: '10px', marginTop: '3px', opacity: 0.9 }}>{p.label}</div>
              </button>
            ))}
          </div>
        )}
      </section>
    </ShopSubShell>
  );
}

export type ShopTonSubscreenProps = {
  background: string;
  contentInset: CSSProperties;
  shopCoinPacks: ShopCoinPacksResponse | null;
  tonCoinBusy: boolean;
  onBack: () => void;
  onStartTonShopPurchase: (offerId: string) => void;
};

export function ShopTonSubscreen({
  background,
  contentInset,
  shopCoinPacks,
  tonCoinBusy,
  onBack,
  onStartTonShopPurchase,
}: ShopTonSubscreenProps) {
  return (
    <ShopSubShell background={background} contentInset={contentInset} title="💎 Покупки за TON" onBack={onBack}>
      <section style={shopPanelStyle('rgba(34,211,238,0.38)')}>
        <p style={{ color: '#94a3b8', fontSize: 'clamp(10px, 2.6vw, 12px)', margin: '0 0 10px 0', lineHeight: 1.45, textAlign: 'left' }}>
          Подключи кошелёк TON в шапке, затем подтверди перевод в TonConnect. Суммы — на сервере.
        </p>
        {!shopCoinPacks && <div style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'left' }}>Загрузка паков…</div>}
        {shopCoinPacks && (
          shopCoinPacks.tonEnabled ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '6px' }}>
              {shopCoinPacks.ton.map(p => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => void onStartTonShopPurchase(p.id)}
                  disabled={tonCoinBusy}
                  style={{
                    padding: '9px 10px',
                    minWidth: 0,
                    background: tonCoinBusy ? '#334155' : '#0e7490',
                    color: '#ecfeff',
                    border: '1px solid #22d3ee',
                    borderRadius: '12px',
                    fontWeight: 900,
                    textAlign: 'left',
                    cursor: tonCoinBusy ? 'not-allowed' : 'pointer',
                    fontSize: 'clamp(10px, 2.7vw, 12px)',
                  }}
                >
                  <div>🪙 {p.label}</div>
                  <div style={{ fontSize: '10px', marginTop: '3px', opacity: 0.9 }}>{p.ton} TON</div>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ color: '#64748b', fontSize: '11px', textAlign: 'left' }}>
              TON-оплата не настроена: на сервере укажите <code style={{ color: '#a5b4fc' }}>TON_TREASURY_ADDRESS</code> (UQ… / EQ…).
            </div>
          )
        )}
      </section>
    </ShopSubShell>
  );
}
