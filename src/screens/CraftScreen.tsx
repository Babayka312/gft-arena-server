import type { CSSProperties } from 'react';
import { ARTIFACT_RARITIES, ARTIFACT_TYPE_EMOJIS, ARTIFACT_TYPES, CRAFT_RECIPES } from '../artifacts/balance';
import type { ArtifactType } from '../artifacts/types';
import { Icon3D } from '../ui/Icon3D';
import { Background } from '../components/ui/Background';

type Screen = 'home' | 'arena' | 'team' | 'farm' | 'shop' | 'levelup' | 'artifacts' | 'craft';

const defaultContentInset: CSSProperties = {
  paddingTop: '132px',
  paddingBottom: '120px',
};

interface CraftScreenProps {
  background: string;
  contentInset?: CSSProperties;
  materials: number;
  balance: number;
  craftArtifact: (type: ArtifactType) => void;
  setScreen: (screen: Screen) => void;
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

const mutedTextStyle = {
  color: '#cbd5e1',
  fontWeight: 650,
  letterSpacing: '0.015em',
  lineHeight: 1.35,
};

const metaTextStyle = {
  color: '#c4b5fd',
  fontSize: '14px',
  fontWeight: 750,
  letterSpacing: '0.025em',
  textShadow: '0 2px 10px rgba(0,0,0,0.85)',
};

const cardTitleStyle = (color = '#eab308') => ({
  color,
  fontWeight: 950,
  letterSpacing: '0.035em',
  textTransform: 'uppercase' as const,
  textShadow: `0 0 12px ${color}66, 0 2px 8px rgba(0,0,0,0.75)`,
});

export function CraftScreen({ background, contentInset = defaultContentInset, materials, balance, craftArtifact, setScreen }: CraftScreenProps) {
  return (
    <Background background={background} style={{ ...contentInset, textAlign: 'center' }}>
      <h2 style={sectionTitleStyle('#ec4899')}>🔨 МАСТЕРСКАЯ КРАФТА</h2>
      <p style={{ ...metaTextStyle, marginBottom: '30px' }}>Материалы: {materials} | Кристаллы: {balance}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '15px', padding: '0 15px', maxWidth: '500px', margin: '0 auto' }}>
        {ARTIFACT_TYPES.map(type => {
          const recipe = CRAFT_RECIPES[type];
          const cost = recipe.cost;
          const chanceText = ARTIFACT_RARITIES
            .filter(rarity => recipe.rarityWeights[rarity])
            .map(rarity => `${rarity} ${recipe.rarityWeights[rarity]}%`)
            .join(' • ');

          return (
            <div key={type} style={{ background: '#1e2937', padding: '20px', borderRadius: '16px', border: '2px solid ' + (type === 'relic' ? '#ec4899' : '#0ea5e9') }}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>{ARTIFACT_TYPE_EMOJIS[type]}</div>
              <h4 style={{ ...cardTitleStyle(type === 'relic' ? '#ec4899' : '#0ea5e9'), margin: '0 0 10px' }}>{recipe.label.toUpperCase()}</h4>
              <p style={{ ...mutedTextStyle, fontSize: '12px', margin: '0 0 10px' }}>{recipe.description}</p>
              <p style={{ ...mutedTextStyle, fontSize: '11px', margin: '0 0 10px' }}>{chanceText}</p>
              <p style={{ ...mutedTextStyle, fontSize: '12px', margin: '0 0 10px' }}>
                💎 {cost.gft} кристаллов<br/>
                📦 {cost.materials} материалов
              </p>
              <button
                onClick={() => craftArtifact(type)}
                style={{ width: '100%', padding: '10px 12px', background: type === 'relic' ? '#ec4899' : '#0ea5e9', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Icon3D id="craft-3d" size={30} /> СОЗДАТЬ
              </button>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => setScreen('artifacts')}
        style={{ marginTop: '40px', padding: '14px 40px', background: '#475569', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
      >
        ← Назад
      </button>
    </Background>
  );
}
