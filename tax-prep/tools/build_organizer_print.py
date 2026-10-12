"""Build the PRINT edition of the Falcon Tax Organizer (tax year 2026).

For clients who print the organizer and fill it in by hand. Large boxes,
taller rows and a filing-type guide. Same questions and labels as the
fillable PDF, and every data page keeps the "PAGE n OF 4" header so the
Scan Reader can read a photo of it.

Run:  python3 tax-prep/tools/build_organizer_print.py [output.pdf]
"""
import sys
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from build_organizer import CHECKLIST, EXPENSES  # noqa: E402

W, H = letter
NAVY, GOLD, INK, MUTED, BOX = (HexColor(c) for c in ["#1D3557", "#C8963E", "#1B2230", "#5A6475", "#7F8A9A"])
SOFT = HexColor("#F4F5F7")
M = 34


class Sheet:
    def __init__(self, path):
        self.c = canvas.Canvas(path, pagesize=letter)
        self.c.setTitle("Falcon Tax Solutions - 2026 Tax Organizer (print edition)")
        self.c.setAuthor("Falcon Tax Solutions")
        self.started = False

    def page(self, organizer_page, title, sub, cont=False):
        if self.started:
            self.footer()
            self.c.showPage()
        self.started = True
        c = self.c
        c.setFillColor(NAVY)
        c.rect(0, H - 62, W, 62, fill=1, stroke=0)
        c.setFillColor(GOLD)
        c.setFont("Helvetica-Bold", 8)
        tag = f"PAGE {organizer_page} OF 4" if organizer_page else "START HERE"
        c.drawString(M, H - 21, f"FALCON TAX SOLUTIONS  ·  2026 TAX ORGANIZER  ·  {tag}" + ("  ·  CONTINUED" if cont else ""))
        c.setFillColor(white)
        c.setFont("Times-Bold", 19)
        c.drawString(M, H - 43, title)
        c.setFont("Helvetica", 8.5)
        c.setFillColor(HexColor("#C9D3E3"))
        c.drawString(M, H - 56, sub)
        return H - 80

    def footer(self):
        c = self.c
        c.setFont("Helvetica-Oblique", 7.5)
        c.setFillColor(MUTED)
        c.drawString(M, 18, "Print clearly in BLOCK LETTERS and dark ink. Numbers without $ or commas are fine. No Social Security or bank account numbers.")

    def section(self, y, text):
        c = self.c
        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(M, y, text)
        c.setStrokeColor(GOLD)
        c.setLineWidth(1.2)
        c.line(M, y - 4, W - M, y - 4)
        return y - 18

    def text(self, x, y, s, size=9, color=INK, bold=False):
        self.c.setFillColor(color)
        self.c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
        self.c.drawString(x, y, s)

    def box(self, x, y, w, h=20, dollar=False):
        c = self.c
        c.setStrokeColor(BOX)
        c.setLineWidth(0.8)
        c.setFillColor(white)
        c.rect(x, y, w, h, fill=1, stroke=1)
        if dollar:
            self.text(x + 3, y + h / 2 - 3, "$", 9, MUTED)

    def check(self, x, y, size=12):
        c = self.c
        c.setStrokeColor(BOX)
        c.setLineWidth(1)
        c.setFillColor(white)
        c.rect(x, y, size, size, fill=1, stroke=1)

    def table(self, y, cols, rows, row_h=24):
        """cols: (header, width, money)"""
        c = self.c
        total = sum(w for _, w, _ in cols)
        c.setFillColor(NAVY)
        c.rect(M, y - 5, total, 17, fill=1, stroke=0)
        x = M
        for head, w, _ in cols:
            self.text(x + 4, y, head, 7.6, white, True)
            x += w
        y -= 5
        for r in range(rows):
            y -= row_h
            x = M
            for head, w, money in cols:
                self.box(x, y, w, row_h, dollar=money)
                x += w
            self.text(M - 13, y + row_h / 2 - 3, str(r + 1), 7, MUTED)
        return y - 14


