# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\frontend.spec.js >> Dorfladen Oberornau Frontend >> Wochenplan zeigt Daten
- Location: tests\frontend.spec.js:19:3

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('#wp-body')
Timeout: 5000ms
- Expected  - 2
+ Received  + 1

  Array [
-   "Öko-Rabatt",
-   "Vorbestell",
+   "Verzehr im Ladenoder zum MitnehmenMontagPfefferrahmschnitzel mit Nudeln und Gemüse8,80 €Lende mit Zwiebel und Käse überbacken mit Pommes und Gurkensalat8,80 €Hähnchenschenkel mit Kartoffelsalat9,80 €DienstagHähnchenschenkel mit Kartoffelsalat9,80 €Teufelstoast mit Pommes8,80 €Schnitzel mit Pommes oder Kartoffelsalat8,80 €Fisch-Schlemmerfilet mit Petersilienkartoffeln8,80 €MittwochPfefferrahmschnitzel mit Nudeln und Gemüse8,80 €Pfefferrahmschnitzel mit Nudeln und Gemüse8,80 €Teufelstoast mit Pommes8,80 €Schaslik8,80 €Lende mit Zwiebel und Käse überbacken mit Pommes und Gurkensalat8,80 €DonnerstagSchweinsbraten mit Knödl und Kartoffelsalat8,80 €Pfefferrahmschnitzel mit Nudeln und Gemüse8,80 €Hackschnitzel3,45 €FreitagSchnitzel mit Pommes oder Kartoffelsalat8,80 €Fisch-Schlemmerfilet mit Petersilienkartoffeln8,80 €Schnitzel mit Pommes oder Kartoffelsalat8,80 €0,50 € Öko-Rabatt mit eigenem Behälter☎️ 08082 622 99 91Gerne auch vorbestellen!",
  ]

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('#wp-body')
    14 × locator resolved to 1 element

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
        - generic [ref=e14]: 🌱 Dorfladen Oberornau
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
          - link "Essen" [ref=e23] [cursor=pointer]:
            - /url: /essen-im-dorfladen
        - listitem [ref=e24]:
          - link "Über uns" [ref=e25] [cursor=pointer]:
            - /url: /beirat
        - listitem [ref=e26]:
          - link "🔴 Roter Punkt" [ref=e27] [cursor=pointer]:
            - /url: /roter-punkt
        - listitem [ref=e28]:
          - link "🚀 CMS" [ref=e29] [cursor=pointer]:
            - /url: /cms
  - banner [ref=e30]:
    - generic [ref=e31]:
      - generic [ref=e32]:
        - heading "Ihr Dorfladen in Oberornau" [level=1] [ref=e33]
        - paragraph [ref=e34]: Nahversorger · Treffpunkt · Postfiliale – regional, frisch und mit Herz.
        - paragraph [ref=e35]: ☕ Kleines Bistro mit Kaffee, Kuchen & Snacks · ☀️ Im Sommer gemütlich draußen am Dorfplatz
      - generic [ref=e37]:
        - text: Geschlossen
        - generic [ref=e39]: – öffnet morgen um 6:30 Uhr
  - generic [ref=e41]:
    - link "Roter Punkt – 169 Artikel günstiger als UVP" [ref=e42] [cursor=pointer]:
      - /url: /roter-punkt
      - text: Roter Punkt – 169 Artikel günstiger als UVP
    - link "📋 Preisliste – alle Artikel mit Preisen" [ref=e44] [cursor=pointer]:
      - /url: /sortiment#preisliste
      - generic [ref=e45]: 📋
      - text: Preisliste – alle Artikel mit Preisen
  - generic [ref=e47]:
    - generic [ref=e48]: 🥩
    - generic [ref=e49]:
      - generic [ref=e50]:
        - text: "Fleisch & Wurst: 15 % Rabatt bei Vorbestellung ab 1 kg"
        - generic [ref=e51]: Daueraktion
      - generic [ref=e52]:
        - text: Auf alle Fleisch- und Wurstprodukte, die je Artikel mit mehr als 1 kg vorbestellt werden, gewähren wir dauerhaft 15 % Rabatt. Einfach im Laden oder telefonisch vorbestellen!
        - link "📞 Jetzt vorbestellen" [ref=e53] [cursor=pointer]:
          - /url: tel:+4980826229991
  - main [ref=e54]:
    - generic [ref=e55]:
      - generic [ref=e56]:
        - generic [ref=e57]:
          - img [ref=e59]
          - generic [ref=e61]:
            - generic [ref=e62]: Wochenplanung Mittagessen
            - generic [ref=e63]: NaN.NaN.aN – NaN.NaN.aN
        - generic [ref=e64]:
          - table [ref=e65]:
            - rowgroup [ref=e66]:
              - row "Verzehr im Laden oder zum Mitnehmen" [ref=e67]:
                - columnheader [ref=e68]
                - columnheader [ref=e69]
                - columnheader "Verzehr im Laden oder zum Mitnehmen" [ref=e70]:
                  - text: Verzehr im Laden
                  - text: oder zum Mitnehmen
            - rowgroup [ref=e71]:
              - row "Montag •Pfefferrahmschnitzel mit Nudeln und Gemüse 8,80 €" [ref=e72]:
                - cell "Montag" [ref=e73]
                - cell "•Pfefferrahmschnitzel mit Nudeln und Gemüse" [ref=e74]
                - cell "8,80 €" [ref=e75]
              - row "•Lende mit Zwiebel und Käse überbacken mit Pommes und Gurkensalat 8,80 €" [ref=e76]:
                - cell [ref=e77]
                - cell "•Lende mit Zwiebel und Käse überbacken mit Pommes und Gurkensalat" [ref=e78]
                - cell "8,80 €" [ref=e79]
              - row "•Hähnchenschenkel mit Kartoffelsalat 9,80 €" [ref=e80]:
                - cell [ref=e81]
                - cell "•Hähnchenschenkel mit Kartoffelsalat" [ref=e82]
                - cell "9,80 €" [ref=e83]
              - row "Dienstag •Hähnchenschenkel mit Kartoffelsalat 9,80 €" [ref=e84]:
                - cell "Dienstag" [ref=e85]
                - cell "•Hähnchenschenkel mit Kartoffelsalat" [ref=e86]
                - cell "9,80 €" [ref=e87]
              - row "•Teufelstoast mit Pommes 8,80 €" [ref=e88]:
                - cell [ref=e89]
                - cell "•Teufelstoast mit Pommes" [ref=e90]
                - cell "8,80 €" [ref=e91]
              - row "•Schnitzel mit Pommes oder Kartoffelsalat 8,80 €" [ref=e92]:
                - cell [ref=e93]
                - cell "•Schnitzel mit Pommes oder Kartoffelsalat" [ref=e94]
                - cell "8,80 €" [ref=e95]
              - row "•Fisch-Schlemmerfilet mit Petersilienkartoffeln 8,80 €" [ref=e96]:
                - cell [ref=e97]
                - cell "•Fisch-Schlemmerfilet mit Petersilienkartoffeln" [ref=e98]
                - cell "8,80 €" [ref=e99]
              - row "Mittwoch •Pfefferrahmschnitzel mit Nudeln und Gemüse 8,80 €" [ref=e100]:
                - cell "Mittwoch" [ref=e101]
                - cell "•Pfefferrahmschnitzel mit Nudeln und Gemüse" [ref=e102]
                - cell "8,80 €" [ref=e103]
              - row "•Pfefferrahmschnitzel mit Nudeln und Gemüse 8,80 €" [ref=e104]:
                - cell [ref=e105]
                - cell "•Pfefferrahmschnitzel mit Nudeln und Gemüse" [ref=e106]
                - cell "8,80 €" [ref=e107]
              - row "•Teufelstoast mit Pommes 8,80 €" [ref=e108]:
                - cell [ref=e109]
                - cell "•Teufelstoast mit Pommes" [ref=e110]
                - cell "8,80 €" [ref=e111]
              - row "•Schaslik 8,80 €" [ref=e112]:
                - cell [ref=e113]
                - cell "•Schaslik" [ref=e114]
                - cell "8,80 €" [ref=e115]
              - row "•Lende mit Zwiebel und Käse überbacken mit Pommes und Gurkensalat 8,80 €" [ref=e116]:
                - cell [ref=e117]
                - cell "•Lende mit Zwiebel und Käse überbacken mit Pommes und Gurkensalat" [ref=e118]
                - cell "8,80 €" [ref=e119]
              - row "Donnerstag •Schweinsbraten mit Knödl und Kartoffelsalat 8,80 €" [ref=e120]:
                - cell "Donnerstag" [ref=e121]
                - cell "•Schweinsbraten mit Knödl und Kartoffelsalat" [ref=e122]
                - cell "8,80 €" [ref=e123]
              - row "•Pfefferrahmschnitzel mit Nudeln und Gemüse 8,80 €" [ref=e124]:
                - cell [ref=e125]
                - cell "•Pfefferrahmschnitzel mit Nudeln und Gemüse" [ref=e126]
                - cell "8,80 €" [ref=e127]
              - row "•Hackschnitzel 3,45 €" [ref=e128]:
                - cell [ref=e129]
                - cell "•Hackschnitzel" [ref=e130]
                - cell "3,45 €" [ref=e131]
              - row "Freitag •Schnitzel mit Pommes oder Kartoffelsalat 8,80 €" [ref=e132]:
                - cell "Freitag" [ref=e133]
                - cell "•Schnitzel mit Pommes oder Kartoffelsalat" [ref=e134]
                - cell "8,80 €" [ref=e135]
              - row "•Fisch-Schlemmerfilet mit Petersilienkartoffeln 8,80 €" [ref=e136]:
                - cell [ref=e137]
                - cell "•Fisch-Schlemmerfilet mit Petersilienkartoffeln" [ref=e138]
                - cell "8,80 €" [ref=e139]
              - row "•Schnitzel mit Pommes oder Kartoffelsalat 8,80 €" [ref=e140]:
                - cell [ref=e141]
                - cell "•Schnitzel mit Pommes oder Kartoffelsalat" [ref=e142]
                - cell "8,80 €" [ref=e143]
          - generic [ref=e144]:
            - img [ref=e145]
            - generic [ref=e147]:
              - strong [ref=e148]: 0,50 € Öko-Rabatt
              - text: mit eigenem Behälter
            - generic [ref=e149]:
              - text: ☎️
              - link "08082 622 99 91" [ref=e150] [cursor=pointer]:
                - /url: tel:+4980826229991
            - generic [ref=e151]: Gerne auch vorbestellen!
      - generic [ref=e152]:
        - generic [ref=e153]:
          - text: Das aktuelle Mittagsmenü und unsere Sonderaktionen erfahrt ihr immer auch über die
          - strong [ref=e154]: Dorfladen Oberornau WhatsApp Gruppe
          - emphasis [ref=e155]: mit Onlineshop!!!
          - link "Hier klicken für Anmeldung" [ref=e156] [cursor=pointer]:
            - /url: https://wa.me/message/U7VY4HZCPBR4N1
          - text: oder scanne den nachstehenden QR-Code mit deinem Smartphone und bestätige mit deinem Namen im Chat.
        - generic [ref=e157]:
          - img "WhatsApp QR-Code Dorfladen Oberornau" [ref=e158]
          - generic [ref=e159]:
            - strong [ref=e160]: Dorfladen Oberornau
            - text: WhatsApp-Unternehmenskonto
      - generic [ref=e161]:
        - generic [ref=e162]:
          - heading "🌿 Unser Konzept" [level=3] [ref=e163]
          - paragraph [ref=e164]: Regionale Nahversorgung & gemütlicher Treffpunkt für Jung und Alt. Frühstück, Brotzeit, Mittagessen und hausgemachte Torten.
          - link "Mehr erfahren →" [ref=e165] [cursor=pointer]:
            - /url: /konzept
        - generic [ref=e166]:
          - heading "📦 Postfiliale" [level=3] [ref=e167]
          - paragraph [ref=e168]: Alle gängigen Postdienstleistungen direkt im Dorfladen. Briefe, Pakete, Einschreiben – ohne weite Wege.
          - link "Öffnungszeiten →" [ref=e169] [cursor=pointer]:
            - /url: /oeffnungszeiten
        - generic [ref=e170]:
          - heading "🍰 Catering & Lieferung" [level=3] [ref=e171]
          - paragraph [ref=e172]: Für Vereine und Familienfeiern liefern wir kalte und warme Speisen. Mittagessen auch per Nachbarschaftshilfe lieferbar.
          - link "Details →" [ref=e173] [cursor=pointer]:
            - /url: /essen-im-dorfladen
        - generic [ref=e174]:
          - heading "♻️ Nachhaltigkeit" [level=3] [ref=e175]
          - paragraph [ref=e176]: Regional & saisonal einkaufen. Gerne eigene Behälter mitbringen! Bio-Gemüse, Orangen direkt vom Erzeuger, Fleisch vom regionalen Metzger.
          - link "Sortiment →" [ref=e177] [cursor=pointer]:
            - /url: /sortiment
      - generic [ref=e178]:
        - generic [ref=e179]:
          - img [ref=e180]
          - text: Do geh i hi! – Darum Dorfladen
        - generic [ref=e182]:
          - generic [ref=e183]:
            - generic [ref=e184]:
              - generic [ref=e185]: 🛒
              - generic [ref=e186]: Die Nahversorgung bleibt erhalten – auch für die, die nicht (mehr) Auto fahren
            - generic [ref=e187]:
              - generic [ref=e188]: 🌍
              - generic [ref=e189]: Kurze Wege schonen die Umwelt und sparen Zeit und Geld
            - generic [ref=e190]:
              - generic [ref=e191]: 🍳
              - generic [ref=e192]: Täglich frisch zubereitetes Mittagessen und selbst gebackene Kuchen
            - generic [ref=e193]:
              - generic [ref=e194]: 🌾
              - generic [ref=e195]: Regionale Erzeuger und Anbieter werden gestärkt
            - generic [ref=e196]:
              - generic [ref=e197]: ☕
              - generic [ref=e198]: Gemütliche Sitzecke für Frühstück, Mittagessen, Brotzeit, Kaffee & Kuchen oder Eis
            - generic [ref=e199]:
              - generic [ref=e200]: 🛍️
              - generic [ref=e201]: Alles auch zum Mitnehmen
            - generic [ref=e202]:
              - generic [ref=e203]: ☀️
              - generic [ref=e204]: Bei gutem Wetter servieren wir draußen am Dorfplatz auf Tischen und Stühlen
            - generic [ref=e205]:
              - generic [ref=e206]: 🤝
              - generic [ref=e207]: Sozialer Mittelpunkt für alle – regelmäßige Kaffee-Treffs für Jung und Alt
            - generic [ref=e208]:
              - generic [ref=e209]: 🍰
              - generic [ref=e210]: Catering- und Back-Service für Vereine und privat
            - generic [ref=e211]:
              - generic [ref=e212]: 📦
              - generic [ref=e213]: Integrierte Postfiliale – Briefe, Pakete, Einschreiben ohne weite Wege
          - link "Mehr erfahren →" [ref=e215] [cursor=pointer]:
            - /url: /do-geh-i-hi
      - generic [ref=e216]:
        - generic [ref=e217]:
          - img [ref=e218]
          - text: Aktuelles
        - generic [ref=e221]: Aktuell gibt es keine Neuigkeiten.
    - complementary "Seitenleiste" [ref=e222]:
      - generic [ref=e223]:
        - generic [ref=e224]:
          - img [ref=e225]
          - text: Öffnungszeiten
        - generic [ref=e227]:
          - generic [ref=e228]:
            - generic [ref=e229]:
              - generic [ref=e230]: 🛒 Dorfladen
              - table [ref=e231]:
                - rowgroup [ref=e232]:
                  - row "Mo 06:30–14:00 & 16:30–19:00" [ref=e233]:
                    - cell "Mo" [ref=e234]
                    - cell "06:30–14:00 & 16:30–19:00" [ref=e235]
                  - row "Di 06:30–14:00" [ref=e236]:
                    - cell "Di" [ref=e237]
                    - cell "06:30–14:00" [ref=e238]
                  - row "Mi 06:30–14:00 & 16:30–19:00" [ref=e239]:
                    - cell "Mi" [ref=e240]
                    - cell "06:30–14:00 & 16:30–19:00" [ref=e241]
                  - row "Do 06:30–14:00 & 16:30–19:00" [ref=e242]:
                    - cell "Do" [ref=e243]
                    - cell "06:30–14:00 & 16:30–19:00" [ref=e244]
                  - row "Fr 06:30–14:00 & 16:30–19:00" [ref=e245]:
                    - cell "Fr" [ref=e246]
                    - cell "06:30–14:00 & 16:30–19:00" [ref=e247]
                  - row "Sa 07:00–13:00" [ref=e248]:
                    - cell "Sa" [ref=e249]
                    - cell "07:00–13:00" [ref=e250]
                  - row "So Geschlossen" [ref=e251]:
                    - cell "So" [ref=e252]
                    - cell "Geschlossen" [ref=e253]
            - generic [ref=e254]:
              - generic [ref=e255]: 📦 Postfiliale
              - table [ref=e256]:
                - rowgroup [ref=e257]:
                  - row "Mo 09:00–14:00 & 16:30–19:00" [ref=e258]:
                    - cell "Mo" [ref=e259]
                    - cell "09:00–14:00 & 16:30–19:00" [ref=e260]
                  - row "Di 09:00–14:00" [ref=e261]:
                    - cell "Di" [ref=e262]
                    - cell "09:00–14:00" [ref=e263]
                  - row "Mi 09:00–14:00 & 16:30–19:00" [ref=e264]:
                    - cell "Mi" [ref=e265]
                    - cell "09:00–14:00 & 16:30–19:00" [ref=e266]
                  - row "Do 09:00–14:00 & 16:30–19:00" [ref=e267]:
                    - cell "Do" [ref=e268]
                    - cell "09:00–14:00 & 16:30–19:00" [ref=e269]
                  - row "Fr 09:00–14:00 & 16:30–19:00" [ref=e270]:
                    - cell "Fr" [ref=e271]
                    - cell "09:00–14:00 & 16:30–19:00" [ref=e272]
                  - row "Sa 09:00–13:00" [ref=e273]:
                    - cell "Sa" [ref=e274]
                    - cell "09:00–13:00" [ref=e275]
                  - row "So Geschlossen" [ref=e276]:
                    - cell "So" [ref=e277]
                    - cell "Geschlossen" [ref=e278]
          - paragraph [ref=e279]: Außer an gesetzlichen Feiertagen
      - generic [ref=e280]:
        - generic [ref=e281]:
          - img [ref=e282]
          - text: Kontakt & Anfahrt
        - generic [ref=e284]:
          - strong [ref=e285]: Dorfladen Oberornau UG
          - text: Dorfplatz 1
          - text: 84419 Obertaufkirchen
          - strong [ref=e286]: "Tel:"
          - link "08082 / 622 99 91" [ref=e287] [cursor=pointer]:
            - /url: tel:+4980826229991
          - strong [ref=e288]: "E-Mail:"
          - link "info@dorfladen-oberornau.de" [ref=e289] [cursor=pointer]:
            - /url: mailto:info@dorfladen-oberornau.de
      - generic [ref=e290]:
        - generic [ref=e291]:
          - img [ref=e292]
          - text: Speiseplan per WhatsApp
        - generic [ref=e295]:
          - paragraph [ref=e296]: Wöchentlichen Speiseplan bequem aufs Handy erhalten
          - link "Jetzt anmelden" [ref=e297] [cursor=pointer]:
            - /url: https://wa.me/message/U7VY4HZCPBR4N1
  - contentinfo [ref=e298]:
    - generic [ref=e299]:
      - generic [ref=e300]:
        - heading "Dorfladen Oberornau" [level=4] [ref=e301]
        - paragraph [ref=e302]:
          - text: Dorfladen Oberornau UG
          - text: (haftungsbeschränkt)
          - text: Dorfplatz 1
          - text: 84419 Obertaufkirchen
          - text: "Tel:"
          - link "08082 / 622 99 91" [ref=e303] [cursor=pointer]:
            - /url: tel:+4980826229991
          - link "info@dorfladen-oberornau.de" [ref=e304] [cursor=pointer]:
            - /url: mailto:info@dorfladen-oberornau.de
      - generic [ref=e305]:
        - heading "Unser Angebot" [level=4] [ref=e306]
        - list [ref=e307]:
          - listitem [ref=e308]:
            - link "Konzept" [ref=e309] [cursor=pointer]:
              - /url: /konzept
          - listitem [ref=e310]:
            - link "Sortiment" [ref=e311] [cursor=pointer]:
              - /url: /sortiment
          - listitem [ref=e312]:
            - link "Essen im Dorfladen" [ref=e313] [cursor=pointer]:
              - /url: /essen-im-dorfladen
          - listitem [ref=e314]:
            - link "Öffnungszeiten" [ref=e315] [cursor=pointer]:
              - /url: /oeffnungszeiten
          - listitem [ref=e316]:
            - link "🔴 Roter Punkt" [ref=e317] [cursor=pointer]:
              - /url: /roter-punkt
      - generic [ref=e318]:
        - heading "Über uns" [level=4] [ref=e319]
        - list [ref=e320]:
          - listitem [ref=e321]:
            - link "Beirat" [ref=e322] [cursor=pointer]:
              - /url: /beirat
          - listitem [ref=e323]:
            - link "Geschäftsführung" [ref=e324] [cursor=pointer]:
              - /url: /geschaeftsfuehrung
          - listitem [ref=e325]:
            - link "Stille Gesellschafter" [ref=e326] [cursor=pointer]:
              - /url: /stille-gesellschafter
          - listitem [ref=e327]:
            - link "Do geh i hi" [ref=e328] [cursor=pointer]:
              - /url: /do-geh-i-hi
      - generic [ref=e329]:
        - heading "Rechtliches" [level=4] [ref=e330]
        - list [ref=e331]:
          - listitem [ref=e332]:
            - link "Impressum" [ref=e333] [cursor=pointer]:
              - /url: /impressum
          - listitem [ref=e334]:
            - link "Datenschutzerklärung" [ref=e335] [cursor=pointer]:
              - /url: /datenschutzerklaerung
    - generic [ref=e336]:
      - generic [ref=e337]: © 2026 Dorfladen Oberornau UG (haftungsbeschränkt). Alle Rechte vorbehalten.
      - generic [ref=e338]:
        - link "Impressum" [ref=e339] [cursor=pointer]:
          - /url: /impressum
        - text: ·
        - link "Datenschutz" [ref=e340] [cursor=pointer]:
          - /url: /datenschutzerklaerung
        - text: ·
        - link "CMS" [ref=e341] [cursor=pointer]:
          - /url: /cms
  - link "WhatsApp Chat öffnen" [ref=e342] [cursor=pointer]:
    - /url: https://wa.me/491714910935?text=Hallo%2C%20ich%20habe%20eine%20Frage%20zum%20Dorfladen%20%F0%9F%91%8B
    - generic [ref=e343]: Schreib uns!
    - img [ref=e345]
  - dialog "Cookie-Hinweis" [ref=e347]:
    - generic [ref=e348]:
      - paragraph [ref=e349]:
        - text: Diese Website verwendet ausschließlich technisch notwendige Cookies, um die einwandfreie Funktion zu gewährleisten. Weitere Informationen finden Sie in unserer
        - link "Datenschutzerklärung" [ref=e350] [cursor=pointer]:
          - /url: /datenschutzerklaerung
        - text: .
      - generic [ref=e351]:
        - button "Verstanden" [ref=e352] [cursor=pointer]
        - button "Ablehnen" [ref=e353] [cursor=pointer]
