# Najkratší cloudový TEST A/B · 16. 11. 2026

**READY – lokálny režim a otestovaná príprava. BLOCKED – osobný cloudový zápis.**

## Aktuálne dôkazy

Vstupný pilotný HEAD: 04706bad453c77581d21193bb78cc3ef23128a95.
Supabase metadátové API potvrdilo ai-planner-test / yqleboakzkowfxsmynfy,
ACTIVE_HEALTHY. Priame GET na Auth health aj workers.dev skončili na Codex
proxy CONNECT 403. SUPABASE_SERVICE_ROLE_KEY nie je v procese dostupný;
prostredie nemá ani pripravený HTTP secret/outbound identitu. Hodnoty secretov
sa nečítali do výstupu. Oficiálny Admin API createUser preto nebol volaný.

Aktuálne bežiaci Cloudflare commit nie je potvrdený: priamy prístup je blokovaný
a nie je dostupný Cloudflare administratívny konektor. GitHub uvádza posledný
doložený úspešný build pre 702115f15e10cb1e418daa530ff089b8b5a672c3,
verziu c468ca36-5833-4b63-9583-116f84473ee5, 15. 11. 2026 o 16:55:37
Europe/Bratislava. Vstupný pilotný commit 04706ba má skipped. To nie je dôkaz
aktuálneho runtime SHA. Nový deploy sa v tomto kroku nespúšťa.

## Implementované minimum

- app/cloud-task-write.ts: overenie Auth cez server, presne jedno členstvo
  v jednom z dvoch syntetických workspace, POST vlastnej úlohy bez autora/ID,
  opakovanie s tým istým request UUID, GET pôvodného výsledku po 409 a kontrola
  nemenného pôvodného obsahu. PATCH filtruje workspace, autora, ID a verziu.
  Prázdny výsledok je konflikt; žiadny automatický retry UPDATE alebo DELETE.
- app/supabase-auth.ts: pri schválenom TEST write režime načíta iba vlastné
  syntetické riadky v jednom povolenom workspace a verziu. Pri pôvodnom read-only
  režime zostáva existujúce čítanie bez zmeny. Logout/expirácia/chyba stále skryjú dáta.
- app/test-auth-panel.tsx: malý formulár vytvorenia a úpravy, výber vlastného
  načítaného riadka, blokovanie dvojitého odoslania a generácia pre zahodenie
  oneskoreného výsledku starého účtu. Pri chybe sa relácia aj dáta znovu overia.
- next.config.js: NEXT_PUBLIC_TEST_WRITES_READY sa odvodzuje iba z existujúceho
  TEST exportu, Workers CI pilotnej vetvy a PILOT_TEST_WRITES_VERIFIED=1.
  Predvolená hodnota je 0; main a bežný build ju vynútia na 0 aj pri podvrhnutej
  verejnej premennej. Service-role kľúč nie je súčasťou klienta ani buildu.

**PILOT_TEST_WRITES_VERIFIED zatiaľ nenastavovať.** Backend nie je aplikovaný
ani živo overený. Formulár preto zostáva na skutočnom TEST nasadení skrytý.
Pôvodný saveTestTask zostáva WRITE_NOT_VERIFIED. Lokálny režim je zachovaný.

## Presný plán DB zmeny – NEVYKONANÝ

Pred akýmkoľvek použitím: aktuálna API identita, read-only schema/grant/RLS
snapshot a obnoviteľná záloha mimo aplikácie, fingerprinty pôvodných stĺpcov
historických riadkov. Overiť neprítomnosť rezervovaných workspace a markerov;
žiadny upsert na existujúce historické objekty.

Základ je [návrh Z1](sql/20261115160703_test_task_write_gate.sql) plus
[úzky A/B patch](sql/kratky-cloud-ab.patch.sql) v jednej explicitnej transakcii:

1. Sekvencia a default ID, serverový default autora; version/request/pôvodný
   obsah a constraints, invoker guard, úzke INSERT/UPDATE column granty, SELECT,
   permisívne pravidlá a RESTRICTIVE UPDATE iba pre nenulový request.
2. Patch pridá CHECK obmedzujúci nenulové requesty na dva **nové** workspace:
   00000000-0000-4000-8000-000000008a01 a
   00000000-0000-4000-8000-000000008b01. Pri kolízii STOP, nie prepis.
3. Globálny unique index na konštante nahradí unique(workspace_id,created_by_user_id)
   WHERE create_request_id IS NOT NULL. Tým povoľuje jednu vlastnú syntetickú
   úlohu pre A a jednu pre B, nie neobmedzené fixtures.
4. Historické riadky sa nebackfillujú ani nemenia. Nové metadata stĺpce sú
   plánovanou schémovou zmenou; pôvodné dátové stĺpce a väzby musia byť po zmene
   fingerprintovo rovnaké. Žiadny nový grant DELETE alebo zmena Auth nastavení.

