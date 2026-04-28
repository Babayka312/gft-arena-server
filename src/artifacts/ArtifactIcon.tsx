import { useState } from 'react';
import type { CSSProperties } from 'react';
import { getArtifactTypeArtUrl } from './artifactPortraits';
import { getArtifactInlineSvgMarkup } from './images';
import { getRarityFrameUrl } from '../ui/rarityFrames';
import type { Artifact, ArtifactRarity, ArtifactType } from './types';

type Props = {
  type: ArtifactType;
  rarity: ArtifactRarity;
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
};

/**
 * Как карточки отряда: слой арта по типу + рамка редкости (`/images/frames/rarity-*.svg`).
 * При ошибке загрузки арта — fallback на сгенерированный inline SVG без рамки.
 */
export function ArtifactIcon({ type, rarity, width = 72, height, className, style }: Props) {
  const [useInline, setUseInline] = useState(false);
  const artSrc = getArtifactTypeArtUrl(type);

  if (useInline) {
    const html = getArtifactInlineSvgMarkup(type, rarity);
    return (
      <div
        className={className}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: html }}
        aria-hidden
        style={{
          width,
          ...(height !== undefined ? { height } : {}),
          lineHeight: 0,
          display: 'block',
          marginLeft: 'auto',
          marginRight: 'auto',
          flexShrink: 0,
          ...style,
        }}
      />
    );
  }

  const boxStyle: CSSProperties = {
    position: 'relative',
    width,
    ...(height !== undefined ? { height } : {}),
    aspectRatio: height === undefined ? '1 / 1' : undefined,
    marginLeft: 'auto',
    marginRight: 'auto',
    flexShrink: 0,
    lineHeight: 0,
    ...style,
  };

  return (
    <div className={className} style={boxStyle} aria-hidden>
      <img
        src={artSrc}
        alt=""
        draggable={false}
        onError={() => setUseInline(true)}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: '22%',
        }}
      />
      <img
        src={getRarityFrameUrl(rarity)}
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'fill',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

export function ArtifactIconForArtifact({
  artifact,
  ...rest
}: Omit<Props, 'type' | 'rarity'> & { artifact: Pick<Artifact, 'type' | 'rarity'> }) {
  return <ArtifactIcon type={artifact.type} rarity={artifact.rarity} {...rest} />;
}
