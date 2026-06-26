import json
from fpdf import FPDF
from datetime import datetime

# Load data
with open('tmp_marge_vergleich.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

results = data["results"]
not_found_count = data.get("not_found_count", 0)

# Classify
changed = [r for r in results if r.get("ek_diff") and abs(r["ek_diff"]) >= 0.01]
unchanged = [r for r in results if not r.get("ek_diff") or abs(r["ek_diff"]) < 0.01]
ek_up = sorted([c for c in changed if c["ek_diff"] > 0], key=lambda x: x["ek_diff"], reverse=True)
ek_down = sorted([c for c in changed if c["ek_diff"] < 0], key=lambda x: x["ek_diff"])

# Stats
avg_marge_alt = sum(r["marge_alt"] for r in changed if r["marge_alt"] is not None) / len(changed) if changed else 0
avg_marge_neu = sum(r["marge_neu"] for r in changed) / len(changed) if changed else 0
total_ek_diff = sum(r["ek_diff"] for r in changed)

# --- PDF ---
class PDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 14)
        self.cell(0, 8, "Dorfladen Oberornau - Preisvergleich Fleisch & Wurst", new_x="LMARGIN", new_y="NEXT", align="C")
        self.set_font("Helvetica", "", 9)
        self.cell(0, 5, f"Preisliste Juni 2026 vs. Artikelstamm | Erstellt: {datetime.now().strftime('%d.%m.%Y %H:%M')}", new_x="LMARGIN", new_y="NEXT", align="C")
        self.ln(3)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.cell(0, 10, f"Seite {self.page_no()}/{{nb}}", align="C")

    def section_title(self, title):
        self.set_font("Helvetica", "B", 11)
        self.set_fill_color(45, 80, 60)
        self.set_text_color(255, 255, 255)
        self.cell(0, 7, f"  {title}", new_x="LMARGIN", new_y="NEXT", fill=True)
        self.set_text_color(0, 0, 0)
        self.ln(2)

    def summary_row(self, label, value, bold=False):
        self.set_font("Helvetica", "B" if bold else "", 10)
        self.cell(80, 6, label, new_x="RIGHT")
        self.set_font("Helvetica", "B" if bold else "", 10)
        self.cell(60, 6, str(value), new_x="LMARGIN", new_y="NEXT")

    def table_header(self, cols):
        self.set_font("Helvetica", "B", 7)
        self.set_fill_color(220, 230, 220)
        for w, label, align in cols:
            self.cell(w, 5, label, border=1, fill=True, align=align)
        self.ln()

    def table_row(self, cols, values, highlight=False):
        self.set_font("Helvetica", "", 7)
        if highlight:
            self.set_fill_color(255, 245, 230)
        else:
            self.set_fill_color(255, 255, 255)
        for i, (w, _, align) in enumerate(cols):
            val = values[i] if i < len(values) else ""
            val = sanitize(str(val))
            self.cell(w, 4.5, val, border=1, fill=highlight, align=align)
        self.ln()


def sanitize(s):
    """Replace chars that latin-1 Helvetica cannot render."""
    s = s.replace('\ufffd', 'ue')  # common replacement for umlauts
    s = s.replace('\u20ac', 'EUR')
    # Strip any remaining non-latin-1 chars
    try:
        s.encode('latin-1')
    except UnicodeEncodeError:
        s = s.encode('latin-1', errors='replace').decode('latin-1')
    return s


pdf = PDF(orientation="L", format="A4")
pdf.alias_nb_pages()
pdf.set_auto_page_break(auto=True, margin=20)

# Fix encoding: use Stamm name when PDF name has broken chars
for r in results:
    pdf_name = r.get("name_pdf", "")
    stamm_name = r.get("name_stamm", "")
    # If PDF name has replacement characters, prefer Stamm name
    if '\ufffd' in pdf_name and stamm_name:
        r["name_pdf"] = stamm_name
    # Also fix Stamm name
    if '\ufffd' in stamm_name and pdf_name and '\ufffd' not in pdf_name:
        r["name_stamm"] = pdf_name

pdf.add_page()

# --- Zusammenfassung ---
pdf.section_title("Zusammenfassung")
pdf.summary_row("Artikel in Preisliste (PDF):", f"{len(results) + not_found_count}")
pdf.summary_row("Davon zugeordnet:", f"{len(results)}")
pdf.summary_row("Nicht zugeordnet:", f"{not_found_count}")
pdf.ln(2)
pdf.summary_row("EK unver\u00e4ndert:", f"{len(unchanged)} Artikel")
pdf.summary_row("EK ge\u00e4ndert:", f"{len(changed)} Artikel", bold=True)
pdf.summary_row("  davon EK gestiegen:", f"{len(ek_up)} Artikel")
pdf.summary_row("  davon EK gesunken:", f"{len(ek_down)} Artikel")
pdf.ln(2)
pdf.summary_row("Durchschn. Marge vorher:", f"{avg_marge_alt:.1f} %")
pdf.summary_row("Durchschn. Marge nachher:", f"{avg_marge_neu:.1f} %")
pdf.summary_row("Marge-\u00c4nderung:", f"{avg_marge_neu - avg_marge_alt:+.1f} Prozentpunkte", bold=True)
pdf.summary_row("Summe EK-\u00c4nderungen:", f"{total_ek_diff:+.2f} EUR/kg")

