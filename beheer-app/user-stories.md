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
**Als** gebruiker **wil ik** een vaste navigatiebalk **zodat** ik altijd snel tussen Kalender, Boekingen en Checklists kan schakelen.

**Acceptatiecriteria:**
- Given elke pagina, then is een navigatiebalk zichtbaar met minstens: Kalender, Boekingen, Checklist aankomst, Checklist vertrek.
- Given een klik op een navigatie-item, then schakelt de UI naar de juiste sectie zonder herladen van de pagina.
- Given de huidige sectie, then is het bijhorende navigatie-item visueel gemarkeerd als actief.
- Given een smal (mobiel) scherm, then blijft de navigatie bruikbaar (bv. onderste tab-balk of hamburgermenu) met vingervriendelijke tapgebieden.

---

### US-0.5 ☑ Visueel ontwerp & huisstijl (M) — v0.5.0
**Als** gebruiker **wil ik** een app die er verzorgd en herkenbaar uitziet **zodat** het gebruik ervan aangenaam is, zowel op de computer als op mijn GSM.

**Acceptatiecriteria:**
- Given het kleurenpalet van de publieke Casa Angela-website (terracotta, olijf, azuur, zand), then gebruikt de beheer-app dezelfde kleuren consequent (CSS-variabelen), zonder de marketing-opsmuk (geen grote hero-afbeeldingen, geen sierlijke lettertypes) over te nemen.
- Given elk scherm, when bekeken op een smartphone (viewport ≥ 360px breed), then zijn alle knoppen, kalendercellen en formuliervelden vlot met de duim te bedienen (minstens 44×44px tapgebied).
- Given elk scherm, when bekeken op een breed (desktop) scherm, then wordt de beschikbare ruimte functioneel benut (bv. kalender + zijpaneel), niet enkel uitgerekt.
- Given een actie (opslaan, verwijderen, synchroniseren), then geeft de UI duidelijke visuele feedback (laadindicator, bevestiging, foutmelding).

---

### US-0.6 ☑ Installeerbare PWA (S) — v0.6.0
**Als** gebruiker **wil ik** de app als icoon op mijn GSM-startscherm kunnen zetten **zodat** het aanvoelt als een echte app.

**Acceptatiecriteria:**
- Given `manifest.json` met naam, icoon en kleuren, when ik de site op mobiel open, then biedt de browser "Toevoegen aan startscherm" aan.
- Given de geïnstalleerde app, when ik ze open, then start ze zonder browser-adresbalk (standalone mode).

**Technische notities:** geen service worker nodig voor v1 (zoals Gezondheid) — enkel `manifest.json` + icons.

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

### US-2.4 ☐ JPG-export voor de contactpersoon ter plaatse (M)
**Als** Johan of Tinneke **wil ik** een overzicht van boekingen als afbeelding kunnen doorsturen naar onze contactpersoon ter plaatse **zodat** die weet wanneer gasten komen, zonder inzage in prijzen.

**Acceptatiecriteria:**
- Given een knop "Exporteren voor contactpersoon", then genereert de app een JPG met per boeking: Datum van, Datum tot, aantal nachten, naam, taal, telefoonnummer, aantal volwassenen, aantal kinderen, opmerking — zonder prijsinformatie.
- Given de gegenereerde JPG, then kan ik deze downloaden of rechtstreeks delen (Web Share API waar ondersteund, anders download).
- Given geen boekingen in de gekozen periode, then toont de export een duidelijke lege staat i.p.v. een lege/foutieve afbeelding.

**Technische notities:** client-side gegenereerd via Canvas API (geen Cloud Function nodig).

---

### US-2.5 ☐ JPG-export voor de tuinier (M)
**Als** Johan of Tinneke **wil ik** een beperktere afbeelding kunnen doorsturen naar de tuinman **zodat** die enkel weet wanneer het huis bezet is, zonder overbodige of privé-gegevens.