R1 odoberie zápisové granty a politiky. R2 pred zápisom odstráni aj nový scope
CHECK a vráti zachytenú schému. R2 po zápise sa zastaví bez mazania; R1 zachová
syntetické aj historické dáta. Patch a všetky SQL návrhy sú mimo auto-migrácií.
Strojový lokálny diff: sql/kratky-cloud-ab.delta.json. Nie je to schválenie
nevratného zásahu ani dôkaz aplikovania na Supabase.

## Živý scenár po technickom odblokovaní

1. Overiť dostupnosť požadovaného serverového HTTP secretu pre presný TEST projekt.
   Vygenerovať dva nové náhodné syntetické emaily a silné heslá do zabezpečeného
   úložiska mimo aplikácie (0700/0600 alebo environment secrets), bez výpisu.
   Oficiálnym Admin API vytvoriť nové potvrdené účty. Žiadny priamy INSERT auth.users.
2. Vytvoriť iba dva rezervované nové workspace, aktívne profily a členstvá:
   A member vo workspace A, B member vo workspace B. Každý presne jedno členstvo.
   Overiť reťaz Auth → profil → členstvo → aktívny workspace. Nepridávať role ani
   členstvá historickým používateľom. Záznamy označiť vlastným markerom behu.
3. Po presnom preflight a DB post-checku pripraveného plánu vykonať Auth/REST
   A/B scenár: anonym odmietnutý; vlastný workspace dostupný; cudzí SELECT aj
   PATCH nulový/odmietnutý; vlastný INSERT; rovnaký request bez druhého riadka;
   vlastný UPDATE s CAS; stará verzia nesmie prepísať; podvrh autora/ID/workspace
   odmietnutý. Žiadny DELETE. Porovnať fingerprint historických stĺpcov.
4. Až po živom PASS nastaviť PILOT_TEST_WRITES_VERIFIED=1 iba pre Cloudflare TEST
   build pilotu. Použiť verejný testovací kľúč pre aplikáciu; serverový secret
   držať iba v zabezpečenom HTTP/serverovom prostredí. Overiť nový SHA deploymentu.
5. Osobný test: login → vytvoriť syntetickú úlohu → zvoliť ju na úpravu → uložiť
   → report → logout → skrytie dát → login znova. Request sa pri neznámom výsledku
   nemení; účet má limit jednej novej úlohy. localStorage sa nemieša so Supabase.

## Skutočne vykonané lokálne kontroly

- 158/158 aplikačných testov PASS (154 verzovaných a 4 staršie nepublikované).
- Nové mock testy klienta: A/B vlastníci, POST bez autora/ID, idempotencia,
  vlastný PATCH, stará verzia, cudzí workspace/identita a zatvorená brána.
- 77 PostgreSQL WASM kontrol PASS s SHORT_CLOUD_AB=1; testujú SQL Z1 + patch,
  oddelené syntetické A/B workspace, kvótu každého účtu, R1/R2 a historický snapshot.
  PGlite 0.3.14 / PostgreSQL 17.5; nejde o živý Supabase 17.11.
- Skutočný prehliadač so syntetickým Auth/REST: neskorý zápis A po prepnutí na B
  sa nezobrazí; B vytvorí/upraví vlastnú úlohu, report ju zobrazí, logout ju skryje,
  localStorage je nezmenené. Testová CSP výnimka je iba v mock runneri, nie v aplikácii.
- Lokálny režim: 54 existujúcich browser/HTTP kontrol PASS, desktop a mobilná šírka.
- Typecheck, bežný build, TEST exportový build (aj s prípravnou write bránou)
  a lokálne HTTP /, /report, /report/ a fonty PASS. Build nie je deployment.

Reprodukcia SQL: SHORT_CLOUD_AB=1 PGLITE_MODULE=<lokálny PGlite> node docs/sql/overit-baseline-navrh.mjs.
Mock UI: build s TEST flagmi a syntetickým verejným kľúčom, potom
PLAYWRIGHT_MODULE=<lokálny Playwright> node scripts/overit-cloud-ab-ui.mjs.
Žiadne účty, heslá, session tokeny, service-role kľúče ani živé údaje nevznikli.

**Jediný potrebný odblokovací krok:** v konfigurácii prostredia Codex povoliť
HTTP na oba TEST hostitele a pripojiť požadovaný SUPABASE_SERVICE_ROLE_KEY ako
zabezpečený HTTP/serverový secret iba pre ai-planner-test. Žiadna hodnota do
chatu alebo NEXT_PUBLIC. Potom možno pokračovať pripraveným scenárom; dovtedy
živé vytvorenie účtov, SQL a cloudový write deployment zostávajú BLOCKED.
