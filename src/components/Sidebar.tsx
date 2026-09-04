import { useState } from 'react'
import type { Profile, Societe, Bien, Batiment, Tache } from '../types'
import { getDisplayStatus } from '../lib/utils'
import { supabase } from '../lib/supabase'

interface Props {
  profiles:        Profile[]
  societes:        Societe[]
  biens:           Bien[]
  batiments:       Batiment[]
  taches:          Tache[]
  activeOwner:     string
  activeSoc:       string
  activeBien:      string
  onOwnerChange:   (id: string) => void
  onSocChange:     (id: string) => void
  onBienChange:    (id: string) => void
  onSignOut:       () => void
  onRefresh:       () => void
  onAddSociete:    (ownerId: string) => void
  onEditSociete:   (s: Societe) => void
  onAddBien:       (societeId: string) => void
  onEditBien:      (b: Bien) => void
  onAddBatiment:   (societeId: string) => void
  onEditBatiment:  (b: Batiment) => void
}

function IconPlus() {
  return (
    <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <path d="M5 1v8M1 5h8" />
    </svg>
  )
}

function IconPencil() {
  return (
    <svg viewBox="0 0 14 14" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.5 1.5l3 3L4 13H1v-3L9.5 1.5z" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg viewBox="0 0 14 16" width="11" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 4h12M4.5 4V2.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 .5.5V4M2.5 4l.7 9a1 1 0 0 0 1 .9h5.6a1 1 0 0 0 1-.9l.7-9" />
    </svg>
  )
}

