import type { Tache } from '../types'
import { getDisplayStatus } from '../lib/utils'
import { TaskCard } from './TaskCard'

interface Props {
  taches:    Tache[]
  onRefresh: () => void
}

const GROUPS = [
  { key: 'overdue'  as const, cls: 'ov', label: 'En retard'          },
  { key: 'today'    as const, cls: 'td', label: "Aujourd'hui"        },
  { key: 'week'     as const, cls: 'wk', label: 'Cette semaine'      },
  { key: 'upcoming' as const, cls: 'fu', label: 'À venir'            },
  { key: 'done'     as const, cls: 'dn', label: 'Terminés'           },
]

export function TaskList({ taches, onRefresh }: Props) {
  if (taches.length === 0) {
    return (
      <div className="tscroll">
        <div className="empty-state">Aucune tâche dans cette vue.</div>
      </div>
    )
  }

  return (
    <div className="tscroll">
      {GROUPS.map(grp => {
        const tasks = taches.filter(t => getDisplayStatus(t.status, t.due_date) === grp.key)
        if (!tasks.length) return null
        return (
          <div key={grp.key} className={`grp ${grp.cls}`}>
            <div className="grp-hd">
              <div className="grp-stripe" />
              <div className="grp-lbl">{grp.label}</div>
              <div className="grp-cnt">{tasks.length}</div>
            </div>
            {tasks.map(t => (
              <TaskCard key={t.id} tache={t} onRefresh={onRefresh} />
            ))}
          </div>
        )
      })}
    </div>
  )
}
