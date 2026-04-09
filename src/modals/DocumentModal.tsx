import { useState } from 'react';
import type { DocumentDrive } from '../types/portfolio';
import type { PortfolioAction } from '../state/portfolio-reducer';
import Modal, { FormField, FormInput, FormSelect, FormActions, FormButton } from './Modal';

interface Props {
  projectId: string;
  onClose: () => void;
  dispatch: React.Dispatch<PortfolioAction>;
}

const DRIVES: { value: DocumentDrive; label: string }[] = [
  { value: 'lender', label: 'Lender Drive' },
  { value: 'borrower_shared', label: 'Borrower Shared Drive' },
  { value: 'borrower_confidential', label: 'Borrower Confidential Drive' },
];

export default function DocumentModal({ projectId, onClose, dispatch }: Props) {
  const [name, setName] = useState('');
  const [drive, setDrive] = useState<DocumentDrive>('lender');

  function handleSubmit() {
    if (!name.trim()) return;
    dispatch({ type: 'ADD_DOCUMENT', payload: { projectId, name, drive } });
    onClose();
  }

  return (
    <Modal title="Add Document" onClose={onClose}>
      <FormField label="Document Name *">
        <FormInput value={name} onChange={e => setName(e.target.value)} placeholder="Credit Agreement" autoFocus />
      </FormField>

      <FormField label="Drive">
        <FormSelect value={drive} onChange={e => setDrive(e.target.value as DocumentDrive)}>
          {DRIVES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
        </FormSelect>
      </FormField>

      <FormActions>
        <FormButton variant="ghost" onClick={onClose}>Cancel</FormButton>
        <FormButton onClick={handleSubmit} disabled={!name.trim()}>Add Document</FormButton>
      </FormActions>
    </Modal>
  );
}
