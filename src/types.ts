export type Category     = 'loyer' | 'fiscal' | 'tech' | 'admin'

export type ComptaFrequency = 'mensuel' | 'trimestriel' | 'semestriel' | 'annuel'
export type ComptaType      = 'tva' | 'versement' | 'loyer' | 'bilan' | 'isoc' | 'autre'

export interface ComptaTemplate {
  id:         string
  societe_id: string
  label:      string
  type:       ComptaType
  frequency:  ComptaFrequency
  due_day:    number
  due_month:  number | null   // only for annuel
  notes:      string | null
  active:     boolean
  created_at: string
}

export interface ComptaEntry {
  id:          string
  template_id: string
  period_key:  string         // e.g. "2025-01", "2025-Q2", "2025-S1", "2025"
  notes:       string | null
  created_at:  string
}
export type TaskStatus   = 'todo' | 'done'
export type DisplayStatus = 'overdue' | 'today' | 'week' | 'upcoming' | 'done'

export interface Profile {
  id:        string
  name:      string
  initials:  string
  color_css: string  // e.g. 'var(--uL)', 'var(--uP)', 'var(--uF)'
}

export interface Societe {
  id:         string
  name:       string
  legal_form: string | null
  owner_id:   string
  created_at: string
  owner:      Profile
}

export interface Bien {
  id:          string
  societe_id:  string
  name:        string
  lots_count:  number
  created_at:  string
}

export interface Tache {
  id:          string
  societe_id:  string
  bien_id:     string | null
  assigned_to: string | null
  title:       string
  notes:       string | null
  category:    Category
  status:      TaskStatus
  due_date:    string | null
  amount:      number | null
  recurrence:  string | null
  created_by:  string | null
  created_at:  string
  updated_at:  string
  societe:     Societe
  bien:        Bien | null
  assignee:    Profile | null
}
