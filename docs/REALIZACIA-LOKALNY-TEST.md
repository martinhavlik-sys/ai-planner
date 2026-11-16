# Spustiteľný lokálny TEST · 16. 11. 2026

**READY pre manuálne lokálne testovanie. BLOCKED pre živý cloudový CRUD.**
Cloudflare ani Supabase nie sú podmienkou tohto lokálneho spustenia.

## Spustenie z pilotnej vetvy

Node.js 22.18+, overené na 24.19.0; existujúci lockfile a pnpm 11.19.0.
V existujúcom checkoute vetvy codex/pilot-supabase-auth-cloud-crud:

```sh
pnpm install --frozen-lockfile
node scripts/spustit-lokalny-test.mjs
```

Otvorte **http://127.0.0.1:4173**, Report je **http://127.0.0.1:4173/report**.
Tento localhost bude patriť počítaču, na ktorom spustíte príkaz. Nejde o novú
verejnú URL ani o automaticky dostupný server na vašom počítači z chatu.
Server ukončíte Ctrl+C. Pri obsadenom porte pridajte `--port 4174`; používajte
rovnaký hostiteľ/port, pretože localStorage sa medzi adresami nezdieľa.
Príkaz je dostupný aj ako `pnpm test:local` po nainštalovaní závislostí.

Pripravený rozbalený balík obsahuje out/, dva serverové skripty a README.txt.
V ňom stačí **Node.js**, bez Next.js/pnpm inštalácie:

```sh
node scripts/spustit-lokalny-test.mjs --bez-buildu
```

Súbor SYNTETICKY-WORKSPACE.json v balíku je prázdna lokálna testovacia záloha
s vymyslenou osobou. Import robte iba v novom testovacom profile prehliadača:
po potvrdení nahradí lokálne údaje tejto adresy. Žiadna príprava balíka
nečíta alebo nekopíruje localStorage používateľa.

## Čo sa zmenilo

- scripts/spustit-lokalny-test.mjs: jeden príkaz vytvorí čistý statický export,
  vypne cloudové premenné iba v podprocese, zapíše lokálny manifest a spustí server.
  Existujúci bežný build/Next konfigurácia a Cloudflare konfigurácia sa nemenia.
- scripts/lokalny-test-server.mjs: iba loopback 127.0.0.1, GET/HEAD, žiadny upload
  alebo serverový zápis úloh; bez prístupu mimo out/ alebo k .env. CSP connect-src
  obmedzuje sieťové volania na vlastný server. Žiadne vypnutie RLS alebo Auth v DB.
- app/page.tsx: iba pri explicitnom NEXT_PUBLIC_LOCAL_TEST=1 zobrazí jasné
  označenie lokálneho režimu a skryje cloudové prihlásenie/vzdialený report.
  Lokálne CRUD používa existujúci lokálny repository a dátový model.
- app/report-panel.tsx: iba v lokálnom TEST režime predvolí Všetky obdobia;
  nové úlohy bez dátumu dokončenia sa tak hneď zobrazia. Bežný režim nezmenený.
- package.json, tests/ui.test.mjs a scripts/overit-lokalny-test.mjs: príkazy,
  regresia oddelenia režimov a opakovateľné skutočné prehliadačové overenie.

## Skutočne vykonané overenie

| Kontrola | Výsledok |
|---|---|
| Aplikačná sada | 154/154 PASS, bez skip: 150 testov tejto verzovanej zmeny a 4 staršie lokálne nepublikované testy |
| Typecheck | PASS |
| Bežný build bez exportovej/lokálnej premennej | PASS |
| Lokálny TEST export | PASS |
| Cloudflare export s WORKERS_CI=1 a pilotnou vetvou, bez lokálneho režimu | PASS; nejde o deploy |
| HTTP exportu | /, /report, /report/, 11 lokálnych súborov a 3 fonty PASS |
| Skutočný Chromium | 54 UI/HTTP kontrol PASS pri 1440×1000 a 390×844 |
| Pripravený balík | Rovnakých 54 kontrol PASS priamo z kópie out/ v balíku |
| Externá sieť počas browser testu | 0 požiadaviek; žiadny Supabase mock |

