import { memo } from 'react';

type Tab = {
  id: string;
  label: string;
};

type TabBarProps = {
  tabs: Tab[];
  activeId: string;
  onChange: (id: string) => void;
};

export const TabBar = memo(function TabBar({ tabs, activeId, onChange }: TabBarProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`,
        gap: '8px',
      }}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              minHeight: '38px',
              borderRadius: '10px',
              border: active ? '1px solid rgba(79,212,255,0.7)' : '1px solid rgba(148,163,184,0.4)',
              background: active
                ? 'linear-gradient(180deg, rgba(79,212,255,0.3), rgba(10,15,42,0.86))'
                : 'rgba(15,23,42,0.76)',
              color: active ? '#e0f2fe' : '#cbd5e1',
              fontWeight: 800,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
});
