# AI Planner – používatelia a oprávnenia, 18. 9. 2026

Pracovná aplikácia v slovenčine. Úloha má nezávislé priradenie k **oddeleniu** (HR, Marketing, IT) a **entite** (Nemocnica Bory, ProCare Betliarska). Interné názvy Project/projectId zostávajú kvôli kompatibilite. Správa entít, kombinované filtre, tabuľka, Kanban a celý reálny kalendár zostávajú zachované.

**Klient** je organizácia/zákazník, napríklad Penta Hospitals alebo súkromná agentúra. Má iba názov: možno ho pridať, premenovať a zmazať. Klient priradený oddeleniu alebo úlohe sa nedá zmazať. Staré email/note zostávajú v zálohách kvôli kompatibilite, ale formuláre ich nezobrazujú ani nevyžadujú. Klient nemá prihlasovanie.

## Používatelia

Sekcia Používatelia nahrádza Tím. Každý používateľ má stabilné číselné ID, meno, normalizovaný email, rolu admin/user, stav active/pending a pole stabilných kľúčov oprávnení. Kapacita aj stará pracovná rola (legacyRole) sa pri migrácii zachovajú. Priradenia ownerId sa nemenia.

- Martin sa pri migrácii stáva administrátorom. Ak staré dáta nemajú administrátora ani Martina, vytvorí sa samostatný lokálny administrátor Martin bez zásahu do existujúcich vlastníkov.
- Starým členom bez emailu sa email nevymýšľa. Zoznam zobrazuje „Email treba doplniť“; pri ich editácii je platný email povinný.
- Nový používateľ má stav „Pripravený na pozvanie“. Aktívny označuje iba lokálny záznam, nie overený prihlasovací účet.
- Administrátor má predvolene všetky oprávnenia. Používateľ má workspace.view, calendar.view, tasks.create a tasks.edit. Zmena roly obnoví predvoľby; jednotlivé checkboxy možno potom ľubovoľne upraviť.
- Katalóg permissionCatalog v app/model.ts definuje kľúče, slovenské názvy a skupiny na jednom mieste. Obsahuje workspace.view, tasks.create/edit/delete, calendar.view/edit a departments/entities/clients/users/settings.manage.
- Email sa oreže a prevedie na malé písmená. Formát a duplicity sa kontrolujú pri uložení aj importe. Meno nemusí byť unikátne.
- Posledného administrátora nemožno zmazať ani preradiť na používateľa. Priradeného vlastníka nemožno zmazať, kým má úlohy alebo oddelenia vrátane hotových.
- Oprávnenia sa zatiaľ iba evidujú a zobrazujú. Prístup k obrazovkám neblokujú. **Prihlasovanie, aktivácia a odosielanie pozvánok nie sú implementované.** UI to výslovne uvádza; nemá tlačidlo na odoslanie. Heslá, tokeny ani prihlasovacie údaje sa neukladajú.

Pri budúcom pripojení databázy/auth zachovajte stabilné ID alebo explicitnú mapu ich prevodu a vynucujte oprávnenia aj na serveri. Lokálne roly samy osebe neposkytujú autorizáciu.

## Dáta a migrácia

- Úložisko ai-planner-workspace-v1 zostáva rovnaké; obsah sa migruje na **schemaVersion: 3** s poľom users. Staré dáta bez verzie a schémy 1/2 sú podporované.
- Starý TeamMember sa prevádza na User so zachovaným ID a kapacitou; pole team už nový export nepotrebuje. Historické samostatné kľúče úloh, oddelení, tímu a cieľov sa čítajú, nemenia ani nemažú.
- Úlohy, oddelenia, entity, klienti, používatelia, oprávnenia, ciele, poznámky, checklisty, aktivity a všetky časové bloky sa zachovávajú v JSON exporte/importe. ID majú prednosť pred starými textovými názvami.
- Klient úlohy sa dedí z oddelenia, ak úloha nemá vlastného klienta. Premenovanie nemení ID.
- Import nahrádza pracovný priestor po potvrdení; predchádzajúci obsah zálohuje do ai-planner-before-import. Neplatné väzby, neplatné oprávnenia, duplicitné ID/emaily a schéma 3 bez administrátora sa odmietnu pred zmenou dát.
- Pri chybe načítania sa úpravy nesprístupnia, aby sa pôvodné dáta neprepísali. Pri chybe zápisu aplikácia odporučí export.
- Dáta sú lokálne pre doménu a profil prehliadača. Pri zmene domény ich preneste exportom/importom.

