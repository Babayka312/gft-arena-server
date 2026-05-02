import type { CSSProperties } from 'react';
import { ARTIFACT_RARITIES, ARTIFACT_TYPE_LABELS, ARTIFACT_TYPES, BONUS_LABELS, RARITY_CONFIG } from '../artifacts/balance';
import { ArtifactIconForArtifact } from '../artifacts/ArtifactIcon';
import { getDefaultSlotForArtifact, getUpgradeCost, isArtifactEquipped, type EquippedArtifacts } from '../artifacts/inventory';
import type { Artifact, ArtifactBonus, ArtifactRarity, ArtifactStats, ArtifactType } from '../artifacts/types';
import { Icon3D } from '../ui/Icon3D';

type Screen = 'home' | 'arena' | 'team' | 'farm' | 'shop' | 'levelup' | 'artifacts' | 'craft';

const defaultContentInset: CSSProperties = {
  paddingTop: '132px',
  paddingBottom: '120px',
};

interface ArtifactsScreenProps {
  background: string;
  /** Отступы под фиксированный header/footer приложения (Telegram / мобильные). */
  contentInset?: CSSProperties;
  /** Высота header в px — для кнопки «назад» поверх контента. */
  headerOffsetPx?: number;
  materials: number;
  balance: number;
  artifacts: Artifact[];
  filteredArtifacts: Artifact[];
  artifactStats: ArtifactStats;
  equippedArtifacts: EquippedArtifacts;
  selectedArtifact: Artifact | null;
  artifactTypeFilter: ArtifactType | 'all';
  artifactRarityFilter: ArtifactRarity | 'all';
  setScreen: (screen: Screen) => void;
  setSelectedArtifact: (artifact: Artifact | null) => void;
  setArtifactTypeFilter: (type: ArtifactType | 'all') => void;
  setArtifactRarityFilter: (rarity: ArtifactRarity | 'all') => void;
  equipArtifact: (artifact: Artifact) => void;
  upgradeArtifact: (artifactId: string) => void;
  dismantleArtifact: (artifact: Artifact) => void;
  toggleArtifactLock: (artifactId: string) => void;
  unequipArtifact: (slot: string) => void;
}

const sectionTitleStyle = (color = '#ec4899') => ({
  color,
  margin: '0 0 22px',
  fontSize: 'clamp(28px, 5vw, 42px)',
  lineHeight: 1.05,
  fontWeight: 950,
  letterSpacing: '0.055em',
  textTransform: 'uppercase' as const,
  textShadow: `0 0 18px ${color}66, 0 4px 14px rgba(0,0,0,0.85)`,
});

const metaTextStyle = {
  color: '#c4b5fd',
  fontSize: '14px',
  fontWeight: 750,
  letterSpacing: '0.025em',
  textShadow: '0 2px 10px rgba(0,0,0,0.85)',
};

const mutedTextStyle = {
  color: '#cbd5e1',
  fontWeight: 650,
  letterSpacing: '0.015em',
  lineHeight: 1.35,
};

const cardTitleStyle = (color = '#eab308') => ({
  color,
  fontWeight: 950,
  letterSpacing: '0.035em',
  textTransform: 'uppercase' as const,
  textShadow: `0 0 12px ${color}66, 0 2px 8px rgba(0,0,0,0.75)`,
});

function formatBonus(bonus: ArtifactBonus) {
  const suffix = bonus.key === 'critChance' || bonus.key === 'critDamage' || bonus.key === 'materialFind' ? '%' : '';
  return `+${bonus.value}${suffix} ${BONUS_LABELS[bonus.key]}`;
}

