# AI Planner · v9 · 22. 9. 2026

Katalógová aktualizácia pridáva presné editovateľné seed dáta pre 17 oddelení, 32 entít a 22 projektov. Zaradenia úloh sú voliteľné a nezávislé, projekt má samostatný nepovinný rok a historické väzby zostávajú zachované. Lokálne ukladanie zostáva primárne; Supabase ani Auth sa nezapínajú.

Aktuálny zdroj pravdy: [úplná katalógová špecifikácia](docs/CATALOG_SOURCE.txt). Implementačné rozhodnutia a migrácia sú v [DATA_MODEL](docs/DATA_MODEL.md), [ARCHITECTURE](docs/ARCHITECTURE.md) a [DEPLOYMENT](docs/DEPLOYMENT.md). [Overenie v9](docs/QA_V9.md).

Report Etapa 1 pridáva iba navigačnú položku pod Inboxom, samostatnú cestu `/report`, slovenský nadpis a prázdny stav „Report zatiaľ neobsahuje žiadne údaje.“. Dáta, filtre, grafy, exporty, štatistiky, oprávnenia, migrácie a Supabase zostávajú mimo tejto etapy.

Report Etapa 2 pridáva iba responzívny lokálny panel filtrov s predvoleným obdobím „Tento týždeň“, typom dátumu „Dátum dokončenia“, pripravenými klasifikačnými výbermi, stavom, prioritou a resetom. Výbery sa zatiaľ na nič nenapájajú, nemenia URL ani prázdny stav; zadávateľ nie je pridaný, pretože model eviduje priradené osoby, nie potvrdeného zadávateľa.

Report Etapa 3 pridáva iba lokálny výpočet zvoleného obdobia a typu dátumu. Týždeň používa pondelok až nedeľu, vlastné obdobie zobrazuje polia Od/Do a neplatný alebo neúplný rozsah zobrazí slovenskú chybu. Predvolené obdobie je „Tento týždeň“ a dátum „Dátum dokončenia“; žiadne úlohy sa ešte nenačítavajú ani nefiltrujú.

## Historické vydanie v6 · 19. 9. 2026

Kompaktný plánovač úloh v slovenčine: tabuľka, Kanban, kalendár, oddelenia, entity, projekty a osoby. **Vydanie v6 používa nezmenenú lokálnu dátovú schému v5.** Dáta sa stále ukladajú do prehliadača; Supabase synchronizácia a autentifikácia nie sú zapnuté.

## Čo prináša v6

- Natívny modal úlohy nad kalendárom; kalendár má vlastný ohraničený systém vrstiev, detailný panel je nad stránkou a dialógy nad ním.
- Spodný úchyt bloku mení jeho trvanie po 15 minútach, najmenej 15 minút, najneskôr do polnoci zobrazeného dňa. Telo bloku naďalej slúži na presun. Fungujú aj šípky, Home/End a zrušenie rozpracovaného resize cez Escape.
- Svetlé farby blokov odvodené od oddelenia, farebný ľavý okraj a automatický kontrast textu.
- Oddelenie a projekt sú na samostatných riadkoch; projekt zobrazuje aj edíciu.
- Zarovnané responzívne formuláre a riadky entít/projektov, ikonové akcie s popismi. Ročníky sa dajú rozlíšiť, existujúce archivované priradenie zostáva viditeľné.
- Pôvodné migrácie, zálohy, viac osôb a viac blokov jednej úlohy zostávajú zachované.

## Dokumentácia ako zdroj pravdy

- [Architektúra a mapa súborov](docs/ARCHITECTURE.md)
- [Dátový model, migrácie a Supabase](docs/DATA_MODEL.md)
- [Spustenie, testovanie a Vercel](docs/DEPLOYMENT.md)
- [Rozhodnutia a pravidlá bezpečnosti dát](docs/DECISIONS.md)
- [Hotové, pripravené a plánované; bezpečné pokračovanie](docs/ROADMAP.md)

## Rýchle spustenie

Node 22.18+ a pnpm 11.19.0; presné závislosti sú v manifeste a lockfile.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Pre produkčné zostavenie použite `pnpm build`, potom `pnpm typecheck`. Testy spustí `pnpm test`; komponentová sada potrebuje `BABEL_BUNDLE` podľa [návodu](docs/DEPLOYMENT.md#testovanie).

## Stav a obmedzenia

Exportujte JSON zálohy. Verejné Supabase env premenné nemenia zdroj dát. Správa vlastníka je lokálny prepínač, nie prihlásenie; používateľské oprávnenia sa iba evidujú. „Pripraviť prenos“ sťahuje validovaný balík, nič neposiela do databázy.

SQL migrácia je pripravená, ale nebola vykonaná ani testovaná na PostgreSQL. Zmeny neboli nasadené a dashboardy neboli upravené. Stav testov, produkčného buildu a nevykonanej prehliadačovej kontroly je uvedený v [DEPLOYMENT](docs/DEPLOYMENT.md#overenie-vydania-v6).


## v7 · vizuálna vrstva

Kompaktný vzhľad inšpirovaný ProCare, lokálny Montserrat a spoločné ikony. Funkčné jadro v6 a schéma 5 zostávajú zachované. Návrat k neutrálnemu vzhľadu a presný rollback: [docs/VISUAL_THEME.md](docs/VISUAL_THEME.md). Pôvod a licencie fontov: [public/fonts/SOURCES.md](public/fonts/SOURCES.md).

Overenie v7: 65 testov bez vynechania, kontrola typov a produkčné zostavenie úspešné. Rozsah skutočnej vizuálnej kontroly: [docs/QA_V7.md](docs/QA_V7.md).

## Medzikrok · viac entít pri úlohe

Formulár úlohy podporuje pôvodný výber jednej entity aj výber viacerých konkrétnych entít (najviac 20) cez slovenský vyhľadateľný zoznam, štítky, odstránenie a potvrdenie/zrušenie. Existujúce pole `entityId` zostáva hlavnou väzbou; nové voliteľné `entityIds` uchováva stabilné ID ďalších väzieb. Staršie úlohy bez `entityIds` sa načítajú bez zmeny. Report, databáza a migrácie neboli upravené.
