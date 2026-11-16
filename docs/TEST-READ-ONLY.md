# TEST čítanie a QA reportov

Základ: `8054c2707fd7f5e012eb9f078ee5ecf0f58861ad`, vetva
`codex/pilot-supabase-auth-cloud-crud`. Tento základ obsahoval bránu
`READ_NOT_VERIFIED`; načítanie šiestich vzdialených úloh v ňom nebolo overené.

## Samostatné kroky

1. QA B1–B4: vizuálne odlíšenie zdrojov reportu, automatický lokálny report
   po odhlásení, text „Zobrazené lokálne úlohy“ a samostatný text pre stav bez
   načítaných vzdialených úloh. Žiadne odomknutie čítania v tomto kroku.
2. TEST čítanie: overená Auth relácia → vlastné členstvá → úlohy cez REST GET.
   Report a databázová časť pracovnej plochy používajú rovnaké načítané pole.
   Lokálny report a lokálne úlohy zostávajú samostatné.

## Podmienky otvorenia brány

Všetky tieto podmienky musia platiť súčasne:

- `CLOUDFLARE_TEST_EXPORT=1`;
- `WORKERS_CI=1` a `WORKERS_CI_BRANCH=codex/pilot-supabase-auth-cloud-crud`
  pri zostavení vo Workers Builds;
- URL Supabase je presne `https://yqleboakzkowfxsmynfy.supabase.co` a kľúč je
  verejný publishable/anon; tajné a neplatné kľúče konfigurácia odmieta;
- aplikácia beží na `ai-planner-cloudflare-test.martin-havlik.workers.dev`
  alebo na lokálnom hostiteľovi pre vývojové overenie.

`next.config.js` odvodí verejný príznak `NEXT_PUBLIC_TEST_READ_ONLY`; jeho ručné
nastavenie neobíde kontrolu vetvy. Bežný build a export pre `main` vynútia
hodnotu `0` a zachovajú `READ_NOT_VERIFIED`. Bez exportovej premennej zostáva
štandardný režim Next.js. Toto obmedzenie aplikácie nenahrádza databázové RLS.

REST čítanie vyberá iba `workspace_id,id,title,status,priority`. Overí
identitu účtu, členstvá, všetky stránky odpovede a jedinečnosť kľúča
`workspace_id + id`. Cudzí workspace, neúplná odpoveď alebo chyba zabránia
zobrazeniu celého výsledku. Žiadne čiastočné údaje sa nepublikujú.

Odhlásenie okamžite vyprázdni vzdialené UI a prepne report na lokálny.
Chyba alebo expirácia relácie odstráni vzdialené údaje a reláciu tejto karty.
Generácia požiadaviek zahodí oneskorené odpovede po odhlásení alebo zmene účtu.
Relácia zostáva v existujúcom `sessionStorage`; údaje úloh sa tam neukladajú.
Na `localStorage` ani lokálny dátový model čítací adaptér nesiaha.

`WRITE_NOT_VERIFIED` zostáva bez zmeny. Adaptér nevykonáva databázové INSERT,
UPDATE ani DELETE. Auth prihlásenie, obnovenie a odhlásenie používajú existujúce
Auth operácie; nejde o zápis úloh.

## Vykonané overenie 15. 11. 2026

Skutočné databázové kontroly cez Supabase konektor boli obmedzené na projekt
`ai-planner-test`, ref `yqleboakzkowfxsmynfy`, a transakcie
`BEGIN READ ONLY … ROLLBACK`:

- všetkých 14 verejných tabuliek má RLS; všetkých 14 politík povoľuje SELECT;
- `authenticated`: SELECT áno, INSERT/UPDATE/DELETE nie; `anon`: SELECT nie;
- oba reportovacie pohľady majú `security_invoker=true`;
- `rls_auto_enable()` má ACL iba pre `postgres`; `anon` a `authenticated`
  nemajú EXECUTE, čo zodpovedá výsledku Gate 1 v Issue #3;
- existujúca syntetická úloha B z Gate 2 je prítomná; nič sa nevkladalo;
- dve existujúce členské identity A: každá vidí jednu oprávnenú úlohu A,
  nula úloh B, nula cudzích workspace; report má rovnakú množinu;
- existujúca členská identita B: vidí jednu úlohu B, nula úloh A a nula cudzích
  workspace; report má rovnakú množinu;
- bez identity: nula úloh, reportovacích riadkov aj členstiev.

Testy identít používali `SET LOCAL ROLE authenticated` a simulované JWT claims
vo skutočnom PostgreSQL. **Nie sú živým prihlásením cez Auth ani REST.**
Platné pravidlo `can_read_task` povoľuje vlastné/priradené úlohy členom a tímový
rozsah rolám owner/admin/analyst v ich workspace. Pravidlo sa nemenilo.

História TASK-006 a TASK-007 bola skontrolovaná v Issue #3. Gate 1 a Gate 2 majú
zaznamenaný PASS, historický živý Gate 3 zostal BLOCKED. Aktuálne otvorenie TEST
čítania je samostatný používateľom schválený implementačný krok.

Automatizované overenie:

- 149/149 testov, vrátane zatvoreného bežného/`main` režimu, stránkovania,
  odmietnutia cudzieho workspace, oneskorenej odpovede, chyby a expirácie;
- typecheck, štandardný build, TEST exportový build;
- HTTP `/`, `/report`, `/report/`, lokálne súbory a fonty;
- lokálny Chromium pri 1440 a 390 px: skutočný čítací adaptér so syntetickými
  Auth/REST odpoveďami, 6 vzdialených a 4 lokálne úlohy, zhodný report,
  obnovenie stránky, odhlásenie, účet B a nezmenený lokálny snapshot.

Lokálny export sa overoval s verejným syntetickým kľúčom. Lokálna kontrola pnpm
vyžadovala `--config.verify-deps-before-run=false`, pretože automatická kontrola
závislostí sa pokúšala použiť neprístupný domovský adresár prostredia. Konfigurácia
ani závislosti repozitára sa kvôli tomu nemenili.

**BLOCKED – živé Auth → REST overenie z tohto prostredia:** priame spojenie na
TEST URL aj Supabase REST odmieta sieťová politika (`CONNECT 403`). K dispozícii
nie je pripojený používateľský prehliadač ani bezpečné zadanie hesla účtu A.
Syntetické UI testy ani databázové claims sa nesmú vydávať za živý PASS.

## Manuálne dokončenie živého testu

Po potvrdení nového Cloudflare TEST buildu sa prihláste testovacím účtom A
priamo na TEST URL. Porovnajte databázové úlohy a vzdialený report, obnovte
stránku a overte obnovenie relácie. Odhláste sa: databázové úlohy musia zmiznúť
a report sa musí prepnúť na lokálny. Opätovné prihlásenie má obnoviť iba
oprávnené úlohy účtu. Počet určuje aktuálne RLS; šesť úloh nie je pevná
podmienka. Prihlásenie B a priamy negatívny REST test A → B zostávajú živými
kontrolami na dokončenie bez zápisov a bez exportovania tokenov.
