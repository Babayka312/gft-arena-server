import { memo, type ButtonHTMLAttributes, type CSSProperties } from 'react';

type Tone = 'cyan' | 'pink' | 'violet' | 'neutral';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: Tone;
};

const toneStyle: Record<Tone, CSSProperties> = {
  cyan: {
    border: '1px solid rgba(79,212,255,0.55)',
    boxShadow: '0 0 18px rgba(79,212,255,0.28)',
    background: 'linear-gradient(180deg, rgba(79,212,255,0.28), rgba(10,15,42,0.78))',
  },
  pink: {
    border: '1px solid rgba(255,106,241,0.55)',
    boxShadow: '0 0 18px rgba(255,106,241,0.28)',
    background: 'linear-gradient(180deg, rgba(255,106,241,0.26), rgba(26,31,60,0.82))',
  },
  violet: {
    border: '1px solid rgba(168,107,255,0.55)',
    boxShadow: '0 0 18px rgba(168,107,255,0.28)',
    background: 'linear-gradient(180deg, rgba(168,107,255,0.24), rgba(10,15,42,0.8))',
  },
  neutral: {
    border: '1px solid rgba(148,163,184,0.45)',
    boxShadow: '0 0 14px rgba(0,0,0,0.35)',
    background: 'linear-gradient(180deg, rgba(51,65,85,0.64), rgba(15,23,42,0.85))',
  },
};

export const Button = memo(function Button({
  tone = 'cyan',
  style,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled}
      style={{
        minHeight: '42px',
        borderRadius: '12px',
        padding: '10px 14px',
        color: '#f8fafc',
        fontWeight: 800,
        fontSize: '13px',
        lineHeight: 1.1,
        textShadow: '0 0 4px rgba(0,0,0,0.8)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'transform 140ms ease, opacity 120ms ease',
        ...toneStyle[tone],
        ...style,
      }}
    >
      {children}
    </button>
  );
});
