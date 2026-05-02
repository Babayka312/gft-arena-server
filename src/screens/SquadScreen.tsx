import { memo } from 'react';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';
import { SectionTitle } from '../components/ui/SectionTitle';

type SquadMonster = {
  id: string;
  name: string;
  element: string;
  role: string;
  rarity: string;
};

type SquadScreenProps = {
  monsters: SquadMonster[];
  selectedIds: string[];
  onToggleMonster: (id: string) => void;
  onAssemble: () => void;
};

export const SquadScreen = memo(function SquadScreen({
  monsters,
  selectedIds,
  onToggleMonster,
  onAssemble,
}: SquadScreenProps) {
  return (
    <div style={{ minHeight: '100%', display: 'grid', gap: '10px', padding: '12px' }}>
      <GlassCard>
        <SectionTitle title="Отряд" subtitle="Monster Card v2.0" />
      </GlassCard>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
        {monsters.map((m) => {
          const active = selectedIds.includes(m.id);
          return (
            <GlassCard key={m.id} style={{ border: active ? '1px solid rgba(79,212,255,0.8)' : undefined }}>
              <div style={{ fontWeight: 800 }}>{m.name}</div>
              <div style={{ fontSize: '12px', color: '#cbd5e1' }}>{m.element} · {m.role} · {m.rarity}</div>
              <Button tone={active ? 'cyan' : 'neutral'} style={{ marginTop: '8px', width: '100%' }} onClick={() => onToggleMonster(m.id)}>
                {active ? 'Убрать' : 'Выбрать'}
              </Button>
            </GlassCard>
          );
        })}
      </div>
      <Button tone="violet" onClick={onAssemble}>Собрать отряд</Button>
    </div>
  );
});
