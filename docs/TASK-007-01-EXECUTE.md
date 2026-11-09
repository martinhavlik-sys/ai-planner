# TASK-007 · návrh 1 · obmedzenie EXECUTE

**PASS: návrh a read-only inventár. BLOCKED: vykonanie zmeny a DDL skúšky čaká na samostatné schválenie.**

Základ: `b9753f33b079ba34afa858d73f707cbd705f1b34`, vetva `codex/pilot-supabase-auth-cloud-crud`, worktree `ai-planner-pilot`. Issue #3 je centrálny záznam, PR #4 zostáva draft. Kontrolovaný výhradne `ai-planner-test` (`yqleboakzkowfxsmynfy`), PostgreSQL 17.11. V tejto etape boli vykonané iba katalógové SELECT v transakciách BEGIN READ ONLY / ROLLBACK. **Všetky SQL bloky nižšie sú návrh, nie vykonaná zmena alebo migrácia.**

## Presný inventár

| Vlastnosť | Overené čítaním |
|---|---|
| Úplný podpis | `public.rls_auto_enable()`; žiadne argumenty ani overload v tomto návrhu |
| Výsledok/jazyk | `event_trigger`, PL/pgSQL |
| OID v kontrolovanom projekte | funkcia 17604; event trigger 17605; OID je iba údaj tejto inštancie, SQL používa kvalifikovaný podpis |
| Vlastník | postgres |
| Režim | SECURITY DEFINER; search_path=pg_catalog |
| ACL | proacl NULL; efektívny predvolený ACL: EXECUTE pre PUBLIC a postgres, grantor postgres, bez delegovaného grant option |
| Účinný EXECUTE | postgres, anon a authenticated: true; klientské právo pochádza z PUBLIC |
| ensure_rls | vlastník postgres, aktívny stav O, ddl_command_end; evttags CREATE TABLE, CREATE TABLE AS, SELECT INTO; evtfoid odkazuje na presne túto funkciu |

Kontroly: pg_proc, pg_namespace, pg_get_functiondef, pg_get_function_identity_arguments, pg_get_function_result, proacl, acldefault, aclexplode, has_function_privilege, pg_event_trigger, pg_depend a pg_shdepend.

### Závislosti v oboch smeroch

- Jediný evidovaný závislý objekt funkcie v pg_depend: **event trigger ensure_rls**, typ normálnej závislosti n. Jeho vlastná evidencia smeruje na túto funkciu.
- Evidované závislosti funkcie: schéma public a jazyk plpgsql, typ n.
- Zdieľané vlastnícke závislosti v pg_shdepend: funkcia aj event trigger → rola postgres, typ o.
- pg_proc.prosrc ostatných funkcií neobsahuje text rls_auto_enable. V aplikácii a repozitárových SQL sa volanie nenašlo; v dokumentácii je auditný opis.
- Runtime závislosti z manuálne prečítaného tela: pg_event_trigger_ddl_commands(), pg_catalog.pg_class, format(), ALTER TABLE ... ENABLE ROW LEVEL SECURITY na novom public objekte a RAISE LOG. Identifikátory sa formátujú cez %I; nejde o voľný text SQL od klienta.
- Telo spracúva iba podporované CREATE TABLE/AS/SELECT INTO a iba public tabuľky. Pri chybe zmeny RLS zachytí OTHERS a zapíše log. Preto samotný úspech CREATE TABLE nedokazuje, že RLS bolo zapnuté.
- Ďalšie aktívne event triggery zostávajú mimo zmeny: issue_graphql_placeholder, pgrst_ddl_watch, pgrst_drop_watch, issue_pg_cron_access, issue_pg_net_access, issue_pg_graphql_access. Ich funkcie sa nemenia. Probe DDL môže vyvolať aj všeobecné DDL watch triggery, preto patrí najprv do izolovanej skúšky.

Toto je úplný zistený **katalógový** graf a kontrola tela v danom okamihu. pg_depend nezachytáva všetky dynamické SQL odkazy PL/pgSQL ani externých klientov. Žiadny priamy aplikačný volajúci sa nenašiel; neprítomnosť neznámych externých integrácií nemožno z katalógu dokázať.