**Acceptatiecriteria:**
- Given een knop "Exporteren voor tuinier", then genereert de app een JPG met per boeking enkel: Datum van, Datum tot, naam, taal.
- Given dezelfde periode-selectie als US-2.4, then gebruikt deze export dezelfde geselecteerde periode/boekingen, maar met de beperkte veldenset.

---

## Epic 3 — Beschikbaarheidskalender

### US-3.1 ☑ Beschikbaarheid als 5e kalendermodus (M) — v0.15.0
> Enkel vrij/bezet per volledige dag (geen halve-dag-splitsing bij aankomst/vertrek — dat is US-3.2). Doorklikken naar boekingsdetails volgt in US-3.3, tot dan is een dag-klik in deze modus een no-op.
**Als** Johan of Tinneke **wil ik** in dezelfde kalender ook kunnen zien wanneer het huis verhuurd is **zodat** ik niet tussen aparte schermen moet wisselen.

**Acceptatiecriteria:**
- Given de bestaande 4 prijs-toggles (US-1.3), then is er een 5e knop "Beschikbaarheid" die dezelfde kalendercomponent hergebruikt.
- Given de Beschikbaarheid-modus, then toont elke dag-cel vrij/bezet op basis van `bookings` + `syncedBlocks` samen (`buildOccupancyMap()`).

---

### US-3.2 ☐ Halve-dag weergave voor aankomst/vertrek (M)
**Als** Johan of Tinneke **wil ik** visueel duidelijk zien dat een dag van aankomst of vertrek maar half bezet is **zodat** er geen misverstand ontstaat over in- en uitchecktijden.

**Acceptatiecriteria:**
- Given een boeking van bv. 10 tot 14, then toont dag 10 een diagonale split: voormiddag vrij (wit/zand), namiddag bezet (terracotta) — aankomst is in de namiddag.
- Given dezelfde boeking, then toont dag 14 een diagonale split: voormiddag bezet (terracotta), namiddag vrij — vertrek is vóór 10u 's ochtends.
- Given twee opeenvolgende boekingen (bv. huis vrij van 14 tot 14, nieuwe check-in dezelfde dag), then toont die dag zowel het vertrek- als aankomstpatroon correct (geen overlap-fout).

**Technische notities:** `dayOccupancyState(date, occupancyMap)` in `logic.js` retourneert een van `'vrij' | 'aankomst' | 'vertrek' | 'bezet'`, puur en getest op grensgevallen (eerste/laatste dag van de maand, opeenvolgende boekingen).

---

### US-3.3 ☐ Doorklikken naar boekingsdetails (M)
**Als** Johan of Tinneke **wil ik** vanuit de beschikbaarheidskalender snel de bijhorende boeking kunnen inkijken **zodat** ik niet apart moet zoeken.

**Acceptatiecriteria:**
- Given de Beschikbaarheid-modus, when ik op een bezette dag klik, then opent een detailweergave van de bijhorende boeking (alle velden uit US-2.1).
- Given een dag die enkel bezet is door een gesynchroniseerd blok (nog geen manuele boeking aangemaakt), then toont de detailweergave een duidelijke melding "Gesynchroniseerd via Airbnb/Booking.com — nog geen boekingsdetails ingevuld" met een snelkoppeling om de boeking aan te vullen.

---

## Epic 4 — Checklists

### US-4.1 ☐ Checklist-items beheren (CRUD) (M)
**Als** Johan of Tinneke **wil ik** zelf to-do's toevoegen, hernoemen en verwijderen in een aankomst- en een vertrek-checklist **zodat** de lijst aan onze eigen gewoontes aangepast blijft.

**Acceptatiecriteria:**
- Given twee gescheiden checklists ("Bij aankomst" en "Bij vertrek"), then kan ik in elk onafhankelijk items toevoegen, hernoemen en verwijderen.
- Given een gedeelde checklist (niet per persoon), then zien Johan en Tinneke exact dezelfde lijst en status.
- Given een wijziging door één van beiden, then is deze meteen zichtbaar voor de andere (Firestore realtime).

---

