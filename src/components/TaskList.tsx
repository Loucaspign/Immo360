import { useState } from 'react'
import type { Tache, DisplayStatus } from '../types'
import { getDisplayStatus } from '../lib/utils'
import { TaskCard } from './TaskCard'

interface Props {
  taches:      Tache[]
  activeOwner: string
  activeSoc:   string
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

function Chevron({ collapsed }: { collapsed: boolean }) {
  return (
    <svg className={`grp-chevron${collapsed ? ' collapsed' : ''}`}
      viewBox="0 0 10 6" width="10" height="6" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 1l4 4 4-4" />
    </svg>
  )
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

interface Entry { name: string; tasks: Tache[] }

function splitByBien(tasks: Tache[]): { biens: [string, Entry][]; general: Tache[] } {
  const map = new Map<string, Entry>()
  const general: Tache[] = []
  for (const t of tasks) {
    if (t.bien_id && t.bien) {
      if (!map.has(t.bien_id)) map.set(t.bien_id, { name: t.bien.name, tasks: [] })
      map.get(t.bien_id)!.tasks.push(t)
    } else {
      general.push(t)
    }
  }
  return { biens: [...map.entries()], general }
}

function BienGroup({ name, tasks, onRefresh, onEdit, general = false }: Entry & Pick<Props, 'onRefresh' | 'onEdit'> & { general?: boolean }) {
  return (
    <div className="grp-bien">
      <div className="grp-bien-hd">
        <span className={general ? 'grp-bien-name grp-bien-name--general' : 'grp-bien-name'}>{name}</span>
        <StatusPills tasks={tasks} />
      </div>
      {sortTasks(tasks).map(t => (
        <TaskCard key={t.id} tache={t} onRefresh={onRefresh} onEdit={onEdit} />
      ))}
    </div>
  )
}

function SocGroup({ name, tasks, onRefresh, onEdit }: Entry & Pick<Props, 'onRefresh' | 'onEdit'>) {
  const [collapsed, setCollapsed] = useState(false)
  const { biens, general } = splitByBien(tasks)
  return (
    <div className="grp-soc">
      <button className="grp-soc-hd" onClick={() => setCollapsed(c => !c)}>
        <span className="grp-soc-name">{name}</span>
        <StatusPills tasks={tasks} />
        <Chevron collapsed={collapsed} />
      </button>
      {!collapsed && (
        biens.length > 0 ? (
          <>
            {general.length > 0 && (
              <BienGroup name="Général" tasks={general} onRefresh={onRefresh} onEdit={onEdit} general />
            )}
            {biens.map(([id, bien]) => (
              <BienGroup key={id} {...bien} onRefresh={onRefresh} onEdit={onEdit} />
            ))}
          </>
        ) : (
          sortTasks(tasks).map(t => (
            <TaskCard key={t.id} tache={t} onRefresh={onRefresh} onEdit={onEdit} />
          ))
        )
      )}
    </div>
  )
}

function OwnerGroup({
  name, color, socs, onRefresh, onEdit,
}: { name: string; color: string; socs: Map<string, Entry> } & Pick<Props, 'onRefresh' | 'onEdit'>) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className="grp-owner">
      <button className="grp-owner-hd" onClick={() => setCollapsed(c => !c)}>
        <span className="grp-owner-dot" style={{ background: color }} />
        <span className="grp-owner-name">{name}</span>
        <Chevron collapsed={collapsed} />
      </button>
      {!collapsed && [...socs.entries()].map(([socId, soc]) => (
        <SocGroup key={socId} {...soc} onRefresh={onRefresh} onEdit={onEdit} />
      ))}
    </div>
  )
}

export function TaskList({ taches, activeOwner, activeSoc, onRefresh, onEdit }: Props) {
  const active = taches.filter(t => t.status !== 'done')
  const done   = taches.filter(t => t.status === 'done')

  if (taches.length === 0) {
    return (
      <div className="tscroll">
        <div className="empty-state">Aucune tâche dans cette vue.</div>
      </div>
    )
  }

  let groups: React.ReactNode

  // Vue société : biens au niveau supérieur
  if (activeSoc !== 'all') {
    const { biens, general } = splitByBien(active)
    groups = (
      <>
        {general.length > 0 && (
          <BienGroup name="Général" tasks={general} onRefresh={onRefresh} onEdit={onEdit} general />
        )}
        {biens.map(([id, bien]) => (
          <BienGroup key={id} {...bien} onRefresh={onRefresh} onEdit={onEdit} />
        ))}
      </>
    )
  }

  // Vue personnelle : société → biens
  else if (activeOwner !== 'all') {
    const socMap = new Map<string, Entry>()
    for (const t of active) {
      const id = t.societe_id
      if (!socMap.has(id)) socMap.set(id, { name: t.societe?.name ?? '—', tasks: [] })
      socMap.get(id)!.tasks.push(t)
    }
    groups = [...socMap.entries()].map(([id, soc]) => (
      <SocGroup key={id} {...soc} onRefresh={onRefresh} onEdit={onEdit} />
    ))
  }

  // Vue tout : propriétaire → société → biens
  else {
    const owners = new Map<string, { name: string; color: string; socs: Map<string, Entry> }>()
    for (const t of active) {
      const ownerId = t.societe?.owner?.id ?? '__'
      if (!owners.has(ownerId)) {
        owners.set(ownerId, {
          name:  t.societe?.owner?.name      ?? '—',
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
    groups = [...owners.entries()].map(([ownerId, owner]) => (
      <OwnerGroup
        key={ownerId}
        name={owner.name}
        color={owner.color}
        socs={owner.socs}
        onRefresh={onRefresh}
        onEdit={onEdit}
      />
    ))
  }

  return (
    <div className="tscroll">
      {groups}
      {done.length > 0 && (
        <div className="grp-done-section">
          <div className="grp-done-hd">
            <span className="grp-done-label">Terminées ({done.length})</span>
            <span className="grp-done-line" />
          </div>
          {done.map(t => (
            <TaskCard key={t.id} tache={t} onRefresh={onRefresh} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  )
}
