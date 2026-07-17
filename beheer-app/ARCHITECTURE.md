# ARCHITECTURE — Casa Angela Beheer-app

> Auto-ingeladen via `@ARCHITECTURE.md` in `CLAUDE.md`. Houd deze kaart actueel bij elke structurele wijziging (nieuw bestand, nieuwe/verplaatste functie, gewijzigde laadvolgorde, nieuw Firestore-pad of -veld, nieuwe dependency, nieuwe Cloud Function). Zie de architectuur-verificatieregel in de globale CLAUDE.md.

Vanilla-JS single-page PWA op Firebase Hosting (geen build/bundler): prijskalender, boekingenbeheer, beschikbaarheidskalender en aankomst/vertrek-checklists voor vakantiehuis Casa Angela. **Eigen** Firebase-project `casa-angela-jr`, volledig los van de andere projecten. Gedeelde data tussen twee gebruikers (Johan + Tinneke) i.p.v. per-uid isolatie. iCal-sync met Airbnb/Booking.com in een Cloud Function.

## Bestanden

| Bestand | Verantwoordelijkheid | Belangrijkste exports/functies | Laadwijze |
|---|---|---|---|
| `index.html` | Volledige UI + alle app-JS inline in één `<script type="module">` (Google-login + whitelist-check, navigatie, kalender, boekingen, checklists, dialogs), **`CHANGELOG`-array** | `onAuthStateChanged`-gestuurde login/denied/app-schermen (`showScreen`), vaste navigatiebalk binnen `app-screen` met 4 tabs Kalender/Boekingen/Checklist aankomst/Checklist vertrek (`showTab`, Boekingen/Checklists nog placeholder-content) — onderste tab-balk op mobiel, linker zijbalk vanaf 768px breed (`.app-body`/`.tab-content` layout, media query), herbruikbaar `.spinner`/`.error-message` patroon voor actie-feedback, Prijskalender: `renderCalendar` (bouwt grid via `logic.buildMonthGrid`, toont prijs via `logic.computeDisplayPrice(priceMode, ...)`), prijstype-toggle (Airbnb/Booking/Rechtstreeks/Vrienden, `.price-mode-btn`) — enkel in Airbnb-modus is een dag klikbaar om te bewerken, anders toont `#mode-hint` een tijdelijke melding, `loadPricingForMonth`/`goToMonth` (Firestore-query op `pricing` voor de zichtbare maand, maandnavigatie rendert direct met lege cache en herlaadt async), `openPriceDialog` + prijs-dialog (`setDoc` naar `pricing/{date}`), periode-selectie voor bulk-invoer (`#period-toggle`, enkel actief/zichtbaar in Airbnb-modus): `handleSelectionClick` (eerste tik = startdag, highlight via `.selected`; tweede tik = einddag) → `openBulkPriceDialog` toont het aantal dagen + `logic.getDateRange`-resultaat, `writeBatch` schrijft alle `pricing/{date}`-docs in één keer; in diezelfde dialog kopieert "Kopieer prijzen van vorig jaar" de Airbnb-prijzen van exact een jaar eerder (`logic.getPreviousYearDate` per dag, Firestore-query op die periode, dagen zonder prijs vorig jaar blijven ongewijzigd), met een tijdelijke `#copy-feedback`-melding ("X van de Y dagen gekopieerd, Z hadden geen prijs vorig jaar"), `loadFormulaSettings`/`openFormulaDialog` + prijsformule-dialog (Booking/Rechtstreeks/Vrienden factor+aftrek, `setDoc` naar `settings/pricingFormula`, live rekenvoorbeeld via `logic.computeDerivedPrice`), Boekingen: `loadBookings` (volledige `bookings`-collectie, eenmalig bij login), `renderBookingsList` (gesorteerd op `dateFrom`, lege staat via `#bookings-empty`), `openBookingDialog` (leeg voor nieuw, vooringevuld voor bewerken) + boekingsformulier-dialog met live `#booking-nights`-preview via `logic.nightsBetween`, opslaan via `logic.validateBooking` (blokkeert + toont `#booking-error` bij ongeldige invoer) → `addDoc`/`setDoc` naar `bookings/{id}` (`createdBy`/`createdAt` blijven behouden bij bewerken), `openDeleteBookingDialog` + bevestigingsdialoog → `deleteDoc` (geen apart statusveld, verwijderd = weg); vóór het opslaan checkt `logic.overlapsExistingBooking` tegen `bookings` + `syncedBlocks` (dat laatste voorlopig een lege array tot US-2.3) — bij een overlap toont `#booking-warning` welke boeking(en)/blok(ken) botsen en verandert de knop naar "Toch opslaan"; nogmaals klikken (`overlapConfirmed`) forceert het opslaan alsnog, een datumwijziging reset die bevestiging, nog te bouwen: `renderBeschikbaarheid`, `renderChecklist`, `loadSyncedBlocks`, `loadChecklists`, JPG-export (Canvas API), CF-callable voor sync-trigger | HTML parse → `logic.js` (blocking) → Firebase-module |
| `logic.js` | **Pure state/validatie/rekenhelpers** (geen Firebase/UI), gedeeld met tests | `getVersion`, `isAllowedEmail(email, allowedEmails)`, `buildMonthGrid(year, month)` (maandgrid, weken van 7 met maandag als eerste dag, `null`-padding voor dagen buiten de maand), `computeDerivedPrice(airbnbPrice, formula)` (= `airbnbPrice * factor + offset`, `null` bij ontbrekende Airbnb-prijs), `computeDisplayPrice(mode, airbnbPrice, formulaSettings)` (raw prijs in `'airbnb'`-modus, anders `computeDerivedPrice` met de formule van die modus), `getDateRange(dateA, dateB)` (alle ISO-datums tussen twee data, inclusief, ongeacht volgorde), `getPreviousYearDate(date)` (zelfde maand/dag, jaar -1, als string-transformatie), `nightsBetween(dateFrom, dateTo)`, `validateBooking(booking)` (verplicht: dateFrom, dateTo, name, platform; dateTo moet na dateFrom liggen — geeft `{valid, errors}` terug), `overlapsExistingBooking(newBooking, existingBookings, syncedBlocks)` (half-open intervallen — checkout dag = checkin dag overlapt niet; sluit de eigen `id` uit bij bewerken; controleert bookings én syncedBlocks), nog te bouwen: `buildOccupancyMap(bookings, syncedBlocks)`, `dayOccupancyState(date, occupancyMap)` (vrij / halve-dag-aankomst / halve-dag-vertrek / volledig bezet), `parseIcalEvents`, `mergeSyncedBlocks`, `validateChecklistItem`, `reorderChecklistItems`, `toggleChecklistItem`, `resetChecklist` | klassiek `<script src="logic.js">` (eerst, blocking) → helpers globaal |
| `logic.test.js` | Unit-tests voor `logic.js` | `node --test` | niet gedeployed |
| `functions/index.js` | Cloud Functions (Node 22, ESM): iCal-sync | `syncIcalFeeds` (onSchedule, bv. elke 3u), `syncIcalFeedsNow` (onCall, handmatige trigger vanuit UI) | Node 22 |
| `firestore.rules` | Toegang beperkt tot de twee toegelaten e-mailadressen (geen per-uid model) | — | — |
| `firebase.json` | Hosting- + Firestore-rules-config voor `firebase deploy` | — | — |
| `.firebaserc` | Koppelt de map aan Firebase-project `casa-angela-jr` (default) | — | — |
| `manifest.json`, `icon-*.png` | PWA (standalone, geen service worker — zoals Gezondheid) | — | — |

