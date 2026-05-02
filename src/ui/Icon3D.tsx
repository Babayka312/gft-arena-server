export type ButtonIconId =
  | 'home-3d'
  | 'arena-3d'
  | 'team-3d'
  | 'shop-3d'
  | 'levelup-3d'
  | 'farm-3d'
  | 'artifacts-3d'
  | 'craft-3d'
  | 'pvp-3d'
  | 'pve-3d';

const BUTTON_ICON_SPRITE = '/images/ui/button-icons.svg';

export function Icon3D({ id, size = 34 }: { id: ButtonIconId; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      style={{ display: 'block', transform: 'translateZ(0)' }}
    >
      <use href={`${BUTTON_ICON_SPRITE}#${id}`} />
    </svg>
  );
}
