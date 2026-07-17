# Casa Angela — Beheer-app — CLAUDE.md

De volledige architectuur (bestanden, exports, datastroom, Firestore-datamodel, Cloud Functions) staat in `ARCHITECTURE.md` en wordt hieronder automatisch mee ingeladen. Houd die actueel bij elke structurele wijziging (zie de architectuur-verificatieregel in de globale CLAUDE.md).

@ARCHITECTURE.md

## Project

Interne beheer-app (géén publieke website — dat is `../casa-angela-v1.html`, een apart, statisch marketingpagina-project) voor de verhuur van vakantiehuis Casa Angela (Gata de Gorgos, Spanje). Twee gebruikers: Johan en Tinneke, beiden met gelijke rechten, aanloggen via Google.

## Technologie

- Eén enkel HTML-bestand: `index.html` (alle UI + app-JS inline, zoals Gezondheid)
- Pure functies in een apart bestand: `logic.js` (geen DOM, geen browser-API's, geen Firebase)
- Tests in: `logic.test.js` (draaien met `node --test logic.test.js`)
- Geen frameworks, geen build tools, geen npm packages in de frontend
- `functions/` — Cloud Functions (Node 22, ESM) enkel voor de iCal-sync met Airbnb/Booking.com

## Opslag

- Eigen Firebase-project, **volledig los** van portfolio-tracker-jr / gezondheid-jr / huishouden: voorstel projectnaam `casa-angela-jr` (te bevestigen/aan te passen door Johan)
- **Geen per-uid data-isolatie** zoals in de andere apps: dit is een gedeelde app voor twee gebruikers. Data leeft in gedeelde top-level collecties (`pricing`, `bookings`, `checklists`, `settings`, `syncedBlocks`), niet onder `users/{uid}/...`
- Firestore security rules: enkel lezen/schrijven toegestaan als `request.auth.token.email` één van de twee toegelaten adressen is (Johan + Tinneke — **e-mailadres van Tinneke nog aan te vullen**)
- Nooit localStorage, sessionStorage of window.storage gebruiken voor app-data (wel toegestaan voor pure UI-state zoals "laatst bekeken maand")

## Taal

- Interface: Nederlands
- Code en commentaar: Engels

## Ontwikkelproces

- Werk zoveel mogelijk volgens TDD: eerst een falende test in `logic.test.js`, dan implementatie in `logic.js`, dan refactor
- `logic.js` exporteert alleen pure functies — geen `window`, `document` of `fetch`
- Bij elke wijziging (feature, refactor of bugfix) wordt `user-stories.md` bijgewerkt: status van bestaande stories, nieuwe stories toegevoegd, afgewerkte stories afgevinkt
- Bij elke wijziging wordt de versie verhoogd volgens SemVer (MAJOR.MINOR.PATCH); versienummer en changelog zichtbaar in de UI (zie US-0.3)
- Implementatievolgorde: epic per epic, van boven naar onder in `user-stories.md`

## Belangrijke regels

- Nooit boekings- of prijsdata wissen zonder expliciete bevestiging van de gebruiker
- Bij twijfel: eerst testen schrijven, dan implementeren
- Visuele stijl volgt de Casa Angela-sfeer (terracotta/olijf/azuur/zand — zie kleurenpalet in `ARCHITECTURE.md`), maar blijft functioneel/clean voor dagelijks gebruik — geen marketing-fluff
- Mobile-first: kalendercellen en knoppen moeten met de duim bedienbaar zijn; test elke feature ook op smal scherm
