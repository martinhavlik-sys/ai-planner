# AI Planner – oddelenia a entity, 18. 9. 2026

Základom je úloha. Projekt / oddelenie (napr. HR, Marketing, IT) a entita (napr. Nemocnica Bory alebo ProCare Betliarska) sú jej dve nezávislé priradenia. Jedno oddelenie môže pracovať pre viac entít a jedna entita môže mať úlohy viacerých oddelení. Klienti/zadávatelia zostávajú samostatní; na entity sa automaticky nemapujú.

Entity majú stabilné ID a názov. V sekcii Entity ich možno vytvoriť, premenovať a zmazať. Používanú entitu možno zmazať až po zmene priradenia všetkých jej úloh vrátane hotových. Vo formulári nasleduje po výbere Projekt / oddelenie výber Entita s možnosťou Bez entity. Existujúce nepriradené projekty zostávajú kompatibilné.

Ľavý panel má samostatne rozbaľovacie skupiny Projekty / oddelenia a Entity, každú s možnosťou Všetky. Filtre sa kombinujú a platia rovnako pre tabuľku, Kanban aj reálny kalendár. Výbery v hornej lište ukazujú aktívne filtre aj pri zbalených skupinách. Tabuľka a detail zobrazujú entitu. Nová úloha preberá aktívne priradenia filtrov. Kalendár si zachováva všetky pôvodné funkcie a viac blokov jednej úlohy.

## Nahratie do GitHubu a nasadenie

1. Rozbaľte ZIP. Obsahuje jeden priečinok `ai-planner-vercel`.
2. **Obsah tohto priečinka** nahrajte do koreňa existujúceho GitHub repozitára. `package.json`, `tsconfig.json` a priečinok `app` majú byť priamo v koreni, nie v ďalšom vnorenom priečinku.
3. Nasaďte existujúci projekt na Verceli ako Next.js aplikáciu. Táto odovzdaná verzia nebola nasadená automaticky.

## Dáta a kompatibilita

- Dáta zostávajú lokálne v prehliadači. Na ich automatické zachovanie otvorte aplikáciu na rovnakej doméne a v rovnakom profile prehliadača; na inú doménu ich preneste cez Export a Import.
- Pôvodné kľúče `ai-planner-tasks-v2`, `ai-planner-projects-v1`, `ai-planner-team-v1` a `ai-planner-goals-v1` sa čítajú, ale nemenia ani nemažú.
- Kľúč `ai-planner-workspace-v1` zostáva rovnaký; obsah sa migruje na schému 2 s poľom `entities` a `Task.entityId: number | null`. Dáta bez verzie aj schéma 1 sa načítajú kompatibilne; staré úlohy dostanú `entityId: null` (Bez entity). Existujúce ID, poznámky, checklisty, aktivity a viac blokov sa zachovajú. Staré ciele zostávajú v dátach a exporte, hoci nemajú vlastnú obrazovku. JSON export/import zachováva entity aj ich väzby a odmieta neexistujúce odkazy.
- Klient úlohy sa dedí z projektu, pokiaľ je priamo na úlohe zvolený iný klient. Premenovanie projektu nemení jeho ID.
- Import nahrádza pracovný priestor po potvrdení. Predchádzajúci uložený obsah sa zálohuje pod `ai-planner-before-import`. Neplatný import alebo neplatná verzia dát sa odmietne.
- Pri chybe načítania sa úpravy nesprístupnia, aby sa neprepísali pôvodné dáta. Pri chybe zápisu aplikácia upozorní na potrebu Exportu.
- Kalendár ukladá dátumy v existujúcom poli slot.day ako YYYY-MM-DD. Dnes sa pri migrácii mapuje na lokálny dátum prehliadača; Pondelok–Nedeľa na aktuálny týždeň pondelok–nedeľa. Víkend znamená sobotu. Neznámy starý názov sa konzervatívne uloží na dnešok; blok sa nezahodí. Po uložení sa už dátumy neposúvajú. Termín úlohy ostáva nezávislý.
- Pri otvorení aplikácie sa migrácia starých názvov dní viaže na aktuálny týždeň. ISO dátumy sa zachovajú aj pri neskoršom importe a pri migrácii na schému 2.
- Rozsahy 3/5 dní začínajú vybraným dátumom, pracovný/celý týždeň začína pondelkom. Šípky posúvajú 3/5/7 dní. Mesačný navigátor vyberá kotviaci dátum.
- Časová os má 64 px/hodinu, 00:00–24:00, vodorovné aj zvislé rolovanie. Po zmene rozsahu sa posunie k aktuálnemu času, ak je dnešok viditeľný, inak k 08:00. Červená čiara sa obnovuje každých 30 sekúnd.
- Výška blokov závisí výhradne od trvania; názvy majú ellipsis. Prekrývajúce sa intervaly dostanú deterministické stĺpce. Blok cez polnoc sa zobrazí na oboch dátumoch bez straty dĺžky alebo ID.
- Presun myšou sa zarovnáva na 15 minút a zachová dĺžku, ID, stav aj ostatné bloky úlohy. Pri spodnej hrane sa začiatok obmedzí tak, aby presunutý blok skončil najneskôr o 24:00. Na dotykovom zariadení použite editáciu dátumu a času.
- Tlačidlo + v bloku otvorí formulár s novým blokom tej istej úlohy; zmena sa uloží až potvrdením formulára. Veľmi krátky alebo úzky blok otvorte kliknutím a použite Upraviť úlohu / Pridať časový blok.

