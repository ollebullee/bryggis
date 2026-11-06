# OpenAI och Claude i samma GitHub-tråd

Denna funktion låter en OpenAI-modell och en Claude-modell turas om att diskutera ett ärende. GitHub Actions skickar varje svar till nästa modell och publicerar svaren i tråden. Efter en eller två rundor skriver OpenAI en sammanfattning med både gemensamma förslag och kvarstående oenighet.

Det är nya API-sessioner, inte de befintliga chattarna. De får ärendets titel och text, de senaste åtta kommentarerna samt README, PILOTPLAN och AI_BRIEF från default-branchen. Kommentarerna förkortas till 600 tecken vardera, och även dokumenten har längdgränser. De får inte automatiskt hela kodbasen, PR-diffen, bilder eller tidigare privata chattar. Lägg en kort aktuell ändringsbeskrivning i tråden när en PR ska diskuteras. Uppdatera AI_BRIEF med godkända beslut.

## Aktivera en gång

1. Granska och lägg in dessa filer i repots default-branch (`main`). GitHub Actions måste vara tillåtet för repot.
2. Öppna **Settings → Secrets and variables → Actions → Secrets** och lägg till `OPENAI_API_KEY` och `ANTHROPIC_API_KEY` som repository secrets. Använd respektive leverantörs API-nyckel; en Claude Code OAuth-token är inte en API-nyckel för detta skript. Klistra aldrig in nycklar i chatt, ärenden eller kod.
3. Valfritt under **Variables**: sätt `OPENAI_MODEL` och `ANTHROPIC_MODEL` till API-modeller som era konton har tillgång till. Standardvärdena är `gpt-6-astra` och `claude-sonnet-5-5`, hämtade ur leverantörernas dokumentation 2026-11-05. Modellnamn, tillgång och priser kan ändras.
4. Kontrollera API-kontonas betalning, eventuella krediter och kostnadsgränser. Funktionen använder API-åtkomst och GitHub Actions. Tillgång till en chattprenumeration innebär inte i sig att detta upplägg är färdigkonfigurerat eller kostnadsfritt.

Nycklar saknas i repot och ingår inte i ändringen. Inga liveanrop har gjorts i den lokala verifieringen.

## Starta en diskussion

Öppna ett issue eller en pull request i detta repo och skriv en **ny kommentar**:

```text
/ai-discuss
Hur kan vi mäta pilotkaféets nettoeffekt utan mer arbete i kassan?
```

En runda ger tre modell-anrop: OpenAI föreslår, Claude granskar, OpenAI sammanfattar. För två rundor, använd `/ai-discuss 2` på första raden. Det ger fem modell-anrop totalt. Ingen diskussion fortsätter av sig själv efter sammanfattningen.

Ägare, organisationsmedlemmar och collaborators kan använda kommandot. Externa användare och botar får inte starta körningar. I detta personliga repo är ägaren Olle. De som får skriva i repot kan också ändra workflows och ska vara betrodda.

Alternativt: **Actions → AI discussion → Run workflow**, välj `main`, ange ärende- eller PR-numret och en eller två rundor. Den manuella starten kräver GitHub-rättighet att köra workflows.

Skriv nästa fråga i samma tråd och starta ett nytt kommando om ni vill fortsätta. Nyaste kommentarerna följer med automatiskt. Längre diskussioner behöver en aktuell sammanfattning i ärendet eller AI_BRIEF eftersom kontexten begränsas.

## Gränser och beteende

- Ingen ändring eller merge av appkoden görs. Kontrollen postar endast kommentarer via GitHub-token med innehållsläsning och skrivrätt till ärende-/PR-kommentarer. Modellerna har inga verktyg eller tokenvärden.
- En körning har högst fem modell-anrop, högst 4 096 output-token per anrop och högst 15 minuter i Actions. Underlaget begränsas till 30 000 tecken; modellen kan få ytterligare tidigare svar från den pågående rundan. Output-token hos OpenAI inkluderar även eventuella resonemangstoken. Det är ingen fast kostnadsgräns i kronor: vald modell och indata påverkar kostnaden.
- Alla AI-anrop ligger i samma workflow. Botarnas kommentarer behöver inte trigga nya workflows. Detta fungerar även med GitHubs normala skydd mot att `GITHUB_TOKEN`-händelser startar kedjor av nya workflows.
- Om ett API returnerar fel stoppas diskussionen utan automatiska omförsök. Se Actions-loggen för vilken leverantör som misslyckades. Kör om samma workflow-run när felet är åtgärdat; redan publicerade svar från körningen återanvänds. Ett genererat svar som aldrig hann publiceras kan behöva genereras igen. En ny startkommentar är en ny körning.
- Om en längdgräns nås markeras svaret som förkortat. Ett tomt svar stoppar körningen. Saknad nyckel stoppar före API-anrop.
- Kommentarer är offentliga i ett offentligt repo. Ärendetext och utvalda dokument skickas till båda API-leverantörerna. Lägg inte in kunduppgifter, avtal med känsliga uppgifter eller hemligheter i underlaget. Maskeringen av nyckelmönster är ett extra skydd, ingen fullständig sekretesskontroll.
- Avbryt i **Actions → pågående körning → Cancel workflow**. Ta bort eller inaktivera workflowet för att stänga funktionen.

## Testa utan nycklar

```sh
node --test automation/tests/discuss.test.mjs
```

Testerna använder simulerade HTTP-svar och gör inga nätverksanrop. De kontrollerar turordning och kontextöverföring, rundgränser, startbehörighet, felhantering, omstart, maskering och att inga verktyg ges till modellerna. Riktig API-behörighet och publicering via Actions behöver verifieras efter konfigurationen.

## Primärkällor för integrationen

- [OpenAI Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses)
- [OpenAI API-nycklar och service accounts](https://developers.openai.com/api/docs/guides/api-keys)
- [Claude Messages API](https://platform.claude.com/docs/en/api/messages/create)
- [GitHub: GITHUB_TOKEN och workflow-händelser](https://docs.github.com/en/actions/concepts/security/github_token)

Codex och Claude Code har även egna GitHub-integrationer. Den här begränsade diskussionsfunktionen använder de vanliga text-API:erna och kräver inga separata GitHub-appar från AI-leverantörerna.
