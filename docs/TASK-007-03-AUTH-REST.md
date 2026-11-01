# TASK-007 · návrh 3 · živý Auth → REST test A/B

**PASS: testovací návrh. BLOCKED: živé vykonanie, fixture a zmena ACL nie sú v tejto etape povolené. OPEN DECISION: účty, operátor, súkromné testovacie prostredie a presné schválenie ďalšej etapy.**

Základ: `b9753f33b079ba34afa858d73f707cbd705f1b34`, worktree `ai-planner-pilot`, vetva `codex/pilot-supabase-auth-cloud-crud`. Aplikácia zostáva Auth-only, readTestTasks stále READ_NOT_VERIFIED, zápisy WRITE_NOT_VERIFIED. PR #4 sa nemergeuje. Tento dokument neimplementuje testovací klient ani neodomyká aplikáciu.

## Predpoklady a poradie schvaľovacích brán

1. Prijať návrh 1, osobitne schváliť izolovanú skúšku a prípadnú úzku zmenu EXECUTE. Uložiť úspešné read-only dôkazy po zmene. Ak ensure_rls alebo účinné ACL nevyhovujú, nepokračovať.
2. Prijať návrh 2, osobitne schváliť vloženie a cleanup jedinej syntetickej úlohy B. Po jej commite musí existovať presne (B,7007001), s autorom B a markerom. Samotná existencia iného tasku B s NULL autorom nie je náhrada kladného testu.
3. Osobitne schváliť vykonanie živého Auth → REST testu a použitie konkrétnych existujúcich testovacích účtov. Prihlásenie/refresh/logout vytvárajú alebo rušia relácie, hoci nemenia Auth nastavenia ani task údaje. Dnes sa tieto operácie nevykonávajú.
4. Test vykonať v súkromnom lokálnom validačnom klientovi/harnesse, oddelenom od produkcie a Cloudflare deployu. Príprava a použitie takého dočasného klienta je súčasťou budúceho schválenia; v TASK-007 sa kód klienta nevytvára. Existujúca aplikácia sa nesmie potichu odomknúť kvôli testu.

Súčasný TestSessionController nikdy nevolá task transport. Preto v ňom dnes nemožno pravdivo vykázať živú skúšku oneskoreného task response. Prvý živý Auth/REST test môže preukázať serverové prístupy v izolovanom harnesse; rovnakú skúšku treba po samostatne schválenej integrácii zopakovať nad skutočnou aplikačnou cestou. Hranicu medzi týmito dôkazmi zachovať v Issue.

## Identita a manipulácia s údajmi

- Projekt je pevne ai-planner-test, ref yqleboakzkowfxsmynfy. Origin API: `https://yqleboakzkowfxsmynfy.supabase.co`.
- Workspace A: `00000000-0000-0000-0000-000000004a01`; workspace B: `00000000-0000-0000-0000-000000004b01`.
- A je existujúci potvrdený member A s aktívnym profilom a oprávnením na testovací task A (v aktuálnom inventári priradenie tasku 4102). Operátor znovu overí členstvo/priradenie a identitu; do Issue ich mapuje iba na označenie A. B je presne osoba potvrdená v návrhu 2, autor fixture 7007001.
- Účty musia byť rôzne a bez členstva v druhom testovacom workspace. Ak sa matica zmení, očakávania treba schváliť znova; nie prepisovať členstvá alebo znižovať ochrany kvôli testu.
- Heslo zadá držiteľ účtu priamo do lokálneho prihlasovacieho formulára. Nekopíruje sa z iného úložiska do chatu, dokumentov, shell argumentov, .env ani logov. Žiadne čítanie Auth hashov alebo získavanie cudzej relácie.
- Použije sa iba verejný publishable/anon kľúč testovacieho projektu zo schválenej konfigurácie. Nikdy service_role, secret alebo produkčný kľúč. Neukladať tokeny ani request/response hlavičky do HAR, screenshotov, videa, artefaktov alebo Issue; vypnúť detailné sieťové logovanie.
- Verifikačný klient drží heslo len počas odoslania a tokeny iba v pamäti/samostatnej testovacej relácii. Nesmie pristupovať k lokálnym firemným dátam; lokálnu regresiu vykonáva so syntetickým localStorage v izolovanom profile. Žiadny automatický import.

