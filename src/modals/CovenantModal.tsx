import { useState } from 'react';
import type { Covenant, CovenantNature } from '../types/portfolio';
import type { PortfolioAction } from '../state/portfolio-reducer';
import Modal, { FormField, FormInput, FormSelect, FormActions, FormButton } from './Modal';

interface Props {
  projectId: string;
  covenant?: Covenant; // undefined = create mode
  onClose: () => void;
  dispatch: React.Dispatch<PortfolioAction>;
}

const NATURES: { value: CovenantNature; label: string }[] = [
  { value: 'financial_ratio', label: 'Financial Ratio' },
  { value: 'financial_element', label: 'Financial Element' },
  { value: 'document', label: 'Document' },
  { value: 'control', label: 'Control' },
  { value: 'esg_criteria', label: 'ESG Criteria' },
  { value: 'action_agent', label: 'Action Agent' },
];

export default function CovenantModal({ projectId, covenant, onClose, dispatch }: Props) {
  const isEdit = !!covenant;
  const [name, setName] = useState(covenant?.name ?? '');
  const [nature, setNature] = useState<CovenantNature>(covenant?.nature ?? 'financial_ratio');

  function handleSubmit() {
    if (!name.trim()) return;

    if (isEdit) {
      dispatch({ type: 'EDIT_COVENANT', payload: { projectId, covenantId: covenant!.id, name, nature } });
    } else {
      dispatch({ type: 'ADD_COVENANT', payload: { projectId, name, nature } });
    }
    onClose();
  }

  return (
    <Modal title={isEdit ? 'Edit Covenant' : 'New Covenant'} onClose={onClose}>
      <FormField label="Covenant Name *">
        <FormInput value={name} onChange={e => setName(e.target.value)} placeholder="DSCR" autoFocus />
      </FormField>

      <FormField label="Nature">
        <FormSelect value={nature} onChange={e => setNature(e.target.value as CovenantNature)}>
          {NATURES.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
        </FormSelect>
      </FormField>

      <FormActions>
        <FormButton variant="ghost" onClick={onClose}>Cancel</FormButton>
        <FormButton onClick={handleSubmit} disabled={!name.trim()}>
          {isEdit ? 'Save' : 'Add Covenant'}
        </FormButton>
      </FormActions>
    </Modal>
  );
}
