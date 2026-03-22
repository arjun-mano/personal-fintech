import type { Bank, ParsedTransaction } from '@/types'
import { parseHdfcCsv, parseHdfcPdf, parseHdfcTxt, enrichWithMeta as hdfcEnrich } from './hdfc'
import { parseSbiCsv, enrichWithMeta as sbiEnrich } from './sbi'
import { parseIciciCsv, enrichWithMeta as iciciEnrich } from './icici'
import { parseAxisCsv, enrichWithMeta as axisEnrich } from './axis'
import { parseKotakCsv, parseKotakPdf, enrichWithMeta as kotakEnrich } from './kotak'

export type EnrichedTransaction = ParsedTransaction & {
  statement_id: string
  user_id: string
  month: string
  merchant_clean: string
  category: string
  is_recurring: boolean
}

export function parseStatement(
  content: string,
  bank: Bank,
  fileType: 'csv' | 'pdf' | 'txt',
  statementId: string,
  userId: string
): EnrichedTransaction[] {
  let raw: ParsedTransaction[]

  switch (bank) {
    case 'HDFC':
      if (fileType === 'pdf') raw = parseHdfcPdf(content)
      else if (fileType === 'txt') raw = parseHdfcTxt(content)
      else raw = parseHdfcCsv(content)
      return hdfcEnrich(raw, statementId, userId)
    case 'SBI':
      raw = parseSbiCsv(content)
      return sbiEnrich(raw, statementId, userId)
    case 'ICICI':
      raw = parseIciciCsv(content)
      return iciciEnrich(raw, statementId, userId)
    case 'AXIS':
      raw = parseAxisCsv(content)
      return axisEnrich(raw, statementId, userId)
    case 'KOTAK':
      raw = fileType === 'csv' ? parseKotakCsv(content) : parseKotakPdf(content)
      return kotakEnrich(raw, statementId, userId)
    default:
      return []
  }
}
