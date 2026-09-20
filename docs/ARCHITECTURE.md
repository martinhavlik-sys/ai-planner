# Architektúra

Stav overený zo zdrojov vydania v6, 19. 9. 2026. Živá infraštruktúra nebola kontrolovaná.

## Beh aplikácie

Next.js App Router s jednou hlavnou cestou `/`. `layout.tsx` nastavuje slovenský jazyk a globálne CSS. `page.tsx` je klientský komponent: vlastní pracovnú plochu, formuláre, filtre, navigáciu a zápisy do localStorage. Navigácia prepína sekcie v tej istej stránke; nejde o samostatné serverové routy. V repozitári nie sú API route handlery, middleware, prihlasovací callback ani serverový databázový adaptér.

Tok údajov: lokálny JSON → `normalizeWorkspace` → React state → úprava úloh/záznamov → normalizácia celého workspace → localStorage. Pri chybe načítania sa zápis nespustí. Pri chybe uloženia zostane pracovný stav v pamäti a UI odporučí export. Zobrazený export nie je cloudová záloha.

## Súbory

| Súbor | Zodpovednosť |
|---|---|
| `app/page.tsx` | Pracovná plocha, lokálne uloženie/import/export, menu, Entity/Projekty/Oddelenia/Klienti, editor a detail úlohy |
| `app/model.ts` | Typy, schémy 1–5, ID a väzby, používatelia, kalendárová matematika, triedenie, resize, farby a názvy projektov |
| `app/calendar.tsx` | Mesiac a rozsahy, os času, prekryvy, presun, náhľad resize a odovzdanie zmeny |
| `app/task-dialog.tsx` | Natívny modal editora, fokus, Escape a zámok posúvania pozadia |
| `app/slot-dialog.tsx` | Natívny dialóg pridania ďalšieho bloku jednej úlohy |
| `app/record-picker.tsx` | Natívny datalist, výber existujúceho záznamu, validácia textu |
| `app/people.tsx`, `app/users.tsx` | Viac osôb, avatary/fotografie, paleta farieb a lokálna evidencia používateľov |
| `app/globals.css` | Globálne aj historické štýly, kalendár, vrstvy, responzívne formuláre/zoznamy |
| `app/repository.ts` | Hlásenie lokálneho režimu, uzamknutý Supabase repository, príprava prenosového balíka |
| `app/supabase-client.ts` | Nepoužitý read-only REST klient pre zoznam workspace s Auth access tokenom |
| `supabase/migrations/202609190001_core.sql` | Základ relačnej schémy a RLS; nie aktivovaná integrácia |
| `tests/*.test.mjs` | Node testy čistých funkcií a voliteľná simulácia React handlerov |
| `package.json`, `pnpm-lock.yaml` | Príkazy a pripnuté verzie závislostí |

## Kalendár a vrstvy

Každý blok má vlastné ID, patrí k jednej úlohe a jeho čas nemení Dátum dokončenia. `calendarSegments` môže zobraziť existujúci blok cez polnoc na dvoch dňoch bez rozdelenia uloženého záznamu. `layoutSlots` rozdeľuje prekryvy do stĺpcov. Časová os má 64 px na hodinu a po navigácii začína na 08:00.

Presun používa existujúce HTML drag/drop a `moveCalendarSlot`. Resize používa pointer capture iba na spodnom úchyte: pohyb aktualizuje dočasný náhľad, pustenie odošle trvanie, zrušenie nič neuloží. Rodič aplikuje `resizeTaskSlot` na najnovší stav podľa ID úlohy a slotu. Ostatné bloky, osoby a dátum dokončenia sa nemenia. Automatické rolovanie pri držaní úchytu pri hrane nie je implementované; aktuálny scroll offset sa pri výpočte zohľadňuje.

Kalendár je samostatný stacking context (`isolation: isolate`). Vnútri používa vrstvy event=1, now-line=2, header=3. Stránkový detail má vrstvu 1 nad kalendárom vo vrstve 0. Natívne `<dialog>.showModal()` editora a slotového dialógu používa browser top layer nad všetkými týmito vrstvami. Zvyšovanie z-index na náhodne vysoké hodnoty nie je potrebné.

## Integrácie a stav

Funkčná perzistencia: localStorage, súborový JSON import/export a obrázok používateľa ako limitovaný Data URL. Externý kalendár, emailové pozvánky, AI API a synchronizácia nie sú zapojené. Jediný pripravený fetch v `supabase-client.ts` číta workspaces, ale nemá volajúceho z UI. Verejné env premenné iba oznamujú prítomnosť konfigurácie, nekontrolujú zdravie spojenia.

SQL členstvo, lokálna osoba a prihlásený účet sú odlišné pojmy. V súčasnosti neexistuje prihlásená identita. Detailné hranice sú v DATA_MODEL a ROADMAP.


## v7 presentation boundary

Theme tokens and selectors live in `app/theme.css`, activated only by the root data-theme attribute. Local font declarations and typed decorative icons are separate. No model, persistence or calendar geometry changes. See `VISUAL_THEME.md`.
