# Tax prep site: launch checklist

Everything in `[BRACKETS]` is a placeholder. Find and replace each one in
`index.html` and `privacy.html` (both in this folder).

## Business details

Business name is set: **Falcon Tax Solutions**. Before launch, confirm it is
available in your state business registry, at tmsearch.uspto.gov, and as a
domain.

| Placeholder | Where | Example |
|---|---|---|
| `[SERVICE AREA]` | index | Brooklyn, NY |
| `[Phone placeholder]` | both | (555) 123-4567 |
| `[Email placeholder]` | both | hello@yourdomain.com |
| `[Office address]` | both | 123 Main St, Suite 4 |
| `[Languages spoken]` | index hero badge | English · Spanish |
| `[Preparer name]` | index footer | Your full name |
| `[P00000000]` | index footer | Your PTIN |
| `[Add EA/CPA credential if applicable.]` | index footer | Delete if none |

## Pricing and policies

| Placeholder | Where | Notes |
|---|---|---|
| `[$PRICE]` ×3 | index pricing | Starting fee per tier |
| `[$PRICE]` ×4 | index trucking section | Monthly plans by fleet size + IFTA-only quarterly fee |
| `[State whether audit support is included or extra.]` | index FAQ | One sentence |
| `[If you are not an IRS Certifying Acceptance Agent, …]` | index FAQ | Replace with your actual ITIN process |
| `[EFFECTIVE DATE]` | privacy | Date you publish |
| `[NUMBER]` ×2 | privacy | Years to keep returns; months to keep non-client leads |

## Go-live steps

1. **Form:** get a free access key at web3forms.com, then replace
   `YOUR_WEB3FORMS_ACCESS_KEY` in `index.html`. Submit one test request and
   confirm the email arrives.
2. **PTIN:** required before you prepare any return for pay (irs.gov/ptin).
3. **EFIN:** apply through IRS e-Services to e-file. Approval can take up
   to 45 days, so start early.
4. **WISP:** write your security plan using the IRS template
   (Publication 5708). Required by the FTC Safeguards Rule.
5. **Secure portal:** pick one before taking clients (most tax software
   includes one). Never collect SSNs by email or this form.
6. **Legal review:** have an attorney review `privacy.html` and the FAQ
   wording before launch.
7. **Final check:** search both files for `[` to confirm nothing is left.

## Tax Organizer (remote clients)

`downloads/falcon-tax-organizer-2026.xlsx` (uploads to the estimator) and
`downloads/falcon-tax-organizer-2026.pdf` (fillable; a typed-in copy also uploads) are generated:

    python3 tax-prep/tools/build_organizer.py tax-prep/downloads/falcon-tax-organizer-2026.xlsx
    python3 tax-prep/tools/build_organizer_pdf.py tax-prep/downloads/falcon-tax-organizer-2026.pdf
    python3 tax-prep/tools/build_organizer_print.py tax-prep/downloads/falcon-tax-organizer-2026-print.pdf
    python3 tax-prep/tools/build_organizer_print.py --all-types tax-prep/downloads
    python3 tax-prep/tools/build_scan_fields.py
    python3 tax-prep/tools/build_expense_catalog.py

All three share the EXPENSES and CHECKLIST lists in build_organizer.py; edit
them there. The print edition is for handwriting (read with the Scan Reader).
`--all-types` writes one colour-coded print form per filing type, status
pre-marked: falcon-2026-single.pdf, -married-joint, -married-separate and
-head-of-household.

After building the .xlsx, open and save it once in LibreOffice/Excel (or run a
recalculation) so formula results are stored; the website reads the "Data" tab.
Update the per diem rates (Data C80:C83), the mileage rates (Data C86:C87, also
`MILEAGE` in js/tax2026.js and `MILEAGE_RATES` in build_organizer.py) and the
tax-year text each year. The Car tab / car_* fields hold rideshare and other
business-car miles and costs; the estimate uses the larger of standard mileage
or actual costs times the business share of miles.
PDF field names are read by js/organizer-map.js; keep them stable. Scanned or
handwritten PDFs have no form data and cannot be read automatically.

## Scan Reader (handwritten organizers, internal)

`tax-prep/scan-reader/` is a private claude.ai page (not part of the public
site). It sends photos or scanned-PDF pages of a handwritten organizer to
Claude on the owner's plan (artifact `sample` capability with images), shows
the values read for review, and estimates with the same js/tax2026.js,
js/states.js and js/organizer-map.js. `fields.js` is generated from the PDF
organizer's field names; regenerate it whenever the PDF fields change.

## Preparer summary

"Preparer summary" on the estimator results and in the Scan Reader opens a
one-page report: Schedule C by line (itemized when an organizer was uploaded
or scanned), the vehicle method (Part IV), per diem, the federal and state
estimate, and questions to confirm with the client (withholding source,
Form 8867 due diligence, meals, depreciation, home office). Print / Save as
PDF or copy it as text. `js/expense-catalog.js` maps organizer fields to
Schedule C lines; regenerate it after editing EXPENSES or CAR_* lists.

## Pre-return audit-proofing plan (internal)

`internal/falcon-pre-return-audit-plan.pdf` is the 6-page workflow for
self-employed and rideshare returns: 10-step flow chart, vehicle decision tree,
checklist and red flags, a worked example (made-up numbers), what to do when an
IRS letter arrives, and the client document request list. Rebuild with:

    python3 tax-prep/tools/build_audit_plan.py tax-prep/internal/falcon-pre-return-audit-plan.pdf
    python3 tax-prep/tools/build_audit_plan_phone.py tax-prep/internal/falcon-audit-plan-phone.pdf   (3-page phone edition)

