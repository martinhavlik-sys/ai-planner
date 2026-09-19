# Stav a bezpečné pokračovanie

## Implementované

Lokálny workspace v5, migrácie a JSON zálohy; úlohy s viacerými osobami a blokmi; oddelenia, entity, projekty s edíciami/archívom; tabuľka, Kanban a reálny kalendár. V6 dopĺňa resize s clampom na polnoc, farby oddelení, natívny modal, oddelený druhý riadok projektu, responzívnu správu entít/projektov a dokumentáciu.

## Pripravené, ale vypnuté

Supabase SQL schema/RLS pre čítanie, verejná konfigurácia, read-only REST funkcia a uzamknutý repository kontrakt. Prenosový balík je exportovaný súbor, nie vykonaný import. Nenazývať tento stav cloudovou synchronizáciou. Používateľské roly/permissions sa iba lokálne evidujú.

## Plánované / nedokončené

- Overiť a doplniť databázové invarianty, integračné testy RLS a bezpečné mapovanie všetkých lokálnych údajov.
- Zaviesť Auth/session lifecycle a dôveryhodné provisioning pracovných priestorov/členstiev; potom serverovo vynucované roly.
- Implementovať transakčný import do nového priestoru, overenie počtov a zálohy; až potom explicitné prepnutie zdroja dát používateľom.
- Navrhnúť zapisovacie oprávnenia, súbežné zmeny, konflikty, obnovu po chybe a offline správanie. Dnes dva otvorené taby nezlučujú zmeny; posledný lokálny zápis môže prevážiť.
- Nahradiť „Moje“ (historicky meno obsahuje martin) overenou identitou. Pred zdieľaním aplikácie odstrániť závislosť od lokálneho owner prepínača.
- Zaviesť samostatne inštalovateľné komponentové/prehliadačové testy a CI. Dnešný Babel harness simuluje hooky a DOM handlery, nie skutočný prehliadač.
- Manuálne overiť nové rozhranie v desktopovom a mobilnom prehliadači podľa DEPLOYMENT. Vizuálna kontrola v6 zatiaľ zostáva nevykonaná pre blokovanie browser nástroja pri vyčerpanom usage limite.

Toto je odvodený technický backlog, nie prísľub konkrétnej ďalšej dodávky. Externé kalendáre, emaily, AI funkcie a reporting nie sú v tejto fáze implementované ani špecifikované.

## Známe limity

Datalist má natívne správanie závislé od prehliadača. Neplatný nedokončený text blokuje uloženie; Escape obnoví predchádzajúci výber. Primárny presun blokov používa HTML drag/drop, jeho dotyková podpora nebola overená. Resize používa pointer udalosti, ale auto-scroll pri okraji nie je implementovaný. Pri veľmi krátkom bloku sú ovládacie prvky malé; klávesnica a formulár zostávajú dostupné alternatívy.

Lokálne údaje sú viazané na doménu/profil prehliadača. Súbory exportu môžu obsahovať interné poznámky, emaily a fotografie. Zálohy neukladať do verejného repozitára. SQL legacy JSON sa nesmie bez kontroly naplniť klientskými alebo inými admin-only údajmi do tabuliek čitateľných členmi.

## Checklist pred pokračovaním

1. Prečítať README a všetkých päť docs; overiť aktuálne súbory, nepovažovať chat ani tento backlog za dôkaz o stave nasadenia.
2. Zistiť skutočný Git checkout, lokálne zmeny a cieľovú vetvu. Táto dodávka vznikala v adresári bez `.git`; tracked stav a živý Vercel deployment nie sú potvrdené.
3. Pred zmenami dát vytvoriť úplný JSON Export na pôvodnej doméne a zálohu zdrojov. Neodstraňovať lokálne kľúče, schemaVersion ani kompatibilné polia.
4. Zachovať ID úloh/osôb/slotov a správanie kalendára. Pri novom modeli napísať explicitné migračné testy vrátane importu v5 a blokov cez polnoc.
5. Použiť pripnuté závislosti, spustiť testy vrátane komponentovej sady, typecheck a produkčný build. Rozlišovať preskočené testy od úspešných.
6. Overiť vrstvy, focus/Escape, resize vs move/click, farby, prekryvy, ročníky a úzku obrazovku v skutočnom prehliadači.
7. Pred databázovými zmenami najprv testovací Supabase projekt, overené členstvo/Auth a izolácia dvoch workspace. Nikdy neotvárať anon zápisy ako obchádzku.
8. Aktualizovať docs a uviesť presné výsledky/obmedzenia. ZIP skontrolovať na caches, dependencies, `.env` secrets a Git metadata. Push/deploy robiť iba v autorizovanom rozsahu.
