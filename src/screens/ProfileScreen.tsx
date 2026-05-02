import { memo } from 'react';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';
import { SectionTitle } from '../components/ui/SectionTitle';

type ProfileScreenProps = {
  avatarUrl?: string | null;
  id: string;
  name: string;
  stats: Array<{ label: string; value: string }>;
  onRename: () => void;
};

export const ProfileScreen = memo(function ProfileScreen({
  avatarUrl,
  id,
  name,
  stats,
  onRename,
}: ProfileScreenProps) {
  return (
    <div style={{ minHeight: '100%', display: 'grid', gap: '10px', padding: '12px' }}>
      <GlassCard>
        <SectionTitle title="Профиль" subtitle={`ID: ${id}`} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '62px', height: '62px', borderRadius: '999px', overflow: 'hidden', border: '1px solid rgba(79,212,255,0.45)' }}>
            {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
          </div>
          <div style={{ fontWeight: 800, fontSize: '18px' }}>{name}</div>
        </div>
        <Button tone="violet" style={{ marginTop: '10px' }} onClick={onRename}>Сменить имя</Button>
      </GlassCard>
      <GlassCard>
        <SectionTitle title="Статистика" />
        <div style={{ display: 'grid', gap: '6px' }}>
          {stats.map((s) => (
            <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', color: '#e2e8f0' }}>
              <span>{s.label}</span><strong>{s.value}</strong>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
});
