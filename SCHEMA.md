# Schema

What every key in `data/` means. Amounts are US dollars per year unless the key says
otherwise; rates are decimal fractions, so `0.0495` is 4.95 per cent.

The lists below are the keys that actually appear in the 2026 files, not a superset a
future year might use. **An entry that does not carry a key does not have it. Absent is not
zero:** a state with no `annualStandardDeduction` gives none, it does not give nothing.

## Citations

Every key named `sourceUrl`, or ending in `SourceUrl`, is a citation: an `https://` URL of
the document the figure beside it was read out of. **`noteSourceUrl` alone may also be a
list of such URLs**, where the note speaks for more than one publisher: Missouri's names
two cities' earnings taxes, and neither city's page says anything of the other's. A
consumer that reads `noteSourceUrl` has to accept both shapes. Every other citation is one
string. `validate.mjs` holds the data to exactly that.

The citation keys in the 2026 files, so that a consumer collecting sources need not
discover them one entry at a time:

| Key                                   | File                          | Cites                                                        |
| ------------------------------------- | ----------------------------- | ------------------------------------------------------------ |
| `sourceUrl`                           | every file                    | The rates, schedules or figures of the record it sits on     |
| `baseSourceUrl`                       | state income tax, other withholding | The wages the tax is charged on, `taxableWageBase` or `base` |
| `noteSourceUrl`                       | state income tax              | The claim made in `note`, where that is not the guide        |
| `lowIncomeExemptionSourceUrl`         | state income tax (MD)         | The per-period floor in `lowIncomeExemptionPerPeriod`        |
| `roundsToWholeDollarSourceUrl`        | state income tax (WV)         | The rounding rule in `roundsToWholeDollar`                   |
| `countyTax.defaultRateSourceUrl`      | state income tax (MD)         | The rate withheld from an employee who named no county       |
| `sourceUrl` inside a block            | state income tax, other withholding | The form or page behind that block: `withoutCertificate`, `exemptionClaimed`, `bothSpousesWorking`, `oneIncomeOnRequest`, `cafeteriaHsaTaxed`, `nonresidency.exemptions`, `periodAdjustments.extra` |

## `data/tax/<year>/state-income-tax.json`

```
{ year, note, states: { "<two-letter code>": [ Entry, ... ] } }
```

A state holds a **list** of entries, not one table. Each applies from its own
`effectiveFrom`, and the entry in force on a pay date is the last one whose
`effectiveFrom` is not after that date. Georgia, Indiana, Ohio and Utah carry two entries
for 2026, because their tables changed mid-year.

### On every entry

| Key             | Meaning                                                                                                  |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| `effectiveFrom` | ISO date the entry applies from                                                                            |
| `taxType`       | `graduated` (44), `flat` (1), `elected_rate` (1), or `none` (9) for a state with no wage income tax        |
| `verified`      | `true` only where a control example reproduces the state's own published answer. False on `CO` and `DC`   |
| `sourceUrl`     | The document the figures were read out of                                                                  |

### On some entries, whatever the calculation

| Key                   | Where it appears | Meaning                                                                                  |
| --------------------- | ---------------- | ------------------------------------------------------------------------------------------ |
| `effectiveBy`         | 3 (IN, OH, UT)   | Which date of the pay period is compared with `effectiveFrom`. Absent, the pay date. `periodStart` where the state's tables apply to pay periods beginning on or after the date (IN, UT), `periodEnd` where to payrolls ending on or after it (OH). Never on a state's first entry of a year |
| `taxableWageBase`     | 46, every entry that taxes wages | Which pre-tax deductions come off the wages the tax is charged on: `gross_less_pre_tax` (the federal income tax base, both a cafeteria plan premium and a retirement deferral off), `gross_less_section_125` (the deferral stays in, PA) or `gross_less_retirement` (the premium stays in, NJ) |
| `baseSourceUrl`       | 46               | The document the base was read out of, which is seldom the one the rates are in            |
| `baseUnstatedByState` | 4 (GA, MS, NM)   | `true` where the state never wrote the base down and the entry carries the federal default instead. `sourceNote` says which half rests on the state's words |

