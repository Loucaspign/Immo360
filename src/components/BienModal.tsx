import { useState, useEffect, useRef } from 'react'
import type { Bien, Societe } from '../types'
import { supabase } from '../lib/supabase'

interface Props {
  open:        boolean
  onClose:     () => void
  onSaved:     () => void
  societes:    Societe[]
  defaultSoc?: string
  editBien?:   Bien
}

export function BienModal({ open, onClose, onSaved, societes, defaultSoc = '', editBien }: Props) {
  const isEdit = !!editBien

  const [socId,  setSocId]  = useState('')
  const [name,   setName]   = useState('')
  const [lots,   setLots]   = useState('1')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    if (isEdit && editBien) {
      setSocId(editBien.societe_id)
      setName(editBien.name)
      setLots(String(editBien.lots_count))
    } else {
      setSocId(defaultSoc); setName(''); setLots('1')
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
    if (!name.trim() || !socId) return
    setSaving(true); setError(null)

    const payload = {
      societe_id: socId,
      name:       name.trim(),
      lots_count: parseInt(lots) || 1,
    }

    const { error } = isEdit
      ? await supabase.from('biens').update(payload).eq('id', editBien!.id)
      : await supabase.from('biens').insert(payload)

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
          <span className="modal-title">{isEdit ? 'Modifier le bien' : 'Nouveau bien'}</span>
          <button className="modal-close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="mf-group">
            <label className="mf-label">Société <span className="mf-req">*</span></label>
            <select className="mf-select" value={socId} onChange={e => setSocId(e.target.value)} required>
              <option value="">— Choisir —</option>
              {societes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="mf-row">
            <div className="mf-group" style={{ flex: 2 }}>
              <label className="mf-label">Nom du bien <span className="mf-req">*</span></label>
              <input
                ref={nameRef}
                className="mf-input"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex : Rue de la Loi 42"
                required
              />
            </div>
            <div className="mf-group" style={{ flex: 1 }}>
              <label className="mf-label">Lots</label>
              <input
                className="mf-input"
                type="number"
                value={lots}
                onChange={e => setLots(e.target.value)}
                min="1"
                step="1"
              />
            </div>
          </div>

          {error && <div className="mf-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn-save" disabled={saving || !name.trim() || !socId}>
              {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
