import { useState, useEffect, useRef } from 'react'
import type { Societe, Profile } from '../types'
import { supabase } from '../lib/supabase'

interface Props {
  open:          boolean
  onClose:       () => void
  onSaved:       () => void
  profiles:      Profile[]
  defaultOwner?: string
  editSociete?:  Societe
}

const LEGAL_FORMS = ['SRL', 'SA', 'ASBL', 'SNC', 'SC', 'Indépendant']

export function SocieteModal({ open, onClose, onSaved, profiles, defaultOwner = '', editSociete }: Props) {
  const isEdit = !!editSociete

  const [name,      setName]      = useState('')
  const [legalForm, setLegalForm] = useState('')
  const [ownerId,   setOwnerId]   = useState('')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    if (isEdit && editSociete) {
      setName(editSociete.name)
      setLegalForm(editSociete.legal_form ?? '')
      setOwnerId(editSociete.owner_id)
    } else {
      setName(''); setLegalForm(''); setOwnerId(defaultOwner)
    }
    setError(null)
    setTimeout(() => nameRef.current?.focus(), 60)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !ownerId) return
    setSaving(true); setError(null)

    const payload = {
      name:       name.trim(),
      legal_form: legalForm || null,
      owner_id:   ownerId,
    }

    const { error } = isEdit
      ? await supabase.from('societes').update(payload).eq('id', editSociete!.id)
      : await supabase.from('societes').insert(payload)

    setSaving(false)
    if (error) { setError(error.message); return }
    onSaved()
    onClose()
  }

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-hdr">
          <span className="modal-title">{isEdit ? 'Modifier la société' : 'Nouvelle société'}</span>
          <button className="modal-close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="mf-group">
            <label className="mf-label">Nom <span className="mf-req">*</span></label>
            <input
              ref={nameRef}
              className="mf-input"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex : Immobilière du Centre"
              required
            />
          </div>

          <div className="mf-row">
            <div className="mf-group">
              <label className="mf-label">Forme juridique <span className="mf-opt">optionnel</span></label>
              <select className="mf-select" value={legalForm} onChange={e => setLegalForm(e.target.value)}>
                <option value="">— Aucune —</option>
                {LEGAL_FORMS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="mf-group">
              <label className="mf-label">Propriétaire <span className="mf-req">*</span></label>
              <select className="mf-select" value={ownerId} onChange={e => setOwnerId(e.target.value)} required>
                <option value="">— Choisir —</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          {error && <div className="mf-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn-save" disabled={saving || !name.trim() || !ownerId}>
              {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
