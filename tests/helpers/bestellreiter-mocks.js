/**
 * Gemeinsame Attrappen für die drei Bestellreiter (Bäcker, Mair, Getränke).
 *
 * Vorher lag dieselbe Nachbildung in jeder Testdatei. Sie steht jetzt einmal
 * hier, damit die Reiter überall gegen dieselben Daten geprüft werden.
 *
 * `mockApi(page, opts)` kennt zwei Schalter:
 *   opts.metzgerVorschlaege  — Vorschläge je Artikelnummer (Metzger-Spec F4)
 *   opts.metzgerLeer         — Bestellung ohne Positionen (zum Erfassen)
 */

const TAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag',
              'Freitag', 'Samstag'];

function iso(d) {
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2)
    + '-' + ('0' + d.getDate()).slice(-2);
}
function tagPlus(n) { const d = new Date(); d.setDate(d.getDate() + n); return d; }

/* Lange Namen und mehrere Gruppen — der ungünstigste Fall für den Kopf. */
const ARTIKEL_LANG = [
  { nummer: '1', name: 'Kaisersemmel', gruppe: 'Semmeln & Kleingebäck', menge: 80 },
  { nummer: '33', name: 'Mohnsemmel', gruppe: 'Semmeln & Kleingebäck', menge: 2 },
  { nummer: '34', name: 'Sesamsemmel', gruppe: 'Semmeln & Kleingebäck', menge: 2 },
  { nummer: '39', name: 'Roggensemmel mit Kümmel', gruppe: 'Semmeln & Kleingebäck', menge: 2 },
  { nummer: '53', name: 'Doppelte', gruppe: 'Semmeln & Kleingebäck', menge: 3 },
  { nummer: '126', name: 'Baguette 400g', gruppe: 'Brote & Baguettes', menge: 1 },
  { nummer: '160', name: 'Sonnenblumenkernbrot 750 g', gruppe: 'Brote & Baguettes', menge: 2 },
  { nummer: '188', name: 'Superlaib mit Körner 2kg', gruppe: 'Brote & Baguettes', menge: 1 },
  { nummer: '201', name: '6-Korn-Quarkbrot 500g', gruppe: 'Brote & Baguettes', menge: 1 },
  { nummer: '233', name: 'Dinkelvollkorn Pur 500g', gruppe: 'Brote & Baguettes', menge: 2 },
  { nummer: '301', name: 'König-Ludwig-Brot 1kg', gruppe: 'Brote & Baguettes', menge: 2 },
  { nummer: '410', name: 'Nussschnecke', gruppe: 'Süßes & Sonstiges', menge: 4 },
];

function baeckerTage() {
  const out = [];
  for (let i = 0; i < 7; i++) {
    const d = tagPlus(i);
    const ist = d.getDay() !== 0;                 // sonntags keine Lieferung
    const zwei = i === 2;                         // ein Tag mit zwei Bäckereien
    out.push({
      datum: iso(d), wochentag: TAGE[d.getDay()],
      bestelltag: ist, bestellbar: ist && i > 0, heute: i === 0,
      heute_bestellen: i === 1,
      status: !ist ? 'kein_tag' : (i === 0 ? 'vorbei' : 'offen'),
      fertig: 0, gesamt: ist ? (zwei ? 2 : 1) : 0,
      lieferanten: !ist ? [] : (zwei
        ? [{ baeckerei: 'freundl', name: 'Bäckerei Freundl', status: 'offen', druck_offen: false },
           { baeckerei: 'gruener', name: 'Bäckerei Grüner', status: 'offen', druck_offen: false }]
        : [{ baeckerei: 'freundl', name: 'Bäckerei Freundl', status: 'offen', druck_offen: false }]),
    });
  }
  return out;
}

function baeckerBestellung() {
  const t = baeckerTage().find((x) => x.bestellbar);
  return {
    datum: t.datum, wochentag: t.wochentag,
    datum_de: t.datum.split('-').reverse().join('.'),
    status: 0, gesperrt: false, bestellbar: true, korrektur_moeglich: false,
    vorlage_datum: '2026-09-03', vorlage_datum_de: '03.09.2026',
    bestellschluss_datum_de: '10.09.2026', bestellschluss_wochentag: 'Donnerstag',
    protokoll: [], tour_nr: '87', kd_nr: '1190',
    baeckerei: 'freundl', baeckerei_name: 'Bäckerei Freundl',
    papierausdruck: false, gedruckt_am: '', druck_offen: false,
    empfaenger: 'jrumpfinger@t-online.de', testbetrieb: true,
    positionen: ARTIKEL_LANG.map((a) => ({
      nummer: a.nummer, name: a.name, aktiv: true, menge: a.menge,
      retoure: 0, vorbelegt: a.menge, verlauf: [a.menge, a.menge, a.menge], zusatz: false,
    })),
  };
}

const GETRAENKE_ARTIKEL = ARTIKEL_LANG.map((a, i) => ({
  nummer: 'KA4001' + i, name: a.name, gruppe: i < 5 ? 'Bier' : 'Alkoholfrei',
  gebinde: '20 × 0,5 l', preis: 12.5 + i, pfand: 3.1, menge: a.menge % 4,
  // „Übliche Artikel" entscheidet sich an der Zahl früherer Bestellungen.
  bestellungen: 9, ueblich: 4, aktiv: true,
}));

