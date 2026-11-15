# Minimálny TEST cloudový zápis – návrh na schválenie

Základ: `702115f15e10cb1e418daa530ff089b8b5a672c3`, iba pilotná vetva.
**Žiadna časť SQL nebola aplikovaná na Supabase. Zápis v aplikácii je uzamknutý.**

## Dôkazy a matica

Používateľ oznámil živý read-only PASS: účet A vidí 6, druhý účet 2 oprávnené
úlohy, report zodpovedá pracovnej ploche, lokálny report je oddelený. Ide o
používateľom vykonaný test, nie nové prihlásenie implementátora.

Čerstvá API identita: ai-planner-test / yqleboakzkowfxsmynfy, ACTIVE_HEALTHY,
PostgreSQL 17.11. Iba tento projekt dostal read-only SQL požiadavky.
Katalógy potvrdili 14 RLS tabuliek, žiadne zapisovacie politiky, authenticated
iba SELECT nad tasks. Task má zložený PK, zložené FK, nullable autora bez
predvolenej hodnoty, bigint ID bez generátora; nemá verziu ani idempotenciu.
Existujúci trigger touch_tasks aktualizuje čas, nie verziu. ensure_rls je
aktívny; anon/authenticated nemajú EXECUTE rls_auto_enable(). Počet tasks je 8.
Migračný register stále chýba: nepoužiť hromadné `supabase db push` ani znovu
spúšťať staré core/catalog migrácie.

Issue #3: TASK-006 dokumentuje vlastné/priradené čítanie a tímové čítanie
admin/analyst; TASK-007 Gate 1 a Gate 2 majú PASS. Historický Gate 3 bol BLOCKED,
aktuálny živý PASS bol oznámený používateľom. Starší DECISION-002 own-only
nezamieňame za aktuálny pokyn povoľujúci aj oprávnené priradenie.

| Aktér | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| Neprihlásený / bez členstva | bez prístupu | nie | nie | nie |
| member/user | existujúce vlastné/priradené | vlastný autor, aktívny profil/workspace | vlastné alebo aktívne priradené | nie |
| owner/admin | existujúce tímové čítanie vo workspace | vlastný autor, aktívny profil/workspace | tímové úlohy vlastného workspace | nie |
| analyst | existujúce tímové čítanie vo workspace | nie | nie | nie |

Admin/owner môže upravovať aj nepriradenú tímovú úlohu vlastného workspace. Neznáma rola nezískava zápis. Priradenie znamená aktívny task_assignees aj profil
s auth_user_id prihláseného účtu v rovnakom workspace. Nemeníme členstvá,
priradenia ani čítacie pravidlo can_read_task. Nová priama autorská SELECT
politika je logicky podmnožinou existujúceho čítania; rieši viditeľnosť nového
riadka v INSERT RETURNING, kde helper ešte nevidí vloženú úlohu.

## Presný rozsah SQL – výlučne TEST

Návrh migrácie: [20261115160703_test_task_write_gate.sql](sql/20261115160703_test_task_write_gate.sql).
Názov vygeneroval lokálny `supabase migration new`, súbor je úmyselne mimo
automaticky aplikovaného adresára. Bez vytvorenia falošnej historickej migrácie.

- Globálny unique partial index test_tasks_single_probe dovolí najviac jednu
  novú úlohu s create_request_id; INSERT vyžaduje názov
  „Syntetická TEST – cloudový zápis“. Žiadne uvoľnenie limitu cez UPDATE.
- Sekvencia test_tasks_id_seq: pod zámkom tasks začne max(id)+1, bez CYCLE,
  najviac JS safe integer. Staré ID ani väzby sa nemenia; medzery v ID sú normálne.
- Default autora auth.uid(); stĺpce write_version (default 1), create_request_id,
  create_payload; unique(workspace_id,created_by_user_id,create_request_id).
- SECURITY INVOKER trigger test_tasks_guard: autor zo serverovej identity,
  nemenné workspace/id/autor/request/pôvodný obsah; povinný prírastok verzie o 1.
- Politiky test_tasks_read_created SELECT, test_tasks_insert INSERT,
  test_tasks_update UPDATE s USING aj WITH CHECK.
