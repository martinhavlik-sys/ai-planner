# AI Planner – jadro, 18. 9. 2026

Úlohy, projekty, klienti/zadávatelia, vlastníci a viac kalendárnych blokov jednej úlohy. Pohľady Tabuľka, Kanban a Týždeň používajú rovnaké úlohy. Reporty, roadmapa a automatické AI návrhy nie sú súčasťou rozhrania tejto verzie.

## Nahratie do GitHubu a nasadenie

1. Rozbaľte ZIP. Obsahuje jeden priečinok `ai-planner-vercel`.
2. **Obsah tohto priečinka** nahrajte do koreňa existujúceho GitHub repozitára. `package.json`, `tsconfig.json` a priečinok `app` majú byť priamo v koreni, nie v ďalšom vnorenom priečinku.
3. Nasaďte existujúci projekt na Verceli ako Next.js aplikáciu. Táto odovzdaná verzia nebola nasadená automaticky.

## Dáta a kompatibilita

- Dáta zostávajú lokálne v prehliadači. Na ich automatické zachovanie otvorte aplikáciu na rovnakej doméne a v rovnakom profile prehliadača; na inú doménu ich preneste cez Export a Import.
- Pôvodné kľúče `ai-planner-tasks-v2`, `ai-planner-projects-v1`, `ai-planner-team-v1` a `ai-planner-goals-v1` sa čítajú, ale nemenia ani nemažú.
- Migrácia vytvorí `ai-planner-workspace-v1` so schémou 1 a ID väzbami. Existujúce ID, poznámky, checklisty, aktivity a viac blokov sa zachovajú. Staré ciele zostávajú v dátach a exporte, hoci nemajú vlastnú obrazovku.
- Klient úlohy sa dedí z projektu, pokiaľ je priamo na úlohe zvolený iný klient. Premenovanie projektu nemení jeho ID.
- Import nahrádza pracovný priestor po potvrdení. Predchádzajúci uložený obsah sa zálohuje pod `ai-planner-before-import`. Neplatný import alebo neplatná verzia dát sa odmietne.
- Pri chybe načítania sa úpravy nesprístupnia, aby sa neprepísali pôvodné dáta. Pri chybe zápisu aplikácia upozorní na potrebu Exportu.
- Kalendár ukladá dátumy v existujúcom poli slot.day ako YYYY-MM-DD. Dnes sa pri migrácii mapuje na lokálny dátum prehliadača; Pondelok–Nedeľa na aktuálny týždeň pondelok–nedeľa. Víkend znamená sobotu. Neznámy starý názov sa konzervatívne uloží na dnešok; blok sa nezahodí. Po uložení sa už dátumy neposúvajú. Termín úlohy ostáva nezávislý.
- Pri otvorení aplikácie sa migrácia viaže na aktuálny týždeň. ISO dátumy sa zachovajú aj pri neskoršom importe. Kľúč úložiska aj schemaVersion ostávajú rovnaké.
- Rozsahy 3/5 dní začínajú vybraným dátumom, pracovný/celý týždeň začína pondelkom. Šípky posúvajú 3/5/7 dní. Mesačný navigátor vyberá kotviaci dátum.
- Časová os má 64 px/hodinu, 00:00–24:00, vodorovné aj zvislé rolovanie. Po zmene rozsahu sa posunie k aktuálnemu času, ak je dnešok viditeľný, inak k 08:00. Červená čiara sa obnovuje každých 30 sekúnd.
- Výška blokov závisí výhradne od trvania; názvy majú ellipsis. Prekrývajúce sa intervaly dostanú deterministické stĺpce. Blok cez polnoc sa zobrazí na oboch dátumoch bez straty dĺžky alebo ID.
- Presun myšou sa zarovnáva na 15 minút a zachová dĺžku, ID, stav aj ostatné bloky úlohy. Pri spodnej hrane sa začiatok obmedzí tak, aby presunutý blok skončil najneskôr o 24:00. Na dotykovom zariadení použite editáciu dátumu a času.
- Tlačidlo + v bloku otvorí formulár s novým blokom tej istej úlohy; zmena sa uloží až potvrdením formulára. Veľmi krátky alebo úzky blok otvorte kliknutím a použite Upraviť úlohu / Pridať časový blok.

## Overenie tejto dodávky

Bez siete a inštalácie: 15 automatických modelových testov (migrácia, zachovanie ID/väzieb, opakované načítanie, rozsahy, polnoc, zmena rokov a letného času, súbežné intervaly). Kontrola syntaxe a transpilačné spracovanie model.ts, page.tsx a calendar.tsx prešli cez lokálny Babel z bundlovaného Playwrightu. Statické vykonanie kalendára s náhradou React hookov overilo generovanie udalostí, výšky, otvorenie detailu a zmenu rozsahu.

Desktop a úzky viewport boli skontrolované staticky v JSX/CSS: 208 px mesačný navigátor, od 1100 px jeden stĺpec, minimálne 120 px/deň v samostatnom horizontálnom scrolle, min-width:0 na obsahu, pevná časová výška a nowrap/ellipsis. Pokus o screenshot cez lokálny Chrome skončil SIGABRT v sandboxe; screenshot ani plný test prehliadača preto nie sú súčasťou overenia.

Plný Next.js build a úplná typová kontrola neboli možné bez nainštalovaných Next/React/TypeScript závislostí. Nič sa neinštalovalo, sieť sa nepoužila. Manifest zachováva pôvodné latest; tsconfig má ES2017. Nasadenie sa nevykonalo.

Modelové testy: `node --test tests/model.test.mjs` (Node.js 22.18+ alebo 24).

## Presný zoznam testov po Vercel deployi

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
