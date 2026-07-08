# Design-Tokens / Farb-Vereinheitlichung – Spec

> **Feature-ID**: DESIGN-TOKENS
> **Status**: Entwurf (1 offene Klärung)
> **Erstellt**: 2026-07-08
> **Bezug**: Backlog X-01, Checkliste FN-13

---

## 1. Überblick

Jede Seite definiert **eigene** CSS-Variablen mit **unterschiedlichen Werten**
für dieselbe Marke. Das Marken-Grün existiert u. a. als `#2d5016`, `#2d6a30`,
`#2e7d4f`, `#1e463a`, `#1e3a2f` – unter den Namen `--c-pri`, `--c-green`,
`--shop-green`, `--green`, `--pk-green`, `--c-m-pri`. Das erschwert konsistentes
Design und war Mit-Ursache der vielen Dark-Mode-Nacharbeiten.

**Ziel:** Eine **zentrale Token-Quelle** (`/css/tokens.css`), auf die alle Seiten
verweisen – ohne die bestehenden Seiten-Variablennamen (und damit tausende
Verwendungen) umschreiben zu müssen.

**Plattform:** Statisches Frontend (`static-site/`), SWA.

---

## 2. Bestandsaufnahme (Ist)

| Seite | Primär-Var | Wert (hell) | Action-Grün |
| --- | --- | --- | --- |
| content.css (Infoseiten) | `--c-pri` | `#2d6a30` | – |
| style.css | `--c-pri` | `#1e463a` | – |
| bestellstatus/mittagstisch/lunch-admin/kiosk | `--c-pri` | `#2d5016` | `--c-green:#2e7d4f` |
| fleisch-bestellen | – | – | `--c-green:#2e7d4f` |
| shop | – | – | `--shop-green:#2e7d4f` |
| shop-admin/shop-freigabe | – | – | `--green:#2e7d4f` (`--green2:#1f5c39`) |
| pack | `--pk-green` | `#1e3a2f` | – |
| handbuch | `--green` | `#2d5016` | – |

**Dark-Werte** sind bereits konsistent (`#5cb85f` Grün, `#12171a` BG,
`#1b2228` Card, `#e6eae8` Text, `#9aa6a0` Muted, `#2a333a` Border).

---

## 3. Goals

- **Eine** Quelle für Marken-/Neutral-Tokens (Farben, Radius, Schatten).
- Konsistentes Marken-Grün über alle Seiten.
- Konsistente Dark-Palette (Tokens statt pro Seite wiederholt).
- **Minimales Risiko**: keine Massen-Umbenennung von Variablen/Verwendungen.

## 4. Non-Goals

- Kein Umschreiben aller `var(--xxx)`-Verwendungen in den Seiten.
- Keine Umstellung aller Inline-Styles auf Klassen (separater, späterer Schritt).
- Kein visuelles Redesign – Werte bleiben (bis auf die Grün-Vereinheitlichung) gleich.

---

## 5. Requirements

### F1: Zentrale Token-Datei

`static-site/css/tokens.css` definiert die kanonischen Tokens:

```css
:root{
  --dl-green:#2d5016;        /* Primär (Header/Marke) */
  --dl-green-h:#1b5e20;      /* Hover */
  --dl-green-action:#2e7d4f; /* Buttons/Erfolg */
  --dl-green-light:#e8f5e9;
  --dl-bg:#faf7f2; --dl-surface:#ffffff; --dl-surface2:#f9fafb;
  --dl-text:#1f2937; --dl-muted:#6b7280; --dl-border:#e5e7eb;
  --dl-red:#dc2626; --dl-orange:#e65100; --dl-radius:14px;
  --dl-shadow:0 2px 12px rgba(0,0,0,.08);
}
html[data-theme="dark"]{
  --dl-green:#5cb85f; --dl-green-h:#74c777; --dl-green-action:#5cb85f;
  --dl-green-light:#1e2a20; --dl-bg:#12171a; --dl-surface:#1b2228;
  --dl-surface2:#161c20; --dl-text:#e6eae8; --dl-muted:#9aa6a0;
  --dl-border:#2a333a;
}
```

Wird **früh** geladen (vor den Seiten-Styles), z. B. via `<link>` im `<head>`
jeder Seite bzw. injiziert durch `theme.js`.

#### F1 Test Cases
**TC-F1-01:** `tokens.css` geladen → `getComputedStyle(root).getPropertyValue('--dl-green')` liefert den kanonischen Wert.

### F2: Seiten-Variablen auf Tokens aliasen

Statt Werte zu duplizieren, zeigt jede Seiten-`:root` auf die Tokens –
**nur die Definitionszeile** ändert sich, keine Verwendung:

```css
/* shop.html */  :root{--shop-green:var(--dl-green-action); ...}
/* kiosk.html */ :root{--c-pri:var(--dl-green); --c-green:var(--dl-green-action); ...}
```

Dark-Overrides der Seiten können entfallen, wo sie nur die Tokens spiegeln.

#### F2 Behaviour / Acceptance
- Nach dem Aliasing rendert jede Seite **optisch unverändert** (bis auf die
  bewusste Grün-Vereinheitlichung).
- Kein `var(--…)`-Aufruf in den Seiten muss angefasst werden.

#### F2 Test Cases
**TC-F2-01:** Marken-Grün ist auf shop, kiosk, fleisch, mittagstisch identisch
(`getComputedStyle` der Marken-Elemente).
**TC-F2-02:** Read-only Smoke bleibt grün (Seiten laden/rendern).

### F3: Inkrementeller Rollout

Seiten werden **einzeln** aliased, jeweils mit kurzer Browser-Sichtprüfung.
Reihenfolge: content.css (Infoseiten) → shop → kiosk → fleisch/mittagstisch →
Admin (shop-admin/lunch-admin/pack) → style.css.

---

## 6. Data & Contracts

Neue Datei: `static-site/css/tokens.css` (Tokens siehe F1).
Einbindung: `<link rel="stylesheet" href="/css/tokens.css">` vor den übrigen
Styles – oder zentral via `theme.js`-Injektion (analog Dark-Baseline).

---

## 7. Open Questions

- [NEEDS CLARIFICATION: Welches Grün ist das **kanonische Primär-Grün**?
  Kandidaten: `#2d5016` (dunkel, aktuell in kiosk/mittagstisch/bestellstatus/
  handbuch) oder `#2d6a30` (content.css) oder `#1e463a` (style.css).
  Vorschlag: `#2d5016` als Primär + `#2e7d4f` als Action-Grün.]

---

## 8. Traceability

| Requirement | Test Cases | Plan | Tasks |
| --- | --- | --- | --- |
| F1 | TC-F1-01 | — | — |
| F2 | TC-F2-01/02 | — | — |
| F3 | (pro Seite Smoke + Sicht) | — | — |
