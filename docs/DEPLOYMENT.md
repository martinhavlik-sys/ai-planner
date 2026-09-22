> **Aktuálne v9 (22. 9. 2026):** SQL migrácia pripravuje iba katalógové metadata, nepovinné nezávislé väzby a projektový rok. Supabase sa v tejto fáze nespúšťa; lokálny režim používa localStorage. Pred budúcim použitím treba migráciu overiť na stagingu.

# Spustenie, overenie a nasadenie

## Závislosti

Manifest obsahuje Next 16.3.5, React/React DOM 19.3.0, TypeScript 7.0.2 a pripnuté typy. Použiť pnpm 11.19.0 (`packageManager`) a Node 22.18 alebo novší. `pnpm-lock.yaml` je súčasť dodávky. Bez potreby nemeňte verzie počas opravy UI.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm build` vytvorí produkčnú `.next`; `pnpm start` ju spustí. Pri čerstvom rozbalení najprv build alebo `pnpm exec next typegen`, pretože generovaný `next-env.d.ts` odkazuje na `.next/types`. Následne `pnpm typecheck` overí celý projekt. Na kontrolu bez zápisu inkrementálnej cache možno použiť `pnpm exec tsc --noEmit --incremental false`.

## Konfigurácia bez tajomstiev

| Premenná | Význam |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Verejná URL vlastného Supabase projektu |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Verejný anon API kľúč projektu; nikdy service-role kľúč |

Príklad bez skutočných hodnôt je `.env.example`. Lokálne použite ignorovaný `.env.local`, na Verceli príslušné env nastavenia prostredí. NEXT_PUBLIC hodnoty sú súčasťou klientského buildu; po zmene treba nový build/deployment. Samotná konfigurácia **nezapína synchronizáciu**. `remoteStatus` kontroluje len prítomnosť hodnôt, nie dostupnosť/platnosť projektu. Skutočný prístupový Auth token pre pripravený read klient zatiaľ nemá zdroj v aplikácii.

V kóde nie je service-role secret ani požiadavka na ďalšie API. Pri kontrole nepíšte reálne kľúče do docs, testov ani ZIP.

## Testovanie

```sh
pnpm test
pnpm typecheck
pnpm build
```

Čisté modelové testy sa spustia v Node bez ďalšieho balíka. Trinásť komponentových/syntaktických testov v `tests/ui.test.mjs` sa **preskočí**, ak chýba `BABEL_BUNDLE`. Pre úplnú sadu nastavte túto premennú na absolútnu cestu k dostupnému Playwright `lib/transform/babelBundle.js`:

```sh
BABEL_BUNDLE=/absolute/path/to/playwright/lib/transform/babelBundle.js pnpm test
```

Playwright nie je projektová dependency; toto je súčasné obmedzenie reprodukovateľnosti. Harness simuluje React state/ref/effect a vykonáva handlery; netestuje CSS layout, natívny focus, skutočné pointer capture alebo datalist v browseri. Nové testy pokrývajú resize snap/minimum/polnoc/cancel/klávesnicu, viac slotov a stabilné ID, farby/kontrast, edície/archív/duplicity a základnú štruktúru správcovských obrazoviek. Testy dvoch pôvodných akcií kalendára stále počítajú edit/plus v `.timedActions`; resize je samostatný slider úchyt.

## Vercel

Cieľom je existujúci používateľský GitHub/Vercel projekt; jeho konkrétna URL, repository, vetva a aktuálne dashboard nastavenia nie sú v zdrojoch uložené ani overené. V dodávke nie je `vercel.json`, vlastné API ani CI workflow. Neodvodzovať úspešné živé nasadenie z lokálneho buildu.

1. Na pôvodnej produkčnej doméne najprv Export JSON. Dáta z preview domény nie sú automaticky tie isté.
2. Obsah koreňového priečinka `ai-planner-vercel` zo ZIP-u preniesť do skutočného checkoutu, prezrieť diff a zachovať tamojšie používateľské zmeny. Neposielať `node_modules`, `.next`, cache, `.env.local` ani exporty dát.
3. Overiť framework Next.js, správny root directory, Node a pnpm verzie; build `pnpm build`, štandardný Next output. Neprepínať na statický export bez osobitného dôvodu.
4. Overiť obe verejné env premenné v požadovaných prostrediach. Najprv preview a akceptačné testy, potom autorizované produkčné nasadenie.
5. Po otvorení overiť pôvodné úlohy a exportovať v5 JSON. V6 nevyžaduje SQL migráciu ani zapnutie Supabase.

SQL aplikovať až po samostatnej kontrole/testoch na testovacom projekte. Táto počiatočná migrácia vytvára tabuľky; neopakovať ju ručne na existujúcej schéme a nerobiť produkčný reset. Browser granty zostávajú read-only a bez provisioning sa členstvo nevytvorí.

## Manuálna akceptácia

- Desktop aj šírka približne 390 px: entity/projekty majú zarovnané polia a čitateľné riadky, bez vodorovného pretečenia stránky. Tabuľka a kalendár môžu mať vlastné horizontálne rolovanie.
- Na kalendári otvoriť editor: hlavičky, now-line, eventy aj detail sú pod modalom/backdropom; fokus ostáva v dialógu, Escape zavrie a vráti fokus. Skontrolovať aj plus → slot dialog.
- Úchyt: predĺžiť/skrátiť o 15 minút, prekročiť hranice, zrušiť Escape, pustiť mimo bloku, obnoviť stránku. Zmeniť iba vybraný slot, nie druhý slot/osoby/due. Telo naďalej presúva blok; po resize sa detail neotvorí.
- Skontrolovať minimálny 15-minútový blok, blok končiaci 24:00, historický blok cez polnoc a oba jeho segmenty. Klávesnicou ↑/↓, Home/End.
- Odlišné farby oddelení, ich neskoršia zmena, nepriradená úloha, viac prekrývajúcich sa udalostí, aktuálny čas a návrat na 08:00 pri všetkých rozsahoch.
- Projekty rovnakého názvu v dvoch edíciách; správna voľba ID, druhý riadok v tabuľke, bez projektu bez oddeľovača. Archivovať projekt a otvoriť jeho existujúcu úlohu. Overiť odmietnutie novej duplicity.
- Export/import celej pracovnej plochy, pôvodné v5 údaje, viac osôb/blokov a vyčistenie rozpracovaného projektu po importe.

## Overenie vydania v6

Finálny beh 19. 9. 2026: **61 testov, 61 úspešných, 0 preskočených** s dostupným Babel balíkom; `tsc --noEmit --incremental false` prešiel. Produkčný `next build` s predvoleným Turbopackom prešiel vrátane TypeScript kontroly a generovania stránok. Browser kontrola zostala nevykonaná: lokálny server sa podarilo spustiť, ale automatické schvaľovanie otvorenia náhľadu skončilo na usage limite. Tento výsledok nie je potvrdením vizuálnej správnosti. SQL/RLS sa na PostgreSQL nespúšťali. Žiadny push, deploy ani zmena dashboardov neprebehli.

## Balenie

ZIP má jeden koreňový priečinok `ai-planner-vercel`. Zahrnúť zdroje, tests, docs, SQL, manifest, lockfile, `.gitignore` a `.env.example`. Vylúčiť dependencies, `.next`, `.git`, `.env*` okrem príkladu, `.DS_Store`, `*.tsbuildinfo`, caches, logy a pracovné súbory. Integritu overiť rozčítaním všetkých ZIP položiek; finálny archív sám neznamená nasadenie.


## v7 packaging

No deployment was performed. Build does not fetch fonts: ship `public/fonts` alongside the app. Before a future public release, resolve the supplied MDX asset redistribution rights documented in `public/fonts/SOURCES.md`. Neutral theme and full v6 rollback are documented in `VISUAL_THEME.md`. The v7 ZIP excludes modules, build caches, .git and environment secrets.