## Overenie tejto dodávky

Bez siete a inštalácie: 19 automatických modelových testov. Pokrývajú aj migráciu schémy 1 na 2 bez straty dát, nezávislé a kombinované filtre vrátane Bez entity, export/import a premenovanie entity, neplatné väzby a blokovanie zmazania používanej entity. Pôvodné testy dátumov, rozsahov, súbežných intervalov a presunu blokov zostávajú zahrnuté. Kontrola syntaxe a transpilačné spracovanie model.ts, page.tsx a calendar.tsx používajú lokálny Babel z bundlovaného Playwrightu.

Rozhranie bolo skontrolované staticky v JSX/CSS. Samostatné skupiny filtrov sú dostupné aj na úzkom zobrazení, tabuľka má vodorovné rolovanie. V tejto dodávke nebol vykonaný vizuálny ani interakčný test v prehliadači; vykonajte nižšie uvedený zoznam po nasadení.

Plný Next.js build a úplná typová kontrola neboli možné bez nainštalovaných Next/React/TypeScript závislostí. Nič sa neinštalovalo, sieť sa nepoužila. Manifest zachováva pôvodné latest; tsconfig má ES2017. Nasadenie sa nevykonalo.

Modelové testy: `node --test tests/model.test.mjs` (Node.js 22.18+ alebo 24).

## Presný zoznam testov po Vercel deployi

### Oddelenia a entity – krátky akceptačný test

1. Exportujte staré dáta, nasaďte a obnovte na rovnakej doméne. Počty úloh, poznámky, checklisty a bloky sa nezmenia; úlohy majú Bez entity. Nový export obsahuje schému 2.
2. Vytvorte oddelenia HR a IT a entity Nemocnica Bory a ProCare Betliarska. Vytvorte úlohy HR+Bory, HR+Betliarska, IT+Bory a HR+Bez entity. Formulár ponúka najprv oddelenie a potom entitu.
3. Zbaľte každú skupinu nezávisle. Po rozbalení vidíte všetky položky. HR+Bory zobrazí len prvú úlohu v tabuľke, Kanbane aj kalendári; Všetky oddelenia+Bory zobrazí prvú aj tretiu. Všetky entity zruší iba filter entity. Bez entity zobrazí nepriradené úlohy.
4. Premenujte Bory; názov sa aktualizuje v tabuľke, detaile a výberoch. Zmazanie používanej entity sa odmietne so správou. Po preradení všetkých úloh možno entitu zmazať.
5. Exportujte, importujte a obnovte stránku. Overte názvy a ID entít, obe priradenia úloh, klientov a kalendárne bloky. Neplatný import nesmie zmeniť aktuálne dáta.
6. Pri šírke 390 px overte rozbalenie skupín, správu entity a oba výbery vo formulári. V kalendári overte rozsahy 3/5/pracovný/7 dní, navigáciu, 24h os, prekryvy a presun jedného z dvoch blokov úlohy.

