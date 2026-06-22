# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: bestellsystem.spec.js >> Homepage – Meine Bestellungen Widget >> T-MY-01 (AK-BS-16): Ohne bs_email → Widget bleibt versteckt
- Location: tests\bestellsystem.spec.js:574:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.goto: Test timeout of 60000ms exceeded.
Call log:
  - navigating to "https://witty-island-064f9d903.7.azurestaticapps.net/", waiting until "load"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Zum Inhalt springen" [ref=e2] [cursor=pointer]:
    - /url: "#main"
  - complementary "Kontaktleiste" [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]:
        - text: "Tel:"
        - link "08082 / 622 99 91" [ref=e6] [cursor=pointer]:
          - /url: tel:+4980826229991
        - text: ·
        - link "info@dorfladen-oberornau.de" [ref=e7] [cursor=pointer]:
          - /url: mailto:info@dorfladen-oberornau.de
      - generic [ref=e8]:
        - link "Impressum" [ref=e9] [cursor=pointer]:
          - /url: /impressum
        - link "Datenschutz" [ref=e10] [cursor=pointer]:
          - /url: /datenschutzerklaerung
  - navigation "Hauptnavigation" [ref=e11]:
    - generic [ref=e12]:
      - link "Dorfladen Oberornau Startseite" [ref=e13] [cursor=pointer]:
        - /url: /
        - img "Dorfladen Oberornau" [ref=e14]
      - list [ref=e15]:
        - listitem [ref=e16]:
          - link "Start" [ref=e17] [cursor=pointer]:
            - /url: /
        - listitem [ref=e18]:
          - link "Aktuelles" [ref=e19] [cursor=pointer]:
            - /url: /aktuelles
        - listitem [ref=e20]:
          - link "Dorfladen" [ref=e21] [cursor=pointer]:
            - /url: /konzept
        - listitem [ref=e22]:
          - link "Online bestellen" [ref=e23] [cursor=pointer]:
            - /url: /shop
            - img [ref=e24]
            - text: Online bestellen
        - listitem [ref=e28]:
          - link "Essen" [ref=e29] [cursor=pointer]:
            - /url: /essen-im-dorfladen
        - listitem [ref=e30]:
          - link "Über uns" [ref=e31] [cursor=pointer]:
            - /url: /beirat
        - listitem [ref=e32]:
          - link "Roter Punkt" [ref=e33] [cursor=pointer]:
            - /url: /roter-punkt
            - img [ref=e34]
            - text: Roter Punkt
        - listitem [ref=e36]:
          - link "❓ Hilfe" [ref=e37] [cursor=pointer]:
            - /url: /handbuch/hilfe.html
        - listitem [ref=e38]:
          - link "🚀 CMS" [ref=e39] [cursor=pointer]:
            - /url: /cms
  - banner [ref=e40]:
    - generic [ref=e41]:
      - generic [ref=e42]:
        - heading "Ihr Dorfladen in Oberornau" [level=1] [ref=e43]
        - paragraph [ref=e44]: Nahversorger · Treffpunkt · Postfiliale – regional, frisch und mit Herz.
      - paragraph [ref=e45]:
        - img [ref=e46]
        - text: Kleines Bistro mit Mittagstisch, Kaffee, Kuchen & Snacks ·
        - img [ref=e48]
        - text: Im Sommer gemütlich draußen sitzen am Dorfplatz
    - generic [ref=e55]:
      - text: Jetzt geöffnet
      - generic [ref=e57]: – bis 14:00 Uhr
  - generic [ref=e59]:
    - link "Sonderangebote 6" [ref=e60] [cursor=pointer]:
      - /url: "#angebote"
      - generic [ref=e61]:
        - img [ref=e62]
        - text: Sonderangebote
      - generic [ref=e64]: "6"
    - link "Roter Punkt" [ref=e65] [cursor=pointer]:
      - /url: /roter-punkt
      - text: Roter Punkt
    - link "Preisliste" [ref=e67] [cursor=pointer]:
      - /url: /sortiment#preisliste
      - img [ref=e69]
      - text: Preisliste
  - generic [ref=e73]:
    - img [ref=e75]
    - generic [ref=e79]:
      - generic [ref=e80]:
        - text: "Fleisch & Wurst: 15 % Rabatt bei Vorbestellung ab 1 kg"
        - generic [ref=e81]: Daueraktion
      - generic [ref=e82]:
        - text: Auf alle Fleisch- und Wurstprodukte, die je Artikel mit mehr als 1 kg vorbestellt werden, gewähren wir dauerhaft 15 % Rabatt. Einfach im Laden oder telefonisch vorbestellen!
        - link "Jetzt vorbestellen" [ref=e83] [cursor=pointer]:
          - /url: tel:+4980826229991
          - img [ref=e84]
          - text: Jetzt vorbestellen
  - main [ref=e86]:
    - generic [ref=e87]:
      - generic [ref=e89]:
        - img [ref=e91]
        - generic [ref=e93]:
          - generic [ref=e94]: Wochenplanung Mittagessen
          - generic [ref=e95]: Wird geladen…
      - generic [ref=e99]:
        - generic [ref=e100]:
          - text: Das aktuelle Mittagsmenü und unsere Sonderaktionen erfahrt ihr immer auch über die
          - strong [ref=e101]: Dorfladen Oberornau WhatsApp Gruppe
          - emphasis [ref=e102]: mit Onlineshop!!!
          - link "Hier klicken für Anmeldung" [ref=e103] [cursor=pointer]:
            - /url: https://wa.me/491714910935?text=Hallo%2C%20ich%20m%C3%B6chte%20der%20WhatsApp-Gruppe%20beitreten%20%F0%9F%91%8B
          - text: oder scanne den nachstehenden QR-Code mit deinem Smartphone und bestätige mit deinem Namen im Chat.
        - generic [ref=e104]:
          - img "WhatsApp QR-Code Dorfladen Oberornau" [ref=e105]
          - generic [ref=e106]:
            - strong [ref=e107]: Dorfladen Oberornau
            - text: WhatsApp-Unternehmenskonto
      - generic [ref=e108]:
        - generic [ref=e109]:
          - img [ref=e110]
          - generic [ref=e112]: Sonderangebote
          - generic [ref=e113]: 22.06. – 27.06.2026
        - generic [ref=e114]:
          - button "Diese Woche" [ref=e115] [cursor=pointer]
          - button "Nächste Woche" [ref=e116] [cursor=pointer]
          - generic [ref=e117]: 21.06.2026 – 27.06.2026
        - generic [ref=e118]:
          - generic [ref=e119]:
            - generic: 🌿
            - generic [ref=e120]: "-30%"
            - img "4311596488100" [ref=e122]
            - generic [ref=e124]: Booster Absolut.Zero 0,33l
            - generic [ref=e125]:
              - generic [ref=e126]: 0,69€
              - generic [ref=e127]: 0,99 €
            - generic: 🛒
          - generic [ref=e128]:
            - generic: 🌿
            - generic [ref=e129]: "-21%"
            - img "40193151" [ref=e131]
            - generic [ref=e132]:
              - generic [ref=e133]: Exqu.Frischkäse natur 70%200g
              - generic [ref=e134]: verschiedene Sorten
            - generic [ref=e135]:
              - generic [ref=e136]: 1,49€
              - generic [ref=e137]: 1,89 €
            - generic: 🛒
          - generic [ref=e138]:
            - generic: 🌿
            - generic [ref=e139]: "-17%"
            - img "4001686327487" [ref=e141]
            - generic [ref=e143]: Haribo Saure Goldbären 175g
            - generic [ref=e144]:
              - generic [ref=e145]: 0,99€
              - generic [ref=e146]: 1,19 €
            - generic: 🛒
          - generic [ref=e147]:
            - generic: 🌿
            - generic [ref=e148]: "-21%"
            - img "4311501117798" [ref=e150]
            - generic [ref=e151]:
              - generic [ref=e152]: G&G Vollm. Ganze Haselnüsse
              - generic [ref=e153]: 100 g
            - generic [ref=e154]:
              - generic [ref=e155]: 1,49€
              - generic [ref=e156]: 1,89 €
            - generic: 🛒
          - generic [ref=e157]:
            - generic: 🌿
            - generic [ref=e158]: "-22%"
            - img "Kirschkörbchen" [ref=e160]
            - generic [ref=e161]:
              - generic [ref=e162]: Kirschkörbchen
              - generic [ref=e163]: 1 Stück
            - generic [ref=e164]:
              - generic [ref=e165]: 1,40€
              - generic [ref=e166]: 1,80 €
            - generic: 🛒
          - generic [ref=e167]:
            - generic: 🌿
            - generic [ref=e168]: "-18%"
            - img "2220617" [ref=e170]
            - generic [ref=e171]:
              - generic [ref=e172]: Regensburger
              - generic [ref=e173]: 100 g
            - generic [ref=e174]:
              - generic [ref=e175]: 1,45€
              - generic [ref=e176]: 1,77 €
            - generic: 🛒
      - generic [ref=e177]:
        - generic [ref=e178]:
          - heading "Unser Konzept" [level=3] [ref=e179]:
            - img [ref=e180]
            - text: Unser Konzept
          - paragraph [ref=e184]: Regionale Nahversorgung & gemütlicher Treffpunkt für Jung und Alt. Frühstück, Brotzeit, Mittagessen und hausgemachte Torten.
          - link "Mehr erfahren →" [ref=e185] [cursor=pointer]:
            - /url: javascript:void(0)
        - generic [ref=e186]:
          - heading "Postfiliale" [level=3] [ref=e187]:
            - img [ref=e188]
            - text: Postfiliale
          - paragraph [ref=e192]: Alle gängigen Postdienstleistungen direkt im Dorfladen. Briefe, Pakete, Einschreiben – ohne weite Wege.
          - link "Öffnungszeiten →" [ref=e193] [cursor=pointer]:
            - /url: javascript:void(0)
        - generic [ref=e194]:
          - heading "Catering & Lieferung" [level=3] [ref=e195]:
            - img [ref=e196]
            - text: Catering & Lieferung
          - paragraph [ref=e198]: Für Vereine und Familienfeiern liefern wir kalte und warme Speisen. Mittagessen auch per Nachbarschaftshilfe lieferbar.
          - link "Details →" [ref=e199] [cursor=pointer]:
            - /url: javascript:void(0)
        - generic [ref=e200]:
          - heading "Nachhaltigkeit" [level=3] [ref=e201]:
            - img [ref=e202]
            - text: Nachhaltigkeit
          - paragraph [ref=e204]: Regional & saisonal einkaufen. Gerne eigene Behälter mitbringen! Bio-Gemüse, Orangen direkt vom Erzeuger, Fleisch vom regionalen Metzger.
          - link "Sortiment →" [ref=e205] [cursor=pointer]:
            - /url: javascript:void(0)
      - generic [ref=e206]:
        - generic [ref=e207]:
          - img [ref=e208]
          - text: Aktuelles
          - generic [ref=e210]: 4 Beiträge
        - generic [ref=e212]:
          - generic [ref=e213]:
            - generic [ref=e215]:
              - img [ref=e216]
              - text: 07.06.2026
            - generic [ref=e218]: Folgt uns auf Instagram
            - button "Weiterlesen →" [ref=e219] [cursor=pointer]
          - generic [ref=e220]:
            - generic [ref=e222]:
              - img [ref=e223]
              - text: 04.06.2026
            - generic [ref=e225]: Unsere neue Homepage ist online!
            - button "Weiterlesen →" [ref=e226] [cursor=pointer]
          - generic [ref=e227]:
            - generic [ref=e229]:
              - img [ref=e230]
              - text: 21.05.2026
            - generic [ref=e232]: "Fleisch & Wurst: 15% Rabatt bei Vorbestellung ab 1 kg"
            - button "Weiterlesen →" [ref=e233] [cursor=pointer]
          - generic [ref=e234]:
            - generic [ref=e236]:
              - img [ref=e237]
              - text: 20.05.2026
            - generic [ref=e239]: Werde Teil unseres Teams
            - button "Weiterlesen →" [ref=e240] [cursor=pointer]
      - generic [ref=e241]:
        - generic [ref=e242] [cursor=pointer]:
          - generic [ref=e243]:
            - img [ref=e244]
            - text: Impressionen
          - generic [ref=e246]: "?"
        - generic [ref=e247]:
          - generic [ref=e248]:
            - button "Alle(21)" [ref=e249] [cursor=pointer]
            - button "Cafeteria(1)" [ref=e250] [cursor=pointer]
            - button "Catering(6)" [ref=e251] [cursor=pointer]
            - button "Laden(3)" [ref=e252] [cursor=pointer]
            - button "Sortiment(11)" [ref=e253] [cursor=pointer]
          - generic [ref=e254]:
            - img "WhatsApp Image 2026-06-17 at 14.48.22" [ref=e256] [cursor=pointer]
            - img "catering 1" [ref=e258] [cursor=pointer]
            - img "catering 2" [ref=e260] [cursor=pointer]
            - img "catering 3" [ref=e262] [cursor=pointer]
            - img "catering 4" [ref=e264] [cursor=pointer]
            - img "catering 5" [ref=e266] [cursor=pointer]
            - img "thumbnail" [ref=e268] [cursor=pointer]
            - generic [ref=e269] [cursor=pointer]:
              - img "Unser Dorfladen" [ref=e270]
              - generic [ref=e271]: Unser Dorfladen
            - img "k-016" [ref=e273] [cursor=pointer]
            - img "k-018" [ref=e275] [cursor=pointer]
            - generic [ref=e276] [cursor=pointer]:
              - img "frische Auswahl an Obst und Gemüse" [ref=e277]
              - generic [ref=e278]: frische Auswahl an Obst und Gemüse
            - img "k-009" [ref=e280] [cursor=pointer]
            - img "k-010" [ref=e282] [cursor=pointer]
            - img "k-011" [ref=e284] [cursor=pointer]
            - img "k-012" [ref=e286] [cursor=pointer]
            - img "k-019" [ref=e288] [cursor=pointer]
            - img "k-020" [ref=e290] [cursor=pointer]
            - img "k-021" [ref=e292] [cursor=pointer]
            - generic [ref=e293] [cursor=pointer]:
              - img "Wurst und Fleisch von Metzger Mair" [ref=e294]
              - generic [ref=e295]: Wurst und Fleisch von Metzger Mair
            - img "Orangen" [ref=e297] [cursor=pointer]
            - generic [ref=e298] [cursor=pointer]:
              - img "Gemüse von Steiner" [ref=e299]
              - generic [ref=e300]: Gemüse von Steiner
    - complementary "Seitenleiste" [ref=e301]:
      - generic [ref=e302]:
        - generic [ref=e303]:
          - img [ref=e304]
          - text: Öffnungszeiten
        - generic [ref=e306]:
          - generic [ref=e307]:
            - generic [ref=e308]:
              - generic [ref=e309]: 🛒 Dorfladen
              - table [ref=e310]:
                - rowgroup [ref=e311]:
                  - row "Mo 06:30–14:00 & 16:30–19:00" [ref=e312]:
                    - cell "Mo" [ref=e313]
                    - cell "06:30–14:00 & 16:30–19:00" [ref=e314]
                  - row "Di 06:30–14:00" [ref=e315]:
                    - cell "Di" [ref=e316]
                    - cell "06:30–14:00" [ref=e317]
                  - row "Mi 06:30–14:00 & 16:30–19:00" [ref=e318]:
                    - cell "Mi" [ref=e319]
                    - cell "06:30–14:00 & 16:30–19:00" [ref=e320]
                  - row "Do 06:30–14:00 & 16:30–19:00" [ref=e321]:
                    - cell "Do" [ref=e322]
                    - cell "06:30–14:00 & 16:30–19:00" [ref=e323]
                  - row "Fr 06:30–14:00 & 16:30–19:00" [ref=e324]:
                    - cell "Fr" [ref=e325]
                    - cell "06:30–14:00 & 16:30–19:00" [ref=e326]
                  - row "Sa 07:00–13:00" [ref=e327]:
                    - cell "Sa" [ref=e328]
                    - cell "07:00–13:00" [ref=e329]
                  - row "So Geschlossen" [ref=e330]:
                    - cell "So" [ref=e331]
                    - cell "Geschlossen" [ref=e332]
            - generic [ref=e333]:
              - generic [ref=e334]: 📦 Postfiliale
              - table [ref=e335]:
                - rowgroup [ref=e336]:
                  - row "Mo 09:00–14:00 & 16:30–19:00" [ref=e337]:
                    - cell "Mo" [ref=e338]
                    - cell "09:00–14:00 & 16:30–19:00" [ref=e339]
                  - row "Di 09:00–14:00" [ref=e340]:
                    - cell "Di" [ref=e341]
                    - cell "09:00–14:00" [ref=e342]
                  - row "Mi 09:00–14:00 & 16:30–19:00" [ref=e343]:
                    - cell "Mi" [ref=e344]
                    - cell "09:00–14:00 & 16:30–19:00" [ref=e345]
                  - row "Do 09:00–14:00 & 16:30–19:00" [ref=e346]:
                    - cell "Do" [ref=e347]
                    - cell "09:00–14:00 & 16:30–19:00" [ref=e348]
                  - row "Fr 09:00–14:00 & 16:30–19:00" [ref=e349]:
                    - cell "Fr" [ref=e350]
                    - cell "09:00–14:00 & 16:30–19:00" [ref=e351]
                  - row "Sa 09:00–13:00" [ref=e352]:
                    - cell "Sa" [ref=e353]
                    - cell "09:00–13:00" [ref=e354]
                  - row "So Geschlossen" [ref=e355]:
                    - cell "So" [ref=e356]
                    - cell "Geschlossen" [ref=e357]
          - paragraph [ref=e358]: Außer an gesetzlichen Feiertagen
      - generic [ref=e359]:
        - generic [ref=e360]:
          - img [ref=e361]
          - text: Kontakt & Adresse
        - generic [ref=e363]:
          - strong [ref=e364]: Dorfladen Oberornau UG
          - text: Dorfplatz 1
          - text: 84419 Obertaufkirchen
          - strong [ref=e365]: "Tel:"
          - link "08082 / 622 99 91" [ref=e366] [cursor=pointer]:
            - /url: tel:+4980826229991
          - strong [ref=e367]: "E-Mail:"
          - link "info@dorfladen-oberornau.de" [ref=e368] [cursor=pointer]:
            - /url: mailto:info@dorfladen-oberornau.de
          - iframe [ref=e370]:
            - link "Maps (wird in neuem Tab geöffnet)" [ref=f1e4] [cursor=pointer]:
              - /url: about:invalid#zClosurez
              - text: Maps
              - img [ref=f1e6]
      - generic [ref=e371]:
        - generic [ref=e372]:
          - img [ref=e373]
          - text: Speiseplan per WhatsApp
        - generic [ref=e376]:
          - paragraph [ref=e377]: Wöchentlichen Speiseplan bequem aufs Handy erhalten
          - link "Jetzt anmelden" [ref=e378] [cursor=pointer]:
            - /url: https://wa.me/491714910935?text=Hallo%2C%20ich%20m%C3%B6chte%20der%20WhatsApp-Gruppe%20beitreten%20%F0%9F%91%8B
  - contentinfo [ref=e379]:
    - generic [ref=e380]:
      - generic [ref=e381]:
        - heading "Dorfladen Oberornau" [level=4] [ref=e382]
        - paragraph [ref=e383]:
          - text: Dorfladen Oberornau UG
          - text: (haftungsbeschränkt)
          - text: Dorfplatz 1
          - text: 84419 Obertaufkirchen
          - text: "Tel:"
          - link "08082 / 622 99 91" [ref=e384] [cursor=pointer]:
            - /url: tel:+4980826229991
          - link "info@dorfladen-oberornau.de" [ref=e385] [cursor=pointer]:
            - /url: mailto:info@dorfladen-oberornau.de
        - generic [ref=e386]:
          - link "WhatsApp" [ref=e387] [cursor=pointer]:
            - /url: https://wa.me/491714910935?text=Hallo%2C%20ich%20habe%20eine%20Frage%20%F0%9F%91%8B
            - img [ref=e388]
          - link "Instagram" [ref=e390] [cursor=pointer]:
            - /url: https://www.instagram.com/oberornau/
            - img [ref=e391]
      - generic [ref=e394]:
        - heading "Unser Angebot" [level=4] [ref=e395]
        - list [ref=e396]:
          - listitem [ref=e397]:
            - link "Konzept" [ref=e398] [cursor=pointer]:
              - /url: /konzept
          - listitem [ref=e399]:
            - link "Sortiment" [ref=e400] [cursor=pointer]:
              - /url: /sortiment
          - listitem [ref=e401]:
            - link "Essen im Dorfladen" [ref=e402] [cursor=pointer]:
              - /url: /essen-im-dorfladen
          - listitem [ref=e403]:
            - link "Öffnungszeiten" [ref=e404] [cursor=pointer]:
              - /url: /oeffnungszeiten
          - listitem [ref=e405]:
            - link "Roter Punkt" [ref=e406] [cursor=pointer]:
              - /url: /roter-punkt
              - img [ref=e407]
              - text: Roter Punkt
      - generic [ref=e409]:
        - heading "Über uns" [level=4] [ref=e410]
        - list [ref=e411]:
          - listitem [ref=e412]:
            - link "Beirat" [ref=e413] [cursor=pointer]:
              - /url: /beirat
          - listitem [ref=e414]:
            - link "Geschäftsführung" [ref=e415] [cursor=pointer]:
              - /url: /geschaeftsfuehrung
          - listitem [ref=e416]:
            - link "Stille Gesellschafter" [ref=e417] [cursor=pointer]:
              - /url: /stille-gesellschafter
      - generic [ref=e418]:
        - heading "Rechtliches" [level=4] [ref=e419]
        - list [ref=e420]:
          - listitem [ref=e421]:
            - link "Impressum" [ref=e422] [cursor=pointer]:
              - /url: /impressum
          - listitem [ref=e423]:
            - link "Datenschutzerklärung" [ref=e424] [cursor=pointer]:
              - /url: /datenschutzerklaerung
          - listitem [ref=e425]:
            - link "AGB" [ref=e426] [cursor=pointer]:
              - /url: /agb
          - listitem [ref=e427]:
            - link "Widerrufsrecht" [ref=e428] [cursor=pointer]:
              - /url: /widerrufsrecht
    - generic [ref=e429]:
      - generic [ref=e430]: © 2026 Dorfladen Oberornau UG (haftungsbeschränkt). Alle Rechte vorbehalten.
      - generic [ref=e431]:
        - link "Impressum" [ref=e432] [cursor=pointer]:
          - /url: /impressum
        - text: ·
        - link "Datenschutz" [ref=e433] [cursor=pointer]:
          - /url: /datenschutzerklaerung
        - text: ·
        - link "❓ Hilfe" [ref=e434] [cursor=pointer]:
          - /url: javascript:void(0)
        - text: ·
        - link "CMS" [ref=e435] [cursor=pointer]:
          - /url: /cms
      - generic [ref=e436]: v1.4.75 (Build 475)
  - link "WhatsApp Chat öffnen" [ref=e437] [cursor=pointer]:
    - /url: https://wa.me/491714910935?text=Hallo%2C%20ich%20habe%20eine%20Frage%20zum%20Dorfladen%20%F0%9F%91%8B
    - generic [ref=e438]: Schreib uns!
    - img [ref=e440]
  - dialog "Cookie-Hinweis" [ref=e442]:
    - generic [ref=e443]:
      - paragraph [ref=e444]:
        - text: Diese Website verwendet ausschließlich technisch notwendige Cookies, um die einwandfreie Funktion zu gewährleisten. Weitere Informationen finden Sie in unserer
        - link "Datenschutzerklärung" [ref=e445] [cursor=pointer]:
          - /url: /datenschutzerklaerung
        - text: .
      - generic [ref=e446]:
        - button "Verstanden" [ref=e447] [cursor=pointer]
        - button "Ablehnen" [ref=e448] [cursor=pointer]
  - marquee "Aktuelle Nachrichten" [ref=e449]:
    - link "Aktuelles" [ref=e450] [cursor=pointer]:
      - /url: /aktuelles
      - img [ref=e451]
      - text: Aktuelles
    - generic [ref=e455]:
      - link "Folgt uns auf Instagram" [ref=e457] [cursor=pointer]:
        - /url: "#"
      - text: ★
      - 'link "Fleisch & Wurst: 15% Rabatt bei Vorbestellung ab 1 kg" [ref=e459] [cursor=pointer]':
        - /url: "#"
      - text: ★
      - link "Werde Teil unseres Teams" [ref=e461] [cursor=pointer]:
        - /url: "#"
      - link "Folgt uns auf Instagram" [ref=e463] [cursor=pointer]:
        - /url: "#"
      - text: ★
      - 'link "Fleisch & Wurst: 15% Rabatt bei Vorbestellung ab 1 kg" [ref=e465] [cursor=pointer]':
        - /url: "#"
      - text: ★
      - link "Werde Teil unseres Teams" [ref=e467] [cursor=pointer]:
        - /url: "#"
