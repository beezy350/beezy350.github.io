"""Build the Falcon pre-return audit-proofing action plan (PDF, landscape).

A reusable internal guide for self-employed / rideshare clients: a flow chart
from intake to filing, the vehicle decision tree, a step-by-step checklist,
what to do when an IRS letter arrives, and a client document request list.
No client data. Illustrations are drawn as vector icons.

Run:  python3 tax-prep/tools/build_audit_plan.py tax-prep/internal/falcon-pre-return-audit-plan.pdf
"""
import sys
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import letter, landscape
from reportlab.pdfgen import canvas

W, H = landscape(letter)
M = 34
NAVY, GOLD, INK, MUTED, LINE = (HexColor(c) for c in ["#1D3557", "#C8963E", "#1B2230", "#5A6475", "#C9D1DC"])
SOFT = HexColor("#F4F5F7")
GREEN, RED, BLUE, PURPLE, TEAL, ORANGE = (HexColor(c) for c in ["#2F6F62", "#A3472B", "#1D5FA8", "#7A4FA0", "#087F7B", "#B5582A"])


# ---------- icons (drawn, white on a coloured disc) ----------
def disc(c, x, y, r, colour):
    c.setFillColor(colour)
    c.circle(x, y, r, fill=1, stroke=0)
    c.setFillColor(white)
    c.setStrokeColor(white)


