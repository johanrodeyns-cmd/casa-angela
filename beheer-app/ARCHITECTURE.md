# ARCHITECTURE — Casa Angela Beheer-app

> Auto-ingeladen via `@ARCHITECTURE.md` in `CLAUDE.md`. Houd deze kaart actueel bij elke structurele wijziging (nieuw bestand, nieuwe/verplaatste functie, gewijzigde laadvolgorde, nieuw Firestore-pad of -veld, nieuwe dependency, nieuwe Cloud Function). Zie de architectuur-verificatieregel in de globale CLAUDE.md.

Vanilla-JS single-page PWA op Firebase Hosting (geen build/bundler): prijskalender, boekingenbeheer, beschikbaarheidskalender en aankomst/vertrek-checklists voor vakantiehuis Casa Angela. **Eigen** Firebase-project `casa-angela-jr` op het **Blaze-plan** (nodig voor uitgaande netwerk-requests vanuit Cloud Functions), volledig los van de andere projecten. Gedeelde data tussen twee gebruikers (Johan + Tinneke) i.p.v. per-uid isolatie. iCal-sync met Airbnb/Booking.com in een Cloud Function.

## Bestanden

| Bestand | Verantwoordelijkheid | Belangrijkste exports/functies | Laadwijze |
|---|---|---|---|
| `index.html` | Volledige UI + alle app-JS inline in één `<script type="module">` (Google-login + whitelist-check, navigatie, kalender, boekingen, checklists, dialogs), **`CHANGELOG`-array** | `onAuthStateChanged`-gestuurde login/denied/app-schermen (`showScreen`), vaste navigatiebalk binnen `app-screen` met 4 tabs Kalender/Boekingen/Checklist aankomst/Checklist vertrek (`showTab`, Boekingen/Checklists nog placeholder-content) — onderste tab-balk op mobiel, linker zijbalk vanaf 768px breed (`.app-body`/`.tab-content` layout, media query), herbruikbaar `.spinner`/`.error-message` patroon voor actie-feedback, Prijskalender: `renderCalendar` (bouwt grid via `logic.buildMonthGrid`, toont prijs via `logic.computeDisplayPrice(priceMode, ...)`), prijstype-toggle (Airbnb/Booking/Rechtstreeks/Vrienden **+ Beschikbaarheid**, `.price-mode-btn`, Beschikbaarheid-knop azuur i.p.v. terracotta als actief) — enkel in Airbnb-modus is een dag klikbaar om te bewerken, in de 3 afgeleide prijsmodi toont `#mode-hint` een tijdelijke melding, in Beschikbaarheid-modus toont elke dag de gastnaam (of "Vrij"/"Bezet" — dat laatste bij een gesynchroniseerd blok zonder ingevulde boeking, `logic.dayDisplayLabel`, meerdere namen bij een eenzelfde-dag-turnover gescheiden door " / ", lange namen afgekapt via CSS `text-overflow: ellipsis` + `title`-tooltip; `.cal-day` heeft bewust `min-width: 0` om CSS Grid's `min-width: auto`-contentblowout te voorkomen) met diagonale CSS-gradient-split bij aankomst/vertrek (`logic.buildOccupancyMap` + `logic.dayOccupancyState` bepalen de staat — zand/terracotta resp. terracotta/zand op 135°, volledig terracotta bij een volledig bezette dag, ook bij een eenzelfde-dag-turnover), `openDayDetailDialog` (dag-klik in Beschikbaarheid-modus): bij precies 1 boeking en geen sync-blok meteen door naar `openBookingDialog` (geen tussenstap); bij meerdere entries (eenzelfde-dag-turnover) of een dag die enkel een `syncedBlock` heeft, eerst een dag-overzichtsdialoog (`#day-detail-dialog`) met een rij per boeking (klikbaar → `openBookingDialog`) en, bij een sync-only dag, de melding "Gesynchroniseerd via ... — nog geen boekingsdetails ingevuld" + een "Boeking aanvullen"-knop die een nieuw boekingsformulier opent vooringevuld met de datums/het platform van het blok, `loadPricingForMonth`/`goToMonth` (Firestore-query op `pricing` voor de zichtbare maand, maandnavigatie rendert direct met lege cache en herlaadt async), `openPriceDialog` + prijs-dialog (`setDoc` naar `pricing/{date}`), periode-selectie voor bulk-invoer (`#period-toggle`, enkel actief/zichtbaar in Airbnb-modus): `handleSelectionClick` (eerste tik = startdag, highlight via `.selected`; tweede tik = einddag) → `openBulkPriceDialog` toont het aantal dagen + `logic.getDateRange`-resultaat, `writeBatch` schrijft alle `pricing/{date}`-docs in één keer; in diezelfde dialog kopieert "Kopieer prijzen van vorig jaar" de Airbnb-prijzen van exact een jaar eerder (`logic.getPreviousYearDate` per dag, Firestore-query op die periode, dagen zonder prijs vorig jaar blijven ongewijzigd), met een tijdelijke `#copy-feedback`-melding ("X van de Y dagen gekopieerd, Z hadden geen prijs vorig jaar"), `loadFormulaSettings`/`openFormulaDialog` + prijsformule-dialog (Booking/Rechtstreeks/Vrienden factor+aftrek, `setDoc` naar `settings/pricingFormula`, live rekenvoorbeeld via `logic.computeDerivedPrice`), Boekingen: `loadBookings` (volledige `bookings`-collectie, eenmalig bij login), `renderBookingsList` (gesorteerd op `dateFrom`, lege staat via `#bookings-empty`), `openBookingDialog` (leeg voor nieuw, vooringevuld voor bewerken) + boekingsformulier-dialog met live `#booking-nights`-preview via `logic.nightsBetween`, opslaan via `logic.validateBooking` (blokkeert + toont `#booking-error` bij ongeldige invoer) → `addDoc`/`setDoc` naar `bookings/{id}` (`createdBy`/`createdAt` blijven behouden bij bewerken), `openDeleteBookingDialog` + bevestigingsdialoog → `deleteDoc` (geen apart statusveld, verwijderd = weg); vóór het opslaan checkt `logic.overlapsExistingBooking` tegen `bookings` + `syncedBlocks` — bij een overlap toont `#booking-warning` welke boeking(en)/blok(ken) botsen en verandert de knop naar "Toch opslaan"; nogmaals klikken (`overlapConfirmed`) forceert het opslaan alsnog, een datumwijziging reset die bevestiging; iCal-sync: `loadSyncedBlocks` (volledige `syncedBlocks`-collectie, eenmalig bij login) en `loadIcalFeeds`/`icalFeedsCache` (idem voor `icalFeeds/{airbnb|booking}`, cache-first zoals de andere dialogs — de dialoog toont meteen de gecachte staat, geen fetch-on-open), `openIcalSettingsDialog` + iCal-instellingendialoog (URL's opslaan via `setDoc`, "🔄 Nu synchroniseren"-knop roept de `syncIcalFeedsNow`-Cloud Function aan via `httpsCallable`, herlaadt daarna `syncedBlocks`+`icalFeeds`), `copyUpcomingBookings(button, feedbackEl, formatList, headerLabel)` (gedeelde helper, Boekingen-tab, geen periode-invoer): `logic.upcomingBookings(bookings, today)` (vandaag t/m de laatste boeking in de toekomst) → `formatList` bouwt de klembordtekst — `null` bij 0 boekingen toont een toast-melding i.p.v. te kopiëren, anders `navigator.clipboard.writeText()` met een korte header + bevestiging via dezelfde toast; "📋 Kopieer voor contactpersoon" (`logic.formatBookingsListForContact`, alle velden behalve klantprijs, `#copy-contact-feedback`) en "🌿 Kopieer voor tuinier" (`logic.formatBookingsListForGardener`, enkel datum + naam/taal, `#copy-tuinier-feedback`) hergebruiken beide dezelfde helper, "🔍 Synchronisatie-overzicht" (`#sync-check-dialog`): `logic.findUnmatchedSyncedBlocks`/`logic.findUnmatchedBookings` tonen twee lijsten (blokken zonder boeking, klikbaar → `openBookingDialog` vooringevuld zoals US-3.3's "aanvullen"; boekingen op Airbnb/Booking.com zonder exact overeenkomend blok, klikbaar → `openBookingDialog` om te bewerken) of "Alles komt overeen ✅" als beide leeg zijn, nog te bouwen: `renderChecklist`, `loadChecklists` | HTML parse → `logic.js` (blocking) → Firebase-module |
| `logic.js` | **Pure state/validatie/rekenhelpers** (geen Firebase/UI), gedeeld met tests | `getVersion`, `isAllowedEmail(email, allowedEmails)`, `buildMonthGrid(year, month)` (maandgrid, weken van 7 met maandag als eerste dag, `null`-padding voor dagen buiten de maand), `computeDerivedPrice(airbnbPrice, formula)` (= `airbnbPrice * factor + offset`, `null` bij ontbrekende Airbnb-prijs), `computeDisplayPrice(mode, airbnbPrice, formulaSettings)` (raw prijs in `'airbnb'`-modus, anders `computeDerivedPrice` met de formule van die modus), `getDateRange(dateA, dateB)` (alle ISO-datums tussen twee data, inclusief, ongeacht volgorde), `getPreviousYearDate(date)` (zelfde maand/dag, jaar -1, als string-transformatie), `nightsBetween(dateFrom, dateTo)`, `validateBooking(booking)` (verplicht: dateFrom, dateTo, name, platform; dateTo moet na dateFrom liggen — geeft `{valid, errors}` terug), `overlapsExistingBooking(newBooking, existingBookings, syncedBlocks)` (half-open intervallen — checkout dag = checkin dag overlapt niet; sluit de eigen `id` uit bij bewerken; controleert bookings én syncedBlocks), `parseIcalEvents(icsText)` (dependency-vrije VEVENT-parser: BEGIN:VEVENT/UID/DTSTART/DTEND/END:VEVENT, ondersteunt zowel datum- als datetime-waarden, negeert onvolledige events en niet-VEVENT-blokken zoals VTIMEZONE), `mergeSyncedBlocks(existingBlocks, parsedEvents, source)` (berekent de volledige gewenste lijst voor één bron — volledige vervanging, geen diff — deterministisch `id` per `source-uid`), `buildOccupancyMap(bookings, syncedBlocks)` (Map<datum, entry[]> — elke dag in `getDateRange(dateFrom, dateTo)` per boeking/blok, meerdere entries per dag mogelijk bij eenzelfde-dag-turnover), `dayOccupancyState(date, occupancyMap)` (`'vrij' | 'aankomst' | 'vertrek' | 'bezet'` — een dag met zowel een vertrek- als aankomst-entry telt als `'bezet'`, want beide dagdelen zijn dan bezet), `upcomingBookings(bookings, today)` (filtert op `dateTo >= today` — lopende én toekomstige boekingen, geen bovengrens — en sorteert op `dateFrom`), `formatBookingsListForContact(bookings, formatDateRange)` (bouwt de klembordtekst voor WhatsApp, géén klantprijs; `formatDateRange` wordt meegegeven door de caller zodat deze functie locale-onafhankelijk blijft; `null` bij een lege lijst), `formatBookingsListForGardener(bookings, formatDateRange)` (idem, maar enkel datum + naam/taal), `findUnmatchedBookings(bookings, syncedBlocks)` (boekingen op platform `airbnb`/`booking` zonder een `syncedBlock` met exact dezelfde `dateFrom`/`dateTo`+bron — `direct`/`friends` worden nooit gerapporteerd), `findUnmatchedSyncedBlocks(bookings, syncedBlocks)` (het spiegelbeeld: blokken zonder exact overeenkomende boeking), `dayDisplayLabel(date, occupancyMap, state)` (gastnaam bij een geboekte dag, meerdere namen gescheiden door " / " bij een turnover, `'Bezet'` als er enkel een `syncedBlock` is zonder boeking, altijd `'Vrij'` bij state `'vrij'`), `weekdayAbbreviation(date)` (vaste lookup `Zo/Ma/Di/Wo/Do/Vr/Za`, geen `Intl` — matcht de weekdag-header van de kalender exact, gebruikt door `formatBookingDateRange` in `index.html`), nog te bouwen: `validateChecklistItem`, `reorderChecklistItems`, `toggleChecklistItem`, `resetChecklist` | klassiek `<script src="logic.js">` (eerst, blocking) → helpers globaal |
| `logic.test.js` | Unit-tests voor `logic.js` | `node --test` | niet gedeployed |
| `functions/index.js` | Cloud Functions (Node 22, ESM): iCal-sync — **eigen kopie** van `parseIcalEvents`/`mergeSyncedBlocks` (zie hieronder waarom) | `syncIcalFeeds` (onSchedule, elke 3u, `us-central1`), `syncIcalFeedsNow` (onCall, whitelist-check op `request.auth.token.email`, handmatige trigger vanuit UI), `syncSource(source)` (leest `icalFeeds/{source}.url`, `fetch()` + parse, volledige vervanging van `syncedBlocks` voor die bron via `writeBatch`, update `lastSyncedAt`) | Node 22 |
| `functions/package.json` | Cloud Functions dependencies (`firebase-admin`, `firebase-functions` — bewust **geen** iCal-library, zie hieronder) | — | `npm install` in `functions/` |
| `firestore.rules` | Toegang beperkt tot de twee toegelaten e-mailadressen (geen per-uid model) | — | — |
| `firebase.json` | Hosting- + Firestore-rules- + Functions-config voor `firebase deploy`; hosting-headers forceren `Cache-Control: no-cache` op html/js/json | — | — |
| `.firebaserc` | Koppelt de map aan Firebase-project `casa-angela-jr` (default) | — | — |
| `.gitignore` | Sluit `node_modules/` (o.a. `functions/node_modules`) en `.firebase/` uit van git | — | — |
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
Login (Google, e-mail-whitelist check) -> loadPricingForMonth, loadFormulaSettings, loadBookings,
        loadSyncedBlocks, loadIcalFeeds (elk apart, eigen catch — één mislukte load blokkeert de rest niet)

Prijskalender:  klik/select dag(en) -> invoer Airbnb-prijs -> Firestore write (pricing/{date})
                -> logic.computeDisplayPrice() vertaalt naar Booking/Rechtstreeks/Vrienden bij weergave
                (afgeleide prijzen worden NIET opgeslagen, enkel live berekend uit airbnbPrice + formule)

Boekingen:      CRUD-form -> validateBooking() -> overlapsExistingBooking()-check (bookings + syncedBlocks,
                waarschuwing + expliciete "Toch opslaan"-bevestiging bij overlap) -> Firestore write (bookings/{id})
                -> buildOccupancyMap() + dayOccupancyState() voeden de Beschikbaarheidskalender (Epic 3, 5e
                   toggle op dezelfde kalendercomponent als de Prijskalender, vrij/bezet/aankomst/vertrek)
                -> dag-klik in Beschikbaarheid-modus opent boekingsdetails (rechtstreeks of via een dag-
                   overzicht bij een turnover/sync-only dag)
                -> Kopiëren voor contactpersoon/tuinier: één klik, geen periode-invoer -> upcomingBookings()
                   (vandaag t/m laatste toekomstige boeking) -> formatBookingsListForContact() of
                   -ForGardener() -> navigator.clipboard.writeText() (platte tekst, geen JPG/Canvas,
                   voor plakken in WhatsApp)

iCal-sync:      Instellingendialoog (URL's -> icalFeeds/{airbnb|booking}) + "Nu synchroniseren"-knop
                -> httpsCallable syncIcalFeedsNow, of periodiek onSchedule syncIcalFeeds (elke 3u)
                -> functions/index.js: fetch(url) -> parseIcalEvents() -> mergeSyncedBlocks() ->
                   writeBatch (volledige vervanging per bron) upsert syncedBlocks/{source-uid}
                (enkel periode-blokkering, geen naam/prijs) -> client herlaadt syncedBlocks nadien
                -> meegenomen in overlapsExistingBooking(); nog te bouwen: in occupancyMap (Epic 3)

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

## Cloud Functions (`functions/`, Node 22, regio `us-central1`)

- `syncIcalFeeds` (onSchedule, elke 3u) — haalt beide iCal-feeds op, parsed, vervangt `syncedBlocks` per bron volledig.
- `syncIcalFeedsNow` (onCall) — zelfde logica, handmatig getriggerd vanuit de "🔄 Nu synchroniseren"-knop; controleert zelf `request.auth.token.email` tegen de whitelist (Admin SDK omzeilt Firestore rules, dus deze check gebeurt in de functie zelf).

**Bewust geen `node-ical`/`axios`**: die combinatie bleek bij het laden onherstelbaar vast te hangen op deze ontwikkelmachine (project staat op een NAS-gekoppelde netwerkschijf; `node-ical` require't `axios` onvoorwaardelijk, en die hing zowel via CJS `require` als ESM `import`, ongeacht axios-versie). Dat blokkeerde `firebase deploy`'s lokale "analyseer source code"-stap (vaste 10s-timeout, te overschrijven met env var `FUNCTIONS_DISCOVERY_TIMEOUT=<seconden>` — nuttig als toekomstige deploys op deze machine traag blijven door de netwerkschijf). Oplossing: eigen minimale VEVENT-parser (`parseIcalEvents`, zie `logic.js`) + Node's ingebouwde `fetch()`, zonder externe iCal-dependency. Deps in `functions/package.json`: enkel `firebase-admin` + `firebase-functions`. Geen secrets nodig (iCal-URL's van Airbnb/Booking.com zijn publieke, niet-geïndexeerde links die de gebruiker zelf aanlevert via het instellingenscherm).

## Externe dependencies

Client: Firebase SDK (modular: Auth, Firestore, **Functions** — `httpsCallable` voor `syncIcalFeedsNow`) via CDN. Geen Chart.js nodig (geen grafieken in v1). PWA via `manifest.json` (geen service worker, zoals Gezondheid) — installeerbaar op GSM-startscherm. Server: `functions/` heeft een eigen `package.json`/`node_modules` (`firebase-admin`, `firebase-functions`) — enige plek in dit project met npm-dependencies.

## Versie / changelog / tests / deploy

- **Versie**: `getVersion()` in `logic.js` (assertie in `logic.test.js`), getoond via versie-knop; `CHANGELOG`-array in `index.html`.
- **Tests**: `node --test logic.test.js` (root, niet gedeployed).
- **Deploy hosting**: `firebase deploy --only hosting --project casa-angela-jr`.
- **Deploy functions**: `firebase deploy --only functions --project casa-angela-jr` (vereist Blaze-plan). Eerst `npm install` in `functions/`. Op deze machine (netwerkschijf) kan de lokale source-analyse traag zijn — zet zo nodig `$env:FUNCTIONS_DISCOVERY_TIMEOUT="180"` (PowerShell) vóór de deploy-aanroep.