## Možno odobrať klientské EXECUTE bez porušenia ensure_rls?

**Áno podľa mechanizmu upstream PostgreSQL 17:** EventTriggerInvoke načíta registrované OID cez fmgr_info a volá funkciu interne s kontextom event triggera cez FunctionCallInvoke. Táto cesta nekontroluje klientský EXECUTE ako obyčajné SQL volanie. Odobratie od PUBLIC/anon/authenticated nemení OID, definíciu, vlastníka ani registráciu ensure_rls. Vlastník postgres si svoje EXECUTE ponechá a SECURITY DEFINER naďalej určuje oprávnenia tela.

**Prevádzkový výsledok na spravovanom Supabase po zmene zatiaľ NEOVERENÝ.** Zdrojová analýza nenahrádza skúšku konkrétnej verzie a providerových úprav. Záver preto umožňuje pripraviť úzky návrh, nie preskočiť overenie pred commitnutím zmeny v DB. Samotný grantový nález tiež nie je dôkazom úspešného škodlivého RPC; event_trigger je osobitný pseudotyp. Funkcia sa v tejto etape priamo nevolala.

Zdroje:
- [PostgreSQL 17, event triggery](https://www.postgresql.org/docs/17/event-trigger-definition.html).
- [Upstream REL_17_STABLE, EventTriggerInvoke](https://github.com/postgres/postgres/blob/REL_17_STABLE/src/backend/commands/event_trigger.c#L1075), prečítaná funkcia na riadkoch približne 1075–1130; blob ea934feb7150c3feb79a144ba5274d115be8c78c. Vetva zdroja nie je dôkazom binárnej zhody so Supabase.
- [PostgreSQL 17, REVOKE a kumulácia práv](https://www.postgresql.org/docs/17/sql-revoke.html).

## Návrh postupu a SQL — NEVYKONANÉ

Pred povolením zmeny znovu overiť projekt, podpis, vlastníkov, definíciu, ACL, závislosti a evtfoid/evtenabled/evttags. Ak sa čokoľvek líši od inventára, zastaviť sa. Operátor uloží pôvodnú definíciu a normalizovaný ACL do chráneného záznamu; bez údajov úloh a bez kľúčov. SQL vykoná vlastník postgres alebo oprávnený DB operátor; service_role ani klientský kľúč sa nepoužijú.

Presná navrhovaná zmena je iba:

```sql
-- NÁVRH, NEVYKONANÉ. Až po osobitnom schválení.
BEGIN;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()
FROM PUBLIC, anon, authenticated RESTRICT;
-- Pred COMMIT vykonať kontroly nižšie; pri odchýlke ROLLBACK.
COMMIT;
```

Bez CASCADE, bez ALTER DEFAULT PRIVILEGES, bez zmeny vlastníka/definície/SECURITY DEFINER, bez výmeny alebo vypnutia triggera. Neodoberajú sa práva can_read_task, current_workspace_role ani is_workspace_member. RESTRICT má pri nečakanej delegácii radšej zastaviť operáciu; nepoužiť CASCADE ako obchádzku.

Read-only kontrola pred commitom a po zmene:

```sql
SELECT has_function_privilege('anon', 'public.rls_auto_enable()', 'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated', 'public.rls_auto_enable()', 'EXECUTE') AS authenticated_execute,
       has_function_privilege('postgres', 'public.rls_auto_enable()', 'EXECUTE') AS owner_execute;
SELECT e.evtname, e.evtevent, e.evtenabled, e.evttags,
       e.evtfoid = 'public.rls_auto_enable()'::regprocedure AS same_function
FROM pg_event_trigger e WHERE e.evtname = 'ensure_rls';
SELECT p.oid::regprocedure, pg_get_userbyid(p.proowner), p.prosecdef,
       p.proconfig, p.proacl, pg_get_functiondef(p.oid)
FROM pg_proc p WHERE p.oid = 'public.rls_auto_enable()'::regprocedure;
```

Očakávanie: false/false/true; presne pôvodný ensure_rls a jeho definícia/vlastník; telo funkcie a graf závislostí bez zmeny. Skontrolovať tiež aclexplode, aby PUBLIC nemal EXECUTE ani grant option, a zopakovať bezpečnostného poradcu. Prípadné zostávajúce EXECUTE z dedenia je dôvod zastaviť sa, nie automaticky meniť ďalšie roly.

### Funkčná DDL skúška — samostatná schvaľovacia brána

Najprv izolovaný PostgreSQL 17 s rovnakou funkciou/registráciou; následná skúška na testovacom projekte iba po osobitnom povolení. Ide o DDL aj v prípade záverečného ROLLBACK, preto sa **dnes nespúšťa**. Pred skúškou musia byť všetky tri názvy neobsadené; pri kolízii žiadny objekt neprepisovať.

```sql
-- NÁVRH IZOLOVANEJ SKÚŠKY, NEVYKONANÉ.
BEGIN;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()
FROM PUBLIC, anon, authenticated RESTRICT;
CREATE TABLE public.task007_probe_create (id bigint);
CREATE TABLE public.task007_probe_ctas AS SELECT 1::bigint AS id WITH NO DATA;
SELECT 1::bigint AS id INTO public.task007_probe_selectinto WHERE false;
SELECT c.relname, c.relrowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('task007_probe_create','task007_probe_ctas','task007_probe_selectinto');
ROLLBACK;
```

Vyžadovať presne 3 riadky, všetky relrowsecurity=true. Ak sa vráti false alebo chýba riadok, skúška neprešla ani pri úspešnom DDL. Po ROLLBACK nesmú zostať probe objekty a musia platiť pôvodné ACL. Transakčný rollback neodstráni serverové logy alebo iné mimotransakčné pozorovania; aj preto skúška používa iba syntetické názvy a vyžaduje osobitný súhlas. Až potom môže byť osobitne schválená minimálna trvalá zmena. Následné reálne DDL operácie sa sledujú cez relrowsecurity; žiadna nová tabuľka sa nezverejňuje bez RLS/grant auditu.

## Rollback návrh — NEVYKONANÉ

Pred COMMIT: obyčajný ROLLBACK transakcie vracia pôvodný ACL; trigger nemeníme, preto sa neobnovuje.

Po commitnutej zmene a iba pri stále zhodnom pôvodnom ACL z tohto auditu:

```sql
-- NÁVRH ROLLBACKU, NEVYKONANÉ. Vyžaduje osobitné schválenie.
BEGIN;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO PUBLIC;
COMMIT;
```

Pôvodne neexistovali priame granty anon/authenticated, preto sa im pri rollbacku nepridávajú. PUBLIC obnoví ich pôvodný efektívny prístup; owner postgres zostal zachovaný. Ide o **sémanticky zhodné oprávnenia**, nie o násilné nastavenie pg_proc.proacl späť na NULL. Systémové katalógy sa neupravujú. Pri zmene grantového grafu treba nový návrh podľa čerstvého snapshotu.

Rollback znovu rozširuje prístup a musí byť výslovne schválený; nevykonávať ho automaticky ani po zavedení súkromných dát. Aplikácia zostáva Auth-only. Pokiaľ by bol problém v ensure_rls, nevypínať ho ani neodstraňovať ako skratku.

## OPEN DECISION a potrebné schválenia

1. Povolenie izolovanej DDL skúšky a jej konkrétneho prostredia, bez platených služieb.
2. Po výsledku skúšky povolenie presného REVOKE na ai-planner-test vrátane kontrol a prípadného rollbacku.
3. Potvrdenie, že sa neočakáva klientsky priamy prístup k event-triggerovej funkcii; prípadné externé integrácie preverí vlastník.

Žiadny z týchto krokov sa nepovažuje za schválený týmto dokumentačným návrhom. Čítanie ani zápis aplikácie sa neodomykajú.
