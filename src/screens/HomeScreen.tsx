import { memo } from 'react';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';
import { SectionTitle } from '../components/ui/SectionTitle';

type HomeScreenProps = {
  userName: string;
  balance: number;
  onOpenPve: () => void;
  onOpenPvp: () => void;
  onOpenSquad: () => void;
  onOpenShop: () => void;
};

export const HomeScreen = memo(function HomeScreen({
  userName,
  balance,
  onOpenPve,
  onOpenPvp,
  onOpenSquad,
  onOpenShop,
}: HomeScreenProps) {
  return (
    <div style={{ minHeight: '100%', display: 'grid', gap: '10px', padding: '12px' }}>
      <GlassCard>
        <SectionTitle title={`Добро пожаловать, ${userName || 'Боец'}!`} subtitle="Cosmic-Arcane Hub" />
        <div style={{ color: '#e2e8f0', fontWeight: 800 }}>Баланс GFT: {balance}</div>
      </GlassCard>
      <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <Button tone="cyan" onClick={onOpenPve}>PvE Походы</Button>
        <Button tone="pink" onClick={onOpenPvp}>Арена PvP</Button>
        <Button tone="violet" onClick={onOpenSquad}>Отряд</Button>
        <Button tone="neutral" onClick={onOpenShop}>Магазин</Button>
      </div>
    </div>
  );
});
