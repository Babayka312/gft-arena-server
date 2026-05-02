import { memo } from 'react';

type BottomNavItem = {
  screen: string;
  label: string;
  tile: string;
  activeColor: string;
};

type BottomNavProps = {
  items: BottomNavItem[];
  activeScreen: string;
  onNavigate: (screen: string) => void;
};

export const BottomNav = memo(function BottomNav({
  items,
  activeScreen,
  onNavigate,
}: BottomNavProps) {
  return (
    <>
      {items.map((item) => {
        const isActive = activeScreen === item.screen;
        return (
          <button
            key={item.screen}
            type="button"
            onClick={() => onNavigate(item.screen)}
            style={{
              minHeight: 'clamp(58px, 14vw, 70px)',
              padding: '6px 4px',
              border: `1px solid ${isActive ? item.activeColor : 'rgba(148,163,184,0.28)'}`,
              borderRadius: '14px',
              background: isActive ? 'rgba(15,23,42,0.96)' : 'rgba(2,6,23,0.85)',
              color: isActive ? item.activeColor : '#cbd5e1',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              cursor: 'pointer',
              boxShadow: isActive ? `0 0 18px ${item.activeColor}55` : 'none',
            }}
          >
            <img
              loading="lazy"
              decoding="async"
              src={item.tile}
              alt=""
              style={{
                width: 'clamp(24px, 6vw, 28px)',
                height: 'clamp(24px, 6vw, 28px)',
                borderRadius: '8px',
                objectFit: 'cover',
                opacity: isActive ? 1 : 0.78,
              }}
            />
            <span
              style={{
                fontSize: 'clamp(10px, 2.6vw, 12px)',
                lineHeight: 1.1,
                fontWeight: 800,
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </>
  );
});
