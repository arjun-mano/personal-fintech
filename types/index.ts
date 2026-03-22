export type Bank = 'HDFC' | 'SBI' | 'ICICI' | 'AXIS' | 'KOTAK'

export type ParseStatus = 'pending' | 'done' | 'error'

export type Category =
  | 'food_delivery'
  | 'groceries'
  | 'fuel'
  | 'transport'
  | 'utilities'
  | 'emi_loan'
  | 'rent'
  | 'entertainment'
  | 'shopping'
  | 'medical'
  | 'salary'
  | 'transfer'
  | 'atm'
  | 'other'

export interface Profile {
  id: string
  email: string | null
  name: string | null
  created_at: string
}

export interface Statement {
  id: string
  user_id: string
  file_name: string
  file_path: string
  bank: Bank
  month: string
  parse_status: ParseStatus
  parse_error: string | null
  raw_text: string | null
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  statement_id: string | null
  date: string
  description: string
  debit: number | null
  credit: number | null
  balance: number | null
  category: Category
  is_recurring: boolean
  merchant_clean: string | null
  month: string
  created_at: string
}

export interface RecurringExpense {
  id: string
  user_id: string
  merchant_clean: string
  avg_amount: number | null
  frequency: 'monthly' | 'weekly' | 'irregular'
  last_seen_month: string | null
  first_seen_month: string | null
  occurrence_count: number
  is_confirmed: boolean
  is_dismissed: boolean
  created_at: string
  updated_at: string
}

export interface PlannedExpense {
  id: string
  user_id: string
  month: string
  label: string
  amount: number
  category: Category
  recurring_ref_id: string | null
  created_at: string
}

export interface ParsedAnalysis {
  savings_score: number
  savings_score_explanation: string
  suggestions: Array<{ title: string; description: string; estimated_saving: string }>
  category_budgets: Array<{ category: string; actual: number; recommended: number }>
  red_flags: string[]
  summary: string
}

export interface ClaudeSession {
  id: string
  user_id: string
  month: string
  generated_prompt: string
  pasted_response: string | null
  parsed_analysis: ParsedAnalysis | null
  status: 'pending' | 'responded'
  created_at: string
  responded_at: string | null
}

export interface ParsedTransaction {
  date: string
  description: string
  debit: number | null
  credit: number | null
  balance: number | null
}
