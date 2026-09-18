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
- Kalendár zachováva pôvodné pomenované dni (Dnes, Pondelok až Piatok, Víkend), nejde o automaticky posúvaný dátumový kalendár. Termín úlohy je nezávislý od jej blokov.

## Overenie tejto dodávky

Bez siete a bez inštalácie: prešlo 10 automatických testov modelu na lokálnom Node.js 24, kontrola syntaxe a transpilačné spracovanie TS/TSX, kontrola referencií v JSX a simulované scenáre formulárov, migrácie, importu a zlyhania úložiska. Simulácia používala náhradu React hookov; nenahrádza test v reálnom prehliadači.

Plný Next.js build ani úplná typová kontrola TypeScriptom neboli možné, pretože projekt nemá lokálne nainštalované závislosti. Manifest si zachováva pôvodné verzie `latest`; nevytváral sa neoverený lockfile. Build a reálne správanie treba potvrdiť po nasadení. `tsconfig.json` používa **ES2017**.

Modelové testy: `node --test tests/model.test.mjs` (Node.js 22.18+ alebo 24 s natívnym spracovaním TypeScriptu).

## Presne 7 testov po nasadení

1. **Staré dáta:** Na pôvodnej doméne obnovte stránku. Overte staré úlohy, poznámky, checklisty a bloky; znovu obnovte a skontrolujte ich zachovanie.
2. **Väzby:** Pridajte klienta, člena tímu a projekt s týmto vlastníkom a klientom. Vytvorte úlohu v projekte; musí zobrazovať zdedeného klienta.
3. **Premenovanie a klient:** Premenujte projekt, nastavte úlohe iného klienta a potom vráťte dedenie z projektu. Úloha musí zostať v tom istom projekte aj po obnovení.
4. **Tri pohľady:** Nájdite tú istú úlohu v Tabuľke a Kanbane, zmeňte jej stav a overte filtre aj presun medzi stĺpcami. Skontrolujte navigáciu aj pri úzkom okne.
5. **Viac blokov:** Pridajte jednej úlohe dva bloky v odlišných dňoch vrátane Víkendu. V Týždni presuňte jeden blok. Druhý blok a termín úlohy sa nesmú zmeniť.
6. **Odstránenie a ochrany:** Odstráňte prvý blok, potom posledný. Úloha musí zostať bez blokov aj po obnovení. Skúste zmazať používaného klienta/vlastníka/projekt – odstránenie musí byť zablokované.
7. **Záloha:** Exportujte dáta, importujte tento súbor a obnovte stránku; porovnajte záznamy a bloky. Import poškodeného JSON musí zlyhať bez zmeny dát.
