import { memo } from 'react';
import { BottomNav as CosmicBottomNav } from '../navigation/BottomNav';

type BottomNavItem = {
  screen: string;
  label: string;
  tile: string;
  activeColor: string;
};

type BottomNavProps = {
  items: BottomNavItem[];
  activeScreen: string;
  onNavigate: (screen: string) => void;
};

export const BottomNav = memo(function BottomNav({ items, activeScreen, onNavigate }: BottomNavProps) {
  return (
    <CosmicBottomNav
      items={items.map((i) => ({ screen: i.screen, label: i.label, activeColor: i.activeColor }))}
      activeScreen={activeScreen}
      onNavigate={onNavigate}
    />
  );
});
