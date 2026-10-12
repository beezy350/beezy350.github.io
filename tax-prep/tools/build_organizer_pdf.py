"""Build the fillable PDF version of the Falcon Tax Organizer (tax year 2026).

Same questions as the Excel organizer, as typeable PDF form fields, for clients
who print or fill a PDF and email it back. The Excel version is the one that
uploads to the estimator.

Run:  python3 tax-prep/tools/build_organizer_pdf.py [output.pdf]
"""
import sys
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from build_organizer import CHECKLIST, EXPENSES  # noqa: E402  same lists as the Excel organizer

W, H = letter
NAVY, GOLD, INK, MUTED, LINE = (HexColor(c) for c in ["#1D3557", "#C8963E", "#1B2230", "#5A6475", "#C9D1DC"])
FIELD_BG = HexColor("#FFF8E1")
M = 36  # margin


class Form:
    def __init__(self, path):
        self.c = canvas.Canvas(path, pagesize=letter)
        self.c.setTitle("Falcon Tax Solutions - 2026 Tax Organizer")
        self.c.setAuthor("Falcon Tax Solutions")
        self.page = 0
        self.n = 0

    def name(self, base):
        self.n += 1
        return f"{base}_{self.n}"

    def new_page(self, title, sub):
        if self.page:
            self.footer()
            self.c.showPage()
        self.page += 1
        c = self.c
        c.setFillColor(NAVY)
        c.rect(0, H - 64, W, 64, fill=1, stroke=0)
        c.setFillColor(GOLD)
        c.setFont("Helvetica-Bold", 7.5)
        c.drawString(M, H - 22, f"FALCON TAX SOLUTIONS  ·  2026 TAX ORGANIZER  ·  PAGE {self.page} OF 4")
        c.setFillColor(white)
        c.setFont("Times-Bold", 19)
        c.drawString(M, H - 44, title)
        c.setFont("Helvetica", 8.5)
        c.setFillColor(HexColor("#C9D3E3"))
        c.drawString(M, H - 57, sub)
        return H - 82

    def footer(self):
        c = self.c
        c.setFont("Helvetica-Oblique", 7)
        c.setFillColor(MUTED)
        c.drawString(M, 20, "Do not write Social Security or bank account numbers on this form. We collect those only through our secure portal.")

    def section(self, y, text):
        c = self.c
        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 10.5)
        c.drawString(M, y, text)
        c.setStrokeColor(GOLD)
        c.setLineWidth(1)
        c.line(M, y - 3, W - M, y - 3)
        return y - 16

    def label(self, x, y, text, size=8, color=INK, bold=False):
        self.c.setFillColor(color)
        self.c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
        self.c.drawString(x, y, text)

    def text(self, x, y, w, h=14, base="f", tip="", money=False):
        self.c.acroForm.textfield(
            name=self.name(base), tooltip=tip or base, x=x, y=y, width=w, height=h,
            borderColor=LINE, fillColor=FIELD_BG, textColor=INK, fontSize=8,
            borderWidth=0.6, forceBorder=True)
        if money:
            self.label(x - 7, y + 4, "$", 7.5, MUTED)

    def check(self, x, y, base, tip):
        self.c.acroForm.checkbox(name=self.name(base), tooltip=tip, x=x, y=y, size=10,
                                 borderColor=LINE, fillColor=FIELD_BG, buttonStyle="check", borderWidth=0.6, forceBorder=True)

    def table(self, y, cols, rows, base, row_h=15):
        """cols: list of (header, width, money)"""
        c = self.c
        x = M
        c.setFillColor(NAVY)
        c.rect(M, y - 4, sum(w for _, w, _ in cols), 15, fill=1, stroke=0)
        for head, w, _ in cols:
            self.label(x + 3, y, head, 7, white, True)
            x += w
        y -= row_h + 2
        for r in range(rows):
            x = M
            for head, w, money in cols:
                pad = 9 if money else 1
                self.text(x + pad, y, w - pad - 2, 13, base=f"{base}_{head.split(' ')[0].lower()}", tip=f"{head}, row {r + 1}", money=money)
                x += w
            y -= row_h
        return y - 4

    def save(self):
        self.footer()
        self.c.save()


