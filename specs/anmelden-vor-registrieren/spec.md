# Anmelden vor Registrieren — Specification

**Status:** umgesetzt
**Gemeldet:** „Macht es nicht mehr Sinn, sich anzumelden und nachzufragen,
ob schon registriert — und dann kann er sich registrieren?" sowie
„Nach Abmelden und Anmelden soll man zur Homepage automatisch kommen."

## Overview

Zwei Beobachtungen aus dem laufenden Betrieb, beide zum Kontozugang.

### 1. Der Knopf sagte das eine und tat das andere

Oben rechts stand **„Anmelden"** — der Klick führte aber auf
`/mein-konto#neu`, also direkt in das Formular **„Konto anlegen"**.

Das war eine bewusste Entscheidung („wer hier klickt, hat noch kein
Konto") und im ersten Moment nachvollziehbar. Sie hält aber nur solange,
wie niemand ein Konto hat. Mit jedem angelegten Konto wächst die Gruppe
derer, die sich schlicht **anmelden** wollen — und die landen im falschen
Formular. Besonders jetzt: Nach dem Wechsel des Sicherheitsschlüssels
mussten sich **alle** neu anmelden.

### 2. Nach An- und Abmelden blieb man stehen

Wer sich anmeldete, blieb auf der Kontoseite. Wer sich abmeldete, sah die
leere Anmeldemaske — das sah aus, als sei das Abmelden fehlgeschlagen.

## Requirements

### F1: Beschriftung und Ziel passen zusammen

#### F1 Description

Eine einfache, durchgängige Regel: **Die Beschriftung bestimmt das Ziel.**

| Beschriftung | Ziel |
|---|---|
| „Anmelden", „Mein Konto" | `/mein-konto` (Anmeldung) |
| „Konto anlegen" | `/mein-konto#neu` |

#### F1 Behaviour / Acceptance

- Das Konto-Symbol und der Menüeintrag führen abgemeldet zur **Anmeldung**.
- Die Anmeldemaske fragt sichtbar nach: „Noch kein Konto? **Konto
  anlegen**" — und der Weg zurück steht ebenso da.
- Links, die „Konto anlegen" versprechen (Bestellstatus-Seite, Hinweis
  nach der Mittagsbestellung), führen weiterhin direkt ins Formular.

#### F1 Test Cases

**TC-AR-01: Ohne Hash zeigt die Kontoseite die Anmeldung**

**TC-AR-02: Von der Anmeldung aus kommt man zum Anlegen und zurück**

- Genau die Rückfrage aus dem Laden: Wer noch nicht registriert ist, muss
  hier weiterkommen, ohne die Adresse von Hand zu ändern.

**TC-AR-06: Der Einstieg auf der Startseite führt zur Anmeldung**

- **Expected:** `#tb-konto` und `#mob-konto` zeigen auf `/mein-konto`.

**TC-AR-07: Wo „Konto anlegen" steht, geht es auch dorthin**

- Die Umkehrung derselben Regel — sonst entsteht derselbe Widerspruch
  nur in die andere Richtung.

### F2: Nach der Handlung zurück zur Startseite

#### F2 Description

Das Konto ist kein Aufenthaltsort, sondern ein Schalter. Nach dem
An- oder Abmelden gehört man zurück dorthin, wo der Laden steht.

#### F2 Behaviour / Acceptance

- Nach erfolgreichem **Anmelden**: zurück zur Startseite. Dort steht der
  Name im Konto-Symbol, und die Bestellungen stehen im Kasten „Meine
  Bestellungen".
- Nach **Abmelden**: ebenfalls zurück zur Startseite.
- **Nicht** nach dem **Anlegen**: Dort ist man noch gar nicht angemeldet,
  sondern muss erst die E-Mail bestätigen. Dieser Hinweis ist das
  Wichtigste auf der Seite und darf nicht wegspringen.
- Wer `/mein-konto` **angemeldet aufruft**, sieht weiterhin seine
  Bestellungen — gesprungen wird nur nach einer Handlung.

#### F2 Test Cases

**TC-AR-03: Nach dem Anmelden landet man auf der Startseite**

**TC-AR-04: Nach dem Abmelden landet man auf der Startseite**

**TC-AR-05: Nach dem Anlegen bleibt der Bestätigungshinweis stehen**

- Die wichtige Ausnahme. Fällt dieser Test, verschwindet der Hinweis
  „Bitte bestätigen Sie Ihre E-Mail" — und niemand wüsste, warum die
  Anmeldung danach nicht klappt.

## Umsetzung

- `static-site/index.html`, `dlKontoStand()`: abgemeldet `/mein-konto`.
- `static-site/mein-konto.html`: `anmelden()` und `abmelden()` springen
  auf `/`; `kontoAnlegen()` bleibt bewusst stehen.
- `static-site/bestellstatus.html`: „Kostenloses Konto anlegen" trägt
  jetzt `#neu` — vorher führte dieser Link in die Anmeldung.

## Folgen für bestehende Wächter

Vier Prüfungen in `mein-konto.spec.js` und `mein-konto-auffindbar.spec.js`
meldeten sich über das Formular an und schauten dann auf der Kontoseite
nach. Das geht nicht mehr, weil der Vorgang dorthin nicht mehr
zurückführt. Sie stellen den angemeldeten Zustand jetzt her, indem sie das
Anmeldezeichen mitbringen — **ihre Aussage bleibt unverändert**, nur der
Weg dorthin ist ein anderer. Dass das Anmelden selbst zur Startseite
führt, prüft TC-AR-03.

## Gegenprobe

Ohne die Änderungen (`git stash` auf die drei Seiten) fallen TC-AR-03,
TC-AR-04, TC-AR-06 und TC-AR-07. TC-AR-01, -02 und -05 bleiben grün —
diese Wege waren bereits in Ordnung.
