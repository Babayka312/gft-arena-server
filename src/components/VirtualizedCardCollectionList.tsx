import { memo, useMemo, useRef, useState, type CSSProperties, type UIEvent } from 'react';
import type { CharacterCard } from '../cards/catalog';
import { getCharacterCardImageSrcSet, getCharacterCardImageUrl } from '../cards/images';
import { getRarityFrameUrl } from '../ui/rarityFrames';

type Props = {
  cards: CharacterCard[];
  collection: Record<string, number>;
  selectedCardIds: string[];
  onToggleCard: (cardId: string) => void;
  onOpenUpgrade: (cardId: string) => void;
  getCardStars: (cardId: string) => number;
  getCardStarMultiplier: (stars: number) => number;
};

const ROW_HEIGHT = 116;
const OVERSCAN = 5;

const rowStyle: CSSProperties = {
  position: 'absolute',
  left: 0,
  right: 0,
  height: `${ROW_HEIGHT - 8}px`,
};

const CardRow = memo(function CardRow({
  card,
  top,
  count,
  isSelected,
  stars,
  starMult,
  onToggleCard,
  onOpenUpgrade,
}: {
  card: CharacterCard;
  top: number;
  count: number;
  isSelected: boolean;
  stars: number;
  starMult: number;
  onToggleCard: (cardId: string) => void;
  onOpenUpgrade: (cardId: string) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onToggleCard(card.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onToggleCard(card.id);
        }
      }}
      style={{
        ...rowStyle,
        top,
        minWidth: 0,
        background: '#0b1220',
        border: isSelected ? '2px solid #eab308' : '1px solid #334155',
        borderRadius: '14px',
        padding: '12px',
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        textAlign: 'left',
        cursor: 'pointer',
        color: '#e2e8f0',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ position: 'relative', width: '64px', height: '64px', flex: '0 0 64px' }}>
        <img
          loading="lazy"
          decoding="async"
          src={getCharacterCardImageUrl(card.id)}
          srcSet={getCharacterCardImageSrcSet(card.id)}
          style={{ position: 'absolute', inset: 0, width: '64px', height: '64px', borderRadius: '14px' }}
          alt=""
        />
        <img loading="lazy" decoding="async" src={getRarityFrameUrl(card.rarity)} style={{ position: 'absolute', inset: 0, width: '64px', height: '64px' }} alt="" />
        <div style={{ position: 'absolute', right: '-6px', bottom: '-6px', background: '#111827', border: '1px solid #334155', borderRadius: '9999px', padding: '3px 8px', fontSize: '12px', fontWeight: 900, color: '#e2e8f0' }}>
          ×{count}
        </div>
      </div>

      <div style={{ textAlign: 'left', minWidth: 0, flex: '1 1 auto' }}>
        <div style={{ fontWeight: 900, color: '#e2e8f0', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.name}</div>
        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
          {card.rarity} • {card.element} • {card.kind}
        </div>
        <div style={{ marginTop: '4px', fontSize: '12px', color: '#facc15', fontWeight: 900, letterSpacing: '0.05em' }}>
          {'★'.repeat(stars)}{'☆'.repeat(Math.max(0, 5 - stars))}
        </div>
        <div style={{ marginTop: '6px', display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '12px', color: '#cbd5e1' }}>
          <span>HP <b style={{ color: '#22c55e' }}>{Math.floor(card.hp * starMult)}</b></span>
          <span>PWR <b style={{ color: '#f59e0b' }}>{Math.floor(card.power * starMult)}</b></span>
          <span>SPD <b style={{ color: '#60a5fa' }}>{card.speed}</b></span>
        </div>
      </div>
      <span
        role="button"
        tabIndex={0}
        onClick={(event) => {
          event.stopPropagation();
          onOpenUpgrade(card.id);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.stopPropagation();
            onOpenUpgrade(card.id);
          }
        }}
        aria-label={`Прокачка карты ${card.name}`}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: 'linear-gradient(135deg, rgba(234,179,8,0.55), rgba(56,189,248,0.45))',
          color: '#0b1120',
          fontWeight: 950,
          fontSize: '11px',
          padding: '3px 7px',
          borderRadius: '999px',
          border: '1px solid #facc15',
          boxShadow: '0 4px 10px rgba(0,0,0,0.35)',
          cursor: 'pointer',
        }}
      >
        ★ Прокачать
      </span>
    </div>
  );
});

export const VirtualizedCardCollectionList = memo(function VirtualizedCardCollectionList({
  cards,
  collection,
  selectedCardIds,
  onToggleCard,
  onOpenUpgrade,
  getCardStars,
  getCardStarMultiplier,
}: Props) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const viewportHeight = 620;
  const totalHeight = cards.length * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(cards.length, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN);

  const visibleCards = useMemo(() => cards.slice(startIndex, endIndex), [cards, endIndex, startIndex]);

  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  };

  return (
    <div
      ref={viewportRef}
      onScroll={onScroll}
      style={{
        position: 'relative',
        maxHeight: 'min(62vh, 620px)',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        paddingRight: '2px',
      }}
    >
      <div style={{ position: 'relative', height: `${totalHeight}px` }}>
        {visibleCards.map((card, idx) => {
          const absoluteIndex = startIndex + idx;
          const count = collection[card.id] ?? 0;
          const stars = getCardStars(card.id);
          const starMult = getCardStarMultiplier(stars);
          return (
            <CardRow
              key={card.id}
              card={card}
              top={absoluteIndex * ROW_HEIGHT}
              count={count}
              isSelected={selectedCardIds.includes(card.id)}
              stars={stars}
              starMult={starMult}
              onToggleCard={onToggleCard}
              onOpenUpgrade={onOpenUpgrade}
            />
          );
        })}
      </div>
    </div>
  );
});

