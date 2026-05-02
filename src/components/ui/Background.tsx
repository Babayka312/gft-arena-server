import { forwardRef, memo, type CSSProperties, type ReactNode, useMemo } from 'react';
import { resolveBackgroundFallbackPath, resolveBackgroundPath } from '../../ui/backgrounds';

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

  return (
    <div
      ref={ref}
      style={{
        minHeight: '100vh',
        backgroundImage: gradient
          ? `${gradient}, url('${mobileBg}'), url('${fallbackBg}')`
          : `url('${mobileBg}'), url('${fallbackBg}')`,
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
