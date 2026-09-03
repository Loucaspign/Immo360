import { useState, useEffect, useRef } from 'react'
import type { Societe, Bien, Category } from '../types'
import { supabase } from '../lib/supabase'

interface Props {
  open:         boolean
  onClose:      () => void
  onCreated:    () => void
  societes:     Societe[]
  biens:        Bien[]
  userId:       string
  defaultSoc?:  string
  defaultBien?: string
}

const CATS: { key: Category; label: string }[] = [
  { key: 'loyer',  label: 'Loyer' },
  { key: 'fiscal', label: 'Fiscal' },
  { key: 'tech',   label: 'Technique' },
  { key: 'admin',  label: 'Administratif' },
]

export function NewTaskModal({
  open, onClose, onCreated, societes, biens, userId,
  defaultSoc = '', defaultBien = '',
}: Props) {
  const [socId,    setSocId]    = useState(defaultSoc)
  const [bienId,   setBienId]   = useState(defaultBien)
  const [title,    setTitle]    = useState('')
  const [category, setCategory] = useState<Category>('admin')
  const [dueDate,  setDueDate]  = useState('')
  const [amount,   setAmount]   = useState('')
  const [notes,    setNotes]    = useState('')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setSocId(defaultSoc)
    setBienId(defaultBien)
    setTitle(''); setCategory('admin'); setDueDate(''); setAmount(''); setNotes(''); setError(null)
    setTimeout(() => titleRef.current?.focus(), 60)
  }, [open, defaultSoc, defaultBien])

  useEffect(() => { setBienId('') }, [socId])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const filteredBiens = biens.filter(b => b.societe_id === socId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!socId || !title.trim()) return
    setSaving(true); setError(null)
    const { error } = await supabase.from('taches').insert({
      societe_id: socId,
      bien_id:    bienId || null,
      title:      title.trim(),
      category,
      due_date:   dueDate || null,
      amount:     amount ? parseFloat(amount) : null,
      notes:      notes.trim() || null,
      created_by: userId,
    })
    setSaving(false)
    if (error) { setError(error.message); return }
    onCreated()
    onClose()
  }

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-hdr">
          <span className="modal-title">Nouvelle tâche</span>
          <button className="modal-close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="mf-row">
            <div className="mf-group">
              <label className="mf-label">Société <span className="mf-req">*</span></label>
              <select className="mf-select" value={socId} onChange={e => setSocId(e.target.value)} required>
                <option value="">— Choisir —</option>
                {societes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="mf-group">
              <label className="mf-label">Bien <span className="mf-opt">optionnel</span></label>
              <select
                className="mf-select"
                value={bienId}
                onChange={e => setBienId(e.target.value)}
                disabled={!socId || filteredBiens.length === 0}
              >
                <option value="">— Aucun —</option>
                {filteredBiens.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          <div className="mf-group">
            <label className="mf-label">Titre <span className="mf-req">*</span></label>
            <input
              ref={titleRef}
              className="mf-input"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex : Paiement loyer janvier"
              required
            />
          </div>

          <div className="mf-group">
            <label className="mf-label">Catégorie</label>
            <div className="mf-cats">
              {CATS.map(c => (
                <label key={c.key} className={`mf-cat ${c.key}${category === c.key ? ' sel' : ''}`}>
                  <input type="radio" name="category" value={c.key} checked={category === c.key} onChange={() => setCategory(c.key)} />
                  {c.label}
                </label>
              ))}
            </div>
          </div>

          <div className="mf-row">
            <div className="mf-group">
              <label className="mf-label">Échéance <span className="mf-opt">optionnel</span></label>
              <input className="mf-input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div className="mf-group">
              <label className="mf-label">Montant € <span className="mf-opt">optionnel</span></label>
              <input className="mf-input" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" min="0" step="0.01" />
            </div>
          </div>

          <div className="mf-group">
            <label className="mf-label">Notes <span className="mf-opt">optionnel</span></label>
            <textarea className="mf-textarea" value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Informations supplémentaires…" />
          </div>

          {error && <div className="mf-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn-save" disabled={saving || !socId || !title.trim()}>
              {saving ? 'Enregistrement…' : 'Créer la tâche'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
