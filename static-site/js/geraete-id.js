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

/* Anmeldezeichen des Kundenkontos, falls angemeldet.
 * Dasselbe Konto wie im Shop; die Anmeldung haelt 90 Tage. */
function dlShopZeichen(){
  try{ return (localStorage.getItem('dl_shop_token')||'').trim(); }
  catch(e){ return ''; }
}

/* Die Kennung nur LESEN, nicht anlegen.
 *
 * Der Unterschied zu dlPushDeviceId() ist beabsichtigt und wichtig: Jene
 * legt eine Kennung an, wenn keine da ist - richtig beim Bestellen, falsch
 * beim blossen Blaettern. Die Startseite fragt bei JEDEM Besuch nach
 * eigenen Bestellungen; mit dlPushDeviceId() bekaeme jeder Besucher
 * ungefragt eine Kennung verpasst, auch wer nie bestellt.
 *
 * Verloren geht dadurch nichts: Wer keine Kennung hat, hat auch keine
 * Bestellung, die daran haengt. (Spec geraete-kennung, TC-GK-11)
 */
function dlGeraeteKennungLesen(){
  try{ return (localStorage.getItem('dl_push_device_id')||'').trim(); }
  catch(e){ return ''; }
}

/* Die eigenen Mittagessen-Bestellungen holen — von JEDEM Geraet.
 *
 * Warum das hier steht und nicht zweimal in den Seiten: Startseite und
 * Tagesinfo stellten dieselbe Abfrage in zwei Abschriften. Eine Aenderung
 * an einer Stelle waere unbemerkt an der anderen vorbeigegangen.
 *
 * Zwei Schluessel, mit Absicht verschieden streng:
 *
 *   Geraete-Kennung — ohne Nachweis gueltig. Sie ist ein Geheimnis dieses
 *   Browsers, niemand kann sie erraten. Wer ohne Konto bestellt, findet
 *   seine Bestellung so wieder.
 *
 *   E-Mail — nur gegen Nachweis. Sie wird NICHT mitgeschickt; der Server
 *   nimmt die Adresse aus dem Anmeldezeichen. Stuende sie in der
 *   Adresszeile, koennte jeder eine fremde eintragen und mitlesen.
 *
 * Die Kopfzeile heisst `X-Shop-Token`, weil Azure Static Web Apps die
 * uebliche `Authorization`-Kopfzeile unterwegs durch eine eigene ersetzt.
 *
 * (Spec meine-bestellungen-geraete, F1/F3/F4)
 */
function dlMeineBestellungen(){
  if(window._dlLunchOrderP) return window._dlLunchOrderP;
  var dev='', zeichen='';
  try{ dev=dlGeraeteKennungLesen(); }catch(e){}
  try{ zeichen=dlShopZeichen(); }catch(e){}
  /* Ohne beides gibt es nichts zu holen - dann bleibt die Kachel leer,
     statt eine Abfrage zu stellen, die niemanden meint. */
  if(!dev && !zeichen) return null;
  var kopf={};
  if(zeichen) kopf['X-Shop-Token']=zeichen;
  var ziel='/api/lunch-order?mode=my'+(dev?('&device_id='+encodeURIComponent(dev)):'');
  window._dlLunchOrderP=fetch(ziel,{headers:kopf})
    .then(function(r){return r.json();})
    .catch(function(){return {success:false};});
  return window._dlLunchOrderP;
}
