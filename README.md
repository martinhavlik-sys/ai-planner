# AI Planner – osoby, triedenie a menu, 19. 9. 2026

Pracovná aplikácia v slovenčine. Táto verzia zachováva reálny kalendár, viac blokov jednej úlohy, nezávislý deadline, oddelenia, entity, klientov a lokálne dáta.

## Zmeny

- Oddelenie je jednoduchá kategória: formulár a prehľad používajú názov a farbu. Nové oddelenie má modrú **#4285F4**. Vzorka a „Vybrať inú farbu“ otvárajú paletu, ktorá je predvolene zatvorená. Výber má fajku, obrys, aria-pressed a klávesnicové ovládanie. Predvolené obnoví modrú. Staré cieľ/stav/osoba/klient zostávajú v dátach pre kompatibilitu, bez ich zobrazenia v správe oddelení.
- Tabuľka a formulár používajú **Deadline** a **Osoby**. Osem stĺpcov a tri ikonové akcie zostávajú; tabuľka sa na mobile posúva vodorovne.
- Triedenie v prvom ovládacom riadku tabuľky: názov, deadline, priorita, osoby, oddelenie; vzostupne/zostupne. Predvolené je priorita zostupne: Vysoká → Stredná → Nízka. Prázdne hodnoty sú na konci v oboch smeroch. Rovnaké hodnoty zachovajú pôvodné poradie. Mená osôb sa najprv zoradia podľa slovenskej abecedy, takže výsledok nezávisí od poradia zaškrtnutia. Triedenie sa aplikuje po filtrovaní a nemení uložené poradie úloh.
- Jedna úloha obsahuje **ownerIds: number[]**. Rozbaľovací výber osôb má vyhľadávanie a checkboxy. Tabuľka, Kanban, detail a kalendár používajú spoločné avatary. Viac než tri osoby dopĺňa +N; detail ukazuje všetky mená. Každá osoba má úlohu započítanú raz, celkový počet úloh sa nemení.
- Filter Osoby podporuje konkrétnu osobu aj Nepriradené a kombinuje sa so všetkými existujúcimi filtrami a vyhľadávaním. Existujúce „Moje“ naďalej znamená priradenú osobu s menom obsahujúcim Martin; aplikácia zatiaľ nemá prihláseného používateľa.
- Používateľ má meno, email, rolu, oprávnenia, iniciály (najviac 3 znaky), farbu a voliteľnú fotografiu. Iniciály sa odvodia z mena, napr. Martin Havlík → MH, možno ich prepísať alebo obnoviť tlačidlom Z mena.
- Fotografia: PNG/JPEG/WebP do **150 KB**, spolu do **1 MB** Data URL v pracovnej ploche. Výber overí typ, veľkosť aj načítanie obrázka; import overí povolený formát Data URL a limity. SVG a vzdialené URL nie sú povolené.
- Hlavné menu možno presúvať vertikálne potiahnutím alebo tlačidlami ↑/↓ dostupnými aj klávesnicou a na mobile. Poradie sa ukladá a exportuje. Duplicitné „Spravovať entity“ je odstránené; spodný zoznam entít slúži iba na filtrovanie.

## Používatelia a väzby

Sekcia správy zostáva **Používatelia**, priradenie práce používa **Osoby**. Email sa oreže a normalizuje na malé písmená. Uloženie aj import overujú formát a duplicitu. Starí používatelia bez emailu ho doplnia pri úprave.

Posledného administrátora nemožno zmazať ani zmeniť na používateľa. Osobu nemožno zmazať, kým figuruje v ownerIds ktorejkoľvek úlohy, aj hotovej. Najprv ju odškrtnite alebo nahraďte vo formulári; ostatné osoby zostanú. Nepoužívaná historická osoba oddelenia už neblokuje zmazanie používateľa a pri zmazaní sa bezpečne vyprázdni.

Oddelenie nemožno zmazať, kým má úlohy alebo historické ciele. Premenovanie zachová ID a aktualizuje textové väzby. Klient má iba názov a možno ho priradiť úlohe. Historické priradenie klienta k oddeleniu a dedenie do úloh zostáva funkčné pre staré dáta; nové oddelenia klienta nemajú. Klient s existujúcou väzbou sa nedá zmazať. Staré email/note klientov zostávajú v exporte.

**Prihlasovanie, reálne pozvánky a aktivácia nie sú implementované.** Oprávnenia sa iba lokálne evidujú, neblokujú prístup. Stav aktívny/pripravený na pozvanie označuje lokálny záznam. Roly admin/user majú predvolené oprávnenia, ktoré možno upraviť. Katalóg permissionCatalog má stabilné kľúče pre budúci backend; roly sa neskôr musia vynucovať aj na serveri.

## Dáta a migrácia