def build(path):
    f = Form(path)

    # ---------- Page 1: household ----------
    y = f.new_page("Household & dependents", "Fill in on screen or print it. Every filing status uses the same form; skip what doesn't apply.")
    f.label(M, y, "How to return it: email this PDF to us, bring it in, or use the Excel organizer to see your estimate online right away.", 8, MUTED)
    y -= 20
    y = f.section(y, "Filing status (check one)")
    x = M
    for lab in ["Single", "Married filing jointly", "Married filing separately", "Head of household"]:
        f.check(x, y - 2, "status", lab)
        f.label(x + 14, y, lab, 8.5)
        x += 135
    y -= 24
    for lab, w in [("State you lived in during 2026", 160), ("Your birth year", 70), ("Spouse's birth year (joint only)", 70)]:
        pass
    f.label(M, y + 2, "State you lived in during 2026", 8, MUTED)
    f.text(M, y - 14, 170, base="state")
    f.label(M + 190, y + 2, "Your birth year", 8, MUTED)
    f.text(M + 190, y - 14, 80, base="birth_you")
    f.label(M + 290, y + 2, "Spouse's birth year (joint returns)", 8, MUTED)
    f.text(M + 290, y - 14, 80, base="birth_spouse")
    y -= 36
    f.check(M, y - 2, "childcare", "Paid childcare so I could work")
    f.label(M + 14, y, "I paid for childcare or daycare so I could work", 8.5)
    y -= 28
    y = f.section(y, "Dependents (children and relatives you support)")
    f.label(M, y + 2, "Children under 17 at the end of 2026 were born in 2010 or later. Leave empty if you have no dependents.", 7.5, MUTED)
    y -= 14
    y = f.table(y, [("First name", 150, False), ("Relationship", 120, False), ("Birth year", 80, False),
                    ("Months lived with you", 100, False), ("Has an SSN? (Yes/No)", 90, False)], 8, "dep")
    y -= 6
    y = f.section(y, "Checklist (check every one that applies)")
    for key, q in CHECKLIST:
        f.check(M, y - 2, f"chk_{key}", q)
        f.label(M + 14, y, q, 8.5)
        y -= 16

    # ---------- Page 2: income ----------
    y = f.new_page("Paychecks, cash, tips & other income", "Married filing jointly: include both spouses. Married filing separately: only your own.")
    y = f.section(y, "Jobs (W-2 paychecks), one row per W-2")
    y = f.table(y, [("Employer", 112, False), ("Whose", 56, False), ("Wages (box 1)", 76, True),
                    ("Fed. tax (box 2)", 76, True), ("State tax (box 17)", 80, True), ("Tips (box 7)", 68, True),
                    ("OT premium", 72, True)], 6, "job")
    f.label(M, y + 2, "Whose = You or Spouse.", 7.5, MUTED)
    y -= 12
    f.label(M, y + 2, "Overtime premium = only the extra 'half' of time-and-a-half.", 7.5, MUTED)
    y -= 18
    y = f.section(y, "Self-employment & cash income (1099-NEC, 1099-K, cash, Zelle, checks)")
    y = f.table(y, [("Payer or description", 260, False), ("Type (1099-NEC/1099-K/Cash/App)", 150, False), ("Amount received", 110, True)], 8, "se")
    y -= 4
    y = f.section(y, "Other income")
    for lab in ["Cash tips NOT reported to your employer", "Bank interest (1099-INT)", "Unemployment benefits (1099-G)",
                "Retirement withdrawals, taxable amount (1099-R)", "Other taxable income (prizes, rental profit, etc.)"]:
        f.label(M, y + 3, lab, 8.5)
        f.text(M + 330, y, 110, base="other", tip=lab, money=True)
        y -= 18

    # ---------- Page 3: expenses ----------
    y = f.new_page("Business expenses", "Self-employed only. Enter the full amount paid in 2026; we apply the meal limits and depreciation rules.")
    items = [e for e in EXPENSES]
    col_w = (W - 2 * M - 16) / 2
    half = (len(items) + 1) // 2
    top = y
    for ci, chunk in enumerate([items[:half], items[half:]]):
        x = M + ci * (col_w + 16)
        yy = top
        for label, line, share, tip in chunk:
            if line is None:
                f.label(x, yy, label, 8, GOLD, True)
                yy -= 13
                continue
            text = label or "Other (describe): ________________"
            if share and share < 1:
                text += f"  [{int(share * 100)}% deductible]"
            # shrink long names so they never run into the line number
            room = col_w - 110
            size = 7.3
            while f.c.stringWidth(text, "Helvetica", size) > room and size > 5.8:
                size -= 0.2
            while f.c.stringWidth(text, "Helvetica", size) > room:
                text = text[:-2].rstrip() + "…"
            f.label(x, yy + 3, text, size)
            f.label(x + col_w - 104, yy + 3, f"line {line}", 6.5, MUTED)
            f.text(x + col_w - 70, yy, 70, 12, base="exp", tip=label or "Other expense", money=True)
            yy -= 13.2
    f.label(M, 36, "Equipment, electronics or software over $2,500 per item may need depreciation; we'll handle that on your return.", 7.5, MUTED)

    # ---------- Page 4: trips, payments, sign-off ----------
    y = f.new_page("Truck driver trips & tax payments", "Per diem: $80/day in the U.S., $86 in Canada; travel days at 75%; 80% deductible (IRS Notice 2026-60).")
    y = f.section(y, "Trips away from home overnight (self-employed truck drivers)")
    y = f.table(y, [("Left home (date)", 120, False), ("Got back (date)", 120, False), ("Full days in Canada", 110, False),
                    ("Notes (route, truck)", 190, False)], 16, "trip", row_h=14.5)
    f.label(M, y + 2, "Need more rows? Attach your logbook or ELD trip report instead.", 7.5, MUTED)
    y -= 18
    y = f.section(y, "Estimated tax payments for 2026")
    y = f.table(y, [("Quarter", 140, False), ("Federal paid", 100, True), ("Date", 90, False), ("State paid", 100, True), ("Date", 90, False)], 4, "pay")
    y -= 4
    y = f.section(y, "Your contact information")
    f.label(M, y + 2, "Name", 8, MUTED)
    f.text(M, y - 14, 200, base="contact_name")
    f.label(M + 215, y + 2, "Phone", 8, MUTED)
    f.text(M + 215, y - 14, 130, base="contact_phone")
    f.label(M + 360, y + 2, "Email", 8, MUTED)
    f.text(M + 360, y - 14, 180, base="contact_email")
    y -= 40
    f.check(M, y - 2, "consent", "Consent")
    f.c.setFont("Helvetica", 7.8)
    f.c.setFillColor(INK)
    t = f.c.beginText(M + 14, y)
    for line in ["I confirm this information is accurate to the best of my knowledge. I understand an estimate is not a filed return",
                 "or a promise of any refund, and that Falcon Tax Solutions will use this information only to prepare my return."]:
        t.textLine(line)
    f.c.drawText(t)
    f.save()


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "falcon-tax-organizer-2026.pdf"
    build(out)
    print("wrote", out)