def icon(c, kind, x, y, r=20, colour=NAVY):
    disc(c, x, y, r, colour)
    s = r / 20.0
    c.setLineWidth(1.6 * s)
    if kind == "clipboard":
        c.roundRect(x - 8 * s, y - 11 * s, 16 * s, 21 * s, 2 * s, fill=0, stroke=1)
        c.rect(x - 4 * s, y + 8 * s, 8 * s, 4 * s, fill=1, stroke=0)
        for i in range(3):
            c.line(x - 5 * s, y + 3 * s - i * 5 * s, x + 5 * s, y + 3 * s - i * 5 * s)
    elif kind == "doc":
        c.rect(x - 8 * s, y - 11 * s, 16 * s, 22 * s, fill=0, stroke=1)
        c.setFont("Helvetica-Bold", 7 * s)
        c.drawCentredString(x, y + 3 * s, "1099")
        c.line(x - 5 * s, y - 3 * s, x + 5 * s, y - 3 * s)
        c.line(x - 5 * s, y - 7 * s, x + 3 * s, y - 7 * s)
    elif kind == "receipt":
        p = c.beginPath()
        p.moveTo(x - 8 * s, y + 11 * s); p.lineTo(x + 8 * s, y + 11 * s); p.lineTo(x + 8 * s, y - 11 * s)
        for i in range(4):
            p.lineTo(x + 8 * s - (i * 4 + 2) * s, y - 8 * s); p.lineTo(x + 8 * s - (i * 4 + 4) * s, y - 11 * s)
        p.close()
        c.drawPath(p, fill=0, stroke=1)
        c.setFont("Helvetica-Bold", 9 * s)
        c.drawCentredString(x, y - 2 * s, "$")
    elif kind == "car":
        c.roundRect(x - 12 * s, y - 4 * s, 24 * s, 8 * s, 2 * s, fill=1, stroke=0)
        p = c.beginPath()
        p.moveTo(x - 7 * s, y + 4 * s); p.lineTo(x - 4 * s, y + 10 * s); p.lineTo(x + 5 * s, y + 10 * s); p.lineTo(x + 8 * s, y + 4 * s)
        p.close()
        c.drawPath(p, fill=1, stroke=0)
        c.setFillColor(colour)
        c.circle(x - 7 * s, y - 5 * s, 3.4 * s, fill=1, stroke=0)
        c.circle(x + 7 * s, y - 5 * s, 3.4 * s, fill=1, stroke=0)
        c.setFillColor(white)
        c.circle(x - 7 * s, y - 5 * s, 2.2 * s, fill=1, stroke=0)
        c.circle(x + 7 * s, y - 5 * s, 2.2 * s, fill=1, stroke=0)
    elif kind == "family":
        for dx, sz in ((-7, 1.0), (7, 1.0), (0, 0.7)):
            c.circle(x + dx * s, y + 6 * s * sz, 3.2 * s * sz, fill=1, stroke=0)
            c.roundRect(x + dx * s - 4 * s * sz, y - 10 * s, 8 * s * sz, 13 * s * sz, 3 * s * sz, fill=1, stroke=0)
    elif kind == "shield":
        p = c.beginPath()
        p.moveTo(x, y + 12 * s); p.lineTo(x + 10 * s, y + 7 * s); p.lineTo(x + 9 * s, y - 4 * s)
        p.lineTo(x, y - 12 * s); p.lineTo(x - 9 * s, y - 4 * s); p.lineTo(x - 10 * s, y + 7 * s); p.close()
        c.drawPath(p, fill=0, stroke=1)
        c.line(x - 4 * s, y, x - 1 * s, y - 4 * s)
        c.line(x - 1 * s, y - 4 * s, x + 5 * s, y + 5 * s)
    elif kind == "magnifier":
        c.circle(x - 3 * s, y + 3 * s, 7 * s, fill=0, stroke=1)
        c.setLineWidth(3 * s)
        c.line(x + 2 * s, y - 2 * s, x + 10 * s, y - 10 * s)
    elif kind == "check":
        c.setLineWidth(3 * s)
        c.line(x - 8 * s, y, x - 2 * s, y - 7 * s)
        c.line(x - 2 * s, y - 7 * s, x + 9 * s, y + 8 * s)
    elif kind == "pen":
        p = c.beginPath()
        p.moveTo(x - 9 * s, y - 9 * s); p.lineTo(x - 7 * s, y - 3 * s); p.lineTo(x + 6 * s, y + 10 * s)
        p.lineTo(x + 10 * s, y + 6 * s); p.lineTo(x - 3 * s, y - 7 * s); p.close()
        c.drawPath(p, fill=1, stroke=0)
        c.line(x - 10 * s, y - 12 * s, x + 6 * s, y - 12 * s)
    elif kind == "folder":
        p = c.beginPath()
        p.moveTo(x - 11 * s, y - 9 * s); p.lineTo(x - 11 * s, y + 8 * s); p.lineTo(x - 4 * s, y + 8 * s)
        p.lineTo(x - 2 * s, y + 5 * s); p.lineTo(x + 11 * s, y + 5 * s); p.lineTo(x + 11 * s, y - 9 * s); p.close()
        c.drawPath(p, fill=1, stroke=0)
        c.setStrokeColor(colour)
        c.line(x - 8 * s, y - 2 * s, x + 8 * s, y - 2 * s)
    elif kind == "envelope":
        c.rect(x - 11 * s, y - 7 * s, 22 * s, 15 * s, fill=0, stroke=1)
        c.line(x - 11 * s, y + 8 * s, x, y)
        c.line(x, y, x + 11 * s, y + 8 * s)
    elif kind == "warning":
        p = c.beginPath()
        p.moveTo(x, y + 11 * s); p.lineTo(x + 11 * s, y - 8 * s); p.lineTo(x - 11 * s, y - 8 * s); p.close()
        c.drawPath(p, fill=0, stroke=1)
        c.setFont("Helvetica-Bold", 11 * s)
        c.drawCentredString(x, y - 6 * s, "!")
    elif kind == "calendar":
        c.rect(x - 10 * s, y - 10 * s, 20 * s, 18 * s, fill=0, stroke=1)
        c.rect(x - 10 * s, y + 3 * s, 20 * s, 5 * s, fill=1, stroke=0)
        for i in range(3):
            for j in range(2):
                c.rect(x - 7 * s + i * 5.5 * s, y - 7 * s + j * 4.5 * s, 3 * s, 3 * s, fill=1, stroke=0)
    elif kind == "odometer":
        c.arc(x - 11 * s, y - 9 * s, x + 11 * s, y + 13 * s, 0, 180)
        c.setLineWidth(2.4 * s)
        c.line(x, y + 2 * s, x + 7 * s, y + 8 * s)
        c.setFont("Helvetica-Bold", 6 * s)
        c.drawCentredString(x, y - 9 * s, "0 4 5 0 0 0")


