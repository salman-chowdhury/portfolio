"""Normalise three contractor exports and retain a review trail for excluded rows."""
import argparse
import csv
import json
from collections import Counter, defaultdict
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path

FIELDS = ("id", "job", "date", "type", "amount")
ALIASES = {
    "entry": "id", "ref": "id", "record_id": "id",
    "job_code": "job", "project": "job", "job_id": "job",
    "posted": "date", "work_date": "date", "transaction_date": "date",
    "category": "type", "kind": "type", "cost_type": "type",
    "amount_aud": "amount", "aud": "amount", "value": "amount",
}
TYPES = {"labour": "Labour", "labor": "Labour", "materials": "Materials",
         "material": "Materials", "subcontract": "Subcontract", "invoice": "Invoice"}


def normalise(row, start, end):
    entry, job = row["id"].strip().upper(), row["job"].strip().upper()
    if not entry or not job:
        raise ValueError("Missing entry ID or job code")
    raw_date = row["date"].strip()
    try:
        posted = date.fromisoformat(raw_date)
    except ValueError:
        try:
            posted = datetime.strptime(raw_date, "%d/%m/%Y").date()
        except ValueError:
            raise ValueError("Invalid date") from None
    if not start <= posted <= end:
        raise ValueError("Outside reporting period")
    kind = TYPES.get(row["type"].strip().lower())
    if kind is None:
        raise ValueError("Unrecognised category")
    try:
        amount = Decimal(row["amount"].strip().replace("$", "").replace(",", ""))
        if not amount.is_finite() or amount != amount.quantize(Decimal(".01")):
            raise InvalidOperation
    except InvalidOperation:
        raise ValueError("Invalid AUD amount") from None
    return entry, job, posted.isoformat(), kind, int(amount * 100)


def prepare(files, start, end):
    if start > end:
        raise ValueError("Start date must be on or before end date")
    by_id = defaultdict(list)
    checks = []
    source_counts = Counter()
    for path in files:
        with path.open(newline="", encoding="utf-8-sig") as handle:
            reader = csv.reader(handle, strict=True)
            headers = [ALIASES.get(h.strip().lower(), h.strip().lower())
                       for h in next(reader, [])]
            if any(headers.count(f) != 1 for f in FIELDS):
                raise ValueError(f"{path.name}: expected one column per field {FIELDS}")
            while True:
                row_number = reader.line_num + 1
                fields = next(reader, None)
                if fields is None:
                    break
                if not fields:
                    continue
                source_counts[path.name] += 1
                row = dict(zip(headers, fields))
                try:
                    if len(fields) != len(headers):
                        raise ValueError("Wrong number of columns")
                    record = normalise(row, start, end)
                except ValueError as err:
                    checks.append([path.name, row_number, row.get("id", ""), "Excluded", str(err)])
                    continue
                by_id[record[0]].append((record, path.name, row_number))
    kept = []
    for candidates in by_id.values():
        conflict = len({record for record, _, _ in candidates}) > 1
        for index, (record, source, row) in enumerate(candidates):
            if conflict:
                checks.append([source, row, record[0], "Excluded", "Conflicting entry ID"])
            elif index:
                checks.append([source, row, record[0], "Duplicate", "Identical entry already kept"])
            else:
                kept.append([*record[:4], record[4] / 100, source, row])
    kept.sort(key=lambda r: (r[1], r[2], r[0]))
    checks.sort()
    return {"period": [start.isoformat(), end.isoformat()], "rows": kept,
            "exceptions": checks, "source_counts": dict(source_counts)}


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--start", type=date.fromisoformat, required=True)
    p.add_argument("--end", type=date.fromisoformat, required=True)
    p.add_argument("--output", type=Path, required=True)
    p.add_argument("files", type=Path, nargs="+")
    args = p.parse_args()
    if len({f.name for f in args.files}) != len(args.files):
        p.error("Give each input file a distinct filename")
    try:
        payload = prepare(args.files, args.start, args.end)
        args.output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    except (ValueError, OSError, csv.Error) as err:
        p.error(str(err))