### Podrobná regresia zachovaného kalendára

1. **Migrácia:** Pred nasadením exportujte zálohu. Na rovnakej doméne obnovte aplikáciu so starými dátami. Dnes má byť lokálny dnešok, Pondelok–Piatok v aktuálnom týždni a Víkend sobota. Overte počet blokov, ID v exporte, poznámky a checklisty. Obnovte stránku a overte, že dátumy zostali rovnaké.
2. **Rozsahy:** Prepnite 3 dni, 5 dní, pracovný týždeň a celý týždeň. Overte 3/5/5/7 dátumových stĺpcov a pondelkový začiatok týždňov. Šípky majú posunúť 3/5/7/7 dní; Dnes sa vráti k dnešnému dátumu.
3. **Mesiace:** Mesačnými šípkami prejdite cez december/január. Kliknite na deň, overte správny rozsah a označenie dneška. V pracovnom týždni víkendový výber ukazuje pracovné dni toho istého týždňa.
4. **Celý deň:** Odrolujte na 00:00 a 24:00. Vytvorte bloky o 00:00, 08:15 a 23:45; po obnovení skontrolujte presné časy. Dvojhodinový blok od 23:00 sa musí zobraziť aj na ďalšom dni.
5. **Text a výška:** Vytvorte úlohu s názvom dlhým aspoň 200 znakov bez medzier. Pridajte bloky 15 minút, 30 minút, 1 a 2 hodiny. Ich výšky musia byť 16/32/64/128 px, text orezaný a mriežka nezmenená.
6. **Prekryvy:** V rovnaký deň vytvorte intervaly 09–12, 09–10, 10–11 a 10:30–12:30. Súbežné bloky musia byť vedľa seba, aj po obnovení. Blok od 12:30 má dostať plnú šírku.
7. **Presun:** Úlohe vytvorte dva bloky. Jeden presuňte na iný dátum a 14:15. Overte jeho nový čas, nezmenený druhý blok, trvanie, názov, stav, termín a taskId/slot ID v exporte. Skúste presun po zvislom odrolovaní aj tesne pri konci dňa.
8. **Editácia a pridanie:** Kliknite na blok, upravte ho cez detail. Cez + pridajte ďalší blok, nastavte iný dátum a uložte. Počet úloh sa nesmie zvýšiť. Zrušenie formulára nesmie pridať blok. Odstráňte prvý a potom posledný blok; úloha musí zostať zachovaná.
9. **Aktuálny čas:** V rozsahu obsahujúcom dnešok overte červenú čiaru podľa lokálneho času. Po minúte sa musí posunúť. V inom týždni čiara nesmie byť.
10. **Úzke okno:** Pri šírke 390 px skontrolujte mesačný navigátor, prepínač rozsahu a rolovanie časovej mriežky oboma smermi. Celá stránka sa nemá rozťahovať kvôli kalendáru. Na mobile upravte dátum a čas formulárom.
11. **Regresie a záloha:** Nájdite rovnakú úlohu v Tabuľke a Kanbane. Overte klienta, projekt a vlastníka. Exportujte/importujte dáta, obnovte stránku a porovnajte dátumy a bloky. Poškodený import nesmie prepísať dáta.
