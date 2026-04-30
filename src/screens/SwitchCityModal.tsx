import { useState, useEffect } from 'react';
import { listSessions, loadSession } from '../storage/session-manager';
import type { SessionMeta } from '../storage/session-manager';
import type { Portfolio } from '../types/portfolio';

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
    background: 'rgba(5, 8, 15, 0.75)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'monospace',
    zIndex: 2000,
  },
  container: {
    width: 400,
    maxWidth: '90vw',
    background: 'rgba(15, 20, 35, 0.95)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: '32px 28px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  title: {
    color: '#6AB0F0',
    fontSize: 18,
    fontWeight: 900,
    letterSpacing: 1,
    textAlign: 'center',
  },
  subtitle: {
    color: '#778',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 16,
  },
  empty: {
    color: '#667',
    fontSize: 12,
    textAlign: 'center',
    padding: '32px 0',
    lineHeight: 1.6,
  },
  label: {
    fontSize: 10,
    fontWeight: 700,
    color: '#778',
    textTransform: 'uppercase',
    letterSpacing: 1,
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
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 10,
    cursor: 'pointer',
  },
  sessionItemActive: {
    background: 'rgba(74,144,217,0.2)',
    borderColor: 'rgba(74,144,217,0.4)',
  },
  sessionName: {
    flex: 1,
    fontSize: 13,
    fontWeight: 700,
    color: '#DDD',
  },
  sessionMeta: {
    fontSize: 10,
    color: '#667',
  },
  input: {
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    color: '#DDD',
    fontFamily: 'monospace',
    fontSize: 13,
    outline: 'none',
    marginTop: 4,
  },
  error: {
    color: '#FF4136',
    fontSize: 11,
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
    padding: '10px 0',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    color: '#888',
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  primaryBtn: {
    flex: 2,
    padding: '10px 0',
    background: 'rgba(74,144,217,0.25)',
    border: '1px solid rgba(74,144,217,0.4)',
    borderRadius: 10,
    color: '#6AB0F0',
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
};