Prehliadač používal nový izolovaný profil a syntetický JSON import cez skutočný
formulár. Overené: vytvorenie, úprava, duplikácia, zmazanie lokálnej úlohy,
oddelenie, entita aj osoba, blok, zmena trvania klávesnicou, report a jeho
filtre, export JSON, odstránenie a spätný import zálohy, zachovanie ID,
obnovenie stránky, priama cesta /report/ a oddelený druhý profil prehliadača.
Desktop navyše overil presun bloku myšou do iného dňa; mobilná šírka vlastné
posúvanie kalendára. Mobilný dotykový drag na fyzickom telefóne nebol overený.

Reprodukcia browser kontroly potrebuje samostatný Playwright 1.62.1 a Chromium:

```sh
PLAYWRIGHT_MODULE=/cesta/k/node_modules/playwright CHROMIUM_PATH=/cesta/ku/chromium node scripts/overit-lokalny-test.mjs
```

PLAYWRIGHT_MODULE nie je nová závislosť aplikácie. Samotné manuálne použitie
balíka Playwright nepotrebuje. Komponentová sada používa existujúci BABEL_BUNDLE
postup a node --test --test-isolation=none podľa predchádzajúceho overenia.

## Presné hranice testovania

Úlohy a katalógy sú lokálne, nie databázové. Export JSON obsahuje celý lokálny
workspace; report zobrazuje filtrovaný výber. Dva profily majú oddelené údaje,
ale toto **neoveruje prihlásenie, Supabase workspace, zdieľanie ani RLS**.
Správa vlastníka je lokálna konfigurácia. V súkromnom okne údaje po jeho
zatvorení zaniknú; predtým stiahnite JSON export.

Server nepočúva na LAN ani verejnom rozhraní. Telefón v sieti sa naň automaticky
nepripojí; mobilné rozloženie možno manuálne skúsiť zúžením desktop prehliadača.
Používajte iba syntetické údaje. MDX font zostáva podľa používateľom schváleného
interného použitia; neprehlasuje sa nové licenčné overenie.

## Zvyšné blokátory a konkrétny zásah

Potvrdené aktuálne GET spojenia na yqleboakzkowfxsmynfy.supabase.co/auth/v1/health
aj ai-planner-cloudflare-test.martin-havlik.workers.dev zlyhali CONNECT 403
na proxy mimo sandboxu. environment_status potvrdzuje restricted/enforced
politiku bez týchto domén, bez outbound identity a secret. Je to sieťová
prekážka Codexu, nie dôkaz chyby cieľového poskytovateľa, hesla alebo RLS.
Metadátový Supabase konektor funguje a potvrdil ai-planner-test ACTIVE_HEALTHY.

V tomto prostredí nie je nástroj na zmenu environment konfigurácie ani Auth
Admin používateľský endpoint. Na živé dokončenie v nastaveniach vykonávacieho
prostredia Codex zachovajte existujúce domény a pridajte do
network_policy.allowed_hosts tieto dva hostitele. Úspech overí nový status
s doménami v effective_allowed_hosts a čerstvý GET bez proxy CONNECT 403.
Potom pripojte serverový TEST Auth Admin prístup cez bezpečný secret alebo
spravovanú identitu výhradne pre ai-planner-test. Hodnotu nikdy nevkladať do
chatu, GitHubu ani NEXT_PUBLIC premennej. Overenie musí použiť oficiálne Auth API.
Presnú podobu administračnej obrazovky nemám potvrdenú, preto neuvádzam názvy
neoverených tlačidiel.

Tvrdenie, že Cloudflare neuloží nastavenia, sa tu nedalo reprodukovať bez jeho
admin prístupu. Žiadne Cloudflare/Vercel nastavenie sa kvôli lokálnemu testu
nemenilo. Neboli nové DB zápisy/migrácie/účty, použitie produkcie ani merge main.
Zmenu publikovať iba v pilote s [CI Skip]; lokálne pripravený a otestovaný balík
sa nesmie vydávať za nové cloudové nasadenie.

**Najvyššia priorita teraz:** osobne prejsť lokálny manuálny test zo začiatku
návodu a zapísať konkrétnu chybu, ak sa prejaví. Cloudové blokátory už nebránia
testovaniu uvedených lokálnych funkcií.
