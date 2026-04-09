import { useState } from 'react';
import type { Tranche, Lender } from '../types/portfolio';
import type { PortfolioAction } from '../state/portfolio-reducer';
import Modal, { FormField, FormInput, FormSelect, FormActions, FormButton } from './Modal';

interface Props {
  projectId: string;
  lender: Lender;
  tranches: Tranche[];
  onClose: () => void;
  dispatch: React.Dispatch<PortfolioAction>;
}

export default function AllocationModal({ projectId, lender, tranches, onClose, dispatch }: Props) {
  // Exclude tranches already allocated to this lender
  const allocatedIds = new Set(lender.allocations.map(a => a.trancheId));
  const available = tranches.filter(t => !allocatedIds.has(t.id));

  const [trancheId, setTrancheId] = useState(available[0]?.id ?? '');
  const [amount, setAmount] = useState('');

  function handleSubmit() {
    if (!trancheId || !amount) return;
    const tranche = tranches.find(t => t.id === trancheId);
    if (!tranche) return;

    dispatch({
      type: 'ADD_ALLOCATION',
      payload: {
        projectId,
        lenderId: lender.id,
        trancheId,
        trancheName: tranche.name,
        amount: { amount: Number(amount) * 1_000_000, currency: 'EUR' },
      },
    });
    onClose();
  }

  return (
    <Modal title={`Allocate to ${lender.corporateName}`} onClose={onClose}>
      {available.length === 0 ? (
        <div style={{ color: '#888', fontStyle: 'italic', marginBottom: 16 }}>
          All tranches are already allocated to this lender.
        </div>
      ) : (
        <>
          <FormField label="Tranche *">
            <FormSelect value={trancheId} onChange={e => setTrancheId(e.target.value)}>
              {available.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </FormSelect>
          </FormField>

          <FormField label="Allocation Amount (M EUR) *">
            <FormInput type="number" min={0} step={0.1} value={amount} onChange={e => setAmount(e.target.value)} placeholder="100" autoFocus />
          </FormField>
        </>
      )}

      <FormActions>
        <FormButton variant="ghost" onClick={onClose}>Cancel</FormButton>
        <FormButton onClick={handleSubmit} disabled={!trancheId || !amount || available.length === 0}>
          Add Allocation
        </FormButton>
      </FormActions>
    </Modal>
  );
}
