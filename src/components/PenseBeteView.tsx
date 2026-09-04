import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { PenseBete, Societe, Bien } from '../types'

const COLORS = ['yellow', 'pink', 'mint', 'sky', 'lavender'] as const
type NoteColor = typeof COLORS[number]

interface Props {
  societes:   Societe[]
  biens:      Bien[]
  refreshKey: number
}

export function PenseBeteView({ societes, biens, refreshKey }: Props) {
  const [notes,      setNotes]      = useState<PenseBete[]>([])
  const [isAdding,   setIsAdding]   = useState(false)
  const [draftText,  setDraftText]  = useState('')
  const [draftColor, setDraftColor] = useState<NoteColor>('yellow')
  const [draftSoc,   setDraftSoc]   = useState('')
  const [draftBien,  setDraftBien]  = useState('')
  const [saving,     setSaving]     = useState(false)
  const textRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { loadNotes() }, [refreshKey])

  async function loadNotes() {
    const { data } = await supabase
      .from('pense_betes')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })
    if (data) setNotes(data as PenseBete[])
  }

  function startAdding() {
    setIsAdding(true)
    setDraftText('')
    setDraftColor('yellow')
    setDraftSoc('')
    setDraftBien('')
    setTimeout(() => textRef.current?.focus(), 50)
  }

  function cancelAdding() {
    setIsAdding(false)
    setDraftText('')
  }

  async function saveNote() {
    if (!draftText.trim() || saving) return
    setSaving(true)
    const payload: Record<string, unknown> = {
      content: draftText.trim(),
      color:   draftColor,
      active:  true,
    }
    if (draftSoc)  payload.societe_id = draftSoc
    if (draftBien) payload.bien_id    = draftBien
    const { error } = await supabase.from('pense_betes').insert(payload)
    setSaving(false)
    if (!error) {
      setIsAdding(false)
      setDraftText('')
      loadNotes()
    }
  }

  async function deleteNote(id: string) {
    await supabase.from('pense_betes').update({ active: false }).eq('id', id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { cancelAdding(); return }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { saveNote() }
  }

  const filteredBiens = biens.filter(b => !draftSoc || b.societe_id === draftSoc)

  return (
    <div className="pb-scroll">
      <div className="pb-grid">

        {isAdding ? (
          <div className={`pb-card pb-card-editing pb-${draftColor}`}>
            <div className="pb-color-row">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`pb-color-dot pb-dot-${c}${draftColor === c ? ' sel' : ''}`}
                  onClick={() => setDraftColor(c)}
                />
              ))}
            </div>
            <textarea
              ref={textRef}
              className="pb-textarea"
              value={draftText}
              onChange={e => setDraftText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Quoi ne pas oublier…"
              rows={4}
            />
            <div className="pb-link-row">
              <select
                className="pb-mini-select"
                value={draftSoc}
                onChange={e => { setDraftSoc(e.target.value); setDraftBien('') }}
              >
                <option value="">Société (optionnel)</option>
                {societes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {draftSoc && filteredBiens.length > 0 && (
                <select
                  className="pb-mini-select"
                  value={draftBien}
                  onChange={e => setDraftBien(e.target.value)}
                >
                  <option value="">Bien (optionnel)</option>
                  {filteredBiens.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              )}
            </div>
            <div className="pb-card-acts">
              <button className="pb-cancel-btn" type="button" onClick={cancelAdding}>Annuler</button>
              <button
                className="pb-save-btn"
                type="button"
                onClick={saveNote}
                disabled={!draftText.trim() || saving}
              >
                {saving ? '…' : 'Ajouter'}
              </button>
            </div>
          </div>
        ) : (
          <button className="pb-add-card" onClick={startAdding}>
            <span className="pb-add-plus">+</span>
            <span className="pb-add-label">Nouvelle note</span>
          </button>
        )}

        {notes.map(note => {
          const soc  = note.societe_id ? societes.find(s => s.id === note.societe_id) : null
          const bien = note.bien_id    ? biens.find(b => b.id === note.bien_id)       : null
          return (
            <div key={note.id} className={`pb-card pb-${note.color}`}>
              <button
                className="pb-del-btn"
                onClick={() => deleteNote(note.id)}
                title="Supprimer"
              >✕</button>
              <p className="pb-content">{note.content}</p>
              {(soc || bien) && (
                <div className="pb-tags">
                  {soc  && <span className="pb-tag">{soc.name}</span>}
                  {bien && <span className="pb-tag">{bien.name}</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {notes.length === 0 && !isAdding && (
        <p className="pb-empty">Aucune note — cliquez sur le carré en pointillés pour en ajouter une</p>
      )}
    </div>
  )
}
