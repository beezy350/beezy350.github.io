"""Build the fillable PDF version of the Falcon Tax Organizer (tax year 2026).

Same questions as the Excel organizer, as typeable PDF form fields. A typed-in
copy uploads to the estimator: js/organizer-map.js reads the fields by name,
so keep field names stable when editing this file.

Run:  python3 tax-prep/tools/build_organizer_pdf.py [output.pdf]
"""
import re
import sys
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from build_organizer import CAR_COSTS, CAR_MILES, CHECKLIST, EXPENSES, RIDESHARE_GROUP  # noqa: E402  same lists as the Excel organizer

W, H = letter
NAVY, GOLD, INK, MUTED, LINE = (HexColor(c) for c in ["#1D3557", "#C8963E", "#1B2230", "#5A6475", "#C9D1DC"])
FIELD_BG = HexColor("#FFF8E1")
M = 36  # margin


def expense_field(label, share, _seen={}):
    """exp_<slug>_<deductible percent>, e.g. exp_business_meals_enter_full_amount_50"""
    slug = re.sub(r"[^a-z0-9]+", "_", (label or "other").lower()).strip("_")[:40]
    n = _seen.get(slug, 0) + 1
    _seen[slug] = n
    if n > 1 or not label:
        slug = f"{slug}{n}"
    return f"exp_{slug}_{int(round(share * 100))}"


class Form:
    def __init__(self, path):
        self.c = canvas.Canvas(path, pagesize=letter)
        self.c.setTitle("Falcon Tax Solutions - 2026 Tax Organizer")
        self.c.setAuthor("Falcon Tax Solutions")
        self.page = 0
        self.names = set()

    def name(self, name):
        # Every field has a fixed, meaningful name that js/organizer-import.js reads
        assert name not in self.names, f"duplicate field name {name}"
        self.names.add(name)
        return name

    def new_page(self, title, sub, organizer_page=None):
        if self.page:
            self.footer()
            self.c.showPage()
        self.page += 1
        self.organizer_page = organizer_page or (self.organizer_page + 1 if hasattr(self, "organizer_page") else 1)
        c = self.c
        c.setFillColor(NAVY)
        c.rect(0, H - 64, W, 64, fill=1, stroke=0)
        c.setFillColor(GOLD)
        c.setFont("Helvetica-Bold", 7.5)
        c.drawString(M, H - 22, f"FALCON TAX SOLUTIONS  ·  2026 TAX ORGANIZER  ·  PAGE {self.organizer_page} OF 4"
                     + ("  ·  CONTINUED" if organizer_page else ""))
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

    def text(self, x, y, w, h=14, name="f", tip="", money=False):
        self.c.acroForm.textfield(
            name=self.name(name), tooltip=tip or name, x=x, y=y, width=w, height=h,
            borderColor=LINE, fillColor=FIELD_BG, textColor=INK, fontSize=8,
            borderWidth=0.6, forceBorder=True)
        if money:
            self.label(x - 7, y + 4, "$", 7.5, MUTED)

    def check(self, x, y, name, tip):
        self.c.acroForm.checkbox(name=self.name(name), tooltip=tip, x=x, y=y, size=10,
                                 borderColor=LINE, fillColor=FIELD_BG, buttonStyle="check", borderWidth=0.6, forceBorder=True)

    def table(self, y, cols, rows, prefix, row_h=15):
        """cols: list of (header, width, money, key); fields are named {prefix}{row}_{key}"""
        c = self.c
        x = M
        c.setFillColor(NAVY)
        c.rect(M, y - 4, sum(col[1] for col in cols), 15, fill=1, stroke=0)
        for head, w, _, _ in cols:
            self.label(x + 3, y, head, 7, white, True)
            x += w
        y -= row_h + 2
        for r in range(rows):
            x = M
            for head, w, money, key in cols:
                if key == "ssn":  # a tick box, so nobody types the actual number
                    self.check(x + (w - 10) / 2, y + 1, f"{prefix}{r + 1}_{key}", f"{head}, row {r + 1}")
                    x += w
                    continue
                pad = 9 if money else 1
                self.text(x + pad, y, w - pad - 2, min(13, row_h - 1.5), name=f"{prefix}{r + 1}_{key}", tip=f"{head}, row {r + 1}", money=money)
                x += w
            y -= row_h
        return y - 4

    def save(self):
        self.footer()
        self.c.save()


