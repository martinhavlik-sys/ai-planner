# AI Planner · Core v5 · 19. 9. 2026

## Implementované

- Bezstratová lokálna migrácia schém 1–4 na 5. Pôvodné dáta sú pred prvým zápisom v5 zachované v `ai-planner-before-v5`; pri chybe načítania sa neprepisujú. Export a import zachovávajú všetky bloky, osoby, poznámky aj historické polia.
- Skutočné projekty: názov, oddelenie, viac entít, ročník/edícia, úprava a archivácia. Každý ročník je samostatný záznam. Úloha má nepovinný projekt; nekompatibilné väzby sa odmietajú. Archivácia nemení staré úlohy. Prázdny zoznam entít projektu znamená všetky entity.
- Kvôli kompatibilite lokálne `projects` a `Task.projectId` stále označujú oddelenia. Nové projekty sú `campaigns` a `Task.campaignId`. V SQL sú názvy už `departments` a `projects`.
- Pracovná plocha a Inbox sú hore; konfigurácia je pod Doplnenia. Presúvanie menu funguje potiahnutím, bez šípok. Horné a konfiguračné položky zostávajú vo svojich skupinách.
- Formulár má poradie názov → Oddelenie → Entita → Projekt, natívne vyhľadávanie existujúcich záznamov a klávesnicový výber. Zmena oddelenia/entity vyčistí projekt. Nové záznamy sa zakladajú v konfigurácii.
- Osoby a rýchle filtre sú vedľa Vymazať filtre. Dátum dokončenia zostáva nepovinný. Počet osôb nemení počet úloh. Kalendár a jeho handlery zostali zachované.
- Klient je skrytý v bežnom pohľade. Správa vlastníka sprístupní lokálnu konfiguráciu. **Tento lokálny prepínač nie je autentifikácia ani bezpečnostná hranica.** Táto verzia je stále lokálny nástroj jedného vlastníka, nie nasaditeľný zdieľaný systém s rolami.

## Supabase: čo je pripravené a čo zostáva uzamknuté

`supabase/migrations/202609190001_core.sql` obsahuje workspaces, členstvá, oddelenia, entity, projekty, väzby projekt–entity, profily/osoby, úlohy, osoby úloh a kalendárové bloky. Klienti a ich väzby sú oddelené do tabuliek čitateľných len administrátormi/vlastníkmi. Kompozitné cudzie kľúče bránia väzbám medzi pracovnými priestormi, mazanie je reštriktívne. Tabuľky majú RLS, indexy, časové a archivačné polia.

Anon nemá prístup. Prihlásený člen má iba čítanie vlastného priestoru; žiadne browser zápisy ani vytváranie členstiev nie sú povolené. Členstvo nemôže používateľ sám prideliť. Serverové administrátorské zavedenie priestoru/členstva je budúci krok. Návrh vychádza z [oficiálnej dokumentácie RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

`app/supabase-client.ts` poskytuje read-only REST hranicu s verejným anon API kľúčom a skutočným Auth access tokenom. `app/repository.ts` obsahuje explicitne uzamknutý vzdialený repository a validovaný plán importu. UI zostáva lokálne a ukazuje tento stav. Env premenné **nezapínajú synchronizáciu**. Nikde nie je service-role kľúč.

Chýbajú: prihlasovanie/obnova session, bezpečné provisioning členstiev a roly v UI, transakčný import do nového priestoru, kontrola počtov po importe, plný remote read/write mapping, konfliktové verzie a integračné RLS testy. SQL zatiaľ nebol aplikovaný ani vykonaný na PostgreSQL. Pred aktivovaním zápisov treba tieto kroky dokončiť; neotvárajte anon write policies.

## Kontrolovaný prenos dát

1. Na pôvodnej doméne použite Export a bezpečne odložte JSON.
2. Pripraviť prenos vytvorí balík s úplným normalizovaným snapshotom a počtami úloh/blokov/priradení. Nič sa neposiela na server.
3. Bežný Import rozpozná aj tento balík, validuje ho, pýta sa pred nahradením a uloží predchádzajúci stav do `ai-planner-before-import`.
4. Budúci vzdialený importer musí pre overeného vlastníka vytvoriť nový priestor v jednej transakcii, zachovať numerické ID, mapovať `projects`→departments a `campaigns`→projects, rozbaliť assignees/slots a klientské väzby. Lokálny snapshot vrátane historických polí treba zachovať mimo bežných členských tabuliek. Po verifikácii počtov sa používateľ rozhodne prepnúť zdroj dát. Táto operácia nie je v tejto verzii dostupná.

## Inštalácia a nasadenie

Node 22.18+; manifest má presné overené verzie a pnpm lockfile.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
```

Komponentové testy potrebujú `BABEL_BUNDLE` nastavené na existujúci Playwright `lib/transform/babelBundle.js`; bez neho sa výslovne preskočia. Na tomto hoste boli spustené s týmto balíkom.

Obsah ai-planner-vercel nahrajte do existujúceho GitHub repozitára a nasaďte cez Vercel. Zachovajte existujúce verejné env premenné; príklad je `.env.example`. Žiadne dashboardy ani GitHub sa v tejto dodávke nemenili. SQL skontrolujte a neskôr aplikujte manuálne najprv na testovacom Supabase projekte. Nerobte reset produkčnej databázy.

## Overenie

50 testov úspešných, 0 preskočených; skutočná TypeScript kontrola a produkčný Next.js build úspešné. Testy zahŕňajú migráciu v5, nezávislé ročníky projektov, viac entít, neplatné väzby, staré kalendárové operácie, viac osôb, filtre a presúvanie menu. Next aktualizoval jsx konfiguráciu na react-jsx a pridal vlastné generované typy.

Vizuálna/interakčná kontrola v reálnom prehliadači nebola vykonaná: host zablokoval otvorenie lokálneho serverového portu a nemá nainštalovaný Playwright prehliadač. SQL/RLS nebolo overené na živej databáze. Úspešný build nepotvrdzuje vzdialenú synchronizáciu.

Po nasadení overte export/import pôvodných dát, vytvorenie projektu a dvoch ročníkov, tabovanie a výber v troch poliach, filtre pri Vymazať filtre, menu Doplnenia a klienta v správe vlastníka. Na desktope aj mobile overte kalendár, presun a zmenu dĺžky bloku, viac blokov jednej úlohy, návrat na 08:00 a rolovanie 00:00–24:00.
