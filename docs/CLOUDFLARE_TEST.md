# Návrh Cloudflare Pages TEST nasadenia

## Základ a rozsah

Zdroj: `codex/ai-planner-oktober`, commit `83fb8bd8c14a85fe86ec4d427258694e430a8132`.
Porovnanie s `main` na `348b0f5a85cde3b008bfe85c57e26536eb144b1f`: 11 commitov navyše, žiadny chýbajúci commit, 13 zmenených súborov, 560 pridaných a 43 odstránených riadkov.
Lokálny návrh: `codex/cloudflare-test-navrh`. Vstupný pracovný strom bol čistý.
Starší audit so 75 testami patrí uvedenému `main`, nie októbrovej vetve. Októbrová vetva má pred týmto návrhom 95 testov.

Vzdialené služby, SQL, migrácie, RLS, granty, Auth nastavenia, Vercel a domény sa nemenia. Pôvodná príprava nevytvorila commit ani push; používateľ následne schválil commit a push iba návrhovej vetvy. Vytvorenie Cloudflare projektu ani nasadenie sa týmto krokom nevykonáva.

## Aktuálna autentifikácia, relácia a Report

- `app/supabase-auth.ts` prihlasuje heslom cez Supabase Auth a následne číta tabuľku úloh s používateľským prístupovým tokenom. Je to klientské HTTPS volanie, nevyžaduje Next.js server.
- Token sa používa počas jednej akcie; aplikácia neukladá ani neobnovuje reláciu, neobnovuje tokeny a neposkytuje odhlásenie. Po obnovení stránky vzdialený náhľad zmizne. Úspech živého prihlásenia sa pri tomto audite neoveruje: nevykonáva sa prihlasovací POST ani zásah do Auth.
- Databázové úlohy sú samostatný náhľad iba na čítanie. Lokálne úlohy zostávajú editovateľné a ukladané do localStorage.
- Report je funkčný lokálny report s obdobiami, dátumovými aj klasifikačnými filtrami, súhrnmi, dôvodmi vyradenia a otvorením formulára úlohy. Vzdialené úlohy nezahŕňa.

## Technické riešenie

`CLOUDFLARE_TEST_EXPORT=1` zapína `output: "export"` a `trailingSlash: true`. Bez premennej zostáva štandardný Next.js build a `next start`.
`/report` používa tú istú klientskú aplikáciu ako `/`; po načítaní stránky sa obrazovka zvolí podľa `/report`, `/report/` alebo pôvodného `/?screen=Report`. Export obsahuje `out/report/index.html`. Serverové presmerovanie a súbor `_redirects` nie sú potrebné. Návrat z Reportu na pracovnú plochu upraví URL aj s koncovou lomkou alebo pôvodným parametrom `screen=Report`.
Žiadne API trasy, Server Actions, serverové cookies, SSR databázové dotazy, middleware ani serverová optimalizácia obrázkov nie sú potrebné. Fonty sú lokálne.
Dátový model, schéma 6, kľúč localStorage, CRUD úloh, kalendár, výpočty Reportu a Supabase klient sa nemenia.
`next-env.d.ts` regeneruje produkčný build na odkazy `.next/types`; ide o generované typy trás.

## Lokálne overenie cez CLI

Použiť Node 22.18 alebo novší a pnpm 11.19.0. Overenie v tomto prostredí používa Node 24.19.0; prvá inštalácia závislostí prebehla s pnpm 11.25.0, následné overenie aj s požadovaným pnpm 11.19.0. Verzie závislostí a lockfile sa nemenia.

```sh
pnpm install --frozen-lockfile
BABEL_BUNDLE=/absolutna/cesta/playwright/lib/transform/babelBundle.js pnpm exec node --test --test-isolation=none tests/*.test.mjs
CLOUDFLARE_TEST_EXPORT=1 NEXT_TELEMETRY_DISABLED=1 pnpm build
pnpm exec tsc --noEmit --incremental false
node scripts/overit-cloudflare-export.mjs
git diff --check
```

`BABEL_BUNDLE` musí ukazovať na dostupný Babel balík Playwrightu; bez neho sa komponentové testy preskakujú. Voľba `--test-isolation=none` zabezpečuje v tomto CLI prostredí zobrazenie jednotlivých testov namiesto samotných testovacích súborov.
Na lokálny build možno ponechať Supabase premenné nenastavené. Na overenie zapekania konfigurácie sa použila iba URL testovacieho projektu a zámerne neplatná verejná zástupná hodnota kľúča; žiadny skutočný kľúč ani účet sa nepoužil. Taký výstup sa nesmie nasadiť ako overenie živého pripojenia.

## Výsledky lokálneho overenia

- PASS: pôvodná októbrová vetva 95/95 testov; návrh 97/97 testov, bez zlyhania a preskočenia. Nové dva testy pokrývajú priame otvorenie Reportu, obe podoby URL, pôvodný parameter, obnovenie, návrat na pracovnú plochu a nezmenený obsah localStorage.
- PASS: produkčný statický build Next.js 16.3.5 cez pnpm 11.19.0 vytvoril `out/index.html`, `out/report/index.html`, JS, CSS, fonty a stránku 404.
- PASS: `tsc --noEmit --incremental false` a `git diff --check`.
- PASS: CLI HTTP kontrola koreňa, `/report`, `/report/`, opakovaného načítania, 11 lokálnych súborov a binárnej zhody troch fontov so zdrojom. Ide o lokálny statický HTTP server, nie Cloudflare runtime.
- PASS: nezmenené súbory dátového modelu, kalendára, výpočtov a panelu Reportu, Supabase klienta a prihlásenia, repository, migrácií, manifestu a lockfile.
- BLOCKED: skutočná hydratácia a interakcia exportovaného balíka v prehliadači, vizuálne fonty a kalendár; prehliadač je v tomto zadaní zakázaný. Simulované komponentové testy prešli.
- BLOCKED: živé Supabase Auth a RLS s používateľskou reláciou; neprihlasovalo sa a nevykonávalo sa SQL. Konfigurácia skutočného verejného testovacieho kľúča sa ponecháva na schválené nasadenie.
- OPEN DECISION: potvrdenie práva zverejniť existujúci ikonový font a schválenie externých krokov uvedených nižšie.

