/* Stabile Geraete-Kennung, eine pro Browser-Profil.
 *
 * Sie beantwortet eine einzige Frage: „Welcher Browser ist das?" Damit
 * findet die Startseite die Bestellung eines Gastes wieder, der **keine
 * E-Mail** angegeben hat - und der Server erkennt beim Push-Abo, dass ein
 * Geraet sich neu angemeldet hat, statt doppelt zuzustellen.
 *
 * Warum eine eigene Datei:
 * Die Kennung stand frueher in `pwa.js` - zusammen mit der Anmeldung des
 * Service Workers und der Installationslogik, rund 40 KB. Seiten, die nur
 * die Kennung brauchen, mussten das alles mitladen; die Bestellseite tat
 * es deshalb nicht und rief die Funktion ins Leere:
 *
 *     device_id: (window.dlPushDeviceId ? dlPushDeviceId() : '')
 *
 * Der Ausweichzweig griff **immer**, und jede Bestellung wurde ohne
 * Kennung gespeichert. Wer ohne E-Mail bestellte, sah seine Bestellung auf
 * der Startseite nie wieder - obwohl der Server genau fuer diesen Fall
 * gebaut ist. Der Fehler war nicht zu sehen: Es gab keine Meldung, die
 * Bestellung ging ja durch.
 *
 * Diese Datei ist klein genug, um wie `theme.js` im Kopf jeder Seite zu
 * stehen. Ein Waechter (tools/geraete_id_test.py) prueft, dass jede Seite,
 * die die Kennung benutzt, sie auch laedt.
 *
 * (Spec geraete-kennung, F1)
 */
function dlPushDeviceId(){
  try{
    var k='dl_push_device_id';
    var v=localStorage.getItem(k);
    if(!v){
      if(window.crypto&&crypto.randomUUID){ v=crypto.randomUUID(); }
      else { v='dev-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10); }
      localStorage.setItem(k,v);
    }
    return v;
  }catch(e){
    /* Privater Modus oder gesperrter Speicher: Dann gibt es keine
       Wiedererkennung. Die Bestellung selbst darf daran nicht scheitern,
       deshalb ein leerer Wert statt eines Absturzes. */
    return '';
  }
}
