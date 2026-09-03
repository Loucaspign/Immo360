import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Societe, ComptaTemplate, ComptaType, ComptaFrequency } from '../types'

const TYPES: { value: ComptaType; label: string }[] = [
  { value: 'tva',       label: 'Déclaration TVA' },
  { value: 'versement', label: 'Versement anticipé' },
  { value: 'loyer',     label: 'Facturation loyers' },
  { value: 'bilan',     label: 'Bilan / comptes annuels' },
  { value: 'isoc',      label: 'Déclaration ISOC/IPP' },
  { value: 'autre',     label: 'Autre' },
]

const FREQS: { value: ComptaFrequency; label: string }[] = [
  { value: 'mensuel',      label: 'Mensuel' },
  { value: 'trimestriel',  label: 'Trimestriel' },
  { value: 'semestriel',   label: 'Semestriel' },
  { value: 'annuel',       label: 'Annuel' },
]

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

interface Props {
  societes:      Societe[]
  defaultSocId:  string
  editTemplate?: ComptaTemplate
  onClose:       () => void
  onSaved:       () => void
}

export function ComptaTemplateModal({ societes, defaultSocId, editTemplate, onClose, onSaved }: Props) {
  const [societeId, setSocieteId] = useState(editTemplate?.societe_id ?? defaultSocId)
  const [label,     setLabel]     = useState(editTemplate?.label     ?? '')
  const [type,      setType]      = useState<ComptaType>(editTemplate?.type ?? 'tva')
  const [frequency, setFrequency] = useState<ComptaFrequency>(editTemplate?.frequency ?? 'mensuel')
  const [dueDay,    setDueDay]    = useState(String(editTemplate?.due_day ?? 20))
  const [dueMonth,  setDueMonth]  = useState(String(editTemplate?.due_month ?? 6))
  const [notes,     setNotes]     = useState(editTemplate?.notes ?? '')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  useEffect(() => {
    if (!editTemplate) {
      setSocieteId(defaultSocId)
      setLabel('')
      setType('tva')
      setFrequency('mensuel')
      setDueDay('20')
      setDueMonth('6')
      setNotes('')
    }
  }, [defaultSocId, editTemplate])

  async function save() {
    if (!societeId || !label.trim()) { setError('Société et libellé requis.'); return }
    const day = parseInt(dueDay) || 20
    if (day < 1 || day > 31) { setError('Jour invalide (1–31).'); return }
    setSaving(true)
    setError('')
    const payload = {
      societe_id: societeId,
      label:      label.trim(),
      type,
      frequency,
      due_day:    day,
      due_month:  frequency === 'annuel' ? (parseInt(dueMonth) || 6) : null,
      notes:      notes.trim() || null,
    }
    const { error: err } = editTemplate
      ? await supabase.from('compta_templates').update(payload).eq('id', editTemplate.id)
      : await supabase.from('compta_templates').insert(payload)
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-card">
        <div className="modal-hdr">
          <span className="modal-title">{editTemplate ? 'Modifier l\'obligation' : 'Nouvelle obligation'}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-form">
          <div className="mf-row">
            <div className="mf-group">
              <label className="mf-label">Société <span className="mf-req">*</span></label>
              <select className="mf-select" value={societeId} onChange={e => setSocieteId(e.target.value)}>
                <option value="">— Choisir —</option>
                {societes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="mf-group">
              <label className="mf-label">Type</label>
              <select className="mf-select" value={type} onChange={e => setType(e.target.value as ComptaType)}>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div className="mf-group">
            <label className="mf-label">Libellé <span className="mf-req">*</span></label>
            <input className="mf-input" value={label} onChange={e => setLabel(e.target.value)} placeholder="ex. Déclaration TVA mensuelle" />
          </div>

          <div className="mf-row">
            <div className="mf-group">
              <label className="mf-label">Fréquence</label>
              <select className="mf-select" value={frequency} onChange={e => setFrequency(e.target.value as ComptaFrequency)}>
                {FREQS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div className="mf-group">
              <label className="mf-label">Échéance — jour du mois</label>
              <input className="mf-input" type="number" min={1} max={31} value={dueDay} onChange={e => setDueDay(e.target.value)} placeholder="20" />
            </div>
          </div>

          {frequency === 'annuel' && (
            <div className="mf-group">
              <label className="mf-label">Mois d'échéance</label>
              <select className="mf-select" value={dueMonth} onChange={e => setDueMonth(e.target.value)}>
                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>
          )}

          <div className="mf-group">
            <label className="mf-label">Notes <span className="mf-opt">(optionnel)</span></label>
            <textarea className="mf-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Précisions, références légales…" />
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
