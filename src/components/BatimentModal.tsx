import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Batiment } from '../types'

interface Props {
  societeId:     string
  editBatiment?: Batiment
  onClose:       () => void
  onSaved:       () => void
}

export function BatimentModal({ societeId, editBatiment, onClose, onSaved }: Props) {
  const [name,   setName]   = useState(editBatiment?.name ?? '')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 60)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function save(ev: React.FormEvent) {
    ev.preventDefault()
    if (!name.trim()) return
    setSaving(true); setError('')
    const payload = { societe_id: societeId, name: name.trim() }
    const { error: err } = editBatiment
      ? await supabase.from('batiments').update({ name: name.trim() }).eq('id', editBatiment.id)
      : await supabase.from('batiments').insert(payload)
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved(); onClose()
  }

  return (
    <div className="modal-overlay" onClick={ev => { if (ev.target === ev.currentTarget) onClose() }}>
      <div className="modal-card modal-card--sm">
        <div className="modal-hdr">
          <span className="modal-title">{editBatiment ? 'Renommer le bâtiment' : 'Nouveau bâtiment'}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form className="modal-form" onSubmit={save}>
          <div className="mf-group">
            <label className="mf-label">Nom du bâtiment <span className="mf-req">*</span></label>
            <input
              ref={inputRef}
              className="mf-input"
              type="text"
              value={name}
              onChange={ev => setName(ev.target.value)}
              placeholder="Ex : Rue de Trèves 4"
              required
            />
          </div>
          {error && <div className="mf-error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn-save" disabled={saving || !name.trim()}>
              {saving ? 'Enregistrement…' : editBatiment ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
