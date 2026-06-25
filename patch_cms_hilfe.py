#!/usr/bin/env python3
"""Ersetze den cms-panel-help Block in cms.html durch die neue, vollständige Version."""
import re, pathlib

cms_path = pathlib.Path(r"c:\Users\josef.rumpfinger\OneDrive - CGM\Dorfladen Test\dorfladen-static-web-app\static-site\cms.html")
content = cms_path.read_text(encoding='utf-8')

# Alten Block finden (von <!-- Hilfe-Bereich bis einschließlich schließendem </script>)
START = '  <!-- Hilfe-Bereich (Anwenderhandbücher & Context-Sensitiv) -->'
END = '  </script>'

start_idx = content.index(START)
# Das END kommt mehrfach vor – wir suchen das erste nach START
end_idx = content.index(END, start_idx) + len(END)

new_block = r"""  <!-- Hilfe-Bereich -->
  <div id="cms-panel-help" style="display:none">

    <!-- Kopfbereich -->
    <div style="background:#e8f5e9;border:1px solid #c8e6c9;border-radius:12px;padding:14px 16px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
      <div>
        <h3 style="margin:0 0 3px;font-size:15px;color:#1b5e20">&#128218; CMS-Handbuch &#8211; direkt lesbar</h3>
        <p style="margin:0;font-size:12px;color:#388e3c">Alle Themen, Schritt-f&#252;r-Schritt-Anleitungen und FAQ direkt hier &#8211; oder als PDF herunterladen.</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <a href="handbuch/anwenderhandbuch.pdf" target="_blank" class="cms-btn cms-btn-primary" style="background:#1b5e20;text-decoration:none;font-size:11px">&#128229; CMS-PDF</a>
        <a href="handbuch/homepage-anwenderhandbuch.pdf" target="_blank" class="cms-btn cms-btn-gray" style="text-decoration:none;font-size:11px">&#128229; Homepage-PDF</a>
        <a href="handbuch/hilfe.html" target="_blank" class="cms-btn cms-btn-gray" style="text-decoration:none;font-size:11px">&#127760; Online-Hilfe &#246;ffnen</a>
      </div>
    </div>

    <!-- Suchfeld -->
    <div style="margin-bottom:14px;position:relative">
      <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:15px;pointer-events:none">&#128269;</span>
      <input type="text" id="help-search-inp" placeholder="Hilfe durchsuchen&#8230; z.B. &#8222;Bild freistellen&#8220;, &#8222;Drucken&#8220;, &#8222;Push&#8220;" autocomplete="off"
        style="width:100%;padding:10px 36px 10px 38px;border:1px solid #e5e7eb;border-radius:10px;font-size:13px;font-family:inherit;background:#fff;outline:none;transition:border-color .15s;box-sizing:border-box"
        oninput="cmsHelpSearch(this.value)">
      <button id="help-search-clear" onclick="cmsHelpClearSearch()" title="L&#246;schen"
        style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#9ca3af;font-size:16px;display:none">&#10005;</button>
    </div>

    <!-- Suchergebnis-Container -->
    <div id="help-search-results" style="display:none;margin-bottom:12px"></div>

    <!-- Haupt-Layout -->
    <div id="help-main-layout" style="display:grid;grid-template-columns:200px 1fr;gap:14px;align-items:start">

      <!-- Sidebar -->
      <div class="cms-card" style="position:sticky;top:16px">
        <div class="cms-card-header" style="font-size:11px">&#128204; Themen</div>
        <div style="display:flex;flex-direction:column" id="help-tabs-container">
          <button class="cms-subtab active" onclick="cmsSwitchHelpTopic('wp-help')"     id="tab-wp-help"     style="text-align:left;border:none;border-bottom:1px solid #f3f4f6;padding:9px 12px;background:none;cursor:pointer;font-weight:600;font-size:12px;color:#1b5e20">&#127859; Wochenplan</button>
          <button class="cms-subtab"        onclick="cmsSwitchHelpTopic('hours-help')"  id="tab-hours-help"  style="text-align:left;border:none;border-bottom:1px solid #f3f4f6;padding:9px 12px;background:none;cursor:pointer;font-weight:600;font-size:12px;color:#4b5563">&#128336; &#214;ffnungszeiten</button>
          <button class="cms-subtab"        onclick="cmsSwitchHelpTopic('ang-help')"    id="tab-ang-help"    style="text-align:left;border:none;border-bottom:1px solid #f3f4f6;padding:9px 12px;background:none;cursor:pointer;font-weight:600;font-size:12px;color:#4b5563">&#127873; Sonderangebote</button>
          <button class="cms-subtab"        onclick="cmsSwitchHelpTopic('news-help')"   id="tab-news-help"   style="text-align:left;border:none;border-bottom:1px solid #f3f4f6;padding:9px 12px;background:none;cursor:pointer;font-weight:600;font-size:12px;color:#4b5563">&#128240; Aktuelles</button>
          <button class="cms-subtab"        onclick="cmsSwitchHelpTopic('hp-help')"     id="tab-hp-help"     style="text-align:left;border:none;border-bottom:1px solid #f3f4f6;padding:9px 12px;background:none;cursor:pointer;font-weight:600;font-size:12px;color:#4b5563">&#127968; Homepage</button>
          <button class="cms-subtab"        onclick="cmsSwitchHelpTopic('editor-help')" id="tab-editor-help" style="text-align:left;border:none;border-bottom:1px solid #f3f4f6;padding:9px 12px;background:none;cursor:pointer;font-weight:600;font-size:12px;color:#4b5563">&#127912; Kachel-Editor</button>
          <button class="cms-subtab"        onclick="cmsSwitchHelpTopic('design-help')" id="tab-design-help" style="text-align:left;border:none;border-bottom:1px solid #f3f4f6;padding:9px 12px;background:none;cursor:pointer;font-weight:600;font-size:12px;color:#4b5563">&#128396; Design</button>
          <button class="cms-subtab"        onclick="cmsSwitchHelpTopic('push-help')"   id="tab-push-help"   style="text-align:left;border:none;border-bottom:1px solid #f3f4f6;padding:9px 12px;background:none;cursor:pointer;font-weight:600;font-size:12px;color:#4b5563">&#128276; Push</button>
          <button class="cms-subtab"        onclick="cmsSwitchHelpTopic('sort-help')"   id="tab-sort-help"   style="text-align:left;border:none;border-bottom:1px solid #f3f4f6;padding:9px 12px;background:none;cursor:pointer;font-weight:600;font-size:12px;color:#4b5563">&#128230; Sortiment</button>
          <button class="cms-subtab"        onclick="cmsSwitchHelpTopic('gallery-help')" id="tab-gallery-help" style="text-align:left;border:none;border-bottom:1px solid #f3f4f6;padding:9px 12px;background:none;cursor:pointer;font-weight:600;font-size:12px;color:#4b5563">&#128444;&#65039; Impressionen</button>
          <button class="cms-subtab"        onclick="cmsSwitchHelpTopic('howto-help')"  id="tab-howto-help"  style="text-align:left;border:none;border-bottom:1px solid #f3f4f6;padding:9px 12px;background:none;cursor:pointer;font-weight:600;font-size:12px;color:#4b5563">&#128161; Probleml&#246;ser</button>
          <button class="cms-subtab"        onclick="cmsSwitchHelpTopic('faq-help')"    id="tab-faq-help"    style="text-align:left;border:none;padding:9px 12px;background:none;cursor:pointer;font-weight:600;font-size:12px;color:#4b5563">&#10067; FAQ</button>
        </div>
      </div>

      <!-- Inhaltsbereich -->
      <div id="help-content-area">

        <!-- WOCHENPLAN -->
        <div id="help-wp-help" class="cms-card help-content-section">
          <div class="cms-card-header">&#127859; Wochenplan (Mittagstisch)</div>
          <div class="cms-card-body" style="font-size:13px;line-height:1.65;color:#374151">
            <p style="margin:0 0 10px">Mit dem Wochenplan pflegen Sie den t&#228;glichen Mittagstisch. Alle &#196;nderungen sind sofort live auf der Website sichtbar.</p>
            <h4 style="margin:0 0 6px;color:#1b5e20">Schaltfl&#228;chen &amp; Funktionen</h4>
            <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:12px">
              <thead><tr style="background:#f1f5f9"><th style="padding:6px 10px;text-align:left;border:1px solid #e2e8f0">Button</th><th style="padding:6px 10px;text-align:left;border:1px solid #e2e8f0">Funktion</th></tr></thead>
              <tbody>
                <tr><td style="padding:6px 10px;border:1px solid #e2e8f0"><code>&larr; / &rarr;</code></td><td style="padding:6px 10px;border:1px solid #e2e8f0">Woche zur&uuml;ck / vor bl&#228;ttern</td></tr>
                <tr style="background:#f8fafc"><td style="padding:6px 10px;border:1px solid #e2e8f0"><code>Diese Woche / N&#228;chste Woche</code></td><td style="padding:6px 10px;border:1px solid #e2e8f0">Direktsprung zur aktuellen bzw. n&#228;chsten KW</td></tr>
                <tr><td style="padding:6px 10px;border:1px solid #e2e8f0"><code>+ Gericht</code></td><td style="padding:6px 10px;border:1px solid #e2e8f0">Neues Tagesgericht anlegen (Wochentag, Titel, Beschreibung, Preis)</td></tr>
                <tr style="background:#f8fafc"><td style="padding:6px 10px;border:1px solid #e2e8f0"><code>&#128190; Speichern</code></td><td style="padding:6px 10px;border:1px solid #e2e8f0">Alle &#196;nderungen dauerhaft in Dataverse sichern</td></tr>
                <tr><td style="padding:6px 10px;border:1px solid #e2e8f0"><code>&#8617; Verwerfen</code></td><td style="padding:6px 10px;border:1px solid #e2e8f0">Ungespeicherte Entw&#252;rfe verwerfen, letzten gespeicherten Stand laden</td></tr>
                <tr style="background:#f8fafc"><td style="padding:6px 10px;border:1px solid #e2e8f0"><code>&#128424;&#65039; Drucken</code></td><td style="padding:6px 10px;border:1px solid #e2e8f0">Druckfertiges A4-Plakat erzeugen</td></tr>
                <tr><td style="padding:6px 10px;border:1px solid #e2e8f0"><code>&#128242; Teilen</code></td><td style="padding:6px 10px;border:1px solid #e2e8f0">PNG herunterladen + WhatsApp-Link mit vorformuliertem Text</td></tr>
              </tbody>
            </table>
            <div style="background:#fff3e0;border-left:4px solid #ff9800;padding:10px 14px;border-radius:4px;font-size:12px">&#9888;&#65039; <strong>Wichtig:</strong> Zuerst <strong>Speichern</strong> klicken, bevor die Woche gewechselt wird &#8211; ungespeicherte Gerichte gehen sonst verloren.</div>
          </div>
        </div>

        <!-- OEFFNUNGSZEITEN -->
        <div id="help-hours-help" class="cms-card help-content-section" style="display:none">
          <div class="cms-card-header">&#128336; &#214;ffnungszeiten</div>
          <div class="cms-card-body" style="font-size:13px;line-height:1.65;color:#374151">
            <p style="margin:0 0 10px">Die hier gepflegten Zeiten steuern das Live-&#214;ffnungsstatus-Widget auf der Homepage (gr&#252;ner/roter Punkt mit Countdown).</p>
            <h4 style="margin:0 0 6px;color:#1b5e20">Zeitformat</h4>
            <ul style="margin:0 0 12px;padding-left:20px">
              <li>Einfaches Intervall: <code>07:30 - 18:00</code></li>
              <li>Mittagspause: <code>07:30 - 12:30; 14:00 - 18:00</code> (Semikolon als Trenner)</li>
              <li>Ruhetag: Feld leer lassen oder <code>geschlossen</code> eintragen</li>
            </ul>
            <h4 style="margin:0 0 6px;color:#1b5e20">Feiertage</h4>
            <p style="margin:0 0 10px">Das System erkennt alle bayerischen gesetzlichen Feiertage automatisch. An Feiertagen wird auf der Homepage automatisch <em>&#8222;Geschlossen &#8211; Feiertag&#8220;</em> angezeigt.</p>
          </div>
        </div>

        <!-- ANGEBOTE -->
        <div id="help-ang-help" class="cms-card help-content-section" style="display:none">
          <div class="cms-card-header">&#127873; Sonderangebote &amp; Aktionen</div>
          <div class="cms-card-body" style="font-size:13px;line-height:1.65;color:#374151">
            <p style="margin:0 0 10px">Erstellen Sie w&#246;chentliche Aktionen mit Artikeln, Preisen und Produktfotos. Das System berechnet Rabatte automatisch.</p>
            <h4 style="margin:0 0 6px;color:#1b5e20">Neue Aktion erstellen</h4>
            <ol style="margin:0 0 12px;padding-left:20px">
              <li>Klicken Sie auf <strong>+ Neue Aktion erstellen</strong>.</li>
              <li>Titel, Start- und Enddatum eingeben.</li>
              <li>Artikel &#252;ber <strong>+ Zeile</strong> hinzuf&#252;gen: Name, Aktionspreis, Statt-Preis.</li>
              <li>Optional Produktfoto hochladen (PNG/JPG/WebP, max. 5 MB).</li>
              <li><strong>&#128190; Speichern</strong> &#8211; sofort live auf der Homepage.</li>
            </ol>
            <h4 style="margin:0 0 6px;color:#1b5e20">Schaltfl&#228;chen</h4>
            <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:12px">
              <thead><tr style="background:#f1f5f9"><th style="padding:6px 10px;text-align:left;border:1px solid #e2e8f0">Button</th><th style="padding:6px 10px;text-align:left;border:1px solid #e2e8f0">Funktion</th></tr></thead>
              <tbody>
                <tr><td style="padding:6px 10px;border:1px solid #e2e8f0"><code>&#9999;&#65039; Bearbeiten</code></td><td style="padding:6px 10px;border:1px solid #e2e8f0">Bestehende Aktion &#246;ffnen und &#228;ndern</td></tr>
                <tr style="background:#f8fafc"><td style="padding:6px 10px;border:1px solid #e2e8f0"><code>&#128065; Vorschau</code></td><td style="padding:6px 10px;border:1px solid #e2e8f0">Fertig gestaltetes Plakat in neuem Tab anzeigen</td></tr>
                <tr><td style="padding:6px 10px;border:1px solid #e2e8f0"><code>&#128242; Teilen</code></td><td style="padding:6px 10px;border:1px solid #e2e8f0">Aktionsflyer als PNG herunterladen + WhatsApp-Link</td></tr>
                <tr style="background:#f8fafc"><td style="padding:6px 10px;border:1px solid #e2e8f0"><code>&#127912; Kachel bearbeiten</code></td><td style="padding:6px 10px;border:1px solid #e2e8f0">Kachel-Editor f&#252;r einzelne Produktkachel &#246;ffnen</td></tr>
                <tr><td style="padding:6px 10px;border:1px solid #e2e8f0"><code>&#128465; L&#246;schen</code></td><td style="padding:6px 10px;border:1px solid #e2e8f0">Aktion dauerhaft entfernen (Best&#228;tigung erforderlich)</td></tr>
              </tbody>
            </table>
            <div style="background:#e8f5e9;border-left:4px solid #4ade80;padding:10px 14px;border-radius:4px;font-size:12px">&#128161; <strong>Tipp:</strong> Zuk&#252;nftiges Startdatum setzen, um Aktionen vorzubereiten &#8211; sie erscheinen erst ab dem eingetragenen Datum.</div>
          </div>
        </div>

        <!-- NEWS -->
        <div id="help-news-help" class="cms-card help-content-section" style="display:none">
          <div class="cms-card-header">&#128240; Aktuelles (News-Beitr&#228;ge)</div>
          <div class="cms-card-body" style="font-size:13px;line-height:1.65;color:#374151">
            <p style="margin:0 0 10px">Ver&#246;ffentlichen Sie Neuigkeiten, die auf der Startseite als Karten und im Laufband-Ticker erscheinen.</p>
            <h4 style="margin:0 0 6px;color:#1b5e20">Neuen Beitrag anlegen</h4>
            <ol style="margin:0 0 12px;padding-left:20px">
              <li>Klicken Sie auf <strong>+ Neuer Beitrag</strong>.</li>
              <li>Titel, Inhalt (Rich-Text-Editor) und optionales Bild eingeben.</li>
              <li>Status auf <strong>Aktiv</strong> setzen &#8594; sofort auf der Homepage sichtbar.</li>
              <li><strong>&#128190; Speichern</strong>.</li>
            </ol>
            <div style="background:#fff3e0;border-left:4px solid #ff9800;padding:10px 14px;border-radius:4px;font-size:12px">&#9888;&#65039; Gel&#246;schte Beitr&#228;ge k&#246;nnen nicht wiederhergestellt werden. Nutzen Sie stattdessen <strong>Status &#8594; Entwurf</strong>, um einen Beitrag tempor&#228;r auszublenden.</div>
          </div>
        </div>

        <!-- HOMEPAGE -->
        <div id="help-hp-help" class="cms-card help-content-section" style="display:none">
          <div class="cms-card-header">&#127968; Homepage-Texte &amp; Logo</div>
          <div class="cms-card-body" style="font-size:13px;line-height:1.65;color:#374151">
            <p style="margin:0 0 10px">Bearbeiten Sie den statischen Inhalt der Startseite: Begr&#252;&#223;ungstext, Untertitel, Tagline sowie das Laden-Logo.</p>
            <h4 style="margin:0 0 6px;color:#1b5e20">Logo hochladen</h4>
            <ol style="margin:0 0 12px;padding-left:20px">
              <li>Klicken Sie auf <strong>Logo ausw&#228;hlen / &#228;ndern</strong>.</li>
              <li>PNG mit transparentem Hintergrund empfohlen, max. 10 MB.</li>
              <li>Das Logo erscheint in Header, Flyern und Plakaten.</li>
              <li><strong>&#128190; Speichern</strong> nicht vergessen.</li>
            </ol>
          </div>
        </div>

        <!-- KACHEL-EDITOR -->
        <div id="help-editor-help" class="cms-card help-content-section" style="display:none">
          <div class="cms-card-header">&#127912; Kachel- &amp; Flyer-Editor</div>
          <div class="cms-card-body" style="font-size:13px;line-height:1.65;color:#374151">
            <p style="margin:0 0 10px">Der Kachel-Editor erm&#246;glicht pixelgenaues Gestalten von Produktkacheln und Werbeplyakaten.</p>
            <h4 style="margin:0 0 6px;color:#1b5e20">Grundprinzip</h4>
            <ul style="margin:0 0 12px;padding-left:20px">
              <li><strong>Element anklicken:</strong> Klick auf Bild, Preis oder Text aktiviert es (gestrichelter Rahmen). Das Element liegt ganz oben.</li>
              <li><strong>Verschieben:</strong> Drag &amp; Drop oder D-Pad (Pfeilkreuz).</li>
              <li><strong>Gr&#246;&#223;e:</strong> Schieberegler <code>Gr&#246;&#223;e</code> skaliert das aktive Element.</li>
              <li><strong>Rotation:</strong> Regler <code>&#128260; Drehung</code> dreht &#8722;180&#176; bis +180&#176;. <code>&#11008; 0&#176;</code> setzt zur&#252;ck.</li>
              <li><strong>Deckkraft:</strong> Regler <code>Opacity</code> f&#252;r Transparenz (0&#8211;100%).</li>
            </ul>
            <h4 style="margin:0 0 6px;color:#1b5e20">Schaltfl&#228;chen</h4>
            <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:12px">
              <thead><tr style="background:#f1f5f9"><th style="padding:6px 10px;text-align:left;border:1px solid #e2e8f0">Button</th><th style="padding:6px 10px;text-align:left;border:1px solid #e2e8f0">Funktion</th></tr></thead>
              <tbody>
                <tr><td style="padding:6px 10px;border:1px solid #e2e8f0"><code>&#128190; Speichern</code></td><td style="padding:6px 10px;border:1px solid #e2e8f0">Layout dauerhaft sichern</td></tr>
                <tr style="background:#f8fafc"><td style="padding:6px 10px;border:1px solid #e2e8f0"><code>&#8617; Verwerfen</code></td><td style="padding:6px 10px;border:1px solid #e2e8f0">Editor schlie&#223;en, alle &#196;nderungen verwerfen</td></tr>
                <tr><td style="padding:6px 10px;border:1px solid #e2e8f0"><code>&#128123; Ghost AN/AUS</code></td><td style="padding:6px 10px;border:1px solid #e2e8f0">Geister-Schattenkopie des Hauptbildes erzeugen/entfernen</td></tr>
                <tr style="background:#f8fafc"><td style="padding:6px 10px;border:1px solid #e2e8f0"><code>+ &#128221; Duplikat</code></td><td style="padding:6px 10px;border:1px solid #e2e8f0">Kopie des aktiven Elements erstellen</td></tr>
                <tr><td style="padding:6px 10px;border:1px solid #e2e8f0"><code>&#128444;&#65039; Bild hochladen</code></td><td style="padding:6px 10px;border:1px solid #e2e8f0">Neues Produktfoto f&#252;r diese Kachel hochladen</td></tr>
                <tr style="background:#f8fafc"><td style="padding:6px 10px;border:1px solid #e2e8f0"><code>&#8943; Overlay hochladen</code></td><td style="padding:6px 10px;border:1px solid #e2e8f0">Zus&#228;tzliches Bild (Siegel, Logo) als Overlay einf&#252;gen</td></tr>
                <tr><td style="padding:6px 10px;border:1px solid #e2e8f0"><code>&#128424;&#65039; Drucken / PNG</code></td><td style="padding:6px 10px;border:1px solid #e2e8f0">Druckdialog &#246;ffnen oder PNG-Export herunterladen</td></tr>
              </tbody>
            </table>
            <div style="background:#fff3e0;border-left:4px solid #ff9800;padding:10px 14px;border-radius:4px;font-size:12px">&#9888;&#65039; Der rote Banner <code>&#9888;&#65039; UNGESPEICHERT</code> bedeutet: &#196;nderungen noch nicht gesichert. Vor dem Schlie&#223;en <strong>Speichern</strong> oder <strong>Verwerfen</strong> klicken.</div>
          </div>
        </div>

        <!-- DESIGN -->
        <div id="help-design-help" class="cms-card help-content-section" style="display:none">
          <div class="cms-card-header">&#128396; Design-Editor (Farben &amp; Templates)</div>
          <div class="cms-card-body" style="font-size:13px;line-height:1.65;color:#374151">
            <p style="margin:0 0 10px">Im Design-Tab passen Sie Farben, Schriften und Templates f&#252;r Plakate, Flyer und die Homepage an.</p>
            <h4 style="margin:0 0 6px;color:#1b5e20">Unterreiter</h4>
            <ul style="margin:0 0 12px;padding-left:20px">
              <li><strong>Homepage:</strong> Hintergrundfarbe, Akzentfarben, Hero-Gradient der Startseite.</li>
              <li><strong>Plakate &amp; Flyer:</strong> Template-Auswahl, Hintergrundfarbe, Schriftfarben, Bildfreistellung.</li>
              <li><strong>Angebote:</strong> Farben f&#252;r Preisbadges, Kachel-Hintergrund, Rabatt-Badge.</li>
            </ul>
            <h4 style="margin:0 0 6px;color:#1b5e20">Schaltfl&#228;chen</h4>
            <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:10px">
              <thead><tr style="background:#f1f5f9"><th style="padding:6px 10px;text-align:left;border:1px solid #e2e8f0">Button</th><th style="padding:6px 10px;text-align:left;border:1px solid #e2e8f0">Funktion</th></tr></thead>
              <tbody>
                <tr><td style="padding:6px 10px;border:1px solid #e2e8f0"><code>&#128190; Alles speichern</code></td><td style="padding:6px 10px;border:1px solid #e2e8f0">Alle Design&#228;nderungen dauerhaft speichern</td></tr>
                <tr style="background:#f8fafc"><td style="padding:6px 10px;border:1px solid #e2e8f0"><code>&#8630; Auf Default zur&#252;cksetzen</code></td><td style="padding:6px 10px;border:1px solid #e2e8f0">Zu gespeichertem Standard-Design zur&#252;ckspringen</td></tr>
                <tr><td style="padding:6px 10px;border:1px solid #e2e8f0"><code>&#9733; Als Standard speichern</code></td><td style="padding:6px 10px;border:1px solid #e2e8f0">Aktuelles Design als pers&#246;nlichen Standard hinterlegen</td></tr>
                <tr style="background:#f8fafc"><td style="padding:6px 10px;border:1px solid #e2e8f0"><code>&#10005; Werkseinstellungen</code></td><td style="padding:6px 10px;border:1px solid #e2e8f0">Pers&#246;nlichen Standard l&#246;schen, Original-Werksvorgaben laden</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- PUSH -->
        <div id="help-push-help" class="cms-card help-content-section" style="display:none">
          <div class="cms-card-header">&#128276; Push-Benachrichtigungen</div>
          <div class="cms-card-body" style="font-size:13px;line-height:1.65;color:#374151">
            <p style="margin:0 0 10px">Senden Sie Direktnachrichten an alle registrierten Smartphone- und Desktop-Abonnenten.</p>
            <div style="background:#f3e8ff;border-left:4px solid #9333ea;padding:10px 14px;border-radius:4px;font-size:12px;margin-bottom:12px">&#8505;&#65039; <strong>Testphase:</strong> Push befindet sich noch in der optionalen Testphase.</div>
            <h4 style="margin:0 0 6px;color:#1b5e20">Nachricht senden</h4>
            <ol style="margin:0 0 12px;padding-left:20px">
              <li>Tab <strong>Push</strong> &#246;ffnen.</li>
              <li>Schnellvorlage w&#228;hlen oder eigenen Text schreiben.</li>
              <li><strong>&#128232; Senden</strong> &#8211; alle aktiven Abonnenten erhalten die Benachrichtigung sofort.</li>
            </ol>
            <h4 style="margin:0 0 6px;color:#1b5e20">Abonnenten verwalten</h4>
            <p style="margin:0 0 10px">Unterreiter <strong>Subscriber</strong> &#8594; <strong>Aktualisieren</strong>: Zeigt alle aktiven Ger&#228;te-IDs. Einzelne Abonnenten k&#246;nnen &#252;ber <code>&#128465;</code> entfernt werden.</p>
            <div style="background:#e8f5e9;border-left:4px solid #4ade80;padding:10px 14px;border-radius:4px;font-size:12px">&#128161; Max. 1&#8211;2 Nachrichten pro Woche senden &#8211; sonst drohen Abmeldungen.</div>
          </div>
        </div>

        <!-- SORTIMENT -->
        <div id="help-sort-help" class="cms-card help-content-section" style="display:none">
          <div class="cms-card-header">&#128230; Sortiment &amp; Preisliste</div>
          <div class="cms-card-body" style="font-size:13px;line-height:1.65;color:#374151">
            <p style="margin:0 0 10px">Pflegen Sie das gesamte Warenangebot des Ladens, gegliedert in Warengruppen. Kunden k&#246;nnen die Preisliste auf der Website durchsuchen.</p>
            <h4 style="margin:0 0 6px;color:#1b5e20">Produkt hinzuf&#252;gen</h4>
            <ol style="margin:0 0 12px;padding-left:20px">
              <li>Warengruppe w&#228;hlen oder neue anlegen.</li>
              <li><strong>+ Zeile hinzuf&#252;gen</strong> klicken.</li>
              <li>Produktname, Menge/Einheit, Preis und optional UVP eintragen.</li>
              <li><strong>&#128190; Speichern</strong>.</li>
            </ol>
          </div>
        </div>

        <!-- GALERIE -->
        <div id="help-gallery-help" class="cms-card help-content-section" style="display:none">
          <div class="cms-card-header">&#128444;&#65039; Impressionen (Foto-Galerie)</div>
          <div class="cms-card-body" style="font-size:13px;line-height:1.65;color:#374151">
            <p style="margin:0 0 10px">Verwalten Sie die &#246;ffentliche Foto-Galerie des Ladens. Besucher sehen sie unter dem Men&#252;punkt <em>Impressionen</em>.</p>
            <h4 style="margin:0 0 6px;color:#1b5e20">Foto hochladen</h4>
            <ol style="margin:0 0 12px;padding-left:20px">
              <li>Tab <strong>Impressionen</strong> &#246;ffnen &#8594; <strong>+ Bilder hochladen</strong>.</li>
              <li>JPG/PNG/WebP ausw&#228;hlen (max. 5 MB pro Bild).</li>
              <li>Optional <strong>Kategorie</strong> vergeben (z.B. <code>Team</code>, <code>Laden</code>, <code>Produkte</code>).</li>
              <li>Bilder erscheinen sofort in der &#246;ffentlichen Galerie.</li>
            </ol>
            <div style="background:#e8f5e9;border-left:4px solid #4ade80;padding:10px 14px;border-radius:4px;font-size:12px">&#128161; Filter-Tabs erscheinen auf der Website erst ab mindestens <strong>zwei verschiedenen Kategorien</strong>.</div>
          </div>
        </div>

        <!-- PROBLEMLOSER -->
        <div id="help-howto-help" class="cms-card help-content-section" style="display:none">
          <div class="cms-card-header">&#128161; Probleml&#246;ser &#8211; Schritt-f&#252;r-Schritt</div>
          <div class="cms-card-body" style="font-size:13px;line-height:1.65;color:#374151">

            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:10px">
              <strong style="color:#b91c1c">&#128204; Produktbild hat wei&#223;en Hintergrund</strong>
              <ol style="margin:6px 0 0;padding-left:20px;font-size:12px">
                <li>Tab <strong>Design</strong> &#8594; <strong>Plakate &amp; Flyer</strong> &#8594; <strong>&#9881;&#65039; Gemeinsame Einstellungen</strong>.</li>
                <li>Kontrollk&#228;stchen <strong>&#8222;Bilder freistellen&#8220;</strong> aktivieren &#8594; wei&#223;er Hintergrund wird entfernt.</li>
              </ol>
            </div>

            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:10px">
              <strong style="color:#b91c1c">&#128204; Wochenplan-Eingaben r&#252;ckg&#228;ngig machen</strong>
              <ol style="margin:6px 0 0;padding-left:20px;font-size:12px">
                <li>Nicht auf <strong>Speichern</strong> klicken.</li>
                <li>Schaltfl&#228;che <strong>&#8222;&#8617; Verwerfen&#8220;</strong> klicken &#8594; letzter gespeicherter Stand wird wiederhergestellt.</li>
              </ol>
            </div>

            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:10px">
              <strong style="color:#b91c1c">&#128204; Artikelfoto &#252;berlagert Preis auf Kachel</strong>
              <ol style="margin:6px 0 0;padding-left:20px;font-size:12px">
                <li>Kachel-Editor &#246;ffnen &#8594; auf das &#252;berlagernde Bild klicken (gestrichelter Rahmen).</li>
                <li>Per D-Pad verschieben oder Gr&#246;&#223;enregler verkleinern.</li>
              </ol>
            </div>

            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:10px">
              <strong style="color:#b91c1c">&#128204; Siegel schr&#228;g auf Produktbild legen</strong>
              <ol style="margin:6px 0 0;padding-left:20px;font-size:12px">
                <li>Kachel-Editor &#8594; Rechtsklick &#8594; <strong>&#8222;Overlay-Bild hochladen&#8220;</strong>.</li>
                <li>Drehung-Slider auf z.B. <code>&#8722;15&#176;</code> ziehen.</li>
                <li>Per D-Pad an gew&#252;nschte Position schieben.</li>
              </ol>
            </div>

            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:10px">
              <strong style="color:#b91c1c">&#128204; Plastischen Bildschatten (Ghost) erzeugen</strong>
              <ol style="margin:6px 0 0;padding-left:20px;font-size:12px">
                <li>Kachel-Editor &#8594; <strong>&#128123; Ghost: AUS</strong> klicken (wechselt auf AN).</li>
                <li>Geist anklicken &#8594; Gr&#246;&#223;enregler vergr&#246;&#223;ern &#8594; Opacity auf ca. <code>30%</code> senken.</li>
              </ol>
            </div>

            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:10px">
              <strong style="color:#b91c1c">&#128204; iPhone erh&#228;lt keine Push-Nachrichten</strong>
              <ol style="margin:6px 0 0;padding-left:20px;font-size:12px">
                <li>iOS ben&#246;tigt PWA-Installation: Safari &#8594; Teilen &#128228; &#8594; <strong>&#8222;Zum Home-Bildschirm&#8220;</strong>.</li>
                <li>App vom Startbildschirm &#246;ffnen &#8594; Men&#252; &#8594; <strong>&#8222;Benachrichtigungen aktivieren&#8220;</strong> &#8594; Erlauben.</li>
              </ol>
            </div>

            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:10px">
              <strong style="color:#b91c1c">&#128204; Angebot auf Homepage nicht sichtbar</strong>
              <ol style="margin:6px 0 0;padding-left:20px;font-size:12px">
                <li>Startdatum der Aktion pr&#252;fen &#8211; zuk&#252;nftige Aktionen sind ausgeblendet.</li>
                <li>Enddatum pr&#252;fen &#8211; abgelaufene Aktionen verschwinden automatisch.</li>
                <li>Hard-Refresh: <kbd>Strg</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd>.</li>
              </ol>
            </div>

            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;">
              <strong style="color:#b91c1c">&#128204; Design-Farben versehentlich ge&#228;ndert &#8211; Reset</strong>
              <ol style="margin:6px 0 0;padding-left:20px;font-size:12px">
                <li>Tab <strong>Design</strong> &#8594; <strong>&#8222;&#10005; Werkseinstellungen&#8220;</strong> klicken &#8594; best&#228;tigen.</li>
                <li><strong>&#8222;&#128190; Alles speichern&#8220;</strong> klicken um Reset dauerhaft zu &#252;bernehmen.</li>
              </ol>
            </div>

          </div>
        </div>

        <!-- FAQ -->
        <div id="help-faq-help" class="cms-card help-content-section" style="display:none">
          <div class="cms-card-header">&#10067; H&#228;ufige Fragen (FAQ)</div>
          <div class="cms-card-body" style="font-size:13px;line-height:1.65;color:#374151">

            <details style="border-bottom:1px solid #f3f4f6;padding:10px 0"><summary style="cursor:pointer;font-weight:600;color:#1b5e20">Warum wird mein Bild unscharf dargestellt?</summary>
              <p style="margin:8px 0 0;font-size:12px">Das CMS komprimiert Bilder auf 500&#215;500 px. F&#252;r A4-Druck Originalbilder mit mind. 800&#215;800 px verwenden.</p>
            </details>

            <details style="border-bottom:1px solid #f3f4f6;padding:10px 0"><summary style="cursor:pointer;font-weight:600;color:#1b5e20">Der Rotations-Slider springt auf 0&#176; zur&#252;ck</summary>
              <p style="margin:8px 0 0;font-size:12px">Der Slider wirkt auf das <em>selektierte</em> Element. Zuerst das gew&#252;nschte Element anklicken (gestrichelter Rahmen), dann den Slider bewegen.</p>
            </details>

            <details style="border-bottom:1px solid #f3f4f6;padding:10px 0"><summary style="cursor:pointer;font-weight:600;color:#1b5e20">CMS zeigt &#8222;Verbindungsfehler&#8220;</summary>
              <p style="margin:8px 0 0;font-size:12px">Internetverbindung pr&#252;fen, Seite mit F5 neu laden. Passwort auf Gro&#223;-/Kleinschreibung pr&#252;fen.</p>
            </details>

            <details style="border-bottom:1px solid #f3f4f6;padding:10px 0"><summary style="cursor:pointer;font-weight:600;color:#1b5e20">Kann ich CMS auf mehreren Ger&#228;ten gleichzeitig nutzen?</summary>
              <p style="margin:8px 0 0;font-size:12px">Ja &#8211; aber bei gleichzeitiger Bearbeitung gewinnt die zuletzt gespeicherte Version. Bitte Bearbeitung im Team koordinieren.</p>
            </details>

            <details style="border-bottom:1px solid #f3f4f6;padding:10px 0"><summary style="cursor:pointer;font-weight:600;color:#1b5e20">Was bedeutet &#8222;Als Standard speichern&#8220; vs. &#8222;Werkseinstellungen&#8220;?</summary>
              <p style="margin:8px 0 0;font-size:12px"><strong>&#9733; Als Standard speichern</strong> hinterlegt Ihre aktuellen Einstellungen. <strong>&#10005; Werkseinstellungen</strong> l&#246;scht diesen Standard und kehrt zu Original-Werksvorgaben zur&#252;ck.</p>
            </details>

            <details style="border-bottom:1px solid #f3f4f6;padding:10px 0"><summary style="cursor:pointer;font-weight:600;color:#1b5e20">Wochenplan-Plakat wird beim Drucken abgeschnitten</summary>
              <p style="margin:8px 0 0;font-size:12px">Im Druckdialog: Papierformat A4, Seitenr&#228;nder Keine/Minimal, Option <strong>&#8222;Hintergrundgrafiken drucken&#8220;</strong> aktivieren.</p>
            </details>

            <details style="border-bottom:1px solid #f3f4f6;padding:10px 0"><summary style="cursor:pointer;font-weight:600;color:#1b5e20">Das CMS l&#228;dt sehr langsam</summary>
              <p style="margin:8px 0 0;font-size:12px">Mind. 5 Mbit/s empfohlen. Browser-Cache leeren. Aktuellen Chrome/Edge/Firefox verwenden. Bilder vor Upload komprimieren.</p>
            </details>

            <details style="padding:10px 0"><summary style="cursor:pointer;font-weight:600;color:#1b5e20">Wie finde ich die Anzahl aktiver Push-Abonnenten?</summary>
              <p style="margin:8px 0 0;font-size:12px">Tab <strong>Push</strong> &#8594; Unterreiter <strong>Subscriber</strong> &#8594; <strong>Aktualisieren</strong>. Die Gesamtzahl wird oben angezeigt.</p>
            </details>

          </div>
        </div>

      </div><!-- end #help-content-area -->
    </div><!-- end grid -->
  </div><!-- end cms-panel-help -->

  <script>
  function cmsSwitchHelpTopic(topicId) {
    document.querySelectorAll('.help-content-section').forEach(function(d){ d.style.display='none'; });
    var t = document.getElementById('help-'+topicId);
    if (t) t.style.display='';
    var c = document.getElementById('help-tabs-container');
    if (c) c.querySelectorAll('.cms-subtab').forEach(function(b){ b.style.color='#4b5563'; b.classList.remove('active'); });
    var a = document.getElementById('tab-'+topicId);
    if (a) { a.style.color='#1b5e20'; a.classList.add('active'); }
  }

  var HELP_IDX = [
    {id:'wp-help',      kw:'wochenplan mittagstisch gericht speisen essen drucken teilen verwerfen speichern'},
    {id:'hours-help',   kw:'öffnungszeiten zeiten offen geschlossen feiertag pause semikolon ruhetag'},
    {id:'ang-help',     kw:'angebote aktion sonderangebot rabatt preis kachel plakat teilen vorschau löschen'},
    {id:'news-help',    kw:'aktuelles news beitrag neuigkeit ticker laufband entwurf status löschen'},
    {id:'hp-help',      kw:'homepage logo texte begrüßung speichern hochladen'},
    {id:'editor-help',  kw:'kachel editor drag drop rotation drehung ghost geist deckkraft opacity dpad verschieben bild overlay duplikat'},
    {id:'design-help',  kw:'design farben template flyer plakat farbe standard werkseinstellungen speichern'},
    {id:'push-help',    kw:'push benachrichtigung abonnent subscriber senden vorlage mittagstisch angebote'},
    {id:'sort-help',    kw:'sortiment preisliste warengruppe produkt artikel zeile eintrag'},
    {id:'gallery-help', kw:'galerie impressionen foto bild lightbox kategorie filter hochladen'},
    {id:'howto-help',   kw:'problemlöser freistellen weißer hintergrund verwerfen undo kachel überlager siegel ghost push iphone angebot farbe reset'},
    {id:'faq-help',     kw:'faq fragen verbindungsfehler unscharf bild rotation drucken langsam abonnent standard werkseinstellungen'},
  ];

  function cmsHelpSearch(q) {
    var clrBtn = document.getElementById('help-search-clear');
    if (clrBtn) clrBtn.style.display = q.trim() ? 'block' : 'none';
    var res = document.getElementById('help-search-results');
    var layout = document.getElementById('help-main-layout');
    if (!q.trim()) {
      res.style.display = 'none';
      layout.style.display = '';
      return;
    }
    layout.style.display = 'none';
    var tokens = q.toLowerCase().split(/\s+/).filter(function(t){ return t.length > 1; });
    var hits = HELP_IDX.filter(function(item){
      var hay = item.kw;
      return tokens.every(function(t){ return hay.indexOf(t) >= 0; });
    });
    if (!hits.length) {
      res.innerHTML = '<div style="text-align:center;padding:32px;color:#6b7280;font-size:13px">&#128270; Keine Treffer f&#252;r &#8222;'+q.replace(/</g,'&lt;')+'&#8220; &#8211; anderes Stichwort versuchen.</div>';
    } else {
      var labels = {'wp-help':'Wochenplan','hours-help':'&#214;ffnungszeiten','ang-help':'Sonderangebote','news-help':'Aktuelles','hp-help':'Homepage','editor-help':'Kachel-Editor','design-help':'Design','push-help':'Push','sort-help':'Sortiment','gallery-help':'Impressionen','howto-help':'Probleml&#246;ser','faq-help':'FAQ'};
      res.innerHTML = hits.map(function(h){
        return '<div onclick="cmsHelpSearchOpen(\''+h.id+'\')" style="background:#fff;border:1px solid #e5e7eb;border-left:4px solid #1b5e20;border-radius:8px;padding:10px 14px;margin-bottom:8px;cursor:pointer;transition:box-shadow .15s" onmouseover="this.style.boxShadow=\'0 2px 8px rgba(0,0,0,.1)\'" onmouseout="this.style.boxShadow=\'\'"><span style="background:#e8f5e9;color:#1b5e20;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px">'+(labels[h.id]||h.id)+'</span><div style="font-weight:600;font-size:13px;margin-top:5px">'+h.kw.split(' ').slice(0,6).join(' &middot; ')+'</div></div>';
      }).join('');
    }
    res.style.display = 'block';
  }

  function cmsHelpSearchOpen(topicId) {
    cmsHelpClearSearch();
    cmsSwitchHelpTopic(topicId);
  }

  function cmsHelpClearSearch() {
    var inp = document.getElementById('help-search-inp');
    if (inp) inp.value = '';
    var clrBtn = document.getElementById('help-search-clear');
    if (clrBtn) clrBtn.style.display = 'none';
    var res = document.getElementById('help-search-results');
    if (res) { res.innerHTML=''; res.style.display='none'; }
    var layout = document.getElementById('help-main-layout');
    if (layout) layout.style.display = '';
  }
  </script>"""

result = content[:start_idx] + new_block + content[end_idx:]
cms_path.write_text(result, encoding='utf-8')
print(f"OK - cms.html patched. New length: {len(result)} chars")
