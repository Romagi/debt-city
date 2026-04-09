import { useState } from 'react';
import type { Borrower } from '../types/portfolio';
import type { PortfolioAction } from '../state/portfolio-reducer';
import Modal, { FormField, FormInput, FormActions, FormButton } from './Modal';

interface Props {
  borrower?: Borrower; // undefined = create mode
  onClose: () => void;
  dispatch: React.Dispatch<PortfolioAction>;
}

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

export default function BorrowerModal({ borrower, onClose, dispatch }: Props) {
  const isEdit = !!borrower;
  const [name, setName] = useState(borrower?.corporateName ?? '');
  const [legalForm, setLegalForm] = useState(borrower?.legalForm ?? '');
  const [headOffice, setHeadOffice] = useState(borrower?.headOffice ?? '');
  const [rcs, setRcs] = useState(borrower?.rcs ?? '');
  const [capital, setCapital] = useState(borrower?.capital ? (borrower.capital.amount / 1_000_000).toString() : '');
  const [esg1, setEsg1] = useState(borrower?.esgScope1?.toString() ?? '');
  const [esg2, setEsg2] = useState(borrower?.esgScope2?.toString() ?? '');
  const [esg3, setEsg3] = useState(borrower?.esgScope3?.toString() ?? '');
  const [patrimony, setPatrimony] = useState(borrower?.patrimony ? (borrower.patrimony.amount / 1_000_000).toString() : '');
  const [taxCA, setTaxCA] = useState(borrower?.taxonomyCA?.toString() ?? '');
  const [taxOPEX, setTaxOPEX] = useState(borrower?.taxonomyOPEX?.toString() ?? '');

  function handleSubmit() {
    if (!name.trim()) return;

    const payload = {
      corporateName: name,
      legalForm: legalForm || null,
      headOffice: headOffice || null,
      rcs: rcs || null,
      capital: capital ? { amount: Number(capital) * 1_000_000, currency: 'EUR' } : null,
      esgScope1: esg1 ? Number(esg1) : null,
      esgScope2: esg2 ? Number(esg2) : null,
      esgScope3: esg3 ? Number(esg3) : null,
      patrimony: patrimony ? { amount: Number(patrimony) * 1_000_000, currency: 'EUR' } : null,
      taxonomyCA: taxCA ? Number(taxCA) : null,
      taxonomyOPEX: taxOPEX ? Number(taxOPEX) : null,
    };

    if (isEdit) {
      dispatch({ type: 'EDIT_BORROWER', payload: { id: borrower!.id, ...payload } });
    } else {
      dispatch({ type: 'ADD_BORROWER', payload });
    }
    onClose();
  }

  return (
    <Modal title={isEdit ? 'Edit Borrower' : 'New Borrower'} onClose={onClose} wide>
      <SectionLabel>Company</SectionLabel>

      <FormField label="Corporate Name *">
        <FormInput value={name} onChange={e => setName(e.target.value)} placeholder="Foncière Rivoli" autoFocus />
      </FormField>

      <div style={grid2}>
        <FormField label="Legal Form">
          <FormInput value={legalForm} onChange={e => setLegalForm(e.target.value)} placeholder="SA" />
        </FormField>
        <FormField label="Head Office">
          <FormInput value={headOffice} onChange={e => setHeadOffice(e.target.value)} placeholder="Paris 8e" />
        </FormField>
      </div>

      <div style={grid2}>
        <FormField label="RCS">
          <FormInput value={rcs} onChange={e => setRcs(e.target.value)} placeholder="Paris B 123 456 789" />
        </FormField>
        <FormField label="Capital (M EUR)">
          <FormInput type="number" min={0} step={0.1} value={capital} onChange={e => setCapital(e.target.value)} placeholder="50" />
        </FormField>
      </div>

      <SectionLabel>ESG & Taxonomy</SectionLabel>

      <div style={grid2}>
        <FormField label="ESG Scope 1 (tCO2e)">
          <FormInput type="number" value={esg1} onChange={e => setEsg1(e.target.value)} placeholder="1200" />
        </FormField>
        <FormField label="ESG Scope 2 (tCO2e)">
          <FormInput type="number" value={esg2} onChange={e => setEsg2(e.target.value)} placeholder="800" />
        </FormField>
      </div>

      <div style={grid2}>
        <FormField label="ESG Scope 3 (tCO2e)">
          <FormInput type="number" value={esg3} onChange={e => setEsg3(e.target.value)} placeholder="3500" />
        </FormField>
        <FormField label="Patrimony (M EUR)">
          <FormInput type="number" min={0} step={0.1} value={patrimony} onChange={e => setPatrimony(e.target.value)} placeholder="200" />
        </FormField>
      </div>

      <div style={grid2}>
        <FormField label="Taxonomy CA (%)">
          <FormInput type="number" min={0} max={100} step={0.1} value={taxCA} onChange={e => setTaxCA(e.target.value)} placeholder="45" />
        </FormField>
        <FormField label="Taxonomy OPEX (%)">
          <FormInput type="number" min={0} max={100} step={0.1} value={taxOPEX} onChange={e => setTaxOPEX(e.target.value)} placeholder="30" />
        </FormField>
      </div>

      <FormActions>
        <FormButton variant="ghost" onClick={onClose}>Cancel</FormButton>
        <FormButton onClick={handleSubmit} disabled={!name.trim()}>
          {isEdit ? 'Save' : 'Create Borrower'}
        </FormButton>
      </FormActions>
    </Modal>
  );
}
