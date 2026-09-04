import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Bien, Locataire } from '../types'

interface Props {
  biens:           Bien[]
  defaultBienId:   string
  editLocataire?:  Locataire
  onClose:         () => void
  onSaved:         () => void
}

export function LocataireModal({ biens, defaultBienId, editLocataire, onClose, onSaved }: Props) {
  const e = editLocataire
  const [bienId,    setBienId]    = useState(e?.bien_id           ?? defaultBienId)
  const [nom,       setNom]       = useState(e?.nom               ?? '')
  const [dateDebut, setDateDebut] = useState(e?.date_debut        ?? '')
  const [dateFin,   setDateFin]   = useState(e?.date_fin          ?? '')
  const [bailSigne, setBailSigne] = useState(e?.bail_signe        ?? false)
  const [bailEnr,   setBailEnr]   = useState(e?.bail_enregistre   ?? false)
  const [loyerBase, setLoyerBase] = useState(e?.loyer_base        != null ? String(e.loyer_base)       : '')
  const [loyerIdx,  setLoyerIdx]  = useState(e?.loyer_indexe      != null ? String(e.loyer_indexe)     : '')
  const [chgComm,   setChgComm]   = useState(e?.charges_communes  != null ? String(e.charges_communes) : '')
  const [chgPriv,   setChgPriv]   = useState(e?.charges_privees   != null ? String(e.charges_privees)  : '')
  const [loyerTvac, setLoyerTvac] = useState(e?.loyer_total_tvac  != null ? String(e.loyer_total_tvac) : '')
  const [notes,     setNotes]     = useState(e?.notes             ?? '')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  async function save() {
    if (!bienId)      { setError('Bien requis.');       return }
    if (!nom.trim())  { setError('Nom requis.');        return }
    setSaving(true); setError('')
    const payload = {
      bien_id:          bienId,
      nom:              nom.trim(),
      loyer_base:       loyerBase  ? parseFloat(loyerBase)  : null,
      loyer_indexe:     loyerIdx   ? parseFloat(loyerIdx)   : null,
      charges_communes: chgComm    ? parseFloat(chgComm)    : null,
      charges_privees:  chgPriv    ? parseFloat(chgPriv)    : null,
      loyer_total_tvac: loyerTvac  ? parseFloat(loyerTvac)  : null,
      bail_signe:       bailSigne,
      bail_enregistre:  bailEnr,
      date_debut:       dateDebut || null,
      date_fin:         dateFin   || null,
      notes:            notes.trim() || null,
    }
    const { error: err } = e
      ? await supabase.from('locataires').update(payload).eq('id', e.id)
      : await supabase.from('locataires').insert(payload)
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved(); onClose()
  }

  return (
    <div className="modal-overlay" onClick={ev => { if (ev.target === ev.currentTarget) onClose() }}>
      <div className="modal-card modal-card-lg">
        <div className="modal-hdr">
          <span className="modal-title">{e ? 'Modifier le locataire' : 'Nouveau locataire'}</span>
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
            <div className="mf-group">
              <label className="mf-label">Nom / société <span className="mf-req">*</span></label>
              <input className="mf-input" value={nom} onChange={ev => setNom(ev.target.value)}
                placeholder="ex. Jean Dupont ou Dupont SRL" autoFocus />
            </div>
          </div>

          <div className="mf-row">
            <div className="mf-group">
              <label className="mf-label">Date de début</label>
              <input className="mf-input" type="date" value={dateDebut} onChange={ev => setDateDebut(ev.target.value)} />
            </div>
            <div className="mf-group">
              <label className="mf-label">Date de fin <span className="mf-opt">(optionnel)</span></label>
              <input className="mf-input" type="date" value={dateFin} onChange={ev => setDateFin(ev.target.value)} />
            </div>
          </div>

          <div className="mf-group">
            <label className="mf-label">Statut du bail</label>
            <div className="mf-checks">
              {([
                [bailSigne, setBailSigne, 'Bail signé'],
                [bailEnr,   setBailEnr,   'Bail enregistré'],
              ] as [boolean, (v: boolean) => void, string][]).map(([val, set, lbl]) => (
                <label key={lbl} className="mf-check">
                  <input type="checkbox" checked={val} onChange={ev => set(ev.target.checked)} />
                  <span>{lbl}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mf-row">
            <div className="mf-group">
              <label className="mf-label">Loyer de base HTVA (€)</label>
              <input className="mf-input" type="number" min={0} step="0.01"
                value={loyerBase} onChange={ev => setLoyerBase(ev.target.value)} placeholder="ex. 800" />
            </div>
            <div className="mf-group">
              <label className="mf-label">Loyer indexé HTVA (€)</label>
              <input className="mf-input" type="number" min={0} step="0.01"
                value={loyerIdx} onChange={ev => setLoyerIdx(ev.target.value)} placeholder="ex. 850" />
            </div>
          </div>

          <div className="mf-row">
            <div className="mf-group">
              <label className="mf-label">Charges communes (€)</label>
              <input className="mf-input" type="number" min={0} step="0.01"
                value={chgComm} onChange={ev => setChgComm(ev.target.value)} placeholder="ex. 100" />
            </div>
            <div className="mf-group">
              <label className="mf-label">Charges privées (€)</label>
              <input className="mf-input" type="number" min={0} step="0.01"
                value={chgPriv} onChange={ev => setChgPriv(ev.target.value)} placeholder="ex. 50" />
            </div>
            <div className="mf-group">
              <label className="mf-label">Total TVAC (€)</label>
              <input className="mf-input" type="number" min={0} step="0.01"
                value={loyerTvac} onChange={ev => setLoyerTvac(ev.target.value)} placeholder="ex. 1 100" />
            </div>
          </div>

          <div className="mf-group">
            <label className="mf-label">Notes <span className="mf-opt">(optionnel)</span></label>
            <textarea className="mf-textarea" value={notes} onChange={ev => setNotes(ev.target.value)}
              placeholder="Indexation, contacts, conditions particulières…" />
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
