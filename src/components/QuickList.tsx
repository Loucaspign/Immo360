import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

interface Item {
  id:           string
  text:         string
  position:     number
  checked_date: string | null
}

export function QuickList({ userId }: { userId: string }) {
  const [items,  setItems]  = useState<Item[]>([])
  const [adding, setAdding] = useState(false)
  const [draft,  setDraft]  = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    supabase
      .from('quicklist')
      .select('id, text, position, checked_date')
      .eq('user_id', userId)
      .order('position')
      .then(({ data }) => { if (data) setItems(data) })
  }, [userId])

  useEffect(() => {
    if (adding) setTimeout(() => inputRef.current?.focus(), 40)
  }, [adding])

  async function toggle(item: Item) {
    const next = item.checked_date === today ? null : today
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked_date: next } : i))
    await supabase.from('quicklist').update({ checked_date: next }).eq('id', item.id)
  }

  async function commit() {
    const text = draft.trim()
    setAdding(false)
    setDraft('')
    if (!text) return
    const position = items.length
    const { data } = await supabase
      .from('quicklist')
      .insert({ user_id: userId, text, position })
      .select('id, text, position, checked_date')
      .single()
    if (data) setItems(prev => [...prev, data])
  }

  async function remove(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    setItems(prev => prev.filter(i => i.id !== id))
    await supabase.from('quicklist').delete().eq('id', id)
  }

  return (
    <div className="ql-strip">
      {items.map(item => {
        const done = item.checked_date === today
        return (
          <div key={item.id} className={`ql-chip${done ? ' done' : ''}`} onClick={() => toggle(item)}>
            <span className="ql-text">{item.text}</span>
            <button className="ql-del" onClick={e => remove(e, item.id)} title="Supprimer">×</button>
          </div>
        )
      })}

      {adding ? (
        <div className="ql-chip ql-new">
          <input
            ref={inputRef}
            className="ql-input"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') { setAdding(false); setDraft('') }
            }}
            onBlur={commit}
            placeholder="Nouveau rappel…"
            maxLength={60}
          />
        </div>
      ) : (
        <button className="ql-add" onClick={() => setAdding(true)} title="Ajouter un rappel">+</button>
      )}
    </div>
  )
}
