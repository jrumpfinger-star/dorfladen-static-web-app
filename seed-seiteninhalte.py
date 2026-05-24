"""Seed initial page content into Dataverse via the production API."""
import requests, json, sys

API = "https://kind-pebble-072605b03.7.azurestaticapps.net/api/cms-config"

PAGES = {
    "gf_inhalt": '<h2>Geschäftsführung</h2><p>Der Dorfladen Oberornau UG ist eine Unternehmergesellschaft, die rechtlich mit einer kleinen GmbH vergleichbar ist. Jede Unternehmergesellschaft benötigt entsprechend Gesellschafter, die die Unternehmung in deren Namen gründen und als Geschäftsführer führen.</p><p>Aktuell fungieren folgende Personen als Gesellschafter und Geschäftsführer:</p><p><em>Gesellschafter:</em></p><ul><li>Dieter Mücke</li><li>Andrea Reithmeier</li><li>N.N.</li></ul><p><em>Geschäftsführer:</em></p><ul><li>Andreas Waltl</li></ul>',

    "beirat_inhalt": '<h2>Beirat</h2><p>Die Beiratsmitglieder sind die Vertreter der stillen Gesellschafter und sind auf 3 Jahre von der stillen Gesellschafterversammlung gewählt. Aktuell besteht der Beirat aus 8 Personen. Eine Wiederwahl ist auf unbestimmte Zeit möglich.</p><p>Am 23.07.2022 wurde ein neuer Beirat gewählt, der sich wie folgt zusammensetzt:</p><ul><li>Cornelia Byzio</li><li>Markus Eberl</li><li>Josef Gartner (seit 13.06.2023)</li><li>Christine Kastler</li><li>Andreas Maier</li><li>Dieter Mücke</li><li>Andrea Reithmeier</li><li>Christian Strasser</li></ul>',

    "konzept_inhalt": '<h2>Unser Konzept</h2><p>Das Hauptziel des Dorfladens ist die Verbesserung der Nahversorgung, mit einem Sortiment so regional und saisonal wie möglich. Die andere wesentliche Funktion ist die einer Begegnungsstätte. Unser Laden mit seiner gemütlichen Sitzecke ist ein zentraler Treffpunkt im Dorf für Jung und Alt, wo man sich bei hausgemachten Köstlichkeiten zusammen setzen kann.</p><p>Wir bieten verschiedene Frühstücke, Brotzeiten und als besonderes Highlight hausgemachte Kuchen und Torten sowie ein täglich frisch zubereitetes Mittagessen. Alles auch gerne zum Mitnehmen!</p><p>Für Vereine und Familienfeiern liefern wir gerne kalte und warme Speisen, Backwaren und hausgemachte Torten. Für Mitbürger mit Mobilitätseinschränkung kann unser Mittagessen über die Nachbarschaftshilfe Obertaufkirchen sogar nach Hause geliefert werden. Sprechen Sie uns an!</p>',

    "stille_gesellschafter_inhalt": '<h2>Stille Gesellschafter</h2><p>Der Dorfladen Oberornau wird getragen von einer starken Gemeinschaft stiller Gesellschafter aus dem Dorf und der Region. Durch ihre finanzielle Beteiligung ermöglichen sie den Betrieb unseres Dorfladens und sichern die Nahversorgung vor Ort.</p><p>Als stiller Gesellschafter leisten Sie einen wichtigen Beitrag zum Erhalt unseres Dorfladens. Sie beteiligen sich mit einer Einlage und unterstützen damit direkt die Nahversorgung in Oberornau.</p><h3>Vorteile einer stillen Beteiligung</h3><ul><li>Sicherung der Nahversorgung im eigenen Ort</li><li>Mitspracherecht bei der Gesellschafterversammlung</li><li>Aktive Mitgestaltung des Dorflebens</li><li>Wahl des Beirats als Ihre Vertretung</li></ul><h3>Interesse?</h3><p>Wenn Sie sich als stiller Gesellschafter beteiligen möchten, sprechen Sie uns gerne an:</p><p>Telefon: <a href="tel:+4980826229991">08082 / 622 99 91</a><br>E-Mail: <a href="mailto:info@dorfladen-oberornau.de">info@dorfladen-oberornau.de</a></p>',

    "essen_inhalt": '<h2>Essen im Dorfladen</h2><p>Unser Dorfladen bietet täglich frisch zubereitetes <strong>Mittagessen</strong> an. Dazu gibt es eine gemütliche Sitzecke, in der Sie Ihr Essen genießen können – oder Sie nehmen es einfach mit!</p><h3>Unser Angebot</h3><ul><li><strong>Frühstück</strong> – verschiedene Frühstücksvariationen</li><li><strong>Brotzeit</strong> – deftige bayerische Brotzeiten</li><li><strong>Mittagessen</strong> – täglich wechselndes Menü (Mo-Fr)</li><li><strong>Kuchen &amp; Torten</strong> – täglich hausgemacht</li><li><strong>Freitags: Schnitzeltag!</strong></li></ul><p>Beim Essen zum Mitnehmen gibt\u2019s <strong>0,50 \u20ac Öko-Rabatt</strong>, wenn ihr euren eigenen Behälter mitbringt!</p><p style="text-align:center;margin:24px 0"><span style="color:#c0392b;font-size:1.3em;font-weight:bold">Gerne auch vorbestellen</span><br><span style="font-size:1.15em">Tel: <a href="tel:+4980826229991" style="color:#c0392b;font-weight:bold;text-decoration:none">08082 622 99 91</a></span></p><h3>Catering &amp; Lieferung</h3><p>Für Vereine und Familienfeiern liefern wir gerne kalte und warme Speisen, Backwaren und hausgemachte Torten. Für Mitbürger mit Mobilitätseinschränkung kann unser Mittagessen über die <strong>Nachbarschaftshilfe Obertaufkirchen</strong> sogar nach Hause geliefert werden.</p><p>Telefon: <a href="tel:+4980826229991">08082 / 622 99 91</a></p>'
}

ok = 0
for key, html in PAGES.items():
    print(f"  Saving {key} ...", end=" ")
    try:
        r = requests.post(API, json={"name": key, "wert": html}, timeout=30)
        d = r.json()
        if d.get("success"):
            print("OK")
            ok += 1
        else:
            print(f"FAIL: {d.get('error','?')}")
    except Exception as e:
        print(f"ERROR: {e}")

print(f"\n{ok}/{len(PAGES)} erfolgreich gespeichert.")