## Presné HTTP kontrakty a očakávania

V príkladoch <TOKEN_A>/<TOKEN_B> označujú iba internú premennú klienta; hodnoty sa neprepisujú do príkazov alebo dokumentov. Každé REST čítanie musí mať verejný apikey a Authorization Bearer token aktuálneho používateľa, nikdy anon kľúč ako používateľský token. Na tasky a pohľady sa používajú iba GET.

| Poradie | Operácia | Očakávanie a dôkaz |
|---|---|---|
| 1 | A: POST /auth/v1/token?grant_type=password cez lokálny formulár | Úspešná relácia; bez logovania hesla/tokenu. GET /auth/v1/user musí potvrdiť presné očakávané UUID A. Účet na obrazovke sám nestačí. |
| 2 | A: GET /rest/v1/workspaces?select=id | Len A, nikdy B; porovnať presné ID v pamäti a do záznamu uviesť iba PASS/počet. |
| 3 | A: GET /rest/v1/tasks?select=workspace_id,id,status,priority&order=workspace_id.asc,id.asc | Kladný výsledok obsahuje oprávnený task A; v nezmenenom inventári presne 4102. Všetky vrátené kľúče musia patriť povolenému rozsahu. Čítať všetky stránky, nie len prvú. |
| 4 | A: rovnaký GET s workspace_id=eq.B&id=eq.7007001 | HTTP 200 a prázdny zoznam. Fixture B musí preukázateľne existovať. Zopakovať aj workspace_id=eq.B bez id. |
| 5 | A: GET /rest/v1/workspaces?select=id&id=eq.B | HTTP 200 a prázdny zoznam; JWT musí byť stále platný. |
| 6 | A: reporting_tasks a reporting_task_entity_links | Vlastný task A cez task_id musí zodpovedať tasks; cudzie B a známa fixture B sa nesmú objaviť. Porovnať aj neobmedzené zoznamy kľúčov. |
| 7 | A: logout | Pred sieťovým čakaním vyčistiť remote cache a report, odstrániť reláciu A, zvýšiť generation a zrušiť rozpracované requesty. POST /auth/v1/logout?scope=local musí potvrdiť ukončenie aktuálnej relácie; nie global logout. |
| 8 | B: POST password grant a GET /auth/v1/user | Overiť presnú identitu B, nie len úspešný HTTP stav. Žiadne použitie tokenu A na požiadavku B. |
| 9 | B: GET /rest/v1/tasks?select=workspace_id,id,created_by_user_id&workspace_id=eq.B&id=eq.7007001 | Presne jeden riadok, presný zložený kľúč a autor B. Kontrolovať bez zverejnenia UUID. Prázdny výsledok je FAIL kladného testu. |
| 10 | B: všetky povolené tasky a workspaces | Len workspace B; v dnešnom modeli má B vidieť novú fixture, nie automaticky pôvodnú nepriradenú úlohu B. Nevyžadovať počet všetkých fyzických riadkov B. |
| 11 | B: GET tasks s workspace_id=eq.A; zopakovať s id=eq.4102 | HTTP 200 a []; známa úloha A existuje, token B je stále platný. GET workspaces s id=eq.A tiež []. |
| 12 | B: GET /rest/v1/reporting_tasks?select=workspace_id,task_id&workspace_id=eq.B&task_id=eq.7007001 | Presne jeden riadok B/7007001. Rovnaký GET s A/4102 a zoznam cudzích A musia byť prázdne. |
| 13 | B: GET /rest/v1/reporting_task_entity_links?select=workspace_id,task_id,entity_id | Žiadne väzby A. Pre fixture B/7007001 sa očakáva [], lebo žiadna väzba nebola vytvorená. Nie je to pozitívny test entity linku. |
| 14 | Odhlásenie B a cleanup klienta | Vzdialené údaje aj tokeny skryté, žiadne zmeny syntetického lokálneho workspace; zavrieť izolovaný profil/klient po zachovaní sanitizovaných výsledkov. |