# ---------- layout helpers ----------
def page(c, title, sub, n, total):
    c.setFillColor(NAVY)
    c.rect(0, H - 58, W, 58, fill=1, stroke=0)
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(M, H - 20, "FALCON TAX SOLUTIONS  ·  PRE-RETURN AUDIT-PROOFING ACTION PLAN  ·  INTERNAL")
    c.setFillColor(white)
    c.setFont("Times-Bold", 19)
    c.drawString(M, H - 41, title)
    c.setFont("Helvetica", 8.5)
    c.setFillColor(HexColor("#C9D3E3"))
    c.drawString(M, H - 53, sub)
    c.setFillColor(MUTED)
    c.setFont("Helvetica-Oblique", 7)
    c.drawString(M, 14, "Internal guide, not legal advice. Rates and penalties change yearly; confirm on irs.gov before relying on a figure.")
    c.drawRightString(W - M, 14, f"Page {n} of {total}")


def wrap(c, text, x, y, width, size=8.4, font="Helvetica", colour=INK, lead=None):
    lead = lead or size + 2.6
    c.setFillColor(colour)
    c.setFont(font, size)
    for para in text.split("\n"):
        line = ""
        for word in para.split(" "):
            test = (line + " " + word).strip()
            if c.stringWidth(test, font, size) > width:
                c.drawString(x, y, line)
                y -= lead
                line = word
            else:
                line = test
        c.drawString(x, y, line)
        y -= lead
    return y


def box(c, x, y, w, h, colour, title, body, kind=None, num=None):
    c.setFillColor(white)
    c.setStrokeColor(colour)
    c.setLineWidth(1.6)
    c.roundRect(x, y, w, h, 8, fill=1, stroke=1)
    c.setFillColor(colour)
    c.roundRect(x, y + h - 20, w, 20, 8, fill=1, stroke=0)
    c.rect(x, y + h - 20, w, 10, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 8.6)
    c.drawString(x + (30 if kind else 8), y + h - 14, (f"{num}. " if num else "") + title)
    if kind:
        icon(c, kind, x + 16, y + h - 10, 13, colour)
        c.setStrokeColor(white)
        c.setLineWidth(1.2)
        c.circle(x + 16, y + h - 10, 13, fill=0, stroke=1)
    wrap(c, body, x + 8, y + h - 34, w - 16, 9.0, colour=INK, lead=11.6)


def arrow(c, x1, y1, x2, y2, colour=MUTED, label=None):
    c.setStrokeColor(colour)
    c.setFillColor(colour)
    c.setLineWidth(1.6)
    c.line(x1, y1, x2, y2)
    import math
    a = math.atan2(y2 - y1, x2 - x1)
    p = c.beginPath()
    p.moveTo(x2, y2)
    p.lineTo(x2 - 7 * math.cos(a - 0.45), y2 - 7 * math.sin(a - 0.45))
    p.lineTo(x2 - 7 * math.cos(a + 0.45), y2 - 7 * math.sin(a + 0.45))
    p.close()
    c.drawPath(p, fill=1, stroke=0)
    if label:
        c.setFont("Helvetica-Bold", 7.5)
        c.drawCentredString((x1 + x2) / 2 + (8 if x1 == x2 else 0), (y1 + y2) / 2 + 4, label)


def diamond(c, x, y, w, h, colour, text):
    p = c.beginPath()
    p.moveTo(x, y + h / 2); p.lineTo(x + w / 2, y); p.lineTo(x, y - h / 2); p.lineTo(x - w / 2, y); p.close()
    c.setFillColor(HexColor("#FFF8E1"))
    c.setStrokeColor(colour)
    c.setLineWidth(1.6)
    c.drawPath(p, fill=1, stroke=1)
    c.setFillColor(INK)
    lines = text.split("\n")
    c.setFont("Helvetica-Bold", 7.8)
    for i, l in enumerate(lines):
        c.drawCentredString(x, y + (len(lines) - 1) * 4.6 - i * 9.2 - 2, l)


