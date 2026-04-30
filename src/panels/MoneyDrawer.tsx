import type { Portfolio } from '../types/portfolio';
import { formatMoney } from '../city/utils';

interface Props {
  portfolio: Portfolio;
}

/**
 * Drawer "💰 Argent" — financial aggregates of the portfolio.
 * Replaces the totalFunding / Deals / Borrowers cells of the old PortfolioOverview bar.
 */
export default function MoneyDrawer({ portfolio }: Props) {
  const { projects, borrowers, totalFunding } = portfolio;

  const active = projects.filter(p => p.currentStatus === 'published').length;
  const drafts = projects.filter(p => p.currentStatus === 'draft').length;
  const finished = projects.filter(p => p.currentStatus === 'finished').length;
  const archived = projects.filter(p => p.currentStatus === 'archived').length;

  // Total exposure = sum of all lender allocations
  const totalAllocated = projects.reduce(
    (s, p) => s + p.lenders.reduce(
      (sl, l) => sl + l.allocations.reduce((sa, a) => sa + a.amount.amount, 0),
      0,
    ),
    0,
  );

  // Total tranches across all projects
  const trancheCount = projects.reduce((s, p) => s + p.tranches.length, 0);
  const lenderCount = projects.reduce((s, p) => s + p.lenders.length, 0);

  // Breakdown by nature
  const byNature: Record<string, { count: number; amount: number }> = {};
  for (const p of projects) {
    const k = p.nature ?? 'other';
    if (!byNature[k]) byNature[k] = { count: 0, amount: 0 };
    byNature[k].count += 1;
    byNature[k].amount += p.globalFundingAmount.amount;
  }
  const natureRows = Object.entries(byNature).sort((a, b) => b[1].amount - a[1].amount);

  return (
    <div>
      <div style={styles.title}>💰 Finances du portfolio</div>

      {/* Headline */}
      <div style={styles.bigCard}>
        <div style={styles.bigLabel}>Funding global</div>
        <div style={styles.bigValue}>{formatMoney(totalFunding.amount)}</div>
        <div style={styles.bigSub}>
          dont {formatMoney(totalAllocated)} alloué par les lenders
        </div>
      </div>

      {/* Stats grid */}
      <div style={styles.grid}>
        <Stat label="Deals actifs" value={active} hint={`${drafts} brouillons`} />
        <Stat label="Borrowers" value={borrowers.length} />
        <Stat label="Tranches" value={trancheCount} />
        <Stat label="Lenders (lignes)" value={lenderCount} />
        <Stat label="Clos" value={finished} hint={`${archived} archivés`} />
      </div>

      {/* Repartition par nature */}
      {natureRows.length > 0 && (
        <>
          <div style={styles.sectionTitle}>Répartition par nature</div>
          <div style={styles.natureList}>
            {natureRows.map(([k, v]) => (
              <div key={k} style={styles.natureRow}>
                <span style={styles.natureLabel}>{prettyNature(k)}</span>
                <span style={styles.natureCount}>{v.count}</span>
                <span style={styles.natureAmount}>{formatMoney(v.amount)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div style={styles.stat}>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValue}>{value}</div>
      {hint && <div style={styles.statHint}>{hint}</div>}
    </div>
  );
}

function prettyNature(n: string): string {
  return ({
    real_estate:     'Real Estate',
    infrastructure:  'Infrastructure',
    corporate:       'Corporate',
    leveraged:       'Leveraged',
    project_finance: 'Project Finance',
    other:           'Autres',
  } as Record<string, string>)[n] ?? n;
}

const styles: Record<string, React.CSSProperties> = {
  title: {
    fontSize: 13,
    fontWeight: 700,
    color: '#6AB0F0',
    letterSpacing: 1,
    marginBottom: 14,
  },
  bigCard: {
    background: 'rgba(74,144,217,0.08)',
    border: '1px solid rgba(74,144,217,0.25)',
    borderRadius: 12,
    padding: '14px 16px',
    marginBottom: 14,
  },
  bigLabel: {
    fontSize: 9,
    color: '#778',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  bigValue: {
    fontSize: 22,
    fontWeight: 800,
    color: '#6AB0F0',
    marginTop: 2,
  },
  bigSub: {
    fontSize: 10,
    color: '#889',
    marginTop: 4,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    marginBottom: 14,
  },
  stat: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 10,
    padding: '10px 12px',
  },
  statLabel: {
    fontSize: 9,
    color: '#778',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 700,
    color: '#DDD',
    marginTop: 2,
  },
  statHint: {
    fontSize: 10,
    color: '#667',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: '#778',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  natureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  natureRow: {
    display: 'grid',
    gridTemplateColumns: '1fr auto auto',
    gap: 12,
    padding: '6px 10px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    fontSize: 11,
  },
  natureLabel: {
    color: '#CCC',
    fontWeight: 600,
  },
  natureCount: {
    color: '#778',
    fontVariantNumeric: 'tabular-nums',
  },
  natureAmount: {
    color: '#6AB0F0',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    minWidth: 60,
    textAlign: 'right',
  },
};
