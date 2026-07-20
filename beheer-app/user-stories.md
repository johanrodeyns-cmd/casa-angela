# Casa Angela Beheer-app — User Stories

Versie van dit document: 0.1.0
Status legenda: ☐ Open · ◐ In uitvoering · ☑ Afgewerkt

Prioriteiten (MoSCoW voor v1.0.0):
- **M** = Must have
- **S** = Should have
- **C** = Could have

Implementatievolgorde wordt aanbevolen van boven naar onder per epic, en epic per epic (Epic 0 → 1 → 2 → 3 → 4).

---

## Epic 0 — Projectopzet & fundamenten

### US-0.1 ☑ Projectskeleton (M) — v0.1.0
**Als** ontwikkelaar **wil ik** een werkend basisproject met de afgesproken bestandsstructuur **zodat** ik daarop verder kan bouwen.

**Acceptatiecriteria:**
- Given een lege projectmap, when het skeleton wordt aangemaakt, then bestaan: `index.html`, `logic.js`, `logic.test.js`, `CLAUDE.md`, `ARCHITECTURE.md`, `user-stories.md`.
- Given `logic.test.js` met minstens één testcase, when ik `node --test logic.test.js` uitvoer, then slaagt de testrun.
- Given `logic.js`, then exporteert het alleen pure functies (geen verwijzing naar `window`, `document` of `fetch`).
- Given `index.html`, when geopend in een browser, then toont het minstens een titel en versienummer.

**Technische notities:** geen frameworks, geen build tools, geen npm packages in de frontend. Versie start op 0.1.0.

---

### US-0.2 ☑ Firebase-project + Google-login met whitelist (M) — v0.2.0
**Als** Johan of Tinneke **wil ik** inloggen met mijn Google-account **zodat** enkel wij tweeën toegang hebben tot de app.