```

# Test source

```ts
  1  | // @ts-check
  2  | const { test, expect } = require('@playwright/test');
  3  | 
  4  | test.describe('Dorfladen Oberornau Frontend', () => {
  5  |   const base = 'https://kind-pebble-072605b03.7.azurestaticapps.net';
  6  | 
  7  |   test('Preisliste zeigt Daten', async ({ page }) => {
  8  |     await page.goto(`${base}/preisliste`);
  9  |     await expect(page.locator('#preisliste-live')).toContainText(['Artikel', 'Warengruppen']);
  10 |     await expect(page.locator('#preisliste-live')).not.toContainText('Fehler');
  11 |   });
  12 | 
  13 |   test('Roter Punkt zeigt Daten', async ({ page }) => {
  14 |     await page.goto(`${base}/roter-punkt`);
  15 |     await expect(page.locator('#roterpunkt-live')).toContainText(['Roter Punkt', 'Artikel', 'Warengruppen']);
  16 |     await expect(page.locator('#roterpunkt-live')).not.toContainText('Fehler');
  17 |   });
  18 | 
  19 |   test('Wochenplan zeigt Daten', async ({ page }) => {
  20 |     await page.goto(`${base}/`);
  21 |     await expect(page.locator('#wp-body')).not.toContainText(['konnte nicht geladen', 'Kein aktueller Wochenplan']);
> 22 |     await expect(page.locator('#wp-body')).toContainText(['Öko-Rabatt', 'Vorbestell']);
     |                                            ^ Error: expect(locator).toContainText(expected) failed
  23 |   });
  24 | });
  25 | 
```