### The ordinary calculation

Annual wages, less the standard deduction, less exemptions for allowances claimed, through
the brackets, then credits for those same allowances.

| Key                      | Where it appears | Meaning                                                                                  |
| ------------------------ | ---------------- | ------------------------------------------------------------------------------------------ |
| `brackets`               | 44 entries       | Rate schedule per filing status, as `[floor, tax at floor, rate above]` rows               |
| `annualStandardDeduction`| 18               | Per filing status. GA, MS and MO add `married_jointly_sole_earner`, the column for a joint filer whose spouse does not work |
| `exemptionPerAllowance`  | 23               | What one claimed allowance takes off the base                                               |
| `creditPerAllowance`     | 5                | What one claimed allowance takes off the tax instead                                        |
| `dependentAllowance`     | 1                | Where a dependant is worth a different figure from an allowance                             |
| `sourceNote`             | 48               | What the source is and where it is silent. On an unverified entry, what is missing          |
| `note`, `noteSourceUrl`  | 26 / 13          | A caveat the document itself should carry, and where it comes from. `noteSourceUrl` is one URL, or a list of URLs where the caveat rests on more than one publisher (MO, four) |
| `unmodelledLocalTax`     | 12               | The state has local wage taxes these tables do not compute. The consumer should say so rather than print a silent zero |

### Where a state departs from that

Each of these exists because one state does it, and the key is named after what that state
does rather than after the state.

