# TASK-007 · návrh 2 · syntetická pozitívna úloha B

**PASS: návrh a read-only preflight. BLOCKED: vloženie a odstránenie fixture čakajú na samostatné schválenie.**

Základ: `b9753f33b079ba34afa858d73f707cbd705f1b34`, vetva `codex/pilot-supabase-auth-cloud-crud`. Jediný povolený budúci cieľ: `ai-planner-test`, ref `yqleboakzkowfxsmynfy`. Všetky zapisovacie SQL bloky v tomto dokumente sú **návrhy, NEVYKONANÉ**, nie migrácia.

## Rozsah a aktuálne overený stav

- Workspace B: `00000000-0000-0000-0000-000000004b01`.
- Read-only overené: workspace existuje, má jedno členstvo a jeden aktívny profil mapovaný na člena. Existuje v ňom jedna pôvodná úloha, ktorú návrh nemení.
- Identita B sa preberie z existujúceho potvrdeného testovacieho účtu a členstva; nevytvára sa Auth používateľ, profil, workspace ani členstvo. UUID osoby, e-mail a heslo sa do verejnej dokumentácie a Issue neprenášajú.
- Navrhovaný jediný nový task má ID `7007001`. Read-only kontrola potvrdila, že tento zložený kľúč bol vo workspace B voľný. Pred vložením sa kontrola opakuje; ID sa automaticky neprečísluje ani neprepisuje existujúci riadok.
- Názov: `TASK-007 · syntetická úloha B`. Marker: `{"task007_fixture":"TASK-007-B-7007001-v1"}` v existujúcom stĺpci legacy. Názov ani marker neobsahuje firemné alebo osobné údaje.
- Autorom bude priamo potvrdená Auth identita B cez created_by_user_id. Aktuálne can_read_task povoľuje vlastné autorstvo spolu s členstvom. Zámerne sa nevytvára task_assignees ani iný potomok; rollback potrebuje odstrániť iba tento jeden nový task.
- Názvy, autorstvo, priradenia a obsah siedmich existujúcich taskov sa nemenia. Najmä sa nevykonáva backfill NULL autorov.

Aktuálna tabuľka vyžaduje workspace_id, id a neprázdny title. Priority/checklist/legacy/detaily majú defaulty; autor je UUID FK do auth.users. Na tasks je len riadkový touch_tasks BEFORE UPDATE, ktorý sa pri INSERT nevyvolá. Kontrolované FK potomkov odkazujú na (workspace_id,id), preto sa nepoužíva CASCADE ani mazanie potomkov.

## Preflight pred prípadným vložením

Vykoná až samostatne schválený operátor. Použiť spravované DB pripojenie oprávneného operátora, nie service_role alebo klientské zapisovacie granty. Neprideľovať authenticated INSERT/DELETE kvôli fixture.

```sql
-- Read-only návrh opakovanej predbežnej kontroly.
BEGIN READ ONLY;
SELECT count(*) AS fixture_collision
FROM public.tasks
WHERE workspace_id = '00000000-0000-0000-0000-000000004b01'::uuid AND id = 7007001;
SELECT count(*) AS eligible_B
FROM public.workspace_members m
JOIN auth.users u ON u.id = m.user_id AND u.email_confirmed_at IS NOT NULL
WHERE m.workspace_id = '00000000-0000-0000-0000-000000004b01'::uuid
  AND m.role = 'member'
  AND EXISTS (SELECT 1 FROM public.profiles p
              WHERE p.workspace_id = m.workspace_id AND p.auth_user_id = m.user_id
                AND p.archived_at IS NULL);
ROLLBACK;
```

Vyžadovať collision=0 a eligible_B=1. Operátor súkromne potvrdí, že ide o zamýšľaný testovací účet B, a prevezme jeho existujúce UUID do lokálnej psql premennej `task007_b_user`. UUID je identifikátor, nie heslo; musí pochádzať z overeného členstva, nie z voľného používateľského vstupu. Pri viacerých kandidátoch, nejasnej identite alebo nezhode zastaviť sa. Žiadne čítanie Auth hesiel, hashov, refresh tokenov alebo súborov s tajomstvami.

Zaznamenať pôvodné počty a kľúče v chránenom pracovnom zázname. Dnešný inventár: 7 taskov celkom, 1 vo workspace B; očakávanie po vložení 8 a 2 platí iba ak čerstvý inventár zostane zhodný. Zároveň potvrdiť aktuálne SELECT RLS a to, že B nemá členstvo A. Zápis fixture nie je testom klientského INSERT oprávnenia.

## Presný návrh vloženia — NEVYKONANÉ

Pre budúce skripty použiť psql s `ON_ERROR_STOP=on`, bez hesla v argumentoch a bez detailného logovania; pri chybe operátor vykoná ROLLBACK. Nižšie je psql zápis; `:'task007_b_user'` je bezpečne quotovaný literál už overeného UUID. Príkaz `\gset` zachytí návratový riadok do lokálnych premenných bez kopírovania do chatu, Issue alebo repozitára. INSERT sa cez psql odošle týmto príkazom, preto pred `\gset` nie je bodkočiarka.

