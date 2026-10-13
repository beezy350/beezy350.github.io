"""Phone edition of the pre-return audit-proofing plan: 3 tall pages, big text.

Same content as build_audit_plan.py, condensed for reading on a phone:
  1. The 10 steps before you file (vertical flow chart)
  2. The car: decision tree, business %, method, red flags
  3. Client document list, IRS letter steps, year-round calendar

Run:  python3 tax-prep/tools/build_audit_plan_phone.py tax-prep/internal/falcon-audit-plan-phone.pdf
"""
import sys
from reportlab.lib.colors import HexColor, white
from reportlab.pdfgen import canvas

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from build_audit_plan import (BLUE, GOLD, GREEN, INK, LINE, MUTED, NAVY, ORANGE, PURPLE, RED, SOFT, TEAL,  # noqa: E402
                              arrow, icon, wrap)

W, H = 432, 936  # 6 x 13 in, phone shaped
M = 22


def header(c, n, title, sub):
    c.setFillColor(NAVY)
    c.rect(0, H - 96, W, 96, fill=1, stroke=0)
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(M, H - 24, f"FALCON TAX  ·  AUDIT-PROOF PLAN  ·  {n} / 3")
    c.setFillColor(white)
    c.setFont("Times-Bold", 25)
    c.drawString(M, H - 56, title)
    wrap(c, sub, M, H - 76, W - 2 * M, 10.5, colour=HexColor("#C9D3E3"))
    return H - 116


def footer(c):
    c.setFillColor(MUTED)
    c.setFont("Helvetica-Oblique", 7.5)
    c.drawCentredString(W / 2, 12, "Internal guide, not legal advice. Confirm rates on irs.gov each year.")


def card(c, x, y, w, h, colour, fill=white):
    c.setFillColor(fill)
    c.setStrokeColor(colour)
    c.setLineWidth(1.6)
    c.roundRect(x, y, w, h, 10, fill=1, stroke=1)


def page1(c):
    y = header(c, 1, "Before you file", "Do the 10 steps in order. Don't file until every step has proof in the client folder.")
    steps = [
        ("Intake & consent", "clipboard", NAVY, "Engagement letter, 7216 consent, both IDs, last year's return, IRS transcript."),
        ("Match all income", "doc", BLUE, "Every 1099-K + 1099-NEC + income with no form = Schedule C line 1."),
        ("Expenses by line", "receipt", TEAL, "App fees line 10 · car 9 · car rent 20a · supplies 22 · phone 25 · no lumps."),
        ("Vehicle test", "car", PURPLE, "Online miles ÷ odometer miles. Second personal car? (page 2)"),
        ("Family & credits", "family", ORANGE, "Each child: SSN, birth date, record with the home address."),
        ("Due diligence", "shield", GREEN, "Form 8867 from documents. Keep copies 3 years."),
        ("Red-flag scan", "magnifier", RED, "Check the 8 red flags on page 2."),
    ]
    after = [
        ("Prepare & review", "check", NAVY, "Prepare in software; compare with the Falcon Preparer summary."),
        ("Client signs & files", "pen", BLUE, "Explain the refund, sign Form 8879, verify the bank account."),
        ("Audit-ready folder", "folder", TEAL, "Return + 8867 + all proof in the portal. Keep 3 years."),
    ]
    ch, gap = 56, 10
    x, w = M + 26, W - 2 * M - 26

    def draw(i, t, k, col, body, y):
        card(c, x, y - ch, w, ch, col)
        icon(c, k, M + 14, y - ch / 2, 17, col)
        c.setFillColor(col)
        c.setFont("Helvetica-Bold", 7.5)
        c.drawString(x + 22, y - 15, f"STEP {i}")
        c.setFont("Helvetica-Bold", 12.5)
        c.drawString(x + 62, y - 15, t)
        wrap(c, body, x + 22, y - 31, w - 30, 10, lead=12.4)
        return y - ch - gap

    for i, s in enumerate(steps, 1):
        y = draw(i, *s, y)
    # decision
    cx = W / 2 + 13
    y -= 4
    p = c.beginPath()
    dh, dw = 62, 230
    p.moveTo(cx, y); p.lineTo(cx + dw / 2, y - dh / 2); p.lineTo(cx, y - dh); p.lineTo(cx - dw / 2, y - dh / 2); p.close()
    c.setFillColor(HexColor("#FFF8E1")); c.setStrokeColor(GOLD); c.setLineWidth(2)
    c.drawPath(p, fill=1, stroke=1)
    c.setFillColor(INK); c.setFont("Helvetica-Bold", 11.5)
    c.drawCentredString(cx, y - dh / 2 + 3, "All proof in the folder?")
    c.setFillColor(RED); c.setFont("Helvetica-Bold", 10)
    c.drawString(cx + dw / 2 + 4, y - dh / 2 + 6, "NO")
    wrap(c, "Send the request list (page 3), then back to step 1", cx + dw / 2 + 4, y - dh / 2 - 7, W - (cx + dw / 2 + 4) - 6, 8, colour=RED)
    c.setFillColor(GREEN); c.setFont("Helvetica-Bold", 10)
    c.drawString(cx + 6, y - dh - 12, "YES")
    arrow(c, cx, y - dh, cx, y - dh - 14, GREEN)
    y -= dh + 16
    for i, s in enumerate(after, 8):
        y = draw(i, *s, y)
    # golden rule
    c.setFillColor(SOFT)
    c.roundRect(M, 26, W - 2 * M, max(40, y - 30), 10, fill=1, stroke=0)
    c.setFillColor(GOLD); c.setFont("Helvetica-Bold", 11)
    c.drawString(M + 12, y - 14 if y - 14 < 60 else 52, "Golden rule")
    wrap(c, "A number is only as strong as the document behind it.", M + 96, y - 14 if y - 14 < 60 else 52, W - 2 * M - 108, 10.5)
    footer(c)


