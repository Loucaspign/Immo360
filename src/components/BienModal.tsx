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

  const [socId,        setSocId]        = useState('')
  const [batimentName, setBatimentName] = useState('')
  const [name,         setName]         = useState('')
  const [lots,         setLots]         = useState('1')
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [dropOpen,     setDropOpen]     = useState(false)

  const nameRef  = useRef<HTMLInputElement>(null)
  const comboRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) { setDropOpen(false); return }
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
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (dropOpen) setDropOpen(false); else onClose() } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose, dropOpen])

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropOpen) return
    function handle(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) setDropOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [dropOpen])

  const socBatiments = batiments.filter(b => b.societe_id === socId)
  const filtered = socBatiments.filter(b =>
    !batimentName.trim() || b.name.toLowerCase().includes(batimentName.trim().toLowerCase())
  )
  const exactMatch = socBatiments.some(b => b.name.toLowerCase() === batimentName.trim().toLowerCase())
  const willCreate = batimentName.trim() && !exactMatch

  function handleSocChange(id: string) {
    setSocId(id)
    setBatimentName('')
  }

  function pickBatiment(batName: string) {
    setBatimentName(batName)
    setDropOpen(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !socId) return
    setSaving(true); setError(null)

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
              <div className="mf-combo" ref={comboRef}>
                <input
                  className={`mf-input${dropOpen ? ' mf-combo-open' : ''}`}
                  value={batimentName}
                  onChange={e => { setBatimentName(e.target.value); setDropOpen(true) }}
                  onFocus={() => setDropOpen(true)}
                  placeholder={socBatiments.length > 0 ? 'Choisir ou saisir un nom…' : 'Nom du bâtiment (facultatif)'}
                  autoComplete="off"
                />
                {willCreate && (
                  <span className="mf-combo-hint">Nouveau bâtiment « {batimentName.trim()} » sera créé</span>
                )}
                {dropOpen && filtered.length > 0 && (
                  <div className="mf-combo-list">
                    {filtered.map(b => (
                      <button
                        key={b.id}
                        type="button"
                        className={`mf-combo-item${b.name.toLowerCase() === batimentName.trim().toLowerCase() ? ' sel' : ''}`}
                        onMouseDown={() => pickBatiment(b.name)}
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
