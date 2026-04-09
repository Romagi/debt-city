import { useState } from 'react';
import type { Lender, LenderRole } from '../types/portfolio';
import type { PortfolioAction } from '../state/portfolio-reducer';
import Modal, { FormField, FormInput, FormSelect, FormActions, FormButton } from './Modal';

interface Props {
  projectId: string;
  lender?: Lender; // undefined = create mode
  onClose: () => void;
  dispatch: React.Dispatch<PortfolioAction>;
}

const ROLES: { value: LenderRole; label: string }[] = [
  { value: 'participant', label: 'Participant' },
  { value: 'arranger', label: 'Arranger' },
  { value: 'agent', label: 'Agent' },
];

const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 };

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5,
      color: '#556', borderTop: '1px solid rgba(255,255,255,0.06)',
      paddingTop: 14, marginTop: 8, marginBottom: 12,
    }}>
      {children}
    </div>
  );
}

export default function LenderModal({ projectId, lender, onClose, dispatch }: Props) {
  const isEdit = !!lender;
  const [name, setName] = useState(lender?.corporateName ?? '');
  const [role, setRole] = useState<LenderRole>(lender?.role ?? 'participant');
  const [legalForm, setLegalForm] = useState(lender?.legalForm ?? '');
  const [headOffice, setHeadOffice] = useState(lender?.headOffice ?? '');
  const [rcs, setRcs] = useState(lender?.rcs ?? '');
  const [instName, setInstName] = useState(lender?.bankAccount?.institutionName ?? '');
  const [bic, setBic] = useState(lender?.bankAccount?.bic ?? '');
  const [iban, setIban] = useState(lender?.bankAccount?.iban ?? '');

  function handleSubmit() {
    if (!name.trim()) return;

    const hasBankAccount = instName || bic || iban;
    const data = {
      corporateName: name,
      role,
      legalForm: legalForm || null,
      headOffice: headOffice || null,
      rcs: rcs || null,
      bankAccount: hasBankAccount ? { institutionName: instName, bic, iban } : null,
      allocations: lender?.allocations ?? [],
    };

    if (isEdit) {
      dispatch({ type: 'EDIT_LENDER', payload: { projectId, lenderId: lender!.id, ...data } });
    } else {
      dispatch({ type: 'ADD_LENDER', payload: { projectId, ...data } });
    }
    onClose();
  }

  return (
    <Modal title={isEdit ? 'Edit Lender' : 'Add to Syndicate'} onClose={onClose} wide>
      <SectionLabel>Bank Info</SectionLabel>

      <FormField label="Bank Name *">
        <FormInput value={name} onChange={e => setName(e.target.value)} placeholder="BNP Paribas" autoFocus />
      </FormField>

      <div style={grid2}>
        <FormField label="Role">
          <FormSelect value={role} onChange={e => setRole(e.target.value as LenderRole)}>
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </FormSelect>
        </FormField>
        <FormField label="Legal Form">
          <FormInput value={legalForm} onChange={e => setLegalForm(e.target.value)} placeholder="SA" />
        </FormField>
      </div>

      <div style={grid2}>
        <FormField label="Head Office">
          <FormInput value={headOffice} onChange={e => setHeadOffice(e.target.value)} placeholder="Paris" />
        </FormField>
        <FormField label="RCS">
          <FormInput value={rcs} onChange={e => setRcs(e.target.value)} placeholder="Paris B 662 042 449" />
        </FormField>
      </div>

      <SectionLabel>Bank Account</SectionLabel>

      <div style={grid2}>
        <FormField label="Institution Name">
          <FormInput value={instName} onChange={e => setInstName(e.target.value)} placeholder="BNP Paribas SA" />
        </FormField>
        <FormField label="BIC / SWIFT">
          <FormInput value={bic} onChange={e => setBic(e.target.value)} placeholder="BNPAFRPP" style={{ textTransform: 'uppercase' }} />
        </FormField>
      </div>

      <FormField label="IBAN">
        <FormInput value={iban} onChange={e => setIban(e.target.value)} placeholder="FR76 3000 4000 0300 0012 3456 789" style={{ textTransform: 'uppercase', letterSpacing: 1 }} />
      </FormField>

      <FormActions>
        <FormButton variant="ghost" onClick={onClose}>Cancel</FormButton>
        <FormButton onClick={handleSubmit} disabled={!name.trim()}>
          {isEdit ? 'Save' : 'Add Lender'}
        </FormButton>
      </FormActions>
    </Modal>
  );
}
