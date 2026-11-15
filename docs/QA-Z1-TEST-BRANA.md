# Z1 – dočasná brána prvého TEST zápisu

Východisko: bf94674f3103223d38d71b99b3b74cfdef2700d9.
**READY – lokálna Z1 oprava a rollbacky. BLOCKED – živá etapa a overenie A/B.**
Žiadny SQL dotaz sa v tejto etape nevykonal na Supabase. Projektová identita
ai-planner-test / yqleboakzkowfxsmynfy bola potvrdená iba read-only metadátovým API.
Všetky SQL skúšky nižšie prebehli iba v lokálnom PostgreSQL WASM.

## Z1 a matica

Návrh pridáva test_tasks_update_probe_only AS RESTRICTIVE FOR UPDATE
TO authenticated, USING aj WITH CHECK (create_request_id IS NOT NULL).
Historické úlohy s NULL requestom sú v prvom bloku neupraviteľné vrátane
vlastných, priradených aj tímových úloh admin/owner. Ochrana nezávisí od UI.
Klient nemá grant doplniť request historickej úlohe a trigger chráni jeho nemennosť.

Schválená permissive matica zostáva: member/user vlastné alebo aktívne
priradené; admin/owner aj nepriradené tímové úlohy vlastného workspace;
analyst bez INSERT/UPDATE. Z1 túto maticu navyše zúži na novú syntetickú úlohu.
Dočasná brána nemení SELECT ani identitu úlohy či granty na členstvá.

**Odstránenie brány na sprístupnenie historických/tímových úloh je samostatný
neskorší krok vyžadujúci výslovné schválenie.** Nie je súčasťou tohto návrhu.
R1 ju odoberá iba spolu so zrušením zápisových grantov a permissive politík,
čím sa obnoví read-only režim; nejde o otvorenie historických úloh.

## R1 a R2

- R1 odstráni aj test_tasks_update_probe_only. Overovací program potvrdzuje,
  že politika zmizla, INSERT/UPDATE sú zamietnuté a celý snapshot úloh je nezmenený.
- R2 vyžaduje predchádzajúci R1. Ak ostala ktorákoľvek zo štyroch návrhových
  politík vrátane Z1, zastaví sa pred DROP. Tento prípad je lokálne testovaný.
- R1 + R2 pred prvým zápisom obnovia celý zachytený verejný schema-only snapshot.
- R2 po zápise odmietne pokračovať; ROLLBACK zachová schému aj údaje. Žiadny cleanup.

## completed_at

Súčasný baseline ani návrh nemajú trigger synchronizácie status ↔ completed_at.
Prechod do Hotovo čas automaticky nenastaví; návrat do Backlog ho automaticky
nevymaže. Nová syntetická úloha má completed_at=NULL. Klient nemá INSERT/UPDATE
grant na tento stĺpec. Staré hodnoty sa nebackfillujú ani nemažú.

Lokálny test výslovne overil Hotovo → Backlog pri syntetickej úlohe a stále
NULL completed_at; priamy klientský zápis času je odmietnutý. completed_at preto
v tejto iterácii nie je potvrdeným záznamom okamihu dokončenia. Prípadnú
synchronizáciu a pravidlá opätovného otvorenia treba schváliť samostatne.

## Archivované úlohy

- Historické úlohy, archivované aj nearchivované, sú uzamknuté bránou Z1.
- Nový INSERT nedostáva archived_at; syntetická úloha začína nearchivovaná.
- Klient nemá grant nastavovať alebo rušiť archived_at. Archivačná akcia sa nepridáva.
- **Návrh neobsahuje archived_at IS NULL v UPDATE politike.** Ak by oprávnený
  operátor mimo tejto etapy archivoval syntetickú úlohu, marker a rola stále
  dovolia jej úpravu. Lokálna privilegovaná fixture tento stav potvrdzuje;
  nejde o živé archivovanie ani povolenie takej operácie.
- Archivovaný workspace zápis blokuje; archivované priradenie/profil neudeľuje
  členovi prístup z priradenia. Existujúci SELECT ostáva bez nového filtra archivácie.

**OPEN DECISION:** či má byť v neskoršom návrhu zakázaná aj úprava archivovanej
syntetickej úlohy. Táto revízia zákaz potichu nepridáva. Kým sa rozhodne inak,
prvý živý scenár nesmie archivovať ani obnovovať úlohu.

## Jedna syntetická úloha

