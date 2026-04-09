import { useState } from 'react';
import type { Borrower, FundingSpecificity, Project, ProjectNature, ProjectStatus, TrackingType } from '../types/portfolio';
import type { PortfolioAction } from '../state/portfolio-reducer';
import Modal, { FormField, FormInput, FormSelect, FormTextarea, FormActions, FormButton } from './Modal';

interface Props {
  project?: Project; // undefined = create mode
  borrowers: Borrower[];
  onClose: () => void;
  dispatch: React.Dispatch<PortfolioAction>;
}

const NATURES: { value: ProjectNature; label: string }[] = [
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'leveraged', label: 'Leveraged' },
  { value: 'project_finance', label: 'Project Finance' },
];

const TRACKING_TYPES: { value: TrackingType; label: string }[] = [
  { value: 'agency', label: 'Agency' },
  { value: 'bilateral', label: 'Bilateral' },
  { value: 'participation', label: 'Participation' },
];

const STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: 'draft', label: 'Draft (Construction)' },
  { value: 'published', label: 'Published (Active)' },
  { value: 'archived', label: 'Archived' },
  { value: 'finished', label: 'Finished' },
];

const FUNDING_SPECIFICITIES: { value: FundingSpecificity; label: string }[] = [
  { value: 'cbi', label: 'CBI' },
  { value: 'lbo', label: 'LBO' },
  { value: 'project_financing', label: 'Project Financing' },
  { value: 'acquisition_financing', label: 'Acquisition Financing' },
  { value: 'development_financing', label: 'Development Financing' },
  { value: 'refinancing', label: 'Refinancing' },
  { value: 'restructuring', label: 'Restructuring' },
  { value: 'bridge_loan', label: 'Bridge Loan' },
  { value: 'green_loan', label: 'Green Loan' },
  { value: 'social_loan', label: 'Social Loan' },
  { value: 'sustainability_linked', label: 'Sustainability Linked' },
  { value: 'club_deal', label: 'Club Deal' },
  { value: 'syndicated', label: 'Syndicated' },
  { value: 'bilateral_loan', label: 'Bilateral Loan' },
];

