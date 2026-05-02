import { memo } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Icon } from '../ui/Icon';

export type CosmicBottomNavItem = {
  screen: string;
  label: string;
  activeColor?: string;
};

type BottomNavProps = {
  items: CosmicBottomNavItem[];
  activeScreen: string;
  onNavigate: (screen: string) => void;
};

function iconNameForScreen(screen: string): 'home' | 'arena' | 'squad' | 'refs' | 'shop' {
  if (screen === 'arena') return 'arena';
  if (screen === 'team') return 'squad';
  if (screen === 'referrals') return 'refs';
  if (screen === 'shop' || screen === 'shopXrp' || screen === 'shopTon') return 'shop';
  return 'home';
}

export const BottomNav = memo(function BottomNav({
  items,
  activeScreen,
  onNavigate,
}: BottomNavProps) {
  return (
    <GlassCard
      style={{
        width: '100%',
        display: 'grid',
        gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
        gap: '8px',
        padding: '8px',
        borderRadius: '18px',
      }}
    >
      {items.map((item) => {
        const active = activeScreen === item.screen;
        const color = item.activeColor ?? '#4FD4FF';
        return (
          <button
            key={item.screen}
            type="button"
            onClick={() => onNavigate(item.screen)}
            style={{
              minHeight: '52px',
              borderRadius: '12px',
              border: active ? `1px solid ${color}` : '1px solid rgba(148,163,184,0.35)',
              background: active ? 'rgba(10,15,42,0.95)' : 'rgba(2,6,23,0.72)',
              color: active ? color : '#cbd5e1',
              boxShadow: active ? `0 0 14px ${color}66` : 'none',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
              gap: '4px',
              padding: '4px',
            }}
          >
            <Icon name={iconNameForScreen(item.screen)} />
            <span style={{ fontSize: '11px', fontWeight: 800 }}>{item.label}</span>
          </button>
        );
      })}
    </GlassCard>
  );
});
