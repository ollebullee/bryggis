# Pilotplan · sammanställning 2026-11-05

Det här är en sammanställning av teamets beslut i samtalet. Claudes fullständiga uppdaterade appbeskrivning har inte tillhandahållits som fil. Lägg in den godkända originaltexten i repot innan implementationen av piloten. Texten nedan skiljer beslut, nya förslag och faktiskt levererad kod.

## Beslut för version 1

- Webbapp för fristående kaféer. Kunden hittar den via en registreringsskylt med QR-kod. Ingen nedladdning från App Store krävs. Registrering på cirka 30 sekunder är ett mål som måste mätas.
- Kunden visar en grön hämtbekräftelse med namn, klocka och animation. Personalen behöver inte skanna. Visuell kontroll eliminerar inte delning eller återspelning.
- Abonnemang och förbeställning är kärnan. Ett bryggkaffeabonnemang per kafé i piloten. En kvot per konto och kafédag i Europe/Stockholm, delad mellan förbeställning och hämtning i kassan.
- Betalning med kort först. Planen är Stripe Connect med direct charges på kaféets anslutna konto. Kaféet är säljare och tar emot kundbetalningen via betalleverantören. Betalningskopplingen är ännu inte byggd.
- Pilotkaféets plattformsavgift är noll i två till tre månader. Kundens abonnemang är fortfarande betalt. Bekräfta startdatum, ansvarig, kundpris, gratisperiod och efterföljande avgift skriftligt.
- Utebliven hämtning kan kosta råvara, kopp, arbetstid och kapacitet även när abonnemanget är förbetalt. Bryggkaffets låga råvarukostnad skyddar inte automatiskt mot att ersätta tidigare fullprisbesök.
- Utanför version 1: engångsköp, Swish, Wallet, App Store, personalskanning, kassasystem och flera kaféer i samma kundkonto.

## Föreslagen förenkling av avbokning

Claude föreslog ett tidslås i stället för att personalen måste trycka påbörjad. Följande precisering ska bekräftas i appbeskrivningen och testas i kaféets arbetsflöde:

- Kunden kan avboka före den tidigare av vald ankomsttid minus tre minuter och tidpunkten när personalen markerar klar. Vid Snarast låses ordern direkt.
- Avbokning före lås släpper dagens reservation. Ett tidslås ska inte visas som bevis för att baristan faktiskt har börjat.
- Kunden ser Mottagen och Klar. Personalen ser när en beställning tidigast ska förberedas. Ingen extra påbörjad-knapp behövs i det föreslagna pilotflödet.
- Om kaféet inte kan leverera ska behörig personal kunna återställa kvoten med dokumenterad orsak. Kunden får ingen egen väg runt låset.
- Servern avgör tid och ordningen mellan avbokning och klar, atomärt. Förseningar får inte öppna en redan låst beställning eller ge en extra kopp.

**Inte implementerat:** den upplagda demon använder fortfarande köad → påbörjad → klar → hämtad och tillåter kundavbokning medan ordern är köad.

## Teknik för kommande pilot

| Del | Val och krav |
| --- | --- |
| Frontend | Vite och TypeScript. Återanvänd design och relevanta domänregler från demon. |
| Backend | Supabase: Postgres, Auth, RLS, Realtime och serverfunktioner. Välj lämplig EU-region. |
| Behörighet | Kund får sina egna uppgifter. Personal får sitt kafés kö via serverkontrollerat medlemskap. Inga klientval får ge personalrättigheter. |
| Dagskvot | Skyddad databasfunktion med serverns Stockholm-datum och unik kvot för `(cafe_id, user_id, service_date)`. Reservation, order och avbokning måste ändras i samma transaktion. |
| Upprepade anrop | Idempotens gör att retry ger samma order, inte dubbla beställningar. Kvoten gäller per konto, inte en verifierad fysisk person. |
| Realtid | Läs en ögonblicksbild vid öppning och återanslutning, ta emot Realtime-händelser och ha polling som reserv. Visa lyckad beställning först efter serverbekräftelse. |
| Betalning | Stripe Connect, Checkout och Billing. Signaturkontrollerade, idempotenta webhooks och verifierad aktuell betalningsperiod styr rättigheter. Ingen åtkomst enbart för att webbläsaren kommer till en tack-sida. |
| Hosting | GitHub som gemensam källkod, Cloudflare Pages för frontend. Hemligheter endast på servern. |

## Nästa leverans

Intervjua cirka 15 kaféägare och försök få två till tre konkreta pilotbekräftelser för januari 2027. Använd befintlig demo under intervjuerna.

En separat, begränsad demo med synk mellan två telefoner får ta högst två arbetsdagar: kund beställer, order visas i personalens vy, personal markerar klar och kunden ser det. Använd bara exempeldata, separata kund- och personalbehörigheter samt begränsad åtkomst. Pushnotiser till låst telefon ingår inte. Bygg inte betalning och full kundregistrering innan ett kafé bekräftat en pilot.

För en riktig pilot behöver följande bevisas: samtidiga beställningsförsök kan inte ge två koppar; upprepad webhook ger inte extra rättigheter; återanslutning återställer rätt kö; kunder kan inte läsa andras uppgifter eller ändra personalstatus; kortbetalning, betalningsfel och uppsägning fungerar i leverantörens testmiljö. Godkänt resultat på fysiska telefoner krävs innan kundlansering.

## Prisförslag att validera

Senaste förslag från ChatGPT är **det högre av 299 kr per kafé och månad och 5 procent av betalda abonnemangsintäkter efter återbetalningar, exklusive moms**. Plattformsavgiften anges exklusive moms och betalleverantörens avgifter tillkommer. Detta är ett förslag, inte ett beslutat eller marknadsvaliderat pris. Det är inte 299 kr plus fem procent. Börja med manuell fakturering av plattformsavgiften om modellen väljs.

**Kundpris (förslag från Claude):** cirka 15 gånger kaféets pris för en kopp bryggkaffe, avrundat nedåt: 499 kr vid 35 kr, 599 kr vid 40 kr och 649 kr vid 45 kr. Den som kommer varje vardag får då runt 30 % rabatt. Med kalkylatorns antaganden går kaféet ungefär jämnt ut om det kommer en ny kund för varannan daglig stamkund som tecknar sig. Demon använder 579 kr vid 39 kr per kopp. Priset är inte validerat.

## Innan riktiga avtal och betalningar

Bestäm företag, avtalsansvar och teamets ägande av kod och verksamhet. Ålderskrav och eventuella tillstånd måste kontrolleras för vald företagsform och betalleverantör; anta inte att alla företagsformer kräver samma ålder.

Bestäm de faktiska GDPR-rollerna, vilka uppgifter som behövs, lagringstid, åtkomst och hur radering hanteras. Ta fram integritetsinformation och personuppgiftsbiträdesavtal där förhållandet kräver det. Integritetspolicy ersätter inte ett sådant avtal.

Gör konsumentvillkor och tydliga flöden för löpande uppsägning samt eventuell lagstadgad ångerrätt. Klassificera det specifika kaffeabonnemanget innan ni påstår att ångerrätt gäller eller är undantagen. Juridiska formuleringar i denna plan är arbetsfrågor; de är inte färdiga kundvillkor.
