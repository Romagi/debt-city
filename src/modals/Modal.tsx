import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}

export default function Modal({ title, onClose, children, wide }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  return (
    <div ref={overlayRef} style={styles.overlay} onClick={handleOverlayClick}>
      <div style={{ ...styles.modal, ...(wide ? { maxWidth: 680, minWidth: 560 } : {}) }}>
        <div style={styles.header}>
          <h2 style={styles.title}>{title}</h2>
          <button onClick={onClose} style={styles.closeBtn}>&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Shared form components ───

export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}

export function FormInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...styles.input, ...props.style }} />;
}

export function FormTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} style={{ ...styles.input, minHeight: 60, resize: 'vertical', ...props.style }} />;
}

export function FormSelect({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} style={{ ...styles.input, ...props.style }}>{children}</select>;
}

export function FormActions({ children }: { children: ReactNode }) {
  return <div style={styles.actions}>{children}</div>;
}

export function FormButton({ variant = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'danger' | 'ghost' }) {
  const variantStyles: Record<string, React.CSSProperties> = {
    primary: { background: '#4A90D9', color: '#FFF' },
    danger: { background: '#FF4136', color: '#FFF' },
    ghost: { background: 'transparent', color: '#AAA', border: '1px solid rgba(255,255,255,0.15)' },
  };
  return <button {...props} style={{ ...styles.button, ...variantStyles[variant], ...props.style }} />;
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'rgba(20, 25, 40, 0.97)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 28,
    minWidth: 380,
    maxWidth: 480,
    width: '90%',
    color: '#FFF',
    fontFamily: 'monospace',
    fontSize: 13,
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: 22,
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: 1,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    color: '#888',
    fontSize: 10,
    textTransform: 'uppercase' as const,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6,
    color: '#FFF',
    fontFamily: 'monospace',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  actions: {
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 24,
  },
  button: {
    padding: '8px 20px',
    border: 'none',
    borderRadius: 6,
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
};
