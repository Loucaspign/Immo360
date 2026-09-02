import { useState } from 'react'
import type { Tache } from '../types'
import { getDisplayStatus, formatDue, formatAmount } from '../lib/utils'
import { supabase } from '../lib/supabase'

const CATS: Record<string, string> = {
  loyer: 'Loyer', fiscal: 'Fiscal', tech: 'Technique', admin: 'Administratif',
}

const DUE_CLS: Record<string, string> = { overdue: 'ov', today: 'td' }

interface Props {
  tache:     Tache
  onRefresh: () => void
}

export function TaskCard({ tache: t, onRefresh }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [marking, setMarking]   = useState(false)

  const ds      = getDisplayStatus(t.status, t.due_date)
  const isDone  = t.status === 'done'
  const profile = t.societe?.owner

  async function markDone(e: React.MouseEvent) {
    e.stopPropagation()
    if (marking || isDone) return
    setMarking(true)
    await supabase.from('taches').update({ status: 'done' }).eq('id', t.id)
    onRefresh()
    setMarking(false)
  }

  function toggleExpand() {
    if (t.notes) setExpanded(x => !x)
  }

  return (
    <div className={`tc${expanded ? ' expanded' : ''}`} onClick={toggleExpand}>
      <div className={`tchk${isDone ? ' done' : ''}`} onClick={markDone}>
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

        {expanded && t.notes && (
          <div className="tc-detail">
            <div className="tc-note">{t.notes}</div>
            <div className="tc-acts">
              {!isDone && (
                <button className="ta-btn p" onClick={markDone} disabled={marking}>
                  {marking ? '…' : '✓ Marquer fait'}
                </button>
              )}
              <button className="ta-btn" onClick={e => e.stopPropagation()}>⏱ Reporter</button>
              <button className="ta-btn" onClick={e => e.stopPropagation()}>✎ Modifier</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
