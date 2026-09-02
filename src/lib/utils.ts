import type { DisplayStatus } from '../types'

export function getDisplayStatus(status: string, dueDate: string | null): DisplayStatus {
  if (status === 'done') return 'done'
  if (!dueDate) return 'upcoming'

  const due = new Date(dueDate + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.floor((due.getTime() - today.getTime()) / 86400000)

  if (diff < 0) return 'overdue'
  if (diff === 0) return 'today'
  if (diff <= 6) return 'week'
  return 'upcoming'
}

export function formatDue(dueDate: string | null, ds: DisplayStatus): string {
  if (!dueDate) return '—'
  if (ds === 'today') return "Auj."
  const d = new Date(dueDate + 'T00:00:00')
  return d.toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit' })
}

export function formatAmount(amount: number | null): string | null {
  if (!amount) return null
  return amount.toLocaleString('fr-BE') + ' €'
}