- GRANT INSERT(workspace_id,title,status,priority,create_request_id) na tasks
  pre authenticated; GRANT UPDATE(title,status,priority,write_version).
- GRANT USAGE na novú sekvenciu iba authenticated; výslovný REVOKE ALL na nej
  pre PUBLIC/anon/authenticated pred úzkym grantom. Trigger funkcia má REVOKE ALL
  pre PUBLIC/anon/authenticated, nepotrebuje klientský EXECUTE.
- Žiadny nový tabuľkový DELETE, INSERT/UPDATE na potomkov, RPC ani SECURITY DEFINER.
  Žiadna zmena default ACL, Auth, existujúcich FK, event triggera alebo pohľadov.

Prvá iterácia upravuje iba názov/stav/prioritu. Nepodporuje zmenu priradení,
kalendára, oddelenia, entity, projektu, autora alebo workspace. Existujúce
zložené FK zostávajú ochrannou hranicou; klient nemá grant meniť tieto väzby.

## Pripravený kód a zámerne zatvorená brána

Nasledujúci opis patrí lokálnej príprave 498695a. Aplikačné súbory nie sú
súčasťou dokumentačného pushu; na vzdialenom pilote zostáva pôvodný read-only kód.

app/test-task-write.ts zostavuje len povolené stĺpce. Vytvorenie používa jedno
stabilné UUID požiadavky; po neznámom výsledku sa nesmie vygenerovať nové UUID.
Duplicita vráti 409, GET overí vlastný request a nemenný pôvodný obsah.
UPDATE používa workspace+id+očakávanú verziu vo filtri a posiela verziu+1;
nula výsledkov znamená konflikt alebo neprístupnosť, nie úspech. Žiadny slepý
retry UPDATE, upsert ani max(id)+1 v klientovi. Databáza rozhoduje o právach.

Transport má konštantu databazovyZapisSchvaleny=false a pred akýmkoľvek fetch
vyhodí WRITE_NOT_VERIFIED. Existujúci saveTestTask tiež zostáva uzamknutý.
**Transport ešte nie je napojený na UI.** Po SQL schválení a testoch bude
samostatne potrebné sprístupniť nový formulár len pre cloudový zdroj, načítať
write_version, uchovať request ID počas opakovania, zakázať druhé odoslanie
a napojiť výsledky na generáciu Auth controlleru. Odpoveď starého účtu sa
nesmie publikovať po odhlásení. Žiadne lokálne úlohy sa nesmú importovať.
Pripravený neaktívny sieťový transport zatiaľ nemá živý integračný PASS.

## Pôvodné lokálne overenie pred revíziou matice

- 153/153 aplikačných testov PASS, vrátane nulového fetch pred zatvorenou bránou.
- Pôvodných 26 izolovaných PostgreSQL WASM kontrol PASS: serverový autor a ID, duplicita,
  vlastný a priradený UPDATE, konflikt verzie, odmietnutie nepatriacej úlohy aj
  pre admina podľa vtedajšieho návrhu, analytika, cudzí workspace, anonym, podvrh identity a DELETE.
- Bezpečnostný rollback ponechá údaje a zruší zápis; úplný rollback pred prvým
  zápisom prešiel. Úplný rollback s históriou zápisu sa správne zastavil.
- Typecheck, bežný build, Cloudflare TEST exportový build a kontrola
  out/index.html, out/report/index.html, HTTP trás a fontov PASS.

SQL test používa zmenšenú syntetickú schému a simulované identity v skutočnom
PostgreSQL engine PGlite 0.5.16, nie živý Supabase ani verifikáciu podpisu JWT.
Neobsahuje reálne firemné údaje. Neoveruje produkčné zaťaženie ani súbežné
samostatné REST spojenia; tie patria do schváleného TEST scenára.
Spustenie: PGLITE_MODULE=<absolútna cesta k @electric-sql/pglite/dist/index.js>
node scripts/overit-test-crud-sql.mjs. Engine bol nainštalovaný iba do /tmp,
bez novej aplikačnej závislosti. Supabase dokumentácia RLS bola overená cez
search_docs; changelog nebol cez sieť prostredia dostupný.

