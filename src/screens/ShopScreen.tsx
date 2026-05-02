import { memo, type CSSProperties } from 'react';
import { CARD_PACKS, type CardPackType } from '../cards/acquisition';
import type { ArtifactRarity } from '../artifacts/types';
const sectionTitleStyle = (color = '#eab308'): CSSProperties => ({
  color,
  margin: '0 0 22px',
  fontSize: 'clamp(28px, 5vw, 42px)',
  lineHeight: 1.05,
  fontWeight: 950,
  letterSpacing: '0.055em',
  textTransform: 'uppercase',
  textShadow: `0 0 18px ${color}66, 0 4px 14px rgba(0,0,0,0.85)`,
});

const metaTextStyle: CSSProperties = {
  color: '#c4b5fd',
  fontSize: '14px',
  fontWeight: 750,
  letterSpacing: '0.025em',
  textShadow: '0 2px 10px rgba(0,0,0,0.85)',
};

const cardTitleStyle = (color = '#eab308'): CSSProperties => ({
  color,
  fontWeight: 950,
  letterSpacing: '0.035em',
  textTransform: 'uppercase',
  textShadow: `0 0 12px ${color}66, 0 2px 8px rgba(0,0,0,0.75)`,
});

/** Панель раздела: стекло + акцентная кайма */
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

export type ShopScreenProps = {
  background: string;
  contentInset: CSSProperties;
  balance: number;
  crystals: number;
  coins: number;
  cardShards: number;
  materials: number;
  maxEnergy: number;
  onOpenCardPack: (packType: CardPackType) => void;
  onOpenLootbox: () => void;
  onBuyEnergyPack: (energy: number, gftCost: number) => void;
  onBuy100Materials: () => void;
  onBuyShardPack: (shards: number, gftCost: number) => void;
  onBuyCoinsWithCrystals: (coins: number, crystalCost: number) => void;
  onBuyCoinsWithGft: (coins: number, gftCost: number) => void;
  onOpenShopXrp: () => void;
  onOpenShopTon: () => void;
  onOpenMonsterPack: (packType: CardPackType, gftCost: number) => void;
  onBuyArtifact: (rarity: ArtifactRarity, gftCost: number) => void;
  onBuySeasonPass: (tier: 'basic' | 'premium', gftCost: number) => void;
  onBuyVip: (gftCost: number) => void;
  onBuyCrystalsWithGft: (crystals: number, gft: number) => void;
};

