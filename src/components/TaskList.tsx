import type { Tache, DisplayStatus } from '../types'
import { getDisplayStatus } from '../lib/utils'
import { TaskCard } from './TaskCard'

interface Props {
  taches:      Tache[]
  activeOwner: string
  onRefresh:   () => void
  onEdit:      (t: Tache) => void
}

const DS_ORDER: DisplayStatus[] = ['overdue', 'today', 'week', 'upcoming', 'done']

function sortTasks(tasks: Tache[]): Tache[] {
  return [...tasks].sort((a, b) => {
    const ia = DS_ORDER.indexOf(getDisplayStatus(a.status, a.due_date))
    const ib = DS_ORDER.indexOf(getDisplayStatus(b.status, b.due_date))
    if (ia !== ib) return ia - ib
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
    return 0
  })
}

function StatusPills({ tasks }: { tasks: Tache[] }) {
  const ov = tasks.filter(t => getDisplayStatus(t.status, t.due_date) === 'overdue').length
  const td = tasks.filter(t => getDisplayStatus(t.status, t.due_date) === 'today').length
  if (!ov && !td) return null
  return (
    <span className="soc-pills">
      {ov > 0 && <span className="soc-pill ov">{ov} en retard</span>}
      {td > 0 && <span className="soc-pill td">{td} auj.</span>}
    </span>
  )
}

interface SocEntry { name: string; tasks: Tache[] }

function SocGroup({ name, tasks, onRefresh, onEdit }: SocEntry & Pick<Props, 'onRefresh' | 'onEdit'>) {
  return (
    <div className="grp-soc">
      <div className="grp-soc-hd">
        <span className="grp-soc-name">{name}</span>
        <StatusPills tasks={tasks} />
      </div>
      {sortTasks(tasks).map(t => (
        <TaskCard key={t.id} tache={t} onRefresh={onRefresh} onEdit={onEdit} />
      ))}
    </div>
  )
}

function groupBySoc(tasks: Tache[]): [string, SocEntry][] {
  const map = new Map<string, SocEntry>()
  for (const t of tasks) {
    const id = t.societe_id
    if (!map.has(id)) map.set(id, { name: t.societe?.name ?? '—', tasks: [] })
    map.get(id)!.tasks.push(t)
  }
  return [...map.entries()]
}

export function TaskList({ taches, activeOwner, onRefresh, onEdit }: Props) {
  if (taches.length === 0) {
    return (
      <div className="tscroll">
        <div className="empty-state">Aucune tâche dans cette vue.</div>
      </div>
    )
  }

  if (activeOwner !== 'all') {
    return (
      <div className="tscroll">
        {groupBySoc(taches).map(([id, soc]) => (
          <SocGroup key={id} {...soc} onRefresh={onRefresh} onEdit={onEdit} />
        ))}
      </div>
    )
  }

  // Vue "tout" : regrouper par propriétaire → société
  const owners = new Map<string, { name: string; color: string; socs: Map<string, SocEntry> }>()
  for (const t of taches) {
    const ownerId = t.societe?.owner?.id ?? '__'
    if (!owners.has(ownerId)) {
      owners.set(ownerId, {
        name:  t.societe?.owner?.name    ?? '—',
        color: t.societe?.owner?.color_css ?? '#9CA3AF',
        socs:  new Map(),
      })
    }
    const owner = owners.get(ownerId)!
    const socId = t.societe_id
    if (!owner.socs.has(socId)) {
      owner.socs.set(socId, { name: t.societe?.name ?? '—', tasks: [] })
    }
    owner.socs.get(socId)!.tasks.push(t)
  }

  return (
    <div className="tscroll">
      {[...owners.entries()].map(([ownerId, owner]) => (
        <div key={ownerId} className="grp-owner">
          <div className="grp-owner-hd">
            <span className="grp-owner-dot" style={{ background: owner.color }} />
            <span className="grp-owner-name">{owner.name}</span>
          </div>
          {[...owner.socs.entries()].map(([socId, soc]) => (
            <SocGroup key={socId} {...soc} onRefresh={onRefresh} onEdit={onEdit} />
          ))}
        </div>
      ))}
    </div>
  )
}
