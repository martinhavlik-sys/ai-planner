# Revízia TEST CRUD podľa schválenej matice

Stav: **PASS – návrh a lokálne overenie. OPEN DECISION – živé SQL stále čaká
na schválenie.** Žiadny SQL zápis, migrácia ani INSERT/UPDATE sa na Supabase
nevykonal. Vzdialený základ pilotu je 702115f15e10cb1e418daa530ff089b8b5a672c3.

## Opravená matica a prvý test

| Rola | Vytvorenie | Úprava |
|---|---|---|
| member/user | vlastná úloha, serverový autor | vlastná alebo aktívne priradená úloha |
| admin/owner | vlastná úloha, serverový autor | aj nepriradené tímové úlohy vo vlastnom workspace |
| analyst | nie | nie |
| bez členstva alebo neprihlásený | nie | nie |

Bežný UPDATE povoľuje iba title, status, priority a write_version.
Autor, workspace_id, id, request a pôvodný obsah sú nemenné; členstvá a role
nemajú nový zapisovací grant. Zostáva serverové ID, idempotencia, CAS verzie,
existujúce zložené FK, oddelenie localStorage a zákaz DELETE.

Prvý TEST má **globálny limit jednej novej úlohy**, nie jednej na účet.
Vynucuje ho unique partial index test_tasks_single_probe na konštante true
pre nenulové create_request_id. Trigger vyžaduje pri INSERT presný názov
„Syntetická TEST – cloudový zápis“. Identita requestu sa UPDATE nedá vymazať.
Druhý request, aj v inom workspace, narazí na limit; rovnaký request sa vyhodnotí
idempotentne cez existujúci riadok. Sekvencia môže mať medzery aj po odmietnutí.
Odstránenie limitu bude samostatne schvaľovaný krok. Prvý živý scenár má meniť
iba túto syntetickú úlohu; historické úlohy nie sú testovacou fixture na zápis.

## Schema-only baseline

Zdroj bol read-only katalógový SELECT v ai-planner-test, ref
**yqleboakzkowfxsmynfy**, API potvrdilo ACTIVE_HEALTHY a PostgreSQL 17.11.
Dotaz používa BEGIN READ ONLY / ROLLBACK, nečíta riadky aplikačných ani Auth
tabuliek a nevolá zapisovacie funkcie.

Súbory:

- [baseline JSON](sql/baseline-ai-planner-test.json): presné katalógové metadáta;
- [schema-only SQL](sql/baseline-ai-planner-test.schema.sql): obnovenie public
  do prázdneho lokálneho prostredia, nie migračný skript na živý projekt;
- [reprodukovateľný read-only dotaz](sql/baseline-ai-planner-test.readonly.sql).

Rozsah: aplikačná schéma public – 14 tabuliek, 2 security_invoker pohľady,
140 stĺpcov vrátane pohľadov, 7 funkcií, 14 SELECT politík, constraints,
indexy, 13 riadkových triggerov, ensure_rls, vlastníci, objektové/stĺpcové ACL,
public schema ACL a default ACL. V public nie sú sekvencie ani vlastné enumy/domény.
Evidovaný je aj inventár rozšírení a externá referencia na auth.users(id).

**Nie je to úplný fyzický dump ani záloha managed schém Auth/Storage.**
Spravované schémy a roly sú platformovým predpokladom; žiadne účty, heslá,
tokeny, cookies, kľúče ani dáta sa neexportovali. Lokálny test vytvára minimálnu
syntetickú auth.users/auth.uid náhradu; neoveruje podpis JWT.
Funkcia seed_catalog je súčasťou schémy ako zdrojový kód, nebola volaná.

SHA-256 JSON: `29c2d850e12d7394f1baf02623eb0c854bf0ddea9c0d8b71c070ad273c37323c`.
SHA-256 schema SQL: `82e045588a1ab90bc62177328b4e7ec448e38a5bafc165124d99c2f571dcfac6`.

## Rozdiely oproti lokálnym migráciám

Porovnali sa oba súbory v supabase/migrations po lokálnom aplikovaní do
samostatného prázdneho PostgreSQL, nie spustením na testovacom Supabase.
Úplný zoznam: [baseline-rozdiely-migracie.json](sql/baseline-rozdiely-migracie.json).

| Oblasť | Aktuálny baseline oproti core/catalog migráciám |
|---|---|
| Tabuľky | Navyše task_entities so zloženými väzbami a primary-entity indexom |
| tasks | Navyše created_by_user_id s Auth FK, completed_at a súvisiace indexy |
| Členstvá | CHECK navyše povoľuje user a analyst popri owner/admin/member |
| Funkcie | Navyše current_workspace_role, can_read_task a rls_auto_enable |
| RLS | tasks, task_assignees a calendar_slots používajú own_or_reporting namiesto jednoduchého členstva; navyše politika task_entities |
| Reporting | Dva security_invoker pohľady, ktoré pôvodné migrácie neobsahujú |
| Indexy/triggery | Navyše profiles_workspace_auth_user_uidx a touch_task_entities |
| DDL ochrana | Navyše aktívny event trigger ensure_rls |
| ACL | Aktuálne explicitné granty a default ACL sa líšia od čistého lokálneho prostredia po týchto migráciách; ide aj o platformové nastavenia, nie dôkaz konkrétnej historickej migrácie |
| Register | supabase_migrations.schema_migrations neexistuje; nie je doložená migračná história |

Preto sa nesmie vykonať plošný db push, reset alebo opakovanie starých migrácií.
Baseline súbory sú mimo supabase/migrations a nesmú sa na existujúci projekt
aplikovať. Pred prípadným zásahom sa znovu načíta baseline a porovná fingerprint.