export const ShopScreen = memo(function ShopScreen({
  background,
  contentInset,
  balance,
  crystals,
  coins,
  cardShards,
  materials,
  maxEnergy,
  onOpenCardPack,
  onOpenLootbox,
  onBuyEnergyPack,
  onBuy100Materials,
  onBuyShardPack,
  onBuyCoinsWithCrystals,
  onBuyCoinsWithGft,
  onOpenShopXrp,
  onOpenShopTon,
  onOpenMonsterPack,
  onBuyArtifact,
  onBuySeasonPass,
  onBuyVip,
  onBuyCrystalsWithGft,
}: ShopScreenProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundImage: `linear-gradient(180deg, rgba(2,6,23,0.82) 0%, rgba(15,23,42,0.5) 35%, rgba(2,6,23,0.78) 100%), url('${background}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'scroll',
        ...contentInset,
        textAlign: 'center',
        boxSizing: 'border-box',
      }}
    >
      <h2 style={{ ...sectionTitleStyle(), fontSize: 'clamp(22px, 5vw, 32px)' }}>🛒 МАГАЗИН</h2>
      <div style={{ padding: '0 16px', marginBottom: '20px' }}>
        <p
          style={{
            ...metaTextStyle,
            color: '#e2e8f0',
            margin: '0 auto',
            maxWidth: '1040px',
            padding: '12px 14px',
            lineHeight: 1.5,
            wordBreak: 'break-word',
            textAlign: 'center',
            background: 'linear-gradient(145deg, rgba(15,23,42,0.96) 0%, rgba(30,27,75,0.2) 100%)',
            border: '1px solid rgba(148,163,184,0.32)',
            borderRadius: '18px',
            boxShadow: '0 16px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.07)',
            textShadow: 'none',
            fontSize: 'clamp(12px, 3.1vw, 14px)',
            fontWeight: 700,
            letterSpacing: '0.02em',
          }}
        >
          💰 <span style={{ color: '#fde68a' }}>{balance}</span> GFT <span style={{ color: '#64748b' }}>|</span> 💎 <span style={{ color: '#a5b4fc' }}>{crystals}</span> кристаллов <span style={{ color: '#64748b' }}>|</span> 🪙{' '}
          <span style={{ color: '#fcd34d' }}>{coins}</span> монет <span style={{ color: '#64748b' }}>|</span> 🧩 <span style={{ color: '#f0abfc' }}>{cardShards}</span> осколков <span style={{ color: '#64748b' }}>|</span> 📦{' '}
          <span style={{ color: '#86efac' }}>{materials}</span> материалов
        </p>
      </div>

      <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '0 12px', display: 'grid', gap: '14px', width: '100%', boxSizing: 'border-box' }}>
        <section style={shopPanelStyle('rgba(167,139,250,0.45)')}>
          <h3 style={{ ...cardTitleStyle('#c084fc'), marginBottom: '8px', fontSize: 'clamp(11px, 2.8vw, 14px)' }}>🎴 Наборы карт</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 132px), 1fr))', gap: '8px' }}>
            {(Object.entries(CARD_PACKS) as Array<[CardPackType, (typeof CARD_PACKS)[CardPackType]]>).map(([packType, pack]) => (
              <button
                key={packType}
                type="button"
                onClick={() => onOpenCardPack(packType)}
                style={{ padding: '10px 11px', background: 'linear-gradient(135deg, #1e293b, #581c87)', color: '#fff', border: '1px solid #a855f7', borderRadius: '12px', textAlign: 'left', cursor: 'pointer' }}
              >
                <div style={{ fontWeight: 950, fontSize: 'clamp(12px, 3vw, 14px)' }}>{pack.name}</div>
                <div style={{ color: '#cbd5e1', fontSize: '11px', marginTop: '4px', lineHeight: 1.3 }}>
                  {pack.cards} карт • {pack.costCoins != null ? `${pack.costCoins} монет` : `${pack.costCrystals} кристаллов`}
                </div>
                <div style={{ color: '#a5b4fc', fontSize: '10px', marginTop: '5px', lineHeight: 1.3 }}>Дубликаты дают осколки</div>
              </button>
            ))}
          </div>
        </section>

        <section style={shopPanelStyle('rgba(52,211,153,0.4)')}>
          <h3 style={{ ...cardTitleStyle('#22c55e'), marginBottom: '8px', fontSize: 'clamp(11px, 2.8vw, 14px)' }}>⚡ Энергия и осколки (GFT)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 132px), 1fr))', gap: '8px' }}>
            <button
              type="button"
              onClick={() => onBuyEnergyPack(20, 1)}
              style={{ padding: '10px 11px', minWidth: 0, background: '#2563eb', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 900, textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box', fontSize: 'clamp(11px, 2.85vw, 13px)' }}
            >
              <div>⚡ +20 энергии</div>
              <div style={{ fontSize: '11px', color: '#bfdbfe', marginTop: '4px', lineHeight: 1.3 }}>1 GFT</div>
            </button>
            <button
              type="button"
              onClick={() => onBuyEnergyPack(50, 2)}
              style={{ padding: '10px 11px', minWidth: 0, background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 900, textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box', fontSize: 'clamp(11px, 2.85vw, 13px)' }}
            >
              <div>⚡ +50 энергии</div>
              <div style={{ fontSize: '11px', color: '#bae6fd', marginTop: '4px', lineHeight: 1.3 }}>
                2 GFT
              </div>
            </button>
            <button
              type="button"
              onClick={() => onBuyEnergyPack(100, 3)}
              style={{ padding: '10px 11px', minWidth: 0, background: '#0891b2', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 900, textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box', fontSize: 'clamp(11px, 2.85vw, 13px)' }}
            >
              <div>⚡ +100 энергии</div>
              <div style={{ fontSize: '11px', color: '#bae6fd', marginTop: '4px', lineHeight: 1.3 }}>3 GFT • до {maxEnergy}</div>
            </button>
            <button
              type="button"
              onClick={() => onBuyShardPack(3, 1)}
              style={{ padding: '10px 11px', minWidth: 0, background: '#c026d3', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 900, textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box', fontSize: 'clamp(11px, 2.85vw, 13px)' }}
            >
              <div>🧩 3 осколка</div>
              <div style={{ fontSize: '11px', color: '#f5d0fe', marginTop: '4px', lineHeight: 1.3 }}>1 GFT</div>
            </button>
            <button
              type="button"
              onClick={() => onBuyShardPack(10, 3)}
              style={{ padding: '10px 11px', minWidth: 0, background: '#a21caf', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 900, textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box', fontSize: 'clamp(11px, 2.85vw, 13px)' }}
            >
              <div>🧩 10 осколков</div>
              <div style={{ fontSize: '11px', color: '#f5d0fe', marginTop: '4px', lineHeight: 1.3 }}>3 GFT</div>
            </button>
            <button
              type="button"
              onClick={() => onBuyShardPack(50, 10)}
              style={{ padding: '10px 11px', minWidth: 0, background: '#86198f', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 900, textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box', fontSize: 'clamp(11px, 2.85vw, 13px)' }}
            >
              <div>🧩 50 осколков</div>
              <div style={{ fontSize: '11px', color: '#f5d0fe', marginTop: '4px', lineHeight: 1.3 }}>10 GFT</div>
            </button>
            <button
              type="button"
              onClick={onOpenLootbox}
              style={{ padding: '10px 11px', minWidth: 0, background: '#6d28d9', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 900, textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box', fontSize: 'clamp(11px, 2.85vw, 13px)' }}
            >
              <div>🎁 Лутбокс артефакта</div>
              <div style={{ fontSize: '11px', color: '#ddd6fe', marginTop: '4px', lineHeight: 1.3 }}>за монеты</div>
            </button>
            <button
              type="button"
              onClick={onBuy100Materials}
              style={{ padding: '10px 11px', minWidth: 0, background: '#047857', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 900, textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box', fontSize: 'clamp(11px, 2.85vw, 13px)' }}
            >
              <div>📦 100 материалов</div>
              <div style={{ fontSize: '11px', color: '#a7f3d0', marginTop: '4px', lineHeight: 1.3 }}>за монеты</div>
            </button>
          </div>
        </section>

        <section style={shopPanelStyle('rgba(250,204,21,0.45)')}>
          <h3 style={{ ...cardTitleStyle('#facc15'), marginBottom: '8px', fontSize: 'clamp(11px, 2.8vw, 14px)' }}>🪙 Монеты для free-to-play</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 124px), 1fr))', gap: '8px' }}>
            <button
              type="button"
              onClick={() => onBuyCoinsWithCrystals(3000, 120)}
              style={{ padding: '10px 11px', minWidth: 0, background: '#ca8a04', color: '#111827', border: 'none', borderRadius: '12px', fontWeight: 950, textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box', fontSize: 'clamp(11px, 2.85vw, 13px)' }}
            >
              <div>🪙 3000 монет</div>
              <div style={{ fontSize: '11px', marginTop: '4px', lineHeight: 1.3 }}>120 кристаллов</div>
            </button>
            <button
              type="button"
              onClick={() => onBuyCoinsWithCrystals(9000, 320)}
              style={{ padding: '10px 11px', minWidth: 0, background: '#eab308', color: '#111827', border: 'none', borderRadius: '12px', fontWeight: 950, textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box', fontSize: 'clamp(11px, 2.85vw, 13px)' }}
            >
              <div>🪙 9000 монет</div>
              <div style={{ fontSize: '11px', marginTop: '4px', lineHeight: 1.3 }}>320 кристаллов • выгодно</div>
            </button>
            <button
              type="button"
              onClick={() => onBuyCoinsWithGft(18000, 35)}
              style={{ padding: '10px 11px', minWidth: 0, background: '#f59e0b', color: '#111827', border: 'none', borderRadius: '12px', fontWeight: 950, textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box', fontSize: 'clamp(11px, 2.85vw, 13px)' }}
            >
              <div>🪙 18000 монет</div>
              <div style={{ fontSize: '11px', marginTop: '4px', lineHeight: 1.3 }}>35 GFT</div>
            </button>
            <button
              type="button"
              onClick={() => onBuyCoinsWithGft(60000, 100)}
              style={{ padding: '10px 11px', minWidth: 0, background: '#fbbf24', color: '#111827', border: 'none', borderRadius: '12px', fontWeight: 950, textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box', fontSize: 'clamp(11px, 2.85vw, 13px)' }}
            >
              <div>🪙 60000 монет</div>
              <div style={{ fontSize: '11px', marginTop: '4px', lineHeight: 1.3 }}>100 GFT • максимум</div>
            </button>
          </div>
        </section>

        <section style={shopPanelStyle('rgba(71,85,105,0.45)')}>
          <h3 style={{ ...cardTitleStyle('#94a3b8'), marginBottom: '10px', fontSize: 'clamp(11px, 2.8vw, 14px)' }}>⛓️ Оплата криптой</h3>
          <p style={{ color: '#94a3b8', fontSize: 'clamp(10px, 2.6vw, 12px)', margin: '0 0 12px 0', lineHeight: 1.45, textAlign: 'left' }}>
            Монеты за XRP (Xaman) и за TON (TonConnect) — на отдельных экранах.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '10px' }}>
            <button
              type="button"
              onClick={onOpenShopXrp}
              style={{
                padding: '16px 14px',
                minHeight: '72px',
                background: 'linear-gradient(145deg, #0369a1 0%, #0c4a6e 100%)',
                color: '#f0f9ff',
                border: '1px solid #38bdf8',
                borderRadius: '14px',
                fontWeight: 950,
                fontSize: 'clamp(13px, 3.2vw, 16px)',
                letterSpacing: '0.02em',
                cursor: 'pointer',
                textAlign: 'center',
                boxShadow: '0 8px 24px rgba(14,165,233,0.25)',
              }}
            >
              Покупки за XRP
            </button>
            <button
              type="button"
              onClick={onOpenShopTon}
              style={{
                padding: '16px 14px',
                minHeight: '72px',
                background: 'linear-gradient(145deg, #0e7490 0%, #155e75 100%)',
                color: '#ecfeff',
                border: '1px solid #22d3ee',
                borderRadius: '14px',
                fontWeight: 950,
                fontSize: 'clamp(13px, 3.2vw, 16px)',
                letterSpacing: '0.02em',
                cursor: 'pointer',
                textAlign: 'center',
                boxShadow: '0 8px 24px rgba(6,182,212,0.22)',
              }}
            >
              Покупки за TON
            </button>
          </div>
        </section>

        <section style={shopPanelStyle('rgba(244,114,182,0.4)')}>
          <h3 style={{ ...cardTitleStyle('#ec4899'), marginBottom: '8px', fontSize: 'clamp(11px, 2.8vw, 14px)' }}>🎴 Наборы монстров (GFT)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '8px' }}>
            <button
              type="button"
              onClick={() => onOpenMonsterPack('basic', 5)}
              style={{ padding: '10px 11px', minWidth: 0, background: 'linear-gradient(135deg, #7c3aed, #4338ca)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 900, textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box', fontSize: 'clamp(11px, 2.85vw, 13px)' }}
            >
              <div>🎴 Базовый набор</div>
              <div style={{ fontSize: '11px', color: '#e9d5ff', marginTop: '4px', lineHeight: 1.3 }}>5 GFT</div>
            </button>
            <button
              type="button"
              onClick={() => onOpenMonsterPack('premium', 15)}
              style={{ padding: '10px 11px', minWidth: 0, background: 'linear-gradient(135deg, #be185d, #7c3aed)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 900, textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box', fontSize: 'clamp(11px, 2.85vw, 13px)' }}
            >
              <div>🎴 Продвинутый набор</div>
              <div style={{ fontSize: '11px', color: '#fce7f3', marginTop: '4px', lineHeight: 1.3 }}>15 GFT</div>
            </button>
            <button
              type="button"
              onClick={() => onOpenMonsterPack('mythic', 40)}
              style={{ padding: '10px 11px', minWidth: 0, background: 'linear-gradient(135deg, #f59e0b, #7c2d12)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 900, textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box', fontSize: 'clamp(11px, 2.85vw, 13px)' }}
            >
              <div>🔥 Легендарный набор</div>
              <div style={{ fontSize: '11px', color: '#ffedd5', marginTop: '4px', lineHeight: 1.3 }}>40 GFT</div>
            </button>
          </div>
        </section>

        <section style={shopPanelStyle('rgba(148,163,184,0.45)')}>
          <h3 style={{ ...cardTitleStyle('#cbd5e1'), marginBottom: '8px', fontSize: 'clamp(11px, 2.8vw, 14px)' }}>🧿 Артефакты (GFT)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '8px' }}>
            <button
              type="button"
              onClick={() => onBuyArtifact('Common', 1)}
              style={{ padding: '10px 11px', minWidth: 0, background: 'linear-gradient(135deg, #0891b2, #312e81)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 900, textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box', fontSize: 'clamp(11px, 2.85vw, 13px)' }}
            >
              <div>Common</div>
              <div style={{ fontSize: '11px', color: '#cffafe', marginTop: '4px', lineHeight: 1.3 }}>1 GFT</div>
            </button>
            <button
              type="button"
              onClick={() => onBuyArtifact('Rare', 3)}
              style={{ padding: '10px 11px', minWidth: 0, background: 'linear-gradient(135deg, #0369a1, #1d4ed8)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 900, textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box', fontSize: 'clamp(11px, 2.85vw, 13px)' }}
            >
              <div>Rare</div>
              <div style={{ fontSize: '11px', color: '#bfdbfe', marginTop: '4px', lineHeight: 1.3 }}>3 GFT</div>
            </button>
            <button
              type="button"
              onClick={() => onBuyArtifact('Epic', 8)}
              style={{ padding: '10px 11px', minWidth: 0, background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 900, textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box', fontSize: 'clamp(11px, 2.85vw, 13px)' }}
            >
              <div>Epic</div>
              <div style={{ fontSize: '11px', color: '#e9d5ff', marginTop: '4px', lineHeight: 1.3 }}>8 GFT</div>
            </button>
            <button
              type="button"
              onClick={() => onBuyArtifact('Legendary', 20)}
              style={{ padding: '10px 11px', minWidth: 0, background: 'linear-gradient(135deg, #f59e0b, #b45309)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 900, textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box', fontSize: 'clamp(11px, 2.85vw, 13px)' }}
            >
              <div>Legendary</div>
              <div style={{ fontSize: '11px', color: '#fde68a', marginTop: '4px', lineHeight: 1.3 }}>20 GFT</div>
            </button>
          </div>
        </section>

        <section style={shopPanelStyle('rgba(250,204,21,0.4)')}>
          <h3 style={{ ...cardTitleStyle('#facc15'), marginBottom: '8px', fontSize: 'clamp(11px, 2.8vw, 14px)' }}>🏅 Сезон и VIP</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '8px' }}>
            <button
              type="button"
              onClick={() => onBuySeasonPass('basic', 40)}
              style={{ padding: '10px 11px', minWidth: 0, background: 'linear-gradient(135deg, #2563eb, #1e3a8a)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 900, textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box', fontSize: 'clamp(11px, 2.85vw, 13px)' }}
            >
              <div>Сезонный пропуск: Базовый</div>
              <div style={{ fontSize: '11px', color: '#bfdbfe', marginTop: '4px', lineHeight: 1.3 }}>40 GFT</div>
            </button>
            <button
              type="button"
              onClick={() => onBuySeasonPass('premium', 80)}
              style={{ padding: '10px 11px', minWidth: 0, background: 'linear-gradient(135deg, #7c3aed, #be185d)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 900, textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box', fontSize: 'clamp(11px, 2.85vw, 13px)' }}
            >
              <div>Сезонный пропуск: Премиум</div>
              <div style={{ fontSize: '11px', color: '#f5d0fe', marginTop: '4px', lineHeight: 1.3 }}>80 GFT</div>
            </button>
            <button
              type="button"
              onClick={() => onBuyVip(50)}
              style={{ padding: '10px 11px', minWidth: 0, background: 'linear-gradient(135deg, #f59e0b, #92400e)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 900, textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box', fontSize: 'clamp(11px, 2.85vw, 13px)' }}
            >
              <div>VIP статус</div>
              <div style={{ fontSize: '11px', color: '#fde68a', marginTop: '4px', lineHeight: 1.3 }}>50 GFT</div>
            </button>
          </div>
        </section>

        <section style={shopPanelStyle('rgba(129,140,248,0.45)')}>
          <h3 style={{ ...cardTitleStyle('#a5b4fc'), marginBottom: '8px', fontSize: 'clamp(11px, 2.8vw, 14px)' }}>💎 Покупка кристаллов за GFT</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 118px), 1fr))', gap: '8px' }}>
            {[
              { gft: 50, crystals: 500, bonus: 0 },
              { gft: 150, crystals: 1650, bonus: 150 },
              { gft: 500, crystals: 6000, bonus: 1000 },
              { gft: 1200, crystals: 15000, bonus: 3000 },
            ].map(pkg => (
              <button
                key={pkg.gft}
                type="button"
                onClick={() => onBuyCrystalsWithGft(pkg.crystals, pkg.gft)}
                style={{ padding: '9px 10px', minWidth: 0, background: pkg.bonus > 0 ? '#ec4899' : '#4f46e5', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 900, cursor: 'pointer', boxSizing: 'border-box', fontSize: 'clamp(10px, 2.75vw, 13px)' }}
              >
                <div>{pkg.crystals} кристаллов</div>
                <div style={{ fontSize: '11px', opacity: 0.88, marginTop: '3px', lineHeight: 1.3 }}>
                  {pkg.gft} GFT{pkg.bonus > 0 ? ` • +${pkg.bonus} бонус` : ''}
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
});