export function Sidebar({
  profiles, societes, biens, batiments, taches,
  activeOwner, activeSoc, activeBien,
  onOwnerChange, onSocChange, onBienChange, onSignOut,
  onRefresh, onAddSociete, onEditSociete, onAddBien, onEditBien,
  onAddBatiment, onEditBatiment,
}: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const activeTaches = taches.filter(t => t.status !== 'done')
  const counts = {
    overdue: activeTaches.filter(t => getDisplayStatus(t.status, t.due_date) === 'overdue').length,
    today:   activeTaches.filter(t => getDisplayStatus(t.status, t.due_date) === 'today').length,
    week:    activeTaches.filter(t => getDisplayStatus(t.status, t.due_date) === 'week').length,
  }

  async function deleteSociete(e: React.MouseEvent, s: Societe) {
    e.stopPropagation()
    if (!window.confirm(`Supprimer « ${s.name} » ? Toutes ses tâches et biens seront supprimés.`)) return
    setDeletingId(s.id)
    await supabase.from('societes').delete().eq('id', s.id)
    if (activeSoc === s.id) onSocChange('all')
    setDeletingId(null)
    onRefresh()
  }

  async function deleteBien(e: React.MouseEvent, b: Bien) {
    e.stopPropagation()
    if (!window.confirm(`Supprimer le bien « ${b.name} » ?`)) return
    setDeletingId(b.id)
    await supabase.from('biens').delete().eq('id', b.id)
    if (activeBien === b.id) onBienChange('all')
    setDeletingId(null)
    onRefresh()
  }

  async function deleteBatiment(e: React.MouseEvent, bat: Batiment) {
    e.stopPropagation()
    if (!window.confirm(`Supprimer le bâtiment « ${bat.name} » ? Les biens seront dissociés mais conservés.`)) return
    setDeletingId(bat.id)
    await supabase.from('batiments').delete().eq('id', bat.id)
    setDeletingId(null)
    onRefresh()
  }

  return (
    <aside className="sidebar">
      {/* Top: logo + user filter */}
      <div className="sb-top">
        <div className="logo">
          <span className="logo-name">Immo</span>
          <span className="logo-sup">360</span>
        </div>
        <div className="ufilter">
          <button
            className={`uf-btn${activeOwner === 'all' ? ' active-all' : ''}`}
            onClick={() => onOwnerChange('all')}
          >
            Tout voir
          </button>
          {profiles.map(p => (
            <button
              key={p.id}
              className={`uf-btn${activeOwner === p.id ? ' active-u' : ''}`}
              style={{ '--u-color': p.color_css } as React.CSSProperties}
              onClick={() => onOwnerChange(p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Middle: société tree */}
      <div className="sb-list">
        {profiles.map((profile, gi) => {
          const profileSocs = societes.filter(s => s.owner_id === profile.id)
          const dim = activeOwner !== 'all' && activeOwner !== profile.id

          return (
            <div key={profile.id} style={{ opacity: dim ? 0.3 : 1, transition: 'opacity .12s' }}>
              {gi > 0 && <div className="sb-divider" />}
              <div className="sb-group-lbl">
                <span>{profile.name} — {profileSocs.length} société{profileSocs.length > 1 ? 's' : ''}</span>
                <button
                  className="sb-add-btn"
                  onClick={() => onAddSociete(profile.id)}
                  title={`Ajouter une société pour ${profile.name}`}
                >
                  <IconPlus />
                </button>
              </div>
              {profileSocs.map(s => {
                const isOpen = activeSoc === s.id
                const count  = taches.filter(t => t.societe_id === s.id && t.status !== 'done').length
                const socBatiments = batiments.filter(b => b.societe_id === s.id)
                const socBiens     = biens.filter(b => b.societe_id === s.id)

                return (
                  <div key={s.id}>
                    <div
                      className={`soc-row${isOpen ? ' sel' : ''}${deletingId === s.id ? ' deleting' : ''}`}
                      onClick={() => onSocChange(isOpen ? 'all' : s.id)}
                    >
                      <div className="soc-dot" style={{ background: profile.color_css }} />
                      <div className="soc-name">{s.name}</div>
                      {count > 0 && <div className="soc-badge">{count}</div>}
                      <button
                        className="sb-del-btn"
                        onClick={e => { e.stopPropagation(); onEditSociete(s) }}
                        title="Modifier"
                      >
                        <IconPencil />
                      </button>
                      <button
                        className="sb-del-btn"
                        onClick={e => deleteSociete(e, s)}
                        title="Supprimer"
                      >
                        <IconTrash />
                      </button>
                      <div className="soc-chevron">{isOpen ? '▾' : '▸'}</div>
                    </div>

                    {isOpen && (
                      <div className="bien-list">
                        {/* Batiments with their biens */}
                        {socBatiments.map(bat => {
                          const batBiens = socBiens.filter(b => b.batiment_id === bat.id)
                          return (
                            <div key={bat.id} className={`sb-bat${deletingId === bat.id ? ' deleting' : ''}`}>
                              <div className="sb-bat-hdr">
                                <span className="sb-bat-name">{bat.name}</span>
                                <button
                                  className="sb-del-btn"
                                  onClick={e => { e.stopPropagation(); onEditBatiment(bat) }}
                                  title="Renommer"
                                >
                                  <IconPencil />
                                </button>
                                <button
                                  className="sb-del-btn"
                                  onClick={e => deleteBatiment(e, bat)}
                                  title="Supprimer"
                                >
                                  <IconTrash />
                                </button>
                              </div>
                              {batBiens.map(b => {
                                const bCnt = taches.filter(t => t.bien_id === b.id && t.status !== 'done').length
                                return (
                                  <div
                                    key={b.id}
                                    className={`bien-row sb-bat-bien${activeBien === b.id ? ' sel' : ''}${deletingId === b.id ? ' deleting' : ''}`}
                                    onClick={e => { e.stopPropagation(); onBienChange(activeBien === b.id ? 'all' : b.id) }}
                                  >
                                    <span className="bien-name">{b.name}</span>
                                    <span className="bien-lots">{b.lots_count} lot{b.lots_count > 1 ? 's' : ''}</span>
                                    {bCnt > 0 && <span className="bien-badge">{bCnt}</span>}
                                    <button className="sb-del-btn" onClick={e => { e.stopPropagation(); onEditBien(b) }} title="Modifier"><IconPencil /></button>
                                    <button className="sb-del-btn" onClick={e => deleteBien(e, b)} title="Supprimer"><IconTrash /></button>
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })}

                        {/* Standalone biens (not in any batiment) */}
                        {socBiens.filter(b => !b.batiment_id).map(b => {
                          const bCnt = taches.filter(t => t.bien_id === b.id && t.status !== 'done').length
                          return (
                            <div
                              key={b.id}
                              className={`bien-row${activeBien === b.id ? ' sel' : ''}${deletingId === b.id ? ' deleting' : ''}`}
                              onClick={e => { e.stopPropagation(); onBienChange(activeBien === b.id ? 'all' : b.id) }}
                            >
                              <span className="bien-name">{b.name}</span>
                              <span className="bien-lots">{b.lots_count} lot{b.lots_count > 1 ? 's' : ''}</span>
                              {bCnt > 0 && <span className="bien-badge">{bCnt}</span>}
                              <button className="sb-del-btn" onClick={e => { e.stopPropagation(); onEditBien(b) }} title="Modifier"><IconPencil /></button>
                              <button className="sb-del-btn" onClick={e => deleteBien(e, b)} title="Supprimer"><IconTrash /></button>
                            </div>
                          )
                        })}

                        <button className="bien-add-btn" onClick={e => { e.stopPropagation(); onAddBien(s.id) }}>
                          <IconPlus /> Ajouter un bien
                        </button>
                        <button className="bien-add-btn" onClick={e => { e.stopPropagation(); onAddBatiment(s.id) }}>
                          <IconPlus /> Ajouter un bâtiment
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Bottom: summary + sign out */}
      <div className="sb-summary">
        <div className="sb-stat">
          <div className="sb-dot" style={{ background: 'var(--danger)' }} />
          <div className="sb-stat-lbl">En retard</div>
          <div className="sb-stat-val" style={{ color: 'var(--danger)' }}>{counts.overdue}</div>
        </div>
        <div className="sb-stat">
          <div className="sb-dot" style={{ background: 'var(--warn)' }} />
          <div className="sb-stat-lbl">Aujourd'hui</div>
          <div className="sb-stat-val" style={{ color: 'var(--warn)' }}>{counts.today}</div>
        </div>
        <div className="sb-stat">
          <div className="sb-dot" style={{ background: 'var(--info)' }} />
          <div className="sb-stat-lbl">Cette semaine</div>
          <div className="sb-stat-val" style={{ color: 'var(--info)' }}>{counts.week}</div>
        </div>
        <button className="btn-signout" onClick={onSignOut}>Déconnexion</button>
      </div>
    </aside>
  )
}
