import type { Profile, Societe, Bien, Tache } from '../types'
import { getDisplayStatus } from '../lib/utils'

interface Props {
  profiles:      Profile[]
  societes:      Societe[]
  biens:         Bien[]
  taches:        Tache[]
  activeOwner:   string
  activeSoc:     string
  activeBien:    string
  onOwnerChange: (id: string) => void
  onSocChange:   (id: string) => void
  onBienChange:  (id: string) => void
  onSignOut:     () => void
}

export function Sidebar({
  profiles, societes, biens, taches,
  activeOwner, activeSoc, activeBien,
  onOwnerChange, onSocChange, onBienChange, onSignOut,
}: Props) {
  const activeTaches = taches.filter(t => t.status !== 'done')
  const counts = {
    overdue: activeTaches.filter(t => getDisplayStatus(t.status, t.due_date) === 'overdue').length,
    today:   activeTaches.filter(t => getDisplayStatus(t.status, t.due_date) === 'today').length,
    week:    activeTaches.filter(t => getDisplayStatus(t.status, t.due_date) === 'week').length,
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
          if (!profileSocs.length) return null
          const dim = activeOwner !== 'all' && activeOwner !== profile.id

          return (
            <div key={profile.id} style={{ opacity: dim ? 0.3 : 1, transition: 'opacity .12s' }}>
              {gi > 0 && <div className="sb-divider" />}
              <div className="sb-group-lbl">
                {profile.name} — {profileSocs.length} société{profileSocs.length > 1 ? 's' : ''}
              </div>
              {profileSocs.map(s => {
                const isOpen = activeSoc === s.id
                const count  = taches.filter(t => t.societe_id === s.id && t.status !== 'done').length
                const socBiens = biens.filter(b => b.societe_id === s.id)

                return (
                  <div key={s.id}>
                    <div
                      className={`soc-row${isOpen ? ' sel' : ''}`}
                      onClick={() => onSocChange(isOpen ? 'all' : s.id)}
                    >
                      <div className="soc-dot" style={{ background: profile.color_css }} />
                      <div className="soc-name">{s.name}</div>
                      {count > 0 && <div className="soc-badge">{count}</div>}
                      <div className="soc-chevron">{isOpen ? '▾' : '▸'}</div>
                    </div>

                    {isOpen && socBiens.length > 0 && (
                      <div className="bien-list">
                        {socBiens.map(b => {
                          const bCnt = taches.filter(t => t.bien_id === b.id && t.status !== 'done').length
                          return (
                            <div
                              key={b.id}
                              className={`bien-row${activeBien === b.id ? ' sel' : ''}`}
                              onClick={e => {
                                e.stopPropagation()
                                onBienChange(activeBien === b.id ? 'all' : b.id)
                              }}
                            >
                              <span className="bien-name">{b.name}</span>
                              <span className="bien-lots">{b.lots_count} lot{b.lots_count > 1 ? 's' : ''}</span>
                              {bCnt > 0 && <span className="bien-badge">{bCnt}</span>}
                            </div>
                          )
                        })}
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
