> **Aktuálne v9 (22. 9. 2026):** katalogizačná vrstva schémy 6, 17 oddelení, 32 entít a 22 projektov s nezávislými voliteľnými väzbami úloh. Historické časti v6/v7 zostávajú nižšie označené; aktuálna SQL príprava je `supabase/migrations/202609210001_catalog.sql` a lokálna aplikácia naďalej používa localStorage.

# Architektúra

Stav overený zo zdrojov vydania v6, 19. 9. 2026. Živá infraštruktúra nebola kontrolovaná.

## Beh aplikácie

Next.js App Router s jednou hlavnou cestou `/`. `layout.tsx` nastavuje slovenský jazyk a globálne CSS. `page.tsx` je klientský komponent: vlastní pracovnú plochu, formuláre, filtre, navigáciu a zápisy do localStorage. Navigácia prepína sekcie v tej istej stránke; nejde o samostatné serverové routy. V repozitári nie sú API route handlery, middleware, prihlasovací callback ani serverový databázový adaptér.

Tok údajov: lokálny JSON → `normalizeWorkspace` → React state → úprava úloh/záznamov → normalizácia celého workspace → localStorage. Pri chybe načítania sa zápis nespustí. Pri chybe uloženia zostane pracovný stav v pamäti a UI odporučí export. Zobrazený export nie je cloudová záloha.

## Súbory

| Súbor | Zodpovednosť |
|---|---|
| `app/page.tsx` | Pracovná plocha, lokálne uloženie/import/export, menu, Entity/Projekty/Oddelenia/Klienti, editor a detail úlohy |
| `app/model.ts` | Typy, schémy 1–5, ID a väzby, používatelia, kalendárová matematika, triedenie, resize, farby a názvy projektov |
| `app/calendar.tsx` | Mesiac a rozsahy, os času, prekryvy, presun, náhľad resize a odovzdanie zmeny |
| `app/task-dialog.tsx` | Natívny modal editora, fokus, Escape a zámok posúvania pozadia |
| `app/slot-dialog.tsx` | Natívny dialóg pridania ďalšieho bloku jednej úlohy |
| `app/record-picker.tsx` | Natívny datalist, výber existujúceho záznamu, validácia textu |
| `app/people.tsx`, `app/users.tsx` | Viac osôb, avatary/fotografie, paleta farieb a lokálna evidencia používateľov |
| `app/globals.css` | Globálne aj historické štýly, kalendár, vrstvy, responzívne formuláre/zoznamy |
| `app/repository.ts` | Hlásenie lokálneho režimu, uzamknutý Supabase repository, príprava prenosového balíka |
| `app/supabase-client.ts` | Nepoužitý read-only REST klient pre zoznam workspace s Auth access tokenom |
| `supabase/migrations/202609190001_core.sql` | Základ relačnej schémy a RLS; nie aktivovaná integrácia |
| `tests/*.test.mjs` | Node testy čistých funkcií a voliteľná simulácia React handlerov |
| `package.json`, `pnpm-lock.yaml` | Príkazy a pripnuté verzie závislostí |

## Kalendár a vrstvy

Každý blok má vlastné ID, patrí k jednej úlohe a jeho čas nemení Dátum dokončenia. `calendarSegments` môže zobraziť existujúci blok cez polnoc na dvoch dňoch bez rozdelenia uloženého záznamu. `layoutSlots` rozdeľuje prekryvy do stĺpcov. Časová os má 64 px na hodinu a po navigácii začína na 08:00.

Presun používa existujúce HTML drag/drop a `moveCalendarSlot`. Resize používa pointer capture iba na spodnom úchyte: pohyb aktualizuje dočasný náhľad, pustenie odošle trvanie, zrušenie nič neuloží. Rodič aplikuje `resizeTaskSlot` na najnovší stav podľa ID úlohy a slotu. Ostatné bloky, osoby a dátum dokončenia sa nemenia. Automatické rolovanie pri držaní úchytu pri hrane nie je implementované; aktuálny scroll offset sa pri výpočte zohľadňuje.

Kalendár je samostatný stacking context (`isolation: isolate`). Vnútri používa vrstvy event=1, now-line=2, header=3. Stránkový detail má vrstvu 1 nad kalendárom vo vrstve 0. Natívne `<dialog>.showModal()` editora a slotového dialógu používa browser top layer nad všetkými týmito vrstvami. Zvyšovanie z-index na náhodne vysoké hodnoty nie je potrebné.

## Integrácie a stav

Funkčná perzistencia: localStorage, súborový JSON import/export a obrázok používateľa ako limitovaný Data URL. Externý kalendár, emailové pozvánky, AI API a synchronizácia nie sú zapojené. Jediný pripravený fetch v `supabase-client.ts` číta workspaces, ale nemá volajúceho z UI. Verejné env premenné iba oznamujú prítomnosť konfigurácie, nekontrolujú zdravie spojenia.

SQL členstvo, lokálna osoba a prihlásený účet sú odlišné pojmy. V súčasnosti neexistuje prihlásená identita. Detailné hranice sú v DATA_MODEL a ROADMAP.


## v7 presentation boundary

Theme tokens and selectors live in `app/theme.css`, activated only by the root data-theme attribute. Local font declarations and typed decorative icons are separate. No model, persistence or calendar geometry changes. See `VISUAL_THEME.md`.

## TASK-001 · testovacia relácia · 1. 11. 2026