| Key                                   | State | What it does                                                                            |
| ------------------------------------- | ----- | ----------------------------------------------------------------------------------------- |
| `deductionPhaseOut`                   | ME, WI| The standard deduction ramps down linearly between `start` and `end`                        |
| `deductionPercentOfGross`, `deductionCap`, `deductionRequiresAllowance` | SC | The deduction is a share of wages, capped, and only for an employee claiming an allowance |
| `firstAllowanceAmount`, `firstAllowanceCount` | KS, MA | The first allowances are worth more than the later ones                             |
| `allowanceCliff`                      | OR, RI| Allowances stop counting above this income                                                  |
| `taperingCredit`                      | MA, UT| A credit that tapers away with income                                                       |
| `lowIncomeExemption`, `lowIncomeExemptionRequiresAllowance` | CA, MA | Wages below the figure are exempt outright, sometimes only on a claim |
| `lowIncomeExemptionPerPeriod`, `lowIncomeExemptionSourceUrl` | MD | The same, stated per pay period and on the gross, and the document the floor is printed in |
| `flatRateAbove`                       | NY    | One flat rate replaces the schedule above a threshold                                       |
| `twoIncomeBrackets`                   | WV    | A second schedule for a two-earner household                                                |
| `oneIncomeOnRequest`                  | WV    | The one-income schedule is read only when the employee asks for it on the state's form; everyone else is withheld by `twoIncomeBrackets`. `label`, `hint` and the form's `sourceUrl` |
| `bothSpousesWorking`                  | MT    | The box a married couple who both work and earn alike marks to be withheld by another `column`. `label`, `hint`, `sourceUrl`, `column` |
| `dualIncomeColumn`, `marriedDoubleFromAllowances` | CA | Which column a dual-income married employee is read through, and the allowance count that doubles the deduction |
| `workingSpouseStatus`                 | ID, KS| The filing status a joint filer whose spouse also works is withheld at, schedule and allowance together |
| `multipleJobsMovesStatus`             | ID    | A joint filer holding more than one job is sent to `workingSpouseStatus` as well            |
| `withoutCertificate`                  | AL, GA, ID, KS, LA, MS, MO | What the state withholds from an employee who filed none of its certificate: the `form` by name, the `filingStatus` or form `code` and the `allowances` it reads as, the `rule` in words, the `sourceUrl`; `choice` where part of the rule is the generator's and not the state's |
| `exemptionClaimed`                    | MS    | The exemption is the dollar total the employee claims on the state's certificate. `byStatus` is what the filing status alone comes to; `workingSpouseShare` what a blank line reads as for a joint filer whose spouse works |
| `standardDeductionName`               | HI    | What the state calls `annualStandardDeduction`, where it does not call it a standard deduction. A label; nothing is computed from it |
| `deductionPerPeriod`, `creditFromAllowanceAmount` | IA | The deduction is stated per pay period, so the frequency reaches the calculation |
| `olderFormDeductionPerPeriod`         | IA    | The same deduction for an employee whose certificate is an older edition of the state's form, which asked only single or married |
| `bracketsPerPeriod`                   | OK    | Rate schedules printed once per pay frequency, which the state tells employers to read instead of working out the year. `brackets` stays the annual table |
| `roundsToWholeDollar`                 | ME, MS, MO, MT, NC, ND, OK, WV | The amount for the pay period is rounded to the nearest dollar           |
| `roundsToWholeDollarSourceUrl`        | WV    | The document the rounding rule is printed in, where that is not the entry's own             |
| `cafeteriaHsaTaxed`                   | CA    | An HSA contribution made through a cafeteria plan is taxed although the base takes the plan off. Carries the `sourceUrl` that says so |
| `exemptionCodes`                      | AL, CT, LA, NJ | The letters of the state's own form. A letter, not the federal filing status, decides the schedule, the deduction and the exemption |
| `exemptionPerAllowancePerPeriod`      | NJ, OK| An allowance is worth a figure of the pay period, because the state rounds inside the period |
| `periodExemptions`                    | IN    | Exemptions counted line by line, each divided into the period and rounded on its own before adding up |
| `periodAdjustments`                   | AZ, CT, NJ | Extra or reduced withholding the state's own form asks for, per period                 |
| `countyTax`                           | IN, MD| A local rate on the same base. `joinsStateLine` folds it into the state figure instead of printing a second line. `defaultRate` is what is withheld from an employee who named no county, and `defaultRateSourceUrl` the document that says so (MD) |
| `deductsFederalWithholding`           | AL, OR| Federal tax actually withheld comes off the state base, so the federal line is computed first |
| `federalWithholdingCap`               | OR    | A ceiling on that subtraction, stepping down to nothing as wages rise                       |
| `deductPayrollTaxRate`, `deductPayrollTaxCap` | MA | FICA comes off the base, up to a cap                                              |
| `bracketsAboveWages`, `allowanceColumn` | OR  | A second set of schedules from a wage threshold, and the rule that the claim rather than the status picks the column |
| `rates`, `defaultRate`, `allowsZeroElection` | AZ | The employee elects the rate from a closed list, and may elect zero               |
| `rateWithoutForm`                     | CT    | The rate that applies where no state form was filed                                         |
| `nonresidency`                        | CT, MD| The state charges an employee living outside it differently. `exemptions` (MD) lists the lines of the state's certificate a nonresident claims exemption on, with the form's `sourceUrl` |
| `flat` entry's `rate`                 | PA    | One rate on everything                                                                      |

## `data/tax/<year>/control-examples.json`

An array. One row is one published calculation the tables are checked against.

