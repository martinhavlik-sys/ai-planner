> **Aktuálne v9 (22. 9. 2026):** schéma 6 pridáva katalógové metadata, presné seed dáta pre oddelenia/entity/projekty, voliteľné nezávislé task links a nepovinný rok projektu. Report, analytika a skutočné splnenie nie sú súčasťou tohto vydania.

# Dátový model a migrácie

## Verzie a slovník

Vydanie aplikácie **v6** stále exportuje `schemaVersion: 5`; nemení storage key ani význam historických ID. Nezamieňajte verziu balíka s verziou JSON alebo časovou značkou SQL migrácie.

| Pojem v UI | Lokálny JSON/kód | Pripravené SQL |
|---|---|---|
| Oddelenie | `Project`, `workspace.projects`, `task.projectId`; `task.project` je zrkadlený názov | `departments`, `tasks.department_id` |
| Skutočný projekt | `Campaign`, `workspace.campaigns`, `task.campaignId` | `projects`, `tasks.project_id` |
| Entita | `Entity`, `entities`, `task.entityId` | `entities`, `project_entities` |
| Osoby úlohy | `users`, autoritatívne `task.ownerIds` | `profiles`, `task_assignees` |
| Klient | `clients`, `task.clientId`, historické `projects[].clientId` | `clients`, `task_clients`, `department_clients` |
| Časový blok | `task.slots[]` | `calendar_slots` |

Entita nie je vlastnená oddelením. Projekt patrí práve jednému oddeleniu a môže sa vzťahovať na viac entít; prázdne `entityIds` znamená všetky. Úloha má najviac jedno oddelenie, jednu entitu, jeden nepovinný projekt a nula alebo viac osôb/blokov. Nepriradené úlohy sú povolené aj kvôli Inboxu. Priradený projekt musí zodpovedať oddeleniu a povoleným entitám úlohy.

## Workspace v5

Polia: `schemaVersion`, `menuOrder`, `tasks`, `projects` (oddelenia), `campaigns` (projekty), `entities`, `users`, `clients`, `goals`.

- Task: `id`, `name`, `projectId`, `campaignId`, `entityId`, `ownerIds`, `clientId`, `status`, `priority`, `due`, `slots`, `note`, `checklist`, `activity`. `ownerId`/`owner`, `project` a `day`/`startHour`/`duration` sú kompatibilné zrkadlá prvej osoby, oddelenia a prvého slotu. Autoritatívne sú ID väzby, pole osôb a `slots`.
- Slot: `id`, `taskId`, ISO lokálny `day`, číselné `startHour` a `duration` v hodinách. Rozsah začiatku 0–23.75, trvanie .25–24. Historický blok môže prejsť cez polnoc. Nový resize končí do polnoci práve zobrazeného dňa.
- Campaign: `id`, `name`, `departmentId`, `entityIds`, `edition`, `archived`. Každá edícia je samostatný záznam; nie je automatická ročná rekurencia. Nové uloženie odmieta duplicitnú kombináciu názov–oddelenie–edícia. Staré importy sa kvôli tejto novej kontrole nezamietajú; duplicitné možnosti sa pri výbere doplnia o ID.
- User: meno, email, lokálna rola `admin|user`, stav `active|pending`, permissions, avatar, fotografia a historické capacity/legacyRole. Oprávnenia sa evidujú, nevynucujú. Fotografia PNG/JPEG/WebP do 150 KB, spolu približne 1 MB textových dát.
- Oddelenie: meno a farba; historické owner/client/status/goal zostávajú v dátach. Entita: ID a meno. Goals/kapacity/aktivity zostávajú pre kompatibilitu; nepribudlo meranie výkonu ani uplynutého času.
- Dátum dokončenia (`due`) je nezávislý nepovinný ISO dátum. Interné historické názvy `deadline`/`formatDeadline` neznamenajú ďalšie dátumové polia.

## LocalStorage a ochrana dát

Hlavný kľúč: `ai-planner-workspace-v1`. Normalizátor prijíma dáta bez verzie a verzie 1–5, výsledok je v5. Historické samostatné kľúče `ai-planner-tasks-v2`, `ai-planner-projects-v1`, `ai-planner-team-v1`, `ai-planner-goals-v1` sú fallback pri absencii hlavného kľúča; nemažú sa.

Schémy 1/2 a dáta bez verzie migrujú team na users, staré mená na ID väzby a lokálny admin sa podľa existujúcich pravidiel doplní. Staré dni sa prevedú na dátumy aktuálneho týždňa a ďalej sa už neposúvajú. Neplatný textový termín sa mení na prázdny dátum. Schémy 3/4 doplnia viac osôb/profilové polia/menu; v5 pridáva campaigns a campaignId bez reinterpretácie oddelení. Normalizácia validuje ID, väzby, emaily a fotografie. Chybný vstup sa neuloží; niektoré historické hodnoty sa normalizujú, nejde o zachovanie ľubovoľného neznámeho JSON poľa.

Pred automatickým prechodom existujúceho hlavného JSON na v5 sa jednorazovo uloží pôvodný reťazec do `ai-planner-before-v5`. Pred potvrdeným importom sa aktuálny workspace uloží do `ai-planner-before-import`; ďalší import túto jednu zálohu nahradí. Sú to kľúče v rovnakom prehliadači, nie nezávislá vzdialená záloha. Export je potrebný pri zmene domény/profilu a pred väčšou aktualizáciou. Zálohy vyžadujú voľnú kvótu localStorage. Chyba zápisu sa hlási, pôvodné údaje sa automaticky nemažú.