## Schválený postup musí predchádzať živému zápisu

1. Znovu API overiť názov/ref projektu a katalógy oproti tomuto návrhu. Pri
   rozdiele zastaviť. Uchovať bezpečný snapshot ACL/definícií a existujúcich dát.
2. Po schválení v jednej transakcii BEGIN, SET LOCAL
   app.ai_planner_target_ref='yqleboakzkowfxsmynfy', návrhový SQL súbor.
   GUC je poistka operátora, nie dôkaz identity projektu; API kontrola je povinná.
3. Pred COMMIT preveriť presné granty cez aclexplode/has_column_privilege,
   nové politiky, invoker trigger/search_path, sekvenciu a zachované SELECT
   politiky/FK. DEFAULT sekvencie nesmie vydať kolízne alebo nebezpečné ID.
   Ak niečo nesedí, ROLLBACK bez COMMIT.
4. Až po kontrole schémy povoliť samostatný TEST aplikačný krok. Prihlasovať
   priamo bezpečným formulárom, nikdy nezapisovať heslá/tokeny do logov.
5. Vytvoriť jednu úlohu s názvom „Syntetická TEST – cloudový zápis“, stabilným
   request UUID a autorom A. Dve rovnaké odoslania musia vytvoriť len jeden riadok.
   Pokus rovnakého request s iným obsahom musí byť odmietnutý.
6. UPDATE tejto úlohy s aktuálnou verziou uspeje; druhý klient so starou verziou
   nesmie prepísať zmenu. Oprávnené priradenie testovať len na už schválenej
   syntetickej fixture; nevytvárať priradenie ani meniť staré údaje automaticky.
7. B a anonym nesmú čítať ani meniť úlohu A; analytik nesmie vytvárať/upravovať
   ani pri priamom REST volaní. Podvrh autora/ID/workspace, zápis väzby do
   cudzieho workspace a DELETE musia zlyhať aj mimo UI.
8. Oba reporty, logout/expiry/oneskorená odpoveď a lokálny snapshot ostávajú
   oddelené. Overiť aj súbežné REST INSERT a UPDATE z dvoch spojení.

## Rollback a rozhodnutie

[Bezpečnostný rollback](sql/test_task_write_rollback.sql) zruší presne nové
granty/politiky a vráti klienta do read-only režimu bez DELETE a CASCADE.
Metadáta a nové syntetické údaje ponechá na audit.
[Úplný rollback schémy](sql/test_task_write_schema_rollback.sql) sa môže vykonať
iba po bezpečnostnom rollbacku a pred prvým zápisom. Pri histórii zápisu sa
zastaví; nič nemaže. Cleanup syntetickej úlohy nie je súčasťou tejto etapy.

**OPEN DECISION / navrhovaná veta na schválenie:**
„Schvaľujem výhradne v ai-planner-test (yqleboakzkowfxsmynfy) aplikovanie
SQL návrhu 20261115160703_test_task_write_gate.sql s uvedenými grantmi,
politikami a rollbackom a následný syntetický TEST INSERT/UPDATE podľa scenára;
bez DELETE, produkcie a zmien existujúcich priradení.“

Bez tejto vety alebo rovnocenného výslovného potvrdenia sa SQL neaplikuje.
Pôvodný aplikačný commit zostáva lokálny. Používateľ následne schválil push
samostatnej dokumentačnej revízie; tá neobsahuje aplikačný modul ani deploy príkaz. Pripravenosť živej aplikácie na zápis zostáva BLOCKED do schválenia,
post-checkov a bezpečného napojenia formulára.

## Aktuálna revízia pred schválením

Predchádzajúci zákaz tímového UPDATE admina bol opravený podľa výslovnej matice
používateľa. Aktuálny baseline, rozdiely a výsledky R1/R2 sú v
[BASELINE-A-REVIZIA-CRUD.md](BASELINE-A-REVIZIA-CRUD.md). Nový dokumentačný commit
neobsahuje aplikačný modul ani odomknutie zápisu.