def page2(c):
    y = header(c, 2, "The car & red flags", "The biggest deduction and the biggest audit risk. Write the miles down.")
    cx = W / 2
    icon(c, "car", cx, y - 22, 22, PURPLE)
    y -= 50
    arrow(c, cx, y + 4, cx, y - 8)
    dh, dw = 64, 300
    p = c.beginPath()
    p.moveTo(cx, y - 8); p.lineTo(cx + dw / 2, y - 8 - dh / 2); p.lineTo(cx, y - 8 - dh); p.lineTo(cx - dw / 2, y - 8 - dh / 2); p.close()
    c.setFillColor(HexColor("#FFF8E1")); c.setStrokeColor(GOLD); c.setLineWidth(2)
    c.drawPath(p, fill=1, stroke=1)
    c.setFillColor(INK); c.setFont("Helvetica-Bold", 11.5)
    c.drawCentredString(cx, y - 8 - dh / 2 + 3, "Separate personal car?")
    y -= 8 + dh + 10
    bw = (W - 2 * M - 12) / 2
    for i, (t, col, body, k) in enumerate([
            ("YES: ~100% business", GREEN, "Keep the personal car's registration + insurance, the rental contract, odometer start & end.", "check"),
            ("NO: business % only", RED, "Errands and school runs are personal. Deduct only the business share.", "warning")]):
        x = M + i * (bw + 12)
        card(c, x, y - 108, bw, 108, col)
        icon(c, k, x + 20, y - 20, 13, col)
        c.setFillColor(col); c.setFont("Helvetica-Bold", 11)
        c.drawString(x + 38, y - 24, t)
        wrap(c, body, x + 10, y - 46, bw - 20, 10, lead=12.6)
    y -= 122
    # formula
    card(c, M, y - 70, W - 2 * M, 70, PURPLE, HexColor("#F3EEF8"))
    icon(c, "odometer", M + 30, y - 35, 20, PURPLE)
    c.setFillColor(PURPLE); c.setFont("Helvetica-Bold", 12)
    c.drawString(M + 60, y - 22, "Business % =")
    c.setFillColor(INK); c.setFont("Helvetica", 11)
    c.drawString(M + 60, y - 40, "app online miles  ÷  odometer miles")
    c.setFont("Helvetica-Oblique", 9.5); c.setFillColor(MUTED)
    c.drawString(M + 60, y - 56, "example: 40,000 ÷ 45,000 = 89%")
    y -= 84
    # methods
    for i, (t, col, lines) in enumerate([
            ("Actual costs", TEAL, ["(rent + gas + insurance", "+ repairs + car wash)", "× business %", "Best when rent is high"]),
            ("Mileage rate", BLUE, ["2026: 72.5¢ Jan–Jun", "76¢ Jul–Dec (2025: 70¢)", "Leased car: keep it", "for the whole lease"])]):
        x = M + i * (bw + 12)
        card(c, x, y - 104, bw, 104, col)
        c.setFillColor(col); c.roundRect(x, y - 24, bw, 24, 10, fill=1, stroke=0)
        c.rect(x, y - 24, bw, 12, fill=1, stroke=0)
        c.setFillColor(white); c.setFont("Helvetica-Bold", 11.5); c.drawCentredString(x + bw / 2, y - 17, t)
        c.setFillColor(INK); c.setFont("Helvetica", 10)
        for j, l in enumerate(lines):
            c.drawCentredString(x + bw / 2, y - 42 - j * 15, l)
    c.setFillColor(MUTED); c.setFont("Helvetica-Oblique", 9)
    c.drawCentredString(W / 2, y - 118, "Compare both; the Falcon estimator does it for you. Tolls & parking: either way.")
    y -= 136
    # red flags
    icon(c, "warning", M + 14, y - 10, 14, RED)
    c.setFillColor(RED); c.setFont("Helvetica-Bold", 14)
    c.drawString(M + 36, y - 15, "8 red flags the IRS notices")
    y -= 34
    flags = ["Income ≠ total of all 1099s", "One big 'other expenses' lump", "Car costs without a mileage record",
             "Meals for a driver who sleeps at home", "Withholding no form shows", "Profit right at the EITC peak, weak records",
             "'Materially participate: No' for a worker", "Children without a home-address record"]
    for i, f in enumerate(flags, 1):
        c.setFillColor(HexColor("#FBEAEA") if i % 2 else white)
        c.roundRect(M, y - 22, W - 2 * M, 24, 6, fill=1, stroke=0)
        c.setFillColor(RED); c.circle(M + 14, y - 10, 8.5, fill=1, stroke=0)
        c.setFillColor(white); c.setFont("Helvetica-Bold", 9); c.drawCentredString(M + 14, y - 13, str(i))
        c.setFillColor(INK); c.setFont("Helvetica", 11); c.drawString(M + 30, y - 14, f)
        y -= 27
    footer(c)


