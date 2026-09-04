import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Societe, Bien, Batiment, Profile, Precompte } from '../types'
import { PrecompteModal } from './PrecompteModal'
import { BatimentModal } from './BatimentModal'

function fmtAmt(n: number | null) {
  if (n == null) return '—'
  return n.toLocaleString('fr-BE', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' €'
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-BE')
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
function CheckIcon() {
  return (
    <svg viewBox="0 0 10 8" width="9" height="7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 4l3 3 5-6"/>
    </svg>
  )
}

interface Props {
  societes:    Societe[]
  biens:       Bien[]
  batiments:   Batiment[]
  profiles:    Profile[]
  activeOwner: string
  activeSoc:   string
  refreshKey:  number
}

export function PrecomptesView({ societes, biens, batiments, profiles, activeOwner, activeSoc, refreshKey }: Props) {
  const [precomptes,       setPrecomptes]       = useState<Precompte[]>([])
  const [year,             setYear]             = useState(new Date().getFullYear())
  const [showModal,        setShowModal]        = useState(false)
  const [editPc,           setEditPc]           = useState<Precompte | undefined>()
  const [defaultBien,      setDefaultBien]      = useState('')
  const [defaultBatiment,  setDefaultBatiment]  = useState('')
  const [showBatModal,     setShowBatModal]     = useState(false)
  const [editBat,          setEditBat]          = useState<Batiment | undefined>()
  const [batSocId,         setBatSocId]         = useState('')
  const [collapsed,        setCollapsed]        = useState<Set<string>>(new Set())
  const [toggling,         setToggling]         = useState<string | null>(null)

  function toggleSoc(id: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  useEffect(() => { loadAll() }, [refreshKey])

  async function loadAll() {
    const { data } = await supabase.from('precomptes').select('*').eq('active', true)
    if (data) setPrecomptes(data as Precompte[])
  }

  async function toggleField(pc: Precompte, field: 'paye' | 'facture') {
    const uid = `${pc.id}::${field}`
    if (toggling === uid) return
    setToggling(uid)
    const update = { [field]: !pc[field] }
    const { error } = await supabase.from('precomptes').update(update).eq('id', pc.id)
    if (!error) setPrecomptes(prev => prev.map(c => c.id === pc.id ? { ...c, ...update } : c))
    setToggling(null)
  }

  async function deletePc(pc: Precompte) {
    if (!window.confirm('Supprimer cet enregistrement ?')) return
    await supabase.from('precomptes').update({ active: false }).eq('id', pc.id)
    setPrecomptes(prev => prev.filter(c => c.id !== pc.id))
  }

  async function deleteBat(bat: Batiment) {
    if (!window.confirm(`Supprimer le bâtiment « ${bat.name} » ? Les biens seront dissociés mais conservés.`)) return
    await supabase.from('batiments').delete().eq('id', bat.id)
  }

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

  const allSocIds    = groups.flatMap(g => g.socs.map(s => s.id))
  const allCollapsed = allSocIds.length > 0 && allSocIds.every(id => collapsed.has(id))

  function renderPrecompteData(pc: Precompte) {
    return (
      <>
        <span className="ca-amount">{fmtAmt(pc.montant)}</span>
        <span className="ca-date">{fmtDate(pc.date_paiement)}</span>
        <span className={`ca-charge ${pc.a_refacturer ? 'refac' : 'notre'}`}>
          {pc.a_refacturer ? 'À refacturer' : 'Notre charge'}
        </span>
        <div className="ca-chips">
          <button
            className={`ca-chip${pc.paye ? ' done' : ''}`}
            onClick={() => toggleField(pc, 'paye')}
            disabled={toggling === `${pc.id}::paye`}
            title={pc.paye ? 'Marquer non payé' : 'Marquer payé'}>
            {pc.paye && <CheckIcon />} Payé
          </button>
          {pc.a_refacturer && (
            <button
              className={`ca-chip${pc.facture ? ' done' : ''}`}
              onClick={() => toggleField(pc, 'facture')}
              disabled={toggling === `${pc.id}::facture`}
              title={pc.facture ? 'Marquer non facturé' : 'Marquer facturé'}>
              {pc.facture && <CheckIcon />} Facturé
            </button>
          )}
        </div>
        <div className="ca-acts">
          <button className="ca-act-btn" onClick={() => { setEditPc(pc); setShowModal(true) }} title="Modifier">
            <IconPencil />
          </button>
          <button className="ca-act-btn danger" onClick={() => deletePc(pc)} title="Supprimer">
            <IconTrash />
          </button>
        </div>
      </>
    )
  }

  function renderSoc(soc: Societe) {
    const socBatiments     = batiments.filter(bat => bat.societe_id === soc.id)
    const socStandalone    = biens.filter(b => b.societe_id === soc.id && !b.batiment_id)
    if (socBatiments.length === 0 && socStandalone.length === 0) return null

    const isCollapsed = collapsed.has(soc.id)
    return (
      <div key={soc.id} className="ca-soc">
        <div className="ca-soc-hd">
          <button className="ca-soc-toggle" onClick={() => toggleSoc(soc.id)}>
            <div className="ca-soc-dot" style={{ background: soc.owner?.color_css }} />
            <span className="ca-soc-name">{soc.name}</span>
            <svg className={`ca-chevron${isCollapsed ? ' collapsed' : ''}`}
              viewBox="0 0 10 6" width="10" height="6" fill="none"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 1l4 4 4-4" />
            </svg>
          </button>
          <button className="ca-add-bat-btn" onClick={() => { setBatSocId(soc.id); setEditBat(undefined); setShowBatModal(true) }}>
            + Bâtiment
          </button>
        </div>

        {!isCollapsed && (
          <div className="ca-rows">
            {/* Bâtiments groupés */}
            {socBatiments.map(bat => {
              const batBiens = biens.filter(b => b.batiment_id === bat.id)
              const pc = precomptes.find(c => c.batiment_id === bat.id && c.annee === year)
              return (
                <div key={bat.id} className="ca-row ca-row--bat">
                  <div className="ca-row-label">
                    <div className="ca-bat-header">
                      <span className="ca-bat-name">{bat.name}</span>
                      <div className="ca-bat-acts">
                        <button className="ca-act-btn" title="Renommer"
                          onClick={() => { setEditBat(bat); setBatSocId(soc.id); setShowBatModal(true) }}>
                          <IconPencil />
                        </button>
                        <button className="ca-act-btn danger" title="Supprimer le bâtiment"
                          onClick={() => deleteBat(bat)}>
                          <IconTrash />
                        </button>
                      </div>
                    </div>
                    {batBiens.length > 0 && (
                      <div className="ca-bat-lots">
                        {batBiens.map(b => b.name).join(' · ')}
                      </div>
                    )}
                  </div>
                  {pc ? renderPrecompteData(pc) : (
                    <button className="ca-add-row-btn" onClick={() => {
                      setDefaultBatiment(bat.id); setDefaultBien(''); setEditPc(undefined); setShowModal(true)
                    }}>+ Ajouter</button>
                  )}
                </div>
              )
            })}

            {/* Biens standalone (sans bâtiment) */}
            {socStandalone.map(bien => {
              const pc = precomptes.find(c => c.bien_id === bien.id && c.annee === year)
              return (
                <div key={bien.id} className="ca-row">
                  <span className="ca-bien-name">{bien.name}</span>
                  {pc ? renderPrecompteData(pc) : (
                    <button className="ca-add-row-btn" onClick={() => {
                      setDefaultBien(bien.id); setDefaultBatiment(''); setEditPc(undefined); setShowModal(true)
                    }}>+ Ajouter</button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="ca-scroll">
      <div className="ca-toolbar">
        <div className="ct-year-nav">
          <button className="ct-yr-btn" onClick={() => setYear(y => y - 1)}>‹</button>
          <span className="ct-year">{year}</span>
          <button className="ct-yr-btn" onClick={() => setYear(y => y + 1)}>›</button>
        </div>
        {allSocIds.length > 0 && (
          <button className="ct-collapse-btn" onClick={() =>
            setCollapsed(allCollapsed ? new Set() : new Set(allSocIds))}>
            {allCollapsed ? 'Tout déployer' : 'Tout réduire'}
          </button>
        )}
      </div>

      {groups.map((g, i) => (
        <div key={g.profile?.id ?? i} className="ca-group">
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
        <PrecompteModal
          biens={biens}
          batiments={batiments}
          defaultBienId={defaultBien}
          defaultBatimentId={defaultBatiment}
          defaultAnnee={year}
          editPrecompte={editPc}
          onClose={() => { setShowModal(false); setEditPc(undefined) }}
          onSaved={loadAll}
        />
      )}

      {showBatModal && (
        <BatimentModal
          societeId={batSocId}
          editBatiment={editBat}
          onClose={() => { setShowBatModal(false); setEditBat(undefined) }}
          onSaved={() => {}}
        />
      )}
    </div>
  )
}
