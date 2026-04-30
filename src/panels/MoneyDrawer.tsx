import { memo, useMemo } from 'react';
import type { Portfolio } from '../types/portfolio';
import { formatMoney } from '../city/utils';
import { tokens, tabularNums } from '../styles/tokens';

interface Props {
  portfolio: Portfolio;
}

/**
 * Drawer "💰 Argent" — financial aggregates of the portfolio.
 * Replaces the totalFunding / Deals / Borrowers cells of the old PortfolioOverview bar.
 *
 * Wrapped in React.memo: the parent (CityHeader) re-renders on every portfolio
 * tick, but the drawer only needs to recompute when the portfolio reference
 * actually changes. All aggregates are memoised on the same key.
 */
function MoneyDrawer({ portfolio }: Props) {
  const { projects, borrowers, totalFunding } = portfolio;

  // All aggregates in a single useMemo — recomputed only when portfolio changes
  const stats = useMemo(() => {
    let active = 0, drafts = 0, finished = 0, archived = 0;
    let totalAllocated = 0, trancheCount = 0, lenderCount = 0;
    const byNature: Record<string, { count: number; amount: number }> = {};
    for (const p of projects) {
      if      (p.currentStatus === 'published') active++;
      else if (p.currentStatus === 'draft')     drafts++;
      else if (p.currentStatus === 'finished')  finished++;
      else if (p.currentStatus === 'archived')  archived++;
      trancheCount += p.tranches.length;
      lenderCount  += p.lenders.length;
      for (const l of p.lenders) {
        for (const a of l.allocations) totalAllocated += a.amount.amount;
      }
      const k = p.nature ?? 'other';
      if (!byNature[k]) byNature[k] = { count: 0, amount: 0 };
      byNature[k].count  += 1;
      byNature[k].amount += p.globalFundingAmount.amount;
    }
    const natureRows = Object.entries(byNature).sort((a, b) => b[1].amount - a[1].amount);
    return { active, drafts, finished, archived, totalAllocated, trancheCount, lenderCount, natureRows };
  }, [projects]);

  const { active, drafts, finished, archived, totalAllocated, trancheCount, lenderCount, natureRows } = stats;

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

export default memo(MoneyDrawer);

const styles: Record<string, React.CSSProperties> = {
  title: {
    fontSize: tokens.font.size.md,
    fontWeight: tokens.font.weight.bold,
    color: tokens.color.primary,
    letterSpacing: tokens.font.tracking.wide,
    marginBottom: 14,
  },
  bigCard: {
    background: tokens.color.primaryBg,
    border: `1px solid ${tokens.color.primaryBd}`,
    borderRadius: tokens.radius.lg,
    padding: '14px 18px',
    marginBottom: 14,
  },
  bigLabel: {
    fontSize: tokens.font.size.xxs,
    color: tokens.color.textDim,
    textTransform: 'uppercase',
    letterSpacing: tokens.font.tracking.wider,
    fontWeight: tokens.font.weight.bold,
  },
  bigValue: {
    fontSize: tokens.font.size.xxl,
    fontWeight: tokens.font.weight.bold,
    color: tokens.color.primary,
    marginTop: 2,
    ...tabularNums,
  },
  bigSub: {
    fontSize: tokens.font.size.xxs,
    color: tokens.color.textDim,
    marginTop: 4,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    marginBottom: 14,
  },
  stat: {
    background: tokens.color.surfaceLo,
    border: `1px solid ${tokens.color.border}`,
    borderRadius: tokens.radius.md,
    padding: '12px 14px',
  },
  statLabel: {
    fontSize: tokens.font.size.xxs,
    color: tokens.color.textDim,
    textTransform: 'uppercase',
    letterSpacing: tokens.font.tracking.wide,
    fontWeight: tokens.font.weight.bold,
  },
  statValue: {
    fontSize: tokens.font.size.xl,
    fontWeight: tokens.font.weight.bold,
    color: tokens.color.text,
    marginTop: 2,
    ...tabularNums,
  },
  statHint: {
    fontSize: tokens.font.size.xxs,
    color: tokens.color.textDim,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: tokens.font.size.xxs,
    fontWeight: tokens.font.weight.bold,
    color: tokens.color.textDim,
    textTransform: 'uppercase',
    letterSpacing: tokens.font.tracking.wide,
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
    padding: '8px 12px',
    background: tokens.color.surfaceLo,
    borderRadius: tokens.radius.sm,
    fontSize: tokens.font.size.xs,
  },
  natureLabel: {
    color: tokens.color.text,
    fontWeight: tokens.font.weight.semibold,
  },
  natureCount: {
    color: tokens.color.textDim,
    fontVariantNumeric: 'tabular-nums',
  },
  natureAmount: {
    color: tokens.color.primary,
    fontWeight: tokens.font.weight.bold,
    fontVariantNumeric: 'tabular-nums',
    minWidth: 60,
    textAlign: 'right',
  },
};
