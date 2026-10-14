import sys
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import simpleSplit

FONTS = "/home/user/beezy350.github.io/.claude/skills/canvas-design/canvas-fonts/"
for name, f in [("Gloock", "Gloock-Regular.ttf"), ("ISerifI", "InstrumentSerif-Italic.ttf"),
                ("ISerif", "InstrumentSerif-Regular.ttf"), ("Mono", "DMMono-Regular.ttf"),
                ("Sans", "WorkSans-Regular.ttf"), ("SansB", "WorkSans-Bold.ttf")]:
    pdfmetrics.registerFont(TTFont(name, FONTS + f))

INK = HexColor("#0F0E0C")
GOLD = HexColor("#C2A05A")
GOLD_D = HexColor("#94742F")
CREAM = HexColor("#F4EDDF")
MUTED = HexColor("#5E574B")
W, H = 612, 792
M = 54
BIZ = "[BUSINESS NAME]"

SECTIONS = [
    ("Kitchen", "Grease and crumbs are the most common reasons for a cleaning charge. Start here while you have energy.", [
        "Empty, wipe and dry every cabinet and drawer, inside and out",
        "Degrease cabinet fronts, handles and the range hood filter",
        "Clean the oven interior, racks and door glass",
        "Clean stovetop, burners, drip pans and knobs",
        "Pull the stove out; clean the sides and the floor beneath",
        "Empty, defrost if needed, and wipe the fridge and freezer",
        "Pull the fridge out; vacuum the coils and the floor beneath",
        "Run the dishwasher empty; wipe the door seal and filter",
        "Scrub the sink, faucet and drain; run the disposal",
        "Wipe the microwave inside, outside and the turntable",
        "Wipe countertops and the backsplash",
    ]),
    ("Bathrooms", "Landlords look closely at grout, hard-water spots and the base of the toilet.", [
        "Scrub tub, shower walls and grout; remove soap scum",
        "Descale the showerhead and faucets",
        "Clean shower door tracks, or replace a mildewed curtain liner",
        "Clean the toilet inside, outside, under the seat and at the base",
        "Empty and wipe the vanity, drawers and medicine cabinet",
        "Polish mirrors and chrome fixtures",
        "Clean the exhaust fan cover",
        "Scrub the floor along the edges and behind the toilet",
    ]),
    ("Bedrooms & Living Areas", "Empty rooms show everything. Work top to bottom so dust falls onto floors you haven't cleaned yet.", [
        "Dust ceiling fans, light fixtures and vents",
        "Remove nails and hooks; patch small holes if your lease allows",
        "Spot-clean scuffs and marks on walls and doors",
        "Wipe light switches, outlets and door handles",
        "Wipe baseboards and door frames",
        "Empty closets; wipe shelves and rods",
        "Clean window sills and tracks; wash the inside glass",
        "Dust and wipe blinds",
    ]),
    ("Floors, Entry & Extras", "Floors come last, on your way out of each room.", [
        "Vacuum carpets, including edges and inside closets",
        "Treat carpet stains, or book a professional shampoo if your lease requires it",
        "Sweep and mop hard floors, working toward the door",
        "Clean the laundry area, washer seal and dryer lint trap",
        "Sweep the balcony, patio or garage",
        "Replace burned-out bulbs and dead smoke-detector batteries",
        "Take out all trash and remove everything you own",
    ]),
]
TOTAL = sum(len(s[2]) for s in SECTIONS)


def label(c, x, y, text, color=GOLD, size=7.5, space=1.6):
    c.setFillColor(color)
    t = c.beginText(x, y)
    t.setFont("Mono", size)
    t.setCharSpace(space)
    t.textOut(text.upper())
    t.setCharSpace(0)
    c.drawText(t)


def label_width(text, size=7.5, space=1.6):
    return pdfmetrics.stringWidth(text.upper(), "Mono", size) + space * len(text)


def para(c, x, y, text, width, font="Sans", size=10.5, lead=15.5, color=INK):
    c.setFillColor(color)
    c.setFont(font, size)
    for line in simpleSplit(text, font, size, width):
        c.drawString(x, y, line)
        y -= lead
    return y