TOTAL = 6


def p1_overview(c):
    page(c, "The 10-step flow: from intake to an audit-ready file", "Follow left to right, top row then bottom row. Gold diamonds are decisions; do not file until every step is green.", 1, TOTAL)
    steps = [
        ("Intake & consent", "clipboard", NAVY, "Engagement letter, IRC 7216 consent, ID for both spouses, last year's return and IRS transcripts."),
        ("Match all income", "doc", BLUE, "Every 1099-K box 1a + 1099-NEC box 1 + income with no form (bonuses < $600, cash). Must equal Schedule C line 1."),
        ("Expenses by line", "receipt", TEAL, "App fees line 10, car 9, rent of vehicle 20a, supplies 22, phone 25, other 27b with a Part V list. No lumps."),
        ("Vehicle test", "car", PURPLE, "Business miles (app online miles) vs total miles (odometer). Second personal car? Pick actual or mileage rate."),
        ("Family & credits", "family", ORANGE, "Children: SSN, birth date, school or medical record with the home address, months lived in the home."),
        ("EITC due diligence", "shield", GREEN, "Form 8867 for EITC / CTC / AOTC / HOH. Ask, document, keep copies 3 years. Income must be provable."),
        ("Red-flag scan", "magnifier", RED, "Run the 12 red flags (page 3). Any red flag without proof goes back to the client."),
        ("Prepare & review", "check", NAVY, "Prepare in software, compare with the Falcon Preparer summary, second look at every credit."),
        ("Client signs & file", "pen", BLUE, "Walk the client through the return, Form 8879 e-file signature, payment or refund plan."),
        ("Audit-ready folder", "folder", TEAL, "One folder per client per year: return, 8867, all proof. Keep 3 years (6 if income could be under-reported)."),
    ]
    bw, bh, gx = 138, 150, 13
    top = H - 80 - bh
    xs = [M + i * (bw + gx) for i in range(5)]
    for i, (t, k, col, body) in enumerate(steps):
        row, col_i = divmod(i, 5)
        x = xs[col_i] if row == 0 else xs[4 - col_i]
        y = top if row == 0 else top - bh - 92
        box(c, x, y, bw, bh, col, t, body, k, i + 1)
    # arrows across top row, down, back along bottom row
    for i in range(4):
        arrow(c, xs[i] + bw, top + bh / 2, xs[i + 1], top + bh / 2)
    # decision between rows
    dx, dy = xs[4] + bw / 2, top - 46
    arrow(c, dx, top, dx, dy + 22)
    diamond(c, dx, dy, 150, 44, GOLD, "All proof in the\nclient folder?")
    arrow(c, dx, dy - 22, dx, top - 92, GREEN, "YES")
    # NO loop back to step 1
    c.setStrokeColor(RED); c.setLineWidth(1.6)
    c.line(dx - 75, dy, xs[0] + bw / 2 + 40, dy)
    arrow(c, xs[0] + bw / 2 + 40, dy, xs[0] + bw / 2 + 40, top, RED)
    c.setFillColor(RED); c.setFont("Helvetica-Bold", 7.5)
    c.drawString(xs[0] + bw / 2 + 48, dy + 5, "NO: send the document request list (page 6), wait for the client, then re-check from step 1")
    bottom = top - bh - 92
    for i in range(4, 0, -1):
        arrow(c, xs[i], bottom + bh / 2, xs[i - 1] + bw, bottom + bh / 2)
    # legend
    y = 40
    c.setFillColor(GOLD); c.setFont("Helvetica-Bold", 9.0)
    c.drawString(M, y + 12, "Golden rule:")
    wrap(c, "a number on the return is only as strong as the document behind it. If it cannot be proven, it does not go on the return, or it goes on with a lower, provable amount.", M + 64, y + 12, W - 2 * M - 64, 9.0, colour=INK)


