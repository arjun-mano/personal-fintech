'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatINR, formatMonth, currentMonth } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CATEGORY_LABELS } from '@/lib/categorizer'
import type { Transaction, Category } from '@/types'

const CATEGORY_COLORS: Record<Category, string> = {
  food_delivery: 'bg-orange-100 text-orange-800',
  groceries: 'bg-green-100 text-green-800',
  fuel: 'bg-red-100 text-red-800',
  transport: 'bg-blue-100 text-blue-800',
  utilities: 'bg-yellow-100 text-yellow-800',
  emi_loan: 'bg-purple-100 text-purple-800',
  rent: 'bg-pink-100 text-pink-800',
  entertainment: 'bg-indigo-100 text-indigo-800',
  shopping: 'bg-teal-100 text-teal-800',
  medical: 'bg-cyan-100 text-cyan-800',
  salary: 'bg-emerald-100 text-emerald-800',
  transfer: 'bg-gray-100 text-gray-800',
  atm: 'bg-slate-100 text-slate-800',
  other: 'bg-gray-100 text-gray-600',
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(currentMonth())
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      setLoading(true)
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('month', month)
        .order('date', { ascending: false })

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter)
      }

      const { data } = await query
      setTransactions((data ?? []) as Transaction[])
      setLoading(false)
    }
    load()
  }, [month, categoryFilter])

  const filtered = transactions.filter((t) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      t.description.toLowerCase().includes(q) ||
      (t.merchant_clean ?? '').toLowerCase().includes(q)
    )
  })

  const totalDebit = filtered.reduce((s, t) => s + (t.debit ?? 0), 0)
  const totalCredit = filtered.reduce((s, t) => s + (t.credit ?? 0), 0)

  async function updateCategory(id: string, category: Category) {
    await supabase.from('transactions').update({ category }).eq('id', id)
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, category } : t))
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-1">Transactions</h1>
      <p className="text-muted-foreground mb-4">{formatMonth(month)}</p>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="h-9 px-3 rounded-md border border-input bg-background text-sm"
        />
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-48"
        />
        <Select value={categoryFilter} onValueChange={(v) => v && setCategoryFilter(v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary bar */}
      <div className="flex gap-6 mb-4 text-sm">
        <span>{filtered.length} transactions</span>
        <span className="text-red-600">Spent: {formatINR(totalDebit)}</span>
        <span className="text-green-600">Received: {formatINR(totalCredit)}</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-muted-foreground py-12 text-center">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">No transactions found.</div>
      ) : (
        <div className="rounded-lg border overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Merchant / Description</th>
                <th className="text-left px-4 py-3 font-medium">Category</th>
                <th className="text-right px-4 py-3 font-medium">Debit</th>
                <th className="text-right px-4 py-3 font-medium">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{t.date}</td>
                  <td className="px-4 py-3 max-w-xs">
                    <div className="font-medium truncate">{t.merchant_clean || t.description}</div>
                    {t.merchant_clean && (
                      <div className="text-xs text-muted-foreground truncate">{t.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={t.category}
                      onChange={(e) => updateCategory(t.id, e.target.value as Category)}
                      className={`text-xs px-2 py-1 rounded-full border-0 font-medium cursor-pointer ${CATEGORY_COLORS[t.category as Category] ?? ''}`}
                    >
                      {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right text-red-600 font-medium whitespace-nowrap">
                    {t.debit ? formatINR(t.debit) : ''}
                  </td>
                  <td className="px-4 py-3 text-right text-green-600 font-medium whitespace-nowrap">
                    {t.credit ? formatINR(t.credit) : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
