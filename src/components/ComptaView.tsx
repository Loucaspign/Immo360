import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Societe, Profile, ComptaTemplate, ComptaEntry } from '../types'
import { ComptaTemplateModal } from './ComptaTemplateModal'

const FR_MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

interface Period { key: string; label: string; dueDate: string }

function getPeriods(t: ComptaTemplate, year: number): Period[] {
  const clampDay = (y: number, m: number, d: number) =>
    `${y}-${String(m).padStart(2,'0')}-${String(Math.min(d, new Date(y, m, 0).getDate())).padStart(2,'0')}`

  if (t.frequency === 'mensuel') {
    return Array.from({ length: 12 }, (_, i) => ({
      key:     `${year}-${String(i + 1).padStart(2,'0')}`,
      label:   FR_MONTHS[i],
      dueDate: clampDay(year, i + 1, t.due_day),
    }))
  }
  if (t.frequency === 'trimestriel') {
    return [1,2,3,4].map(q => {
      const dm = q * 3 + 1
      const dy = dm > 12 ? year + 1 : year
      const dmn = dm > 12 ? dm - 12 : dm
      return { key: `${year}-Q${q}`, label: `T${q}`, dueDate: clampDay(dy, dmn, t.due_day) }
    })
  }
  if (t.frequency === 'semestriel') {
    return [1,2].map(s => {
      const dm = s * 6 + 1
      const dy = dm > 12 ? year + 1 : year
      const dmn = dm > 12 ? dm - 12 : dm
      return { key: `${year}-S${s}`, label: `S${s}`, dueDate: clampDay(dy, dmn, t.due_day) }
    })
  }
  // annuel
  const m = t.due_month ?? 6
  return [{ key: `${year}`, label: `${year}`, dueDate: clampDay(year, m, t.due_day) }]
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
  profiles:    Profile[]
  activeOwner: string
  refreshKey:  number
}

export function ComptaView({ societes, profiles, activeOwner, refreshKey }: Props) {
  const [templates,   setTemplates]   = useState<ComptaTemplate[]>([])
  const [entries,     setEntries]     = useState<ComptaEntry[]>([])
  const [year,        setYear]        = useState(new Date().getFullYear())
  const [showModal,   setShowModal]   = useState(false)
  const [editTmpl,    setEditTmpl]    = useState<ComptaTemplate | undefined>()
  const [defaultSoc,  setDefaultSoc]  = useState('')
  const [toggling,    setToggling]    = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const soonDate = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10)

  useEffect(() => { loadAll() }, [refreshKey])

  async function loadAll() {
    const [tr, en] = await Promise.all([
      supabase.from('compta_templates').select('*').eq('active', true).order('label'),
      supabase.from('compta_entries').select('*'),
    ])
    if (tr.data) setTemplates(tr.data as ComptaTemplate[])
    if (en.data) setEntries(en.data as ComptaEntry[])
  }

  async function toggle(tmpl: ComptaTemplate, periodKey: string) {
    const uid = `${tmpl.id}::${periodKey}`
    if (toggling === uid) return
    setToggling(uid)
    const existing = entries.find(e => e.template_id === tmpl.id && e.period_key === periodKey)
    if (existing) {
      await supabase.from('compta_entries').delete().eq('id', existing.id)
      setEntries(prev => prev.filter(e => e.id !== existing.id))
    } else {
      const { data, error } = await supabase
        .from('compta_entries')
        .insert({ template_id: tmpl.id, period_key: periodKey })
        .select('*').single()
      if (!error && data) setEntries(prev => [...prev, data as ComptaEntry])
    }
    setToggling(null)
  }

  async function deleteTmpl(tmpl: ComptaTemplate) {
    if (!window.confirm(`Supprimer « ${tmpl.label} » ?`)) return
    await supabase.from('compta_templates').update({ active: false }).eq('id', tmpl.id)
    setTemplates(prev => prev.filter(t => t.id !== tmpl.id))
  }

  const doneSet = new Set(entries.map(e => `${e.template_id}::${e.period_key}`))

  // Filter societes by active owner
  const visibleSocs = activeOwner === 'all'
    ? societes
    : societes.filter(s => s.owner_id === activeOwner)

  // Group by owner when "tout voir"
  const groups: { profile: Profile | null; socs: Societe[] }[] =
    activeOwner !== 'all'
      ? [{ profile: null, socs: visibleSocs }]
      : profiles.map(p => ({ profile: p, socs: visibleSocs.filter(s => s.owner_id === p.id) }))
               .filter(g => g.socs.length > 0)

  function renderSoc(soc: Societe) {
    const socTmpls = templates.filter(t => t.societe_id === soc.id)
    return (
      <div key={soc.id} className="ct-soc">
        <div className="ct-soc-hd">
          <div className="ct-soc-dot" style={{ background: soc.owner?.color_css }} />
          <span className="ct-soc-name">{soc.name}</span>
          <button
            className="ct-add-btn"
            onClick={() => { setDefaultSoc(soc.id); setEditTmpl(undefined); setShowModal(true) }}
          >
            + Obligation
          </button>
        </div>

        {socTmpls.length === 0 ? (
          <p className="ct-empty">Aucune obligation configurée</p>
        ) : (
          <div className="ct-table">
            {socTmpls.map(tmpl => {
              const periods = getPeriods(tmpl, year)
              return (
                <div key={tmpl.id} className="ct-row">
                  <div className="ct-row-info">
                    <span className="ct-row-name">{tmpl.label}</span>
                    <span className="ct-row-freq">{tmpl.frequency}</span>
                  </div>
                  <div className="ct-chips">
                    {periods.map(p => {
                      const dk   = `${tmpl.id}::${p.key}`
                      const done = doneSet.has(dk)
                      const late = !done && p.dueDate < today
                      const soon = !done && !late && p.dueDate <= soonDate
                      const cls  = `ct-chip${done ? ' done' : late ? ' late' : soon ? ' soon' : ''}`
                      return (
                        <button key={p.key} className={cls} onClick={() => toggle(tmpl, p.key)}
                          title={`Échéance : ${p.dueDate}`} disabled={toggling === dk}>
                          {done && <svg viewBox="0 0 10 8" width="10" height="8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4l3 3 5-6"/></svg>}
                          {p.label}
                        </button>
                      )
                    })}
                  </div>
                  <div className="ct-row-acts">
                    <button className="ct-act-btn" onClick={() => { setEditTmpl(tmpl); setShowModal(true) }} title="Modifier"><IconPencil /></button>
                    <button className="ct-act-btn danger" onClick={() => deleteTmpl(tmpl)} title="Supprimer"><IconTrash /></button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="ct-scroll">
      <div className="ct-toolbar">
        <div className="ct-year-nav">
          <button className="ct-yr-btn" onClick={() => setYear(y => y - 1)}>‹</button>
          <span className="ct-year">{year}</span>
          <button className="ct-yr-btn" onClick={() => setYear(y => y + 1)}>›</button>
        </div>
      </div>

      {groups.map((g, i) => (
        <div key={g.profile?.id ?? i}>
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
        <ComptaTemplateModal
          societes={societes}
          defaultSocId={defaultSoc}
          editTemplate={editTmpl}
          onClose={() => { setShowModal(false); setEditTmpl(undefined) }}
          onSaved={loadAll}
        />
      )}
    </div>
  )
}
