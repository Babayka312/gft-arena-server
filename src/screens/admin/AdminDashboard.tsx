import { memo, type CSSProperties } from 'react';
import { Background } from '../../components/ui/Background';

type AdminDashboardProps = {
  background: string;
  contentInset: CSSProperties;
  bottomInsetPx: number;
  onOpenEconomyDashboard: () => void;
};

export const AdminDashboard = memo(function AdminDashboard({
  background,
  contentInset,
  bottomInsetPx,
  onOpenEconomyDashboard,
}: AdminDashboardProps) {
  return (
    <Background
      background={background}
      gradient="linear-gradient(180deg, rgba(2,6,23,0.92), rgba(15,23,42,0.88))"
      style={{
        ...contentInset,
        paddingBottom: `${bottomInsetPx}px`,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: '980px', margin: '0 auto', padding: '0 12px' }}>
        <h2 style={{ margin: '0 0 10px', color: '#f8fafc', fontSize: 'clamp(22px, 4.5vw, 34px)', fontWeight: 900 }}>
          Admin Dashboard
        </h2>
        <div style={{ borderRadius: '14px', border: '1px solid rgba(71,85,105,0.65)', background: 'rgba(15,23,42,0.86)', boxShadow: '0 10px 30px rgba(0,0,0,0.35)', padding: '12px', display: 'grid', gap: '10px' }}>
          <p style={{ margin: 0, color: '#cbd5e1', fontSize: '13px', lineHeight: 1.45 }}>
            Доступ к admin API защищён по цепочке: Telegram {'->'} JWT {'->'} 2FA {'->'} IP policy {'->'} rate-limit.
          </p>
          <button
            type="button"
            onClick={onOpenEconomyDashboard}
            style={{ width: 'fit-content', borderRadius: '10px', border: 'none', background: '#38bdf8', color: '#082f49', fontWeight: 900, padding: '10px 14px', cursor: 'pointer' }}
          >
            Open Economy Dashboard
          </button>
        </div>
      </div>
    </Background>
  );
});

