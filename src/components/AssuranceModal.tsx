import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Bien, Assurance, AssuranceType, AssuranceFrequence, AssuranceStatut } from '../types'

const TYPES: { value: AssuranceType; label: string }[] = [
  { value: 'incendie',             label: 'Incendie & RC' },
  { value: 'protection_juridique', label: 'Protection juridique' },
  { value: 'omnium',               label: 'Omnium' },
  { value: 'loyers_impayes',       label: 'Loyers impayés' },
  { value: 'rc_proprietaire',      label: 'RC propriétaire' },
  { value: 'rc_locataire',         label: 'RC locataire' },
  { value: 'autre',                label: 'Autre' },
]

const FREQS: { value: AssuranceFrequence; label: string }[] = [
  { value: 'mensuel',     label: 'Mensuel' },
  { value: 'trimestriel', label: 'Trimestriel' },
  { value: 'annuel',      label: 'Annuel' },
]

const STATUTS: { value: AssuranceStatut; label: string }[] = [
  { value: 'actif',             label: 'Actif' },
  { value: 'en_renouvellement', label: 'En renouvellement' },
  { value: 'resilie',           label: 'Résilié' },
]

interface Props {
  biens:          Bien[]
  defaultBienId:  string
  editAssurance?: Assurance
  onClose:        () => void
  onSaved:        () => void
}

