import { useState, useEffect, type CSSProperties } from 'react';
import { listSessions, createSession, loadSession, deleteSession } from '../storage/session-manager';
import type { SessionMeta } from '../storage/session-manager';
import type { Portfolio } from '../types/portfolio';
import { Mayor } from '../components/Mayor';
import { SpeechBubble } from '../components/SpeechBubble';
import { mayorLines } from '../content/mayorDialogue';
import { tokens } from '../styles/tokens';

interface Props {
  initialPortfolio: Portfolio;
  onSessionStart: (slug: string, portfolio: Portfolio) => void;
}

type Mode = 'menu' | 'create' | 'resume';

// ─── Helpers ───────────────────────────────────────────────────────────────

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

/** Stable colour per session, derived from the slug. */
const SESSION_DOT_COLORS = [
  tokens.color.citizen,
  tokens.color.construct,
  tokens.color.money,
  tokens.color.debt,
  tokens.color.brick,
];
function dotColor(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return SESSION_DOT_COLORS[h % SESSION_DOT_COLORS.length];
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function LandingScreen({ initialPortfolio, onSessionStart }: Props) {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [mode, setMode] = useState<Mode>('menu');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  useEffect(() => {
    setSessions(listSessions());
  }, []);

  const handleCreate = async () => {
    if (!name.trim() || !password.trim()) {
      setError('Donne un nom et un mot de passe à ta ville.');
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
      setError("Sélectionne une ville et entre son mot de passe.");
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
    if (confirm('Supprimer cette ville ? Cette action est définitive.')) {
      deleteSession(slug);
      const next = listSessions();
      setSessions(next);
      if (selectedSlug === slug) setSelectedSlug(next[0]?.slug ?? null);
      if (next.length === 0) setMode('menu');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (mode === 'create') handleCreate();
      if (mode === 'resume') handleResume();
    }
  };

  const goMenu = () => {
    setMode('menu');
    setError(null);
    setName('');
    setPassword('');
    setSelectedSlug(null);
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div style={styles.root}>
      {/* Background layers — subtle grid + corner glow */}
      <div style={styles.bgGrid} aria-hidden />
      <div style={styles.bgGlow} aria-hidden />

      {/* ═══ LEFT — Maire + brand markers ═════════════════════════════════ */}
      <section style={styles.left}>
        {/* Top marker */}
        <div style={styles.markerRow}>
          <span style={styles.markerDot} />
          <span style={styles.markerLabel}>DEBT CITY · KLS</span>
        </div>

        {/* Mayor + speech bubble */}
        <div style={styles.mayorWrap}>
          <Mayor size={340} mood="welcome" />
          <div style={styles.bubbleWrap}>
            <SpeechBubble tail="left" name="LE MAIRE" width={320}>
              {mayorLines.landing.text}
            </SpeechBubble>
          </div>
        </div>

        {/* Bottom marker */}
        <div style={styles.markerFooter}>
          <span>v0.4 · BUILD 2026.05</span>
          <span style={styles.markerDivider} />
          <span>
            {sessions.length === 0
              ? 'AUCUNE PARTIE SAUVEGARDÉE'
              : `${sessions.length} PARTIE${sessions.length > 1 ? 'S' : ''} SAUVEGARDÉE${sessions.length > 1 ? 'S' : ''}`}
          </span>
        </div>
      </section>

      {/* ═══ RIGHT — Form pane ════════════════════════════════════════════ */}
      <section style={styles.right}>
        <div style={styles.rightInner}>
          {mode === 'menu' && (
            <>
              <div style={styles.eyebrow}>BIENVENUE</div>
              <h1 style={styles.heroTitle}>
                <span>Construis ta ville,</span>
                <br />
                <span style={styles.heroAccent}>gère ta dette.</span>
              </h1>
              <p style={styles.heroSub}>
                Ton portefeuille est une ville. Chaque ligne de dette est un
                immeuble, chaque classe d'actifs un quartier. Construis,
                refinance, démolis — tout ce que tu fais ici reflète ton vrai
                portfolio.
              </p>

              <div style={styles.menuStack}>
                <button
                  style={{
                    ...styles.menuBtn,
                    ...styles.menuBtnPrimary,
                    ...(hoverKey === 'create' ? styles.menuBtnHover : {}),
                  }}
                  onClick={() => setMode('create')}
                  onMouseEnter={() => setHoverKey('create')}
                  onMouseLeave={() => setHoverKey(null)}
                >
                  <span style={styles.menuIcon}>🏗️</span>
                  <div style={styles.menuTextBlock}>
                    <div style={styles.menuLabel}>Nouvelle partie</div>
                    <div style={styles.menuHint}>Crée ta ville depuis zéro</div>
                  </div>
                  <span style={styles.menuArrow}>→</span>
                </button>

                <button
                  style={{
                    ...styles.menuBtn,
                    ...(sessions.length === 0 ? styles.menuBtnDisabled : {}),
                    ...(hoverKey === 'resume' && sessions.length > 0
                      ? styles.menuBtnHover
                      : {}),
                  }}
                  onClick={() => {
                    if (sessions.length === 0) return;
                    setMode('resume');
                    setSelectedSlug(sessions[0].slug);
                  }}
                  onMouseEnter={() => setHoverKey('resume')}
                  onMouseLeave={() => setHoverKey(null)}
                  disabled={sessions.length === 0}
                >
                  <span style={styles.menuIcon}>🔑</span>
                  <div style={styles.menuTextBlock}>
                    <div style={styles.menuLabel}>Reprendre une partie</div>
                    <div style={styles.menuHint}>
                      {sessions.length === 0
                        ? 'Aucune sauvegarde'
                        : `${sessions.length} ville${sessions.length > 1 ? 's' : ''} sauvegardée${sessions.length > 1 ? 's' : ''}`}
                    </div>
                  </div>
                  <span style={styles.menuArrow}>→</span>
                </button>
              </div>

              <div style={styles.metaFooter}>
                SAUVEGARDE LOCALE
                <span style={styles.metaDivider} />
                CHIFFRÉ
                <span style={styles.metaDivider} />
                FRANÇAIS
              </div>
            </>
          )}

          {mode === 'create' && (
            <div onKeyDown={handleKeyDown}>
              <div style={styles.eyebrow}>NOUVELLE PARTIE</div>
              <h1 style={styles.formTitle}>On lui donne quel nom&nbsp;?</h1>
              <p style={styles.formSub}>
                Le nom de ta ville. C'est aussi le slug de ta sauvegarde locale
                — choisis quelque chose que tu reconnaîtras facilement.
              </p>

              <label style={styles.label}>NOM DE LA VILLE</label>
              <input
                style={styles.input}
                type="text"
                placeholder="Ex&nbsp;: Démo Kls, Ma Ville..."
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                autoFocus
              />

              <label style={{ ...styles.label, marginTop: 18 }}>
                MOT DE PASSE
              </label>
              <input
                style={styles.input}
                type="password"
                placeholder="Pour protéger ta sauvegarde"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
              />

              {error && <div style={styles.error}>{error}</div>}

              <button
                style={{
                  ...styles.primaryAction,
                  ...(loading ? styles.primaryActionDisabled : {}),
                }}
                onClick={handleCreate}
                disabled={loading}
              >
                {loading ? '⏳ En cours...' : '🏗️  Construire la ville'}
              </button>

              <button style={styles.linkBack} onClick={goMenu}>
                ← Retour au menu
              </button>
            </div>
          )}

          {mode === 'resume' && (
            <div onKeyDown={handleKeyDown}>
              <div style={styles.eyebrow}>REPRENDRE</div>
              <h1 style={styles.formTitle}>Quelle ville on continue&nbsp;?</h1>
              <p style={styles.formSub}>
                Choisis ta ville et entre son mot de passe. Tu retrouveras
                exactement où tu t'étais arrêté.
              </p>

              <div style={styles.sessionList}>
                {sessions.map((s) => {
                  const active = selectedSlug === s.slug;
                  return (
                    <div
                      key={s.slug}
                      style={{
                        ...styles.sessionItem,
                        ...(active ? styles.sessionItemActive : {}),
                      }}
                      onClick={() => {
                        setSelectedSlug(s.slug);
                        setError(null);
                      }}
                    >
                      <span
                        style={{
                          ...styles.sessionDot,
                          background: dotColor(s.slug),
                        }}
                      />
                      <div style={styles.sessionTextBlock}>
                        <div style={styles.sessionName}>{s.name}</div>
                        <div style={styles.sessionMeta}>
                          {timeAgo(s.updatedAt).toUpperCase()}
                        </div>
                      </div>
                      <button
                        style={styles.deleteBtn}
                        onClick={(e) => handleDelete(s.slug, e)}
                        title="Supprimer cette ville"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>

              <label style={{ ...styles.label, marginTop: 18 }}>
                MOT DE PASSE
              </label>
              <input
                style={styles.input}
                type="password"
                placeholder="Mot de passe de la ville"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                autoFocus
              />

              {error && <div style={styles.error}>{error}</div>}

              <button
                style={{
                  ...styles.primaryAction,
                  ...(loading || !selectedSlug ? styles.primaryActionDisabled : {}),
                }}
                onClick={handleResume}
                disabled={loading || !selectedSlug}
              >
                {loading ? '⏳ En cours...' : '🔑  Rejoindre la ville'}
              </button>

              <button style={styles.linkBack} onClick={goMenu}>
                ← Retour au menu
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
  // ── Root layout ─────────────────────────────────────────────────────────
  root: {
    position: 'fixed',
    inset: 0,
    display: 'grid',
    gridTemplateColumns: '1.05fr 1fr',
    minHeight: '100vh',
    background:
      'linear-gradient(135deg, #0E0B1A 0%, #14112A 50%, #1A1530 100%)',
    fontFamily: tokens.font.ui,
    color: tokens.color.text,
    overflow: 'hidden',
    zIndex: 1000,
  },
  bgGrid: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(200, 210, 255, 0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(200, 210, 255, 0.04) 1px, transparent 1px)
    `,
    backgroundSize: '64px 64px',
    maskImage:
      'radial-gradient(ellipse at center, black 30%, transparent 85%)',
    WebkitMaskImage:
      'radial-gradient(ellipse at center, black 30%, transparent 85%)',
    pointerEvents: 'none',
  },
  bgGlow: {
    position: 'absolute',
    top: -200,
    left: -200,
    width: 600,
    height: 600,
    background:
      'radial-gradient(circle, rgba(255, 192, 58, 0.12) 0%, transparent 70%)',
    pointerEvents: 'none',
  },

  // ── Left pane ───────────────────────────────────────────────────────────
  left: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '40px 56px',
    zIndex: 1,
  },
  markerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  markerDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: tokens.color.citizen,
    boxShadow: '0 0 12px rgba(255, 192, 58, 0.7)',
  },
  markerLabel: {
    fontFamily: tokens.font.mono,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.18em',
    color: tokens.color.textMid,
  },

  mayorWrap: {
    position: 'relative',
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 0,
  },
  bubbleWrap: {
    position: 'absolute',
    left: 'calc(50% + 130px)',
    top: '32%',
  },

  markerFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    fontFamily: tokens.font.mono,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.18em',
    color: tokens.color.textDim,
  },
  markerDivider: {
    width: 4,
    height: 4,
    borderRadius: '50%',
    background: tokens.color.textDim,
    opacity: 0.6,
  },

  // ── Right pane ──────────────────────────────────────────────────────────
  right: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: '40px 80px 40px 56px',
    zIndex: 1,
  },
  rightInner: {
    width: '100%',
    maxWidth: 480,
  },

  eyebrow: {
    fontFamily: tokens.font.mono,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.18em',
    color: tokens.color.citizen,
    marginBottom: 16,
  },

  // Hero
  heroTitle: {
    fontFamily: tokens.font.display,
    fontSize: 64,
    fontWeight: 800,
    letterSpacing: '-0.035em',
    lineHeight: 1.02,
    margin: 0,
    color: tokens.color.text,
  },
  heroAccent: {
    color: tokens.color.citizen,
  },
  heroSub: {
    fontSize: 16,
    lineHeight: 1.55,
    color: tokens.color.textMid,
    marginTop: 18,
    marginBottom: 36,
    maxWidth: 380,
  },

  // Menu
  menuStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginBottom: 28,
  },
  menuBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '20px 22px',
    background: tokens.color.surface,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: tokens.color.hairline,
    borderRadius: tokens.radius.lg,
    cursor: 'pointer',
    color: tokens.color.text,
    fontFamily: tokens.font.ui,
    textAlign: 'left',
    transition: 'all 0.18s cubic-bezier(0.5, 0, 0.2, 1)',
    width: '100%',
  },
  menuBtnPrimary: {
    background:
      'linear-gradient(135deg, rgba(255,192,58,0.10) 0%, rgba(255,77,141,0.06) 100%)',
    borderColor: tokens.color.citizenBd,
  },
  menuBtnHover: {
    transform: 'translateX(4px)',
    background: tokens.color.surfaceHi,
    borderColor: tokens.color.hairline2,
  },
  menuBtnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  menuIcon: {
    fontSize: 24,
    flexShrink: 0,
  },
  menuTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: 700,
    color: tokens.color.text,
    fontFamily: tokens.font.ui,
  },
  menuHint: {
    fontSize: 12,
    color: tokens.color.textMid,
    marginTop: 3,
  },
  menuArrow: {
    fontSize: 18,
    color: tokens.color.textDim,
    flexShrink: 0,
  },

  metaFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontFamily: tokens.font.mono,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.18em',
    color: tokens.color.textDim,
  },
  metaDivider: {
    width: 3,
    height: 3,
    borderRadius: '50%',
    background: tokens.color.textDim,
    opacity: 0.5,
  },

  // Forms (create / resume)
  formTitle: {
    fontFamily: tokens.font.display,
    fontSize: 44,
    fontWeight: 800,
    letterSpacing: '-0.03em',
    lineHeight: 1.05,
    margin: 0,
    color: tokens.color.text,
  },
  formSub: {
    fontSize: 14,
    lineHeight: 1.55,
    color: tokens.color.textMid,
    marginTop: 14,
    marginBottom: 28,
    maxWidth: 400,
  },
  label: {
    display: 'block',
    fontFamily: tokens.font.mono,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.18em',
    color: tokens.color.textDim,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    background: tokens.color.surface,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: tokens.color.hairline2,
    borderRadius: tokens.radius.md,
    color: tokens.color.text,
    fontFamily: tokens.font.ui,
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s, background 0.15s',
  },
  error: {
    color: tokens.color.debt,
    fontSize: 12,
    fontFamily: tokens.font.mono,
    fontWeight: 700,
    letterSpacing: '0.05em',
    padding: '14px 0 4px',
  },

  primaryAction: {
    display: 'block',
    width: '100%',
    marginTop: 24,
    padding: '16px 20px',
    background: tokens.color.citizen,
    border: 'none',
    borderRadius: tokens.radius.pill,
    color: tokens.color.bg,
    fontFamily: tokens.font.ui,
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: '0.01em',
    cursor: 'pointer',
    transition: 'transform 0.12s, box-shadow 0.12s',
    boxShadow: '0 8px 24px rgba(255, 192, 58, 0.25)',
  },
  primaryActionDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  linkBack: {
    display: 'block',
    margin: '14px auto 0',
    background: 'transparent',
    border: 'none',
    color: tokens.color.textMid,
    fontFamily: tokens.font.ui,
    fontSize: 13,
    cursor: 'pointer',
    padding: '6px 12px',
  },

  // Session list
  sessionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxHeight: 240,
    overflowY: 'auto',
    paddingRight: 4,
  },
  sessionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '14px 16px',
    background: tokens.color.surface,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: tokens.color.hairline,
    borderRadius: tokens.radius.md,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  sessionItemActive: {
    background: tokens.color.surfaceHi,
    borderColor: tokens.color.citizenBd,
  },
  sessionDot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    flexShrink: 0,
    boxShadow: '0 0 10px currentColor',
  },
  sessionTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  sessionName: {
    fontSize: 14,
    fontWeight: 700,
    color: tokens.color.text,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  sessionMeta: {
    fontFamily: tokens.font.mono,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.12em',
    color: tokens.color.textDim,
    marginTop: 3,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: `1px solid ${tokens.color.hairline}`,
    borderRadius: tokens.radius.sm,
    color: tokens.color.textDim,
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 0.15s',
  },
};
