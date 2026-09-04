#!/usr/bin/env node
/**
 * Checks a copy of this dataset against the promises the README makes about it.
 *
 * No dependencies, on purpose: anyone who has cloned the data can run it with
 * the node they already have, and a validator that needs an install is one
 * nobody downstream runs.
 *
 * What it does not do is recompute any tax. The engine that reads these tables
 * is not published, and a validator that reimplemented it would be checking its
 * own arithmetic rather than the data. What it checks is the part a consumer
 * would otherwise have to trust: that every claim of verification has evidence
 * behind it, and that the evidence points at something real. A source the
 * refetch journal does not watch is reported as a warning rather than a
 * failure, for the reason given where that check is made.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const problems = []
const warnings = []
const notes = []

/** The last entry whose effectiveFrom is not after the date, as a consumer selects one. */
function entryFor(entries, date) {
  let chosen
  for (const entry of entries) if (entry.effectiveFrom <= date) chosen = entry
  return chosen
}

function read(path) {
  return JSON.parse(readFileSync(join(root, path), 'utf8'))
}

const years = existsSync(join(root, 'data/tax'))
  ? readdirSync(join(root, 'data/tax')).filter((name) => /^\d{4}$/.test(name))
  : []

if (!years.length) problems.push('data/tax holds no year directory')

const journal = read('data/source-checks.json')
if (!Array.isArray(journal)) problems.push('data/source-checks.json is not an array')
const watched = new Set(journal.map((row) => row.sourceUrl))

for (const [index, row] of journal.entries()) {
  if (!row.sourceUrl) problems.push(`source-checks[${index}] has no sourceUrl`)
  if (typeof row.checkedAt !== 'number')
    problems.push(`source-checks[${index}] (${row.sourceUrl}) has no checkedAt`)
}

for (const year of years) {
  const dir = `data/tax/${year}`

  for (const file of ['federal.json', 'fica.json']) {
    const table = read(`${dir}/${file}`)
    if (String(table.year) !== year) problems.push(`${dir}/${file} says year ${table.year}`)
    if (!table.sourceUrl) problems.push(`${dir}/${file} names no source`)
    if (table.verified && !table.verifiedOn)
      problems.push(`${dir}/${file} claims verified without a date`)
  }

  const { states } = read(`${dir}/state-income-tax.json`)
  const controls = read(`${dir}/control-examples.json`)

  if (!states || typeof states !== 'object') {
    problems.push(`${dir}/state-income-tax.json carries no states`)
    continue
  }

  for (const [code, entries] of Object.entries(states)) {
    if (!Array.isArray(entries) || !entries.length) {
      problems.push(`${code} carries no entries`)
      continue
    }

    let previous = ''
    for (const entry of entries) {
      const where = `${code} ${entry.effectiveFrom}`

      if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.effectiveFrom ?? ''))
        problems.push(`${code} has an entry with no effectiveFrom`)
      else if (entry.effectiveFrom <= previous)
        problems.push(`${where} does not come after ${previous}: entries must be in order`)
      previous = entry.effectiveFrom

      if (!['graduated', 'flat', 'elected_rate', 'none'].includes(entry.taxType))
        problems.push(`${where} has taxType ${JSON.stringify(entry.taxType)}`)

      if (typeof entry.verified !== 'boolean') problems.push(`${where} does not say verified`)
      if (!entry.sourceUrl) problems.push(`${where} names no source`)
      else if (!watched.has(entry.sourceUrl))
        // A warning and not a failure: the journal records a row only for a
        // source it could fetch, so a department that refuses automated
        // requests outright leaves none. The source is real and was read by a
        // person; what is missing is the machine watching it for changes.
        warnings.push(`${where} cites ${entry.sourceUrl}, which the refetch journal does not watch`)

      if (entry.verified === false && !entry.sourceNote)
        problems.push(`${where} is unverified and does not say what is missing`)
    }
  }

  const codes = new Set(Object.keys(states))
  const selected = new Set()

  for (const [index, control] of controls.entries()) {
    const where = `control-examples[${index}] (${control.state})`

    if (!codes.has(control.state)) {
      problems.push(`${where} names a state the tables do not carry`)
      continue
    }
    if (!Number.isFinite(control.expected)) problems.push(`${where} expects no figure`)
    if (!control.source?.trim()) problems.push(`${where} cites no document`)

    // The same rule a consumer applies, so a fixture cannot pin an entry that
    // no pay date would ever reach.
    const entry = entryFor(states[control.state], control.payDate ?? `${year}-12-31`)
    if (!entry) problems.push(`${where} selects no entry of ${control.state}`)
    else selected.add(entry)
  }

  /**
   * Only the graduated entries. A state with no wage income tax has no answer to
   * reproduce, and the flat and elected-rate states are verified against the
   * closed list of rates on their own form rather than against a worked example,
   * because there is no formula for an example to work through.
   */
  for (const [code, entries] of Object.entries(states)) {
    for (const entry of entries) {
      if (!entry.verified || entry.taxType !== 'graduated') continue
      if (!selected.has(entry))
        problems.push(
          `${code} ${entry.effectiveFrom} claims verified and no control example selects it`,
        )
    }
  }

  const verified = Object.values(states).flat().filter((entry) => entry.verified).length
  const total = Object.values(states).flat().length
  notes.push(`${year}: ${total} entries, ${verified} verified, ${controls.length} control examples`)
}

for (const note of notes) console.log(note)

if (warnings.length) {
  console.log(`
${warnings.length} warning${warnings.length === 1 ? '' : 's'}:`)
  for (const warning of warnings) console.log(`  ${warning}`)
}

if (problems.length) {
  console.error(`\n${problems.length} problem${problems.length === 1 ? '' : 's'}:`)
  for (const problem of problems) console.error(`  ${problem}`)
  process.exit(1)
}

console.log('\nEverything the README promises about this data holds.')