def p2_vehicle(c):
    page(c, "Vehicle decision tree (rideshare, delivery, any business car)", "Cars need written records (IRC 274(d)). Without miles, an auditor can disallow the whole car deduction.", 2, TOTAL)
    cx = W / 2
    icon(c, "car", cx, H - 100, 22, PURPLE)
    arrow(c, cx, H - 124, cx, H - 150)
    diamond(c, cx, H - 178, 210, 56, GOLD, "Does the family have a separate\npersonal car?")
    # yes branch
    arrow(c, cx + 105, H - 178, cx + 200, H - 178, GREEN, "YES")
    box(c, cx + 200, H - 268, 190, 130, GREEN, "Near 100% business is believable",
        "Keep: personal car registration + insurance, rental/lease contract, odometer start and end, app online miles. Note any gap (gas, car wash, rental office, positioning = business).", "check")
    # no branch
    arrow(c, cx - 105, H - 178, cx - 200, H - 178, RED, "NO")
    box(c, cx - 390, H - 268, 190, 130, RED, "Business share only",
        "Business % = app online miles / total odometer miles (example 40,000 / 45,000 = 89%). School runs, errands and family trips are personal.", "warning")
    arrow(c, cx, H - 206, cx, H - 300)
    diamond(c, cx, H - 330, 210, 56, GOLD, "Owned, leased / long-term rental,\nor short rentals?")
    labels = [("Owned", cx - 260, BLUE, "Choose the mileage rate in the FIRST year to keep both options later. Actual costs need depreciation (Form 4562)."),
              ("Leased / long-term rental", cx, TEAL, "Treated like a lease. Actual: rent + gas + insurance + repairs x business %. Mileage rate: if chosen, keep it for the whole lease."),
              ("Short rentals", cx + 260, ORANGE, "Keep every rental agreement (odometer out/in). Actual costs usually win when weekly rent is high.")]
    for t, x, col, body in labels:
        arrow(c, cx, H - 358, x, H - 392)
        box(c, x - 115, H - 512, 230, 118, col, t, body)
    # bottom: compare
    c.setFillColor(SOFT)
    c.roundRect(M, 30, W - 2 * M, 80, 8, fill=1, stroke=0)
    icon(c, "odometer", M + 34, 70, 22, PURPLE)
    wrap(c, "Always compare both methods (the Falcon estimator does it automatically):\n"
            "Mileage rate 2026 = business miles Jan-Jun x $0.725 + Jul-Dec x $0.76 (2025: $0.70).   Actual = (rent or depreciation + gas + insurance + repairs + car wash) x business %.\n"
            "Tolls and parking for business trips count under either method. App fees are NOT car costs: they go on line 10. Meals for drivers who sleep at home: not deductible.",
         M + 70, 92, W - 2 * M - 86, 8.2)


