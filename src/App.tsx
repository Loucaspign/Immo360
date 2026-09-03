import { useState, useEffect, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import type { Profile, Societe, Bien, Tache } from './types'
import { LoginScreen } from './components/LoginScreen'
import { Sidebar } from './components/Sidebar'
import { TaskList } from './components/TaskList'
import { NewTaskModal } from './components/NewTaskModal'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)

  const [profiles, setProfiles] = useState<Profile[]>([])
  const [societes, setSocietes] = useState<Societe[]>([])
  const [biens, setBiens] = useState<Bien[]>([])
  const [taches, setTaches] = useState<Tache[]>([])

  const [activeOwner, setActiveOwner]   = useState('all')
  const [activeSoc, setActiveSoc]       = useState('all')
  const [activeBien, setActiveBien]     = useState('all')
  const [showNewTask, setShowNewTask]   = useState(false)
  const [editTache,   setEditTache]     = useState<import('./types').Tache | undefined>()

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
    const [p, s, b, t] = await Promise.all([
      supabase.from('profiles').select('*').order('name'),
      supabase.from('societes').select('*, owner:profiles(*)').order('name'),
      supabase.from('biens').select('*').order('name'),
      supabase.from('taches')
        .select('*, societe:societes(*, owner:profiles(*)), bien:biens(*)')
        .order('due_date', { ascending: true, nullsFirst: false }),
    ])
    if (p.data) setProfiles(p.data as Profile[])
    if (s.data) setSocietes(s.data as unknown as Societe[])
    if (b.data) setBiens(b.data as Bien[])
    if (t.data) setTaches(t.data as unknown as Tache[])
  }, [])

  useEffect(() => {
    if (!session) return
    loadData()

    const ch = supabase.channel('immo360')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'taches' },   loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'biens' },    loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'societes' }, loadData)
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
    if (activeOwner !== 'all' && t.societe?.owner_id !== activeOwner) return false
    if (activeSoc   !== 'all' && t.societe_id !== activeSoc)           return false
    if (activeBien  !== 'all' && t.bien_id !== activeBien)             return false
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
        onSocChange={id  => { setActiveSoc(id);   setActiveBien('all'); if (id !== 'all') setActiveOwner('all') }}
        onBienChange={setActiveBien}
        onSignOut={() => supabase.auth.signOut()}
      />
      <main className="main">
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
        <TaskList
          taches={filteredTaches}
          onRefresh={loadData}
          onEdit={t => { setEditTache(t); setShowNewTask(true) }}
        />
      </main>

      <NewTaskModal
        open={showNewTask}
        onClose={() => { setShowNewTask(false); setEditTache(undefined) }}
        onSaved={loadData}
        societes={societes}
        biens={biens}
        userId={session.user.id}
        defaultSoc={activeSoc  !== 'all' ? activeSoc  : ''}
        defaultBien={activeBien !== 'all' ? activeBien : ''}
        editTache={editTache}
      />
    </div>
  )
}
