import { memo } from 'react';

type TutorialOverlayProps = {
  show: boolean;
};

export const TutorialOverlay = memo(function TutorialOverlay({ show }: TutorialOverlayProps) {
  if (!show) return null;
  return (
    <div
      className="tutorial-overlay"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 500,
        pointerEvents: 'none',
      }}
    >
      <div
        className="tutorial-highlight"
        style={{
          position: 'absolute',
          left: '50%',
          bottom: '66px',
          transform: 'translateX(-50%)',
          width: 'min(92vw, 760px)',
          height: '170px',
          borderRadius: '16px',
          border: '1px dashed rgba(79,140,255,0.55)',
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.08), inset 0 0 12px rgba(79,140,255,0.2)',
          pointerEvents: 'auto',
          zIndex: 600,
        }}
      />
    </div>
  );
});