## Rozdiel baseline → revidovaný návrh

Presný SQL: [20261115160703_test_task_write_gate.sql](sql/20261115160703_test_task_write_gate.sql).
Strojový delta prehľad: [baseline-rozdiely-navrh.json](sql/baseline-rozdiely-navrh.json).

Z1 pridáva dočasnú RESTRICTIVE UPDATE politiku test_tasks_update_probe_only
s USING aj WITH CHECK (create_request_id IS NOT NULL). Historické úlohy sú
v prvom bloku neupraviteľné aj pre admin/owner. Jej odstránenie na rozšírenie
rozsahu vyžaduje samostatný neskorší krok.

Návrh pridá jednu sekvenciu, tri stĺpce, dva constraints, dva indexy,
jednu invoker trigger funkciu, jeden trigger a štyri politiky.
Zmení iba dva defaulty tasks (id a autor) a stĺpcové granty na povolených
vstupoch. Existujúce funkcie, pohľady, event trigger, FK, default ACL a stĺpce
ostatných tabuliek zostali v lokálnom porovnaní nezmenené.

Granty sú presne INSERT(workspace_id,title,status,priority,create_request_id),
UPDATE(title,status,priority,write_version) a USAGE novej sekvencie pre
 authenticated. Analytika blokujú obe zápisové politiky. Admin/owner sú
výslovne zahrnutí v oboch častiach UPDATE (USING aj WITH CHECK); nemennosť
identity chráni stĺpcový grant aj trigger. Žiadny DELETE ani grant na zápis väzieb.

SHA-256 revidovaného návrhu SQL:
`9f5fde3d4351cd15a08e00d9584efcef94305cb51701f06819525d40b576210e`.

## R1, R2 a výsledky

[Overovací program](sql/overit-baseline-navrh.mjs) používa PGlite **0.3.14 /
PostgreSQL 17.5**. Verzia live projektu je 17.11; nejde o rovnaký patch ani o
živý Auth/REST test. Pôvodná revízia bf94674 prešla aj v PGlite 0.5.16 / PostgreSQL 18.6;
aktuálna Z1 bola overená v PostgreSQL 17.5;
pri porovnaní medzi hlavnými verziami sa NOT NULL porovnáva cez stĺpce,
pretože PostgreSQL 18 ho navyše eviduje v pg_constraint. Poradie default ACL
sa normalizuje, lebo lokálne role majú odlišné OID. R1/R2 pred/po sa porovnávajú
v rovnakom engine a zahŕňajú všetky zachytené aplikačné katalógové sekcie.

**76 kontrol PASS po revízii Z1** nad skutočne obnoveným public baseline:

- zhoda obnovenej schémy s exportovanými metadátami;
- member/user vytvoria vlastnú úlohu; ostatné kladné INSERT skúšky sú lokálne
  rollbacknuté, takže na konci zostane iba jeden nový syntetický riadok;
- admin aj owner upravia nepriradenú syntetickú tímovú úlohu vlastného workspace;
- člen upraví vlastnú syntetickú, user aktívne priradenú syntetickú; nepriradený člen/user neuspeje;
- analytik nesmie INSERT ani UPDATE vrátane vlastnej úlohy;
- A/B izolácia, stabilný autor/ID, zastaraná verzia, limit druhého requestu,
  odmietnutie nesyntetického názvu, zmeny identity/oprávnení, väzieb a DELETE;
- **R2 pred zápisom PASS:** R1 + R2 obnovia celý katalógový snapshot baseline;
- **R1 po zápise PASS:** nové granty/politiky sú odobraté, ďalší INSERT/UPDATE
  je odmietnutý, celý snapshot údajov tasks je rovnaký;
- **R2 po zápise PASS ako ochranné odmietnutie:** pred DROP sa zastaví, po
  ROLLBACK zostane schéma aj dátový snapshot nezmenený. Cleanup sa nevykoná.

Spustenie: `PGLITE_MODULE=<cesta k PGlite 0.3.14/dist/index.js> node docs/sql/overit-baseline-navrh.mjs`.
Engine je iba v dočasnom cache, bez novej závislosti aplikácie. Testy nepoužívajú
sieť ani živé údaje. Samostatné súbežné REST spojenia zostávajú budúcou živou
kontrolou; globálny unique index rieši limit aj na úrovni databázovej konkurencie.

## Odovzdanie

Push sa týka iba docs/ vrátane SQL návrhov, baseline a lokálneho overovacieho
programu. Aplikačná príprava z pôvodného lokálneho commitu 498695a sa nepushuje.
Runtime, WRITE_NOT_VERIFIED, main, Cloudflare nastavenia, Vercel, Supabase a
produkcia sa nemenia. Commit označuje [CI Skip], aby sa dokumentačným pushom
nevyžiadal nový TEST build; nastavenia automatizácií sa nemenia.

Živé SQL vyžaduje nové výslovné schválenie revidovaného súboru a jeho fingerprintu.
Pred ním sa zopakuje API identita a porovnanie aktuálnej schémy s baseline.
Žiadne živé R1/R2, SQL zmeny ani aplikačné odomknutie sa týmto krokom neschvaľujú.

Aktuálny stav identity účtov, completed_at a archivácie je výslovne v
[QA-Z1-TEST-BRANA.md](QA-Z1-TEST-BRANA.md); neoverené roly sa nesmú odvodiť
z počtu úloh alebo zo syntetických fixture overovacieho programu.