`Pripraviť prenos` exportuje `ai-planner-supabase-import-v1` s normalizovaným snapshotom a počtami oddelení, projektov, úloh, blokov a priradení. Import rozpozná bežný JSON aj tento obal. Serverový import neexistuje. Existujúci import samostatného legacy poľa úloh nie je plnohodnotná záloha projektov; preferujte úplný export workspace.

## Pripravené SQL, nie zapnuté ukladanie

Migrácia `202609190001_core.sql` je transakčný počiatočný návrh pre nový Supabase projekt. Nebola vykonaná/testovaná na PostgreSQL; nie je to transformácia miestneho JSON.

| Tabuľky | Účel |
|---|---|
| `workspaces`, `workspace_members` | UUID pracovného priestoru, Auth user ID a rola owner/admin/member |
| `departments`, `entities`, `projects`, `project_entities` | Kategórie, projekty a ich rozsah entít |
| `profiles`, `task_assignees` | Lokálne osoby oddelené od Auth identity, viac osôb jednej úlohy |
| `tasks`, `calendar_slots` | Úloha, checklist/poznámka a samostatné bloky |
| `clients`, `department_clients`, `task_clients` | Admin-only klienti a ich väzby |

Doménové tabuľky majú zložený PK `(workspace_id,id)` a zodpovedajúce FK, ktoré bránia väzbám medzi priestormi. ID je kladný bigint v rozsahu bezpečného JavaScript integer. Existujú FK indexy a archivačné/časové polia; `workspace_members` má len created_at, bez archivačného poľa. Doménové updated_at obsluhuje trigger, workspace updated_at zatiaľ trigger nemá.

RLS povoľuje authenticated členom len SELECT vlastného priestoru, klientské tabuľky iba owner/admin. Anon nemá granty. Browser zápisy, zmeny členstiev ani automatické provisioning nie sú povolené. SECURITY DEFINER helper s pevným prázdnym search_path overuje členstvo bez rekurzie; neposkytuje zapisovacie API. Archivované riadky sa samotnou RLS neschovávajú.

Pred aktiváciou chýba: mapovanie lokálnych rolí na SQL roly, ID pre link tabuľky, bezpečné uloženie legacy/goals/menu, jednoznačnosť Auth↔profile, transakčný import do nového priestoru, kontrola počtov a konfliktov. SQL samostatné FK zatiaľ nevynucujú celý lokálny súlad projekt–oddelenie–entita. Neoslabovať RLS ako náhradu za tieto kroky.

## Lokálny report · 20. 10. 2026

Úloha má voliteľné ISO okamihy `createdAt` a `completedAt` s explicitným časovým pásmom, normalizované do UTC. Schéma workspace zostáva 6 a kľúč localStorage sa nemení. Normalizácia a JSON import/export zachovávajú platné dátumy; chýbajúce a neplatné dátumy nenahrádzajú dnešným dátumom. Staré zálohy zostávajú načítateľné.

`recordTaskDates` sa používa pri používateľskom uložení: nová úloha (aj Inbox) dostane dátum vytvorenia, prechod do Hotovo dostane dátum dokončenia. Úprava hotovej úlohy ho nemení; opätovné otvorenie ho vymaže a ďalšie dokončenie nastaví nový. Historická hotová úloha bez dátumu zostáva bez neho aj po úprave. Duplikát je nová úloha v zásobníku s novým dátumom vytvorenia a bez dátumu dokončenia. Import ani seed nie sú vytvorením novej úlohy.

Report používa iba lokálne úlohy aktuálneho workspace. Oddelenie = `projectId`, projekt = `campaignId`, entity = zjednotenie `entityId` a `entityIds`. Filtre sa kombinujú cez AND a porovnávajú ID, nie názvy. Počíta sa jedna úloha na ID, aj pri viacerých entitách a blokoch.

Predvolené obdobie je Tento týždeň a typ dátumu Dátum dokončenia. ISO okamihy sa vyhodnocujú v Europe/Bratislava; termíny a dni blokov sú kalendárne dátumy v tomto pásme. Týždeň je pondelok–nedeľa, oba krajné dni sú zahrnuté. Pracovný blok sa započíta pri prekrytí obdobia; presný koniec o polnoci nezahŕňa ďalší deň. Bloky majú existujúcu kalendárnu (nástennú) časovú sémantiku, nie evidenciu skutočne odpracovaného času.

Úlohy bez zvoleného dátumu sú mimo výsledkov obdobia; informačný počet rešpektuje ostatné filtre. Pri type Dokončenie sa používa skutočný `completedAt`, nikdy termín. Pri ostatných typoch metrika Hotovo znamená aktuálne hotové úlohy s príslušným dátumom v období, nie počet dokončení v období. Toto nie je história všetkých opakovaných dokončení ani historický stav workspace.

### Všetky obdobia a vysvetlenie vyradenia

Voľba „Všetky obdobia“ obchádza iba časové obmedzenie; ostatné filtre zostávajú spojené cez AND. Zahŕňa aj úlohy bez zvoleného dátumu a informačný počet ich označuje ako zahrnuté. Pri konkrétnom období sú nedatované úlohy naďalej mimo výsledkov. Samostatný zoznam vyradených lokálnych úloh uvádza všetky nevyhovujúce filtre vrátane chýbajúceho dátumu alebo dátumu mimo obdobia. Zoznam výsledkov a súhrny používajú tú istú množinu jedinečných úloh.

Report umožňuje otvoriť existujúci lokálny formulár na vytvorenie úlohy aj na úpravu zahrnutej alebo vyradenej úlohy; nevkladá testovacie údaje automaticky. Vzdialené úlohy zostávajú v samostatnom náhľade a nenahrádzajú lokálnu tabuľku ani jej editačné akcie.
