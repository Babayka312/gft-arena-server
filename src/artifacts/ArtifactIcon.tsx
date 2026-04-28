import { useState } from 'react';
import type { CSSProperties } from 'react';
import { getArtifactArtUrl, getArtifactTypeArtUrl } from './artifactPortraits';
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

type ArtStage = 'rarity' | 'type' | 'inline';

function FrameOverlay({ rarity }: { rarity: ArtifactRarity }) {
  return (
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
  );
}

/**
 * Каскад: 1) PNG для тип×редкость → 2) общий PNG по типу → 3) inline SVG.
 * Поверх каждого слоя — рамка редкости.
 */
export function ArtifactIcon({ type, rarity, width = 72, height, className, style }: Props) {
  const [stage, setStage] = useState<ArtStage>('rarity');

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

  if (stage === 'inline') {
    const html = getArtifactInlineSvgMarkup(type, rarity);
    return (
      <div className={className} style={boxStyle} aria-hidden>
        <div
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: html }}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            borderRadius: '22%',
            overflow: 'hidden',
          }}
        />
        <FrameOverlay rarity={rarity} />
      </div>
    );
  }

  const src = stage === 'rarity' ? getArtifactArtUrl(type, rarity) : getArtifactTypeArtUrl(type);

  return (
    <div className={className} style={boxStyle} aria-hidden>
      <img
        src={src}
        alt=""
        draggable={false}
        onError={() => setStage((prev) => (prev === 'rarity' ? 'type' : 'inline'))}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: '22%',
        }}
      />
      <FrameOverlay rarity={rarity} />
    </div>
  );
}

export function ArtifactIconForArtifact({
  artifact,
  ...rest
}: Omit<Props, 'type' | 'rarity'> & { artifact: Pick<Artifact, 'type' | 'rarity'> }) {
  return <ArtifactIcon type={artifact.type} rarity={artifact.rarity} {...rest} />;
}
