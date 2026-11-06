# Bryggis · kaffeabonnemang för fristående kaféer

Det här repot innehåller teamets klickbara frontenddemo. Gränssnittet heter **Bryggis**. Namnet är ett arbetsnamn tills domän och varumärke är kontrollerade.

**Status: demo, inte en tjänst för riktiga betalningar eller beställningar.**

## Prova demon i mobilen

Demo för mobiltest: **https://stammis-kaffe-olle.ollekallgren117.chatgpt.site/**

- Kundvy: https://stammis-kaffe-olle.ollekallgren117.chatgpt.site/#hem
- Bli medlem (dit QR-koden leder): https://stammis-kaffe-olle.ollekallgren117.chatgpt.site/#bli-medlem
- Personalvy: https://stammis-kaffe-olle.ollekallgren117.chatgpt.site/#personal

Demon publiceras via den befintliga hostingen för mobiltest, med publik åtkomst utan ChatGPT-inloggning. Domänen behåller det tidigare arbetsnamnet; gränssnittet heter Bryggis. Källkoden ligger i detta repo. Publicering sker separat och en GitHub-push uppdaterar inte automatiskt den hostade demon.

Alternativ hosting: publicera katalogen `dist/` som en statisk webbplats, till exempel hos Netlify. Om GitHub Pages används: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main`, mapp `/ (root)` → Save.** Då blir adressen `https://ollebullee.github.io/bryggis/dist/`. Byt även QR-kodens adress när ni byter hosting.

Varje telefon har sin egen demodata. Kund- och personalvy synkar bara mellan flikar i samma webbläsare.

## Design och mobilvy

Gränssnittet använder en gemensam skala för typografi, avstånd och knappar. Brödtexten är 16 px, hjälprader minst 13 px och beställningsvalen minst 44 px höga. Kundens huvudsakliga uppgift, **Förbered mitt kaffe**, kommer före abonnemangs- och kaféinformationen på mobilen.

Registreringen visar ett enda erbjudande med pris och demoknapp före detaljerna. Dekorationskort, veckokalender och kundens besparingskalkyl är borttagna. Kaffefärgerna och hämtbekräftelsens rörliga remsa, namn och levande klocka finns kvar. Sparåtgärder har vänteläge, dubbeltrycksspärr och tydliga felmeddelanden. Metadata och delningsbild finns i `dist/index.html` och `dist/og-image.png`.

Vid öppning visas en cirka 1,4 sekunder lång animation med Bryggis-loggan och en ritad kaffekopp. Den visas inte vid byte mellan vyer, går att hoppa över och hoppas över helt vid minskad rörelse.

Layouten kontrolleras i webbläsare vid 320, 390 och 768 px samt på dator. Det ersätter inte test på en fysisk iPhone.

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
- Personalkö med ett tryck per kopp: **Klar** flyttar beställningen till listan **På hyllan**, där personalen kan **Ångra** eller markera **Ej hämtad**. Kunden bekräftar själv **Jag har hämtat mitt kaffe**.
- Tre slutstatusar: kundbekräftad hämtning, ej hämtad och avslutad med okänd hämtning. En klar kopp som ingen har bekräftat på 60 minuter avslutas som okänd, ett antagande för piloten. Ingen slutstatus ger en ny dagskopp.
- Fast avbokningsgräns: kunden kan avbryta tills baristan senast behöver börja. **5 minuter senare** flyttar inte gränsen. Vid **Snarast** får kunden bekräfta att beställningen inte går att avbryta.
- Lokal reservation av dagens kopp, öppettider och daggräns i Europe/Stockholm.
- Kaféinställningar, kundens historik med CSV-export och återställning av demodata.
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
| Avbokning | Tidslåset kontrolleras bara lokalt. I piloten måste servern kontrollera avbokning och dagskvot tillsammans. Ångra efter skickad order kräver en serverlösning och ingår inte. |
| Kapacitet | Inget tak för antal förbeställningar per tidsintervall ännu. |
| Utbud | Ett abonnemang, Dagens kaffe: bryggkaffe, en kopp om dagen, 579 kr/mån. Det motsvarar cirka 15 koppar à 39 kr. Kaféet kan ändra priset under Kaféinställningar. |
| Notiser | Ingen pushfunktion eller garanterat pling när telefonen är låst. |

Lokal lagring, lokal klocka och den animerade gröna skärmen är inga säkerhetsgränser. Offlinebeteendet är till för demon; en kommande pilot får inte godkänna nya uttag utan serverbekräftelse.

## QR-koden och iPhone

`dist/signup-qr.png` är en **registreringskod för kunden att skanna**, inte en kod personalen skannar i kassan. Den pekar på:

`https://stammis-kaffe-olle.ollekallgren117.chatgpt.site/#bli-medlem`

Koden öppnar registreringen i mobilens vanliga webbläsare. Byts adressen inför piloten görs koden om med `python3 tools/make_qr.py <ny adress>`.

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
| `tests/domain.test.mjs` | Tio tester av domänreglerna |
| `docs/PILOTPLAN.md` | Beslut, förslag och nästa leverans |
| `docs/bryggis-kundvy.jpg`, `docs/bryggis-personalvy.jpg` | Skärmbilder från den tidigare layouten |
| `index.html`, `.nojekyll` | Skickar besökare från repots rot till demon på GitHub Pages |
| `tools/make_qr.py` | Gör om registreringskoden när adressen ändras |

`dist/` är både källkod och publiceringskatalog i den här byggfria demon. Den kan serveras av en statisk webbhost. Den befintliga hostingen publicerar innehållet i `dist/`; rotfilen `index.html` är en alternativ ingång för GitHub Pages. En framtida Vite/TypeScript-version ska ha källkod i `src/` och generera `dist/` vid byggning.

## Arbeta tillsammans

Utgå från den senaste appbeskrivning som teamet godkänt. [Pilotplanen](docs/PILOTPLAN.md) sammanställer samtalet, men ersätter inte Claudes fullständiga uppdaterade appbeskrivning som ännu inte lagts in här. Lägg den i repot innan pilotutvecklingen börjar. Markera förslag som förslag och håll README:s status aktuell när riktig funktionalitet levereras.

Claude och ChatGPT skriver till varandra i [docs/AI-DIALOG.md](docs/AI-DIALOG.md). Be din AI läsa det senaste meddelandet där och svara längst ned i filen. Deras meddelanden är förslag; besluten tar teamet.

Använd separata Git-grenar och pull requests för ändringar. Lägg aldrig API-nycklar, `.env`-filer eller riktiga kunduppgifter i Git. Inget publicerat konto-, databas- eller betalkonfigurationsmaterial ingår i demon.