```

# Test source

```ts
  475 |     await page.click('#bs-lookup-btn');
  476 |     await page.waitForSelector('#bs-details', { state: 'visible', timeout: 10000 });
  477 |     // Status badge should exist and have color styling
  478 |     const badge = page.locator('#bs-status-badge, .bs-status');
  479 |     await expect(badge.first()).toBeVisible();
  480 |   });
  481 | });
  482 | 
  483 | // ════════════════════════════════════════════════════
  484 | //  T-HP: Homepage – Meine Bestellung Link
  485 | // ════════════════════════════════════════════════════
  486 | 
  487 | test.describe('Homepage – Meine Bestellung Link', () => {
  488 | 
  489 |   test('T-HP-01: Ohne localStorage → Links bleiben versteckt', async ({ page }) => {
  490 |     await page.goto(`${BASE}/`);
  491 |     // Clear localStorage to ensure clean state
  492 |     await page.evaluate(() => { localStorage.removeItem('bs_nr'); localStorage.removeItem('bs_email'); });
  493 |     await page.goto(`${BASE}/`);
  494 |     await page.waitForTimeout(3000);
  495 |     await expect(page.locator('#desk-my-order')).toBeHidden();
  496 |     await expect(page.locator('#mob-my-order')).toBeHidden();
  497 |   });
  498 | 
  499 |   test('T-HP-02: Mit localStorage (aktive Bestellung) → Links werden sichtbar', async ({ page }) => {
  500 |     await page.goto(`${BASE}/`);
  501 |     await page.evaluate(({ nr, email }) => {
  502 |       localStorage.setItem('bs_nr', nr);
  503 |       localStorage.setItem('bs_email', email);
  504 |     }, { nr: TEST_NR, email: TEST_EMAIL });
  505 |     await page.goto(`${BASE}/`);
  506 |     // Wait for API check to complete and links to become visible
  507 |     await page.waitForSelector('#desk-my-order', { state: 'visible', timeout: 10000 });
  508 |     await expect(page.locator('#desk-my-order')).toBeVisible();
  509 |     // Check that Bestellnummer is shown
  510 |     const deskText = await page.locator('#desk-my-order').textContent();
  511 |     expect(deskText).toContain(TEST_NR);
  512 |     // Clean up
  513 |     await page.evaluate(() => { localStorage.removeItem('bs_nr'); localStorage.removeItem('bs_email'); });
  514 |   });
  515 | 
  516 |   test('T-HP-03: Mit localStorage aber falscher Email → Links bleiben versteckt', async ({ page }) => {
  517 |     await page.goto(`${BASE}/`);
  518 |     await page.evaluate(({ nr }) => {
  519 |       localStorage.setItem('bs_nr', nr);
  520 |       localStorage.setItem('bs_email', 'falsch@test.de');
  521 |     }, { nr: TEST_NR });
  522 |     await page.goto(`${BASE}/`);
  523 |     await page.waitForTimeout(4000);
  524 |     await expect(page.locator('#desk-my-order')).toBeHidden();
  525 |     // Clean up
  526 |     await page.evaluate(() => { localStorage.removeItem('bs_nr'); localStorage.removeItem('bs_email'); });
  527 |   });
  528 | 
  529 |   test('T-HP-04: Link führt zu /bestellstatus und lädt Bestellung', async ({ page }) => {
  530 |     await page.goto(`${BASE}/`);
  531 |     await page.evaluate(({ nr, email }) => {
  532 |       localStorage.setItem('bs_nr', nr);
  533 |       localStorage.setItem('bs_email', email);
  534 |     }, { nr: TEST_NR, email: TEST_EMAIL });
  535 |     await page.goto(`${BASE}/`);
  536 |     await page.waitForSelector('#desk-my-order', { state: 'visible', timeout: 10000 });
  537 |     // Click the link
  538 |     await page.click('#desk-my-order');
  539 |     // Should navigate to bestellstatus
  540 |     await page.waitForURL('**/bestellstatus**');
  541 |     // Should auto-load the order
  542 |     await page.waitForSelector('#bs-details', { state: 'visible', timeout: 10000 });
  543 |     const details = await page.locator('#bs-details').textContent();
  544 |     expect(details).toContain(TEST_GERICHT);
  545 |     // Clean up
  546 |     await page.evaluate(() => { localStorage.removeItem('bs_nr'); localStorage.removeItem('bs_email'); });
  547 |   });
  548 | 
  549 |   test('T-HP-05: API-Call erfolgt mit korrekten Parametern', async ({ page }) => {
  550 |     await page.goto(`${BASE}/`);
  551 |     await page.evaluate(({ nr, email }) => {
  552 |       localStorage.setItem('bs_nr', nr);
  553 |       localStorage.setItem('bs_email', email);
  554 |     }, { nr: TEST_NR, email: TEST_EMAIL });
  555 |     // Intercept the API call
  556 |     const apiPromise = page.waitForRequest(r =>
  557 |       r.url().includes('/api/lunch-order') && r.url().includes('nr=') && r.url().includes('email=')
  558 |     );
  559 |     await page.goto(`${BASE}/`);
  560 |     const apiReq = await apiPromise;
  561 |     expect(apiReq.url()).toContain(`nr=${encodeURIComponent(TEST_NR)}`);
  562 |     expect(apiReq.url()).toContain(`email=${encodeURIComponent(TEST_EMAIL)}`);
  563 |     // Clean up
  564 |     await page.evaluate(() => { localStorage.removeItem('bs_nr'); localStorage.removeItem('bs_email'); });
  565 |   });
  566 | });
  567 | 
  568 | // ════════════════════════════════════════════════════
  569 | //  T-MY: Homepage – Meine Bestellungen Widget (mode=my)
  570 | // ════════════════════════════════════════════════════
  571 | 
  572 | test.describe('Homepage – Meine Bestellungen Widget', () => {
  573 | 
  574 |   test('T-MY-01 (AK-BS-16): Ohne bs_email → Widget bleibt versteckt', async ({ page }) => {
> 575 |     await page.goto(`${BASE}/`);
      |                ^ Error: page.goto: Test timeout of 60000ms exceeded.
  576 |     await page.evaluate(() => { localStorage.removeItem('bs_email'); });
  577 |     await page.goto(`${BASE}/`);
  578 |     await page.waitForTimeout(3000);
  579 |     const mob = page.locator('#mob-my-orders');
  580 |     const desk = page.locator('#desk-my-orders');
  581 |     await expect(mob).toBeHidden();
  582 |     await expect(desk).toBeHidden();
  583 |   });
  584 | 
  585 |   test('T-MY-02 (AK-BS-17): API mode=my wird mit korrekter Email aufgerufen', async ({ page }) => {
  586 |     await page.goto(`${BASE}/`);
  587 |     await page.evaluate((email) => { localStorage.setItem('bs_email', email); }, TEST_EMAIL);
  588 |     const apiPromise = page.waitForRequest(r =>
  589 |       r.url().includes('/api/lunch-order') && r.url().includes('mode=my') && r.url().includes('email=')
  590 |     );
  591 |     await page.goto(`${BASE}/`);
  592 |     const apiReq = await apiPromise;
  593 |     expect(apiReq.url()).toContain(`email=${encodeURIComponent(TEST_EMAIL)}`);
  594 |     expect(apiReq.url()).toContain('mode=my');
  595 |     await page.evaluate(() => { localStorage.removeItem('bs_email'); });
  596 |   });
  597 | 
  598 |   test('T-MY-03 (AK-BS-18, AK-BS-23): API mode=my liefert nur Neu+Bestätigt, aufsteigend sortiert', async ({ page }) => {
  599 |     await page.goto(`${BASE}/`);
  600 |     const resp = await page.evaluate(async (email) => {
  601 |       const r = await fetch('/api/lunch-order?email=' + encodeURIComponent(email) + '&mode=my');
  602 |       return r.json();
  603 |     }, TEST_EMAIL);
  604 |     expect(resp.success).toBe(true);
  605 |     expect(Array.isArray(resp.orders)).toBe(true);
  606 |     for (const o of resp.orders) {
  607 |       expect(o).toHaveProperty('gericht');
  608 |       expect(o).toHaveProperty('status');
  609 |       expect(o).toHaveProperty('bestellnummer');
  610 |       // AK-BS-23: Only status 0 (Neu) or 1 (Bestätigt) – no Abgeholt/Storniert
  611 |       expect([0, 1]).toContain(o.status);
  612 |     }
  613 |     // Verify ascending date order
  614 |     if (resp.orders.length > 1) {
  615 |       for (let i = 1; i < resp.orders.length; i++) {
  616 |         expect(resp.orders[i].datum >= resp.orders[i - 1].datum).toBe(true);
  617 |       }
  618 |     }
  619 |   });
  620 | 
  621 |   test('T-MY-04 (AK-BS-19, AK-BS-21): Einzeilige Darstellung – Direktlink oder Popup', async ({ page }) => {
  622 |     await page.goto(`${BASE}/`);
  623 |     await page.evaluate((email) => { localStorage.setItem('bs_email', email); }, TEST_EMAIL);
  624 |     await page.goto(`${BASE}/`);
  625 |     try {
  626 |       await page.waitForSelector('#desk-my-orders:not([style*="display: none"])', { timeout: 10000 });
  627 |       const deskVisible = await page.locator('#desk-my-orders').isVisible();
  628 |       const mobVisible = await page.locator('#mob-my-orders').isVisible();
  629 |       expect(deskVisible || mobVisible).toBe(true);
  630 |       // AK-BS-21: Widget shows exactly one row (one <a> or one <div> click trigger)
  631 |       const container = deskVisible ? '#desk-my-orders' : '#mob-my-orders';
  632 |       const directChildren = await page.locator(`${container} > *`).count();
  633 |       expect(directChildren).toBe(1); // single line
  634 |       // If multiple orders: click trigger should open a popup
  635 |       const clickDiv = page.locator(`${container} > div[onclick]`);
  636 |       if (await clickDiv.count() > 0) {
  637 |         await clickDiv.click();
  638 |         // Popup should appear
  639 |         const popup = page.locator(`#popup-${container.replace('#','')}`);
  640 |         await expect(popup).toBeVisible({ timeout: 2000 });
  641 |         // Popup contains order links
  642 |         const popupLinks = popup.locator('a[href*="/bestellstatus"]');
  643 |         expect(await popupLinks.count()).toBeGreaterThan(1);
  644 |         // Close popup
  645 |         await popup.locator('span:has-text("✕")').click();
  646 |         await expect(popup).toBeHidden({ timeout: 2000 });
  647 |       } else {
  648 |         // Single order: direct link
  649 |         const link = page.locator(`${container} a[href*="/bestellstatus"]`);
  650 |         expect(await link.count()).toBe(1);
  651 |       }
  652 |     } catch {
  653 |       test.skip();
  654 |     }
  655 |     await page.evaluate(() => { localStorage.removeItem('bs_email'); });
  656 |   });
  657 | 
  658 |   test('T-MY-05 (AK-BS-22): Datumsformat dd.mm.yyyy in Widget-Anzeige', async ({ page }) => {
  659 |     await page.goto(`${BASE}/`);
  660 |     await page.evaluate((email) => { localStorage.setItem('bs_email', email); }, TEST_EMAIL);
  661 |     await page.goto(`${BASE}/`);
  662 |     try {
  663 |       await page.waitForSelector('#desk-my-orders:not([style*="display: none"])', { timeout: 10000 });
  664 |       const text = await page.locator('#desk-my-orders').innerText();
  665 |       // Date should be in dd.mm.yyyy format (e.g. 22.06.2026), NOT yyyy-mm-dd
  666 |       expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}/); // no ISO dates
  667 |       expect(text).toMatch(/\d{2}\.\d{2}\.\d{4}/);    // dd.mm.yyyy present
  668 |     } catch {
  669 |       test.skip();
  670 |     }
  671 |     await page.evaluate(() => { localStorage.removeItem('bs_email'); });
  672 |   });
  673 | 
  674 |   test('T-MY-06 (AK-BS-20): Falsche Email → Widget bleibt versteckt', async ({ page }) => {
  675 |     await page.goto(`${BASE}/`);
```