| Key                        | Meaning                                                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `state`                    | Two-letter code, matching a key of `states`                                                                       |
| `wages`                    | Annual wages, or wages for one pay period where `frequency` is set                                                |
| `expected`                 | The state's own answer: annual tax, or the tax for one period where `frequency` is set                            |
| `status`                   | `single`, `married_jointly` or `head_of_household`                                                                |
| `allowances`               | Allowance count claimed                                                                                            |
| `source`                   | The document and the place in it. For a printed table, the row and the column                                     |
| `note`                     | Why this row is the row it is. Prose, and the half of the dataset a bare table of numbers would lose               |
| `tolerance`                | Cents of slack. `0.5` where the guide rounds annual tax to the dollar, `0.01` where the answer sits on an exact half cent. Absent means one cent |
| `frequency`                | Set where the guide states its example per pay period rather than per year                                        |
| `payDate`                  | Which entry of the state the row selects. Needed where the rate changed mid-year                                  |
| `notFromGuide`             | The figure came from the state's own calculator rather than from a worked example                                 |
| `allowanceAmount`          | Dollar allowance, where the state's form carries money rather than a count                                        |
| `spouseHasEarnedIncome`    | Asked by some state forms and not by the federal W-4                                                              |
| `exemptionCode`            | The letter claimed on the state's own exemption form                                                              |
| `exemptionCounts`          | Counts from the lines of a form that takes several                                                                |
| `county`, `expectedCounty` | The county, and the county tax the same example states as its own figure rather than as a share of the state one  |
| `nonresident`              | The employee lives outside the state, where the state charges such a one differently                              |
| `workPercent`              | Percentage of work performed inside the state, where the state taxes only that part                               |
| `federalWithholding`       | Federal tax withheld, for the states that subtract it from their own base                                         |
| `payrollTaxWithheld`       | Social Security and Medicare withheld, `{ period, yearToDate }`, for the state that subtracts it up to a cap (MA). Only with a `frequency` |
| `oneIncomeElected`         | The employee asked for the one-income schedule on the state's form (WV)                                           |
| `bothSpousesWorking`       | The employee marked the box for a married couple who both work and earn alike (MT)                                 |
| `exemptionClaimed`         | The dollar total claimed on the state's certificate, the column the row is read in (MS)                           |

**Why a tolerance is not a fudge.** Where a state prints its table in whole dollars, a
fixture that reads it can only be as exact as the print. Such a row carries `tolerance: 0.5`
and is blind to an error of roughly `tolerance x periods / rate` in the annual figure:
measured on Minnesota, a planted $300 error in the allowance passed and a $1,300 one failed.
A row read from a table printed to the cent holds far harder, around $25 on an allowance.

## `data/tax/<year>/federal.json` and `fica.json`

Federal carries `brackets`, the IRS Publication 15-T percentage method schedules, and
`standardDeductionAdjustment`, the figure a W-4 with the multiple-jobs box changes. FICA
carries `socialSecurity` and `medicare`, each with its rate and, for Social Security, the
wage base, plus the Additional Medicare rate and the wages it starts at.

On these two the `verified` flag sits on the file rather than on an entry, and
`verifiedOn` says when: there is one federal document per year, not fifty.

## `data/tax/<year>/state-other-withholding.json`

The mandatory employee withholdings that are not income tax: state disability, paid family
and medical leave, and their kin. Each carries its own rate, its own wage base where it has
one, and the periods it applies to. A period cites two documents, `sourceUrl` for the rate
and `baseSourceUrl` for the wages it is charged on, and a `cafeteriaHsaTaxed` block carries
a `sourceUrl` of its own. A record the tables name and do not compute carries
`unmodelled: true` and its own `sourceUrl` in place of periods.

## `data/source-checks.json`

An array, one row per source URL: `state`, `sourceUrl`, `checkedAt` as a Unix timestamp in
milliseconds, and `textHash`, the hash of the readable text at that moment. Some rows carry
`revision`, the edition the document declared on its face.

A monthly job refetches each URL and rewrites its row, so a document that changed under a
table is visible without a person rereading fifty guides.

**A row the job could not read carries `unreadable` instead of a hash**, an object of
`code` (`http-403`, `timeout`, `dns`, `connection`, `tls`, `empty`, `error`), `reason` in
the words of whatever refused, and `since`, the first sweep of the unbroken run of
refusals. Everything else on such a row is left exactly as the last successful read wrote
it, so `checkedAt` and `textHash` never claim a check that did not happen; a source that
has never once been read has neither. New Hampshire is the standing example: its
department answers 403 to anything automated, from here and from the job's runner alike.

The row exists so that a refusal can be counted. A department that blocks the job used to
leave no row at all, and a missing line does not read as anything: the monthly report
looked complete precisely because the source that dropped out of it was invisible.

`validate.mjs` lists unreadable sources as a note rather than a warning. The warning it
does raise, for a cited URL with no row of any kind, now means a citation added to the
tables since the last monthly sweep, which the next run picks up on its own.