A/B v query parametroch v tabuľke sú vysvetľujúce aliasy; klient ich nahradí presnými vyššie uvedenými UUID pomocou URLSearchParams. Neposielať doslovné eq.A/eq.B. task_id je názov stĺpca pohľadov, id je názov stĺpca tasks. Pre pozitívne čítania vracať len minimum uvedených polí; názvy, poznámky a firemný obsah iných úloh nie sú potrebné.

HTTP 401/403, timeout, chýbajúca konfigurácia, nesprávny účet alebo neúplné stránkovanie sa nesmú započítať ako úspešná negatívna izolácia. Pri dnešných SELECT grantoch sa očakáva 200 s [] vďaka RLS. Platnosť identity overiť pred negatívnym scenárom aj po ňom. Pri nečakanom oprávnení zastaviť test, nevypisovať cudzie riadky a ponechať aplikáciu zamknutú.

## Deterministický test oneskorenej odpovede A → B

Samostatný scenár so živým GET a riadeným oneskorením doručenia:

1. A je overený. Začať GET oprávneného zoznamu A a priradiť mu generation gA aj UUID účtu A.
2. Testovací transport zachytí úspešnú živú odpoveď A a podrží jej doručenie do zobrazovacieho stavu v pamäti. Údaje sa nesmú zapísať do localStorage alebo logu. Odložiť aj variant s chybou/401 A.
3. V tom istom testovacom UI vykonať logout A. Ihneď musí platiť remoteTasks=[] a prázdny vzdialený report, aj keď logout request ešte čaká alebo zlyhá.
4. Prihlásiť a overiť B, zvýšiť generation, načítať B a počkať na zobrazenie B/7007001.
5. Až potom uvoľniť podržanú úspešnú odpoveď A, následne v druhom behu podržanú chybu A. Kontrola generation a identity musí výsledok A ignorovať pred publikovaním. Úloha A, jej počty, nadpisy a report sa nesmú objaviť ani na jeden render. Chyba A nesmie odhlásiť alebo vyčistiť platný účet B.
6. Overiť, že aktívny účet a všetky kľúče reportu/tabuľky stále patria B; nikdy nepoužiť neobmedzenú číselnú identitu id bez workspace_id. Lokálny syntetický snapshot musí byť byte-identický s pôvodným uloženým JSON, okrem výslovne používateľom vykonaných lokálnych editácií, ktoré sa pri tomto teste nevykonávajú.
7. Zopakovať s cancel, odhlásením bez následného loginu, obnovením stránky a vypršaním relácie. Po obnove sa najprv overí identita a až potom by sa smel publikovať cloudový zdroj. Žiadne zobrazenie neoverenej cache.

AbortController je len optimalizácia: odpoveď už môže byť doručená, preto rozhoduje generation + identita po každom await. Živé HTTP požiadavky s oneskoreným doručením sú reálnym testom REST a koordinátora validačného klienta, **nie dôkazom zatiaľ neimplementovanej aplikačnej čítacej cesty**. Existujúce Auth-only testy kontrolujú oneskorené Auth odpovede, nie živé task čítanie. Po samostatne schválenom odomknutí sa scenár musí zopakovať v aplikácii vrátane Reportu.