def build(path):
    s = Sheet(path)

    # ---------- Guide ----------
    y = s.page(0, "Your 2026 Tax Organizer", "Print it, fill it in by hand, then send us photos or a scan of pages 1 to 4.")
    y = s.section(y, "How to fill it in")
    for line in [
        "1. Use dark ink and print clearly in BLOCK LETTERS. One number per box line, e.g. 41000 or 41,000.",
        "2. Skip any section that doesn't apply to you. Empty boxes count as zero.",
        "3. Take a flat, well-lit photo of each page (or scan it) and send all pages to Falcon Tax Solutions.",
        "4. We'll reply with your estimated federal and state refund or amount due.",
        "5. Never write Social Security numbers or bank account numbers on this form.",
    ]:
        s.text(M, y, line, 9.5)
        y -= 15
    y -= 8
    y = s.section(y, "Which filing type are you?")
    types = [
        ("Single", "Not married on Dec 31, 2026, and no qualifying person living with you."),
        ("Married filing jointly", "Married on Dec 31, 2026, and filing one return together. Usually the lowest tax."),
        ("Married filing separately", "Married, but each spouse files their own return. Usually costs more; ask us first."),
        ("Head of household", "Not married, paid more than half the cost of your home, and a qualifying child or relative lived with you."),
    ]
    for name, desc in types:
        s.check(M, y - 3)
        s.text(M + 18, y, name, 10, NAVY, True)
        s.text(M + 170, y, desc, 8.6)
        y -= 20
    y -= 6
    y = s.section(y, "What to fill in for your filing type")
    cols = ["Section", "Single", "Married jointly", "Married separately", "Head of household"]
    widths = [196, 82, 82, 92, 92]
    rows = [
        ("Page 1 · Filing status, state, your birth year", "Yes", "Yes", "Yes", "Yes"),
        ("Page 1 · Spouse's birth year", "—", "Yes", "—", "—"),
        ("Page 1 · Dependents table", "If any*", "If any", "If any", "Required"),
        ("Page 1 · Checklist", "Yes", "Yes", "Yes", "Yes"),
        ("Page 2 · W-2 jobs", "Yours", "Both spouses", "Yours only", "Yours"),
        ("Page 2 · Self-employment, cash & other income", "Yours", "Both spouses", "Yours only", "Yours"),
        ("Page 3 · Business expenses", "If self-employed", "If self-employed", "If self-employed", "If self-employed"),
        ("Page 4 · Truck driver trips", "If trucker", "If trucker", "If trucker", "If trucker"),
        ("Page 4 · Estimated tax payments", "If paid", "If paid", "If paid", "If paid"),
    ]
    c = s.c
    c.setFillColor(NAVY)
    c.rect(M, y - 5, sum(widths), 17, fill=1, stroke=0)
    x = M
    for h, w in zip(cols, widths):
        s.text(x + 4, y, h, 8, white, True)
        x += w
    y -= 5
    for i, row in enumerate(rows):
        y -= 19
        if i % 2 == 0:
            c.setFillColor(SOFT)
            c.rect(M, y, sum(widths), 19, fill=1, stroke=0)
        x = M
        for j, (val, w) in enumerate(zip(row, widths)):
            s.text(x + 4, y + 6, val, 8.4, INK if j else NAVY, j == 0)
            x += w
    y -= 14
    s.text(M, y, "* A single filer with a qualifying child or relative usually qualifies for Head of household, which lowers tax. Ask us.", 8, MUTED)
    y -= 22
    y = s.section(y, "Your contact information (so we can send your estimate)")
    s.text(M, y, "Name", 8, MUTED)
    s.text(M + 240, y, "Phone", 8, MUTED)
    s.text(M + 380, y, "Email", 8, MUTED)
    s.box(M, y - 26, 228, 22)
    s.box(M + 240, y - 26, 128, 22)
    s.box(M + 380, y - 26, W - 2 * M - 380, 22)
    y -= 46
    s.check(M, y - 2)
    c.setFont("Helvetica", 8.4)
    c.setFillColor(INK)
    t = c.beginText(M + 18, y + 4)
    for line in ["I confirm this information is accurate to the best of my knowledge. I understand an estimate is not a filed return or a",
                 "promise of any refund, and I agree that Falcon Tax Solutions and its service providers (including AI tools used to read this",
                 "form) may use this information only to prepare my estimate and return.          Signature: ________________________  Date: __________"]:
        t.textLine(line)
    c.drawText(t)

    # ---------- Page 1 ----------
    y = s.page(1, "Household & dependents", "Check one filing status. Married filing jointly: include your spouse.")
    y = s.section(y, "Filing status (check one)")
    x = M
    for lab in ["Single", "Married filing jointly", "Married filing separately", "Head of household"]:
        s.check(x, y - 4)
        s.text(x + 17, y - 1, lab, 9.5)
        x += 136
    y -= 30
    s.text(M, y, "State you lived in during 2026", 8.5, MUTED)
    s.text(M + 220, y, "Your birth year", 8.5, MUTED)
    s.text(M + 340, y, "Spouse's birth year (joint returns)", 8.5, MUTED)
    s.box(M, y - 28, 200, 24)
    s.box(M + 220, y - 28, 100, 24)
    s.box(M + 340, y - 28, 100, 24)
    y -= 48
    s.check(M, y - 3)
    s.text(M + 18, y, "I paid for childcare or daycare so I could work", 9.5)
    y -= 28
    y = s.section(y, "Dependents (children and relatives you support)")
    s.text(M, y + 2, "Children under 17 at the end of 2026 were born in 2010 or later. Leave empty if you have no dependents.", 8, MUTED)
    y -= 12
    y = s.table(y, [("First name", 150, False), ("Relationship", 110, False), ("Birth year", 80, False),
                    ("Months lived with you", 110, False), ("Has an SSN? (Yes/No)", 94, False)], 8, row_h=24)
    y -= 6
    y = s.section(y, "Checklist (check every one that applies)")
    for _, q in CHECKLIST:
        s.check(M, y - 3)
        s.text(M + 18, y, q, 9.2)
        y -= 19

    # ---------- Page 2 ----------
    y = s.page(2, "Paychecks, cash, tips & other income", "Married filing jointly: both spouses. Married filing separately: only your own.")
    y = s.section(y, "Jobs (W-2 paychecks), one row per W-2")
    y = s.table(y, [("Employer", 108, False), ("Whose", 64, False), ("Wages (box 1)", 76, True),
                    ("Fed. tax (box 2)", 74, True), ("State tax (box 17)", 78, True), ("Tips (box 7)", 68, True),
                    ("OT premium", 76, True)], 6, row_h=26)
    s.text(M, y, "Whose = You or Spouse.   OT premium = only the extra 'half' of time-and-a-half.", 8, MUTED)
    y -= 22
    y = s.section(y, "Self-employment & cash income (1099-NEC, 1099-K, cash, Zelle, checks)")
    y = s.table(y, [("Payer or description", 260, False), ("Type (1099-NEC / 1099-K / Cash / App)", 160, False), ("Amount received", 124, True)], 8, row_h=25)
    y -= 6
    y = s.section(y, "Other income")
    for lab in ["Cash tips NOT reported to your employer", "Bank interest (1099-INT)", "Unemployment benefits (1099-G)",
                "Retirement withdrawals, taxable amount (1099-R)", "Other taxable income (prizes, rental profit, etc.)"]:
        s.text(M, y + 5, lab, 9.5)
        s.box(M + 330, y - 2, 150, 22, dollar=True)
        y -= 27

    # ---------- Page 3: expenses over two sheets ----------
    groups, current = [], None
    for label, line, share, _tip in EXPENSES:
        if line is None:
            current = [label, []]
            groups.append(current)
        else:
            current[1].append((label, line, share))
    sheets = [groups[:1], groups[1:2], groups[2:]]  # general | trucking | repairs + other
    titles = ["Business expenses: general", "Business expenses: trucking", "Business expenses: repairs & other"]
    for i, (chunk, title) in enumerate(zip(sheets, titles)):
        y = s.page(3, title, "Self-employed only. Enter the full amount paid in 2026; we apply meal limits and depreciation.", cont=i > 0)
        row_h = 22
        for name, items in chunk:
            y = s.section(y, name.title()) - 8
            for label, line, share in items:
                text = label or "Other (describe): ______________________________"
                if share == 0.5:
                    text += "   (50% deductible)"
                s.text(M, y + 7, text, 9.2)
                s.text(W - M - 210, y + 7, f"line {line}", 7.5, MUTED)
                s.box(W - M - 170, y, 170, row_h - 4, dollar=True)
                y -= row_h
            y -= 8
        if i == 0:
            s.text(M, y, "Equipment, electronics or software over $2,500 per item may need depreciation; we'll handle that on your return.", 8, MUTED)

    # ---------- Page 4 ----------
    y = s.page(4, "Truck driver trips & tax payments", "Per diem: $80/day in the U.S., $86 in Canada; travel days at 75%; 80% deductible (IRS Notice 2026-60).")
    y = s.section(y, "Trips away from home overnight (self-employed truck drivers)")
    y = s.table(y, [("Left home (date)", 120, False), ("Got back (date)", 120, False), ("Full days in Canada", 104, False),
                    ("Notes (route, truck)", 200, False)], 20, row_h=19)
    s.text(M, y, "Dates like 3/2/2026. More trips? Attach your logbook or ELD trip report.", 8, MUTED)
    y -= 20
    y = s.section(y, "Estimated tax payments for 2026")
    q = [("Q1 (Apr 15)",), ("Q2 (Jun 15)",), ("Q3 (Sep 15)",), ("Q4 (Jan 15, 2027)",)]
    y = s.table(y, [("Quarter", 120, False), ("Federal paid", 110, True), ("Date", 95, False), ("State paid", 110, True), ("Date", 95, False)], 4, row_h=22)
    # print the quarter names inside the first column
    yy = y + 10
    for label in reversed([x[0] for x in q]):
        s.text(M + 6, yy + 7, label, 8.6)
        yy += 22
    s.footer()
    s.c.save()


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "falcon-tax-organizer-2026-print.pdf"
    build(out)
    print("wrote", out)
