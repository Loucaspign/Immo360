import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Bien, Precompte } from '../types'

interface Props {
  biens:           Bien[]
  defaultBienId:   string
  defaultAnnee:    number
  editPrecompte?:  Precompte
  onClose:         () => void
  onSaved:         () => void
}

export function PrecompteModal({ biens, defaultBienId, defaultAnnee, editPrecompte, onClose, onSaved }: Props) {
  const e = editPrecompte
  const [bienId,  setBienId]  = useState(e?.bien_id          ?? defaultBienId)
  const [annee,   setAnnee]   = useState(String(e?.annee     ?? defaultAnnee))
  const [montant, setMontant] = useState(e?.montant != null  ? String(e.montant) : '')
  const [datePay, setDatePay] = useState(e?.date_paiement    ?? '')
  const [aRefac,  setARefac]  = useState(e?.a_refacturer     ?? false)
  const [paye,    setPaye]    = useState(e?.paye             ?? false)
  const [facture, setFacture] = useState(e?.facture          ?? false)
  const [notes,   setNotes]   = useState(e?.notes            ?? '')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  async function save() {
    if (!bienId) { setError('Bien requis.');   return }
    if (!annee)  { setError('Année requise.'); return }
    setSaving(true); setError('')
    const payload = {
      bien_id:       bienId,
      annee:         parseInt(annee),
      montant:       montant ? parseFloat(montant) : null,
      date_paiement: datePay || null,
      a_refacturer:  aRefac,
      paye,
      facture:       aRefac ? facture : false,
      notes:         notes.trim() || null,
    }
    const { error: err } = e
      ? await supabase.from('precomptes').update(payload).eq('id', e.id)
      : await supabase.from('precomptes').insert(payload)
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved(); onClose()
  }

  return (
    <div className="modal-overlay" onClick={ev => { if (ev.target === ev.currentTarget) onClose() }}>
      <div className="modal-card">
        <div className="modal-hdr">
          <span className="modal-title">{e ? 'Modifier le précompte' : 'Nouveau précompte'}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-form">

          <div className="mf-row">
            <div className="mf-group">
              <label className="mf-label">Bien <span className="mf-req">*</span></label>
              <select className="mf-select" value={bienId} onChange={ev => setBienId(ev.target.value)} disabled={!!e}>
                <option value="">— Choisir —</option>
                {biens.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="mf-group mf-group-sm">
              <label className="mf-label">Année</label>
              <input className="mf-input" type="number" min={2000} max={2100}
                value={annee} onChange={ev => setAnnee(ev.target.value)} />
            </div>
          </div>

          <div className="mf-row">
            <div className="mf-group">
              <label className="mf-label">Montant (€)</label>
              <input className="mf-input" type="number" min={0} step="0.01"
                value={montant} onChange={ev => setMontant(ev.target.value)}
                placeholder="ex. 1 200" autoFocus />
            </div>
            <div className="mf-group">
              <label className="mf-label">Date de paiement</label>
              <input className="mf-input" type="date" value={datePay} onChange={ev => setDatePay(ev.target.value)} />
            </div>
          </div>

          <div className="mf-group">
            <label className="mf-label">Prise en charge</label>
            <div className="mf-checks">
              <label className="mf-check">
                <input type="radio" name="ca-charge" checked={!aRefac} onChange={() => setARefac(false)} />
                <span>Notre charge</span>
              </label>
              <label className="mf-check">
                <input type="radio" name="ca-charge" checked={aRefac} onChange={() => setARefac(true)} />
                <span>À refacturer au locataire</span>
              </label>
            </div>
          </div>

          <div className="mf-group">
            <label className="mf-label">Statut</label>
            <div className="mf-checks">
              <label className="mf-check">
                <input type="checkbox" checked={paye} onChange={ev => setPaye(ev.target.checked)} />
                <span>Payé</span>
              </label>
              {aRefac && (
                <label className="mf-check">
                  <input type="checkbox" checked={facture} onChange={ev => setFacture(ev.target.checked)} />
                  <span>Facturé au locataire</span>
                </label>
              )}
            </div>
          </div>

          <div className="mf-group">
            <label className="mf-label">Notes <span className="mf-opt">(optionnel)</span></label>
            <textarea className="mf-textarea" value={notes} onChange={ev => setNotes(ev.target.value)}
              placeholder="Référence, remarques…" />
          </div>

          {error && <div className="mf-error">{error}</div>}

          <div className="modal-actions">
            <button className="btn-cancel" onClick={onClose}>Annuler</button>
            <button className="btn-save" onClick={save} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
