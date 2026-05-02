import { memo } from 'react';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';
import { SectionTitle } from '../components/ui/SectionTitle';

type PveScreenProps = {
  chapters: number[];
  selectedChapter: number;
  levels: number[];
  onSelectChapter: (chapter: number) => void;
  onStartLevel: (level: number) => void;
};

export const PveScreen = memo(function PveScreen({
  chapters,
  selectedChapter,
  levels,
  onSelectChapter,
  onStartLevel,
}: PveScreenProps) {
  return (
    <div style={{ minHeight: '100%', display: 'grid', gap: '10px', padding: '12px' }}>
      <GlassCard>
        <SectionTitle title="PvE Походы" subtitle={`Глава ${selectedChapter}`} />
      </GlassCard>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {chapters.map((chapter) => (
          <Button key={chapter} tone={chapter === selectedChapter ? 'cyan' : 'neutral'} onClick={() => onSelectChapter(chapter)}>
            Гл. {chapter}
          </Button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
        {levels.map((level) => (
          <GlassCard key={level}>
            <div style={{ fontWeight: 800 }}>Уровень {level}</div>
            <Button tone="pink" style={{ marginTop: '8px', width: '100%' }} onClick={() => onStartLevel(level)}>
              Бой
            </Button>
          </GlassCard>
        ))}
      </div>
    </div>
  );
});