# Column definitions
cols = [
    (8, "Nr", "C"),
    (65, "Bezeichnung (PDF)", "L"),
    (60, "Bezeichnung (Stamm)", "L"),
    (14, "Score", "C"),
    (18, "VK Dorf", "R"),
    (18, "EK alt", "R"),
    (18, "EK neu", "R"),
    (18, "EK Diff", "R"),
    (20, "Marge alt", "R"),
    (20, "Marge neu", "R"),
    (18, "M. Diff", "R"),
]

def fmt_eur(v):
    if v is None: return "-"
    return f"{v:.2f}"

def fmt_pct(v):
    if v is None: return "-"
    return f"{v:.1f}%"

def fmt_diff(v):
    if v is None: return "-"
    return f"{v:+.2f}"

def fmt_pct_diff(alt, neu):
    if alt is None: return "-"
    d = neu - alt
    return f"{d:+.1f}%"

# --- EK-Erhoehungen ---
pdf.add_page()
pdf.section_title(f"EK-Erh\u00f6hungen ({len(ek_up)} Artikel)")
pdf.table_header(cols)

for i, r in enumerate(ek_up):
    highlight = abs(r["ek_diff"]) >= 1.0
    pdf.table_row(cols, [
        str(i+1),
        r["name_pdf"][:40],
        r["name_stamm"][:38],
        f"{r['score']:.2f}",
        fmt_eur(r["vk_dorf"]),
        fmt_eur(r["ek_alt"]),
        fmt_eur(r["ek_neu"]),
        fmt_diff(r["ek_diff"]),
        fmt_pct(r["marge_alt"]),
        fmt_pct(r["marge_neu"]),
        fmt_pct_diff(r["marge_alt"], r["marge_neu"]),
    ], highlight=highlight)

# --- EK-Senkungen ---
if ek_down:
    pdf.ln(5)
    pdf.section_title(f"EK-Senkungen ({len(ek_down)} Artikel)")
    pdf.table_header(cols)
    for i, r in enumerate(ek_down):
        pdf.table_row(cols, [
            str(i+1),
            r["name_pdf"][:40],
            r["name_stamm"][:38],
            f"{r['score']:.2f}",
            fmt_eur(r["vk_dorf"]),
            fmt_eur(r["ek_alt"]),
            fmt_eur(r["ek_neu"]),
            fmt_diff(r["ek_diff"]),
            fmt_pct(r["marge_alt"]),
            fmt_pct(r["marge_neu"]),
            fmt_pct_diff(r["marge_alt"], r["marge_neu"]),
        ])

# --- Unveraenderte ---
pdf.add_page()
pdf.section_title(f"EK unver\u00e4ndert ({len(unchanged)} Artikel)")

cols_unch = [
    (8, "Nr", "C"),
    (70, "Bezeichnung (PDF)", "L"),
    (65, "Bezeichnung (Stamm)", "L"),
    (14, "Score", "C"),
    (22, "VK Dorf", "R"),
    (22, "EK", "R"),
    (22, "Marge", "R"),
]
pdf.table_header(cols_unch)

unchanged_sorted = sorted(unchanged, key=lambda x: x.get("marge_neu", 0))
for i, r in enumerate(unchanged_sorted):
    highlight = r.get("marge_neu", 50) < 30
    pdf.table_row(cols_unch, [
        str(i+1),
        r["name_pdf"][:45],
        r["name_stamm"][:42],
        f"{r['score']:.2f}",
        fmt_eur(r["vk_dorf"]),
        fmt_eur(r["ek_neu"]),
        fmt_pct(r["marge_neu"]),
    ], highlight=highlight)

# --- Kritische Margen (< 30%) ---
pdf.add_page()
pdf.section_title("Kritische Margen < 30% (alle Artikel)")

low_margin = sorted([r for r in results if r["marge_neu"] < 30], key=lambda x: x["marge_neu"])
cols_crit = [
    (8, "Nr", "C"),
    (70, "Bezeichnung (PDF)", "L"),
    (22, "VK Dorf", "R"),
    (22, "EK neu", "R"),
    (22, "Marge", "R"),
    (22, "EK Diff", "R"),
]
pdf.table_header(cols_crit)
for i, r in enumerate(low_margin):
    pdf.table_row(cols_crit, [
        str(i+1),
        r["name_pdf"][:45],
        fmt_eur(r["vk_dorf"]),
        fmt_eur(r["ek_neu"]),
        fmt_pct(r["marge_neu"]),
        fmt_diff(r.get("ek_diff")),
    ], highlight=r["marge_neu"] < 20)

# Save
output = r"g:\OneDrive - CGM\Dorfladen Test\Preisvergleich_Fleisch_Juni2026_v2.pdf"
pdf.output(output)
print(f"PDF erstellt: {output}")
print(f"  {pdf.pages_count} Seiten")