Geen losse CSS-bestand nodig voor v1 — CSS inline in `index.html` (CSS-variabelen voor het Casa Angela kleurenpalet, zie onder). Versie-string in `logic.js` (`getVersion()`), met assertie in `logic.test.js`.

## Kleurenpalet (huisstijl, hergebruikt uit de publieke website `../casa-angela-v1.html`)

```
--terracotta: #C4654A     --terracotta-light: #E8A790
--olive: #7A8B5C           --olive-dark: #5A6B3C
--azure: #4A90A4           --azure-light: #A8D4E6
--sand: #F5EBE0            --sand-dark: #E6D5C3
--cream: #FFFBF5           --charcoal: #2C2C2C
```
Gebruik: terracotta voor primaire actieknoppen en actieve kalender-toggle, olijf/azuur als accenten (bv. Beschikbaarheid-knop = azuur, geboekt-status = terracotta), zand/cream als achtergronden. Functioneel/clean blijven — geen fonts/animaties van de marketingpagina overnemen, wel dezelfde kleuren en warme sfeer.

## Communicatie & datastroom

Laadvolgorde is load-bearing: `logic.js` eerst (helpers globaal), dan de Firebase-module.

```
Login (Google, e-mail-whitelist check) -> Promise.all([loadPricing(maand), loadBookings,
        loadSyncedBlocks, loadChecklists, loadFormulaSettings]) -> cacheX

Prijskalender:  klik/select dag(en) -> invoer Airbnb-prijs -> Firestore write (pricing/{date})
                -> logic.computeDerivedPrice() ver­taalt naar Booking/Rechtstreeks/Vrienden bij weergave
                (afgeleide prijzen worden NIET opgeslagen, enkel live berekend uit airbnbPrice + formule)

Boekingen:      CRUD-form -> validateBooking() -> Firestore write (bookings/{id})
                -> buildOccupancyMap() -> Beschikbaarheidskalender + Prijskalender delen dezelfde
                   kalendercomponent (5 toggle-knoppen: Airbnb/Booking/Rechtstreeks/Vrienden/Beschikbaarheid)
                -> JPG-export (2 varianten) via Canvas API, client-side, geen Cloud Function nodig

iCal-sync:      onSchedule syncIcalFeeds -> haalt icalFeeds/{airbnb|booking}.url op
                -> parseIcalEvents() -> mergeSyncedBlocks() -> upsert syncedBlocks/{id}
                (enkel periode-blokkering, geen naam/prijs) -> merged in occupancyMap

Checklists:     toggle item -> Firestore update (checklists/{aankomst|vertrek}.items[i].checked)
                reset-knop -> alle checked = false
```

