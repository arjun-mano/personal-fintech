import type { Category } from '@/types'

/**
 * Keyword → category rules (case-insensitive substring match).
 * First match wins, so order matters — put more specific rules first.
 */
const RULES: Array<{ keywords: string[]; category: Category }> = [
  // Salary / income
  { keywords: ['salary', 'payroll', 'stipend', 'neft-salary', 'sal-'], category: 'salary' },

  // EMI / Loans
  { keywords: ['emi', 'loan', 'home loan', 'car loan', 'hdfc bank-emi', 'bajaj finserv', 'lic', 'icici lombard'], category: 'emi_loan' },

  // Rent
  { keywords: ['rent', 'rentpay', 'nobroker', 'housing'], category: 'rent' },

  // Food delivery
  { keywords: ['swiggy', 'zomato', 'eatsure', 'dunzo', 'blinkit food', 'magicpin'], category: 'food_delivery' },

  // Groceries
  { keywords: ['bigbasket', 'grofers', 'blinkit', 'jiomart', 'dmart', 'reliance fresh', 'nature basket', 'more supermarket', 'spar', 'zepto', 'instamart'], category: 'groceries' },

  // Fuel
  { keywords: ['bpcl', 'iocl', 'hpcl', 'indian oil', 'petrol', 'fuel', 'shell', 'reliance bp'], category: 'fuel' },

  // Transport
  { keywords: ['uber', 'ola', 'rapido', 'metro', 'irctc', 'railway', 'redbus', 'makemytrip-bus', 'yatra', 'flight', 'indigo', 'airindia', 'spicejet', 'paytm-travel', 'fastag', 'toll'], category: 'transport' },

  // Utilities
  { keywords: ['electricity', 'bescom', 'msedcl', 'tata power', 'adani electricity', 'water bill', 'gas bill', 'mahanagar gas', 'igl', 'mgl', 'internet', 'airtel', 'jio', 'vi-', 'vodafone', 'bsnl', 'act fibernet', 'hathway', 'tata sky', 'dish tv', 'nsk broadband'], category: 'utilities' },

  // Entertainment
  { keywords: ['netflix', 'amazon prime', 'prime video', 'hotstar', 'disney', 'spotify', 'apple music', 'youtube premium', 'zee5', 'sonyliv', 'gaana', 'bookmyshow', 'pvr', 'inox', 'movie'], category: 'entertainment' },

  // Medical
  { keywords: ['apollo', 'medplus', 'netmeds', '1mg', 'pharmeasy', 'practo', 'hospital', 'clinic', 'pharmacy', 'chemist', 'medicine', 'diagnostic', 'path lab', 'tata 1mg'], category: 'medical' },

  // Shopping
  { keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'meesho', 'snapdeal', 'tatacliq', 'reliance digital', 'croma', 'vijay sales', 'decathlon', 'ikea', 'pepperfry', 'urban ladder'], category: 'shopping' },

  // ATM / Cash
  { keywords: ['atm', 'cash withdrawal', 'atm wdl'], category: 'atm' },

  // Transfer (peer-to-peer, self-transfer)
  { keywords: ['upi-', 'neft', 'imps', 'rtgs', 'self transfer', 'own account'], category: 'transfer' },
]

export function categorize(merchantClean: string, description: string): Category {
  const haystack = (merchantClean + ' ' + description).toLowerCase()

  for (const rule of RULES) {
    if (rule.keywords.some((kw) => haystack.includes(kw.toLowerCase()))) {
      return rule.category
    }
  }

  return 'other'
}

export const CATEGORY_LABELS: Record<Category, string> = {
  food_delivery: 'Food Delivery',
  groceries: 'Groceries',
  fuel: 'Fuel',
  transport: 'Transport',
  utilities: 'Utilities',
  emi_loan: 'EMI / Loans',
  rent: 'Rent',
  entertainment: 'Entertainment',
  shopping: 'Shopping',
  medical: 'Medical',
  salary: 'Salary / Income',
  transfer: 'Transfers',
  atm: 'ATM / Cash',
  other: 'Other',
}
