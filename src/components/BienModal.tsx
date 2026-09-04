import { useState, useEffect, useRef } from 'react'
import type { Bien, Societe, Batiment } from '../types'
import { supabase } from '../lib/supabase'

interface Props {
  open:        boolean
  onClose:     () => void
  onSaved:     () => void
  societes:    Societe[]
  batiments:   Batiment[]
  defaultSoc?: string
  editBien?:   Bien
}

export function BienModal({ open, onClose, onSaved, societes, batiments, defaultSoc = '', editBien }: Props) {
  const isEdit = !!editBien

  const [socId,       setSocId]       = useState('')
  const [batimentName, setBatimentName] = useState('')
  const [name,        setName]        = useState('')
  const [lots,        setLots]        = useState('1')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    if (isEdit && editBien) {
      setSocId(editBien.societe_id)
      const bat = batiments.find(b => b.id === editBien.batiment_id)
      setBatimentName(bat?.name ?? '')
      setName(editBien.name)
      setLots(String(editBien.lots_count))
    } else {
      setSocId(defaultSoc); setBatimentName(''); setName(''); setLots('1')
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

  const socBatiments = batiments.filter(b => b.societe_id === socId)

  function handleSocChange(id: string) {
    setSocId(id)
    setBatimentName('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !socId) return
    setSaving(true); setError(null)

    // Resolve batiment: find existing by name or create a new one
    let batimentId: string | null = null
    const trimmed = batimentName.trim()
    if (trimmed) {
      const existing = socBatiments.find(b => b.name.toLowerCase() === trimmed.toLowerCase())
      if (existing) {
        batimentId = existing.id
      } else {
        const { data: newBat, error: batErr } = await supabase
          .from('batiments')
          .insert({ societe_id: socId, name: trimmed })
          .select()
          .single()
        if (batErr) { setError(batErr.message); setSaving(false); return }
        batimentId = newBat.id
      }
    }

    const payload = {
      societe_id:  socId,
      batiment_id: batimentId,
      name:        name.trim(),
      lots_count:  parseInt(lots) || 1,
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
            <select className="mf-select" value={socId} onChange={e => handleSocChange(e.target.value)} required>
              <option value="">— Choisir —</option>
              {societes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {socId && (
            <div className="mf-group">
              <label className="mf-label">Bâtiment <span className="mf-opt">(optionnel)</span></label>
              <datalist id="bm-batiments">
                {socBatiments.map(b => <option key={b.id} value={b.name} />)}
              </datalist>
              <input
                className="mf-input"
                list="bm-batiments"
                value={batimentName}
                onChange={e => setBatimentName(e.target.value)}
                placeholder={socBatiments.length > 0 ? 'Choisir ou créer un bâtiment…' : 'Nom du bâtiment (facultatif)'}
              />
            </div>
          )}

          <div className="mf-row">
            <div className="mf-group" style={{ flex: 2 }}>
              <label className="mf-label">Nom du bien <span className="mf-req">*</span></label>
              <input
                ref={nameRef}
                className="mf-input"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex : Kot 1er étage"
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
