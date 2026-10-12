# Tax prep site: launch checklist

Everything in `[BRACKETS]` is a placeholder. Find and replace each one in
`index.html` and `privacy.html` (both in this folder).

## Business details

| Placeholder | Where | Example |
|---|---|---|
| `[BUSINESS NAME]` | both pages, many places | Example Tax Services |
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