def checkbox(c, x, y, s=9, color=GOLD_D):
    c.setStrokeColor(color)
    c.setLineWidth(0.7)
    c.rect(x, y, s, s, stroke=1, fill=0)


def interior(c, n, kicker):
    c.setFillColor(CREAM)
    c.rect(0, 0, W, H, stroke=0, fill=1)
    label(c, M, H - 40, "The Move-Out Cleaning Checklist", GOLD_D)
    k = f"{n:02d} / {kicker}"
    label(c, W - M - label_width(k), H - 40, k, GOLD_D)
    c.setStrokeColor(GOLD_D)
    c.setLineWidth(0.4)
    c.line(M, H - 50, W - M, H - 50)
    c.line(M, 46, W - M, 46)
    label(c, M, 32, BIZ, MUTED, 7)
    pg = f"{n:02d}"
    label(c, W - M - label_width(pg, 7), 32, pg, MUTED, 7)


def heading(c, y, text, size=34):
    c.setFillColor(INK)
    c.setFont("Gloock", size)
    c.drawString(M, y, text)
    return y - size * 1.05


# ---------------------------------------------------------------- cover
def cover(c):
    c.setFillColor(INK)
    c.rect(0, 0, W, H, stroke=0, fill=1)
    # hairline frame
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.4)
    c.rect(28, 28, W - 56, H - 56, stroke=1, fill=0)

    label(c, M, H - 66, "A free guide from " + BIZ)
    vol = "Edition 01"
    label(c, W - M - label_width(vol), H - 66, vol)

    # title
    c.setFillColor(CREAM)
    c.setFont("Gloock", 58)
    y = H - 168
    for line in ["The Move-Out", "Cleaning", "Checklist"]:
        c.drawString(M - 2, y, line)
        y -= 60
    c.setFillColor(GOLD)
    c.setFont("ISerifI", 26)
    c.drawString(M, y - 8, "Get your deposit back.")

    # field of task squares: one square per task, filled to show progress
    cols, s, gap = 13, 18, 12.5
    rows = -(-TOTAL // cols)
    grid_w = cols * s + (cols - 1) * gap
    gx = (W - grid_w) / 2
    gy_top = 300
    i = 0
    for r in range(rows):
        for col in range(cols):
            if i >= TOTAL:
                break
            x = gx + col * (s + gap)
            yy = gy_top - r * (s + gap)
            if i < TOTAL - 1:
                c.setFillColor(GOLD)
                c.rect(x, yy, s, s, stroke=0, fill=1)
            else:
                c.setStrokeColor(GOLD)
                c.setLineWidth(0.8)
                c.rect(x, yy, s, s, stroke=1, fill=0)
            i += 1
    last_y = gy_top - (rows - 1) * (s + gap)

    # axis notes under grid
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.4)
    c.line(gx, last_y - 22, gx + grid_w, last_y - 22)
    label(c, gx, last_y - 38, f"{TOTAL} tasks", GOLD, 7)
    t = "4 zones / 1 walkthrough"
    label(c, gx + grid_w - label_width(t, 7), last_y - 38, t, GOLD, 7)

    label(c, M, 58, "Room by room / printable / free", CREAM, 7)
    w = "[SERVICE AREA]"
    label(c, W - M - label_width(w, 7), 58, w, CREAM, 7)