export function ArtifactsScreen(props: ArtifactsScreenProps) {
  const {
    background,
    contentInset = defaultContentInset,
    headerOffsetPx = 132,
    materials,
    balance,
    artifacts,
    filteredArtifacts,
    artifactStats,
    equippedArtifacts,
    selectedArtifact,
    artifactTypeFilter,
    artifactRarityFilter,
    setScreen,
    setSelectedArtifact,
    setArtifactTypeFilter,
    setArtifactRarityFilter,
    equipArtifact,
    upgradeArtifact,
    dismantleArtifact,
    toggleArtifactLock,
    unequipArtifact,
  } = props;

  if (selectedArtifact) {
    const equipped = isArtifactEquipped(selectedArtifact.id, equippedArtifacts);
    return (
      <div style={{ minHeight: '100vh', backgroundImage: `linear-gradient(180deg, rgba(7,10,22,0.55) 0%, rgba(7,10,22,0.85) 100%), url('${background}')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'scroll', ...contentInset, textAlign: 'center' }}>
        <button onClick={() => setSelectedArtifact(null)} style={{ position: 'fixed', top: `calc(${headerOffsetPx}px + env(safe-area-inset-top, 0px) + 10px)`, right: '16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', fontSize: '20px', zIndex: 100 }}>✕</button>

        <div style={{ margin: '30px auto', maxWidth: '390px', background: '#1e2937', padding: '30px', borderRadius: '20px', border: `2px solid ${RARITY_CONFIG[selectedArtifact.rarity].color}`, boxShadow: `0 0 30px ${RARITY_CONFIG[selectedArtifact.rarity].color}33` }}>
          <ArtifactIconForArtifact
            artifact={selectedArtifact}
            width="min(150px, 58vw)"
            style={{
              marginBottom: '18px',
              boxShadow: `0 0 26px ${RARITY_CONFIG[selectedArtifact.rarity].color}55`,
            }}
          />
          <h2 style={{ ...sectionTitleStyle(RARITY_CONFIG[selectedArtifact.rarity].color), marginBottom: '10px' }}>{selectedArtifact.locked ? '🔒 ' : ''}{selectedArtifact.name}</h2>
          <p style={{ ...mutedTextStyle, marginBottom: '20px' }}>{ARTIFACT_TYPE_LABELS[selectedArtifact.type]} • {selectedArtifact.rarity} • Качество {selectedArtifact.quality} • Lv. {selectedArtifact.level}/{selectedArtifact.maxLevel}</p>

          <div style={{ background: '#0a0a0a', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
            <p style={{ ...cardTitleStyle('#60a5fa'), fontSize: '18px' }}>⚡ Сила: {selectedArtifact.power.toFixed(0)}</p>
            <p style={{ ...metaTextStyle, fontSize: '14px', marginTop: '8px' }}>{formatBonus(selectedArtifact.primaryBonus)}</p>
            {selectedArtifact.secondaryBonuses.map((bonus, idx) => (
              <p key={`${bonus.key}-${idx}`} style={{ ...mutedTextStyle, fontSize: '13px', margin: '6px 0 0' }}>{formatBonus(bonus)}</p>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              onClick={() => {
                equipArtifact(selectedArtifact);
                alert('✅ Артефакт экипирован!');
                setSelectedArtifact(null);
              }}
              style={{ padding: '14px', background: '#22c55e', color: '#000', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              ✅ Экипировать
            </button>
            <button
              onClick={() => upgradeArtifact(selectedArtifact.id)}
              disabled={selectedArtifact.level >= selectedArtifact.maxLevel}
              style={{ padding: '14px', background: selectedArtifact.level >= selectedArtifact.maxLevel ? '#475569' : '#f59e0b', color: '#000', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: selectedArtifact.level >= selectedArtifact.maxLevel ? 'not-allowed' : 'pointer', opacity: selectedArtifact.level >= selectedArtifact.maxLevel ? 0.65 : 1 }}
            >
              {selectedArtifact.level >= selectedArtifact.maxLevel ? 'Макс. уровень' : (() => {
                const cost = getUpgradeCost(selectedArtifact.level, selectedArtifact.rarity);
                return `📈 Улучшить (${cost.gft} крист., ${cost.materials} мат.)`;
              })()}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
            <button onClick={() => toggleArtifactLock(selectedArtifact.id)} style={{ padding: '14px', background: '#334155', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
              {selectedArtifact.locked ? '🔓 Разблокировать' : '🔒 Заблокировать'}
            </button>
            <button
              onClick={() => dismantleArtifact(selectedArtifact)}
              disabled={selectedArtifact.locked || equipped}
              style={{ padding: '14px', background: '#991b1b', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: selectedArtifact.locked || equipped ? 'not-allowed' : 'pointer', opacity: selectedArtifact.locked || equipped ? 0.55 : 1 }}
            >
              🧱 Разобрать
            </button>
          </div>

          {(() => {
            const slots = selectedArtifact.type === 'accessory'
              ? ([
                  equippedArtifacts.accessory1 === selectedArtifact.id ? 'accessory1' : null,
                  equippedArtifacts.accessory2 === selectedArtifact.id ? 'accessory2' : null,
                ].filter(Boolean) as string[])
              : (() => {
                  const slot = getDefaultSlotForArtifact(selectedArtifact.type, equippedArtifacts);
                  return equippedArtifacts[slot] === selectedArtifact.id ? [slot] : [];
                })();

            if (slots.length === 0) return null;
            const slotToUnequip = slots[0];
            return (
              <button
                onClick={() => { unequipArtifact(slotToUnequip); alert('🧩 Артефакт снят.'); setSelectedArtifact(null); }}
                style={{ marginTop: '12px', width: '100%', padding: '14px', background: '#475569', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                🧩 Снять
              </button>
            );
          })()}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundImage: `url('${background}')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'scroll', ...contentInset, textAlign: 'center' }}>
      <h2 style={sectionTitleStyle('#ec4899')}>💎 АРТЕФАКТЫ УСИЛЕНИЯ</h2>
      <div style={{ ...metaTextStyle, marginBottom: '20px', fontSize: '16px' }}>
        📦 Материалы: {materials} | 💎 Кристаллы: {balance}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 56px), 1fr))', gap: '8px', padding: '0 15px', maxWidth: '760px', margin: '0 auto 18px' }}>
        {[
          ['⚡', artifactStats.power, 'Сила'],
          ['❤️', artifactStats.hp, 'HP'],
          ['🎯', `${artifactStats.critChance}%`, 'Крит'],
          ['💥', `${artifactStats.critDamage}%`, 'Крит урон'],
          ['📦', `${artifactStats.materialFind}%`, 'Материалы'],
        ].map(([icon, value, label]) => (
          <div key={label} style={{ background: 'rgba(15,23,42,0.82)', border: '1px solid #334155', borderRadius: '12px', padding: '10px 6px' }}>
            <div style={{ fontSize: '18px' }}>{icon}</div>
            <div style={{ color: '#e2e8f0', fontWeight: 900 }}>{value}</div>
            <div style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 800 }}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 72px), 1fr))', gap: '8px', padding: '0 12px', maxWidth: '760px', margin: '0 auto 12px', width: '100%', boxSizing: 'border-box' }}>
        {(['all', ...ARTIFACT_TYPES] as Array<ArtifactType | 'all'>).map(type => (
          <button key={type} type="button" onClick={() => setArtifactTypeFilter(type)} style={{ padding: '9px 6px', borderRadius: '9999px', border: artifactTypeFilter === type ? '1px solid #ec4899' : '1px solid #334155', background: artifactTypeFilter === type ? 'rgba(236,72,153,0.22)' : '#0b1220', color: '#e2e8f0', fontWeight: 800, cursor: 'pointer', fontSize: 'clamp(10px, 2.8vw, 13px)', minWidth: 0 }}>
            {type === 'all' ? 'Все' : ARTIFACT_TYPE_LABELS[type]}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '8px', padding: '0 15px', maxWidth: '760px', margin: '0 auto 22px', overflowX: 'auto' }}>
        {(['all', ...ARTIFACT_RARITIES] as Array<ArtifactRarity | 'all'>).map(rarity => (
          <button key={rarity} onClick={() => setArtifactRarityFilter(rarity)} style={{ padding: '8px 12px', borderRadius: '9999px', border: artifactRarityFilter === rarity ? '1px solid #eab308' : '1px solid #334155', background: artifactRarityFilter === rarity ? 'rgba(234,179,8,0.18)' : '#0b1220', color: rarity === 'all' ? '#e2e8f0' : RARITY_CONFIG[rarity].color, fontWeight: 850, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {rarity === 'all' ? 'Все редкости' : rarity}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '12px', padding: '0 12px', marginBottom: '30px', width: '100%', boxSizing: 'border-box' }}>
        <button type="button" onClick={() => setScreen('craft')} style={{ padding: '16px', minWidth: 0, background: '#7c3aed', color: 'white', border: 'none', borderRadius: '16px', fontWeight: 'bold', fontSize: 'clamp(12px, 3.2vw, 16px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <Icon3D id="craft-3d" size={40} /> МАСТЕРСКАЯ КРАФТА
        </button>
        <button type="button" onClick={() => setSelectedArtifact(null)} style={{ padding: '16px', minWidth: 0, background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '16px', fontWeight: 'bold', fontSize: 'clamp(12px, 3.2vw, 16px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <Icon3D id="artifacts-3d" size={40} /> ЭКИПИРОВКА
        </button>
      </div>

      <h3 style={{ ...sectionTitleStyle('#ec4899'), fontSize: 'clamp(22px, 4vw, 30px)' }}>📚 Инвентарь ({filteredArtifacts.length}/{artifacts.length})</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 148px), 1fr))', gap: '12px', padding: '0 12px', width: '100%', boxSizing: 'border-box' }}>
        {filteredArtifacts.map(art => (
          <div key={art.id} onClick={() => setSelectedArtifact(art)} style={{ minWidth: 0, background: 'linear-gradient(180deg, rgba(30,41,59,0.95), rgba(15,23,42,0.95))', padding: '14px', borderRadius: '12px', border: '2px solid ' + (isArtifactEquipped(art.id, equippedArtifacts) ? RARITY_CONFIG[art.rarity].color : '#475569'), cursor: 'pointer', transition: 'all 0.2s', boxShadow: isArtifactEquipped(art.id, equippedArtifacts) ? `0 0 18px ${RARITY_CONFIG[art.rarity].color}55` : 'none', boxSizing: 'border-box' }}>
            <ArtifactIconForArtifact
              artifact={art}
              width={72}
              style={{
                marginBottom: '8px',
                boxShadow: `0 0 14px ${RARITY_CONFIG[art.rarity].color}44`,
              }}
            />
            <p style={{ ...cardTitleStyle(RARITY_CONFIG[art.rarity].color), margin: '0 0 4px' }}>{art.locked ? '🔒 ' : ''}{art.name}</p>
            <p style={{ ...mutedTextStyle, fontSize: '12px', margin: '0' }}>{art.rarity} • Q{art.quality} • Lv. {art.level}/{art.maxLevel}</p>
            <p style={{ ...mutedTextStyle, fontSize: '12px', margin: '6px 0 0' }}>⚡ {art.power} • {formatBonus(art.primaryBonus)}</p>
            {isArtifactEquipped(art.id, equippedArtifacts) && <p style={{ ...cardTitleStyle('#22c55e'), fontSize: '12px', marginTop: '4px' }}>✅ Экипирован</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