def p3_checklist(c):
    page(c, "Step-by-step checklist and the 12 red flags", "Tick every line before filing. A red flag is fine only when the proof is in the folder.", 3, TOTAL)
    left = [
        ("1  Intake", "Engagement letter signed · 7216 consent · photo ID both spouses · prior-year return · IRS account transcript (income, payments)."),
        ("2  Income", "List every 1099-K, 1099-NEC, W-2, 1099-G/R/INT · app tax summaries · add income with no form · total = line 1."),
        ("3  Expenses", "Sort by Schedule C line · app fees from summaries to line 10 · every 'other' item listed in Part V · receipts or bank statements."),
        ("4  Vehicle", "Odometer start/end photo · rental or lease contract · app online miles Jan-Jun / Jul-Dec · method chosen and why."),
        ("5  Family", "SSN cards · birth certificates · school/medical/lease record with the same address · months in the home · HOH: who pays the home costs."),
        ("6  Due diligence", "Form 8867 answered from documents, not memory · copies kept 3 years · inconsistent answers asked and noted."),
        ("7  Payments", "Withholding only from real W-2/1099 boxes · estimated payments confirmed on the IRS account · no guessed numbers."),
        ("8  Review", "Return vs Falcon Preparer summary · every credit recalculated · material participation = Yes for working owners."),
        ("9  Sign & file", "Explain refund drivers to the client · 8879 signed · bank info verified · copy of return given."),
        ("10 Folder", "Return + 8867 + all proof scanned to the secure portal · retention date noted (3 years; 6 if large income risk)."),
    ]
    y = H - 84
    for t, body in left:
        c.setStrokeColor(LINE); c.setFillColor(white)
        c.rect(M, y - 6, 9, 9, fill=1, stroke=1)
        c.setFillColor(NAVY); c.setFont("Helvetica-Bold", 9.6)
        c.drawString(M + 15, y - 4, t)
        y = wrap(c, body, M + 100, y - 4, 310, 9.2, lead=11.8) - 9
    # red flags
    x0 = M + 430
    icon(c, "warning", x0 + 14, H - 82, 14, RED)
    c.setFillColor(RED); c.setFont("Helvetica-Bold", 10.5)
    c.drawString(x0 + 34, H - 86, "12 red flags the IRS notices")
    flags = [
        "Income does not equal the 1099-K + 1099-NEC totals",
        "One big 'other expenses' lump (over 10% of receipts)",
        "Car costs with no mileage record, or 100% business with one family car",
        "Meals for a driver who sleeps at home",
        "Withholding that no form shows",
        "Profit landing exactly where the EITC is highest, with weak records",
        "Round numbers everywhere (e.g. gas exactly $15,000.00)",
        "Material participation 'No' for a working owner",
        "Business code 999000 / no description (use 485310 for rideshare)",
        "Children with no record of living in the home",
        "Head of household without a qualifying person or home costs",
        "Large losses year after year (hobby-loss rules)",
    ]
    y = H - 106
    for i, f in enumerate(flags, 1):
        c.setFillColor(RED); c.circle(x0 + 7, y + 3, 6.5, fill=1, stroke=0)
        c.setFillColor(white); c.setFont("Helvetica-Bold", 6.8); c.drawCentredString(x0 + 7, y + 0.8, str(i))
        y = wrap(c, f, x0 + 20, y, 290, 9.6, lead=12) - 11


def p4_example(c):
    page(c, "Worked example: married rideshare driver, 2 children (illustrative, 2026 rules)", "Made-up round numbers. Same facts, filed two ways: the math is right in both; only the second survives an IRS letter.", 4, TOTAL)
    cols = [("As filed: correct math, weak file", RED, [
                ("Income", "$80,000, matches every 1099: OK"),
                ("Expenses", "$20,000 in one 'other' lump"),
                ("Car", "$30,000 with no mileage record in the file"),
                ("Meals", "$750 deducted"),
                ("Line G", "Material participation: No"),
                ("Refund", "$6,894 (EITC $7,316 + child tax credit $3,110 - SE tax $3,532)"),
                ("If audited", "Car disallowed: profit $55,000, family owes about $1,770. Swing about $8,700 + 20% penalty + interest."),
            ]),
            ("Defensible: same facts, with proof", GREEN, [
                ("Income", "Same $80,000, with the forms and app summaries in the folder"),
                ("App fees", "Line 10 with the amounts from the app tax summaries"),
                ("Car", "Rental + gas + car wash at about 100% (separate personal car), odometer start/end + online miles"),
                ("Meals", "Removed"),
                ("Line G", "Material participation: Yes"),
                ("Refund", "About the same"),
                ("If audited", "Send the folder: refund stays."),
            ])]
    for i, (title, col, rows) in enumerate(cols):
        x = M + i * ((W - 2 * M) / 2 + 6)
        w = (W - 2 * M) / 2 - 6
        c.setFillColor(col); c.roundRect(x, H - 100, w, 26, 6, fill=1, stroke=0)
        icon(c, "warning" if i == 0 else "shield", x + 16, H - 87, 11, col)
        c.setFillColor(white); c.setFont("Helvetica-Bold", 10.5); c.drawString(x + 34, H - 91, title)
        y = H - 120
        for k, v in rows:
            c.setFillColor(col); c.setFont("Helvetica-Bold", 9.8); c.drawString(x + 6, y, k)
            y = wrap(c, v, x + 84, y, w - 94, 9.8, lead=12.4) - 9
            c.setStrokeColor(LINE); c.setLineWidth(0.5); c.line(x + 6, y + 3, x + w - 6, y + 3)
            y -= 6
    # money bars
    c.setFillColor(SOFT); c.roundRect(M, 34, W - 2 * M, 110, 8, fill=1, stroke=0)
    c.setFillColor(NAVY); c.setFont("Helvetica-Bold", 9.5); c.drawString(M + 12, 128, "What the refund is made of (as filed)")
    base, scale = M + 150, 0.042
    for i, (lab, val, col) in enumerate([("EITC", 7316, GREEN), ("Child tax credit", 3110, TEAL), ("SE tax", -3532, RED), ("Refund", 6894, NAVY)]):
        y = 108 - i * 18
        c.setFillColor(INK); c.setFont("Helvetica", 8.2); c.drawRightString(base - 8, y + 2, lab)
        c.setFillColor(col); c.rect(base, y - 2, abs(val) * scale, 11, fill=1, stroke=0)
        c.setFillColor(INK); c.setFont("Helvetica-Bold", 8.2)
        c.drawString(base + abs(val) * scale + 6, y + 1, ("-" if val < 0 else "") + f"${abs(val):,}")
    wrap(c, "No tax was withheld. The whole refund is refundable credits, so it depends on the business profit being provable. That is exactly what the IRS checks on self-employed EITC returns.",
         base + 360, 104, W - 2 * M - 520, 8.2)


