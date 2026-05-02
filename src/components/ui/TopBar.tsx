import { memo, type CSSProperties } from 'react';

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
  background: 'rgba(15,23,42,0.55)',
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
    <div style={topBarStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
        <div
          style={{
            width: 'clamp(30px, 7vw, 36px)',
            height: 'clamp(30px, 7vw, 36px)',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '1px solid rgba(234,179,8,0.6)',
            background: '#0f172a',
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
            <span style={{ fontSize: '13px' }}>👤</span>
          )}
        </div>
        <div style={{ minWidth: 0, lineHeight: 1.2 }}>
          <div
            style={{
              fontSize: 'clamp(12px, 3vw, 14px)',
              fontWeight: 800,
              color: '#eab308',
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
              color: '#22c55e',
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
            border: '1px solid rgba(148,163,184,0.35)',
            background: 'rgba(15,23,42,0.85)',
            color: '#e2e8f0',
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
    </div>
  );
});