## Vytvorenie TEST projektu až po schválení

1. Po schválení vytvoriť commit návrhu a pushnúť iba `codex/cloudflare-test-navrh`. Nezlučovať do `main` ani do zdrojovej vývojovej vetvy. Najprv overiť, že GitHub vetva obsahuje presne schválený diff.
2. Cloudflare: Workers & Pages → Create application → Pages → Import an existing Git repository. Prístup GitHub aplikácie obmedziť na `martinhavlik-sys/ai-planner`.
3. Vytvoriť nový samostatný projekt `ai-planner-cloudflare-test` ; pri nedostupnosti názvu zastaviť postup a vyžiadať rozhodnutie používateľa. Použiť bezplatný plán, nezapínať platené služby. Existujúce projekty a domény nemení tento postup.
4. Koreň projektu: koreň repozitára. Vetva projektu: `codex/cloudflare-test-navrh`. Pole Cloudflare „Production branch“ označuje stabilnú vetvu tohto nového TEST projektu, nie existujúcu produkciu. Pred prvým nasadením vypnúť automatické preview ostatných vetiev; nepovoľovať automatické nasadenie `main`.
5. Predvoľba: Next.js (Static HTML Export). Výstup: `out`. Príkaz zostavenia: `pnpm install --frozen-lockfile && pnpm build`.
6. Nastaviť v prostredí tohto TEST projektu:

| Premenná | Hodnota |
|---|---|
| `NODE_VERSION` | `24.19.0` |
| `PNPM_VERSION` | `11.19.0` |
| `SKIP_DEPENDENCY_INSTALL` | `1` |
| `CLOUDFLARE_TEST_EXPORT` | `1` |
| `NEXT_TELEMETRY_DISABLED` | `1` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://yqleboakzkowfxsmynfy.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Verejný publishable alebo anon kľúč výhradne projektu `ai-planner-test`, vložený cez dashboard |

Názov premennej kľúča zachováva existujúce rozhranie kódu. Nepoužiť produkčný, secret ani service_role kľúč. Verejný kľúč bude súčasťou klientského balíka; nie je náhradou za RLS. Zmena týchto hodnôt vyžaduje nový build. Nepoužiť lokálnu neplatnú zástupnú hodnotu.

7. Po schválení spustiť prvé nasadenie na pridelené `https://<nazov-projektu>.pages.dev`. Nepoužiť vlastnú produkčnú doménu, DNS, Vercel ani databázové migrácie. Ak bezplatný plán alebo požadované verzie nie sú dostupné, zastaviť nasadenie a oznámiť konkrétny dôvod.
8. Overiť `/`, `/report`, `/report/`, obnovenie stránok a dostupnosť lokálnych fontov, JS a CSS. Samostatne overiť používateľské správanie v prehliadači až po povolení: Report, kalendár, vytvorenie/úpravu/duplikovanie/mazanie syntetických lokálnych úloh a localStorage po obnovení.
9. Živé testovacie prihlásenie vykonať až po samostatnom schválení, s účtom `ai-planner-test`. Heslo a token nezapisovať do dokumentácie, logov ani chatu. Súčasný tok prihlasovania heslom nepotrebuje callback ani zmenu Supabase Auth URL nastavení.

## Rozhodnutia a obmedzenia

- Prehliadač a pracovná plocha sa pri príprave nepoužívajú. HTTP kontroly a simulovaný komponentový test nenahrádzajú skutočné vykonanie klientského balíka, vizuálnu kontrolu fontov a interakciu kalendára po nasadení.
- Tento návrh zachováva súčasnú reláciu iba na jednu akciu a lokálny Report. Nasadenie samo nezavedie cloudové CRUD, obnovovanie relácie ani databázový Report.
- Nová doména má samostatný localStorage; údaje zo starej domény sa automaticky neprenesú. Bez schválenia sa neprenášajú žiadne dáta.
- OPEN DECISION: `public/fonts/SOURCES.md` uvádza nepotvrdené právo distribúcie `MDX_ics.woff`. Licencia nebola právne overená. Verejné nasadenie je BLOCKED do potvrdenia oprávnenia alebo schválenia náhrady. Pred verejným TEST zverejnením musí vlastník potvrdiť oprávnenie alebo schváliť náhradu; tento návrh font nemení.
- Schválenie vyžadujú commit a push, vytvorenie Cloudflare projektu, GitHub prepojenie, nastavenie jeho testovacích premenných a prvé nasadenie. Samostatné schválenie vyžaduje prehliadačová akceptácia a živé Auth testovanie. Supabase zmeny ani zásahy do produkcie nie sú súčasťou návrhu.

## Technické zdroje

- https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/
- https://developers.cloudflare.com/pages/configuration/build-image/
- https://developers.cloudflare.com/pages/configuration/branch-build-controls/
- Dokumentácia nainštalovaného Next.js: `node_modules/next/dist/docs/01-app/02-guides/static-exports.md` a `environment-variables.md`.