Odhlásenie zruší reláciu/refresh token; už vydané access JWT môže zostať platné do expirácie. Preto nevyžadovať ako dôkaz logout okamžitý 401 pri opätovnom použití starého access tokenu a nesnažiť sa ho opakovane zneužívať. Lokálne vyčistenie a potvrdenie Auth logout zaznamenať oddelene. Zdroj: [Supabase odhlásenie a scope](https://supabase.com/docs/guides/auth/signout).

## Záznam a rollback testu

Pri každom kroku zaznamenať: pseudonym A/B, rolu, pseudonym workspace, typ GET/Auth operácie bez tokenov, očakávané a skutočné počty/kľúčovú zhodu, HTTP stav a PASS/FAIL/BLOCKED. Neprikladať raw odpovede, hlavičky Authorization/apikey, request body prihlásenia, sessionStorage alebo neanonymizované screenshoty. Porovnávanie presných UUID a kľúčov prebehne iba v pamäti/chránenom pracovnom zázname.

- GET testy nepotrebujú databázový rollback; tasky nesmú meniť.
- Relácie ukončiť iba aktuálnym logout, odstrániť tokeny z testovacieho klienta a zavrieť izolovaný profil. Nemažú sa účty a nemenia Auth nastavenia.
- Fixture odstrániť výhradne samostatne schváleným presným cleanupom návrhu 2.
- Prípadný návrat ACL patrí iba do schváleného rollbacku návrhu 1. Pri zlyhaní izolácie sa nesmie automaticky obnoviť širší prístup.
- Aplikácia, main, produkcia, Cloudflare a PR merge zostávajú mimo tohto testu. Aktuálny Auth-only zámok sa testom neobchádza.

## OPEN DECISION a potrebné samostatné schválenia

1. Schváliť konkrétne A/B účty, držiteľov prihlasovacích údajov a súkromné lokálne prostredie/operátora.
2. Schváliť vytvorenie a vykonanie dočasného validačného klienta a živé Auth operácie vrátane deterministického oneskorenia odpovede; bez deployu, zápisu taskov a úniku údajov do logov.
3. Schváliť predchádzajúcu ACL skúšku/zmenu a fixture/cleanup podľa návrhov 1 a 2.
4. Až po výsledkoch osobitne schváliť aplikačné read-only odomknutie a jeho E2E test. Tieto tri návrhy samy osebe nie sú povolením meniť čítaciu cestu, RLS, granty alebo nasadenie.

**Dnes: žiadny login, REST task GET, logout, fixture, DDL alebo REVOKE. Iba návrh a čítanie katalógov.**

## Skutočne vykonané kontroly prípravnej etapy

- PASS: aktuálny read-only katalógový inventár funkcie, ACL, oboch smerov pg_depend, vlastníckych pg_shdepend a event triggera; doplňujúca kontrola textových odkazov ostatných funkcií a repozitára.
- PASS: read-only kontrola existencie workspace B, počtu jeho členov/aktívnych profilov, schémy taskov, triggera a dostupnosti navrhnutého kľúča B/7007001. Nečítali sa heslá ani obsah existujúcich taskov.
- PASS: 127/127 existujúcich jednotkových a komponentových testov bez preskočenia, typecheck a produkčný next build bez Supabase konfigurácie. Testy sú simulácie Auth-only aplikácie, nie živé A/B prihlásenie alebo skúška navrhovaných SQL zmien.
- PASS: offline parser pglast 8.7 syntakticky prijal všetkých 7 SQL blokov návrhov 1 a 2. Psql premenné sa iba pre parser nahradili syntetickými literálmi a príkaz gset bodkočiarkou. Nešlo o vykonanie SQL, kontrolu oprávnení, PL/pgSQL runtime alebo dôkaz úspešného rollbacku na Supabase. Parser je iba v pracovnom priečinku, nie v závislostiach aplikácie.
- PASS: git diff --check a kontrola, že sa menia iba tri návrhové Markdown dokumenty. Aplikačné zdroje, testy, manifest, lockfile, migrácie a konfigurácia zostávajú zhodné so základom.
- BLOCKED do osobitného schválenia: všetky navrhované REVOKE/GRANT/DDL/INSERT/DELETE kroky, funkčná skúška triggera, fixture aj cleanup a živý Auth/REST test.
