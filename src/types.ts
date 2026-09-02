export type Category     = 'loyer' | 'fiscal' | 'tech' | 'admin'
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
}