```sql
-- NÁVRH, NEVYKONANÉ. Len po osobitnom schválení presnej fixture.
BEGIN;
INSERT INTO public.tasks
  (workspace_id, id, title, status, priority, created_by_user_id, legacy)
SELECT m.workspace_id, 7007001, 'TASK-007 · syntetická úloha B',
       'Backlog', 'Stredna', m.user_id,
       '{"task007_fixture":"TASK-007-B-7007001-v1"}'::jsonb
FROM public.workspace_members m
JOIN auth.users u ON u.id = m.user_id AND u.email_confirmed_at IS NOT NULL
WHERE m.workspace_id = '00000000-0000-0000-0000-000000004b01'::uuid
  AND m.user_id = :'task007_b_user'::uuid AND m.role = 'member'
  AND EXISTS (SELECT 1 FROM public.profiles p
              WHERE p.workspace_id = m.workspace_id AND p.auth_user_id = m.user_id
                AND p.archived_at IS NULL)
RETURNING workspace_id, id, created_by_user_id,
          xmin::text AS inserted_xmin, to_jsonb(tasks) AS inserted_snapshot
\gset task007_
-- Operátor musí potvrdiť presne 1 vložený riadok a presnú zhodu PK/autora/markera.
-- Pri 0 alebo inom výsledku: ROLLBACK, nie COMMIT.
COMMIT;
```

Bez ON CONFLICT, UPDATE, automatického retry či importu. Pri kolízii PK transakciu rollbacknúť a zastaviť sa. Celý vrátený snapshot a xmin sa uchovajú iba na chránenom stroji operátora, aby sa dala skontrolovať nemennosť pred rollbackom. Pre živý REST test musí byť fixture commitnutá; test v necommitnutej operátorskej transakcii by ju cez iné REST pripojenie nevidel.

## Pozitívny a negatívny test — budúci, NEVYKONANÝ

1. Read-only transakcia pod authenticated s claims existujúceho B musí v tasks aj reporting_tasks nájsť presne `(B,7007001)`. Skontrolovať autorstvo B a pôvodné dáta bez prepisu. Ide stále o simulované claims, nie živý login.
2. Pri explicitnom filtri workspace A musí B dostať 0 taskov aj reportingových taskov. Workspace A samotný nemá vidieť.
3. Účet A bez členstva B nesmie vidieť fixture cez presný kľúč ani zoznam bez filtra. Administrátor/analytik A tiež nesmie prekročiť svoj workspace.
4. Následne samostatne vykonať živý Auth → REST plán z návrhu 3. B v jeho kladnom teste musí dostať presne túto oprávnenú fixture; prázdny výsledok je zlyhanie kladného testu.
5. Do Issue zapísať iba pseudonym aktéra, rolu, testovací workspace, očakávaný a skutočný počet. Nezverejniť heslo, token, e-mail, skutočné mená ani obsah iných taskov.

Reporting_task_entity_links a calendar_slots budú pre túto fixture správne prázdne: návrh nevytvára tieto väzby. Nulový výsledok sa nesmie vydávať za pozitívny test neexistujúcich blokov/väzieb.

## Presný rollback — NEVYKONANÝ

Pred COMMIT vloženia: ROLLBACK vráti celý INSERT. Po commite odstrániť iba označenú, nezmenenú fixture; nič z pôvodného datasetu.

Pred rollbackom operátor znovu overí projekt, PK, autora, celý uložený snapshot a xmin a potvrdí nulový počet potomkov. Ak sa fixture zmenila, bola naviazaná inde alebo snapshot chýba, rollback je BLOCKED a vyžaduje nové posúdenie; žiadne rozšírenie WHERE, CASCADE alebo odstraňovanie cudzích riadkov.

```sql
-- NÁVRH ROLLBACKU, NEVYKONANÉ. Samostatne schválené odstránenie jednej fixture.
BEGIN;
DELETE FROM public.tasks t
WHERE t.workspace_id = '00000000-0000-0000-0000-000000004b01'::uuid
  AND t.id = 7007001
  AND t.created_by_user_id = :'task007_b_user'::uuid
  AND t.title = 'TASK-007 · syntetická úloha B'
  AND t.legacy = '{"task007_fixture":"TASK-007-B-7007001-v1"}'::jsonb
  AND t.xmin::text = :'task007_inserted_xmin'
  AND to_jsonb(t) = :'task007_inserted_snapshot'::jsonb
  AND NOT EXISTS (SELECT 1 FROM public.calendar_slots s WHERE s.workspace_id=t.workspace_id AND s.task_id=t.id)
  AND NOT EXISTS (SELECT 1 FROM public.task_entities e WHERE e.workspace_id=t.workspace_id AND e.task_id=t.id)
  AND NOT EXISTS (SELECT 1 FROM public.task_assignees a WHERE a.workspace_id=t.workspace_id AND a.task_id=t.id)
  AND NOT EXISTS (SELECT 1 FROM public.task_clients c WHERE c.workspace_id=t.workspace_id AND c.task_id=t.id)
RETURNING workspace_id, id;
-- Vyžadovať presne 1 odstránený riadok; pri 0 alebo chybe ROLLBACK a zastaviť sa.
COMMIT;
```

Po rollbacku overiť neprítomnosť len fixture a zhodu pôvodných kľúčov/počtov, pričom prípadné súbežné zmeny sa nesmú opravovať automatickým mazaním. Overiť pôvodný task B a všetkých sedem historických taskov. Neodstraňovať Auth účet, profil, členstvo ani workspace; nevytvárali sa. Operátor vymaže chránený lokálny snapshot po uzavretí auditu podľa pravidiel uchovávania.

## OPEN DECISION a samostatné schválenie

- Potvrdiť konkrétnu existujúcu identitu B bez zverejnenia jej prihlasovacích údajov a potvrdiť, že jej bežný operátor môže vykonať živý test.
- Schváliť jednorazový INSERT presne tejto syntetickej úlohy a neskorší úzko ohraničený DELETE ako cleanup; dnešný zákaz zápisov sa týmto návrhom nemení.
- Dohodnúť časové okno, oprávneného DB operátora a chránené uchovanie snapshotu do cleanupu.

Dnes sa nevložil ani nezmazal žiadny riadok. Aplikácia, Auth nastavenia, RLS, granty a existujúce úlohy zostali nezmenené.