**Acceptatiecriteria:**
- Given een nieuw, volledig gescheiden Firebase-project (voorstel-id `casa-angela-jr`), when `index.html` geladen wordt, then is Firebase succesvol geïnitialiseerd (Auth + Firestore).
- Given de inlogpagina, when ik op "Inloggen met Google" klik, then verschijnt de standaard Google-accountkiezer.
- Given een geslaagde Google-login, when mijn e-mailadres niet in de whitelist (`johan.rodeyns@gmail.com` + Tinneke's adres) staat, then word ik uitgelogd met een duidelijke melding "Geen toegang".
- Given een geslaagde login met een toegelaten e-mailadres, then krijg ik toegang tot de volledige app.
- Given de Firestore security rules, then is lezen/schrijven enkel toegestaan als `request.auth.token.email` in de whitelist staat — geen per-uid datamodel zoals in de andere apps.

**Technische notities:** whitelist (`johan.rodeyns@gmail.com`, `tinbogaerts@gmail.com`) staat in `firestore.rules` en client-side in `index.html`; `meta/allowedUsers` volgt later als UI-spiegel. Firebase via CDN, geen npm in de frontend.

---

### US-0.3 ☑ Versienummer en changelog in UI (M) — v0.3.0
**Als** gebruiker **wil ik** altijd het huidige versienummer zien en de volledige changelog kunnen openen **zodat** ik weet wat er in welke versie gewijzigd is.

**Acceptatiecriteria:**
- Given elke pagina van de app, then is het versienummer zichtbaar.
- Given een klik op het versienummer, then opent een overzicht met de volledige changelog (versie, datum, korte beschrijving).
- Given de eerste release, then bevat de changelog minstens "0.1.0 — initiële versie".

**Technische notities:** `CHANGELOG`-array inline in `index.html`, versie via `getVersion()` in `logic.js`.

---

### US-0.4 ☑ Vaste navigatiebalk (M) — v0.4.0
> Vervolg in v0.31.0: nieuw tabblad "Prijzen" toegevoegd tussen Boekingen en Checklist aankomst (zie US-3.1/US-1.3) — de navigatiebalk telt sindsdien 5 tabs i.p.v. 4.

**Als** gebruiker **wil ik** een vaste navigatiebalk **zodat** ik altijd snel tussen Kalender, Boekingen en Checklists kan schakelen.

**Acceptatiecriteria:**
- Given elke pagina, then is een navigatiebalk zichtbaar met minstens: Kalender, Boekingen, Prijzen, Checklist aankomst, Checklist vertrek.
- Given een klik op een navigatie-item, then schakelt de UI naar de juiste sectie zonder herladen van de pagina.
- Given de huidige sectie, then is het bijhorende navigatie-item visueel gemarkeerd als actief.
- Given een smal (mobiel) scherm, then blijft de navigatie bruikbaar (bv. onderste tab-balk of hamburgermenu) met vingervriendelijke tapgebieden.

---

### US-0.5 ☑ Visueel ontwerp & huisstijl (M) — v0.5.0
> Vervolg in v0.27.0: op vraag van Johan is de primaire kleur (was terracotta/bruinrood) in de hele beheer-app vervangen door een warmer lichtblauw (`--primary: #4F6FB0`) — een bewuste afwijking van de publieke website's kleurenpalet, enkel voor de beheer-app. PWA-icoontjes (`icon-192.png`/`icon-512.png`) zijn meegewijzigd naar de nieuwe kleur.

**Als** gebruiker **wil ik** een app die er verzorgd en herkenbaar uitziet **zodat** het gebruik ervan aangenaam is, zowel op de computer als op mijn GSM.

**Acceptatiecriteria:**
- Given het kleurenpalet van de beheer-app (primary, olijf, azuur, zand — sinds v0.27.0 een eigen primary-kleur, los van de publieke website), then gebruikt de beheer-app dezelfde kleuren consequent (CSS-variabelen), zonder marketing-opsmuk (geen grote hero-afbeeldingen, geen sierlijke lettertypes).
- Given elk scherm, when bekeken op een smartphone (viewport ≥ 360px breed), then zijn alle knoppen, kalendercellen en formuliervelden vlot met de duim te bedienen (minstens 44×44px tapgebied).
- Given elk scherm, when bekeken op een breed (desktop) scherm, then wordt de beschikbare ruimte functioneel benut (bv. kalender + zijpaneel), niet enkel uitgerekt.
- Given een actie (opslaan, verwijderen, synchroniseren), then geeft de UI duidelijke visuele feedback (laadindicator, bevestiging, foutmelding).

---

### US-0.6 ☑ Installeerbare PWA (S) — v0.6.0
> Vervolg in v0.27.0: de iOS-standalone app bleef een verouderde versie tonen ondanks `Cache-Control: no-cache` — WebKit negeerde de revalidatie voor homescreen-apps. Header aangescherpt naar `no-store` (nooit cachen, altijd volledig ophalen) in `firebase.json`.

**Als** gebruiker **wil ik** de app als icoon op mijn GSM-startscherm kunnen zetten **zodat** het aanvoelt als een echte app.

**Acceptatiecriteria:**
- Given `manifest.json` met naam, icoon en kleuren, when ik de site op mobiel open, then biedt de browser "Toevoegen aan startscherm" aan.
- Given de geïnstalleerde app, when ik ze open, then start ze zonder browser-adresbalk (standalone mode).
- Given een nieuwe deploy, when ik de geïnstalleerde app opnieuw open, then toont ze de nieuwste versie (geen stale cache dankzij `Cache-Control: no-store`).

**Technische notities:** geen service worker nodig voor v1 (zoals Gezondheid) — enkel `manifest.json` + icons; `Cache-Control: no-store` op html/js/json (`firebase.json`) i.p.v. `no-cache`, specifiek om iOS-standalone-cachegedrag te omzeilen.

---

## Epic 1 — Prijskalender

### US-1.1 ☑ Maandkalender met Airbnb-basisprijs per dag (M) — v0.7.0
**Als** Johan of Tinneke **wil ik** in een overzichtelijke maandkalender per dag de Airbnb-prijs ingeven **zodat** ik snel en visueel duidelijk mijn tarieven kan beheren.

**Acceptatiecriteria:**
- Given de prijskalender in "Airbnb"-modus, then toont elke dag-cel de ingegeven Airbnb-prijs (of leeg indien nog niet ingesteld).
- Given een klik/tap op een dag, then opent een klein invoerveld om de Airbnb-prijs voor die dag in te geven of te wijzigen.
- Given een ingegeven prijs, when ik bevestig, then wordt deze opgeslagen in `pricing/{date}.airbnbPrice` en meteen zichtbaar in de kalender.
- Given navigatie tussen maanden (vorige/volgende), then blijft de gekozen prijsmodus (Airbnb/Booking/…) behouden.

---

### US-1.2 ☑ Instelbare formule voor Booking/Rechtstreeks/Vrienden (M) — v0.8.0
> Instellingenscherm en persistentie zijn klaar; de live herberekening in de Booking-/Rechtstreeks-/Vrienden-*weergave* wordt zichtbaar zodra US-1.3 (schakelen tussen prijstypes) er is. Tot dan toont de dialog zelf een live rekenvoorbeeld.
**Als** Johan of Tinneke **wil ik** zelf de rekenregel instellen waarmee de overige 3 prijzen van de Airbnb-prijs worden afgeleid **zodat** ik de verhouding tussen platformen naar wens kan aanpassen zonder elke dag apart te moeten wijzigen.

**Acceptatiecriteria:**
- Given een instellingenscherm "Prijsformule", then kan ik voor Booking, Rechtstreeks en Vrienden elk een factor (vermenigvuldiging) en/of vaste aftrek/optelling instellen (afgeleide prijs = Airbnb-prijs × factor + aftrek).
- Given een wijziging van de formule, when ik opsla, then worden alle dagen in de Booking-/Rechtstreeks-/Vrienden-weergave onmiddellijk herberekend (de afgeleide prijzen worden niet apart opgeslagen per dag, enkel live berekend).
- Given een lege/ontbrekende Airbnb-prijs voor een dag, then tonen de afgeleide prijstypes voor die dag ook leeg (geen foutieve 0-waarde).

**Technische notities:** pure functie `computeDerivedPrice(airbnbPrice, {factor, offset})` in `logic.js`, met tests voor randgevallen (ontbrekende prijs, factor 0, negatieve offset).

---

### US-1.3 ☑ Schakelen tussen de 4 prijstypes (M) — v0.9.0
> Vervolg in v0.22.0: bezette dagen (boekingen + gesynchroniseerde blokken) krijgen nu ook in deze 4 prijskalenders dezelfde kleur als de Beschikbaarheidskalender (US-3.1/3.2) — prijs blijft zichtbaar, enkel de achtergrondkleur/diagonale split verandert. Zo is in één oogopslag te zien welke dagen al verhuurd zijn, ongeacht welke kalendermodus actief is.
> Vervolg in v0.31.0: de 4 prijstypes verhuisd naar een eigen tabblad "Prijzen" (zie US-3.1) — Beschikbaarheid zat voorheen als 5e knop in dezelfde toggle-rij, dat stond in de weg toen Beschikbaarheid een eigen Maand/Jaar-schakelaar kreeg (US-3.4). De 4-knoppen-toggle zelf werkt ongewijzigd, enkel de locatie (nu Prijzen-tab i.p.v. Kalender-tab) is anders.

**Als** Johan of Tinneke **wil ik** via knoppen bovenaan de kalender schakelen tussen Airbnb / Booking / Rechtstreeks / Vrienden **zodat** ik snel elk prijstype kan controleren.

**Acceptatiecriteria:**
- Given 4 knoppen/tabs bovenaan de kalender, when ik op een ervan klik, then toont de volledige kalender de bijhorende prijs per dag.
- Given de actieve knop, then is deze visueel duidelijk gemarkeerd (bv. terracotta-accent).
- Given ik ben in Booking-/Rechtstreeks-/Vrienden-modus, then kan ik geen prijs rechtstreeks bewerken (enkel in Airbnb-modus bewerkbaar) — een klik toont een hint "wijzig via Airbnb-prijs of pas de formule aan".

---

### US-1.4 ☑ Periode selecteren voor bulk-invoer (S) — v0.10.0
**Als** Johan of Tinneke **wil ik** een reeks dagen selecteren en in één keer dezelfde Airbnb-prijs ingeven **zodat** ik niet elke dag apart moet instellen.

**Acceptatiecriteria:**
- Given de Airbnb-modus, when ik een startdag en een einddag selecteer (bv. via slepen of "van/tot" invoer), then kan ik één prijs ingeven die voor alle dagen in die periode wordt toegepast.
- Given een reeds ingegeven prijs binnen de geselecteerde periode, when ik bevestig, then wordt deze overschreven zonder aparte bevestiging per dag (wél een globale bevestiging "Xx dagen aanpassen?").

---

### US-1.5 ☑ Prijzen kopiëren van vorig jaar (S) — v0.11.0
**Als** Johan of Tinneke **wil ik** de prijzen van hetzelfde seizoen vorig jaar als startpunt overnemen **zodat** ik niet elk jaar helemaal opnieuw moet beginnen.

**Acceptatiecriteria:**
- Given een knop "Kopieer van vorig jaar" binnen een geselecteerde periode, when ik erop klik, then worden de Airbnb-prijzen van exact dezelfde periode één jaar eerder overgenomen naar de huidige periode (waar beschikbaar).
- Given dagen zonder prijs vorig jaar, then blijven de overeenkomstige dagen dit jaar ongewijzigd (geen 0 of leeg overschrijven).
- Given de kopieeractie, then kan ik de overgenomen prijzen nadien nog individueel bijschaven.

---

## Epic 2 — Boekingen

### US-2.1 ☑ Boeking toevoegen/bewerken/verwijderen (M) — v0.12.0
> Vervolg in v0.21.1: alle datumweergaves bij boekingen tonen nu ook de weekdag (bv. "Do 9 jul 2026"), via de gedeelde `formatBookingDateRange`-helper.
> Vervolg in v0.30.1: afgelopen boekingen (vertrekdatum in het verleden) krijgen een grijze achtergrond in de boekingenlijst, zodat meteen duidelijk is welke verblijven al voorbij zijn.

**Als** Johan of Tinneke **wil ik** boekingen kunnen registreren met alle relevante gegevens **zodat** ik een centraal overzicht heb i.p.v. de huidige Excel.

**Acceptatiecriteria:**
- Given een boekingsformulier, then kan ik minstens volgende velden ingeven: Datum van, Datum tot, naam, taal, telefoonnummer, aantal volwassenen, aantal kinderen, opmerking, platform (Airbnb/Booking/Rechtstreeks/Vrienden), prijs.
- Given "Datum van" en "Datum tot", then wordt het aantal nachten automatisch berekend en getoond (niet manueel in te geven).
- Given een opgeslagen boeking, then verschijnt deze in een lijst/overzicht, sorteerbaar op datum.
- Given een boeking, then kan ik deze bewerken of verwijderen; verwijderen vraagt een expliciete bevestiging (geen apart statusveld — verwijderd = weg).

**Technische notities:** `validateBooking()` in `logic.js` (verplichte velden, datumvolgorde, nights-berekening) met tests. Firestore: `bookings/{id}`.

---

### US-2.2 ☑ Waarschuwing bij overlappende boeking (S) — v0.13.0
**Als** Johan of Tinneke **wil ik** gewaarschuwd worden als een nieuwe boeking overlapt met een bestaande **zodat** ik geen dubbele verhuur per ongeluk registreer.

**Acceptatiecriteria:**
- Given een nieuwe of gewijzigde boeking, when de periode overlapt met een bestaande boeking (of een gesynchroniseerd blok), then toont de app een duidelijke waarschuwing vóór het opslaan.
- Given de waarschuwing, then kan ik alsnog bewust doorgaan (bv. bij een correctie), de boeking wordt niet automatisch geblokkeerd.

**Technische notities:** `overlapsExistingBooking(newBooking, existingBookings, syncedBlocks)` in `logic.js`.

---

### US-2.3 ☑ Automatische iCal-synchronisatie met Airbnb en Booking.com (S) — v0.14.0
> De overlap-waarschuwing (US-2.2) houdt nu ook rekening met gesynchroniseerde blokken. De beschikbaarheidskalender zelf (Epic 3) moet nog gebouwd worden — die zal `syncedBlocks` hergebruiken zodra hij er is.
> Vervolg in v0.14.1: bugfix — "Nu synchroniseren" sloeg de ingevulde URL niet op vóór het synchroniseren, waardoor de Cloud Function nog de vorige (lege) URL gebruikte en stilzwijgend niets deed.

**Als** Johan of Tinneke **wil ik** dat bezette periodes van Airbnb en Booking.com automatisch verschijnen **zodat** ik niet alles dubbel manueel moet ingeven.

**Acceptatiecriteria:**
- Given een instellingenscherm, then kan ik de iCal-exportlinks van Airbnb en Booking.com invullen (`icalFeeds/airbnb`, `icalFeeds/booking`).
- Given geldige iCal-links, then haalt een periodieke Cloud Function (`syncIcalFeeds`, elke ~3 uur) de bezette periodes op en zet deze als `syncedBlocks` (enkel periode + bron, geen naam/prijs — die worden apart en manueel aangevuld in `bookings`).
- Given een handmatige "Nu synchroniseren"-knop, when ik erop klik, then wordt de sync onmiddellijk uitgevoerd (`syncIcalFeedsNow`).
- Given gesynchroniseerde blokken, then tellen deze mee in de beschikbaarheidskalender (Epic 3) en in de overlap-waarschuwing (US-2.2).

**Technische notities:** `parseIcalEvents()` + `mergeSyncedBlocks()` als pure functies in `logic.js` (parsing-logica getest op vaste iCal-fixtures). **Afwijking van het oorspronkelijke plan:** geen `node-ical`, maar een eigen minimale, dependency-vrije VEVENT-parser + Node's ingebouwde `fetch()` in `functions/index.js` — `node-ical` sleept `axios` mee, en die hing onherstelbaar vast bij het laden op deze ontwikkelmachine (netwerkschijf), wat `firebase deploy` blokkeerde nog vóór er iets naar de cloud ging. Zonder die dependency is het probleem weg en blijft de functie lichter. Vereiste eenmalige actie van de gebruiker: Firebase-project op het Blaze-plan zetten (nodig voor uitgaande netwerk-requests vanuit Cloud Functions).

---

### US-2.4 ☑ Afbeelding voor de contactpersoon ter plaatse (M) — v0.19.0
> Vereenvoudigd t.o.v. de eerste versie (v0.18.0): geen manuele periode-invoer meer. Eén klik kopieert meteen alles vanaf vandaag tot en met de laatste boeking in de toekomst.
> Vervolg in v0.44.0: de tekst-copy-knop volledig vervangen door een afbeelding (JPG-tabel). Bij een langere lijst upcoming bookings liep WhatsApp tegen zijn maximum aantal tekens per bericht aan bij het plakken — een afbeelding heeft die beperking niet. Johan stuurde een voorbeeld van de tabelvorm die hij al gebruikte (Datum Van/Datum Tot/#nachten/Naam/Taal/Tel nr/#volwassenen/#kinderen/Opmerking) als referentie voor de kolomindeling. Expliciete keuze (i.p.v. het bericht automatisch in meerdere delen op te knippen): de knop vervangt de oude volledig, en op mobiel wordt rechtstreeks gedeeld via het native deelvenster i.p.v. enkel gedownload.

**Als** Johan of Tinneke **wil ik** een overzicht van boekingen als afbeelding kunnen genereren en delen **zodat** ik het naar WhatsApp naar onze contactpersoon ter plaatse kan sturen, zonder inzage in prijzen en zonder tegen een berichtlengte-limiet aan te lopen.

**Acceptatiecriteria:**
- Given een knop "🖼️ Afbeelding voor contactpersoon", when ik erop klik, then wordt zonder verdere invoer een tabel-afbeelding (JPG) gegenereerd met alle boekingen vanaf vandaag tot en met de laatste boeking in de toekomst (een lopende boeking die vandaag nog niet is afgelopen, telt mee).
- Given die tabel, then bevat ze per boeking een rij met: Datum Van, Datum Tot, #nachten, Naam, Taal, Tel nr, #volwassenen, #kinderen, Opmerking — zonder Klantprijs.
- Given een mobiel toestel dat het native deelvenster ondersteunt (`navigator.canShare` met bestanden), then opent de knop dat deelvenster meteen met de afbeelding, zodat "WhatsApp" er rechtstreeks uit gekozen kan worden.
- Given geen ondersteuning voor het deelvenster (bv. desktop) of een geannuleerde/mislukte deelactie, then wordt de afbeelding gewoon gedownload, met een duidelijke statusmelding welk van beide gebeurd is.
- Given geen boekingen vanaf vandaag, then toont de app een duidelijke melding i.p.v. een lege of onzinnige afbeelding.

**Technische notities:** `logic.buildContactImageRows(bookings)` (pure, TDD) selecteert/normaliseert de velden (nachten via `nightsBetween`, lege standaardwaarden voor taal/telefoon/opmerking, geen prijsveld); `index.html` formatteert de datums (`formatFullDate`, volledige weekdag+maand nl-BE) en tekent de tabel op een off-screen `<canvas>` (`renderContactImageBlob`, 2× schaalfactor voor scherpte op telefoonschermen, opmerking-kolom wrapt over meerdere regels indien nodig) → `canvas.toBlob('image/jpeg')`. Delen via `navigator.share({ files: [File] })` wanneer `navigator.canShare` dat toelaat (met `AbortError`-afhandeling bij annuleren = geen foutmelding), anders een `<a download>`-link (`downloadBlob`). Vervangt volledig de oude `formatBookingsListForContact` + `navigator.clipboard.writeText`-aanpak (verwijderd, incl. tests) — enkel de tuinier-export (US-2.5) gebruikt nog de tekst/klembord-route.

---

### US-2.5 ☑ Kopiëren naar klembord voor de tuinier (M) — v0.19.0
> Vervolg in v0.26.0: op vraag van de tuinier vertaald naar het Spaans, gastnamen en iconen eruit gehaald, en herschikt als compacte tabel (enkel kolommen Desde/Hasta) — de tuinier heeft enkel de bezette periodes nodig, niet wie er verblijft.
> Vervolg in v0.26.1: de samenvattende koptekst (datumbereik) bleek overbodig voor de tuinier en is weggehaald — enkel de tabel wordt nu gekopieerd. Daarnaast stond de Hasta-kolom niet uitgelijnd met de einddata na plakken in WhatsApp (geen monospace-lettertype); opgelost door de tabel in een ```` ``` ````-codeblok te wrappen (WhatsApp toont dat monospace) en de kolombreedte dynamisch te berekenen.
> Vervolg in v0.26.2: het codeblok uit v0.26.1 brak op smalle schermen — monospace-tekens zijn breder, waardoor elke datum op een eigen regel viel i.p.v. netjes naast elkaar. Codeblok weer weggehaald (terug het gewone lettertype, dat naar verluidt prima leesbaar was), met wat meer ruimte tussen Desde en Hasta.
> Vervolg in v0.26.3: de koptekst "Reservas Casa Angela" mag toch blijven staan bovenaan de tabel — enkel het datumbereik erachter (dat in v0.26.1 samen met de koptekst was weggehaald) blijft weg.

**Als** Johan of Tinneke **wil ik** een beperktere tekstlijst naar het klembord kunnen kopiëren voor de tuinman **zodat** die enkel weet wanneer het huis bezet is, zonder overbodige of privé-gegevens, en ik dat ook zo in WhatsApp kan plakken.

**Acceptatiecriteria:**
- Given een knop "Kopieer voor tuinier", when ik erop klik, then wordt een koptekst "Reservas Casa Angela" (zonder datumbereik) gevolgd door een compacte Spaanstalige tabel naar het klembord gekopieerd met per boeking enkel: Desde (datum van), Hasta (datum tot) — geen naam, taal of iconen.
- Given de tabel, then staat de Hasta-kolom met voldoende ruimte na de Desde-kolom (spatie-opvulling, gewoon lettertype — geen monospace-codeblok, dat brak op smalle schermen).
- Given dezelfde selectie als US-2.4 (alle boekingen vanaf vandaag tot en met de laatste boeking in de toekomst), then gebruikt deze kopieeractie diezelfde set boekingen, maar met de beperkte veldenset.
- Given een geslaagde kopieeractie, then toont de app dezelfde korte bevestiging als bij US-2.4.
- Given geen boekingen vanaf vandaag, then toont de app dezelfde duidelijke melding als bij US-2.4.

**Technische notities:** `logic.formatBookingsListForGardener(bookings, formatDate)` bouwt een spatie-uitgelijnde `Desde`/`Hasta`-tabel (gewoon lettertype, geen codeblok); `index.html` geeft `formatDateEs` (Spaanse datumformattering), `headerLabel: "Reservas Casa Angela"` en `headerRangeFormatter: null` (koptekst zonder datumbereik) mee aan `copyUpcomingBookings` — sinds v0.44.0 de enige knop die deze tekst/klembord-helper nog gebruikt (de contactpersoon-export (US-2.4) is een afbeelding geworden).

---

### US-2.6 ☑ Synchronisatie-overzicht: boekingen verifiëren tegen Airbnb/Booking.com (S) — v0.20.0
**Als** Johan of Tinneke **wil ik** in één overzicht zien welke boekingen en gesynchroniseerde blokken niet met elkaar overeenkomen **zodat** ik kan controleren of onze eigen boekingen nog kloppen met wat er op Airbnb/Booking.com staat (bv. na een annulering die ik gemist heb).

**Acceptatiecriteria:**
- Given een knop "Synchronisatie-overzicht" in de Boekingen-tab, when ik erop klik, then toont een dialoog twee lijsten: (1) gesynchroniseerde blokken zonder overeenkomende boeking, (2) boekingen op platform Airbnb/Booking.com waarvan de datums niet exact overeenkomen met een gesynchroniseerd blok van diezelfde bron.
- Given een item in lijst (1), then kan ik erop klikken om de boeking aan te vullen (hergebruikt dezelfde flow als US-3.3).
- Given een item in lijst (2), then kan ik erop klikken om de bestaande boeking te bekijken/bewerken/verwijderen (hergebruikt de bestaande boekingsdialoog).
- Given beide lijsten leeg, then toont de dialoog een duidelijke "Alles komt overeen ✅"-melding i.p.v. twee lege lijstjes.

**Technische notities:** pure functies `findUnmatchedBookings(bookings, syncedBlocks)` en `findUnmatchedSyncedBlocks(bookings, syncedBlocks)` in `logic.js` — matching op exacte `dateFrom`/`dateTo` + platform/source (geen fuzzy-matching). Boekingen op platform `direct`/`friends` worden nooit als "unmatched" getoond, want daar bestaat sowieso geen sync voor.

> Vervolg in v0.23.2: bugfix — `findUnmatchedSyncedBlocks` vereiste ook een exacte platform-match (`booking.platform === block.source`), waardoor een eigen verblijf dat als "Rechtstreeks" was ingevoerd (bv. Tinneke&Johan) tóch als "unmatched" Airbnb-blok verscheen, ook al kwamen de datums exact overeen. Lijst (1) matcht nu enkel nog op datums — een blok telt als "gedekt" zodra er een boeking bestaat met exact dezelfde `dateFrom`/`dateTo`, ongeacht platform. Lijst (2) (`findUnmatchedBookings`) blijft wél platform-gebonden, want die controleert specifiek Airbnb/Booking.com-boekingen tegen hun eigen bron.

---

## Epic 3 — Beschikbaarheidskalender

### US-3.1 ☑ Beschikbaarheid als 5e kalendermodus (M) — v0.15.0
> Halve-dag-splitsing (US-3.2) en doorklikken naar boekingsdetails (US-3.3) volgden meteen mee, alle drie op dezelfde dag afgewerkt.
> Vervolg in v0.21.0: dag-cel toont nu de gastnaam i.p.v. het generieke "Bezet" (bij een gesynchroniseerd blok zonder ingevulde boeking blijft "Bezet" staan, want dan is er nog geen naam). Bijkomende bugfix: een lange naam blies de kalendercellen op tot ongelijke breedtes (CSS Grid `min-width: auto`-blowout) — opgelost met `min-width: 0` op `.cal-day`.
> Vervolg in v0.31.0: op vraag van Johan (tabbladen herschikt) is Beschikbaarheid niet langer een 5e knop naast de 4 prijstypes — het is nu de volledige inhoud van het Kalender-tabblad, met de Maand/Jaar-schakelaar uit US-3.4 bovenaan (Jaar staat sindsdien default actief). De 4 prijstypes (US-1.3) kregen een eigen tabblad "Prijzen". De maandweergave van Beschikbaarheid heeft daardoor een eigen `renderAvailabilityMonth`/`avail-cal-grid` gekregen, los van `renderCalendar`/`cal-grid` (dat nu zuiver de prijzen-maandkalender is) — beide delen wel nog dezelfde `openDayDetailDialog`.
> Vervolg in v0.31.2: bugfix — bij het openen van de app toonden alle kalenders (Prijzen én Kalender-tab) geen boekingen tot de gebruiker ergens op klikte. Oorzaak: de kalenders tekenen één keer meteen bij het laden van de pagina, nog vóór inloggen, met een lege `bookings`-array; `loadBookings()` (async, na login) werkte die array wel bij maar liet de kalenders nooit opnieuw tekenen — dat gebeurde toevallig pas bij de eerstvolgende klik (bv. Maand/Jaar wisselen), tegen dan was `bookings` al geladen. `loadBookings()` roept nu zelf `renderCalendar()` en `updateAvailabilityViewVisibility()` aan zodra de boekingen binnen zijn.

**Als** Johan of Tinneke **wil ik** in dezelfde kalender ook kunnen zien wanneer het huis verhuurd is **zodat** ik niet tussen aparte schermen moet wisselen.

**Acceptatiecriteria:**
- Given het Kalender-tabblad, then toont dit uitsluitend Beschikbaarheid (Maand/Jaar-schakelaar, zie US-3.4) — geen 5e knop meer naast de 4 prijstypes, die staan sinds v0.31.0 in een eigen tabblad "Prijzen" (US-1.3).
- Given de Beschikbaarheid-weergave (Maand of Jaar), then toont elke dag-cel vrij/bezet op basis van `bookings` alleen (`buildOccupancyMap(bookings, [])`) — zie v0.23.0 hieronder.

> Vervolg in v0.23.0: de 5 kalenders (incl. de 4 prijskalenders sinds v0.22.0) tonen kleuring/labels nu enkel op basis van `bookings`, niet meer van `syncedBlocks`. Reden: een gesynchroniseerd blok is ruwe, mogelijk verouderde iCal-data (zie de bugfixes in v0.22.1/v0.22.2 hierboven) — enkel een boeking die je zelf hebt geverifieerd en ingevoerd mag de kalender kleuren. `syncedBlocks` blijven wel meetellen in: (1) de overlap-waarschuwing bij het aanmaken van een boeking (`overlapsExistingBooking`, US-2.2), (2) het dagdetail (tik op een dag) — een niet-gekoppeld blok is daar nog steeds zichtbaar met een "Boeking aanvullen"-knop, en (3) het Synchronisatie-overzicht (US-2.6) voor de manuele mismatch-check. Zo blijft er een vangnet, zonder dat verouderde syncdata de kalender kan vervuilen.

---

### US-3.2 ☑ Halve-dag weergave voor aankomst/vertrek (M) — v0.16.0
**Als** Johan of Tinneke **wil ik** visueel duidelijk zien dat een dag van aankomst of vertrek maar half bezet is **zodat** er geen misverstand ontstaat over in- en uitchecktijden.

**Acceptatiecriteria:**
- Given een boeking van bv. 10 tot 14, then toont dag 10 een diagonale split: voormiddag vrij (wit/zand), namiddag bezet (terracotta) — aankomst is in de namiddag.
- Given dezelfde boeking, then toont dag 14 een diagonale split: voormiddag bezet (terracotta), namiddag vrij — vertrek is vóór 10u 's ochtends.
- Given twee opeenvolgende boekingen (bv. huis vrij van 14 tot 14, nieuwe check-in dezelfde dag), then toont die dag zowel het vertrek- als aankomstpatroon correct (geen overlap-fout).

**Technische notities:** `dayOccupancyState(date, occupancyMap)` in `logic.js` retourneert een van `'vrij' | 'aankomst' | 'vertrek' | 'bezet'`, puur en getest op grensgevallen (eerste/laatste dag van de maand, opeenvolgende boekingen).

> Vervolg in v0.22.1: bugfix — een verouderd/niet-gekoppeld gesynchroniseerd blok (bv. stale Airbnb-sync) kon de aankomst/vertrek-classificatie van een echte boeking overschrijven zodra hun datums overlapten. `dayOccupancyState` geeft nu voorrang aan `booking`-entries op een dag; `syncedBlock`-entries tellen alleen mee als er géén boeking die dag dekt.

> Vervolg in v0.22.2: bugfix — bij een same-day turnover (iemand vertrekt en de volgende gast komt aan op dezelfde dag) toonde de kalendercel maar 1 naam: de tekst werd stilzwijgend afgekapt (`white-space: nowrap` + ellipsis) zodra beide volledige namen niet pasten. `dayDisplayLabel` toont nu de voornamen van beide gasten (vertrekkende gast eerst), en de cel mag over 2 regels wrappen in plaats van af te kappen. Volledige namen blijven zichtbaar via het dagdetail (tik op de cel).

---

### US-3.3 ☑ Doorklikken naar boekingsdetails (M) — v0.17.0
**Als** Johan of Tinneke **wil ik** vanuit de beschikbaarheidskalender snel de bijhorende boeking kunnen inkijken **zodat** ik niet apart moet zoeken.

**Acceptatiecriteria:**
- Given de Beschikbaarheid-modus, when ik op een bezette dag klik, then opent een detailweergave van de bijhorende boeking (alle velden uit US-2.1).
- Given een dag die enkel bezet is door een gesynchroniseerd blok (nog geen manuele boeking aangemaakt), then toont de detailweergave een duidelijke melding "Gesynchroniseerd via Airbnb/Booking.com — nog geen boekingsdetails ingevuld" met een snelkoppeling om de boeking aan te vullen.

---

### US-3.4 ☑ Jaarkalender voor beschikbaarheid (M) — v0.28.0
> Vervolg in v0.28.1: de Maand/Jaar-schakelaar bleef zichtbaar bij de 4 prijskalenders i.p.v. enkel bij Beschikbaarheid — `.view-toggle`'s eigen `display: flex` had dezelfde CSS-specificiteit als het `hidden`-attribuut en won daarvan in de cascade. Opgelost met een expliciete `.view-toggle[hidden] { display: none; }`-regel.
> Vervolg in v0.29.0: de mini-maandkalenders (heatmap-stijl) overtuigden Johan niet na een eerste test — op basis van een referentiebeeld (Excel-achtig jaaroverzicht: 12 maandrijen, dagkolommen, gastnaam als doorlopende balk) volledig herbouwd naar een spreadsheet-stijl tabel. Bewuste afwijking van het referentiebeeld: geen "Ma Di Wo..."-weekdagkoppen bovenaan (die zouden voor 11 van de 12 maanden fout uitgelijnd staan, want elke maand start op een andere weekdag) — in de plaats krijgt elke vrije dag een correcte weekend-kleuring op basis van de echte kalenderdatum.
> Vervolg in v0.29.1: dagkolommen kregen per maand een verschillende breedte (rommelig ogend) — de browser kon de kolombreedte niet consistent bepalen doordat elke rij andere colspan-grenzen heeft (boekingsbalken van wisselende lengte). Opgelost met `table-layout: fixed` + een expliciete `<colgroup>` (32 vaste kolommen: 1 voor de maandnaam, 31 voor de dagen).
> Vervolg in v0.29.2: bleek bij een echte test (jaar met veel/brede boekingen, bv. 2026) toch nog steeds ongelijke kolombreedtes te geven ondanks de colgroup-fix — een `<table>` met colspans bleek dit gewoon niet 100% betrouwbaar op te lossen. Volledig herbouwd met CSS Grid i.p.v. een HTML-tabel: elke maand is nu een eigen `display: grid`-rij met exact dezelfde vaste kolombreedtes (`grid-template-columns: 92px repeat(31, 26px)`), wat kolomverschillen tussen rijen sowieso onmogelijk maakt.
> Vervolg in v0.30.0: Belgische officiële feestdagen krijgen dezelfde kleur als weekenddagen (inclusief de bewegende feestdagen t.o.v. Pasen).
> Vervolg in v0.31.0: tabbladen herschikt (zie US-3.1/US-1.3) — de Maand/Jaar-schakelaar staat niet meer "enkel zichtbaar bij Beschikbaarheid, verborgen bij de 4 prijskalenders", want Beschikbaarheid is nu het hele Kalender-tabblad (geen prijskalenders meer ernaast om voor te verbergen). Tegelijk is **Jaar het nieuwe standaard-geselecteerde beeld** i.p.v. Maand.
> Vervolg in v0.33.0: op vraag van Johan de kolomindeling omgegooid — voorheen stond dag 1 altijd in kolom 1 (ongeacht weekdag), waardoor weekends per maand op een andere kolom vielen. Elke maandrij begint nu met dezelfde Monday-first-padding als `buildMonthGrid` (lege `blank`-cellen vóór dag 1 en na de laatste dag), zodat kolom X in élke rij dezelfde weekdag voorstelt en weekends (en feestdagen) verticaal mooi samenvallen over de 12 maanden. De tabel is daardoor breder geworden (42 dagkolommen i.p.v. 31, want de langste padding+maand-combinatie beslaat 6 weken).
> Vervolg in v0.33.1: aankomst-/vertrekdagen tonen nu dezelfde diagonale kleursplit als de maandweergave (`.year-cell.aankomst`/`.year-cell.vertrek`), zonder zichtbare gastnaam — die past toch niet leesbaar in zo'n smalle cel, enkel als `title`-tooltip. Voorheen werden aankomst/vertrek/bezet-dagen van hetzelfde verblijf allemaal samengevoegd tot één effen balk; nu splitst `buildMonthTimeline` de check-in/check-out-dag er telkens als eigen 1-dagscel uit, en smelt enkel de volledig bezette dagen ertussen samen tot de naamsbalk.
> Vervolg in v0.33.2: dagen met een eenzelfde-dag-gastenwissel (vertrek + aankomst) krijgen nu ook een diagonale split (`.year-cell.turnover`, primary/primary-light) i.p.v. een effen balk met de (afgekapte, onleesbare) samengevoegde naam — op vraag van Johan, want dat oogde te druk. Voorheen was zo'n wisseldag gewoon een `'booked'`-segment van 1 dag; `buildMonthTimeline` geeft hem nu een eigen `'turnover'`-type, zonder naam.
> Vervolg in v0.33.3: op een breed scherm bleef er rechts onbenutte ruimte staan, ook al was er plaats genoeg voor (een deel van) de jaartabel — het Kalender-tabblad zat vast op dezelfde `max-width: 900px` als alle andere tabs. `#tab-kalender` krijgt sindsdien `max-width: none`, zodat de jaartabel op een groot scherm de volledige resterende breedte naast de navigatiebalk gebruikt (minder/geen horizontaal scrollen nodig, afhankelijk van schermbreedte).

**Als** Johan of Tinneke **wil ik** in één oogopslag de beschikbaarheid van het volledige jaar zien **zodat** ik niet maand per maand moet doorklikken om een overzicht te krijgen.

**Acceptatiecriteria:**
- Given het Kalender-tabblad, then staat er een Maand/Jaar-schakelaar bovenaan, met **Jaar default geselecteerd**; "Jaar" toont de jaarweergave, "Maand" toont de maandweergave (US-3.1).
- Given de jaarweergave, then toont ze een tabel met 12 maandrijen (huidig kalenderjaar) en 42 dagkolommen (6 weken); elke rij begint met evenveel lege opvulcellen als nodig zodat kolom X in élke rij dezelfde weekdag voorstelt — weekends vallen daardoor verticaal samen over alle maanden i.p.v. dat dag 1 altijd in kolom 1 begint. De maandnaam blijft zichtbaar bij horizontaal scrollen (sticky eerste kolom).
- Given een vrije dag, then toont de cel het dagnummer, met een duidelijke kleurtint op een weekenddag (zaterdag/zondag, op basis van de echte datum) of op een officiële Belgische feestdag (zelfde kleur als een weekenddag).
- Given een aaneengesloten verblijf, then wordt de volledig bezette periode ertussen getoond als één doorlopende gekleurde balk (samengevoegde cel) met de gastnaam erin, i.p.v. een cel per dag.
- Given de check-in- en check-outdag van een verblijf, then tonen die dezelfde diagonale kleursplit als de maandweergave (aankomst: zand→primary, vertrek: primary→zand), zonder zichtbare gastnaam (enkel als tooltip) — consistent met hoe de maandweergave aankomst/vertrek toont.
- Given een eenzelfde-dag-gastenwissel (vertrek + aankomst), then toont die dag een eigen diagonale kleursplit (los van de aankomst/vertrek-kleuren), zonder gastnaam erin — een samengevoegde naam zou in zo'n smalle cel te druk ogen.
- Given een breed (desktop) scherm, then is de volledige tabel in één keer leesbaar; op mobiel mag de tabel horizontaal scrollen (bewust aanvaard, gezien het aantal dagkolommen).
- Given vorige/volgende-jaar-knoppen, when ik erop klik, then toont de jaarweergave het gekozen jaar (i.p.v. de maand-navigatiepijltjes uit de maandweergave).
- Given een klik/tik op een cel (vrij of bezet) in de jaarweergave, then opent dezelfde dag-detaildialoog als in de maandweergave (US-3.3) — geen aparte interactielogica.

**Technische notities:** geen nieuwe Firestore-queries — `bookings`/`syncedBlocks` staan al volledig in het geheugen sinds login. Pure functies in `logic.js`, TDD getest: `buildMonthTimeline(year, month, occupancyMap)` (één maandrij, geflatte `buildMonthGrid`-weken: `{type:'blank'}`-padding vóór/na de maand, vrije dagen los, aaneengesloten dagen met identiek `dayDisplayLabel` samengevoegd tot één `{type:'booked', day, span, label}`-segment) en `buildYearGrid(year, occupancyMap)` (12× `buildMonthTimeline`). Rendering (`renderYearView` in `index.html`) is CSS Grid, geen `<table>` (zie v0.29.2 hierboven); `logic.escapeHtml` ontsnapt de gastnaam vóór het in `innerHTML` terechtkomt.

---

### US-3.5 ☑ Eigen verblijf visueel onderscheiden (S) — v0.41.0
**Als** Johan of Tinneke **wil ik** in het Kalender-tabblad in één oogopslag zien welke bezette periodes een eigen verblijf zijn (niet een betalende gast) **zodat** ik dat niet moet verwarren met een echte boeking.

**Acceptatiecriteria:**
- Given een boeking waarvan de naam "Johan" en/of "Tinneke" bevat (hoofdletterongevoelig), then krijgt die dag/periode in zowel de Maand- als de Jaarweergave een warme geel/bruine kleur i.p.v. de gewone blauwe bezet-kleur.
- Given een aankomst-, vertrek- of eenzelfde-dag-wisseldag van zo'n eigen verblijf, then krijgt die dezelfde diagonale kleursplit-stijl als een gewone boeking, enkel met de geel/bruine kleur i.p.v. blauw.
- Given een andere boeking (gastnaam bevat geen "Johan"/"Tinneke"), then blijft die de gewone blauwe kleur behouden — geen wijziging.

**Technische notities:** puur visuele herkenning via een regex-check (`/johan|tinneke/i`) op de al berekende `dayDisplayLabel`/`cell.label`-tekst in `renderAvailabilityMonth`/`renderYearView` (`index.html`) — geen wijziging aan `logic.js` of het datamodel, want er is geen apart veld dat een boeking als "eigen verblijf" markeert. Nieuwe CSS-variabelen `--honey`/`--honey-light`, nieuwe classes `.cal-day.eigen`/`.year-cell.eigen` (gecombineerd met de bestaande `bezet`/`aankomst`/`vertrek`/`turnover`-classes). Geldt enkel in het Kalender-tabblad (Beschikbaarheid), niet in de Prijzen-tab.

---

### US-3.6 ☑ Huidige dag visueel gemarkeerd (S) — v0.43.0
**Als** Johan of Tinneke **wil ik** in het Kalender-tabblad in één oogopslag zien welke dag "vandaag" is **zodat** ik me sneller kan oriënteren, vooral in de Jaarweergave waar geen enkele andere aanwijzing daarvoor bestaat.

**Acceptatiecriteria:**
- Given de Maandweergave, then krijgt de cel van de huidige dag een dikke rode kader, ongeacht of die dag vrij, bezet, aankomst, vertrek of eigen verblijf is.
- Given de Jaarweergave, then krijgt de cel (of, bij een meerdaagse samengevoegde boekingscel, het volledige blok waar de huidige dag deel van uitmaakt) diezelfde dikke rode kader.
- Given een andere maand/ander jaar dan de huidige, then verschijnt de rode kader niet (enkel de echte huidige dag wordt gemarkeerd).

**Technische notities:** nieuwe CSS-variabele `--today-red`, nieuwe classes `.cal-day.today`/`.year-cell.today` (`outline`, zoals het bestaande `.cal-day.selected`-patroon, zodat de kader geen ruimte inneemt en los staat van de achtergrondkleur-classes). Vergelijking via `new Date().toLocaleDateString("en-CA")` (lokale tijdzone) tegen de datum van elke cel; voor een samengevoegde `booked`-cel (`grid-column: span N`) wordt gecontroleerd of vandaag ergens binnen `[cell.day, cell.day + cell.span)` valt, niet enkel op de startdag van het blok. Puur front-end, geen wijziging aan `logic.js` of het datamodel. Geldt enkel in het Kalender-tabblad (Beschikbaarheid), niet in de Prijzen-tab.

---

## Epic 4 — Checklists

### US-4.1 ☑ Checklist-items beheren (CRUD) (M) — v0.24.0
**Als** Johan of Tinneke **wil ik** zelf to-do's toevoegen, hernoemen en verwijderen in een aankomst- en een vertrek-checklist **zodat** de lijst aan onze eigen gewoontes aangepast blijft.

**Acceptatiecriteria:**
- Given twee gescheiden checklists ("Bij aankomst" en "Bij vertrek"), then kan ik in elk onafhankelijk items toevoegen, hernoemen en verwijderen.
- Given een gedeelde checklist (niet per persoon), then zien Johan en Tinneke exact dezelfde lijst en status.
- Given een wijziging door één van beiden, then is deze meteen zichtbaar voor de andere (Firestore realtime).

**Technische notities:** één gedeelde `setupChecklist(listId)` in `index.html` voor beide lijsten, `onSnapshot` op `checklists/{aankomst|vertrek}` voor de realtime-sync (i.p.v. de eenmalige `getDocs` die de rest van de app gebruikt). Toevoegen/hernoemen delen één invoerveld bovenaan de lijst (tikken op een item schakelt naar 'bewerk'-modus) i.p.v. een aparte dialoog per item. Pure functies in `logic.js`: `sortChecklistItems`, `addChecklistItem`, `renameChecklistItem`, `removeChecklistItem`, `escapeHtml` (voorkomt HTML/XSS via de vrije tekstinvoer).

---

### US-4.2 ☑ Afvinken en resetten (M) — v0.24.0
> Vervolg in v0.32.3: op vraag van Johan de checklist-rijen compacter gemaakt (minder padding/marge, kleinere lettergrootte, kortere ▲/▼-knopjes) zodat er meer items op één scherm passen — het vinkje zelf blijft op 44×44px staan (tapgebied-eis uit onderstaande AC blijft gelden).

**Acceptatiecriteria:**
- Given een checklist-item, when ik erop tik, then wisselt het tussen afgevinkt en niet-afgevinkt, met duidelijke visuele feedback (bv. doorstreept + vinkje).
- Given een knop "Reset", when ik erop klik (met bevestiging), then worden alle items in die checklist teruggezet naar niet-afgevinkt, zonder de items zelf te verwijderen.
- Given een smal (mobiel) scherm, then zijn de vink-tapgebieden groot genoeg om vlot af te vinken zonder verkeerde items te raken.

**Technische notities:** `logic.toggleChecklistItem`/`logic.resetChecklistItems`, vink-tapgebied 44×44px. Reset gebruikt een bevestigingsdialoog (`#checklist-reset-dialog`), zelfde patroon als het verwijderen van een boeking.

---

### US-4.3 ☑ Items herordenen (S) — v0.24.0
**Als** Johan of Tinneke **wil ik** de volgorde van checklist-items kunnen aanpassen **zodat** de lijst de logische volgorde van onze routine volgt (bv. eerst zwembad, dan luiken).

**Acceptatiecriteria:**
- Given een checklist, then kan ik items herordenen (slepen, of pijltjes omhoog/omlaag als drag-and-drop op mobiel lastig blijkt).
- Given een nieuwe volgorde, then wordt deze opgeslagen in het `order`-veld per item en blijft behouden na herladen.

**Technische notities:** pijltjes omhoog/omlaag (geen drag-and-drop — betrouwbaarder op mobiel), `logic.moveChecklistItem(items, id, 'up'|'down')` wisselt het `order`-veld met de buur in sorteervolgorde, uitgeschakeld aan de randen van de lijst.

> US-4.1, 4.2 en 4.3 zijn samen als één geheel gebouwd en opgeleverd (niet los deploybaar — een lijst zonder toevoegen heeft niets om af te vinken), vandaar alle drie dezelfde versie.

---

## Epic 5 — Audit log

### US-5.1 ☑ Audit log van alle CRUD-acties (M) — v0.25.0
> Vervolg in v0.32.0: de "📜 Audit-log"-knop verhuisd van de Boekingen-tab naar de Prijzen-tab (links van "Periode") — geen inhoudelijke wijziging, enkel de locatie.

**Als** Johan of Tinneke **wil ik** kunnen nagaan wie wat wanneer heeft aangemaakt, gewijzigd of verwijderd **zodat** er een sluitend overzicht is bij twijfel over een prijs, boeking of instelling (bv. "wie heeft die prijs veranderd?").

**Acceptatiecriteria:**
- Given een schrijf-actie (aanmaken, wijzigen of verwijderen) op eender welke gegevensverzameling (`pricing`, `bookings`, `settings/pricingFormula`, `checklists`, `syncedBlocks`), when die actie wordt uitgevoerd, then wordt een audit-record aangemaakt met minstens: wie (e-mailadres van de ingelogde gebruiker), wat (welke verzameling/document en welk type actie: aanmaken/wijzigen/verwijderen), wanneer (tijdstip) en de betrokken gegevens (nieuwe waarde, en bij wijzigen/verwijderen liefst ook de vorige waarde).
- Given een audit-record, then wordt het gekoppeld aan het ingelogde account op basis van de servergevalideerde login, niet aan een vrij invoerbaar veld — een gebruiker kan zich niet voordoen als iemand anders.
- Given de audit-log, then is die enkel-toevoegen (append-only): niemand kan via de app een bestaand audit-record wijzigen of verwijderen, ook niet via de Firestore security rules.
- Given Johan of Tinneke, then kan de audit-log geraadpleegd worden (minstens ruwe lijst, chronologisch of per document) — het exacte overzichtsscherm is nader te bepalen, de kern van deze story is dat de gegevens sluitend worden vastgelegd.

**Technische notities:** `addAuditEntry(batch, collectionName, docId, action, before, after)` in `index.html` — elke save/delete-handler (prijs, bulk-prijs, prijzen-vorig-jaar-kopiëren, prijsformule, boeking opslaan/verwijderen, checklist-writeItems) bouwt zelf een `writeBatch` en voegt in dezelfde batch een `auditLog`-record toe (atomisch: of beide slagen, of geen van beide); `email` komt uit `auth.currentUser.email`, nooit uit een formulierveld. `syncedBlocks` wordt server-side gelogd vanuit `functions/index.js` (Admin SDK omzeilt Firestore rules toch, dus moet zelf de audit-plicht respecteren) — via `logic.diffSyncedBlocks`, want een sync-run doet altijd delete+recreate van élk blok voor een bron; zonder diff zou elke 3-uurlijkse sync ook alle ongewijzigde blokken opnieuw als delete+create loggen. Firestore rules herschreven van één blanket wildcard naar expliciete per-collectie `match`-blokken (rules zijn OR over alle matchende blokken, dus een brede wildcard-write zou de append-only-blokkade op `auditLog` ondermijnen): `create` op `auditLog` enkel toegestaan als `request.resource.data.email == request.auth.token.email`, `update`/`delete` altijd `false`. Raadplegen via een "📜 Audit-log"-knop (Prijzen-tab, sinds v0.32.0 — voorheen Boekingen-tab): laatste 50 records, nieuwste eerst, ruwe `before → after`-weergave.

---

## Epic 6 — Nuts (zonnepanelen via APsystems)

> Geport uit de Huishouden-app (tabblad "Casa Angela" daar) naar een eigen tabblad "Nuts" hier, op vraag van Johan. Eerst hier aan het werk krijgen, pas daarna de versie in Huishouden verwijderen.

### US-6.1 ☑ Credentials beheren (M) — v0.34.0
**Als** Johan of Tinneke **wil ik** mijn APsystems App ID, App Secret, SID en EID kunnen invoeren en wijzigen vanuit een instellingen-sectie binnen de Nuts-tab **zodat** ik geen code hoef aan te passen.

**Acceptatiecriteria:**
- Given de Nuts-tab, then staat er een uitklapbare "Instellingen"-sectie met velden voor App ID, App Secret (password-veld), SID en EID.
- Given een "Haal op"-knop naast EID, when ik erop klik (met geldige App ID/Secret/SID), then wordt de EID automatisch opgehaald en ingevuld.
- Given het instellingenformulier, when ik op "Opslaan" klik, then worden de gegevens opgeslagen in `settings/apsystems` en ververst het dashboard meteen met verse data.
- Given een "Verbinding testen"-knop, then geeft die meteen feedback of de credentials werken, zonder eerst te moeten opslaan.

**Technische notities:** `settings/apsystems` (gedeeld document, geen per-uid pad — Johan en Tinneke delen hetzelfde zonnepaneelsysteem). App Secret staat in Firestore (niet Secret Manager) omdat hij per call client-side wordt meegegeven aan de Cloud Function.

---

### US-6.2 ☑ Dagoverzicht (M) — v0.34.0
> Vervolg in v0.36.0: op vraag van Johan zijn de 5 kaartjes (huidig vermogen/vandaag/deze maand/dit jaar/lifetime) verwijderd — die informatie zit al in de grafieken eronder (Historie + Vermogen vandaag), de kaartjes waren dubbel. `casaAngelaSummary` wordt sindsdien enkel nog aangeroepen door "Verbinding testen" in Instellingen, niet meer voor het dashboard zelf.

**Als** Johan of Tinneke **wil ik** bij het openen van Nuts meteen zien: huidig vermogen (W), opbrengst vandaag (kWh), deze maand (kWh), dit jaar (kWh) en lifetime (kWh).

**Acceptatiecriteria:**
- ~~Given geldige credentials, when ik de Nuts-tab open, then toont het dashboard 5 kaarten: huidig vermogen, vandaag, deze maand, dit jaar, lifetime.~~ (vervallen sinds v0.36.0, zie hierboven)
- Given geen credentials ingevuld, then toont de tab een duidelijke prompt om eerst Instellingen te openen, i.p.v. lege/foutieve grafieken.
- Given een API- of netwerkfout, then toont de tab een duidelijke foutmelding i.p.v. een stille lege staat.

**Technische notities:** `casaAngelaToday` voor het vermogen vandaag (US-6.3); `casaAngelaEnergy` voor de historie (US-6.4).

---

### US-6.3 ☑ Grafiek van vandaag (M) — v0.34.0
> Vervolg in v0.36.0: verplaatst naar de tweede positie (onder de Historie-grafiek, zie US-6.4) en toont nu altijd de volledige dag (00:00-23:59) i.p.v. te stoppen bij het huidige tijdstip — de ontbrekende (nog niet verstreken) tijdstippen worden aangevuld met 0 W, aan dezelfde tijdstap als de echte metingen (fallback 5 minuten als er te weinig datapunten zijn om de stap af te leiden).

**Als** Johan of Tinneke **wil ik** een grafiek zien van het vermogen per tijdstip vandaag (lijngrafiek W over tijd), met de volledige dag zichtbaar.

**Acceptatiecriteria:**
- Given een gekende EID, then toont de Nuts-tab een lijngrafiek van het vermogen (W) over de volledige dag (00:00 t.e.m. 23:59), niet enkel tot het huidige tijdstip.
- Given geen EID gekend, then blijft de grafiek verborgen (geen lege/foutieve chart).

**Technische notities:** Chart.js 4.4.1 via lazy `import()` (jsdelivr `+esm`), enkel geladen wanneer de Nuts-tab effectief data toont. `logic.padTodayPowerSeries(time, power)` (pure, TDD) vult de tijdreeks aan tot een volledige dag.

---

### US-6.4 ☑ Historische data (M) — v0.34.0
> Vervolg in v0.36.0: op vraag van Johan staat deze grafiek nu als eerste (bovenaan, vóór "Vermogen vandaag"), met "Maand" als standaard-actieve periode bij het openen van de tab (voorheen moest je eerst zelf een periode kiezen). Bugfix: Maand en Dag toonden enkel de al-verstreken periode (bv. jan-jul i.p.v. jan-dec, of dag 1-21 i.p.v. 1-31) — APsystems geeft immers enkel data terug tot "nu". Beide worden nu aangevuld tot de volledige periode (12 maanden resp. alle dagen van de maand) met 0 voor wat nog niet verstreken is. De jaarweergave blijft ongewijzigd (toont sowieso enkel de jaren waarvoor er data bestaat).
> Vervolg in v0.42.0: naar aanleiding van herhaalde HTTP 500's (vermoedelijk APsystems-quota/rate-limiting) is de client-side Firestore-cache-TTL per niveau ingesteld i.p.v. een vaste 30 min voor alles — Dag 6u, Maand 24u, Jaar 7 dagen (`logic.nutsCacheTtlMs`, pure/TDD), want die grafieken tonen vrijwel enkel al-afgesloten periodes die toch niet meer wijzigen. "Vermogen vandaag" en "Netstroom vandaag" (US-6.10) blijven op 30 min, want die tonen wél nog lopende data. Zelfde mechanisme geldt voor Netstroom's historie, die dezelfde `nutsCached`-helper hergebruikt.

**Als** Johan of Tinneke **wil ik** kunnen schakelen tussen dag/maand/jaar-weergave met een grafiek per periode, met de volledige periode zichtbaar (ook de dagen/maanden die nog moeten komen).

**Acceptatiecriteria:**
- Given 3 knoppen "Dag"/"Maand"/"Jaar" onder Historie, when ik op een ervan klik, then toont een staafgrafiek de opbrengst (kWh) per periode-eenheid (dagen van de huidige maand, maanden van het huidig jaar, of jaren).
- Given de actieve periode-knop, then is die visueel gemarkeerd als actief; "Maand" is default actief bij het openen van de tab.
- Given "Maand", then toont de grafiek altijd alle 12 maanden (jan-dec) van het huidige jaar, ook de nog niet verstreken maanden (als 0 kWh).
- Given "Dag", then toont de grafiek altijd alle dagen van de huidige maand, ook de nog niet verstreken dagen (als 0 kWh).

**Technische notities:** `casaAngelaEnergy` (level: daily/monthly/yearly). `logic.padSeriesValues(values, length)` + `logic.daysInMonth(year, month)` (beide pure, TDD) vullen Maand/Dag aan tot een vaste lengte.

---

### US-6.5 ☑ Slimme caching (M) — v0.34.0
> Vervolg in v0.36.0: de "Vernieuwen"-knop is verwijderd (op vraag van Johan — een pagina-herlaad haalt sowieso alles opnieuw op). De cache blijft bestaan en wordt nu enkel nog geforceerd omzeild na het opslaan van nieuwe Instellingen (`refreshNuts(true)`).

**Als** Johan of Tinneke **wil ik** dat de app niet meer dan 1 API-call per 30 minuten doet voor dezelfde data **zodat** we binnen de gratis APsystems-quota (1000 calls/maand) blijven.

**Acceptatiecriteria:**
- Given data die al binnen de laatste 30 minuten opgehaald is, when ik de Nuts-tab opnieuw open, then komt de data uit cache (geen nieuwe APsystems-call).
- ~~Given een "Vernieuwen"-knop, when ik erop klik, then wordt de cache genegeerd en verse data opgehaald.~~ (knop vervallen sinds v0.36.0)
- Given het opslaan van nieuwe APsystems-instellingen, then wordt de cache genegeerd en verse data opgehaald.

**Technische notities:** `nutsCached(key, fetchFn, force)` — cache in `cache/apsystems` (Firestore-reads tellen niet tegen de quota), TTL 30 min, aparte cache-key per databron (`today_{date}`, `energy_{level}_{range}`) — `casaAngelaSummary` wordt sinds v0.36.0 enkel nog rechtstreeks (ongecacht) aangeroepen door "Verbinding testen", niet meer via deze cache.

---

### US-6.6 ☑ Foutafhandeling (M) — v0.34.0
**Als** Johan of Tinneke **wil ik** duidelijke meldingen zien bij quota-overschrijding, foute credentials of netwerkproblemen.

**Acceptatiecriteria:**
- Given een APsystems-foutcode (bv. quota bereikt, auth mislukt), then toont de app een leesbare Nederlandstalige melding i.p.v. de ruwe foutcode.
- Given een netwerkfout, then toont de app dat duidelijk i.p.v. stil te falen.

**Technische notities:** `nutsCodeMessage(code)` vertaalt de bekende APsystems-foutcodes; App Secret wordt nooit gelogd (niet in `console.log`, niet in foutmeldingen).

---

### US-6.7 ☑ Storingsmonitor met e-mailalert (M) — v0.34.0
**Als** Johan of Tinneke **wil ik** een e-mail krijgen als de zonnepanelen overdag geen productiedata meer doorsturen **zodat** we snel weten of bv. de zekering is afgeslagen, ook als we niet in Casa Angela zijn.

**Acceptatiecriteria:**
- Given "E-mail mij bij storing" aangevinkt + een alert-e-mailadres, then checkt een uurlijkse achtergrondtaak (9-18u Spaanse tijd) of de dagopbrengst nog stijgt.
- Given 2 opeenvolgende checks zonder stijging, then wordt een storingsmail verstuurd — niet bij elke vlakke check opnieuw (geen mail-spam).
- Given een stijging na een storingsmail, then wordt een herstelmail verstuurd.
- Given een "Stuur testmail"-knop, then kan ik de mailverzending testen zonder op de cron te wachten.
- Given een "Forceer check"-knop, then kan ik handmatig één check uitvoeren (handig bij het testen).

**Technische notities:** `decideAlertState(prevState, todayKwh, nowMs, todayDateStr)` (pure functie, `functions/lib/casaAngelaMonitor.js`, TDD getest — 1-op-1 gekopieerd uit Huishouden) bepaalt storings-/herstelmail o.b.v. `FLAT_CHECKS_BEFORE_ALERT = 2`; state bewaard in `settings/apsystems.monitorState`. Mail via `nodemailer`/Gmail SMTP, secret `GMAIL_APP_PASSWORD` (**eigen secret voor dit Firebase-project** — kan niet gedeeld worden met het gelijkaardige secret in Huishouden).

---

### US-6.8 ☑ Nuts opgesplitst in 4 onderdelen (M) — v0.35.0
**Als** Johan of Tinneke **wil ik** binnen Nuts kunnen schakelen tussen Zonnestroom, Netstroom, Water en Gas **zodat** elk nutsvoorziening zijn eigen overzicht en invoer krijgt, i.p.v. alles door elkaar op één scherm.

**Acceptatiecriteria:**
- Given de Nuts-tab, then staat er bovenaan een schakelaar met 4 opties: Zonnestroom, Netstroom, Water, Gas.
- Given "Zonnestroom" (default actief), then toont dit exact de bestaande APsystems-dashboard/grafiek/historie/instellingen/storingsmonitor (US-6.1 t/m 6.7), ongewijzigd.
- Given een van de 4 opties, when ik erop klik, then toont enkel de inhoud van die optie; de andere 3 zijn verborgen.

**Technische notities:** `#nuts-view-toggle` hergebruikt de `.view-toggle`/`.view-toggle-btn`-CSS van `#availability-view-toggle`, maar met een eigen `data-nuts-view`-attribuut en eigen scoped click-listener (niet de gedeelde `calViewMode`-logica) — anders zou een klik hier de Maand/Jaar-status van de Kalender-tab resetten.

---

### US-6.9 ☑ Water- en gasverbruik: manuele meterstanden + verbruiksgrafiek (M) — v0.35.0
**Als** Johan of Tinneke **wil ik** af en toe de meterstand van water en gas ingeven (datum + stand) **zodat** ik, net zoals bij zonnestroom, een grafiek van het verbruik per maand en per jaar kan zien, zonder dat ik elke maand netjes op dezelfde dag hoef af te lezen.

**Acceptatiecriteria:**
- Given de Water- of Gas-sub-tab, then kan ik een datum en een meterstand (m³) ingeven en toevoegen aan de historiek.
- Given een nieuwe meterstand, then moet die passen tussen de chronologisch vorige en volgende meting (meters tellen enkel op) — een ongeldige stand toont een duidelijke foutmelding i.p.v. stil te falen; metingen mogen in eender welke volgorde ingegeven worden (niet enkel na de laatste).
- Given minstens 2 metingen, then toont een grafiek het verbruik per maand (met jaarnavigatie) of per jaar (schakelbaar, hetzelfde Maand/Jaar-patroon als bij de Historie van Zonnestroom).
- Given metingen die niet op maandgrenzen vallen, then wordt het verbruik lineair over de tussenliggende dagen verdeeld (extrapolatie) om toch een maand/jaar-grafiek te kunnen tonen — een eenvoudig eerste model, later te verfijnen indien nodig.
- Given een meting, then kan ik die verwijderen uit de lijst.
- Given een wijziging door één van beiden, then is deze meteen zichtbaar bij de andere (Firestore realtime, zoals de checklists).

**Technische notities:** `waterReadings/{id}`/`gasReadings/{id}` (`{date, reading, createdBy, createdAt}`), generieke `setupMeterUtility(type)` voor beide (`type: 'water'|'gas'`). Pure functies in `logic.js` (TDD): `computeMeterIntervals`, `extrapolateDailyConsumption`, `buildMonthlyConsumption`, `buildYearlyConsumption`, `validateMeterReading`. Grafiek: Chart.js staafdiagram, zelfde lazy-load (`loadNutsChartJs`) als Zonnestroom.

---

### US-6.10 ☑ Netstroomverbruik via APsystems Open API ("exported") (S) — v0.37.0
> Eerste poging (nog dezelfde dag weer afgebouwd): Johan vond via de browser Netwerk-tab een `sEnergy`/`sLifetimeEnergy`-veld op de EMA-website zelf (`getDashboardProductionInfoAjax`), dat enkel bereikbaar was via een ingelogde sessie-cookie i.p.v. het officiële App ID/Secret — expliciet aanvaard als fragiele oplossing, tot Johan de officiële "APsystems OpenAPI User Manual" (met een Meter-level Data API, toegevoegd sinds v1.3 van die documentatie) terugvond en doorstuurde. Die documenteert exact `consumed`/`exported`/`imported`/`produced` via hetzelfde ondertekende App ID/Secret/SID-mechanisme als Zonnestroom — de cookie-gebaseerde aanpak (Cloud Function, EMA-sessie-instellingen, `netstroomReadings`-collectie) is daarom volledig verwijderd vóór er ooit een echte test mee gebeurd is. Live bevestigd werkend door Johan meteen na oplevering ("dat ziet er zeer goed uit!") — het account had dus al toegang tot de Meter-level Data API, geen support-aanvraag nodig geweest.
> Vervolg in v0.39.0: extra grafiek "Netstroom vandaag" toegevoegd, eerst als per-minuut geëxporteerde energie (`energy_level=minutely`) analoog aan Zonnestroom's "Vermogen vandaag" — dat gaf in de praktijk een HTTP 500 terug (APsystems ondersteunt "minutely" blijkbaar niet betrouwbaar voor de meter, ondanks dat het gedocumenteerd staat).
> Vervolg in v0.40.0: "Netstroom vandaag" daarom herbouwd als een per-uur staafdiagram (`energy_level=hourly`) — hergebruikt exact hetzelfde, al bevestigd werkende endpoint/response als de Maand/Jaar-historie hierboven, enkel voor vandaag. De `casaAngelaMeterToday`-Cloud Function (specifiek voor `minutely`) is weer verwijderd.

**Als** Johan of Tinneke **wil ik** ook het netstroomverbruik ("exported") zien **zodat** ik een volledig beeld heb van alle nutsvoorzieningen op één plek.

**Acceptatiecriteria:**
- Given de Netstroom-sub-tab, then toont die een Dag/Maand/Jaar-historiek van het "exported"-veld (kWh) — exact hetzelfde patroon als de Historie van Zonnestroom (US-6.4): Maand/Dag aangevuld tot de volledige periode, Jaar toont enkel de jaren met data.
- Given dezelfde APsystems-gegevens (App ID/Secret/SID/EID) als al ingevuld bij Zonnestroom > Instellingen, then heeft Netstroom geen eigen instellingenscherm nodig.
- Given de sub-tab voor het eerst geopend wordt binnen deze sessie, then laadt de Maand-historie automatisch (lazy, niet al bij het openen van Zonnestroom).
- Given diezelfde sub-tab, then toont die ook een "Netstroom vandaag"-grafiek: een staafdiagram met het geëxporteerde vermogen per uur van vandaag (0u t.e.m. 23u).
- Given een fout of ontbrekende data bij het laden van "vandaag", then toont de tab een duidelijke statustekst i.p.v. stil niets te tonen.

**Technische notities:** Cloud Function `casaAngelaMeterEnergy` (onCall) — GET naar `/installer/api/v2/systems/{sid}/devices/meter/period/{eid}` (Meter-level Data API, zelfde `buildHeaders`-ondertekening als de bestaande Nuts-calls, enkel een ander pad-namespace dan `/user/api/v2/...`), `energy_level` ∈ {hourly, daily, monthly, yearly} — geeft `{time, produced, consumed, imported, exported}`-arrays terug, waarvan enkel `exported` gebruikt wordt. `renderNetstroomHistory(level)` is vrijwel een letterlijke kopie van `renderNutsHistory`, incl. hergebruik van `logic.padSeriesValues`/`logic.daysInMonth`; `renderNetstroomTodayChart()` roept dezelfde Cloud Function aan met `level: "hourly"` en `dateRange` = vandaag, en padt het resultaat tot 24 uur via `logic.padSeriesValues(values, 24)`. Geen eigen Firestore-collectie of -document nodig (geen `netstroomReadings`, geen `settings/emaSession`).

---

## Nog te bevestigen / open punten

- Excel-voorbeeld met bestaande boekingsdata: nog te ontvangen indien gewenst als aanvulling op de hierboven afgesproken velden.
- **Nuts (Epic 6)**: pas de "Casa Angela"-tab in de Huishouden-app verwijderen zodra deze hier volledig getest en werkend bevonden is (met échte APsystems-credentials en een échte testmail/forceer-check).