def p5_letter(c):
    page(c, "If an IRS letter arrives", "Most rideshare / EITC audits are by mail. Answer on time, send copies (never originals), keep proof of mailing.", 5, TOTAL)
    flow = [("Read the letter", "envelope", NAVY, "Note the notice number and the reply-by date. Common: CP2000 (income mismatch), CP75 / Form 886-H-EIC (EITC proof), letter 566 (exam)."),
            ("Get authority", "pen", BLUE, "Form 2848 power of attorney (or 8821 for information only) so you can speak for the client."),
            ("Pull the folder", "folder", TEAL, "Use the audit-ready folder. Match each item the letter asks for to a document."),
            ("Answer each point", "clipboard", PURPLE, "Cover letter + numbered exhibits. Short and factual. Agree with what is right; explain what is not."),
            ("Send and track", "calendar", ORANGE, "Fax, upload or certified mail before the deadline. Calendar a follow-up in 30-45 days."),
            ("Outcome", "check", GREEN, "Accepted: done. Changes proposed: agree, or ask for a manager / appeal. Can't pay: payment plan.")]
    bw, bh = 118, 170
    gap = (W - 2 * M - 6 * bw) / 5
    y = H - 100 - bh
    for i, (t, k, col, body) in enumerate(flow):
        x = M + i * (bw + gap)
        box(c, x, y, bw, bh, col, t, body, k, i + 1)
        if i < 5:
            arrow(c, x + bw, y + bh / 2, x + bw + gap, y + bh / 2)
    c.setFillColor(SOFT); c.roundRect(M, y - 210, W - 2 * M, 190, 8, fill=1, stroke=0)
    icon(c, "warning", M + 26, y - 50, 16, RED)
    wrap(c, "Never ignore a letter. No answer means the IRS proposal becomes final and the refund is taken back.\n"
            "Common EITC proof the IRS asks for: school, medical, day-care or lease records showing each child at the same address for over half the year; business records for self-employment income.\n"
            "Penalties to know: 20% accuracy-related penalty on the extra tax; EITC ban of 2 years (reckless) or 10 years (fraud); preparer due-diligence penalty for each missing Form 8867 requirement (about $650 per failure, adjusted yearly).\n"
            "Deadlines: the reply-by date in the letter (usually 30 days). If more time is needed, call the number on the letter before the date and ask for an extension.",
         M + 52, y - 44, W - 2 * M - 70, 10.2, lead=14)


