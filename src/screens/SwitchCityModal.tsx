import { useState, useEffect } from 'react';
import { listSessions, loadSession } from '../storage/session-manager';
import type { SessionMeta } from '../storage/session-manager';
import type { Portfolio } from '../types/portfolio';
import { tokens } from '../styles/tokens';

interface Props {
  /** Currently active slug — hidden from the list. */
  currentSlug: string;
  onClose: () => void;
  onSwitch: (slug: string, portfolio: Portfolio) => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

export default function SwitchCityModal({ currentSlug, onClose, onSwitch }: Props) {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const all = listSessions().filter(s => s.slug !== currentSlug);
    setSessions(all);
    if (all.length > 0) setSelectedSlug(all[0].slug);
  }, [currentSlug]);

  // Esc closes the modal
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSwitch = async () => {
    if (!selectedSlug || !password.trim()) {
      setError('Sélectionne une ville et entre le mot de passe');
      return;
    }
    setLoading(true);
    setError(null);
    const result = await loadSession(selectedSlug, password);
    setLoading(false);
    if (result.success) {
      onSwitch(selectedSlug, result.portfolio);
    } else {
      setError(result.error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSwitch();
  };

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.container} onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div style={styles.title}>🏙️ Changer de ville</div>
        <div style={styles.subtitle}>
          Bascule sur une autre partie sauvegardée. La ville actuelle est conservée.
        </div>

        {sessions.length === 0 ? (
          <div style={styles.empty}>
            Aucune autre partie sauvegardée.<br/>
            Crée-en une depuis l'écran d'accueil.
          </div>
        ) : (
          <>
            <label style={styles.label}>Sélectionne une ville</label>
            <div style={styles.sessionList}>
              {sessions.map(s => (
                <div
                  key={s.slug}
                  style={{
                    ...styles.sessionItem,
                    ...(selectedSlug === s.slug ? styles.sessionItemActive : {}),
                  }}
                  onClick={() => { setSelectedSlug(s.slug); setError(null); }}
                >
                  <div style={styles.sessionName}>{s.name}</div>
                  <div style={styles.sessionMeta}>{timeAgo(s.updatedAt)}</div>
                </div>
              ))}
            </div>

            <label style={styles.label}>Mot de passe</label>
            <input
              style={styles.input}
              type="password"
              placeholder="Entre le mot de passe"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(null); }}
              autoFocus
            />

            {error && <div style={styles.error}>{error}</div>}
          </>
        )}

        <div style={styles.actions}>
          <button style={styles.backBtn} onClick={onClose}>Annuler</button>
          {sessions.length > 0 && (
            <button
              style={styles.primaryBtn}
              onClick={handleSwitch}
              disabled={loading || !selectedSlug}
            >
              {loading ? '⏳' : '🔑'} Rejoindre
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: tokens.color.overlay,
    backdropFilter: tokens.blur.soft,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: tokens.font.family,
    zIndex: tokens.z.modal,
  },
  container: {
    width: 420,
    maxWidth: '90vw',
    background: tokens.color.surfaceHi,
    border: `1px solid ${tokens.color.border}`,
    borderRadius: tokens.radius.xxl,
    padding: '32px 28px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    boxShadow: tokens.shadow.xl,
  },
  title: {
    color: tokens.color.primary,
    fontSize: tokens.font.size.xl,
    fontWeight: tokens.font.weight.bold,
    letterSpacing: tokens.font.tracking.tight,
    textAlign: 'center',
  },
  subtitle: {
    color: tokens.color.textDim,
    fontSize: tokens.font.size.xs,
    textAlign: 'center',
    marginBottom: 16,
  },
  empty: {
    color: tokens.color.textDim,
    fontSize: tokens.font.size.sm,
    textAlign: 'center',
    padding: '32px 0',
    lineHeight: 1.6,
  },
  label: {
    fontSize: tokens.font.size.xxs,
    fontWeight: tokens.font.weight.bold,
    color: tokens.color.textDim,
    textTransform: 'uppercase',
    letterSpacing: tokens.font.tracking.wide,
    marginTop: 8,
  },
  sessionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    maxHeight: 200,
    overflowY: 'auto',
    marginTop: 4,
  },
  sessionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 14px',
    background: tokens.color.surfaceLo,
    border: `1px solid ${tokens.color.border}`,
    borderRadius: tokens.radius.md,
    cursor: 'pointer',
    transition: 'all 0.12s',
  },
  sessionItemActive: {
    background: tokens.color.primaryBg,
    borderColor: tokens.color.primaryBd,
  },
  sessionName: {
    flex: 1,
    fontSize: tokens.font.size.md,
    fontWeight: tokens.font.weight.bold,
    color: tokens.color.text,
  },
  sessionMeta: {
    fontSize: tokens.font.size.xxs,
    color: tokens.color.textDim,
  },
  input: {
    padding: '12px 16px',
    background: tokens.color.surfaceLo,
    border: `1px solid ${tokens.color.border}`,
    borderRadius: tokens.radius.md,
    color: tokens.color.text,
    fontFamily: tokens.font.family,
    fontSize: tokens.font.size.md,
    outline: 'none',
    marginTop: 4,
  },
  error: {
    color: tokens.color.danger,
    fontSize: tokens.font.size.xs,
    textAlign: 'center',
    padding: '6px 0',
  },
  actions: {
    display: 'flex',
    gap: 10,
    marginTop: 16,
  },
  backBtn: {
    flex: 1,
    padding: '12px 0',
    background: tokens.color.surfaceLo,
    border: `1px solid ${tokens.color.border}`,
    borderRadius: tokens.radius.pill,
    color: tokens.color.textDim,
    fontFamily: tokens.font.family,
    fontSize: tokens.font.size.sm,
    fontWeight: tokens.font.weight.bold,
    cursor: 'pointer',
    transition: 'all 0.12s',
  },
  primaryBtn: {
    flex: 2,
    padding: '12px 0',
    background: tokens.color.primaryBg,
    border: `1px solid ${tokens.color.primaryBd}`,
    borderRadius: tokens.radius.pill,
    color: tokens.color.primary,
    fontFamily: tokens.font.family,
    fontSize: tokens.font.size.md,
    fontWeight: tokens.font.weight.bold,
    cursor: 'pointer',
    transition: 'all 0.12s',
  },
};