export default function DealModal({ project, borrowers, onClose, dispatch }: Props) {
  const isEdit = !!project;

  // General
  const [title, setTitle] = useState(project?.title ?? '');
  const [nature, setNature] = useState<ProjectNature>(project?.nature ?? 'real_estate');
  const [trackingType, setTrackingType] = useState<TrackingType>(project?.trackingType ?? 'agency');
  const [agentName, setAgentName] = useState(project?.agentName ?? '');
  const [borrowerId, setBorrowerId] = useState(project?.borrowerId ?? borrowers[0]?.id ?? '');
  const [status, setStatus] = useState<ProjectStatus>(project?.currentStatus ?? 'draft');

  // References & Details
  const [operationReference, setOperationReference] = useState(project?.operationReference ?? '');
  const [internalReference, setInternalReference] = useState(project?.internalReference ?? '');
  const [fundingSpecificity, setFundingSpecificity] = useState<FundingSpecificity | ''>(project?.fundingSpecificity ?? '');
  const [riskGroupName, setRiskGroupName] = useState(project?.riskGroupName ?? '');
  const [description, setDescription] = useState(project?.description ?? '');

  // Financial & Dates
  const [fundingAmount, setFundingAmount] = useState(
    project?.globalFundingAmount.amount ? (project.globalFundingAmount.amount / 1_000_000).toString() : ''
  );
  const [closingDate, setClosingDate] = useState(project?.closingDate ?? '');
  const [contractEndDate, setContractEndDate] = useState(project?.contractEndDate ?? '');

  const dateError = closingDate && contractEndDate && contractEndDate < closingDate;

  function handleSubmit() {
    if (!title.trim() || !borrowerId) return;
    if (dateError) return;

    const shared = {
      title,
      nature,
      trackingType,
      agentName,
      globalFundingAmount: { amount: fundingAmount ? Number(fundingAmount) * 1_000_000 : 0, currency: 'EUR' },
      closingDate: closingDate || null,
      contractEndDate: contractEndDate || null,
      operationReference: operationReference || null,
      internalReference: internalReference || null,
      fundingSpecificity: (fundingSpecificity || null) as FundingSpecificity | null,
      description: description || null,
      riskGroupName: riskGroupName || null,
    };

    if (isEdit) {
      dispatch({
        type: 'EDIT_PROJECT',
        payload: { id: project!.id, ...shared, currentStatus: status },
      });
    } else {
      dispatch({
        type: 'ADD_PROJECT',
        payload: { ...shared, borrowerId },
      });
    }
    onClose();
  }

  return (
    <Modal title={isEdit ? 'Edit Deal' : 'New Deal'} onClose={onClose} wide>
      {/* ── General ── */}
      <SectionLabel>General</SectionLabel>

      <FormField label="Deal Title *">
        <FormInput value={title} onChange={e => setTitle(e.target.value)} placeholder="Tour Montparnasse Refi" autoFocus />
      </FormField>

      <div style={grid2}>
        <FormField label="Borrower *">
          <FormSelect value={borrowerId} onChange={e => setBorrowerId(e.target.value)} disabled={isEdit}>
            {borrowers.map(b => (
              <option key={b.id} value={b.id}>{b.corporateName}</option>
            ))}
          </FormSelect>
        </FormField>
        <FormField label="Nature">
          <FormSelect value={nature} onChange={e => setNature(e.target.value as ProjectNature)}>
            {NATURES.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
          </FormSelect>
        </FormField>
      </div>

      <div style={grid2}>
        <FormField label="Tracking">
          <FormSelect value={trackingType} onChange={e => setTrackingType(e.target.value as TrackingType)}>
            {TRACKING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </FormSelect>
        </FormField>
        {isEdit ? (
          <FormField label="Status">
            <FormSelect value={status} onChange={e => setStatus(e.target.value as ProjectStatus)}>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </FormSelect>
          </FormField>
        ) : (
          <div />
        )}
      </div>

      {/* ── References & Details ── */}
      <SectionLabel>References & Details</SectionLabel>

      <div style={grid2}>
        <FormField label="Operation Reference">
          <FormInput value={operationReference} onChange={e => setOperationReference(e.target.value)} placeholder="OP-2024-0615-TMR" />
        </FormField>
        <FormField label="Internal Reference">
          <FormInput value={internalReference} onChange={e => setInternalReference(e.target.value)} placeholder="INT-FR-CRE-001" />
        </FormField>
      </div>

      <div style={grid2}>
        <FormField label="Funding Specificity">
          <FormSelect value={fundingSpecificity} onChange={e => setFundingSpecificity(e.target.value as FundingSpecificity | '')}>
            <option value="">— None —</option>
            {FUNDING_SPECIFICITIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </FormSelect>
        </FormField>
        <FormField label="Risk Group">
          <FormInput value={riskGroupName} onChange={e => setRiskGroupName(e.target.value)} placeholder="Foncière Rivoli Group" />
        </FormField>
      </div>

      <FormField label="Description">
        <FormTextarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Brief description of the deal..."
          rows={2}
        />
      </FormField>

      {/* ── Financial & Dates ── */}
      <SectionLabel>Financial & Dates</SectionLabel>

      <div style={grid2}>
        <FormField label="Global Funding (M EUR)">
          <FormInput
            type="number"
            min={0}
            step={0.1}
            value={fundingAmount}
            onChange={e => setFundingAmount(e.target.value)}
            placeholder="450"
          />
        </FormField>
        <FormField label="Agent Name">
          <FormInput value={agentName} onChange={e => setAgentName(e.target.value)} placeholder="BNP Paribas Securities Services" />
        </FormField>
      </div>

      <div style={grid2}>
        <FormField label="Closing Date">
          <FormInput
            type="date"
            value={closingDate}
            onChange={e => setClosingDate(e.target.value)}
            style={{ colorScheme: 'dark' }}
          />
        </FormField>
        <FormField label={dateError ? 'Contract End ⚠ Must be ≥ closing' : 'Contract End Date'}>
          <FormInput
            type="date"
            value={contractEndDate}
            onChange={e => setContractEndDate(e.target.value)}
            style={{ colorScheme: 'dark', ...(dateError ? { borderColor: '#FF4136' } : {}) }}
          />
        </FormField>
      </div>

      <FormActions>
        <FormButton variant="ghost" onClick={onClose}>Cancel</FormButton>
        <FormButton onClick={handleSubmit} disabled={!title.trim() || !borrowerId || !!dateError}>
          {isEdit ? 'Save' : 'Build Deal'}
        </FormButton>
      </FormActions>
    </Modal>
  );
}

// ─── Shared layout helpers ───

const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 };

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{
      fontSize: 9,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      color: '#556',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      paddingTop: 14,
      marginTop: 8,
      marginBottom: 12,
    }}>
      {children}
    </div>
  );
}