# ---------------------------------------------------------------- intro
def intro(c):
    interior(c, 2, "Before you start")
    y = heading(c, H - 120, "Clean it like you're")
    y = heading(c, y, "being inspected.")
    y -= 26
    y = para(c, M, y, "When you move out, your landlord compares the home to how it looked when you moved in. "
             "Normal wear and tear is expected. Dirt, grease and grime usually aren't, and cleaning charges "
             "come straight out of your deposit.", W - 2 * M - 120)
    y -= 10
    y = para(c, M, y, f"This checklist covers the {TOTAL} tasks inspectors check most, grouped by room. "
             "Print it, tick each box and take photos as you go.", W - 2 * M - 120)

    y -= 34
    label(c, M, y, "Your timeline", GOLD_D)
    y -= 22
    steps = [
        ("2 weeks out", "Read your lease for cleaning terms. Find your move-in photos or inspection report. Book carpet cleaning if it's required."),
        ("1 week out", "Clean inside empty cabinets, closets and the oven while you still have time to spare."),
        ("Moving day", "Once the furniture is out, do walls, baseboards and floors last, working toward the door."),
        ("Before you hand over keys", "Do the final walkthrough on page 07 and photograph every room."),
    ]
    for when, what in steps:
        c.setStrokeColor(GOLD_D)
        c.setLineWidth(0.4)
        c.line(M, y + 12, W - M, y + 12)
        c.setFillColor(INK)
        c.setFont("ISerif", 17)
        c.drawString(M, y - 6, when)
        yy = para(c, M + 210, y - 4, what, W - 2 * M - 210, size=10, lead=14.5)
        y = min(yy, y - 20) - 18

    y -= 6
    label(c, M, y, "Supplies", GOLD_D)
    y -= 22
    sup = ["All-purpose cleaner", "Degreaser", "Oven cleaner", "Bathroom / descaling cleaner",
           "Glass cleaner", "Microfiber cloths", "Scrub brush & sponge", "Magic eraser",
           "Vacuum with crevice tool", "Mop & bucket", "Trash bags", "Phone for photos"]
    colw = (W - 2 * M) / 3
    for i, s_ in enumerate(sup):
        x = M + (i % 3) * colw
        yy = y - (i // 3) * 20
        checkbox(c, x, yy - 1)
        c.setFillColor(INK)
        c.setFont("Sans", 9.5)
        c.drawString(x + 16, yy, s_)

    y -= 4 * 20 + 18
    c.setFillColor(GOLD_D)
    c.setFont("ISerifI", 15)
    c.drawString(M, y, "The rule: top to bottom, back to front, dry before wet.")


# ---------------------------------------------------------------- room pages
def room(c, n, title, note, tasks):
    interior(c, n, title)
    y = heading(c, H - 120, title, 40)
    y += 10
    y = para(c, M, y, note, W - 2 * M - 140, font="ISerifI", size=15, lead=19, color=MUTED)
    y -= 26
    for i, t in enumerate(tasks, 1):
        c.setStrokeColor(GOLD_D)
        c.setLineWidth(0.35)
        c.line(M, y + 15, W - M, y + 15)
        label(c, M, y - 1, f"{i:02d}", GOLD_D, 7.5)
        checkbox(c, M + 30, y - 2, 10)
        yy = para(c, M + 52, y - 1, t, W - 2 * M - 52, size=10.5, lead=14.5)
        y = yy - 17
    c.setStrokeColor(GOLD_D)
    c.line(M, y + 15, W - M, y + 15)
    y -= 40
    if y > 140:
        label(c, M, y, "Notes / photos taken", GOLD_D)
        c.setStrokeColor(HexColor("#D9CDB4"))
        c.setLineWidth(0.4)
        yy = y - 30
        while yy > 80:
            c.line(M, yy, W - M, yy)
            yy -= 26


# ---------------------------------------------------------------- walkthrough
def walkthrough(c, n):
    interior(c, n, "Final walkthrough")
    y = heading(c, H - 120, "The last ten minutes.", 34)
    y -= 4
    y = para(c, M, y, "Walk every room slowly with your phone camera on. This record is your best protection "
             "if a charge is disputed later.", W - 2 * M - 120)
    y -= 26
    items = [
        "Photograph or video every room, closet, appliance interior and bathroom",
        "Open every cabinet, drawer and appliance one last time",
        "Check that every light works and every window locks",
        "Confirm nothing is left behind, including in the garage, storage and mailbox",
        "Return all keys, fobs and remotes, and get a receipt or email confirmation",
        "Give the landlord your forwarding address in writing for the deposit",
        "Ask to attend the move-out inspection if your landlord offers one",
    ]
    for t in items:
        checkbox(c, M, y - 2, 10)
        yy = para(c, M + 22, y - 1, t, W - 2 * M - 22, size=10.5, lead=14.5)
        y = yy - 12

    y -= 18
    c.setFillColor(INK)
    c.rect(M, y - 168, W - 2 * M, 168, stroke=0, fill=1)
    label(c, M + 22, y - 28, "Most-missed spots", GOLD)
    spots = ["Inside the oven", "Behind the fridge", "Bathroom grout", "Window tracks",
             "Baseboards", "Range hood filter", "Inside drawers", "Light fixtures"]
    colw = (W - 2 * M - 44) / 2
    for i, s_ in enumerate(spots):
        x = M + 22 + (i % 2) * colw
        yy = y - 58 - (i // 2) * 26
        c.setFillColor(GOLD)
        c.rect(x, yy + 1, 6, 6, stroke=0, fill=1)
        c.setFillColor(CREAM)
        c.setFont("ISerif", 15)
        c.drawString(x + 16, yy, s_)

    para(c, M, 70, "Deposit rules and return deadlines vary by state and city. Check your lease and local "
         "tenant rules if a deduction seems unfair.", W - 2 * M, size=8, lead=11, color=MUTED)


# ---------------------------------------------------------------- CTA
def cta(c, n):
    c.setFillColor(INK)
    c.rect(0, 0, W, H, stroke=0, fill=1)
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.4)
    c.rect(28, 28, W - 56, H - 56, stroke=1, fill=0)
    label(c, M, H - 66, "Short on time?")
    pg = f"{n:02d}"
    label(c, W - M - label_width(pg), H - 66, pg)

    c.setFillColor(CREAM)
    c.setFont("Gloock", 46)
    y = H - 170
    for line in ["Hand us the", "checklist."]:
        c.drawString(M - 2, y, line)
        y -= 50
    c.setFillColor(GOLD)
    c.setFont("ISerifI", 22)
    c.drawString(M, y - 6, "We'll do all of it.")

    y -= 64
    para(c, M, y, f"{BIZ} does move-in and move-out cleaning across [SERVICE AREA]. "
         f"We follow every line of this checklist, so you can spend moving day moving.",
         W - 2 * M - 110, size=11.5, lead=17, color=CREAM)

    # tile row echoing the cover: all complete
    s, gap, cols = 18, 12.5, 13
    grid_w = cols * s + (cols - 1) * gap
    gx = (W - grid_w) / 2
    c.setFillColor(GOLD)
    for i in range(cols):
        c.rect(gx + i * (s + gap), 330, s, s, stroke=0, fill=1)

    # button
    bw, bh = 260, 46
    bx, by = M, 228
    c.setFillColor(GOLD)
    c.rect(bx, by, bw, bh, stroke=0, fill=1)
    t = "Request a free quote"
    label(c, bx + (bw - label_width(t, 9, 1.8)) / 2, by + 18, t, INK, 9, 1.8)

    label(c, M, 186, "[Phone]  /  [Email]  /  [Website]", CREAM, 8)
    label(c, M, 166, "We reply within one business day", GOLD, 7)

    label(c, M, 58, BIZ, CREAM, 7)
    w = "[SERVICE AREA]"
    label(c, W - M - label_width(w, 7), 58, w, CREAM, 7)


def build(path):
    c = canvas.Canvas(path, pagesize=(W, H))
    c.setTitle("The Move-Out Cleaning Checklist")
    c.setAuthor(BIZ)
    c.setSubject("Get your deposit back: a room-by-room move-out cleaning checklist")
    cover(c); c.showPage()
    intro(c); c.showPage()
    for i, (t, note, tasks) in enumerate(SECTIONS):
        room(c, 3 + i, t, note, tasks); c.showPage()
    walkthrough(c, 7); c.showPage()
    cta(c, 8); c.showPage()
    c.save()


if __name__ == "__main__":
    build(sys.argv[1])
