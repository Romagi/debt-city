import { useState } from 'react';
import type { Tranche } from '../types/portfolio';
import type { PortfolioAction } from '../state/portfolio-reducer';
import Modal, { FormField, FormInput, FormSelect, FormActions, FormButton } from './Modal';

interface Props {
  projectId: string;
  tranche?: Tranche; // undefined = create mode
  onClose: () => void;
  dispatch: React.Dispatch<PortfolioAction>;
}

export default function TrancheModal({ projectId, tranche, onClose, dispatch }: Props) {
  const isEdit = !!tranche;
  const [name, setName] = useState(tranche?.name ?? '');
  const [amount, setAmount] = useState(tranche?.amount.amount ? (tranche.amount.amount / 1_000_000).toString() : '');
  const [rank, setRank] = useState(tranche?.rank ?? 'senior');
  const [nature, setNature] = useState(tranche?.nature ?? 'term_loan');
  const [repaymentType, setRepaymentType] = useState(tranche?.repaymentType ?? 'amortizing');
  const [rateIndex, setRateIndex] = useState(tranche?.rate.index ?? 'EURIBOR 3M');
  const [rateMargin, setRateMargin] = useState(tranche?.rate.margin?.toString() ?? '1.5');
  const [rateFloor, setRateFloor] = useState(tranche?.rate.floor?.toString() ?? '0');

  function handleSubmit() {
    if (!name.trim() || !amount) return;
    const trancheData = {
      name,
      amount: { amount: Number(amount) * 1_000_000, currency: 'EUR' },
      rank,
      nature,
      repaymentType,
      rate: { index: rateIndex || null, margin: Number(rateMargin) || null, floor: Number(rateFloor) || null },
    };

    if (isEdit) {
      dispatch({ type: 'EDIT_TRANCHE', payload: { projectId, trancheId: tranche!.id, ...trancheData } });
    } else {
      dispatch({ type: 'ADD_TRANCHE', payload: { projectId, ...trancheData } });
    }
    onClose();
  }

  return (
    <Modal title={isEdit ? 'Edit Tranche' : 'Add Floor (Tranche)'} onClose={onClose}>
      <FormField label="Tranche Name *">
        <FormInput value={name} onChange={e => setName(e.target.value)} placeholder="Tranche A Senior" autoFocus />
      </FormField>

      <FormField label="Amount (M EUR) *">
        <FormInput type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="300" />
      </FormField>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <FormField label="Rank">
          <FormSelect value={rank} onChange={e => setRank(e.target.value)}>
            <option value="senior">Senior</option>
            <option value="mezzanine">Mezzanine</option>
            <option value="junior">Junior</option>
          </FormSelect>
        </FormField>
        <FormField label="Nature">
          <FormSelect value={nature} onChange={e => setNature(e.target.value)}>
            <option value="term_loan">Term Loan</option>
            <option value="revolving">Revolving</option>
            <option value="capex">Capex</option>
          </FormSelect>
        </FormField>
        <FormField label="Repayment">
          <FormSelect value={repaymentType} onChange={e => setRepaymentType(e.target.value)}>
            <option value="amortizing">Amortizing</option>
            <option value="bullet">Bullet</option>
            <option value="revolving">Revolving</option>
            <option value="sculpted">Sculpted</option>
          </FormSelect>
        </FormField>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <FormField label="Rate Index">
          <FormSelect value={rateIndex} onChange={e => setRateIndex(e.target.value)}>
            <option value="EURIBOR 1M">EURIBOR 1M</option>
            <option value="EURIBOR 3M">EURIBOR 3M</option>
            <option value="EURIBOR 6M">EURIBOR 6M</option>
            <option value="">Fixed</option>
          </FormSelect>
        </FormField>
        <FormField label="Margin (%)">
          <FormInput type="number" step="0.1" value={rateMargin} onChange={e => setRateMargin(e.target.value)} />
        </FormField>
        <FormField label="Floor (%)">
          <FormInput type="number" step="0.1" value={rateFloor} onChange={e => setRateFloor(e.target.value)} />
        </FormField>
      </div>

      <FormActions>
        <FormButton variant="ghost" onClick={onClose}>Cancel</FormButton>
        <FormButton onClick={handleSubmit}>{isEdit ? 'Save' : 'Add Floor'}</FormButton>
      </FormActions>
    </Modal>
  );
}
