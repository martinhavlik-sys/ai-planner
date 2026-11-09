# TASK-006-RESULT · read-only audit RLS

Dátum: 1. 11. 2026, Europe/Bratislava.

**Celkový stav: BLOCKED. Audit je vykonaný; aplikačné čítanie aj zápis zostávajú uzamknuté.**

## Overený základ a rozsah

- Repozitár: `martinhavlik-sys/ai-planner`.
- Worktree: `ai-planner-pilot`, v tomto prostredí `/workspace/work/ai-planner-pilot`.
- Vetva: `codex/pilot-supabase-auth-cloud-crud`.
- Základ: `076eb3b11b3b035c6c0abd857aad71b744aff277`, čistý vstupný pracovný strom.
- [Issue #3](https://github.com/martinhavlik-sys/ai-planner/issues/3) je centrálny záznam; [PR #4](https://github.com/martinhavlik-sys/ai-planner/pull/4) bol overený ako otvorený draft. Nevykonáva sa merge.
- Jediný kontrolovaný databázový projekt: `ai-planner-test`, ref `yqleboakzkowfxsmynfy`, ACTIVE_HEALTHY, PostgreSQL 17.11.
- Produkčný projekt sa nedotazoval. Žiadne kľúče, heslá, tokeny, e-maily, mená ani obsah úloh sa nezískavali a nezverejňujú. Katalóg a väzby boli čítané cez spravovaný Supabase konektor, bez použitia service_role kľúča.
- Pôvodný repozitár a rozpracovaná Cloudflare vetva zostali nedotknuté; do pilotu sa z nich nekopírovali úpravy.

## Rozlíšenie dôkazov

1. **Skutočné čítanie živej databázy:** katalógy, definície, účinné práva, metadáta väzieb a počty. Bez čítania názvov či poznámok úloh.
2. **Skutočné vyhodnotenie PostgreSQL RLS nad existujúcimi údajmi so simulovanou identitou:** sedem existujúcich identít sa nastavilo iba ako transakčný `request.jwt.claims.sub`; následne `SET LOCAL ROLE authenticated`. Každý výsledok potvrdil `current_user=authenticated`, `transaction_read_only=on`, `row_security_active('public.tasks')=true`. Nešlo o počítanie ako postgres ani o mock databázy. Identita však bola simulovaná: netestovalo sa heslo, podpis JWT, tokenový endpoint ani PostgREST prihlasovacia relácia.
3. **Lokálne simulácie:** 127 jednotkových a komponentových testov s mockovaným Auth transportom. Nie sú dôkazom serverovej RLS ani živého prihlásenia.
4. **Nevykonané:** živý login dvoch účtov cez aplikáciu, prehliadačová akceptácia, revokácia skutočnej Auth relácie, deploy a zdieľanie reálnych údajov.

Všetky úspešné SQL volania používali `BEGIN READ ONLY`; končili `COMMIT` read-only transakcie alebo `ROLLBACK`. Nastavenia roly a claims boli transakčné. Jeden zámerný negatívny test anon skončil očakávaným odmietnutím oprávnenia. Nevytvárali sa objekty, dočasné tabuľky ani fixtures; nevykonal sa INSERT, UPDATE, DELETE, DDL, migrácia alebo privilegovaná funkcia so zapisovacím účinkom.

## Presné databázové kontroly

| Dôkaz | Kontrola | Výsledok |
|---|---|---|
| D01 | `pg_class`, `pg_namespace`: public tabuľky, RLS, FORCE RLS a typy relácií | 14 tabuliek má RLS; FORCE RLS vypnuté. |
| D02 | `pg_policies`: názov, cieľové roly, operácia, USING a WITH CHECK | 14 politík, všetky SELECT pre authenticated. Žiadne zapisovacie politiky. |
| D03 | `pg_proc`, `pg_get_functiondef`, `pg_get_function_identity_arguments`, vlastník, proconfig, proacl, `has_function_privilege` | Prečítané všetky public funkcie a definície privilegovaných helperov; nález verejného EXECUTE nižšie. |
| D04 | `pg_get_viewdef`, reloptions | Oba reportingové pohľady používajú `security_invoker=true`. |
| D05 | `has_table_privilege`: SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER a MAINTAIN pre anon/authenticated | authenticated má SELECT; ostatné kontrolované práva nie. anon nemá ani SELECT na 14 tabuľkách a dvoch pohľadoch. Žiadne stĺpcové ACL. |
| D06 | `pg_roles`, `has_schema_privilege` | anon/authenticated nie sú superuser a nemajú BYPASSRLS; public USAGE áno, CREATE nie. |
| D07 | `pg_trigger`, `pg_get_triggerdef`, `pg_event_trigger`, `pg_depend`, ručné prečítanie volaní helperov | 13 public riadkových triggerov; aktívny ensure_rls používa rls_auto_enable. Žiadny sa nevyvolával zápisom ani nemenil. |
| D08 | `pg_constraint`, duplicity `(workspace_id,id)`, siroty priradení | tasks má zložený PK, bezpečný rozsah bigint; duplicity 0, siroty priradení 0. Členstvo a profily majú väzby na Auth a workspace. |
| D09 | Join metadát Auth → profil → členstvo → workspace, bez mien/e-mailov | 7 potvrdených identít, 7 členstiev; každé má práve jeden aktívny profil a existujúci workspace. Siroty členstiev/profilov 0. |
| D10 | Metadáta tasks a aktívnych priradení, bez obsahu | 7 úloh: 6 v A, 1 v B; všetkých 7 má NULL autora. 6 priradení, 3 bloky a 3 task_entities väzby. |
| D11 | RLS transakcie siedmich identít vrátane explicitného filtra cudzieho workspace | Výsledková matica nižšie; všetky zodpovedali nezávisle zostavenému očakávaniu podľa aktuálnych pravidiel a aktívnych priradení. |
| D12 | RLS na reporting_tasks, reporting_task_entity_links, calendar_slots, task_entities, task_assignees, profiles a členstvách; doplnkové kontroly katalógov/task_clients | Žiadny cezworkspace prienik v kontrolovaných dotazoch. |
| D13 | authenticated bez sub; priamy SELECT tasks ako anon | Bez sub: 0 workspace/úloh/reportu/profilov/blokov. anon: očakávaná SQLSTATE 42501, permission denied. Žiadny grant sa podľa chybového hintu nevykonal. |
| D14 | `to_regclass('supabase_migrations.schema_migrations')`, public sekvencie | Register nenájdený, 0 sekvencií. Nezakladal sa register ani migračná história. |
| D15 | Supabase bezpečnostný poradca | Verejný SECURITY DEFINER nález a vypnutá ochrana uniknutých hesiel; bez zmien nastavení. |

D11/D12 používali tento postup s konkrétnymi UUID existujúcich identít, ktoré sa do verejného záznamu neprenášajú:

```sql
BEGIN READ ONLY;
SELECT set_config('request.jwt.claims',
  jsonb_build_object('sub', '<UUID overeného používateľa>',
                     'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT current_user,
       current_setting('transaction_read_only'),
       row_security_active('public.tasks'::regclass);
-- Agregácie nad public.tasks, workspaces a súvisiacimi tabuľkami/pohľadmi:
-- count(*), zložené kľúče, explicitný filter workspace A/B,
-- počet riadkov s workspace_id odlišným od členstva aktéra,
-- počet cudzích členstiev voči auth.uid().
ROLLBACK;
```

Kontrolované cudzie počty sa vyhodnocovali ako `WHERE workspace_id <> <workspace aktéra>`; na workspaces ako `WHERE id <> <workspace aktéra>` a na členstvách ako `WHERE user_id <> auth.uid()`. Očakávaný zoznam task kľúčov sa porovnal s celým vráteným zoznamom, nie iba s počtom. Zoznam vznikol zo samostatne prečítaného členstva, NULL autorstva a aktívnych priradení. Pri tímových rolách obsahoval všetky tasky daného workspace.

## Matica databázového RLS testu

Označenia U1–U7 a A/B sú pseudonymy v rámci tohto auditu.

| Aktér | Rola | Workspace | Viditeľné vlastné workspace | Úlohy A | Úlohy B | Reporting tasky | Bloky | Cudzí workspace/úlohy |
|---|---|---|---:|---:|---:|---:|---:|---:|
| U1 | admin | A | 1 | 6 | 0 | 6 | 3 | 0 |
| U2 | member | A | 1 | 1 | 0 | 1 | 0 | 0 |
| U3 | member | A | 1 | 1 | 0 | 1 | 0 | 0 |
| U4 | member | B | 1 | 0 | 0 | 0 | 0 | 0 |
| U5 | admin | A | 1 | 6 | 0 | 6 | 3 | 0 |
| U6 | user | A | 1 | 2 | 0 | 2 | 1 | 0 |
| U7 | analyst | A | 1 | 6 | 0 | 6 | 3 | 0 |

**PASS pre aktuálnu databázovú maticu:** člen A vidí len oprávnené priradenie a nevidí workspace B; člen B nevidí workspace A; administrátori A nevidia B; analytik A vidí tímový rozsah A. Aktuálne pravidlo vyžaduje členstvo a potom povoľuje autora/priradenie alebo tímovú rolu owner/admin/analyst. Tímový rozsah analytika sa tu hodnotí podľa aktuálneho TASK-006, nie ako potvrdenie staršieho návrhu striktne súkromného pilotu z TASK-002.

**BLOCKED pre úplnú pozitívnu A/B akceptáciu úloh:** v B existuje úloha, ale nemá autora ani aktívne priradenie členovi U4. Nulový výsledok je správne odmietnutie podľa dnešnej RLS; nie je kladným dôkazom čítania oprávnenej úlohy používateľa B. Vytvorenie fixture alebo zmena autora/priradenia je zakázaná, preto sa tento chýbajúci test nedopĺňal zápisom. Kladný test vlastného workspace B a negatívny test B → A prešli; kladný task test B zostáva neoverený.

Všade sa vrátilo 0 cudzích profilov/členstiev/taskov/reportov/blokov/úlohových väzieb. Doplňujúca kontrola U1/U2/U4/U7 potvrdila 0 cudzích reportingových väzieb, task_clients, projektov, oddelení a katalógových entít. Reportingové väzby sa podľa roly zobrazili v počtoch 2/1/0/2. Pri malých alebo prázdnych tabuľkách negatívny výsledok nie je dôkazom všetkých budúcich kombinácií.

## SECURITY DEFINER a grantová brána

| Funkcia | Skutočne overené | Hodnotenie |
|---|---|---|
| `public.rls_auto_enable()` | Vlastník postgres, SECURITY DEFINER, `search_path=pg_catalog`, výsledok pseudotyp event_trigger, proacl NULL a účinné EXECUTE pre anon/authenticated. Závisí od nej aktívny event trigger ensure_rls pre CREATE TABLE/AS/SELECT INTO. | **FAIL voči najmenším oprávneniam; grantová brána nevyriešená.** Nevolala sa. Návratový typ event_trigger bráni tomu, aby sa samotný ACL nález vydával za dokázané ľubovoľné vykonanie DDL cez RPC. |
| `public.is_workspace_member(uuid,boolean)` | SECURITY DEFINER, prázdny search_path, explicitná väzba auth.uid na členstvo, EXECUTE iba postgres/authenticated. | Potrebná pre členské politiky a zamedzenie rekurzie. Pri skúšaných identitách neprekročila workspace. |
| `public.current_workspace_role(uuid)` | SECURITY DEFINER, prázdny search_path; vracia iba vlastné členstvo podľa auth.uid, EXECUTE postgres/authenticated. | Používa ju can_read_task. Vnútorné textové volanie bolo tiež manuálne skontrolované; samotný pg_depend nemusí zachytiť všetky volania z tela funkcie. |
| `public.can_read_task(uuid,bigint)` | SECURITY DEFINER, prázdny search_path; najprv vlastné členstvo, potom tímová rola alebo autor/aktívne priradenie. EXECUTE postgres/authenticated. Závisia od nej 4 SELECT politiky. | Overená aktuálna matica; nezamieňať priradenie za autorstvo. Nepoužíva používateľom upraviteľné metadata. |

`seed_catalog` je SECURITY INVOKER a vykonateľná iba postgres; nevolala sa. `touch_updated_at` a `project_edition_unique` sú SECURITY INVOKER triggerové funkcie; nevolali sa priamo ani zápisom.

Prístup EXECUTE na autorizačné helpery nie je automaticky zraniteľnosť: sú potrebné pre RLS a majú kontrolu auth.uid. Plošné odoberanie práv by mohlo rozbiť SELECT politiky. Pri rls_auto_enable zostáva konkrétny nález z princípu najmenších oprávnení; bez osobitne schváleného posúdenia/nápravy sa brána nepovažuje za úspešnú. Ensure_rls ani jeho funkcia sa neodstraňujú.

[Poradca: anonymné EXECUTE na SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).
[Poradca: EXECUTE pre authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
[Ochrana proti uniknutým heslám](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) je podľa poradcu vypnutá; nemenila sa.

## Akceptačné body TASK-006

| Bod | Stav | Dôkaz |
|---|---|---|
| A vidí iba oprávnené úlohy | PASS na PostgreSQL RLS so simulovanou identitou | U2/U3: presne 1 oprávnená priradená úloha. |
| A nevidí workspace B | PASS na PostgreSQL RLS | 0 pri explicitnom dotaze aj bez filtra. |
| B nevidí workspace A | PASS na PostgreSQL RLS | U4: 0; vlastný workspace B viditeľný. Pozitívna task fixture B chýba. |
| Admin vidí iba svoj workspace | PASS na PostgreSQL RLS | U1/U5: 6 taskov A, 0 B. |
| Analytik vidí tímový rozsah podľa pravidiel | PASS na PostgreSQL RLS | U7: 6 taskov A, 0 B. |
| Stabilný workspace_id + id | PASS | Databázový PK, 0 duplicít; RemoteTask obsahuje obe polia a page.tsx ich spája v React kľúči. Čítacia cesta zostáva zablokovaná. |
| Skrytie po odhlásení | PASS lokálne; živý Auth NEOVERENÝ | Existujúce testy okamžitého vyčistenia stavu/session a chyby logout. Auth-only teraz vôbec nevydáva task dáta. |
| Oneskorená odpoveď starého účtu | PASS lokálne; živé E2E NEOVERENÉ | Mockované login/refresh/verify/expiry/dispose a prepnutie A → B; kontrola generation. |
| Lokálne úlohy oddelené a nezmenené | PASS lokálne | Súbory modelu, stránky, reportu a repository sa nemenia; prešli modelové aj komponentové regresie. |

## Aplikácia, testy a build

Read-only brána nie je kompletne splnená. **Žiadna aplikačná cesta sa neodomyká.** `readTestTasks` naďalej vyhodí `TestTaskReadBlockedError` s `READ_NOT_VERIFIED` pred fetch. Controller nevolá task read pri login/restore/reload/focus/timer a publikuje `tasks=[]`. `saveTestTask` naďalej vyhodí `WRITE_NOT_VERIFIED` pred sieťovým volaním. Nepridáva sa verejný prepínač, náhrada RLS klientským filtrom ani automatický import localStorage.

- **PASS:** 127/127 jednotkových a komponentových testov, 0 zlyhaných, 0 preskočených.
- Príkaz: `BABEL_BUNDLE=/absolutna/cesta/playwright/lib/transform/babelBundle.js node --test --test-isolation=none --test-reporter=tap tests/*.test.mjs`.
- **PASS:** `tsc --noEmit --incremental false`.
- **PASS:** produkčný `next build`, Next.js 16.3.5; vygenerované statické trasy `/`, `/report`, `/_not-found`. Nie je to Cloudflare deploy ani tvrdenie o priečinku out.
- Build mal odstránené NEXT_PUBLIC_SUPABASE_URL a NEXT_PUBLIC_SUPABASE_ANON_KEY z prostredia; v worktree neboli lokálne .env súbory. Žiadne reálne účty alebo secrets sa nepoužili.
- Prostredie: Node 24.19.0, pnpm 11.19.0. Existujúci lockfile zostal nezmenený, nové závislosti sa nepridali.
- **PASS:** `git diff --check`; automatická zmena next-env.d.ts po builde vrátená a typecheck znova prešiel.
- Jediný zmenený projektový súbor: `docs/TASK-006-RLS-AUDIT.md`. Kód, SQL/migrácie, konfigurácia a dáta sa nemenia.

## Ďalší krok a hranice

Najmenší ďalší krok: samostatne schváliť riešenie verejného EXECUTE na rls_auto_enable pri zachovaní ensure_rls a zabezpečiť oprávnenú pozitívnu testovaciu úlohu B alebo iné vhodné existujúce identity. Prípadný fixture zápis, zmena grantov či pravidiel musí byť osobitne schválená; táto etapa ich nepripravuje ako vykonanú migráciu a neaplikuje ich.

Potom zopakovať read-only bránu a oddelene overiť skutočný A/B Auth → REST tok. Až po úspechu odomknúť iba read-only aplikáciu so samostatným lokálnym režimom a bez zápisov. Aktuálne sa nepovoľuje dátový pilot kolegom, cloud CRUD, merge PR #4, main ani produkčné nasadenie.
