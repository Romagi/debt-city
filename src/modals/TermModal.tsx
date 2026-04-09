import { useState } from 'react';
import type { PortfolioAction } from '../state/portfolio-reducer';
import Modal, { FormField, FormInput, FormActions, FormButton } from './Modal';

interface Props {
  projectId: string;
  covenantId: string;
  onClose: () => void;
  dispatch: React.Dispatch<PortfolioAction>;
}

export default function TermModal({ projectId, covenantId, onClose, dispatch }: Props) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const dateError = startDate && endDate && endDate < startDate;

  function handleSubmit() {
    if (!name.trim() || !startDate || !endDate || dateError) return;

    dispatch({
      type: 'ADD_TERM',
      payload: { projectId, covenantId, name, startDate, endDate },
    });
    onClose();
  }

  return (
    <Modal title="New Term" onClose={onClose}>
      <FormField label="Term Name *">
        <FormInput value={name} onChange={e => setName(e.target.value)} placeholder="Q1 2026" autoFocus />
      </FormField>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <FormField label="Start Date *">
          <FormInput
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            style={{ colorScheme: 'dark' }}
          />
        </FormField>
        <FormField label={dateError ? 'End Date ⚠ Must be ≥ start' : 'End Date *'}>
          <FormInput
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            style={{ colorScheme: 'dark', ...(dateError ? { borderColor: '#FF4136' } : {}) }}
          />
        </FormField>
      </div>

      <FormActions>
        <FormButton variant="ghost" onClick={onClose}>Cancel</FormButton>
        <FormButton onClick={handleSubmit} disabled={!name.trim() || !startDate || !endDate || !!dateError}>
          Add Term
        </FormButton>
      </FormActions>
    </Modal>
  );
}