def build(path):
    f = Form(path)

    # ---------- Page 1: household ----------
    y = f.new_page("Household & dependents", "Type your answers on screen. Every filing status uses the same form; skip what doesn't apply.")
    f.label(M, y, "Type your answers into this PDF, save it, and upload it on our Refund Estimator page to see your refund or amount due right away.", 8, MUTED)
    y -= 20
    y = f.section(y, "Filing status (check one)")
    x = M
    for lab, code in [("Single", "single"), ("Married filing jointly", "mfj"), ("Married filing separately", "mfs"), ("Head of household", "hoh")]:
        f.check(x, y - 2, f"status_{code}", lab)
        f.label(x + 14, y, lab, 8.5)
        x += 135
    y -= 24
    f.label(M, y + 2, "State you lived in during 2026", 8, MUTED)
    f.text(M, y - 14, 170, name="state", tip="State name or 2-letter code")
    f.label(M + 190, y + 2, "Your birth year", 8, MUTED)
    f.text(M + 190, y - 14, 80, name="birth_you")
    f.label(M + 290, y + 2, "Spouse's birth year (joint returns)", 8, MUTED)
    f.text(M + 290, y - 14, 80, name="birth_spouse")
    y -= 36
    f.check(M, y - 2, "childcare", "Paid childcare so I could work")
    f.label(M + 14, y, "I paid for childcare or daycare so I could work", 8.5)
    y -= 28
    y = f.section(y, "Dependents (children and relatives you support)")
    f.label(M, y + 2, "Children under 17 at the end of 2026 were born in 2010 or later. Leave empty if you have no dependents.", 7.5, MUTED)
    y -= 14
    y = f.table(y, [("First name", 150, False, "name"), ("Relationship", 120, False, "rel"), ("Birth year", 80, False, "year"),
                    ("Months lived with you", 100, False, "months"), ("Has an SSN? (tick)", 90, False, "ssn")], 8, "dep")
    y -= 6
    y = f.section(y, "Checklist (check every one that applies)")
    for key, q in CHECKLIST:
        f.check(M, y - 2, f"chk_{key}", q)
        f.label(M + 14, y, q, 8.5)
        y -= 16

    # ---------- Page 2: income ----------
    y = f.new_page("Paychecks, cash, tips & other income", "Married filing jointly: include both spouses. Married filing separately: only your own.")
    y = f.section(y, "Jobs (W-2 paychecks), one row per W-2")
    y = f.table(y, [("Employer", 112, False, "employer"), ("Whose", 56, False, "whose"), ("Wages (box 1)", 76, True, "wages"),
                    ("Fed. tax (box 2)", 76, True, "fed"), ("State tax (box 17)", 80, True, "state"), ("Tips (box 7)", 68, True, "tips"),
                    ("OT premium", 72, True, "ot")], 6, "job")
    f.label(M, y + 2, "Whose = You or Spouse.", 7.5, MUTED)
    y -= 12
    f.label(M, y + 2, "Overtime premium = only the extra 'half' of time-and-a-half.", 7.5, MUTED)
    y -= 18
    y = f.section(y, "Self-employment & cash income (1099-NEC, 1099-K, cash, Zelle, checks)")
    y = f.table(y, [("Payer or description", 260, False, "payer"), ("Type (1099-NEC/1099-K/Cash/App)", 150, False, "type"), ("Amount received", 110, True, "amount")], 8, "se")
    y -= 4
    y = f.section(y, "Other income")
    for key, lab in [("cashtips", "Cash tips NOT reported to your employer"), ("interest", "Bank interest (1099-INT)"),
                     ("unemployment", "Unemployment benefits (1099-G)"), ("retirement", "Retirement withdrawals, taxable amount (1099-R)"),
                     ("other", "Other taxable income (prizes, rental profit, etc.)"),
                     ("socialsecurity", "Social Security benefits (SSA-1099 box 5, both spouses)"),
                     ("withheld", "Federal tax withheld on SSA-1099, 1099-R or 1099-G")]:
        f.label(M, y + 3, lab, 8.5)
        f.text(M + 330, y, 110, name=f"income_{key}", tip=lab, money=True)
        y -= 18

    y -= 4
    y = f.section(y, "Retirement & health savings (contributions for 2026)")
    for key, lab in [("ira_you", "Traditional IRA contribution: you"), ("ira_spouse", "Traditional IRA contribution: spouse"),
                     ("hsa_amount", "HSA contributions you made yourself (not through payroll)"),
                     ("sep_amount", "SEP-IRA or solo 401(k) contributions (self-employed)")]:
        f.label(M, y + 3, lab, 8.5)
        f.text(M + 330, y, 110, name=key, tip=lab, money=True)
        y -= 18
    for key, lab in [("ira_covered_you", "You are covered by a retirement plan at work (W-2 box 13)"),
                     ("ira_covered_spouse", "Spouse is covered by a retirement plan at work"),
                     ("hsa_family", "HSA is family coverage (not self-only)")]:
        f.check(M, y, key, lab)
        f.label(M + 16, y + 2, lab, 8.5)
        y -= 16

    # ---------- Page 3: expenses ----------
    y = f.new_page("Business expenses", "Self-employed only. Enter the full amount paid in 2026; we apply the meal limits and depreciation rules.")
    # the rideshare group goes on the car page that follows
    items, ride, cur = [], [], None
    for e in EXPENSES:
        if e[1] is None:
            cur = ride if e[0] == RIDESHARE_GROUP else items
        cur.append(e)
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
            f.text(x + col_w - 70, yy, 70, 12, name=expense_field(label, share), tip=label or "Other expense", money=True)
            yy -= 13.2
    f.label(M, 36, "Equipment, electronics or software over $2,500 per item may need depreciation; we'll handle that on your return.", 7.5, MUTED)

    # ---------- Page 3 continued: business car, rideshare & delivery ----------
    y = f.new_page("Business car, rideshare & delivery", "Rideshare, delivery or any business car (not semi-trucks). We use the larger of the IRS mileage rate or your actual costs.", organizer_page=3)
    y = f.section(y, "Miles driven in 2026 (from your mileage log or the app's yearly tax summary)") - 6
    for key, lab in CAR_MILES:
        f.label(M, y + 3, lab, 8.5)
        f.text(M + 330, y, 110, name=f"car_{key}", tip=lab)
        y -= 18
    f.label(M, y + 4, "Mileage rate: 72.5 cents a mile Jan-Jun, 76 cents from Jul 1, 2026. Personal and commuting miles count only in the ALL-miles line.", 7.5, MUTED)
    y -= 20
    y = f.section(y, "Car costs paid in 2026 (full amounts; we apply your business share)") - 6
    for key, lab in CAR_COSTS:
        f.label(M, y + 3, lab, 8.5)
        f.text(M + 330, y, 110, name=f"car_{key}", tip=f"Car cost: {lab}", money=True)
        y -= 18
    y -= 8
    y = f.section(y, "Rideshare & delivery costs (count with either car method)") - 6
    for label, line, share, tip in ride[1:]:
        f.label(M, y + 3, label, 8.5)
        f.label(M + 262, y + 3, f"line {line}", 6.5, MUTED)
        f.text(M + 330, y, 110, name=expense_field(label, share), tip=label, money=True)
        y -= 18
    f.label(M, y - 2, "Meals are usually not deductible for rideshare and delivery drivers who come home each night.", 7.5, MUTED)

    # ---------- Page 4: trips, payments, sign-off ----------
    y = f.new_page("Truck driver trips & tax payments", "Per diem: $80/day in the U.S., $86 in Canada; travel days at 75%; 80% deductible (IRS Notice 2026-60).")
    y = f.section(y, "Trips away from home overnight (self-employed truck drivers)")
    y = f.table(y, [("Left home (date)", 120, False, "leave"), ("Got back (date)", 120, False, "return"), ("Full days in Canada", 110, False, "canada"),
                    ("Notes (route, truck)", 190, False, "notes")], 20, "trip", row_h=13)
    f.label(M + 250, y + 2, "Dates like 2026-03-02 or 3/2/2026.", 7.5, MUTED)
    f.label(M, y + 2, "Need more rows? Attach your logbook or ELD trip report instead.", 7.5, MUTED)
    y -= 18
    y = f.section(y, "Estimated tax payments for 2026")
    y = f.table(y, [("Quarter", 140, False, "quarter"), ("Federal paid", 100, True, "fed"), ("Date", 90, False, "feddate"), ("State paid", 100, True, "state"), ("Date", 90, False, "statedate")], 4, "pay")
    y -= 4
    y = f.section(y, "Your contact information")
    f.label(M, y + 2, "Name", 8, MUTED)
    f.text(M, y - 14, 200, name="contact_name")
    f.label(M + 215, y + 2, "Phone", 8, MUTED)
    f.text(M + 215, y - 14, 130, name="contact_phone")
    f.label(M + 360, y + 2, "Email", 8, MUTED)
    f.text(M + 360, y - 14, 180, name="contact_email")
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