Globálny unique partial index test_tasks_single_probe stále povoľuje iba jeden
nenulový create_request_id v celom projekte, nie jeden na účet/workspace.
INSERT vyžaduje presný syntetický názov. Druhý odlišný request narazí na limit,
rovnaký request sa má vyhodnotiť idempotentne bez ďalšieho riadka. Zmena názvu
pri UPDATE nemení pôvodný create_payload ani request. Žiadny DELETE na uvoľnenie
limitu, žiadny import localStorage, žiadne automatické rozšírenie kvóty.

Kladné testy viacerých rolí používajú vždy jeden syntetický riadok v transakcii
ukončenej ROLLBACK; nezavádzajú ďalšie živé fixtures ani ďalšie povolené zápisy.

## Overenie skutočných účtov A/B

Používateľom určené identity neboli zapísané do dokumentácie ani výstupov.
V tejto etape neboli čítané heslá, tokeny, cookies ani tajné kľúče.

| Účet | Auth → profil → členstvo → workspace | Anonymizovaná rola |
|---|---|---|
| A | BLOCKED – neoverené | NEOVERENÁ |
| B | BLOCKED – neoverené | NEOVERENÁ |

Dôvod: bod 4 žiada read-only overenie, ale posledná hranica zadania výslovne
uvádza „Žiadne SQL na Supabase“. Dostupný Supabase konektor nemá read-only API
na vyhľadanie Auth identity a jej členstiev; ponúka na to len execute_sql.
Zákaz sa neobchádzal. Projektové metadátové API nepotvrdzuje väzbu konkrétneho
účtu na profil, workspace ani rolu. Staré počty viditeľných úloh ani lokálne
fixture roly sa nevydávajú za aktuálny výsledok skutočných identít A/B.

Pripravený [nepustený read-only dotaz](sql/overit-identity-ab.readonly.sql)
vracia iba A/B, počet identít, stav Auth, anonymizovaný workspace, rolu a počet
aktívnych profilov. Vstupy sú parametre, nie uložené adresy účtov. Na lokálnych
syntetických identitách je dotaz otestovaný, čo nie je živý dôkaz A/B.

workspace_members nemá archived_at ani samostatný active flag. Aktívna reťaz
vyžaduje existujúce členstvo, aktívny workspace, práve jeden aktívny profil
v rovnakom workspace a použiteľnú potvrdenú Auth identitu. Viacero výsledkov,
neočakávaný workspace alebo chýbajúci profil znamenajú BLOCKED, nie výber prvého.

Na dokončenie je potrebná povolená read-only Auth/REST administratívna cesta,
anonymizovaný auditný výsledok operátora alebo výslovné objasnenie, že zákaz
SQL sa nevzťahuje na tento SELECT. Netreba posielať heslá ani kľúče do chatu.

## Lokálne kontroly

- **76/76 PostgreSQL kontrol, 0 chýb:** obnovený public baseline, matica na
  syntetickej úlohe, nulové historické UPDATE, úplná nemennosť historického
  snapshotu, metadáta RESTRICTIVE USING/WITH CHECK, R1/R2, verzia, kvóta,
  completed_at, archivácia a bezpečný výstup pripraveného auditného SELECT.
- **153/153 aplikačných testov, 0 chýb, 0 skip:** zahŕňa 149 versionovaných
  testov a 4 existujúce nepublikované testy lokálnej prípravy; tie sa necommitujú.
- Typecheck, bežný build, TEST exportový build a kontrola výstupných HTML,
  HTTP /, /report, /report/, 11 súborov a 3 fontov PASS.
- git diff --check PASS; žiadna zmena runtime aplikácie alebo auto-migrácií.

SQL skúšky: PGlite 0.3.14 / PostgreSQL 17.5, syntetické Auth claims a lokálne
riadky; nie živý Supabase 17.11 alebo skutočný podpis JWT. Pôvodné tri lokálne
prípravné súbory kódu zostávajú nepublikované a nemenia sa týmto commitom.

SHA-256 revidovaného SQL návrhu:
`9f5fde3d4351cd15a08e00d9584efcef94305cb51701f06819525d40b576210e`.

**Ďalšia etapa: BLOCKED**, kým nie sú doložené skutočné väzby A/B a výslovne
schválený revidovaný živý SQL krok. READY sa týka iba lokálnej Z1 opravy.
SQL návrhy zostávajú mimo supabase/migrations. Commit má [CI Skip]; žiadny
deploy ani merge sa nespúšťa.
