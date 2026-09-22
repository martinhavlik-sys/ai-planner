> **Aktuálne v9 (22. 9. 2026):** katalógy a voliteľné nezávislé zaradenia úloh sú jediný nový rozsah. Oddelenie, entita, projekt a submitter zostávajú odlišné; žiadne automatické mapovanie sa nerobí. Report, grafy, exporty, analytika a skutočné splnenie do tohto vydania nepatria.

# Dôležité rozhodnutia

Schválené pravidlá implementované vo v6. Zmena týchto pravidiel vyžaduje vysvetlenie dopadu a prípadný migračný plán.

1. **Stabilita dát pred premenovaním.** `projects` naďalej znamenajú oddelenia; `campaigns` skutočné projekty. Vydanie v6 ponecháva JSON v5 aj storage key. V budúcnosti použiť explicitný adaptér/migráciu, nie hromadné nahradenie názvov.
2. **Jedna úloha, viac osôb a blokov.** Resize, presun a pridanie slotu nevytvárajú ďalšiu úlohu. Každá priradená osoba má úlohu započítanú raz. Úpravy slotu adresovať ID, nikdy poradím vykreslených segmentov.
3. **Resize má iný cieľ než presun.** Telo/hlavička používa pôvodné drag/drop, spodný úchyt používa pointer capture. Náhľad sa neukladá pri každom pohybe; uloží sa pri pustení. Cancel/Escape nič nemení. Kliknutie po resize neotvorí detail. Posun scrollu je súčasťou výpočtu.
4. **Polnoc a historické bloky.** Nový resize končí najneskôr o 24:00 zobrazeného dňa, krok je 15 minút a minimum 15 minút. Pri starom bloku cez polnoc prvý segment môže blok skrátiť po svoju polnoc; druhý upravuje koniec pri zachovaní pôvodného začiatku a predchádzajúcich hodín. Celkové trvanie má pôvodný limit 24 h. Samotné načítanie/import bloky cez polnoc neskracuje. Formuláre pôvodnú podporu cez polnoc zachovávajú. Presun naďalej používa existujúci clamp `24 - duration`.
5. **Klávesnica úchytu.** Tab zaostrí úchyt; ↓ predlžuje a ↑ skracuje po 15 minútach; Home nastaví minimálny koniec segmentu, End posledný povolený koniec. ARIA slider oznamuje koncový čas a celkové trvanie. Pôvodné formuláre zostávajú alternatívou k gestám.
6. **Farba patrí oddeleniu.** Základ sa vyhľadá cez legacy `task.projectId`. Silný ľavý okraj používa farbu oddelenia, výplň mieša 14 % tejto farby s bielou. Text sa vyberá z tmavej/bielej podľa luminancie. Nepriradené alebo neplatné farby používajú predvolenú modrú. Farba sa neukladá duplicitne na úlohu.
7. **Dialógy nad stránkou.** Editor a slot dialog používajú natívnu top layer; kalendár má izolovaný stacking context s malými pomenovanými vrstvami. Detail je nemodálny panel nad stránkou. Nevkladať další vysoký z-index do jednotlivých eventov.
8. **Projekt a edícia.** UI zobrazuje `názov · edícia`; bez edície sa oddeľovač nevypisuje. Nové uloženie odmieta rovnaký názov+oddelenie+edíciu (orezané, bez ohľadu na veľkosť písmen). Historické duplicitné importy sa zachovajú a výber ich odlíši ID. Archivovaný projekt nemožno novo vyberať, ale existujúca väzba sa zobrazuje a nemení sa bez zásahu používateľa.
9. **Bez tlaku na ľudí.** Dátum dokončenia je nepovinný a nezávislý od slotov. Nepridávať meranie uplynutého času, hodnotenie výkonu, dátum pridelenia ani sledovanie dátumu splnenia. Historické dáta neodstraňovať len preto, že ich aktuálne UI nepotrebuje.
10. **Remote zostáva vypnuté.** Verejný anon kľúč nie je identita ani oprávnenie na zápis. Lokálny prepínač vlastníka a permissions nie sú bezpečnostná hranica. Bez Auth, členstva a overeného RLS nevytvárať zapisovacie policies ani automatický prenos údajov.
11. **Kompaktná správa záznamov.** Jeden obal sekcie, zarovnaný formulár a stabilné stĺpce zoznamu; responzívne preskupenie namiesto vnorených kariet. Ikonové akcie majú title aj accessible label.
12. **Dokumentácia spolu s kódom.** Každá zmena dát, ukladania, oprávnení, integrácie alebo deploymentu musí aktualizovať príslušný dokument. Rozlišovať lokálne overené fakty od predpokladov o Verceli/Supabase.


## v7 · reversible local visual assets

Keep globals.css byte-identical to v6, layer scoped ProCare styles above it, and retain source snapshots + original ZIP. Self-host official Montserrat WOFF2 under OFL 1.1; record the supplied proprietary MDX provenance without inventing license rights. Use accessible parent controls and original SVGs where the MDX mapping is unsuitable.