## Datamodel (Firestore — gedeeld, geen per-uid pad)

| Pad | Vorm |
|---|---|
| `pricing/{YYYY-MM-DD}` | `{ date, airbnbPrice }` — enkel de Airbnb-basisprijs wordt opgeslagen |
| `settings/pricingFormula` | `{ booking: {factor, offset}, direct: {factor, offset}, friends: {factor, offset} }` — afgeleide prijs = `airbnbPrice * factor + offset`, per type instelbaar via een instellingenscherm |
| `bookings/{id}` | `{ dateFrom, dateTo, nights, name, language, phone, adultsCount, childrenCount, remark, platform, price, createdBy, createdAt }` — geen aparte statusveld; annuleren = document verwijderen |
| `syncedBlocks/{id}` | `{ source: 'airbnb'|'booking', dateFrom, dateTo, icalUid }` — automatisch gesynchroniseerde bezette periodes zonder gastgegevens, apart van `bookings` |
| `icalFeeds/{airbnb|booking}` | `{ url, lastSyncedAt }` |
| `checklists/{aankomst|vertrek}` | `{ items: [{ id, text, checked, order }] }` |
| `meta/allowedUsers` | `{ emails: ['johan.rodeyns@gmail.com', 'tinbogaerts@gmail.com'] }` (spiegel van de Firestore-rule, voor UI-weergave "ingelogd als") — **nog niet aangemaakt**, whitelist zit voorlopig hardcoded in `firestore.rules` + `index.html` (US-0.2) |

## Cloud Functions (`functions/`, Node 22)

- `syncIcalFeeds` (onSchedule, bv. `0 */3 * * *`) — haalt beide iCal-feeds op, parsed, upsert `syncedBlocks`.
- `syncIcalFeedsNow` (onCall) — zelfde logica, handmatig getriggerd vanuit een "Nu synchroniseren"-knop in de UI.

Deps: `node-ical` (of vergelijkbare lichte iCal-parser) in `functions/`. Geen secrets nodig (iCal-URL's van Airbnb/Booking.com zijn publieke, niet-geïndexeerde links die de gebruiker zelf aanlevert via het instellingenscherm).

## Externe dependencies

Firebase SDK (modular: Auth, Firestore, Functions) via CDN. Geen Chart.js nodig (geen grafieken in v1). PWA via `manifest.json` (geen service worker, zoals Gezondheid) — installeerbaar op GSM-startscherm.

## Versie / changelog / tests / deploy

- **Versie**: `getVersion()` in `logic.js` (assertie in `logic.test.js`), getoond via versie-knop; `CHANGELOG`-array in `index.html`.
- **Tests**: `node --test logic.test.js` (root, niet gedeployed).
- **Deploy**: `firebase deploy --only hosting --project casa-angela-jr` en `firebase deploy --only functions --project casa-angela-jr`.
