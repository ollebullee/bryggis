# Bryggis · kaffeabonnemang för fristående kaféer

Det här repot innehåller teamets klickbara frontenddemo. Gränssnittet heter **Bryggis**. Namnet är ett arbetsnamn tills domän och varumärke är kontrollerade.

**Status: lokal demo, inte en tjänst för riktiga betalningar eller beställningar.**

## Kör lokalt

Du behöver Python 3 för den lokala webbservern och Node.js 22 eller senare för testerna. Appen har inga npm-beroenden och kräver inget byggsteg.

```sh
python3 -m http.server 5173 --directory dist --bind 127.0.0.1
```

Öppna [kundvyn](http://localhost:5173/#hem) och [personalvyn](http://localhost:5173/#personal) i två flikar i **samma webbläsarprofil**. På Windows kan Python-kommandot behöva börja med `py -3` i stället för `python3`.

```sh
npm test
npm run check
```

`npm install` behövs inte. Öppna sidan via webbservern; ES-modulerna fungerar inte som en vanlig dubbelklickad HTML-fil.

## Vad som fungerar

- Kundflöde med exempelabonnemang, sparad favorit, förbeställning, hämtning i kassan och orderstatus.
- Personalkö med sökning, filter och knappar för påbörjad, klar, ångra och hämtad.
- Lokal reservation av dagens kopp, avbokning av köad order, öppettider och daggräns i Europe/Stockholm.
- Kaféinställningar, historik, CSV-export och återställning av demodata.
- Grön hämtbekräftelse med namn, klocka, animation och två minuters giltighet.
- Synk mellan flikar på samma origin via `localStorage`, Storage Events och BroadcastChannel. Web Locks används där de stöds.
- Manifest, appikoner och service worker för att prova webbappen på hemskärmen och dess offlinecache.

Använd exempeluppgifter. Du kan återställa demon under **Konto**. Beställning och hämtning följer kaféets lokala öppettider; dessa kan ändras i personalens inställningar.

## Vad som är simulerat eller saknas

| Område | Status i den här koden |
| --- | --- |
| Inloggning och personalbehörighet | Saknas. Bytet mellan kund- och personalvy är en demoknapp. |
| Synk mellan två telefoner | Saknas. En annan enhet eller webbläsarprofil har egen data. |
| Abonnemang och betalning | Lokal simulering. Ingen Stripe-koppling, debitering eller insamling av kortuppgifter. |
| Dagskvot och hämtbekräftelse | Kontrolleras lokalt och går att manipulera. Ingen säker serverkontroll. |
| Förnyelse och uppsägning | Simuleras med lokala datum. Ingen betaltjänst påverkas. |
| Riktiga kafébeställningar | Skickas inte till ett kafé. Kön innehåller exempeldata. |
| Avbokning | Tillåts tills personalen markerar påbörjad. Förslaget om tidslås är ännu inte genomfört. |
| Utbud | Tre exempelplaner finns. Piloten ska ha ett bryggkaffeabonnemang per kafé. |
| Notiser | Ingen pushfunktion eller garanterat pling när telefonen är låst. |

Lokal lagring, lokal klocka och den animerade gröna skärmen är inga säkerhetsgränser. Offlinebeteendet är till för demon; en kommande pilot får inte godkänna nya uttag utan serverbekräftelse.

## QR-koden och iPhone

`dist/signup-qr.png` är en **registreringskod för kunden att skanna**, inte en kod personalen skannar i kassan. Den pekar fortfarande till den tidigare privata demoadressen:

`https://stammis-kaffe-olle.ollekallgren117.chatgpt.site/#bli-stammis`

Den adressen kan kräva ChatGPT-åtkomst. Att koden ligger på GitHub ändrar varken QR-länken eller åtkomsten. Skapa en ny registreringskod när pilotens kundadress är fastställd.

För att prova på iPhone: öppna en åtkomlig HTTPS-adress i Safari och välj **Dela → Lägg till på hemskärmen**. Manifest och service worker finns, men installation och offlinebruk behöver fortfarande verifieras på en fysisk iPhone. Ingen App Store-app eller TestFlight-version ingår.

## Filer och hosting

| Sökväg | Innehåll |
| --- | --- |
| `dist/index.html` | Appskal och metadata |
| `dist/styles.css` | Responsiv design |
| `dist/app.js` | Vyer, händelser och lokal lagring |
| `dist/domain.mjs` | Domänregler för den lokala demon |
| `dist/icons.mjs` | SVG-ikoner och illustration |
| `dist/sw.js`, `dist/manifest.webmanifest` | Cache och webbappmetadata |
| `tests/domain.test.mjs` | Nio tester av domänreglerna |
| `docs/PILOTPLAN.md` | Beslut, förslag och nästa leverans |

`dist/` är både källkod och publiceringskatalog i den här byggfria demon. Den kan serveras av en statisk webbhost. Repot aktiverar ingen ny hosting automatiskt. En framtida Vite/TypeScript-version ska ha källkod i `src/` och generera `dist/` vid byggning.

## Arbeta tillsammans

Utgå från den senaste appbeskrivning som teamet godkänt. [Pilotplanen](docs/PILOTPLAN.md) sammanställer samtalet, men ersätter inte Claudes fullständiga uppdaterade appbeskrivning som ännu inte lagts in här. Lägg den i repot innan pilotutvecklingen börjar. Markera förslag som förslag och håll README:s status aktuell när riktig funktionalitet levereras.

Använd separata Git-grenar och pull requests för ändringar. Lägg aldrig API-nycklar, `.env`-filer eller riktiga kunduppgifter i Git. Inget publicerat konto-, databas- eller betalkonfigurationsmaterial ingår i demon.
