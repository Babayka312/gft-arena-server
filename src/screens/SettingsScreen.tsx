import { memo } from 'react';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';
import { SectionTitle } from '../components/ui/SectionTitle';
import { TabBar } from '../components/ui/TabBar';

type SettingsScreenProps = {
  language: string;
  onSetLanguage: (lang: string) => void;
  onLogout: () => void;
};

export const SettingsScreen = memo(function SettingsScreen({
  language,
  onSetLanguage,
  onLogout,
}: SettingsScreenProps) {
  return (
    <div style={{ minHeight: '100%', display: 'grid', gap: '10px', padding: '12px' }}>
      <GlassCard>
        <SectionTitle title="Настройки" subtitle="Безопасность и предпочтения" />
        <div style={{ marginTop: '8px' }}>
          <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '6px' }}>Язык</div>
          <TabBar
            tabs={[
              { id: 'ru', label: 'RU' },
              { id: 'en', label: 'EN' },
              { id: 'uk', label: 'UA' },
              { id: 'de', label: 'DE' },
            ]}
            activeId={language}
            onChange={onSetLanguage}
          />
        </div>
      </GlassCard>
      <GlassCard>
        <SectionTitle title="Аккаунт" />
        <Button tone="pink" onClick={onLogout}>Выход из аккаунта</Button>
      </GlassCard>
    </div>
  );
});
