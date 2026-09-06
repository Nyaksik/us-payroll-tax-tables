# US payroll withholding tables, 2026

Machine-readable federal, FICA and state income tax withholding tables for United States
payroll, together with the published worked examples each verified state is checked
against.

Every figure here was read out of a revenue department document and carries a link to it.
Nothing was inferred, averaged or copied from another aggregator.

## What is in here

| Path                                       | What it holds                                                              |
| ------------------------------------------ | -------------------------------------------------------------------------- |
| `data/tax/2026/federal.json`               | IRS Publication 15-T percentage method, standard and Step 2 schedules       |
| `data/tax/2026/fica.json`                  | Social Security and Medicare rates, wage base and Additional Medicare       |
| `data/tax/2026/state-income-tax.json`      | 54 state withholding entries across 51 jurisdictions                        |
| `data/tax/2026/state-other-withholding.json` | State disability, family leave and other mandatory employee withholdings  |
| `data/tax/2026/control-examples.json`      | 100 published calculations the tables are tested against                    |
| `data/source-checks.json`                  | When each source URL was last fetched, and the hash of the text then        |
| `data/tax/2026/control-examples.csv`       | The control examples again, as a table                                      |
| `data/source-checks.csv`                   | The source journal again, as a table                                        |

Field by field, [SCHEMA.md](./SCHEMA.md) says what every key means.

The two CSV files are derived from the JSON beside them, written by the mirror on every
run and never by hand, so they cannot drift from it. They exist so that a catalogue can
show the rows as a table, which it does for CSV and not for JSON. The JSON is the source:
a column is the union of every key any row carries, and a nested value, such as the
exemption counts of an Indiana example, sits in its cell as JSON. The other four files
are objects and maps, and a CSV of them would have to invent its columns.

## How it is verified

A state entry carries `verified: true` only when a test reproduces the state's own
published calculation. Not a review, not a second pair of eyes on the transcription: an
arithmetic agreement with a figure the state printed.

Four kinds of published calculation count, and every one of them is a document, not an
opinion:

1. **A worked example from the state's withholding guide.** The state shows its working
   and we reproduce the answer.
2. **The answer of the calculator the state runs itself**, where the state publishes no
   worked example. Marked `notFromGuide: true`, because a calculator shows the answer and
   not the working.
3. **The closed list of rates from the state's own form**, where the state has no formula
   at all and withholding is a single multiplication.
4. **A printed withholding table of the department, read in at least two places.** One cell
   can pass by accident when a wrong deduction is cancelled by the width of a bracket; two
   cells in different rows or different columns do not forgive that. Such a fixture names
   the row and the column, because a bracket is read at its middle and the next reader
   would otherwise take its lower edge.

Reprinting the constants of a formula is not one of them. It catches a typo in a number and
does not catch an error in the order of operations.

The method behind those four kinds, and the reasoning for each, is written up at
[paystubdesk.com/how-we-verify](https://paystubdesk.com/how-we-verify).

`data/tax/2026/control-examples.json` is that evidence, one row per check, each naming the
document it came from. A row's `note` says why it is the row it is: which cell of a printed
table it reads, why the pair either side of a bracket edge is a pair, where its `tolerance`
comes from.

## The two states that carry no such example

Colorado and the District of Columbia are the entries with `verified: false`. Neither is a
tail of work left undone. There is nothing of the state's own to close them with:

- **Colorado.** DR 1098 states the four steps of the calculation and prints no worked
  example. What the department calls an electronic calculator is that same worksheet in a
  spreadsheet, with the allowance typed in by hand.
- **District of Columbia.** No withholding booklet has been published since FR-230
  Rev. 11/17. OTR Tax Notice 2022-08 sends employers to the current rate schedule and to
  the federal allowance amount instead, which is the $4,300 of IRS Publication 15-T (2026)
  the entry carries.

Their figures are entered and sourced like every other entry. What is missing is the
state's own answer to check them against, and the entry says so in `sourceNote`.

## Where these tables are used

They are the tables behind [PayStub Desk](https://paystubdesk.com), a pay stub generator,
and its per-state paycheck calculators.
The same files run in production; this repository mirrors them from the application's
`main` branch, so what is published here is what is computed with, not a copy kept
alongside.

## Licence

The data in `data/`, including the control examples, is licensed
**[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)**. Use it, redistribute it,
build on it, commercially or not. Attribute it as:

> US payroll tax tables by [PayStub Desk](https://paystubdesk.com), licensed under
> [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

The validator and any other code in this repository is **MIT**, see
[LICENSE-CODE](./LICENSE-CODE).

The underlying figures are facts published by United States federal and state revenue
departments and are not themselves copyrightable. The licence covers this compilation of
them: the structure, the notes and the control examples.

## Validating a copy

```bash
node validate.mjs
```

No dependencies. It checks the shape of every file, that each verified graduated entry has
at least one control example that selects it, that each control example names a state the
tables carry, and that each `sourceUrl` appears in the source-check journal.
