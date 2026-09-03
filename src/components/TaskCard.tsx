import { useState, useEffect } from 'react'
import type { Tache } from '../types'
import { getDisplayStatus, formatDue, formatAmount } from '../lib/utils'
import { supabase } from '../lib/supabase'

const CATS: Record<string, string> = {
  loyer: 'Loyer', fiscal: 'Fiscal', tech: 'Technique', admin: 'Administratif',
}

const DUE_CLS: Record<string, string> = { overdue: 'ov', today: 'td' }

interface Props {
  tache:    Tache
  onRefresh: () => void
  onEdit:   (t: Tache) => void
}

export function TaskCard({ tache: t, onRefresh, onEdit }: Props) {
  const [localDone, setLocalDone] = useState(t.status === 'done')
  useEffect(() => { setLocalDone(t.status === 'done') }, [t.status])

  const ds      = getDisplayStatus(localDone ? 'done' : 'todo', t.due_date)
  const profile = t.societe?.owner

  async function toggleDone(e: React.MouseEvent) {
    e.stopPropagation()
    const next = !localDone
    setLocalDone(next)
    await supabase.from('taches').update({ status: next ? 'done' : 'todo' }).eq('id', t.id)
    onRefresh()
  }

  return (
    <div className={`tc tc-${ds}`}>
      <div className={`tchk${localDone ? ' done' : ''}`} onClick={toggleDone}>
        <svg className="chk-svg" viewBox="0 0 10 8" aria-hidden="true">
          <polyline points="1,4 3.5,7 9,1" />
        </svg>
      </div>

      <div className="tc-body">
        <div className="tc-crumb">
          <span className="tc-soc" style={{ color: profile?.color_css }}>
            {t.societe?.name}
          </span>
          {t.bien && (
            <>
              <span className="tc-sep">›</span>
              <span className="tc-bien">{t.bien.name}</span>
            </>
          )}
          {profile && (
            <span className="tc-uid" style={{ background: profile.color_css }}>
              {profile.initials}
            </span>
          )}
        </div>

        <div className="tc-title">{t.title}</div>

        <div className="tc-meta">
          <span className={`cat ${t.category}`}>{CATS[t.category]}</span>
          {t.amount && <span className="amt">{formatAmount(t.amount)}</span>}
          {t.recurrence && <span className="recur">↻ {t.recurrence}</span>}
          <span className={`due${DUE_CLS[ds] ? ` ${DUE_CLS[ds]}` : ''}`}>
            {formatDue(t.due_date, ds)}
          </span>
        </div>

        {t.notes && <div className="tc-note">{t.notes}</div>}
        <div className="tc-acts">
          <button className="ta-btn p" onClick={toggleDone}>
            {localDone ? '↩ Rouvrir' : '✓ Marquer fait'}
          </button>
          <button className="ta-btn" onClick={e => { e.stopPropagation(); onEdit(t) }}>✎ Modifier</button>
        </div>
      </div>
    </div>
  )
}