def page3(c):
    y = header(c, 3, "Client list & IRS letters", "Text this list to every self-employed client. If a letter comes, follow the 6 steps.")
    groups = [("Income", BLUE, "doc", ["All 1099-K & 1099-NEC", "App yearly tax summaries", "Any W-2 / 1099-G / 1099-R"]),
              ("Car", PURPLE, "car", ["Rental or lease contract", "Odometer photo Jan 1 & Dec 31", "Gas & car-wash receipts"]),
              ("Costs", TEAL, "receipt", ["Phone bill", "Supplies & tolls", "Items over $2,500"]),
              ("Family", ORANGE, "family", ["Children's SSN & birth dates", "School/medical record with address", "Childcare provider & amount"]),
              ("Payments", GREEN, "folder", ["IRS & state payment proof", "Last year's return & letters", "Photo IDs, bank account"])]
    bw = (W - 2 * M - 10) / 2
    for i, (t, col, k, items) in enumerate(groups):
        r, cl = divmod(i, 2)
        x = M + cl * (bw + 10)
        yy = y - r * 112
        card(c, x, yy - 104, bw, 104, col)
        icon(c, k, x + 18, yy - 18, 12, col)
        c.setFillColor(col); c.setFont("Helvetica-Bold", 12)
        c.drawString(x + 36, yy - 22, t)
        ly = yy - 42
        for it in items:
            c.setStrokeColor(LINE); c.setFillColor(white); c.rect(x + 10, ly - 3, 9, 9, fill=1, stroke=1)
            ly = wrap(c, it, x + 25, ly - 1, bw - 32, 9.6, lead=11.6) - 5
    # 6th cell: privacy
    x = M + bw + 10
    yy = y - 2 * 112
    card(c, x, yy - 104, bw, 104, NAVY, SOFT)
    icon(c, "shield", x + 18, yy - 18, 12, NAVY)
    c.setFillColor(NAVY); c.setFont("Helvetica-Bold", 12); c.drawString(x + 36, yy - 22, "Privacy")
    wrap(c, "Only through the secure portal. Never by email or text.", x + 10, yy - 44, bw - 20, 10, lead=12.6)
    y -= 3 * 112 + 8
    # IRS letter steps
    icon(c, "envelope", M + 16, y - 12, 15, NAVY)
    c.setFillColor(NAVY); c.setFont("Helvetica-Bold", 14)
    c.drawString(M + 40, y - 17, "If an IRS letter arrives")
    y -= 34
    steps = [("Read it", "Notice number + reply-by date (usually 30 days)"), ("Get authority", "Form 2848 so you can speak for the client"),
             ("Pull the folder", "Match each request to a document"), ("Answer each point", "Cover letter + numbered copies, never originals"),
             ("Send & track", "Before the deadline; keep proof of sending"), ("Outcome", "Accepted, or agree / appeal / payment plan")]
    for i, (t, d) in enumerate(steps, 1):
        c.setFillColor(NAVY); c.circle(M + 12, y - 9, 10, fill=1, stroke=0)
        c.setFillColor(white); c.setFont("Helvetica-Bold", 10); c.drawCentredString(M + 12, y - 12.5, str(i))
        c.setFillColor(NAVY); c.setFont("Helvetica-Bold", 11); c.drawString(M + 30, y - 6, t)
        c.setFillColor(INK); c.setFont("Helvetica", 9.8); c.drawString(M + 30, y - 19, d)
        if i < 6:
            c.setStrokeColor(LINE); c.setLineWidth(2); c.line(M + 12, y - 19, M + 12, y - 30)
        y -= 32
    c.setFillColor(RED); c.setFont("Helvetica-Bold", 10)
    c.drawString(M, y - 6, "Never ignore a letter: no answer = the IRS takes the refund back.")
    y -= 24
    # calendar
    icon(c, "calendar", M + 14, y - 10, 13, GOLD)
    c.setFillColor(NAVY); c.setFont("Helvetica-Bold", 14); c.drawString(M + 36, y - 15, "Year-round calendar")
    y -= 30
    cal = [("Jan 1", "Odometer photo"), ("Jan 15", "Q4 estimated tax"), ("Jan 31", "1099s arrive"), ("Apr 15", "File + Q1 estimate"),
           ("Jun 15", "Q2 + odometer photo"), ("Sep 15", "Q3 estimate"), ("Oct 15", "Extended returns due"), ("Dec 31", "Odometer photo")]
    cw = (W - 2 * M - 10) / 2
    for i, (d, t) in enumerate(cal):
        r, cl = divmod(i, 2)
        x = M + cl * (cw + 10)
        yy = y - r * 26
        c.setFillColor(GOLD if (r + cl) % 2 == 0 else NAVY)
        c.roundRect(x, yy - 20, 56, 20, 5, fill=1, stroke=0)
        c.setFillColor(white); c.setFont("Helvetica-Bold", 9.6); c.drawCentredString(x + 28, yy - 14, d)
        c.setFillColor(INK); c.setFont("Helvetica", 10); c.drawString(x + 62, yy - 14, t)
    footer(c)


def build(path):
    c = canvas.Canvas(path, pagesize=(W, H))
    c.setTitle("Falcon Tax Solutions - Audit-proof plan (phone)")
    c.setAuthor("Falcon Tax Solutions")
    for fn in (page1, page2, page3):
        fn(c)
        c.showPage()
    c.save()


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "falcon-audit-plan-phone.pdf"
    build(out)
    print("wrote", out)
