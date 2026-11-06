# Underlag för AI-diskussion · 2026-11-05

Detta är en överlämning från teamets samtal. Det är ingen ersättning för den fullständiga, godkända appbeskrivningen. Uppdatera underlaget när teamet fattar beslut.

## Projektet

Tre gymnasieelever utvecklar en webbapp för fristående kaféers kaffeabonnemang och förbeställningar. Registreringsskylten har en QR-kod som kunden skannar. Ingen skanning hos personalen: kunden visar en grön hämtbekräftelse med namn, tid och animation. Den visuella kontrollen eliminerar inte fusk. Kortbetalning först; pengar till kaféets anslutna konto via Stripe Connect direct charges. Kaféet är säljare.

Pilot: ett kafé, ett bryggkaffeabonnemang, 10–20 betalande kunder och åtta veckors uppföljning. Kaféets plattformsavgift är gratis i två till tre månader; kunderna betalar abonnemanget. Webbapp, inte App Store. Utanför version 1: engångsköp, Swish, Wallet, kassasystemsintegration och flera kaféer i samma kundkonto.

Koden på main var en lokal frontenddemo vid överlämningen. Riktig inloggning, serverlagring, serverkontrollerad kvot och Stripe saknas. Kund- och personalvyn delar lokal data mellan flikar, inte mellan telefoner. Föreslagen pilotstack är Vite/TypeScript, Supabase Auth/Postgres/RLS/Realtime och Cloudflare Pages.

## Senare förändringar och förslag

- Claude har lagt namnändring till Bryggis, ett abonnemang för **579 kr/mån** och en ny registreringskod i PR #1. Den var öppen vid överlämningen. Kontrollera aktuell GitHub-status innan ändringar kallas levererade. Kundpriset är en hypotes, ungefär 15 koppar à 39 kr.
- Avgiftsförslaget är det högre av 299 kr/mån och 5 procent av betalda abonnemangsintäkter efter återbetalningar, exklusive moms. Priset är inte marknadsvaliderat. Räkna inte fem procent på kundens belopp inklusive moms om avtalsbasen är exklusive moms.
- Föreslagen förenkling: kunden ser Mottagen → Klar; personalens påbörjad-knapp försvinner. Avbokning låses senast tre minuter före ankomst, tidigare om klart, omedelbart vid Snarast. En försening får inte öppna låset. Tak per hämtintervall ska hindra överbelastning. Servern hanterar kvoten och statusändringar atomärt.
- Claude föreslår att sök/filter, dryckesval, kalkyl, illustrationer, statistik och export tas bort ur pilotens kund- och personalvyer. Detta är förslag, inte verifierad implementation.
- Claude föreslog en gratis provvecka. ChatGPT invände att första piloten bör testa betalningsvilja direkt. Frågan är inte avgjord.

## Affärsfrågor att hålla isär

Abonnemang kan ersätta tidigare fullprisköp. Förskottsbetalning och låg råvarukostnad bevisar inte lönsamhet. Mät tidigare köp på just kaféet, producerade koppar, avgifter, extra arbete, förnyelse och stödbehov. Kassans före–eftersiffror är en kontroll; säsong och andra förändringar kan påverka dem. Kundernas tidigare köp är självrapporterade och osäkra.

Senaste mätförslaget: uppskattad nettoeffekt är abonnemangsintäkt minus producerade koppars kostnad, avgifter, extra arbete och tidigare täckningsbidrag som ersatts, plus endast belagd extra marginal från tillköp. Räkna exklusive moms, efter återbetalningar, över samma period. Visa resultat med ordinarie plattformsavgift även under gratisperioden och ett intervall för osäkra antaganden. Klar betyder producerad, inte säkert hämtad.

Claude föreslog beslutströsklar för förnyelse, kundantal, ekonomi och support efter åtta veckor. Små kundgrupper och osäker mätning måste beaktas innan en tröskel utlöser ändring eller nedläggning. Teamet ska godkänna trösklarna.

Espresso House avvecklade kaffeprenumerationernas förnyelse 2023. GoodBarber erbjuder verktyg för kaféers förbeställning och lojalitet. Projektet ska därför inte påstå att fristående kaféer saknar alternativ. Resultatlöftet, enkel uppstart och faktisk kaféekonomi behöver valideras.
