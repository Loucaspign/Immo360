import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Societe, Bien, Profile, Locataire, LoyerPaiement, MontantImpaye } from '../types'
import { LocataireModal } from './LocataireModal'

const FR_MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

function fmtAmt(n: number | null) {
  if (n == null) return null
  return n.toLocaleString('fr-BE', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' €'
}

function IconPencil() {
  return (
    <svg viewBox="0 0 14 14" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 1.5l3 3L4 13H1v-3L9.5 1.5z" />
    </svg>
  )
}
function IconTrash() {
  return (
    <svg viewBox="0 0 14 16" width="11" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 4h12M4.5 4V2.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 .5.5V4M2.5 4l.7 9a1 1 0 0 0 1 .9h5.6a1 1 0 0 0 1-.9l.7-9" />
    </svg>
  )
}

interface ImpayeForm { label: string; montant: string }

interface Props {
  societes:    Societe[]
  biens:       Bien[]
  profiles:    Profile[]
  activeOwner: string
  activeSoc:   string
  refreshKey:  number
}

export function LoyersView({ societes, biens, profiles, activeOwner, activeSoc, refreshKey }: Props) {
  const [locataires,    setLocataires]    = useState<Locataire[]>([])
  const [paiements,     setPaiements]     = useState<LoyerPaiement[]>([])
  const [impayes,       setImpayes]       = useState<MontantImpaye[]>([])
  const [year,          setYear]          = useState(new Date().getFullYear())
  const [showModal,     setShowModal]     = useState(false)
  const [editLoc,       setEditLoc]       = useState<Locataire | undefined>()
  const [defaultBien,   setDefaultBien]   = useState('')
  const [collapsed,     setCollapsed]     = useState<Set<string>>(new Set())
  const [toggling,      setToggling]      = useState<string | null>(null)
  const [impayeForms,   setImpayeForms]   = useState<Record<string, ImpayeForm>>({})

  const today = new Date().toISOString().slice(0, 10)
  const currentMonth = today.slice(0, 7)

  function toggleSoc(id: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  useEffect(() => { loadAll() }, [refreshKey])

  async function loadAll() {
    const [l, p, i] = await Promise.all([
      supabase.from('locataires').select('*').eq('active', true).order('created_at'),
      supabase.from('loyer_paiements').select('*'),
      supabase.from('montants_impayes').select('*').order('created_at'),
    ])
    if (l.data) setLocataires(l.data as Locataire[])
    if (p.data) setPaiements(p.data as LoyerPaiement[])
    if (i.data) setImpayes(i.data as MontantImpaye[])
  }

  async function togglePaiement(locId: string, periodKey: string) {
    const uid = `${locId}::${periodKey}`
    if (toggling === uid) return
    setToggling(uid)
    const existing = paiements.find(p => p.locataire_id === locId && p.period_key === periodKey)
    if (existing) {
      await supabase.from('loyer_paiements').delete().eq('id', existing.id)
      setPaiements(prev => prev.filter(p => p.id !== existing.id))
    } else {
      const { data, error } = await supabase
        .from('loyer_paiements')
        .insert({ locataire_id: locId, period_key: periodKey })
        .select('*').single()
      if (!error && data) setPaiements(prev => [...prev, data as LoyerPaiement])
    }
    setToggling(null)
  }

  async function deleteLoc(loc: Locataire) {
    if (!window.confirm(`Supprimer le locataire « ${loc.nom} » ?`)) return
    await supabase.from('locataires').update({ active: false }).eq('id', loc.id)
    setLocataires(prev => prev.filter(l => l.id !== loc.id))
  }

  async function addImpaye(locId: string) {
    const form = impayeForms[locId]
    if (!form?.label.trim() || !form?.montant) return
    const { data, error } = await supabase
      .from('montants_impayes')
      .insert({ locataire_id: locId, label: form.label.trim(), montant: parseFloat(form.montant) })
      .select('*').single()
    if (!error && data) {
      setImpayes(prev => [...prev, data as MontantImpaye])
      setImpayeForms(prev => ({ ...prev, [locId]: { label: '', montant: '' } }))
    }
  }

  async function toggleRembourse(imp: MontantImpaye) {
    const { error } = await supabase
      .from('montants_impayes').update({ rembourse: !imp.rembourse }).eq('id', imp.id)
    if (!error) {
      setImpayes(prev => prev.map(i => i.id === imp.id ? { ...i, rembourse: !imp.rembourse } : i))
    }
  }

  async function deleteImpaye(imp: MontantImpaye) {
    await supabase.from('montants_impayes').delete().eq('id', imp.id)
    setImpayes(prev => prev.filter(i => i.id !== imp.id))
  }

  const doneSet = new Set(paiements.map(p => `${p.locataire_id}::${p.period_key}`))

  const visibleSocs = societes.filter(s => {
    if (activeSoc   !== 'all' && s.id       !== activeSoc)   return false
    if (activeOwner !== 'all' && s.owner_id !== activeOwner) return false
    return true
  })

  const groups: { profile: Profile | null; socs: Societe[] }[] =
    activeOwner !== 'all' || activeSoc !== 'all'
      ? [{ profile: null, socs: visibleSocs }]
      : profiles.map(p => ({ profile: p, socs: visibleSocs.filter(s => s.owner_id === p.id) }))
               .filter(g => g.socs.length > 0)

  function renderBien(bien: Bien) {
    const loc = locataires.find(l => l.bien_id === bien.id)

    if (!loc) {
      return (
        <div key={bien.id} className="ly-bien">
          <div className="ly-bien-hd">
            <span className="ly-bien-name">{bien.name}</span>
            <button className="ly-add-loc"
              onClick={() => { setDefaultBien(bien.id); setEditLoc(undefined); setShowModal(true) }}>
              + Locataire
            </button>
          </div>
          <p className="ly-empty">Vacant</p>
        </div>
      )
    }

    const locImpayes = impayes.filter(i => i.locataire_id === loc.id)
    const form = impayeForms[loc.id] ?? { label: '', montant: '' }
    const hasAmounts = loc.loyer_base != null || loc.loyer_indexe != null
      || loc.charges_communes != null || loc.charges_privees != null || loc.loyer_total_tvac != null

    return (
      <div key={bien.id} className="ly-bien">
        <div className="ly-bien-hd">
          <span className="ly-bien-name">{bien.name}</span>
        </div>

        <div className="ly-card">
          {/* Header: nom + bail chips + actions */}
          <div className="ly-card-hd">
            <span className="ly-nom">{loc.nom}</span>
            <div className="ly-bails">
              <span className={`ly-bail ${loc.bail_signe ? 'on' : 'off'}`}>Bail signé</span>
              <span className={`ly-bail ${loc.bail_enregistre ? 'on' : 'off'}`}>Enregistré</span>
            </div>
            <div className="ly-acts">
              <button className="ly-act-btn" onClick={() => { setEditLoc(loc); setShowModal(true) }} title="Modifier">
                <IconPencil />
              </button>
              <button className="ly-act-btn danger" onClick={() => deleteLoc(loc)} title="Supprimer">
                <IconTrash />
              </button>
            </div>
          </div>

          {/* Loyer amounts */}
          {hasAmounts && (
            <div className="ly-amounts">
              {loc.loyer_base       != null && <div className="ly-amount-item"><span className="ly-amount-label">Base HTVA</span><span className="ly-amount-val">{fmtAmt(loc.loyer_base)}</span></div>}
              {loc.loyer_indexe     != null && <div className="ly-amount-item"><span className="ly-amount-label">Indexé HTVA</span><span className="ly-amount-val">{fmtAmt(loc.loyer_indexe)}</span></div>}
              {loc.charges_communes != null && <div className="ly-amount-item"><span className="ly-amount-label">Ch. communes</span><span className="ly-amount-val">{fmtAmt(loc.charges_communes)}</span></div>}
              {loc.charges_privees  != null && <div className="ly-amount-item"><span className="ly-amount-label">Ch. privées</span><span className="ly-amount-val">{fmtAmt(loc.charges_privees)}</span></div>}
              {loc.loyer_total_tvac != null && <div className="ly-amount-item ly-amount-total"><span className="ly-amount-label">Total TVAC</span><span className="ly-amount-val">{fmtAmt(loc.loyer_total_tvac)}</span></div>}
            </div>
          )}

          {/* Monthly chips */}
          <div className="ly-months-section">
            <span className="ly-months-label">Loyers perçus {year}</span>
            <div className="ly-chips">
              {FR_MONTHS.map((label, i) => {
                const monthStr  = String(i + 1).padStart(2, '0')
                const periodKey = `${year}-${monthStr}`
                const dk        = `${loc.id}::${periodKey}`
                const done      = doneSet.has(dk)
                const late      = !done && periodKey < currentMonth
                const cls       = `ly-chip${done ? ' done' : late ? ' late' : ''}`
                return (
                  <button key={periodKey} className={cls}
                    onClick={() => togglePaiement(loc.id, periodKey)}
                    title={done ? 'Marquer non perçu' : 'Marquer perçu'}
                    disabled={toggling === dk}>
                    {done && (
                      <svg viewBox="0 0 10 8" width="9" height="7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 4l3 3 5-6"/>
                      </svg>
                    )}
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Impayés */}
          <div className="ly-impayes">
            <div className="ly-impaye-hd">
              <span className="ly-impaye-title">Montants impayés</span>
            </div>

            {locImpayes.length > 0 && (
              <div className="ly-impaye-list">
                {locImpayes.map(imp => (
                  <div key={imp.id} className={`ly-impaye-item${imp.rembourse ? ' rembourse' : ''}`}>
                    <span className="ly-impaye-label">{imp.label}</span>
                    <span className="ly-impaye-amount">{fmtAmt(imp.montant)}</span>
                    <button className="ly-impaye-toggle"
                      onClick={() => toggleRembourse(imp)}
                      title={imp.rembourse ? 'Marquer impayé' : 'Marquer remboursé'}>
                      {imp.rembourse ? '↩' : '✓'}
                    </button>
                    <button className="ly-impaye-del" onClick={() => deleteImpaye(imp)} title="Supprimer">✕</button>
                  </div>
                ))}
              </div>
            )}

            <div className="ly-impaye-add">
              <input className="ly-impaye-input"
                value={form.label}
                onChange={ev => setImpayeForms(prev => ({ ...prev, [loc.id]: { ...form, label: ev.target.value } }))}
                placeholder="Libellé (ex. Caution)"
                onKeyDown={ev => { if (ev.key === 'Enter') addImpaye(loc.id) }}
              />
              <input className="ly-impaye-input ly-impaye-num" type="number" min={0} step="0.01"
                value={form.montant}
                onChange={ev => setImpayeForms(prev => ({ ...prev, [loc.id]: { ...form, montant: ev.target.value } }))}
                placeholder="€"
                onKeyDown={ev => { if (ev.key === 'Enter') addImpaye(loc.id) }}
              />
              <button className="ly-impaye-add-btn"
                onClick={() => addImpaye(loc.id)}
                disabled={!form.label.trim() || !form.montant}>
                Ajouter
              </button>
            </div>
          </div>

          {loc.notes && <p className="ly-notes">{loc.notes}</p>}
        </div>
      </div>
    )
  }

  function renderSoc(soc: Societe) {
    const socBiens = biens.filter(b => b.societe_id === soc.id)
    if (socBiens.length === 0) return null
    const isCollapsed = collapsed.has(soc.id)
    return (
      <div key={soc.id} className="ly-soc">
        <button className="ly-soc-hd" onClick={() => toggleSoc(soc.id)}>
          <div className="ly-soc-dot" style={{ background: soc.owner?.color_css }} />
          <span className="ly-soc-name">{soc.name}</span>
          <svg className={`ly-chevron${isCollapsed ? ' collapsed' : ''}`}
            viewBox="0 0 10 6" width="10" height="6" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 1l4 4 4-4" />
          </svg>
        </button>
        {!isCollapsed && socBiens.map(renderBien)}
      </div>
    )
  }

  return (
    <div className="ly-scroll">
      <div className="ly-toolbar">
        <div className="ct-year-nav">
          <button className="ct-yr-btn" onClick={() => setYear(y => y - 1)}>‹</button>
          <span className="ct-year">{year}</span>
          <button className="ct-yr-btn" onClick={() => setYear(y => y + 1)}>›</button>
        </div>
      </div>

      {groups.map((g, i) => (
        <div key={g.profile?.id ?? i} className="ly-group">
          {g.profile && (
            <div className="grp-owner-hd" style={{ marginBottom: 12 }}>
              <div className="grp-owner-dot" style={{ background: g.profile.color_css }} />
              <span className="grp-owner-name">{g.profile.name}</span>
            </div>
          )}
          {g.socs.map(renderSoc)}
        </div>
      ))}

      {showModal && (
        <LocataireModal
          biens={biens}
          defaultBienId={defaultBien}
          editLocataire={editLoc}
          onClose={() => { setShowModal(false); setEditLoc(undefined) }}
          onSaved={loadAll}
        />
      )}
    </div>
  )
}