### US-4.2 ☐ Afvinken en resetten (M)
**Als** Johan of Tinneke **wil ik** items kunnen afvinken via mijn GSM en de lijst kunnen resetten voor een volgend bezoek **zodat** ik telkens opnieuw met een lege lijst start.

**Acceptatiecriteria:**
- Given een checklist-item, when ik erop tik, then wisselt het tussen afgevinkt en niet-afgevinkt, met duidelijke visuele feedback (bv. doorstreept + vinkje).
- Given een knop "Reset", when ik erop klik (met bevestiging), then worden alle items in die checklist teruggezet naar niet-afgevinkt, zonder de items zelf te verwijderen.
- Given een smal (mobiel) scherm, then zijn de vink-tapgebieden groot genoeg om vlot af te vinken zonder verkeerde items te raken.

---

### US-4.3 ☐ Items herordenen (S)
**Als** Johan of Tinneke **wil ik** de volgorde van checklist-items kunnen aanpassen **zodat** de lijst de logische volgorde van onze routine volgt (bv. eerst zwembad, dan luiken).

**Acceptatiecriteria:**
- Given een checklist, then kan ik items herordenen (slepen, of pijltjes omhoog/omlaag als drag-and-drop op mobiel lastig blijkt).
- Given een nieuwe volgorde, then wordt deze opgeslagen in het `order`-veld per item en blijft behouden na herladen.

---

## Epic 5 — Audit log

### US-5.1 ☐ Audit log van alle CRUD-acties (M)
**Als** Johan of Tinneke **wil ik** kunnen nagaan wie wat wanneer heeft aangemaakt, gewijzigd of verwijderd **zodat** er een sluitend overzicht is bij twijfel over een prijs, boeking of instelling (bv. "wie heeft die prijs veranderd?").

**Acceptatiecriteria:**
- Given een schrijf-actie (aanmaken, wijzigen of verwijderen) op eender welke gegevensverzameling (`pricing`, `bookings`, `settings/pricingFormula`, `checklists`, `syncedBlocks`), when die actie wordt uitgevoerd, then wordt een audit-record aangemaakt met minstens: wie (e-mailadres van de ingelogde gebruiker), wat (welke verzameling/document en welk type actie: aanmaken/wijzigen/verwijderen), wanneer (tijdstip) en de betrokken gegevens (nieuwe waarde, en bij wijzigen/verwijderen liefst ook de vorige waarde).
- Given een audit-record, then wordt het gekoppeld aan het ingelogde account op basis van de servergevalideerde login, niet aan een vrij invoerbaar veld — een gebruiker kan zich niet voordoen als iemand anders.
- Given de audit-log, then is die enkel-toevoegen (append-only): niemand kan via de app een bestaand audit-record wijzigen of verwijderen, ook niet via de Firestore security rules.
- Given Johan of Tinneke, then kan de audit-log geraadpleegd worden (minstens ruwe lijst, chronologisch of per document) — het exacte overzichtsscherm is nader te bepalen, de kern van deze story is dat de gegevens sluitend worden vastgelegd.

**Technische notities:** aangezien Firestore-triggers (Cloud Functions) geen betrouwbare "wie"-informatie meekrijgen bij een documentwijziging, ligt de meest praktische aanpak voor deze client-only architectuur bij het wegschrijven van elk audit-record cliëntzijde, in dezelfde `writeBatch` als de eigenlijke data-wijziging (atomisch: of beide slagen, of geen van beide) — voorstel: collectie `auditLog/{id}` met velden `{ collection, docId, action: 'create'|'update'|'delete', email, timestamp: serverTimestamp(), before, after }`. Firestore security rules: `create` toegestaan voor de twee toegelaten e-mailadressen, `update`/`delete` nooit toegestaan (ook niet voor de eigenaar). Raakt in principe elke bestaande en toekomstige save/delete-handler in `index.html` — hoe eerder gebouwd, hoe minder er retroactief moet worden aangepast.

---

## Nog te bevestigen / open punten

- Excel-voorbeeld met bestaande boekingsdata: nog te ontvangen indien gewenst als aanvulling op de hierboven afgesproken velden.