def p6_requests(c):
    page(c, "Client document request list and the year-round calendar", "Hand or text this list to every self-employed client. Same list every year.", 6, TOTAL)
    groups = [("Income", BLUE, ["All 1099-K, 1099-NEC (Uber, Lyft, DoorDash...)", "App annual tax summaries (fees, online miles)", "Any W-2, 1099-G, 1099-R, 1099-INT", "Cash or bonus income with no form"]),
              ("Vehicle", PURPLE, ["Rental / lease contract and monthly statements", "Odometer photo Jan 1 and Dec 31 (or rental start/end)", "Gas, car wash, repair, insurance receipts or bank statements", "Personal car registration + insurance (if any)"]),
              ("Business costs", TEAL, ["Phone bill (business share)", "Supplies, accessories, passenger items", "Tolls and parking statements", "Anything over $2,500 (purchase date and price)"]),
              ("Family", ORANGE, ["SSN cards and birth certificates (children)", "School or medical record with home address", "Childcare provider name, tax ID, amount", "Lease or utility bill in your name"]),
              ("Payments", GREEN, ["IRS and state estimated payment confirmations", "Last year's return and any IRS letters", "Bank account for direct deposit", "Photo ID for both spouses"])]
    cw = (W - 2 * M - 4 * 10) / 5
    for i, (t, col, items) in enumerate(groups):
        x = M + i * (cw + 10)
        y = H - 92
        c.setFillColor(col); c.roundRect(x, y - 4, cw, 22, 6, fill=1, stroke=0)
        c.setFillColor(white); c.setFont("Helvetica-Bold", 9.5); c.drawString(x + 8, y + 3, t)
        y -= 22
        for it in items:
            c.setStrokeColor(LINE); c.setFillColor(white); c.rect(x + 2, y - 5, 8, 8, fill=1, stroke=1)
            y = wrap(c, it, x + 15, y - 3, cw - 18, 9.2, lead=11.6) - 10
    # calendar strip
    months = [("Jan", "1099s and app summaries arrive. Odometer photo Jan 1. Book the appointment."),
              ("Feb-Mar", "Run steps 1-10. EITC refunds release from mid-February."),
              ("Apr 15", "Filing deadline and Q1 estimated payment."),
              ("Jun 15", "Q2 estimate. Mid-year odometer photo (2026 mileage rate changes Jul 1)."),
              ("Sep 15", "Q3 estimate. Mid-year check-in: profit on track?"),
              ("Oct 15", "Extended returns due."),
              ("Dec 31", "Odometer photo. Year-end: buy needed equipment, fund SEP/IRA plan."),
              ("Jan 15", "Q4 estimated payment for last year.")]
    c.setFillColor(NAVY); c.setFont("Helvetica-Bold", 10.5)
    c.drawString(M, 196, "Year-round calendar")
    icon(c, "calendar", M + 140, 199, 11, NAVY)
    sw = (W - 2 * M) / len(months)
    for i, (m, t) in enumerate(months):
        x = M + i * sw
        c.setFillColor(GOLD if i % 2 == 0 else NAVY)
        c.rect(x, 162, sw - 4, 22, fill=1, stroke=0)
        c.setFillColor(white); c.setFont("Helvetica-Bold", 9); c.drawCentredString(x + (sw - 4) / 2, 169, m)
        wrap(c, t, x + 3, 150, sw - 10, 8.4, lead=10.6)
    c.setFillColor(SOFT); c.roundRect(M, 30, W - 2 * M, 50, 8, fill=1, stroke=0)
    icon(c, "shield", M + 26, 55, 16, GREEN)
    wrap(c, "Privacy: collect documents only through the secure portal, never by email or text. Keep files under your written security plan (WISP); delete or archive at the end of the retention period. Never put real client data into test tools or examples.",
         M + 52, 62, W - 2 * M - 70, 8.4)


def build(path):
    c = canvas.Canvas(path, pagesize=(W, H))
    c.setTitle("Falcon Tax Solutions - Pre-return audit-proofing action plan")
    c.setAuthor("Falcon Tax Solutions")
    for fn in (p1_overview, p2_vehicle, p3_checklist, p4_example, p5_letter, p6_requests):
        fn(c)
        c.showPage()
    c.save()


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "falcon-pre-return-audit-plan.pdf"
    build(out)
    print("wrote", out)