Rozsah: kontrolovaný prenos existujúcich Auth úprav do pilotnej vetvy podľa
[Issue #3](https://github.com/martinhavlik-sys/ai-planner/issues/3). Táto časť
spresňuje historické tvrdenia vyššie o neprítomnosti prihlásenej identity.

`app/supabase-auth.ts` používa existujúce Supabase Auth REST rozhranie: prihlásenie
heslom, obnovu relácie, overenie identity cez `/auth/v1/user` a odhlásenie aktuálnej
relácie cez `scope=local`. Konfigurácia povoľuje iba testovací projekt; chýbajúca
konfigurácia, nesprávny projekt, tajný kľúč alebo privilegovaný legacy kľúč blokujú
požiadavku. Kontrola formátu verejného kľúča nie je overením jeho platnosti ani RLS.
Používajú sa iba názvy konfigurácie `NEXT_PUBLIC_SUPABASE_URL` a
`NEXT_PUBLIC_SUPABASE_ANON_KEY`; verejné hodnoty Next vloží do klientského buildu.

`TestSessionController` uchováva reláciu v `sessionStorage` danej karty pod
`ai-planner-test-session-v1`. Heslo sa neukladá do úložiska a formulár ho pri
odoslaní vyčistí. Relácia sa po obnovení stránky overí na serveri; končiaca relácia
sa obnoví. Súbežné obnovenia rovnakého tokenu zdieľajú jednu požiadavku. Generácia
požiadaviek zabraňuje zobrazeniu starých odpovedí po zmene účtu, odhlásení alebo
odpojení komponentu. Odhlásenie najprv skryje údaje a odstráni miestnu reláciu;
nepotvrdené serverové odhlásenie alebo chyba úložiska majú výslovné hlásenie.

`app/test-auth-panel.tsx` zobrazuje načítavanie, chyby konfigurácie a overenia,
obnovuje náhľad pri aktivácii karty a priebežne kontroluje reláciu. Vypršanie
relácie skryje vzdialené úlohy aj počas čakajúceho čítania. Úlohy sa čítajú po
stránkach; chyba ďalšej stránky nesmie zverejniť neúplný výsledok. Identitou
vzdialeného riadka je dvojica `(workspace_id, id)`.

**Implementované v tejto etape:** iba testovacie prihlásenie a oddelený čítací
náhľad. Lokálny workspace, jeho import/export a report sa nemenia a odhlásenie
ich nemaže. `saveTestTask` vždy zlyhá s `WRITE_NOT_VERIFIED` bez sieťového volania;
`SupabaseRepository.save` zostáva uzamknutý. SQL návrhy sa neprenášajú.

**Schválená budúca architektúra podľa Issue #3:** po prihlásení Supabase ako hlavný
zdroj úloh a kalendárnych blokov, samostatný cloudový report a explicitne oddelený
lokálny režim. TASK-001 tento prechod ešte neimplementuje a neaktivuje cloud CRUD.
Lokálne údaje sa nesmú automaticky importovať ani prepísať.

**Hranice overenia:** testy používajú syntetické relácie a simulovaný transport,
komponentový harness nenahrádza prehliadač. Živé prihlásenie, RLS, cloud CRUD a
obnova databázy zostávajú neoverené touto etapou. `sessionStorage` je dostupné
JavaScriptu; ochrana pred XSS a model relácie pre reálny pilot vyžadujú ďalšie
posúdenie. Klientská kontrola ani skrytie rozhrania nenahrádzajú serverové práva.

Lokálne overenie TASK-001, 1. 11. 2026: Node 24.19.0; 127/127 automatizovaných
testov, 0 zlyhaní a 0 preskočených pri nastavenom `BABEL_BUNDLE` na Babel balík
Playwrightu. `tsc --noEmit --incremental false` a produkčný `next build` prešli
bez Supabase konfigurácie. Babel harness zostáva externou podmienkou úplného
komponentového testovania; manifest ani lockfile sa v tejto etape nemenia.

## Funkčný lokálny report · 20. 10. 2026

Táto časť nahrádza starší opis prázdneho reportu. `page.tsx` odovzdáva `ReportPanel` lokálne `tasks`, oddelenia, entity a projekty. Testovacie Supabase úlohy sa do reportu nemiešajú. `report-model.ts` obsahuje čisté výpočty období v Europe/Bratislava, kombinované filtre, deduplikáciu a súhrny. Panel používa rovnaký výsledok pre počty aj zoznam úloh. Neplatné obdobie skryje výsledky; reset obnoví predvoľby. Filtre reportu sú nezávislé od pracovnej plochy a neukladajú sa do workspace.

Zmena neprenáša SQL ani nezapína vzdialený zápis, synchronizáciu či produkčné nasadenie. Definície dátumov a metrík sú v DATA_MODEL.md. Regresie pokrýva `tests/report.test.mjs` a komponentový harness v `tests/ui.test.mjs`.


## TASK-005 · Auth-only · 1. 11. 2026

Táto časť nahrádza čítací náhľad opísaný v TASK-001. Prihlásenie, obnova,
overenie a odhlásenie používajú iba Auth rozhranie. Controller nikdy nevolá
transport čítania úloh; aj overená relácia publikuje `tasks=[]`.
`readTestTasks` vždy vyhodí `TestTaskReadBlockedError` (`READ_NOT_VERIFIED`)
pred akýmkoľvek fetch. Zápis zostáva blokovaný (`WRITE_NOT_VERIFIED`), bez
verejného prepínača na odomknutie. Lokálny model, report a import/export sa nemenia.

Odomknutie vyžaduje samostatne schválený serverový audit SELECT RLS, členstva,
autorstva a súvisiacich väzieb/reportingu a izolovaný pozitívny aj negatívny A/B
test. Auth-only je ochrana tejto aplikácie, neopravuje serverové oprávnenia.
Mock testy nie sú dôkazom RLS a tento krok nepovoľuje dátový pilot kolegom.
Bez SQL, DB zmien, reálnych účtov alebo nasadenia.
