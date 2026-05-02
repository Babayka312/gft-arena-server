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
        className="text-panel"
        style={{
          position: 'absolute',
          top: '56px',
          left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: 'min(92vw, 560px)',
          fontSize: '12px',
          color: '#e2e8f0',
          fontWeight: 700,
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        Обучение: выбери цель и используй кнопки атаки внизу.
      </div>
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
          border: '1px dashed rgba(250,204,21,0.65)',
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.06), inset 0 0 16px rgba(250,204,21,0.24)',
          pointerEvents: 'none',
          zIndex: 600,
        }}
      />
    </div>
  );
});
