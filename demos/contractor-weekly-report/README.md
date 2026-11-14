# Weekly electrical contractor report

A portfolio demonstration by Salman Chowdhury using synthetic data. Three CSV
exports become one Excel report with job-level invoicing, costs and contribution.
Every excluded row has a source filename, line number and reason.

## Run the example

Requires Python 3.10+ and Node.js with `@oai/artifact-tool` available to the
workbook builder. The Python preprocessing step uses only the standard library.
Run the workbook builder to produce the Excel file.

```sh
python3 prepare.py --start 2026-11-09 --end 2026-11-15 --output prepared.json samples/*.csv
node build.mjs prepared.json out
```

Rerun both commands for each week. The week bounds are inclusive. The sample
accepts ISO and Australian day-first dates, AUD amounts to the cent, and a
shared transaction ID across exports. Normalised identical IDs count once.
Conflicting valid transactions using the same ID are all excluded for review.
Credits are kept as signed values. Contribution is invoicing less the listed
job costs before overheads and GST.

## Verified example

20 rows reconcile to 15 kept, two duplicates and three excluded. Four jobs
total A$12,200 invoiced, A$9,128.50 in listed costs and A$3,071.50 contribution.