export function AssuranceModal({ biens, defaultBienId, editAssurance, onClose, onSaved }: Props) {
  const e = editAssurance
  const [bienId,    setBienId]    = useState(e?.bien_id              ?? defaultBienId)
  const [type,      setType]      = useState<AssuranceType>(e?.type  ?? 'incendie')
  const [statut,    setStatut]    = useState<AssuranceStatut>(e?.statut ?? 'actif')
  const [compagnie, setCompagnie] = useState(e?.compagnie            ?? '')
  const [police,    setPolice]    = useState(e?.numero_police        ?? '')
  const [courtier,  setCourtier]  = useState(e?.courtier             ?? '')
  const [contact,   setContact]   = useState(e?.contact_courtier     ?? '')
  const [prime,     setPrime]     = useState(e?.prime != null ? String(e.prime) : '')
  const [frequence, setFrequence] = useState<AssuranceFrequence>(e?.frequence_paiement ?? 'annuel')
  const [dateDebut, setDateDebut] = useState(e?.date_debut           ?? '')
  const [dateEch,   setDateEch]   = useState(e?.date_echeance        ?? '')
  const [datePay,   setDatePay]   = useState(e?.date_paiement        ?? '')
  const [preavis,   setPreavis]   = useState(e?.preavis_mois != null ? String(e.preavis_mois) : '3')
  const [franchise, setFranchise] = useState(e?.franchise != null ? String(e.franchise) : '')
  const [valeur,    setValeur]    = useState(e?.valeur_assuree != null ? String(e.valeur_assuree) : '')
  const [perteInd,  setPerteInd]  = useState(e?.perte_indirecte      ?? false)
  const [protJur,   setProtJur]   = useState(e?.protection_juridique ?? false)
  const [abandon,   setAbandon]   = useState(e?.abandon_recours      ?? false)
  const [chomage,   setChomage]   = useState(e?.chomage_immobilier   ?? false)
  const [notes,     setNotes]     = useState(e?.notes                ?? '')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  async function save() {
    if (!bienId) { setError('Bien requis.'); return }
    setSaving(true); setError('')
    const payload = {
      bien_id:              bienId,
      type, statut,
      compagnie:            compagnie.trim() || null,
      numero_police:        police.trim()    || null,
      courtier:             courtier.trim()  || null,
      contact_courtier:     contact.trim()   || null,
      prime:                prime     ? parseFloat(prime)     : null,
      frequence_paiement:   prime     ? frequence             : null,
      date_debut:           dateDebut || null,
      date_echeance:        dateEch   || null,
      date_paiement:        datePay   || null,
      preavis_mois:         preavis   ? parseInt(preavis)     : null,
      franchise:            franchise ? parseFloat(franchise) : null,
      valeur_assuree:       valeur    ? parseFloat(valeur)    : null,
      perte_indirecte:      perteInd,
      protection_juridique: protJur,
      abandon_recours:      abandon,
      chomage_immobilier:   chomage,
      notes:                notes.trim() || null,
    }
    const { error: err } = e
      ? await supabase.from('assurances').update(payload).eq('id', e.id)
      : await supabase.from('assurances').insert(payload)
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved(); onClose()
  }

  return (
    <div className="modal-overlay" onClick={ev => { if (ev.target === ev.currentTarget) onClose() }}>
      <div className="modal-card modal-card-lg">
        <div className="modal-hdr">
          <span className="modal-title">{e ? 'Modifier l\'assurance' : 'Nouvelle assurance'}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-form">

          <div className="mf-row">
            <div className="mf-group">
              <label className="mf-label">Bien <span className="mf-req">*</span></label>
              <select className="mf-select" value={bienId} onChange={ev => setBienId(ev.target.value)}>
                <option value="">— Choisir —</option>
                {biens.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="mf-group">
              <label className="mf-label">Type</label>
              <select className="mf-select" value={type} onChange={ev => setType(ev.target.value as AssuranceType)}>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="mf-group mf-group-sm">
              <label className="mf-label">Statut</label>
              <select className="mf-select" value={statut} onChange={ev => setStatut(ev.target.value as AssuranceStatut)}>
                {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div className="mf-row">
            <div className="mf-group">
              <label className="mf-label">Compagnie</label>
              <input className="mf-input" value={compagnie} onChange={ev => setCompagnie(ev.target.value)} placeholder="ex. AXA Belgium" />
            </div>
            <div className="mf-group">
              <label className="mf-label">N° de police</label>
              <input className="mf-input" value={police} onChange={ev => setPolice(ev.target.value)} placeholder="ex. B-123456" />
            </div>
          </div>

          <div className="mf-row">
            <div className="mf-group">
              <label className="mf-label">Courtier</label>
              <input className="mf-input" value={courtier} onChange={ev => setCourtier(ev.target.value)} placeholder="Nom du courtier" />
            </div>
            <div className="mf-group">
              <label className="mf-label">Contact courtier</label>
              <input className="mf-input" value={contact} onChange={ev => setContact(ev.target.value)} placeholder="Email ou téléphone" />
            </div>
          </div>

          <div className="mf-row">
            <div className="mf-group">
              <label className="mf-label">Prime (€)</label>
              <input className="mf-input" type="number" min={0} step="0.01" value={prime} onChange={ev => setPrime(ev.target.value)} placeholder="ex. 1200" />
            </div>
            <div className="mf-group">
              <label className="mf-label">Fréquence de paiement</label>
              <select className="mf-select" value={frequence} onChange={ev => setFrequence(ev.target.value as AssuranceFrequence)}>
                {FREQS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div className="mf-group mf-group-sm">
              <label className="mf-label">Préavis (mois)</label>
              <input className="mf-input" type="number" min={0} max={12} value={preavis} onChange={ev => setPreavis(ev.target.value)} placeholder="3" />
            </div>
          </div>

          <div className="mf-row">
            <div className="mf-group">
              <label className="mf-label">Date de début</label>
              <input className="mf-input" type="date" value={dateDebut} onChange={ev => setDateDebut(ev.target.value)} />
            </div>
            <div className="mf-group">
              <label className="mf-label">Date d'échéance</label>
              <input className="mf-input" type="date" value={dateEch} onChange={ev => setDateEch(ev.target.value)} />
            </div>
            <div className="mf-group">
              <label className="mf-label">Date de paiement</label>
              <input className="mf-input" type="date" value={datePay} onChange={ev => setDatePay(ev.target.value)} />
            </div>
          </div>

          <div className="mf-row">
            <div className="mf-group">
              <label className="mf-label">Franchise (€)</label>
              <input className="mf-input" type="number" min={0} step="0.01" value={franchise} onChange={ev => setFranchise(ev.target.value)} placeholder="ex. 500" />
            </div>
            <div className="mf-group">
              <label className="mf-label">Valeur assurée (€)</label>
              <input className="mf-input" type="number" min={0} step="0.01" value={valeur} onChange={ev => setValeur(ev.target.value)} placeholder="ex. 250000" />
            </div>
          </div>

          <div className="mf-group">
            <label className="mf-label">Options de couverture</label>
            <div className="mf-checks">
              {([
                [perteInd, setPerteInd, 'Perte indirecte 10%'],
                [protJur,  setProtJur,  'Protection juridique'],
                [abandon,  setAbandon,  'Abandon de recours'],
                [chomage,  setChomage,  'Chômage immobilier'],
              ] as [boolean, (v: boolean) => void, string][]).map(([val, set, lbl]) => (
                <label key={lbl} className="mf-check">
                  <input type="checkbox" checked={val} onChange={ev => set(ev.target.checked)} />
                  <span>{lbl}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mf-group">
            <label className="mf-label">Notes <span className="mf-opt">(optionnel)</span></label>
            <textarea className="mf-textarea" value={notes} onChange={ev => setNotes(ev.target.value)} placeholder="Précisions, exclusions, contacts…" />
          </div>

          {error && <div className="mf-error">{error}</div>}

          <div className="modal-actions">
            <button className="btn-cancel" onClick={onClose}>Annuler</button>
            <button className="btn-save" onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