## Zachovaný kalendár

Kalendár má rozsahy 3/5 dní, pracovný a celý týždeň, mesačný navigátor, os 00:00–24:00, aktuálny čas, prekrývajúce sa bloky, presun po 15 minútach a viac blokov na jednej úlohe. Blok cez polnoc zostáva zachovaný a zobrazí sa na oboch dňoch. Na dotykovom zariadení možno dátum a čas zmeniť formulárom.

Dátumy blokov sú YYYY-MM-DD. Staré názvy dní sa pri prvej migrácii priradia do aktuálneho lokálneho týždňa; Dnes/neznámy názov na aktuálny deň, Víkend na sobotu. Uložené ISO dátumy sa pri ďalšom načítaní už neposúvajú. Termín úlohy zostáva nezávislý.

## Nahratie do GitHubu a Vercel

1. Rozbaľte nový ZIP obsahujúci priečinok ai-planner-vercel.
2. **Obsah priečinka ai-planner-vercel nahrajte do koreňa GitHub repozitára.** package.json, tsconfig.json a app musia byť priamo v koreni.
3. Nasaďte existujúci Vercel projekt ako Next.js aplikáciu. Táto dodávka sa automaticky nenasadzovala.

## Overenie dodávky

Bez použitia siete a bez inštalácie závislostí prešlo **25 modelových testov**: migrácie klientov a TeamMember → User, predvoľby rolí a katalóg oprávnení, emaily, ochrana posledného administrátora a priradeného vlastníka/klienta, export/import, entity a pôvodné regresie kalendára.

Všetky app/*.ts a app/*.tsx prešli syntaktickou kontrolou a transpilačným spracovaním cez lokálny Babel z bundlovaného Playwrightu. tsconfig má target ES2017, nie ES5.

**Plný Next.js build, úplná typová kontrola a vizuálny/interakčný test prehliadača neboli vykonané:** v projekte nie sú nainštalované Next/React/TypeScript závislosti. Nič sa neinštalovalo a sieť sa nepoužila. Zachovaný manifest používa pôvodné latest.

Testy: `node --test tests/*.test.mjs` (Node.js 22.18+ alebo 24), prípadne `npm test`.

## Krátky test po nasadení

1. Pred nasadením exportujte staré dáta. Na rovnakej doméne obnovte aplikáciu: overte úlohy, vlastníkov, kapacity v exporte, oddelenia, entity a bloky. Nový export má schemaVersion 3 a users. Martin je administrátor.
2. V Klientoch pridajte Penta Hospitals, premenujte ho a priraďte k oddeleniu. Zmazanie sa musí odmietnuť. Po odstránení všetkých väzieb sa musí podariť. Formulár nemá email ani poznámku.
3. V Používateľoch vytvorte používateľa s emailom. Overte konzervatívne predvoľby, zmenu roly, individuálne checkboxy a uloženie. Druhý rovnaký email s inou veľkosťou písmen aj neplatný email sa musia odmietnuť.
4. Upravte meno priradeného používateľa: úlohy aj oddelenia majú nový názov pri rovnakom ownerId. Skúste zmazať priradeného používateľa, posledného administrátora a zmeniť posledného administrátora na používateľa; všetky pokusy sa musia odmietnuť.
5. Exportujte, importujte, obnovte stránku a porovnajte oprávnenia aj priradenia. Skúste chybný import; aktuálne dáta musia zostať zachované. Pri importe zo sekcie Používatelia sa rozpracovaný formulár vyčistí.
6. Overte kombinované filtre oddelenia + entity v tabuľke, Kanbane a kalendári. V kalendári prepnite všetky rozsahy, mesiac/rok, vytvorte prekryv a blok cez polnoc, presuňte jeden z dvoch blokov a overte zachovanie druhého.
7. Pri šírke 390 px overte formulár používateľa, checkboxy, správu klientov a vodorovné/zvislé rolovanie kalendára. UI musí jasne hovoriť, že pozvánky a aktivácia čakajú na prihlasovanie; nič sa neodosiela.
