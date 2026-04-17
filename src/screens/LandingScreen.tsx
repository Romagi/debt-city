import { useState, useEffect } from 'react';
import { listSessions, createSession, loadSession, deleteSession } from '../storage/session-manager';
import type { SessionMeta } from '../storage/session-manager';
import type { Portfolio } from '../types/portfolio';

interface Props {
  initialPortfolio: Portfolio;
  onSessionStart: (slug: string, portfolio: Portfolio) => void;
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

export default function LandingScreen({ initialPortfolio, onSessionStart }: Props) {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [mode, setMode] = useState<'menu' | 'create' | 'resume'>('menu');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSessions(listSessions());
  }, []);

  const handleCreate = async () => {
    if (!name.trim() || !password.trim()) {
      setError('Remplis tous les champs');
      return;
    }
    setLoading(true);
    setError(null);
    const result = await createSession(name.trim(), password, initialPortfolio);
    setLoading(false);
    if (result.success) {
      onSessionStart(result.slug, initialPortfolio);
    } else {
      setError(result.error);
    }
  };

  const handleResume = async () => {
    if (!selectedSlug || !password.trim()) {
      setError('Sélectionne une partie et entre le mot de passe');
      return;
    }
    setLoading(true);
    setError(null);
    const result = await loadSession(selectedSlug, password);
    setLoading(false);
    if (result.success) {
      onSessionStart(selectedSlug, result.portfolio);
    } else {
      setError(result.error);
    }
  };

  const handleDelete = (slug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Supprimer cette partie ?')) {
      deleteSession(slug);
      setSessions(listSessions());
      if (selectedSlug === slug) setSelectedSlug(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (mode === 'create') handleCreate();
      if (mode === 'resume') handleResume();
    }
  };

  return (
    <div style={styles.backdrop}>
      <div style={styles.container}>
        {/* Logo / Title */}
        <div style={styles.logo}>🏙️</div>
        <h1 style={styles.title}>DEBT CITY</h1>
        <p style={styles.subtitle}>City builder de portfolio de dette</p>

        {mode === 'menu' && (
          <div style={styles.menu}>
            <button style={styles.menuBtn} onClick={() => setMode('create')}>
              <span style={styles.menuIcon}>🏗️</span>
              <div>
                <div style={styles.menuLabel}>Nouvelle partie</div>
                <div style={styles.menuHint}>Crée ta ville depuis zéro</div>
              </div>
            </button>

            <button
              style={{
                ...styles.menuBtn,
                ...(sessions.length === 0 ? styles.menuBtnDisabled : {}),
              }}
              onClick={() => {
                if (sessions.length > 0) {
                  setMode('resume');
                  // Auto-select first (most recent) session
                  setSelectedSlug(sessions[0].slug);
                }
              }}
              disabled={sessions.length === 0}
            >
              <span style={styles.menuIcon}>🔑</span>
              <div>
                <div style={styles.menuLabel}>Reprendre une partie</div>
                <div style={styles.menuHint}>
                  {sessions.length === 0
                    ? 'Aucune sauvegarde'
                    : `${sessions.length} partie${sessions.length > 1 ? 's' : ''} sauvegardée${sessions.length > 1 ? 's' : ''}`}
                </div>
              </div>
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div style={styles.form} onKeyDown={handleKeyDown}>
            <div style={styles.formTitle}>Nouvelle partie</div>

            <label style={styles.label}>Nom de la partie</label>
            <input
              style={styles.input}
              type="text"
              placeholder="Ex: Demo Kls, Ma Ville..."
              value={name}
              onChange={e => { setName(e.target.value); setError(null); }}
              autoFocus
            />

            <label style={styles.label}>Mot de passe</label>
            <input
              style={styles.input}
              type="password"
              placeholder="Pour protéger ta sauvegarde"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(null); }}
            />

            {error && <div style={styles.error}>{error}</div>}

            <div style={styles.actions}>
              <button style={styles.backBtn} onClick={() => { setMode('menu'); setError(null); setName(''); setPassword(''); }}>
                ← Retour
              </button>
              <button style={styles.primaryBtn} onClick={handleCreate} disabled={loading}>
                {loading ? '⏳' : '🏗️'} Créer
              </button>
            </div>
          </div>
        )}

        {mode === 'resume' && (
          <div style={styles.form} onKeyDown={handleKeyDown}>
            <div style={styles.formTitle}>Reprendre une partie</div>

            <label style={styles.label}>Sélectionne ta partie</label>
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
                  <div style={styles.sessionMeta}>
                    {timeAgo(s.updatedAt)}
                  </div>
                  <button
                    style={styles.deleteBtn}
                    onClick={e => handleDelete(s.slug, e)}
                    title="Supprimer"
                  >
                    ✕
                  </button>
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

            <div style={styles.actions}>
              <button style={styles.backBtn} onClick={() => { setMode('menu'); setError(null); setPassword(''); setSelectedSlug(null); }}>
                ← Retour
              </button>
              <button style={styles.primaryBtn} onClick={handleResume} disabled={loading || !selectedSlug}>
                {loading ? '⏳' : '🔑'} Rejoindre
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Styles ───

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'linear-gradient(135deg, #0A0F19 0%, #0F1A2E 50%, #0A0F19 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'monospace',
    zIndex: 1000,
  },
  container: {
    width: 400,
    maxWidth: '90vw',
    background: 'rgba(15, 20, 35, 0.9)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: '40px 32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  logo: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    color: '#6AB0F0',
    fontSize: 28,
    fontWeight: 900,
    letterSpacing: 4,
    margin: 0,
  },
  subtitle: {
    color: '#556',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 32,
  },

  // Menu
  menu: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  menuBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '16px 18px',
    background: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    cursor: 'pointer',
    color: '#CCC',
    fontFamily: 'monospace',
    textAlign: 'left' as const,
    transition: 'all 0.15s',
  },
  menuBtnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  menuIcon: {
    fontSize: 28,
    flexShrink: 0,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: 700,
    color: '#DDD',
  },
  menuHint: {
    fontSize: 11,
    color: '#667',
    marginTop: 2,
  },

  // Form
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#6AB0F0',
    marginBottom: 8,
    textAlign: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: 700,
    color: '#778',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },
  input: {
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    color: '#DDD',
    fontFamily: 'monospace',
    fontSize: 13,
    outline: 'none',
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
    marginTop: 12,
  },
  backBtn: {
    flex: 1,
    padding: '10px 0',
    background: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255,255,255,0.08)',
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
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(74,144,217,0.4)',
    borderRadius: 10,
    color: '#6AB0F0',
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },

  // Session list
  sessionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    maxHeight: 200,
    overflowY: 'auto',
  },
  sessionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'all 0.15s',
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
  deleteBtn: {
    width: 24,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,65,54,0.1)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255,65,54,0.2)',
    borderRadius: 6,
    color: '#FF4136',
    fontSize: 10,
    fontWeight: 'bold',
    cursor: 'pointer',
    flexShrink: 0,
  },
};
