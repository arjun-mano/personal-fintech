import type { ParsedAnalysis } from '@/types'

/**
 * Extract structured data from Claude's response text.
 * Splits on the A-E section headers the prompt asks Claude to use.
 */
export function parseClaudeResponse(text: string): ParsedAnalysis {
  // Split on section headers
  const sections = splitSections(text)

  return {
    savings_score: extractScore(sections.A ?? ''),
    savings_score_explanation: extractScoreExplanation(sections.A ?? ''),
    suggestions: extractSuggestions(sections.B ?? ''),
    category_budgets: extractBudgets(sections.C ?? ''),
    red_flags: extractRedFlags(sections.D ?? ''),
    summary: (sections.E ?? '').trim(),
  }
}

function splitSections(text: string): Record<string, string> {
  const result: Record<string, string> = {}

  // Match patterns like "**A) SAVINGS SCORE**", "A) SAVINGS SCORE", "## A)", etc.
  const sectionRegex = /\*{0,2}([A-E])\)\s*[A-Z\s\/]+\*{0,2}/g
  const matches: Array<{ key: string; index: number }> = []

  let m
  while ((m = sectionRegex.exec(text)) !== null) {
    matches.push({ key: m[1], index: m.index + m[0].length })
  }

  for (let i = 0; i < matches.length; i++) {
    const { key, index } = matches[i]
    const end = matches[i + 1]?.index ?? text.length
    result[key] = text.slice(index, end).trim()
  }

  return result
}

function extractScore(text: string): number {
  // Look for patterns like "7/10", "score: 7", "7 out of 10"
  const m = text.match(/(\d+)\s*(?:\/\s*10|out of 10)/i)
  if (m) return Math.min(10, Math.max(1, parseInt(m[1])))
  // Fallback: first standalone number 1-10
  const m2 = text.match(/\b([1-9]|10)\b/)
  if (m2) return parseInt(m2[1])
  return 5
}

function extractScoreExplanation(text: string): string {
  // Remove the score number line, return remaining text
  return text.replace(/^\d+\/10.*$/m, '').trim()
}

function extractSuggestions(text: string): ParsedAnalysis['suggestions'] {
  const suggestions: ParsedAnalysis['suggestions'] = []

  // Match numbered items: "1. Title\n description\n Estimated: ₹X"
  const itemRegex = /\d+\.\s+\*{0,2}(.+?)\*{0,2}\n([\s\S]+?)(?=\n\d+\.|$)/g
  let m

  while ((m = itemRegex.exec(text)) !== null && suggestions.length < 3) {
    const title = m[1].trim()
    const body = m[2].trim()

    // Extract estimated savings
    const savingMatch = body.match(/(?:estimated|savings?)[:\s]+₹?([\d,]+)/i)
    const estimated_saving = savingMatch ? `₹${savingMatch[1]}` : ''

    suggestions.push({
      title,
      description: body.replace(/estimated.*$/im, '').trim(),
      estimated_saving,
    })
  }

  // Fallback: split by numbered list
  if (suggestions.length === 0) {
    const lines = text.split('\n').filter((l) => /^\d+\./.test(l.trim()))
    for (const line of lines.slice(0, 3)) {
      suggestions.push({
        title: line.replace(/^\d+\.\s*/, '').trim(),
        description: '',
        estimated_saving: '',
      })
    }
  }

  return suggestions
}

function extractBudgets(text: string): ParsedAnalysis['category_budgets'] {
  const budgets: ParsedAnalysis['category_budgets'] = []

  // Look for table rows: | Category | ₹X | ₹Y |
  const rowRegex = /\|\s*([^|]+?)\s*\|\s*₹?([\d,]+)\s*\|\s*₹?([\d,]+)\s*\|/g
  let m

  while ((m = rowRegex.exec(text)) !== null) {
    const category = m[1].trim()
    if (category.toLowerCase().includes('category') || category.toLowerCase().includes('---')) continue

    const actual = parseInt(m[2].replace(/,/g, '')) || 0
    const recommended = parseInt(m[3].replace(/,/g, '')) || 0

    budgets.push({ category, actual, recommended })
  }

  return budgets
}

function extractRedFlags(text: string): string[] {
  const lower = text.toLowerCase()
  if (lower.includes('no red flags') || lower.includes('none')) return []

  // Extract bullet points
  const flags: string[] = []
  const lines = text.split('\n')
  for (const line of lines) {
    const trimmed = line.replace(/^[-*•]\s*/, '').trim()
    if (trimmed.length > 10) flags.push(trimmed)
  }

  return flags.filter(Boolean)
}
