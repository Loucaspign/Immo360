import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Societe, Bien, Batiment, Profile, Assurance } from '../types'
import { AssuranceModal } from './AssuranceModal'

const TYPE_LABELS: Record<string, string> = {
  incendie:             'Incendie & RC',
  protection_juridique: 'Protection juridique',
  omnium:               'Omnium',
  loyers_impayes:       'Loyers impayés',
  rc_proprietaire:      'RC propriétaire',
  rc_locataire:         'RC locataire',
  autre:                'Autre',
}

const STATUT_LABELS: Record<string, string> = {
  actif:             'Actif',
  resilie:           'Résilié',
  en_renouvellement: 'Renouvellement',
}

const FREQ_LABELS: Record<string, string> = {
  mensuel:     '/mois',
  trimestriel: '/trim.',
  annuel:      '/an',
}

function fmtAmount(n: number | null) {
  if (n == null) return null
  return n.toLocaleString('fr-BE', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' €'
}

function fmtDate(d: string | null) {
  if (!d) return null
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

interface Props {
  societes:    Societe[]
  biens:       Bien[]
  batiments:   Batiment[]
  profiles:    Profile[]
  activeOwner: string
  activeSoc:   string
  refreshKey:  number
}

export function AssurancesView({ societes, biens, batiments, profiles, activeOwner, activeSoc, refreshKey }: Props) {
  const [assurances,      setAssurances]      = useState<Assurance[]>([])
  const [showModal,       setShowModal]       = useState(false)
  const [editAss,         setEditAss]         = useState<Assurance | undefined>()
  const [defaultBien,     setDefaultBien]     = useState('')
  const [defaultBatiment, setDefaultBatiment] = useState('')
  const [collapsed,       setCollapsed]       = useState<Set<string>>(new Set())
  const [expandedBats,    setExpandedBats]    = useState<Set<string>>(new Set())

  function toggleBatBiens(id: string) {
    setExpandedBats(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSoc(id: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  useEffect(() => { loadAll() }, [refreshKey])

  async function loadAll() {
    const { data } = await supabase.from('assurances').select('*').eq('active', true).order('created_at')
    if (data) setAssurances(data as Assurance[])
  }

  async function deleteAss(ass: Assurance) {
    if (!window.confirm('Supprimer cette assurance ?')) return
    await supabase.from('assurances').update({ active: false }).eq('id', ass.id)
    setAssurances(prev => prev.filter(a => a.id !== ass.id))
  }

  function openModal(opts: { bienId?: string; batimentId?: string }) {
    setDefaultBien(opts.bienId ?? '')
    setDefaultBatiment(opts.batimentId ?? '')
    setEditAss(undefined)
    setShowModal(true)
  }

  function renderAssCard(ass: Assurance) {
    return (
      <div key={ass.id} className="as-card">
        <div className="as-card-body">
          <div className="as-card-hd">
            <span className={`as-type-badge as-type-${ass.type}`}>{TYPE_LABELS[ass.type]}</span>
            <span className={`as-statut as-statut-${ass.statut}`}>{STATUT_LABELS[ass.statut]}</span>
            {ass.compagnie    && <span className="as-compagnie">{ass.compagnie}</span>}
            {ass.numero_police && <span className="as-police">Police : {ass.numero_police}</span>}
          </div>

          {(ass.courtier || ass.contact_courtier) && (
            <div className="as-detail-row">
              {ass.courtier         && <span className="as-detail-item"><span className="as-detail-label">Courtier :</span><span className="as-detail-value">{ass.courtier}</span></span>}
              {ass.contact_courtier && <span className="as-detail-item"><span className="as-detail-label">Contact :</span><span className="as-detail-value">{ass.contact_courtier}</span></span>}
            </div>
          )}

          {(ass.prime != null || ass.date_debut || ass.date_echeance || ass.date_paiement || ass.preavis_mois != null) && (
            <div className="as-detail-row">
              {ass.prime != null      && <span className="as-detail-item"><span className="as-detail-label">Prime :</span><span className="as-detail-value">{fmtAmount(ass.prime)}{ass.frequence_paiement ? FREQ_LABELS[ass.frequence_paiement] : ''}</span></span>}
              {ass.date_debut         && <span className="as-detail-item"><span className="as-detail-label">Début :</span><span className="as-detail-value">{fmtDate(ass.date_debut)}</span></span>}
              {ass.date_echeance      && <span className="as-detail-item"><span className="as-detail-label">Échéance :</span><span className="as-detail-value">{fmtDate(ass.date_echeance)}</span></span>}
              {ass.date_paiement      && <span className="as-detail-item"><span className="as-detail-label">Paiement :</span><span className="as-detail-value">{fmtDate(ass.date_paiement)}</span></span>}
              {ass.preavis_mois != null && <span className="as-detail-item"><span className="as-detail-label">Préavis :</span><span className="as-detail-value">{ass.preavis_mois} mois</span></span>}
            </div>
          )}

          {(ass.franchise != null || ass.valeur_assuree != null) && (
            <div className="as-detail-row">
              {ass.franchise      != null && <span className="as-detail-item"><span className="as-detail-label">Franchise :</span><span className="as-detail-value">{fmtAmount(ass.franchise)}</span></span>}
              {ass.valeur_assuree != null && <span className="as-detail-item"><span className="as-detail-label">Valeur assurée :</span><span className="as-detail-value">{fmtAmount(ass.valeur_assuree)}</span></span>}
            </div>
          )}

          <div className="as-options">
            {([
              [ass.perte_indirecte,     'Perte indirecte 10%'],
              [ass.protection_juridique, 'Protection juridique'],
              [ass.abandon_recours,      'Abandon de recours'],
              [ass.chomage_immobilier,   'Chômage immobilier'],
            ] as [boolean, string][]).map(([on, lbl]) => (
              <span key={lbl} className={`as-option ${on ? 'on' : 'off'}`}>{lbl}</span>
            ))}
          </div>

          {ass.notes && <p className="as-notes">{ass.notes}</p>}
        </div>

        <div className="as-acts">
          <button className="as-act-btn" onClick={() => { setEditAss(ass); setShowModal(true) }} title="Modifier"><IconPencil /></button>
          <button className="as-act-btn danger" onClick={() => deleteAss(ass)} title="Supprimer"><IconTrash /></button>
        </div>
      </div>
    )
  }

  function renderBien(bien: Bien, inBatiment = false) {
    const bienAss = assurances.filter(a => a.bien_id === bien.id)
    return (
      <div key={bien.id} className={inBatiment ? 'as-bat-bien' : 'as-bien'}>
        <div className={inBatiment ? 'as-bat-bien-hd' : 'as-bien-hd'}>
          <span className="as-bien-name">{bien.name}</span>
          <button className="as-bien-add" onClick={() => openModal({ bienId: bien.id })}>
            + Assurance
          </button>
        </div>
        {bienAss.length === 0 && !inBatiment
          ? <p className="as-empty">Aucune assurance configurée</p>
          : bienAss.map(renderAssCard)
        }
      </div>
    )
  }

  function renderBatiment(bat: Batiment) {
    const batBiens     = biens.filter(b => b.batiment_id === bat.id)
    const batAss       = assurances.filter(a => a.batiment_id === bat.id)
    const bienAssCount = batBiens.filter(b => assurances.some(a => a.bien_id === b.id)).length
    const isExpanded   = expandedBats.has(bat.id)

    return (
      <div key={bat.id} className="as-bat">
        <div className="as-bat-hd">
          <div className="as-bat-hd-main">
            <span className="as-bat-name">{bat.name}</span>
            {batBiens.length > 0 && (
              <div className="as-bat-chips">
                {batBiens.map(b => <span key={b.id} className="as-bat-chip">{b.name}</span>)}
              </div>
            )}
          </div>
          <button className="as-bien-add" onClick={() => openModal({ batimentId: bat.id })}>
            + Assurance bâtiment
          </button>
        </div>

        {batAss.length === 0 && <p className="as-empty">Aucune assurance bâtiment configurée</p>}
        {batAss.map(renderAssCard)}

        {batBiens.length > 0 && (
          <>
            <button className={`as-biens-toggle${isExpanded ? ' open' : ''}`} onClick={() => toggleBatBiens(bat.id)}>
              <svg className={`as-toggle-chevron${isExpanded ? ' open' : ''}`} viewBox="0 0 10 6" width="10" height="6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 1l4 4 4-4" />
              </svg>
              Assurances par bien
              {bienAssCount > 0 && (
                <span className="as-biens-count">{bienAssCount} configurée{bienAssCount > 1 ? 's' : ''}</span>
              )}
              <span className="as-biens-total">{batBiens.length} bien{batBiens.length > 1 ? 's' : ''}</span>
            </button>
            {isExpanded && batBiens.map(b => renderBien(b, true))}
          </>
        )}
      </div>
    )
  }

  function renderSoc(soc: Societe) {
    const socBatiments  = batiments.filter(bat => bat.societe_id === soc.id)
    const socStandalone = biens.filter(b => b.societe_id === soc.id && !b.batiment_id)
    if (socBatiments.length === 0 && socStandalone.length === 0) return null
    const isCollapsed = collapsed.has(soc.id)
    return (
      <div key={soc.id} className="as-soc">
        <button className="as-soc-hd" onClick={() => toggleSoc(soc.id)}>
          <div className="as-soc-dot" style={{ background: soc.owner?.color_css }} />
          <span className="as-soc-name">{soc.name}</span>
          <svg className={`as-chevron${isCollapsed ? ' collapsed' : ''}`} viewBox="0 0 10 6" width="10" height="6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 1l4 4 4-4" />
          </svg>
        </button>
        {!isCollapsed && (
          <div className="as-soc-body">
            {socBatiments.map(renderBatiment)}
            {socStandalone.map(b => renderBien(b, false))}
          </div>
        )}
      </div>
    )
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

  return (
    <div className="as-scroll">
      {allSocIds.length > 0 && (
        <div className="as-toolbar">
          <button className="ct-collapse-btn" onClick={() =>
            setCollapsed(allCollapsed ? new Set() : new Set(allSocIds))}>
            {allCollapsed ? 'Tout déployer' : 'Tout réduire'}
          </button>
        </div>
      )}
      {groups.map((g, i) => (
        <div key={g.profile?.id ?? i} className="as-group">
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
        <AssuranceModal
          biens={biens}
          batiments={batiments}
          defaultBienId={defaultBien}
          defaultBatimentId={defaultBatiment}
          editAssurance={editAss}
          onClose={() => { setShowModal(false); setEditAss(undefined) }}
          onSaved={loadAll}
        />
      )}
    </div>
  )
}