async function mockApi(page, opts = {}) {
  await page.route(/\/api\//, (r) => {
    const url = r.request().url();
    const method = r.request().method();
    const json = (o) => r.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(o),
    });

    if (/cms-config/.test(url)) {
      return json({ success: true, data: { feature_flags: {
        kiosk_mittag: true, kiosk_baecker: true, kiosk_metzger: true,
        kiosk_metzgerbest: true, kiosk_getraenke: true, kiosk_kontakt: true,
      } } });
    }

    /* ── Bäcker ── */
    if (/baecker-artikel/.test(url)) {
      return json({ success: true, artikel: ARTIKEL_LANG.map((a) => ({
        nummer: a.nummer, name: a.name, aktiv: true, bestellt_in: 12, gruppe: a.gruppe,
      })), anzahl_aktiv: ARTIKEL_LANG.length, anzahl_gesamt: 60 });
    }
    if (/baecker-order/.test(url)) {
      if (method === 'POST') return json({ success: true, status: 1, protokoll: [] });
      if (/mode=uebersicht/.test(url)) {
        const tage = baeckerTage();
        return json({ success: true, tage, naechster: tage.find((t) => t.bestellbar).datum,
          offen_gesamt: 1,
          erinnerung: { offen: true, blinkt: false, datum: tage.find((t) => t.bestellbar).datum,
            wochentag: 'Freitag', bestellschluss: '12:00' } });
      }
      if (/mode=verlauf/.test(url)) return json({ success: true, verlauf: [] });
      if (/mode=dokument/.test(url)) return json({ success: true, html: '<p>Formular</p>' });
      return json({ success: true, bestellung: baeckerBestellung() });
    }

    /* ── Metzger ── */
    if (/metzger-artikel/.test(url)) {
      return json({ success: true, artikel: ARTIKEL_LANG.map((a) => ({
        nummer: Number(a.nummer), name: a.name, preis: 12.4, einheit: 'kg',
        gruppe: a.gruppe, aktiv: true, auf_formular: true,
      })) });
    }
    if (/metzger-order/.test(url)) {
      if (method === 'POST') {
        return json({ success: true, status: 1, testbetrieb: true, protokoll: [], summen: {} });
      }
      if (/mode=verlauf/.test(url)) return json({ success: true, verlauf: [] });
      const datum = iso(tagPlus(1));
      const config = { empfaenger: 'jrumpfinger@t-online.de', name: 'Metzgerei Mair',
        kd_nr: '1041', liefertage: [1, 3, 5] };
      if (/metzger-order\/\d{4}-\d{2}-\d{2}/.test(url)) {
        const positionen = ARTIKEL_LANG.map((a) => ({
          nummer: Number(a.nummer), name: a.name,
          portionen: opts.metzgerLeer
            ? []
            : [{ anzahl: a.menge || 1, menge: 500, einheit: 'g', vakuum: true }],
          hinweis: '', zusatz: false }));
        return json({ success: true,
          bestellung: { datum, status: 0, protokoll: [], positionen },
          artikel: ARTIKEL_LANG.map((a) => ({
            nummer: Number(a.nummer), name: a.name, preis: 12.4, einheit: 'kg',
            gruppe: a.gruppe, aktiv: true, auf_formular: true })),
          vorschlaege: opts.metzgerVorschlaege || {},
          vorbelegt_aus: '2026-08-24', letzte: null,
          bestelltag: true, bestellbar: true, config, testbetrieb: true, summen: {} });
      }
      return json({ success: true, aktiv: datum, config, testbetrieb: true,
        tage: baeckerTage().map((t) => ({ datum: t.datum, wochentag: t.wochentag,
          bestelltag: t.bestelltag, bestellbar: t.bestellbar, status: 0 })) });
    }

    /* ── Getränke ── */
    if (/getraenke-artikel/.test(url)) {
      return json({ success: true, artikel: GETRAENKE_ARTIKEL });
    }
    if (/getraenke-order/.test(url)) {
      if (method === 'POST') return json({ success: true, status: 1 });
      return json({ success: true,
        termin: iso(tagPlus(4)), kw: 38,
        config: { name: 'Getränke Kratzer', empfaenger: 'jrumpfinger@t-online.de',
          kd_nr: '15554', tour: '1' },
        testbetrieb: true,
        gruppen: ['Bier', 'Alkoholfrei'],
        artikel: GETRAENKE_ARTIKEL,
        positionen: GETRAENKE_ARTIKEL.map((a) => ({ nummer: a.nummer, menge: a.menge })),
        letzte: { datum: iso(tagPlus(-7)), datum_de: '03.09.2026',
          positionen: GETRAENKE_ARTIKEL.map((a) => ({ nummer: a.nummer, menge: a.menge })),
          summe: 553.22 },
        pfand: { '20 × 0,5 l': 3.1 },
        bestellbar: true,
        bestellung: { status: 0, positionen: [] } });
    }

    return json({ success: true });
  });
}

module.exports = {
  TAGE, iso, tagPlus, ARTIKEL_LANG, baeckerTage, baeckerBestellung,
  GETRAENKE_ARTIKEL, mockApi,
};