- Kľúč localStorage zostáva **ai-planner-workspace-v1**, schéma je **4**. Podporované sú dáta bez verzie a schémy 1/2/3/4.
- Staré ownerId sa prevedie na ownerIds s jedným ID alebo prázdne pole; staré textové priradenia sa previažu s osobami. ownerIds je autoritatívne, duplicitné ID sa odstránia. ownerId (prvá osoba) a owner (spojené mená) zostávajú iba kompatibilnými odvodenými poľami. Úpravy nového modelu robte cez ownerIds.
- Schéma 4 pridáva initials/avatarColor/photo a menuOrder. Neznáme položky menu sa odstránia, duplicity zlúčia a chýbajúce položky doplnia. Staré dáta dostanú pôvodné poradie.
- Starý team sa migruje na users so zachovanými ID, kapacitou a legacyRole. Pri migrácii starého tímu sa Martin stáva administrátorom; ak žiadny nie je, pribudne lokálny administrátor. Schémy 3/4 musia mať administrátora.
- Úlohy, oddelenia, entity, klienti, používatelia, oprávnenia, ciele, poznámky, checklisty, aktivity a všetky časové bloky sa zachovávajú. Historické samostatné kľúče úložiska sa nemenia ani nemažú.
- Import najprv validuje celú zálohu a po potvrdení nahradí pracovnú plochu. Predchádzajúce dáta zálohuje do ai-planner-before-import. Neplatné ID, väzby, emaily, oprávnenia alebo fotografia odmietnu import pred zmenou dát.
- Pri chybe načítania sa pôvodné dáta neprepíšu. Pri chybe zápisu aplikácia odporučí export. Kapacita úložiska závisí aj od množstva úloh a ostatných dát; fotografie majú samostatný konzervatívny limit.
- Dáta patria doméne a profilu prehliadača. Pri zmene domény použite export/import.

## Zachovaný kalendár

Rozsahy 3/5 dní, pracovný/celý týždeň, mesačný navigátor, os 00:00–24:00, aktuálny čas, prekryvy, presun po 15 minútach a viac blokov jednej úlohy. Blok cez polnoc sa zobrazí na oboch dňoch so zachovaným ID a trvaním. Dátum/čas možno upraviť aj formulárom.

Po otvorení a navigácii sa kalendár vracia na 08:00 vrátane opakovaného Dnes alebo rovnakého dátumu. Blok má akcie upraviť a plus. Plus → Rovnaký čas pridá blok s rovnakým časom; Iný čas pridáva až po potvrdení. Počet úloh sa nemení, pribudne unikátne slot ID.

Dátumy blokov sú YYYY-MM-DD. Staré názvy dní sa pri prvej migrácii prevedú na lokálny aktuálny týždeň a potom sa už neposúvajú. Deadline je nezávislý dátum; neplatné staré textové termíny sú prázdne. Zobrazenie používa slovenský dátum alebo pomlčku.

## Overenie dodávky

Bez siete a bez inštalácie balíkov: **46 testov, 46 úspešných, 0 preskočených**. Pokrývajú migrácie, kalendár, viac blokov, väzby, profily, limity fotografií, počítadlá, stabilné triedenie všetkých piatich polí oboma smermi, filtre, zmenu poradia menu a obnovenie. Komponentové testy vykonávajú skutočné handlery výberu osôb, farieb, iniciál, menu aj kalendárové handlery/effecty. Všetky app/*.ts a app/*.tsx prešli offline transpilačnou a syntaktickou kontrolou cez Babel z dostupného Playwrightu.

**Plný Next.js build, úplná typová kontrola a vizuálny/interakčný test v reálnom prehliadači neboli vykonané:** Next/React/TypeScript nie sú nainštalované v projekte ani v dostupnom balíku. Zachovaný manifest používa pôvodné latest. Komponentové prostredie simuluje hooky; neoveruje skutočné rozloženie DOM ani natívny výber obrázka.

Testy: `node --test tests/*.test.mjs` (Node 22.18+ alebo 24). Pre komponentové/transpilačné testy nastavte `BABEL_BUNDLE` na absolútnu cestu existujúceho `playwright/lib/transform/babelBundle.js`; bez nej sa tieto testy výslovne preskočia. Projekt nie je Git checkout. Predchádzajúce ZIP-y zostali zachované.

## Nasadenie a krátky akceptačný test

Rozbaľte nový ZIP s koreňovým priečinkom ai-planner-vercel. **Obsah tohto priečinka** nahrajte do koreňa existujúceho GitHub repozitára a nasaďte cez existujúci Vercel projekt. Dodávka sa automaticky nenasadzovala.

Po deployi overte desktop aj šírku 390 px:

1. Exportujte zálohu pred aktualizáciou. Obnovte stránku a overte pôvodné úlohy, osoby, entity, klientov, deadline, poznámky a bloky. Nový export má schemaVersion 4 a ownerIds.
2. Vytvorte oddelenie: iba názov a modrá vzorka. Otvorte paletu, vyberte farbu klávesnicou, obnovte Predvolené a uložte. Premenovanie musí zachovať priradenie úloh.
3. V Používateľoch vytvorte dve osoby. Overte automatické aj vlastné iniciály, farbu a malú PNG/JPEG/WebP fotografiu. Súbor nad 150 KB alebo iný typ sa odmietne. Skontrolujte oprávnenia a zachovanie po obnovení.
4. Priraďte jednu úlohu obom: celkový počet ostáva rovnaký, obe majú +1 v počítadle. Overte avatary, detail, Kanban, kalendár a filtre. Odškrtnutie jednej zachová druhú; zmazanie priradenej osoby sa odmietne.
5. Kombinujte vyhľadávanie a filtre s každým triedením oboma smermi. Prázdne hodnoty zostávajú na konci; priorita zostupne začína Vysoká. Exportované poradie úloh sa triedením nemení.
6. Presuňte menu potiahnutím aj ↑/↓. Obnovte stránku a spravte export/import: poradie, profily, fotografie a priradenia musia zostať. Entity majú jednu správcovskú položku.
7. V kalendári pridajte blok cez plus, presuňte iba jeden blok, overte prekryv aj blok cez polnoc a návrat na 08:00 pri navigácii. Na mobile overte formuláre, presúvanie menu tlačidlami a rolovanie tabuľky/kalendára.
