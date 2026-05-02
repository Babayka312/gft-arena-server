import { memo, type CSSProperties } from 'react';
import { GlassCard } from './GlassCard';
import { Icon } from './Icon';

type TopBarProps = {
  userName: string;
  playerId: string | null;
  avatarUrl?: string | null;
  onMenuClick?: () => void;
};

const topBarStyle: CSSProperties = {
  height: 'clamp(48px, 9vw, 56px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 12px',
  gap: '10px',
  background: 'transparent',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  boxSizing: 'border-box',
};

export const TopBar = memo(function TopBar({
  userName,
  playerId,
  avatarUrl,
  onMenuClick,
}: TopBarProps) {
  return (
    <GlassCard
      style={{
        ...topBarStyle,
        borderRadius: '0',
        borderLeft: 'none',
        borderRight: 'none',
        borderTop: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
        <div
          style={{
            width: 'clamp(30px, 7vw, 36px)',
            height: 'clamp(30px, 7vw, 36px)',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '1px solid rgba(79,212,255,0.55)',
            background: 'linear-gradient(145deg, rgba(26,31,60,0.88), rgba(10,15,42,0.88))',
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {avatarUrl ? (
            <img
              loading="lazy"
              decoding="async"
              src={avatarUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Icon name="profile" size={14} />
          )}
        </div>
        <div style={{ minWidth: 0, lineHeight: 1.2 }}>
          <div
            style={{
              fontSize: 'clamp(12px, 3vw, 14px)',
              fontWeight: 800,
              color: '#4FD4FF',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {userName.trim() || '—'}
          </div>
          <div
            style={{
              fontSize: 'clamp(10px, 2.5vw, 12px)',
              color: '#A86BFF',
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            ID: {playerId ?? '—'}
          </div>
        </div>
      </div>
      {onMenuClick && (
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Открыть меню"
          style={{
            width: 'clamp(30px, 7vw, 36px)',
            height: 'clamp(30px, 7vw, 36px)',
            borderRadius: '10px',
            border: '1px solid rgba(168,107,255,0.5)',
            background: 'linear-gradient(180deg, rgba(168,107,255,0.24), rgba(10,15,42,0.86))',
            color: '#f8fafc',
            fontSize: '18px',
            fontWeight: 800,
            lineHeight: 1,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          ≡
        </button>
      )}
    </GlassCard>
  );
});
