import { useState, useEffect, useCallback, useRef } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import type { Profile, Societe, Bien, Batiment, Tache } from './types'
import { LoginScreen } from './components/LoginScreen'
import { Sidebar } from './components/Sidebar'
import { TaskList } from './components/TaskList'
import { NewTaskModal } from './components/NewTaskModal'
import { SocieteModal } from './components/SocieteModal'
import { BienModal } from './components/BienModal'
import { QuickList } from './components/QuickList'
import { ComptaView } from './components/ComptaView'
import { AssurancesView } from './components/AssurancesView'
import { LoyersView } from './components/LoyersView'
import { PrecomptesView } from './components/PrecomptesView'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)

  const [profiles,  setProfiles]  = useState<Profile[]>([])
  const [societes,  setSocietes]  = useState<Societe[]>([])
  const [biens,     setBiens]     = useState<Bien[]>([])
  const [batiments, setBatiments] = useState<Batiment[]>([])
  const [taches,    setTaches]    = useState<Tache[]>([])

  const [view, setView] = useState<'tasks' | 'compta' | 'assurances' | 'loyers' | 'cadastres'>('tasks')
  const [comptaRefreshKey,     setComptaRefreshKey]     = useState(0)
  const [assurancesRefreshKey, setAssurancesRefreshKey] = useState(0)
  const [loyersRefreshKey,     setLoyersRefreshKey]     = useState(0)
  const [precomptesRefreshKey, setPrecomptesRefreshKey] = useState(0)

  const [activeOwner, setActiveOwner]   = useState('all')
  const [activeSoc, setActiveSoc]       = useState('all')
  const [activeBien, setActiveBien]     = useState('all')
  const didInitOwner = useRef(false)
  const [showNewTask,   setShowNewTask]   = useState(false)
  const [editTache,     setEditTache]     = useState<import('./types').Tache | undefined>()
  const [showSocModal,  setShowSocModal]  = useState(false)
  const [socOwnerDef,   setSocOwnerDef]   = useState('')
  const [editSociete,   setEditSociete]   = useState<import('./types').Societe | undefined>()
  const [showBienModal, setShowBienModal] = useState(false)
  const [bienSocDef,    setBienSocDef]    = useState('')
  const [editBien,      setEditBien]      = useState<import('./types').Bien | undefined>()

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Data
  const loadData = useCallback(async () => {
    const [p, s, b, bt, t] = await Promise.all([
      supabase.from('profiles').select('*').order('name'),
      supabase.from('societes').select('*, owner:profiles(*)').order('name'),
      supabase.from('biens').select('*').order('name'),
      supabase.from('batiments').select('*').order('name'),
      supabase.from('taches')
        .select('*, societe:societes(*, owner:profiles(*)), bien:biens(*), assignee:profiles!assigned_to(*)')
        .order('due_date', { ascending: true, nullsFirst: false }),
    ])
    if (p.data)  setProfiles(p.data as Profile[])
    if (s.data)  setSocietes(s.data as unknown as Societe[])
    if (b.data)  setBiens(b.data as Bien[])
    if (bt.data) setBatiments(bt.data as Batiment[])
    if (t.data)  setTaches(t.data as unknown as Tache[])
  }, [])

  // Auto-select logged-in user's filter on first load
  useEffect(() => {
    if (session && profiles.length > 0 && !didInitOwner.current) {
      didInitOwner.current = true
      setActiveOwner(session.user.id)
    }
  }, [session, profiles])

  useEffect(() => {
    if (!session) return
    loadData()

    const ch = supabase.channel('immo360')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'taches' },            loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'biens' },             loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'societes' },          loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'compta_templates' }, () => setComptaRefreshKey(k => k + 1))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'compta_entries' },   () => setComptaRefreshKey(k => k + 1))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assurances' },       () => setAssurancesRefreshKey(k => k + 1))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'locataires' },      () => setLoyersRefreshKey(k => k + 1))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loyer_paiements' }, () => setLoyersRefreshKey(k => k + 1))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loyer_impayes' },   () => setLoyersRefreshKey(k => k + 1))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'batiments' },       loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'precomptes' },      () => setPrecomptesRefreshKey(k => k + 1))
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [session, loadData])

  if (!authReady) {
    return (
      <div className="app-loading">
        <div className="logo">
          <span className="logo-name">Immo</span>
          <span className="logo-sup">360</span>
        </div>
      </div>
    )
  }

  if (!session) return <LoginScreen />

  const filteredTaches = taches.filter(t => {
    const effectiveOwner = t.assigned_to ?? t.societe?.owner_id
    if (activeOwner !== 'all' && effectiveOwner !== activeOwner) return false
    if (activeSoc   !== 'all' && t.societe_id !== activeSoc)    return false
    if (activeBien  !== 'all' && t.bien_id !== activeBien)      return false
    return true
  })

  const overdueCount = filteredTaches.filter(t => {
    if (t.status === 'done' || !t.due_date) return false
    return new Date(t.due_date + 'T00:00:00') < new Date(new Date().setHours(0,0,0,0))
  }).length

  const today = new Date().toLocaleDateString('fr-BE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="app">
      <Sidebar
        profiles={profiles}
        societes={societes}
        biens={biens}
        taches={taches}
        activeOwner={activeOwner}
        activeSoc={activeSoc}
        activeBien={activeBien}
        onOwnerChange={id => { setActiveOwner(id); setActiveSoc('all'); setActiveBien('all') }}
        onSocChange={id  => { setActiveSoc(id); setActiveBien('all'); if (id !== 'all') { const soc = societes.find(s => s.id === id); if (soc) setActiveOwner(soc.owner_id) } }}
        onBienChange={setActiveBien}
        onSignOut={() => supabase.auth.signOut()}
        onRefresh={loadData}
        onAddSociete={ownerId => { setSocOwnerDef(ownerId); setEditSociete(undefined); setShowSocModal(true) }}
        onEditSociete={s => { setEditSociete(s); setShowSocModal(true) }}
        onAddBien={socId => { setBienSocDef(socId); setEditBien(undefined); setShowBienModal(true) }}
        onEditBien={b => { setEditBien(b); setShowBienModal(true) }}
      />
      <main className="main">
        <div className="main-nav">
          <button className={`main-nav-tab${view === 'tasks'      ? ' active' : ''}`} onClick={() => setView('tasks')}>Tâches</button>
          <button className={`main-nav-tab${view === 'compta'     ? ' active' : ''}`} onClick={() => setView('compta')}>Comptabilité</button>
          <button className={`main-nav-tab${view === 'loyers'     ? ' active' : ''}`} onClick={() => setView('loyers')}>Loyers</button>
          <span className="main-nav-sep" />
          <button className={`main-nav-tab${view === 'assurances' ? ' active' : ''}`} onClick={() => setView('assurances')}>Assurances</button>
          <button className={`main-nav-tab${view === 'cadastres'  ? ' active' : ''}`} onClick={() => setView('cadastres')}>Précomptes</button>
        </div>

        <div className="tab-panel" hidden={view !== 'tasks'}>
          <div className="mhdr">
            <div className="hdr-row">
              <div>
                <h1 className="page-title">Tableau de bord</h1>
                <div className="hdr-meta">
                  {today}
                  {overdueCount > 0 && (
                    <> &nbsp;·&nbsp; <strong>{overdueCount} tâche{overdueCount > 1 ? 's' : ''} en retard</strong></>
                  )}
                </div>
              </div>
              <button className="btn-new" onClick={() => setShowNewTask(true)}>+ Nouvelle tâche</button>
            </div>
          </div>
          <QuickList userId={session.user.id} />
          <TaskList
            taches={filteredTaches}
            activeOwner={activeOwner}
            activeSoc={activeSoc}
            onRefresh={loadData}
            onEdit={t => { setEditTache(t); setShowNewTask(true) }}
          />
        </div>

        <div className="tab-panel" hidden={view !== 'assurances'}>
          <div className="mhdr">
            <div className="hdr-row">
              <div>
                <h1 className="page-title">Assurances</h1>
                <div className="hdr-meta">Polices d'assurance par bien</div>
              </div>
            </div>
          </div>
          <AssurancesView
            societes={societes}
            biens={biens}
            profiles={profiles}
            activeOwner={activeOwner}
            activeSoc={activeSoc}
            refreshKey={assurancesRefreshKey}
          />
        </div>

        <div className="tab-panel" hidden={view !== 'compta'}>
          <div className="mhdr">
            <div className="hdr-row">
              <div>
                <h1 className="page-title">Comptabilité</h1>
                <div className="hdr-meta">Obligations récurrentes par société</div>
              </div>
            </div>
          </div>
          <ComptaView societes={societes} profiles={profiles} activeOwner={activeOwner} activeSoc={activeSoc} refreshKey={comptaRefreshKey} />
        </div>

        <div className="tab-panel" hidden={view !== 'loyers'}>
          <div className="mhdr">
            <div className="hdr-row">
              <div>
                <h1 className="page-title">Loyers</h1>
                <div className="hdr-meta">Suivi des loyers et locataires par bien</div>
              </div>
            </div>
          </div>
          <LoyersView
            societes={societes}
            biens={biens}
            profiles={profiles}
            activeOwner={activeOwner}
            activeSoc={activeSoc}
            refreshKey={loyersRefreshKey}
          />
        </div>

        <div className="tab-panel" hidden={view !== 'cadastres'}>
          <div className="mhdr">
            <div className="hdr-row">
              <div>
                <h1 className="page-title">Précomptes immobiliers</h1>
                <div className="hdr-meta">Précompte immobilier par bien</div>
              </div>
            </div>
          </div>
          <PrecomptesView
            societes={societes}
            biens={biens}
            batiments={batiments}
            profiles={profiles}
            activeOwner={activeOwner}
            activeSoc={activeSoc}
            refreshKey={precomptesRefreshKey}
          />
        </div>
      </main>

      <NewTaskModal
        open={showNewTask}
        onClose={() => { setShowNewTask(false); setEditTache(undefined) }}
        onSaved={loadData}
        profiles={profiles}
        societes={societes}
        biens={biens}
        userId={session.user.id}
        defaultSoc={activeSoc  !== 'all' ? activeSoc  : ''}
        defaultBien={activeBien !== 'all' ? activeBien : ''}
        editTache={editTache}
      />

      <SocieteModal
        open={showSocModal}
        onClose={() => { setShowSocModal(false); setEditSociete(undefined) }}
        onSaved={loadData}
        profiles={profiles}
        defaultOwner={socOwnerDef}
        editSociete={editSociete}
      />

      <BienModal
        open={showBienModal}
        onClose={() => { setShowBienModal(false); setEditBien(undefined) }}
        onSaved={loadData}
        societes={societes}
        batiments={batiments}
        defaultSoc={bienSocDef}
        editBien={editBien}
      />
    </div>
  )
}
