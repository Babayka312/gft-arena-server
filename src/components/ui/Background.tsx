import { forwardRef, memo, type CSSProperties, type ReactNode, useMemo } from 'react';
import { resolveBackgroundPath, resolveTabletBackgroundPath } from '../../ui/backgrounds';

type BackgroundProps = {
  background: string;
  gradient?: string;
  style?: CSSProperties;
  children: ReactNode;
};

const BackgroundBase = forwardRef<HTMLDivElement, BackgroundProps>(function Background(
  { background, gradient, style, children }: BackgroundProps,
  ref,
) {
  const mobileBg = useMemo(() => resolveBackgroundPath(background), [background]);
  const tabletBg = useMemo(() => resolveTabletBackgroundPath(background), [background]);
  const imageSet = useMemo(
    () => `image-set(url('${mobileBg}') 1x, url('${tabletBg}') 2x)`,
    [mobileBg, tabletBg],
  );

  return (
    <div
      ref={ref}
      style={{
        minHeight: '100vh',
        backgroundImage: gradient ? `${gradient}, ${imageSet}` : imageSet,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'scroll',
        ...style,
      }}
    >
      {children}
    </div>
  );
});

export const Background = memo(BackgroundBase);
