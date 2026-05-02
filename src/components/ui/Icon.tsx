import { memo } from 'react';

type IconName = 'home' | 'arena' | 'squad' | 'refs' | 'shop' | 'profile' | 'settings';

const ICONS: Record<IconName, string> = {
  home: '🏠',
  arena: '⚔️',
  squad: '🧬',
  refs: '👥',
  shop: '🛒',
  profile: '🪪',
  settings: '⚙️',
};

type IconProps = {
  name: IconName;
  size?: number;
};

export const Icon = memo(function Icon({ name, size = 18 }: IconProps) {
  return <span style={{ fontSize: `${size}px`, lineHeight: 1 }}>{ICONS[name]}</span>;
});
