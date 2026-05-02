import { forwardRef, memo, type CSSProperties, type ReactNode, useMemo } from 'react';
import { resolveBackgroundFallbackPath, resolveBackgroundPath } from '../../ui/backgrounds';
import { publicAssetUrl } from '../../utils/publicAssetUrl';

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
  const fallbackBg = useMemo(() => resolveBackgroundFallbackPath(background), [background]);
  const mobileBgUrl = useMemo(() => publicAssetUrl(mobileBg), [mobileBg]);
  const fallbackBgUrl = useMemo(() => publicAssetUrl(fallbackBg), [fallbackBg]);

  return (
    <div
      ref={ref}
      style={{
        minHeight: '100vh',
        backgroundImage: gradient
          ? `${gradient}, url('${mobileBgUrl}'), url('${fallbackBgUrl}')`
          : `url('${mobileBgUrl}'), url('${fallbackBgUrl}')`,
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
