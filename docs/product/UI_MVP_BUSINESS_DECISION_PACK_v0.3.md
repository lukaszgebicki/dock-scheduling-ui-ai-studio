# Business Decision Pack UI MVP

**Platforma:** Dock Appointment Scheduling Platform
**Wersja:** 0.3
**Status:** APPROVED
**Approved by:** Łukasz Gębicki
**Approval date:** 2026-07-31

> Decyzja interpretacyjna: wszystkie wystąpienia „REKOMENDACJA DO ZATWIERDZENIA”
> w źródłowym dokumencie v0.2 są traktowane jako zatwierdzone przez Łukasza Gębickiego.
> Zakres wyłączony wskazany w sekcji 24 pozostaje wyłączony z UI MVP.

> Wersja 0.3 jest bieżącym kanonicznym źródłem decyzji produktowych UI MVP.
> Wersja 0.2 pozostaje niezmienionym dowodem historycznym. W razie kolizji
> dotyczącej weekly planning postanowienia sekcji 29–30 i zaakceptowana decyzja
> `BDR-TRN-001` mają pierwszeństwo przed wcześniejszymi, ogólnymi opisami.

# Historia zmian

Wersja 0.3 — włączenie zatwierdzonego modelu weekly planning i decyzji
`BDR-TRN-001`:

- ograniczono Supplier reservation do jednego Dostawcy, magazynu, tygodnia,
  PO i wybranego slotu dla tygodnia W+1;
- określono piątkowy, administracyjny import szczegółów PO/SKU, dokładne
  dopasowanie, stany planowania i obsługę niedopasowanych dostaw;
- wprowadzono model PO header z wierszami SKU, jawne źródła rezerwacji,
  routing opcjonalnych ról, widoki kalendarza oraz raporty PO/SKU;
- potwierdzono, że oba pola transportowe są zawsze wymagane podczas rezerwacji
  Dostawcy, a macierz walidacyjna dotyczy wyłącznie dalszej gotowości oraz
  dostaw dodanych lub zaimportowanych przez Administratora;
- dodano scenariusze akceptacyjne weekly planning i kontrolowaną kolejność
  implementacji, bez udzielenia zgody na implementację.

Wersja 0.2 — zmiany naniesione po niezależnym przeglądzie architektury i decyzjach Project Leada wobec wersji 0.1:

- HIGH-1: dodano opis awizacji cyklicznych / standing appointments (nowa sekcja 4.5) oraz widok kalendarza wg typu przepływu (BDP-CAL-001); priorytetyzację Dostawców przy ograniczonej pojemności świadomie przeniesiono do zakresu wyłączonego z MVP (sekcja 24).
- HIGH-2: dodano jawne założenie modelu 1:1 Przewoźnik–Dostawca (nowa sekcja 3.7) z zachowaniem możliwości przyszłego rozszerzenia o niezależną rolę Przewoźnika/Brokera.
- HIGH-3: doprecyzowano w 3.3, że uprawnienia dodatkowe Warehouse Operatora są przypisywane per para (użytkownik, magazyn), nie globalnie dla użytkownika.
- HIGH-4: kolor „wybrany” (5.3) zamieniono na zmienną motywu przypisaną do organizacji; w sekcji 2 potwierdzono, że Poziom 1 jest projektowany pod realny model multi-tenant, a Pernod Ricard jest klientem bieżącego wdrożenia.
- MEDIUM-1: dodano przejście CONFIRMED ← CANCELLED (System Administrator, tylko przez dedykowaną operację z podaniem powodu) do macierzy statusów w 9.1.
- MEDIUM-2: w 18.1 zdefiniowano pojęcie „krytycznej reguły magazynu” oraz doprecyzowano podział odpowiedzialności: katalog reguł krytycznych ustala System Administrator (Poziom 1), a ich aktywację per magazyn — Warehouse Administrator (Poziom 2).
- MEDIUM-3: w 20.3 dodano konfigurowalną częstotliwość dostarczania powiadomień niekrytycznych (natychmiast / podsumowanie godzinowe / podsumowanie dzienne).
- MEDIUM-4: w sekcji 6 zdefiniowano logikę Composite Capacity i powiązano ją z opisanym domyślnym modelem MVP.
- LOW-1: ujednolicono tagowanie „REKOMENDACJA DO ZATWIERDZENIA” — dodano je we wszystkich sekcjach z BDP-ID, które wcześniej go nie miały (5, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23).
- LOW-2: do sekcji 24 dodano mechanizm oczekiwania (waitlist) na zwolnienie preferowanego terminu jako pozycję roadmapy na obecnym etapie.
# 1. Wnioski z benchmarku rynku

## 1.1. Potwierdzone wzorce rynkowe

Najbardziej dojrzałe rozwiązania stosują model, w którym administrator definiuje zasady, a Dostawca widzi wyłącznie dozwolone terminy. Transporeon pozwala użytkownikom biznesowym definiować obiekty, zasoby, szablony i reguły bez wsparcia IT. DataDocks ogranicza portal Dostawcy do zatwierdzonych slotów i wymaganych danych. Conduit pozwala definiować lead time, limity, blackout periods i zgodność doków z typem ładunku. [transporeon.com], [datadocks.com], [linkedin.com]

Systemy klasy enterprise oddzielają standardową rezerwację od wyjątków. DataDocks i project44 opisują automatyczne zatwierdzanie na podstawie zdefiniowanych parametrów, natomiast Descartes wspiera priorytety, odrzucanie wniosków i alternatywne terminy. [datadocks.com], [project44.com], [descartes.com]

Wiele produktów udostępnia równoległe widoki operacyjne. project44 posiada Calendar View, Table View, Manual Booking, Operation Templates i Reports. Conduit oferuje widoki Day, Week, Dock, Load Type, List i Workflow. Opendock obsługuje wyszukiwanie, statusy, reschedule, cykliczne rezerwacje, audit log i możliwość wielu awizacji w jednym slocie. [support.p-44.com], [help.getconduit.ai], [opendock.zendesk.com]

Dynamiczna długość operacji jest konsekwentnym wzorcem rynkowym. Transporeon oblicza czas na podstawie danych transportu i dostępnych zasobów, C3 stosuje reguły długości, a Descartes uwzględnia między innymi typ produktu, liczbę doków, godziny pracy i zasoby. [transporeon.com], [info.c3solutions.com], [routinguk....cartes.com]

Zmiana i anulowanie przez Dostawcę są standardowymi funkcjami portalowymi, ale ich dostępność może zależeć od reguł obiektu. Są wyraźnie opisane między innymi przez Opendock, FourKites i Conduit. [opendock.com], [fourkites....y.site.com], [helloconduit.com]

## 1.2. Główna rekomendacja

UI MVP powinien pokazać konfigurowalny system zasad, ale nie dowolny no-code builder.

Administrator powinien móc konfigurować:

- role i zakresy;
- widoczność danych;
- dostępne akcje;
- formularze awizacji;
- wymagane pola;
- kalendarze;
- pojemność;
- przypisanie doków;
- zatwierdzanie;
- cut-off zmiany i anulowania;
- powiadomienia;
- dopuszczalne typy dostaw.
Nie powinien w UI MVP tworzyć:

- nowych funkcji aplikacji;
- nowych statusów;
- dowolnych skryptów;
- własnych warunków programistycznych;
- nowych typów encji;
- niestandardowych workflow bez ograniczeń.
Takie podejście odpowiada rozwiązaniom, w których użytkownik biznesowy definiuje parametry i reguły, ale działa w ramach kontrolowanego modelu procesowego. [transporeon.com], [datadocks.com], [project44.com]

# 2. Model elastyczności UI MVP

## BDP-CFG-001: Trzy poziomy konfiguracji

**APPROVED — Łukasz Gębicki, 2026-07-28**

### Poziom 1: Globalny

Zarządzany przez System Administrator:

- organizacje;
- globalne role;
- globalne uprawnienia;
- słowniki;
- typy pojazdów;
- typy dokumentów;
- typy nośników;
- domyślne statusy;
- konfiguracja globalna;
- katalog reguł krytycznych zatwierdzania (patrz 18.1).
Poziom 1 jest projektowany pod realny model multi-tenant — System Administrator może obsługiwać wiele niezależnych organizacji/klientów. Na obecnym etapie wdrożenia jedynym klientem jest Pernod Ricard, a wartości domyślne motywu (np. kolor akcentu, 5.3) odzwierciedlają jego markę, pozostając konfigurowalne per organizacja.

### Poziom 2: Magazynowy

Zarządzany przez Warehouse Administrator:

- dostępne przepływy;
- pola formularza;
- zasoby;
- doki;
- kalendarze;
- pojemność;
- zatwierdzanie;
- cut-off;
- przypisani Dostawcy;
- operatorzy;
- reguły powiadomień.
### Poziom 3: Wyjątek

Zarządzany przez uprawnionego Administratora:

- blokada terminu;
- zmiana pojemności dla konkretnego dnia;
- override limitu;
- ręczne zatwierdzenie;
- ręczna zmiana slotu;
- przyjęcie niezapowiedzianej wizyty.
Każdy wyjątek wymaga powodu i pozostawia wpis w historii.

# 3. Role i uprawnienia

## BDP-RBAC-001: Docelowe role UI MVP

**APPROVED — Łukasz Gębicki, 2026-07-28**

- System Administrator
- Warehouse Administrator
- Warehouse Operator
- Security Officer
- Supplier Administrator
- Supplier User
Rozdzielenie Supplier Administrator i Supplier User pozwala bezpiecznie delegować zarządzanie użytkownikami firmy. Nie należy przekazywać takiego prawa każdemu użytkownikowi Dostawcy.

## 3.1. System Administrator

### Zakres

- widzi wszystkie organizacje, magazyny i firmy zewnętrzne;
- tworzy i edytuje organizacje;
- tworzy magazyny;
- tworzy firmy Dostawców;
- zaprasza użytkowników;
- przypisuje użytkowników do organizacji i magazynów;
- zarządza globalnymi rolami;
- ma dostęp do pełnego audytu;
- może wykonywać działania operacyjne
### Awizacje

Może:

- przeglądać wszystkie;
- tworzyć;
- edytować;
- anulować;
- wykonywać override;
- przywracać szkice.
- Może ładować plan awizacji za pomocą pliku .CSV w ustalonym układnie kolumn
Nie może fizycznie usuwać potwierdzonej, anulowanej ani zakończonej awizacji.

## 3.2. Warehouse Administrator

### Zakres

- widzi przypisane magazyny;
- widzi Dostawców przypisanych do tych magazynów;
- konfiguruje magazyny, doki i kalendarze;
- przypisuje operatorów;
- przypisuje Dostawców;
- zarządza regułami zatwierdzania;
- blokuje terminy;
- zmienia pojemność;
- zatwierdza override;
- przegląda raporty i audit przypisanych magazynów.
### Awizacje

Może:

- tworzyć w imieniu Dostawcy;
- zatwierdzać;
- odrzucać;
- proponować inny termin;
- zmieniać slot;
- anulować;
- zmieniać status;
- zmieniać dok;
- wykonywać override;
- oznaczać No Show.
## 3.3. Warehouse Operator

### Zakres

- widzi wyłącznie przypisane magazyny;
- widzi dane Dostawców posiadających awizacje w tych magazynach;
- nie zarządza organizacjami ani użytkownikami;
- nie zmienia stałej konfiguracji magazynu.
### Awizacje

Domyślnie może:

- przeglądać;
- tworzyć w imieniu Dostawcy;
- edytować dane operacyjne;
- przypisywać i zmieniać dok;
- zmieniać status realizacji;
- dodawać komentarze wewnętrzne;
- oznaczać No Show.
### Uprawnienia dodatkowe

Konfigurowalne osobno:

- zatwierdzanie;
- odrzucanie;
- zmiana slotu;
- anulowanie;
- blokowanie terminów;
- zmiana pojemności.
Uprawnienia dodatkowe są przypisywane per para (użytkownik, magazyn), nie globalnie dla użytkownika — ten sam Warehouse Operator może mieć różny zestaw uprawnień dodatkowych w różnych przypisanych magazynach.

## 3.4. Security Officer

### Zakres

- dzisiejsze i najbliższe wizyty przypisanego magazynu (na pełen tydzień roboczy – pon – pt);
- ograniczony zestaw danych;
- brak dostępu do raportów i konfiguracji.
### Akcje

- wyszukiwanie po numerze awizacji;
- wyszukiwanie po rejestracji;
- weryfikacja kierowcy;
- Check-in;
- Check-out;
- korekta numeru rejestracyjnego;
- dodanie uwagi bramowej;
- utworzenie wizyty niezapowiedzianej.
## 3.5. Supplier Administrator

### Zakres

- widzi dane wyłącznie własnej organizacji;
- widzi wszystkie awizacje organizacji;
- zaprasza i dezaktywuje użytkowników własnej organizacji;
- nie zmienia globalnych ról;
- nie przypisuje swojej firmy do nowych magazynów.
### Awizacje

- tworzy;
- edytuje dozwolone pola;
- zmienia termin;
- anuluje;
- dodaje dokumenty i komentarze zewnętrzne;
- przegląda historię dostępną dla Dostawcy.
## 3.6. Supplier User

### Zakres

Konfigurowalny wariant widoczności:

- Own Appointments;
- Organization Appointments;
- Organization Appointments for Assigned Warehouses.
### Domyślna decyzja

Supplier User widzi wszystkie awizacje własnej organizacji dla przypisanych mu magazynów.

Nie może:

- przeglądać danych innych organizacji;
- zarządzać użytkownikami;
- wykonywać override;
- zmieniać statusów operacyjnych;
- przypisywać doków.
## 3.7. Relacja Dostawca–Przewoźnik

**APPROVED — Łukasz Gębicki, 2026-07-28**

Na obecnym etapie obowiązuje model 1:1 — jedna firma transportowa (Przewoźnik) obsługuje jednego Dostawcę. Przewoźnik nie jest osobną rolą z własnym logowaniem; dane przewoźnika (nazwa, kierowca, numer rejestracyjny) są polami awizacji (4.1), widocznymi i edytowalnymi przez Supplier Administrator / Supplier User danego Dostawcy.

Model ról w sekcji 3 jest zaprojektowany tak, aby nie blokować przyszłego rozszerzenia o niezależną rolę Przewoźnika/Brokera obsługującego wielu Dostawców (np. w modelu 3PL) — patrz sekcja 24.

# 4. Proces tworzenia awizacji

## BDP-BOOK-001: Formularz wieloetapowy

**APPROVED — Łukasz Gębicki, 2026-07-28**

Ten ogólny pięciokrokowy przepływ obowiązuje wyłącznie poza Supplier weekly
planning, jeżeli zostanie osobno zakontraktowany. Dla Supplier weekly planning
jest jawnie zastąpiony i kwalifikowany przez `BDP-WPL-001` oraz `BDP-BOOK-002`:
rezerwację terminu dla jednego PO bez wprowadzania szczegółów SKU. Nie wolno
łączyć obu formularzy ani przywracać pięciu kroków do weekly planning bez nowej
zaakceptowanej decyzji.

Proces powinien składać się z pięciu kroków:

- Magazyn i typ dostawy.
- Dane dostawy.
- Dostępne terminy.
- Transport, dokumenty i komentarze.
- Podsumowanie i potwierdzenie.
Najpierw należy zebrać dane wpływające na długość i kompatybilność, a następnie pokazać terminy. Odpowiada to rozwiązaniom, które wyliczają slot na podstawie danych transportu i ograniczeń zasobu. [transporeon.com], [routinguk....cartes.com], [shiptify.com]

## 4.1. Pola wspólne

### Obowiązkowe podczas tworzenia

- warehouseId;
- flowType;
- supplierOrganizationId;
- referenceNumber;
- co najmniej jedna miara wolumenu zgodnie z przepływem;
- vehicleType, jeżeli wpływa na kompatybilność;
- wybrany slot;
- osoba kontaktowa;
- wymagane zgody.
### Konfigurowalne

- purchaseOrderNumber;
- asnNumber;
- palletCount;
- unitCount;
- grossWeight;
- volume;
- requiredDockType;
- comment;
- dokumenty;
- przewoźnik;
- kierowca;
- numer rejestracyjny.
### Uzupełniane później

Poniższa lista nie dotyczy dwóch pól transportowych w Supplier weekly planning.
W tym przepływie `tractorRegistration` i
`trailerOrContainerRegistration` są wymagane przed ukończeniem rezerwacji.

- kierowca;
- numer telefonu kierowcy;
- numer rejestracyjny;
- numer naczepy;
- wybrane dokumenty.
## 4.2. Wiele zamówień

**APPROVED — Łukasz Gębicki, 2026-07-28**

Ta ogólna możliwość nie dotyczy początkowego zakresu Supplier weekly planning,
gdzie jedna rezerwacja obejmuje dokładnie jedno PO. Rozszerzenie o wiele PO lub
podział dostawy wymaga osobnej zaakceptowanej decyzji i kontraktu.

UI MVP powinien umożliwiać dodanie wielu numerów:

- PO;
- ASN;
- transferów;
- dokumentów dostawy.
Jeden numer pozostaje głównym, pozostałe są powiązane. C3 dokumentuje tworzenie jednej rezerwacji na podstawie jednego albo kilku PO, a FourKites opisuje obsługę wielu numerów zamówień w jednym transporcie. [dm.apac.cms.aldi.cx], [itsubwaymap.com]

## 4.3. Wersja robocza

Dostawca może zapisać Draft bez wybranego slotu.

Draft:

- nie rezerwuje pojemności;
- nie jest widoczny w kalendarzu operacyjnym;
- może być kontynuowany później;
- może zostać usunięty przez autora zgodnie z retencją szkiców.
## 4.4. Czas trwania

Domyślnie czas jest wyliczany automatycznie na podstawie:

- przepływu;
- typu pojazdu;
- liczby palet;
- liczby jednostek;
- wagi lub objętości;
- wymagań specjalnych;
- dodatkowej kontroli.
Dostawca nie wybiera czasu ręcznie.

Warehouse Administrator może dokonać override ze wskazaniem powodu. Dynamiczny czas obsługi występuje między innymi w Transporeon, C3, Descartes i Shiptify. [transporeon.com], [info.c3solutions.com], [routinguk....cartes.com], [shiptify.com]

## 4.5. Awizacje cykliczne (standing appointments)

**APPROVED — Łukasz Gębicki, 2026-07-28**

Warehouse Administrator lub Supplier Administrator może oznaczyć wybranego Dostawcę jako uprawnionego do tworzenia awizacji cyklicznych.

Przy tworzeniu serii Dostawca definiuje:

- dzień tygodnia i godzinę;
- częstotliwość (co tydzień, co dwa tygodnie);
- datę początkową;
- datę końcową albo liczbę wystąpień.
Zasady serii:

- każde wystąpienie przechodzi niezależnie przez standardowe reguły pojemności i zatwierdzania (sekcje 6 i 10);
- pojedyncze wystąpienie można edytować, przełożyć albo anulować bez przerywania całej serii;
- Warehouse Administrator lub Supplier Administrator może wstrzymać albo zakończyć serię;
- niepotwierdzone wystąpienie wygasa zgodnie z regułą holda (sekcja 22) i zwalnia slot dla innych.
# 5. Kalendarz slotów

## BDP-CAL-001: Widoki

**APPROVED — Łukasz Gębicki, 2026-07-28**

UI MVP powinien zawierać:

- widok dzienny według doków;
- widok dzienny według stref;
- widok tygodniowy;
- widok listy;
- widok workflow;
- widok według typu przepływu/dostawy.
Różne widoki odpowiadają różnym zadaniom operacyjnym i występują między innymi w Conduit i project44. [help.getconduit.ai], [support.p-44.com]

## 5.1. Supplier Calendar

Dostawca widzi:

- dostępne dni;
- dostępne godziny;
- długość wizyty;
- strefę czasową;
- najbliższy termin;
- trzy rekomendowane terminy.
Dostawca nie widzi:

- nazw innych Dostawców;
- szczegółów zajętych wizyt;
- wewnętrznych poziomów pojemności;
- przyczyn blokad innych niż bezpieczna informacja operacyjna.
## 5.2. Prezentacja niedostępności

### Supplier User

- pełne sloty nie są pokazywane jako wybieralne;
- zablokowane sloty mogą być wyszarzone w pełnym kalendarzu;
- system pokazuje ogólną przyczynę;
- system pokazuje najbliższą alternatywę.
### Internal User

Widzi:

- wolne;
- częściowo zajęte;
- pełne;
- zablokowane;
- poza godzinami pracy;
- niekompatybilne;
- przekroczone przez override.
## 5.3. Kolory

- wolny: neutralny z aktywną akcją;
- wybrany: kolor akcentu organizacji (theme.accentColor), domyślnie korporacyjny pomarańczowy Pernod Ricard dla bieżącego wdrożenia;
- częściowo zajęty: jasnoniebieski plus liczba wolnych miejsc;
- pełny: szary;
- zablokowany: wzór ukośny i ikona blokady;
- konflikt: czerwony;
- override: pomarańczowy znacznik ostrzeżenia.
Kolor musi być uzupełniony tekstem i ikoną.

# 6. Pojemność slotu

## BDP-CAP-001: Hybrydowy model pojemności

**APPROVED — Łukasz Gębicki, 2026-07-28**

Administrator może wybrać model na poziomie zasobu:

- Concurrent Vehicles;
- Reserved Minutes;
- Pallet Capacity;
- Weight Capacity;
- Volume Capacity;
- Composite Capacity.
Composite Capacity łączy dowolną kombinację powyższych limitów jednocześnie w ramach jednego zasobu. Slot uznaje się za pełny, gdy pierwszy z aktywnych limitów zostanie osiągnięty — decyduje najbardziej restrykcyjne ograniczenie. Domyślny model MVP opisany poniżej jest praktycznym przykładem Composite Capacity: łączy główny limit (liczba równoczesnych pojazdów) z warstwą opcjonalnych limitów dodatkowych (palety, rodzaj nośnika, waga albo objętość).

### Domyślny model MVP

- główny limit: liczba równoczesnych pojazdów;
- ograniczenie czasowe: pełny okres wizyty;
- dodatkowe limity: palety, rodzaj nośnika, waga albo objętość, jeżeli aktywowane.
Rynek potwierdza stosowanie limitów godzinowych, typów ładunku, doków, zasobów, czasu i specjalnych ograniczeń. [datadocks.com], [transporeon.com], [shiptify.com], [routinguk....cartes.com]

## 6.1. Rezerwacja części slotu

Awizacja rezerwuje dokładny okres odpowiadający wyliczonemu czasowi.

Przykład:

- kalendarz używa siatki 15-minutowej;
- czas operacji wynosi 45 minut;
- awizacja blokuje trzy jednostki czasu;
- nie ma obowiązku zajmowania pełnej godziny.
## 6.2. Override limitu

Override może wykonać:

- System Administrator;
- Warehouse Administrator;
- Warehouse Operator z indywidualnym uprawnieniem.
Override wymaga:

- powodu;
- komentarza;
- pokazania skutku;
- wpisu w historii;
- wizualnej flagi;
- ostrzeżenia o przeciążeniu.
# 7. Blokady

## BDP-BLOCK-001: Zakres blokady

**APPROVED — Łukasz Gębicki, 2026-07-28**

Blokada może dotyczyć:

- całego magazynu;
- strefy;
- doku;
- puli pojemności;
- konkretnego okresu;
- całego dnia;
- cyklicznej przerwy.
## 7.1. Typy blokady

- Public Holiday;
- Maintenance;
- Shift Break;
- Safety Inspection;
- Capacity Reduction;
- Manual Block;
- Additional Opening;
- Other.
## 7.2. Uprawnienia

Blokadę może utworzyć:

- System Administrator;
- Warehouse Administrator;
## 7.3. Reguły

- powód jest obowiązkowy;
- blokada może być jednorazowa albo cykliczna;
- system pokazuje istniejące awizacje objęte zmianą;
- system nie anuluje ich automatycznie;
- nowe rezerwacje są blokowane;
- istniejące awizacje trafiają do kolejki Calendar Conflict.
Obsługa świąt, zmian jednodniowych, blackout periods i maintenance jest potwierdzonym wzorcem w project44, Conduit, Shiptify i Descartes. [project44.com], [linkedin.com], [shiptify.com], [routinguk....cartes.com]

# 8. Statusy awizacji

## BDP-STAT-001: Trzy kategorie statusów

**APPROVED — Łukasz Gębicki, 2026-07-28**

Zamiast jednej długiej listy system powinien przechowywać trzy kategorie.

## 8.1. Planning Status

- DRAFT;
- SUBMITTED;
- PENDING_APPROVAL;
- CONFIRMED;
- REJECTED;
- CANCELLED.
## 8.2. Change Status

- NO_CHANGE_REQUEST;
- RESCHEDULE_REQUESTED;
- SLOT_PROPOSED;
- SUPPLIER_ACTION_REQUIRED.
## 8.3. Operational Status

- EXPECTED;
- CHECKED_IN;
- WAITING_FOR_DOCK;
- AT_DOCK;
- UNLOADING;
- COMPLETED;
- CHECKED_OUT;
- NO_SHOW.
UI pokazuje jeden główny status użytkownika i niezależne flagi.

# 9. Macierz przejść statusów

**APPROVED — Łukasz Gębicki, 2026-07-28**

## 9.1. Planning Status

| Status docelowy | Status źródłowy | Aktor | Komentarz |
| --- | --- | --- | --- |
| SUBMITTED | DRAFT | Supplier, internal user | Nie |
| PENDING_APPROVAL | SUBMITTED | System | Automatycznie |
| CONFIRMED | SUBMITTED | System | Przy auto-approval |
| CONFIRMED | PENDING_APPROVAL | Warehouse Administrator | Opcjonalnie |
| REJECTED | PENDING_APPROVAL | Warehouse Administrator | Zawsze |
| CANCELLED | SUBMITTED, PENDING_APPROVAL, CONFIRMED | Uprawniony użytkownik | Zawsze |
| CONFIRMED | CANCELLED | System Administrator | Tylko przez dedykowaną operację z podaniem powodu |

## 9.2. Operational Status

| Status docelowy | Status źródłowy | Aktor |
| --- | --- | --- |
| EXPECTED | CONFIRMED | System |
| CHECKED_IN | EXPECTED | Security Officer |
| WAITING_FOR_DOCK | CHECKED_IN | Operator lub system |
| AT_DOCK | CHECKED_IN, WAITING_FOR_DOCK | Warehouse Operator |
| UNLOADING | AT_DOCK | Warehouse Operator |
| COMPLETED | UNLOADING | Warehouse Operator |
| CHECKED_OUT | COMPLETED | Security Officer |
| NO_SHOW | EXPECTED | Warehouse Operator lub Warehouse Administrator |

## 9.3. Cofanie statusu

Standardowy użytkownik nie cofa statusu.

Korekta wymaga:

- Administrator
- Warehouse Administrator;
- opcji Correct status;
- powodu;
- nowego wpisu w historii;
- zachowania pierwotnego zdarzenia.
## 9.4. Wpływ na pojemność

- DRAFT: brak rezerwacji;
- SUBMITTED: hold lub rezerwacja oczekująca;
- PENDING_APPROVAL: pojemność zarezerwowana do czasu decyzji;
- CONFIRMED: pojemność zarezerwowana;
- REJECTED: pojemność zwolniona;
- CANCELLED: pojemność zwolniona;
- NO_SHOW: pojemność zwalniana po potwierdzeniu;
- COMPLETED: historyczne wykorzystanie pozostaje w raportach.
# 10. Zatwierdzanie awizacji

## BDP-APR-001: Rule-based approval

**APPROVED — Łukasz Gębicki, 2026-07-28**

Każda konfiguracja może działać w jednym z trybów:

- Auto Approve;
- Manual Approve;
- Rule Based.
## 10.1. Warunki manual approval

Administrator może aktywować reguły:

- wybrany typ dostawy;
- konkretny Dostawca;
- nowy lub zablokowany Dostawca;
- ADR;
- temperatura kontrolowana;
- brak dokumentu;
- rezerwacja po cut-off;
- wolumen powyżej limitu;
- specjalny pojazd;
- brak numeru zamówienia;
- override pojemności;
- niezapowiedziana wizyta.
## 10.2. Decyzje

Warehouse Administrator może:

- zatwierdzić;
- odrzucić;
- poprosić o dane;
- zaproponować inny termin.
Odrzucenie wymaga powodu.

## 10.3. Brak reakcji

**APPROVED — Łukasz Gębicki, 2026-07-28**

Administrator konfiguruje:

- termin decyzji;
- przypomnienie;
- automatyczne wygaśnięcie;
- eskalację.
Domyślnie brak reakcji nie oznacza automatycznego zatwierdzenia.

## 10.4. Ponowne wysłanie

Odrzucona awizacja nie wraca bezpośrednio do aktywnego procesu.

Dostawca może:

- utworzyć kopię;
- poprawić wskazane dane;
- wysłać jako nową wersję procesu;
- zachować powiązanie z pierwotną awizacją.
# 11. Edycja i zmiana terminu

## BDP-EDIT-001: Macierz edycji pól

**APPROVED — Łukasz Gębicki, 2026-07-28**

### Przed potwierdzeniem

Supplier User może zmieniać wszystkie dane poza:

- organizacją właścicielską;
- numerem systemowym;
- historią.
### Po potwierdzeniu, bez ponownej walidacji slotu

Można zmienić:

- kierowcę;
- telefon;
- numer rejestracyjny;
- numer naczepy;
- kontakt;
- komentarz;
- dokumenty, jeśli nie wpływają na klasyfikację.
### Po potwierdzeniu, z ponowną walidacją

Zmiana wymaga sprawdzenia slotu:

- liczba palet;
- waga;
- objętość;
- typ pojazdu;
- ADR;
- temperatura;
- typ dostawy;
- wymagany dok.
Jeżeli zmiana wpływa na czas lub kompatybilność, system:

- ponownie oblicza wymagania;
- sprawdza aktualny slot;
- zachowuje slot, jeśli nadal zgodny;
- wymaga reschedule, jeśli niezgodny.
### Po CHECKED_IN

Dostawca nie może edytować danych bezpośrednio.

## 11.1. Reschedule przed cut-off

- Dostawca sam wybiera dostępny termin;
- nowy slot jest sprawdzany;
- stary slot zostaje zwolniony dopiero po potwierdzeniu nowego;
- wymagany jest powód;
- powiadomienia są wysyłane;
- historia zachowuje oba terminy.
## 11.2. Reschedule po cut-off

Dostawca wybiera Request Reschedule.

Warehouse Administrator może:

- zaakceptować;
- odrzucić;
- zaproponować inny termin.
## 11.3. Wersjonowanie

Każda istotna zmiana zapisuje:

- pole;
- poprzednią wartość;
- nową wartość;
- użytkownika;
- czas;
- źródło;
- powód.
Nie jest wymagane tworzenie nowego numeru awizacji przy zwykłym reschedule.

# 12. Anulowanie

## BDP-CAN-001: Zasady anulowania

**APPROVED — Łukasz Gębicki, 2026-07-28**

### Kto może anulować

- Supplier User zgodnie z widocznością awizacji;
- Supplier Administrator;
- Warehouse Administrator;
- System Administrator.
### Przed cut-off

Anulowanie jest natychmiastowe.

### Po cut-off

Wariant konfigurowalny:

- natychmiastowe anulowanie z flagą Late Cancellation;
### Powód

Obowiązkowy, wybierany ze słownika:

- transport cancelled;
- order cancelled;
- vehicle unavailable;
- driver unavailable;
- delivery not ready;
- incorrect booking;
- duplicated booking;
- requested by warehouse;
- other.
Dla Other komentarz jest obowiązkowy.

### Skutki

- slot zostaje zwolniony;
- awizacja pozostaje widoczna;
- nie może zostać fizycznie usunięta;
- uczestnicy otrzymują powiadomienie;
- przywrócenie wymaga utworzenia nowej awizacji albo specjalnej operacji administratorskiej.
# 13. Obsługa przyjazdu

## BDP-OPS-001: Check-in przez Security Officer

**APPROVED — Łukasz Gębicki, 2026-07-28**

UI MVP powinien pokazać operacyjny proces bramowy.

### Wyszukiwanie

- numer awizacji;
- numer rejestracyjny;
- numer naczepy;
- numer zamówienia;
- Dostawca;
- przewoźnik.
### Dane wymagane

- numer rejestracyjny;
- numer naczepy;
- numer zamówienia
- kierowca albo jego identyfikacja tekstowa;
- awizacja lub proces wizyty niezapowiedzianej.
## 13.1. Self check-in kierowcy

Poza UI MVP.

Może zostać pokazany jako przyszła funkcja. Self check-in, kioski i mobilne procesy występują w rozwiązaniach takich jak Opendock i DataDocks, ale nie są wymagane do pokazania podstawowego workflow. [opendock.com], [datadocks.com]

## 13.2. Wcześniejszy przyjazd

System klasyfikuje:

- Early;
- On Time;
- Late.
Dla wcześniejszego przyjazdu:

- Ochrona wykonuje check-in, jeśli dozwolony;
- pojazd trafia do oczekiwania;
- wcześniejsza obsługa wymaga decyzji Operatora.
## 13.3. Spóźnienie

- awizacja otrzymuje flagę Late Arrival;
- pozostaje aktywna do progu No Show;
- operator może zachować termin, przełożyć albo oznaczyć No Show.
## 13.4. No Show

Domyślnie status nie powinien być nadawany całkowicie automatycznie.

System:

- oznacza potencjalny No Show;
- pokazuje alert;
- Warehouse Operator potwierdza;
- slot zostaje zwolniony;
- zdarzenie trafia do raportu.
## 13.5. Dok

Dok przypisuje Warehouse Operator lub system zgodnie z konfiguracją.

Dok może zostać zmieniony do momentu zakończenia operacji. Zmiana musi być audytowana.

# 14. Lista awizacji

## BDP-LIST-001: Domyślne kolumny

**APPROVED — Łukasz Gębicki, 2026-07-28**

### Dla użytkownika wewnętrznego

- numer awizacji;
- planowana data i godzina;
- magazyn;
- dok;
- Dostawca;
- status;
- typ dostawy;
- typ nośnika;
- liczba palet;
- numer referencyjny;
- numer zamówienia;
- numer rejestracyjny pojazdu;
- numer naczepy;
- kompletność danych;
- wymagane działanie;
- ostatnia zmiana.
Kolumny dodatkowe można włączyć przez Column Selector.

### Dla Dostawcy

- numer awizacji;
- data i godzina;
- magazyn;
- typ dostawy;
- numer referencyjny;
- status;
- wymagane działanie;
- ostatnia zmiana.
## 14.1. Filtry

- status;
- data od i do;
- magazyn;
- Dostawca;
- typ dostawy;
- rodzaj nośnika
- opóźnione;
- wymagające działania;
- utworzone przeze mnie;
- anulowane;
- zakończone;
- braki danych;
- źródło utworzenia.
## 14.2. Wyszukiwanie

Wyszukiwanie globalne obejmuje:

- numer awizacji;
- reference number;
- PO;
- ASN;
- Dostawcę;
- przewoźnika;
- rejestrację;
- numer naczepy;
- nazwisko kierowcy.
## 14.3. Widoki zapisane

W UI MVP należy pokazać demonstrację:

- zapisania filtrów;
- nazwania widoku;
- ustawienia widoku domyślnego.
# 15. Szczegóły awizacji

## BDP-DET-001: Hierarchia treści

**APPROVED — Łukasz Gębicki, 2026-07-28**

### Najważniejsze informacje

- status;
- następna wymagana akcja;
- numer awizacji;
- data, godzina i strefa czasowa;
- magazyn;
- dok;
- alerty i braki.
### Sekcje

- Overview;
- Delivery Data;
- Transport;
- Orders and References;
- Quantities;
- Documents;
- Comments;
- Status History;
- Change History;
- Audit Metadata.
## 15.1. Edycja inline

Dozwolona dla prostych danych niewpływających na slot:

- kontakt;
- kierowca;
- telefon;
- rejestracja;
- numer naczepy;
- komentarz.
Dane wpływające na slot powinny być edytowane przez kontrolowany formularz z ponowną walidacją.

## 15.2. Historia dla Dostawcy

Dostawca widzi:

- zmianę statusu;
- zmianę terminu;
- komentarze zewnętrzne;
- żądanie uzupełnienia;
- zatwierdzenie;
- odrzucenie;
- anulowanie.
Nie widzi:

- notatek wewnętrznych;
- technicznych wpisów audytu;
- działań Security bez znaczenia zewnętrznego;
- danych innych organizacji.
## 15.3. Komentarze

Dwa typy:

- Shared Comment;
- Internal Note.
Operator musi świadomie wybrać widoczność.

# 16. Dashboard

## BDP-DASH-001: Dashboard w UI MVP

**APPROVED — Łukasz Gębicki, 2026-07-28**

Dashboard powinien wejść do UI MVP, ponieważ pokazuje operacyjną wartość produktu.

## 16.1. Warehouse Operator

Wskaźniki bieżące:

- dzisiejsze awizacje;
- oczekiwane w najbliższej godzinie;
- awizacje w danym tygodniu;
- pojazdy na terenie;
- przy doku;
- opóźnione;
- wymagające działania;
- potencjalne No Show.
## 16.2. Warehouse Administrator

Dodatkowo:

- oczekujące na zatwierdzenie;
- wykorzystanie slotów;
- wykorzystanie doków;
- anulowania;
- manual overrides;
- średni czas obsługi;
- średni czas oczekiwania.
## 16.3. Dostawca

Prosty dashboard:

- najbliższa awizacja;
- wymagane działania;
- oczekujące na zatwierdzenie;
- nadchodzące wizyty;
- historia.
## 16.4. Interakcje

Każdy element KPI prowadzi do listy z aktywnym filtrem.

# 17. Zarządzanie magazynami

## BDP-WH-001: Konfiguracja wpływa na demonstracyjny kalendarz

**APPROVED — Łukasz Gębicki, 2026-07-28**

UI MVP nie powinien być zbiorem niezależnych makiet.

Zmiana demonstracyjnej konfiguracji powinna wpływać na:

- godziny widoczne w kalendarzu;
- aktywne doki;
- dostępne sloty;
- pojemność;
- formularz;
- reguły zatwierdzania;
- cut-off;
- widoczność Dostawcy.
## 17.1. Dane magazynu

- nazwa;
- kod;
- status;
- adres;
- kraj;
- strefa czasowa;
- kontakt;
- dni robocze;
- godziny;
- instrukcja;
- tolerancja wcześniejszego przyjazdu;
- tolerancja spóźnienia;
- próg No Show.
## 17.2. Zasoby

- strefy;
- doki;
- pule pojemności;
- capabilities;
- przepływy;
- typy pojazdów;
- ADR;
- temperatura;
- kontenery.
## 17.3. Dostęp

- operatorzy;
- administratorzy;
- Ochrona;
- przypisane firmy;
- dozwolone rodzaje dostaw.
# 18. Zarządzanie Dostawcami

## BDP-SUP-001: Profil firmy zewnętrznej

**APPROVED — Łukasz Gębicki, 2026-07-28**

### Pola

- nazwa prawna;
- nazwa wyświetlana;
- kod;
- identyfikator podatkowy;
- kraj;
- adres;
- kontakt;
- status;
- role firmy;
- przypisane magazyny;
- użytkownicy;
- dozwolone przepływy;
- approval mode;
- ograniczenia;
- status blokady.
## 18.1. Approval mode Dostawcy

- inherit warehouse rule;
- auto approve;
- manual approve.
Reguła Dostawcy nie może być mniej restrykcyjna niż krytyczna reguła magazynu bez jawnego override.

Krytyczna reguła magazynu to warunek z listy 10.1 (np. ADR, temperatura kontrolowana, nowy lub zablokowany Dostawca, brak dokumentu), oznaczony jako niepodlegający złagodzeniu przez konfigurację Dostawcy. Katalog warunków, które mogą zostać oznaczone jako krytyczne, ustala globalnie System Administrator (Poziom 1, patrz sekcja 2); Warehouse Administrator decyduje, które z globalnie dopuszczonych warunków są aktywne i krytyczne w jego magazynie (Poziom 2).

## 18.2. Blokada firmy

Zablokowana firma:

- może widzieć historyczne dane;
- nie może tworzyć nowej awizacji;
- nie może dokonać reschedule bez decyzji Administratora;
- otrzymuje zrozumiały komunikat.
# 19. Zarządzanie użytkownikami

## BDP-USR-001: Zakres UI MVP

**APPROVED — Łukasz Gębicki, 2026-07-28**

### Pola

- imię;
- nazwisko;
- e-mail;
- telefon;
- rola;
- organizacja;
- magazyny;
- status;
- język;
- stan zaproszenia;
- ostatnie logowanie.
### Akcje

- zaproś;
- wyślij ponownie;
- aktywuj;
- dezaktywuj;
- odblokuj;
- zmień rolę;
- dodaj magazyn;
- odbierz magazyn;
- zmień widoczność awizacji Supplier User.
### Ograniczenia

- nie można odebrać ostatniego System Administratora;
- użytkownik magazynowy wymaga co najmniej jednego magazynu;
- Supplier User wymaga firmy;
- nie można przypisać nieaktywnej firmy;
- zmiany są audytowane.
# 20. Powiadomienia

## BDP-NOT-001: Kanały UI MVP

**APPROVED — Łukasz Gębicki, 2026-07-28**

UI MVP demonstruje:

- e-mail;
- in-app.
Prawdziwa wysyłka może zostać zastąpiona statusem demonstracyjnym.

## 20.1. Zdarzenia

- utworzenie;
- submitted;
- pending approval;
- confirmed;
- rejected;
- changes requested;
- slot proposed;
- rescheduled;
- cancelled;
- reminder;
- missing data;
- late arrival;
- no-show;
- shared comment.
## 20.2. Odbiorcy

Konfigurowani na poziomie zdarzenia:

- autor;
- główny kontakt Dostawcy;
- Supplier Administrator;
- Warehouse Operator;
- Warehouse Administrator;
- Security Officer;
- dodatkowe adresy.
## 20.3. Preferencje

Użytkownik może wyłączyć wyłącznie powiadomienia niekrytyczne.

Nie można wyłączyć:

- anulowania;
- zmiany terminu;
- odrzucenia;
- wymaganej akcji;
- komunikatu bezpieczeństwa.
Dla powiadomień niekrytycznych użytkownik może dodatkowo wybrać częstotliwość dostarczania: natychmiast, podsumowanie godzinowe albo podsumowanie dzienne.

## 20.4. Przypomnienie

Administrator ustawia:

- liczbę godzin przed terminem;
- odbiorców;
- warunek kompletności;
- język.
# 21. Walidacje

## BDP-VAL-001: Walidacje podstawowe

**APPROVED — Łukasz Gębicki, 2026-07-28**

- palletCount > 0, jeżeli pole jest używane;
- unitCount > 0, jeżeli pole jest używane;
- waga i objętość nie mogą być ujemne;
- data nie może być w przeszłości;
- slot musi być dostępny;
- slot nie może być zablokowany;
- zasób musi być kompatybilny;
- firma musi być aktywna;
- Dostawca musi mieć dostęp do magazynu;
- zakończona awizacja nie może być edytowana;
- anulowana awizacja nie może być aktywowana zwykłą edycją;
- Check-out nie może być przed Check-in;
- Completed nie może być przed Unloading.
## 21.1. Duplikaty

System ostrzega o potencjalnym duplikacie na podstawie:

- magazynu;
- firmy;
- reference number;
- PO lub ASN;
- planowanej daty;
- aktywnego statusu.
Supplier User nie może zignorować ostrzeżenia bez odpowiedniego uprawnienia.

## 21.2. Format PO i ASN

Format powinien być konfigurowalny jako:

- minimalna i maksymalna długość;
- dozwolony wzorzec;
- wartość obowiązkowa lub opcjonalna.
UI MVP powinien demonstrować konfigurację, nie tworzyć dowolnego silnika skryptowego.

# 22. Puste, błędne i wyjątkowe stany

**APPROVED — Łukasz Gębicki, 2026-07-28**

UI MVP musi zawierać osobne stany dla:

- braku awizacji;
- braku wyników filtra;
- braku dostępnych slotów;
- braku przypisanych magazynów;
- braku uprawnień;
- niedostępnej awizacji;
- konfliktu rezerwacji;
- wygasłej sesji;
- błędu zapisu;
- utraty połączenia;
- nieaktualnej wersji danych;
- niedozwolonej akcji;
- wygaśnięcia holda;
- błędu uploadu;
- niedostępnej konfiguracji;
- zablokowanego Dostawcy.
Każdy stan powinien wskazywać możliwe następne działanie.

Przykład:

Wybrany termin został właśnie zarezerwowany przez innego użytkownika. Wybierz jeden z najbliższych dostępnych terminów.

# 23. Mobile

## BDP-MOB-001: Zakres mobilny

**APPROVED — Łukasz Gębicki, 2026-07-28**

### Supplier User

Pełne wsparcie:

- logowanie;
- lista;
- tworzenie awizacji;
- wybór slotu;
- szczegóły;
- zmiana;
- anulowanie;
- dokument;
- kierowca;
- pojazd;
- potwierdzenie.
### Warehouse Operator

Wsparcie operacyjne:

- plan dnia;
- wyszukiwanie;
- szczegóły;
- status;
- dok;
- komentarz;
- No Show.
### Security Officer

Pełne wsparcie na telefonie i tablecie:

- wyszukiwanie;
- Check-in;
- Check-out;
- wizyta niezapowiedziana.
### Warehouse Administrator

Dostęp podglądowy i podstawowe akcje. Złożona konfiguracja kalendarzy może rekomendować desktop.

## 23.1. Mobile Calendar

Dostawca widzi listę dni i godzin, nie pomniejszony kalendarz desktopowy.

Operator widzi agendę. Pełna siatka doków jest funkcją desktop/tablet.

## 23.2. Aparat i skanowanie

Upload zdjęcia dokumentu jest dozwolony.

Skanowanie QR, OCR i rozpoznawanie tablic są poza zakresem.

# 24. Zakres wyłączony z UI MVP

Potwierdzone wyłączenia:

- integracja ERP;
- integracja WMS;
- integracja SAP;
- prawdziwe e-maile;
- prawdziwy storage załączników;
- zaawansowana optymalizacja doków;
- opłaty i kary;
- integracja systemu bramowego;
- OCR;
- rozpoznawanie tablic;
- zaawansowana hurtownia raportowa;
- SMS;
- natywna aplikacja mobilna;
- geofencing;
- ETA;
- yard map;
- AI planning;
- priorytetyzacja Dostawców przy konkurowaniu o ograniczoną pojemność (poza regułą „kto pierwszy” z AC-CONC-001);
- niezależna rola Przewoźnika/Brokera obsługującego wielu Dostawców (patrz 3.7 — możliwe rozszerzenie poza UI MVP);
- mechanizm oczekiwania (waitlist) na zwolnienie preferowanego, obecnie pełnego terminu.
## 24.1. Wielojęzyczność

Wcześniejszy zakres produktu obejmuje PL i EN, natomiast lista UI-only wyłącza wielojęzyczność.

**APPROVED — Łukasz Gębicki, 2026-07-28**

- UI MVP prezentuje jeden pełny język;
- struktura interfejsu jest gotowa na lokalizację;
- ekran ustawień pokazuje wybór PL/EN demonstracyjnie;
- kompletne tłumaczenie obu języków nie jest wymagane dla pierwszego prototypu.
# 25. Najważniejsze ekrany UI MVP

## Supplier

- Logowanie.
- Rejestracja.
- Moje awizacje.
- Kreator awizacji.
- Wybór terminu.
- Podsumowanie.
- Ekran sukcesu.
- Szczegóły.
- Reschedule.
- Cancel.
- Profile and users.
## Warehouse Operator

- Dashboard.
- Day Calendar.
- Week Calendar.
- Appointment List.
- Appointment Details.
- Manual Appointment.
- Assign Dock.
- Status Workflow.
- Exceptions.
- No Show.
## Security Officer

- Gate Dashboard.
- Search.
- Check-in.
- Check-out.
- Unannounced Visit.
## Warehouse Administrator

- Administration Dashboard.
- Warehouses.
- Warehouse Details.
- Zones and Docks.
- Calendars.
- Blocks and Exceptions.
- Capacity.
- Flow Configuration.
- Form Configuration.
- Approval Rules.
- Suppliers.
- Users.
- Notifications.
- Reports.
- Audit.
# 26. Scenariusze akceptacyjne według roli

## AC-SYS-001

System Administrator tworzy magazyn, przypisuje Warehouse Administrator i publikuje konfigurację.

## AC-WAD-001

Warehouse Administrator tworzy dok, harmonogram i blokadę, a kalendarz demonstracyjny aktualizuje dostępność.

## AC-WAD-002

Warehouse Administrator definiuje pola wymagane dla Material Delivery i widzi ich wpływ w formularzu Dostawcy.

## AC-WAD-003

Warehouse Administrator konfiguruje manual approval dla ADR i auto-approval dla standardowej dostawy.

## AC-WOP-001

Warehouse Operator tworzy awizację w imieniu Dostawcy i przypisuje dok.

## AC-WOP-002

Warehouse Operator przeprowadza wizytę przez statusy od EXPECTED do COMPLETED.

## AC-SEC-001

Security Officer znajduje awizację po rejestracji i wykonuje Check-in.

## AC-SEC-002

Security Officer rejestruje wizytę bez awizacji i przekazuje ją do decyzji.

## AC-SUP-001

Supplier User tworzy standardową awizację poza weekly planning, wybierając
wyłącznie dostępny slot. Weekly planning podlega scenariuszom z sekcji 30.

## AC-SUP-002

Supplier User uzupełnia dozwolone dane pojazdu po utworzeniu awizacji poza
weekly planning. W weekly planning oba wymagane pola rejestracyjne są podawane
podczas rezerwacji i nie mogą zostać odłożone na później.

## AC-SUP-003

Supplier User samodzielnie przeprowadza reschedule przed cut-off.

## AC-SUP-004

Supplier User po cut-off składa wniosek o zmianę.

## AC-SUP-005

Supplier User anuluje awizację, a termin staje się ponownie dostępny.

## AC-CONC-001

Dwóch użytkowników wybiera ostatnie miejsce. Tylko jedna rezerwacja kończy się sukcesem, a drugi użytkownik otrzymuje alternatywy.

# 27. Definition of Done dla Business Decision Pack

Ustalenia UI MVP są gotowe do zamknięcia po zatwierdzeniu:

- modelu sześciu ról;
- zakresu widoczności Supplier User;
- pięcioetapowego formularza;
- obowiązkowych pól każdego przepływu;
- modelu pojemności;
- sposobu przydziału doków;
- trzech kategorii statusów;
- macierzy przejść;
- reguł approval;
- cut-off reschedule;
- cut-off cancellation;
- zasad no-show;
- zakresu komentarzy wspólnych i wewnętrznych;
- zakresu dashboardów;
- zakresu mobile;
- zakresu demonstracyjnej konfiguracji;
- elementów poza UI MVP;
- scenariuszy akceptacyjnych.
# 28. Ostateczna rekomendacja

UI MVP powinien demonstrować nie tylko ekrany, lecz spójny model konfiguracji i konsekwencji:

1     Administrator zmienia regułę
2     → reguła wpływa na dostępność
3     → Dostawca widzi inne sloty lub pola
4     → awizacja przechodzi odpowiedni approval
5     → Operator otrzymuje właściwe akcje
6     → zmiana pozostaje w historii

Największa elastyczność powinna wynikać z:

- granularnych uprawnień;
- zakresów magazynowych i organizacyjnych;
- dynamicznych formularzy;
- konfigurowalnej pojemności;
- reguł długości;
- reguł approval;
- cut-off;
- kalendarzy i wyjątków;
- kontrolowanego override.
Nie należy osiągać elastyczności przez dowolne, programowalne workflow. Dla UI MVP ważniejsze jest pokazanie spójnego, zrozumiałego zestawu opcji administracyjnych niż symulowanie nieograniczonego systemu no-code.

# 29. Weekly planning

Sekcja 29 zastępuje wcześniejsze ogólne założenia wszędzie tam, gdzie dotyczą
Supplier weekly planning. Opisuje wyłącznie zatwierdzony frontendowy model
demonstracyjny; nie autoryzuje backendu, trwałego zapisu, integracji ani
implementacji bez osobnego kontraktu zadania opartego na exact SHA.

## BDP-WPL-001: Kadencja planowania tygodniowego

**APPROVED — Łukasz Gębicki, 2026-07-31**

- W tygodniu W Supplier rezerwuje na tydzień W+1 termin dla jednego PO.
- W piątek uprawniony Administrator importuje szczegóły PO/SKU i wzbogaca
  wyłącznie rekordy dopasowane dokładnie zgodnie z `BDP-MATCH-001`.
- Dokładna godzina otwarcia i zamknięcia rezerwacji Supplier jest konfiguracją
  magazynu; piątek jest domyślnym operacyjnym cut-off, nie stałą techniczną.
- Dostawa z importu bez pasującej rezerwacji pozostaje jawnie niedopasowana i
  niezaplanowana, dopóki Administrator nie przypisze jej terminu w osobnej,
  audytowanej akcji.
- Administrator planuje dodatkowe dostawy wyłącznie w pozostałych,
  kompatybilnych wolnych slotach.
- Import nigdy nie przesuwa po cichu slotu zarezerwowanego przez Supplier.
  Różnica danych lub konflikt wymaga jawnego rozstrzygnięcia Administratora.

## BDP-BOOK-002: Ograniczona rezerwacja Supplier

**APPROVED — Łukasz Gębicki, 2026-07-31**

Początkowy weekly-planning flow obejmuje dokładnie jednego Supplier, jeden
warehouse, jeden week, jeden purchase order i jeden wybrany slot. Supplier nie
wprowadza pozycji SKU podczas rezerwacji i nie dzieli dostawy w UI.
`deliveryPartKey` ma stałą wartość `"1"`.

Do ukończenia każdej rezerwacji Supplier wymagane są oba pola:

- `tractorRegistration`;
- `trailerOrContainerRegistration`.

Uprawniony Administrator może w dowolnym momencie jawnie i audytowalnie
utworzyć, poprawić lub zaktualizować każdą z tych wartości. Import piątkowy nie
może ich nadpisać po cichu; każda różnica wymaga jawnego rozstrzygnięcia.

Supplier nie wprowadza ani nie edytuje SKU, opisów produktu, liczby jednostek
lub palet, rodzaju nośnika, kategorii towaru, importowanych instrukcji obsługi
ani administracyjnych notatek planowania. Rezerwacja tworzy nagłówek PO ze
źródłem `SUPPLIER_RESERVED`, stanem `AWAITING_DETAILS`, pustą kolekcją SKU i
informacją, że szczegóły uzupełni Administrator. PO jest normalizowanym,
niepustym identyfikatorem; UI ostrzega o duplikacie w tym samym tygodniu i
zakresie, ale nie deklaruje walidacji ERP/SAP.

## BDP-IMP-001: Piątkowy import administracyjny

**APPROVED — Łukasz Gębicki, 2026-07-31**

Plik importuje wyłącznie uprawniony aktor:

- System Administrator — dla wszystkich magazynów;
- Warehouse Administrator — tylko dla przypisanych magazynów.

Supplier nie importuje pliku. Warehouse Operator domyślnie nie ma uprawnienia
do uploadu. Brak aktora uprawnionego do importu musi zostać rozwiązany przez
jawne `DELEGATE` do autoryzowanego aktora albo `BLOCK`; system nie może
sfabrykować działania ani cichego zastępstwa.

Walidacja importu jest lokalna i demonstracyjna. Wynik pokazuje zaakceptowane,
odrzucone, niedopasowane i konfliktowe wiersze, bez sugerowania trwałego zapisu,
ERP, WMS ani SAP.

Każdy wiersz reprezentuje jedną pozycję SKU i może zawierać magazyn,
proponowaną datę/czas, PO, delivery-part key, SKU, dwa opisy, kod i nazwę
Supplier, jednostki, palety, rodzaj nośnika, kategorię towaru, instrukcję
obsługi, wewnętrzny komentarz Administratora, opcjonalne wartości transportowe
do uzgodnienia oraz identyfikator wiersza źródłowego. CSV i XLSX są parsowane
lokalnie. Preview waliduje wiersze i grupy, zachowuje precyzję wartości
ułamkowych oraz niczego nie stosuje przed jawnym `Apply`.

## BDP-DATA-001: Model PO i SKU

**APPROVED — Łukasz Gębicki, 2026-07-31**

Rekord planowania ma nagłówek PO oraz od zera do wielu pozycji SKU. Początkowa
rezerwacja Supplier może zawierać nagłówek PO bez pozycji; piątkowy import
dołącza szczegóły SKU do dokładnie dopasowanego rekordu. Model zachowuje
oddzielnie termin planowany, źródło rezerwacji, dane transportowe i stan
planowania. UI nie udostępnia dzielenia PO ani edycji `deliveryPartKey`.

Dozwolone źródła rezerwacji to `SUPPLIER_RESERVED` i `ADMIN_ADDED`.
`ADMIN_CREATED_FOR_SUPPLIER` pozostaje opcjonalną przyszłą wartością, której
nie wolno użyć bez osobnej zaakceptowanej decyzji i kontraktu.

Po wzbogaceniu system wylicza z pozycji SKU liczbę linii, sumę jednostek i
palet, odrębne rodzaje nośników i kategorie towaru, podsumowanie obsługi oraz
efektywne wymagania transportowe. Pochodne sumy nie są drugim, ręcznie
utrzymywanym źródłem. Klucz części zachowuje gotowość na przyszły kontrolowany
split, lecz początkowy UI nie alokuje częściowych ilości.

## BDP-MATCH-001: Dokładne dopasowanie i stany planowania

**APPROVED — Łukasz Gębicki, 2026-07-31**

Import wzbogaca rezerwację tylko przy dokładnej zgodności
`warehouseCode + supplierCode + purchaseOrderNumber + deliveryWeek +
deliveryPartKey`. Dopasowanie
przybliżone, częściowe lub oparte na etykiecie jest zabronione.

Każda grupa importu ma dokładnie jeden wynik: `EXACT_MATCH`, `NO_MATCH`,
`AMBIGUOUS_MATCH`, `INVALID_GROUP` albo `DUPLICATE_IMPORT`. Ambiguous lub
invalid blokuje zastosowanie. Re-import nie może podwajać ilości; zmieniona
grupa wymaga podglądu before/after, jawnego zastosowania i historii.

Przy exact match Supplier zachowuje autorytet nad magazynem, datą, godziną,
slotem i podanymi transport identifiers. Import jest autorytatywny wyłącznie
dla SKU, ilości, nośników, kategorii i instrukcji obsługi. Sprzeczna niepusta
wartość transportowa tworzy ostrzeżenie reconciliation.

Weekly planning używa niezależnego od cyklu życia awizacji stanu planowania:

- `AWAITING_DETAILS` — Supplier zarezerwował slot, lecz brak szczegółów SKU;
- `DETAILS_ATTACHED` — dokładnie dopasowany import dołączył szczegóły;
- `VALIDATION_CONFLICT` — dopasowany rekord wymaga jawnego rozstrzygnięcia;
- `READY` — rekord spełnia zatwierdzone warunki dalszej gotowości.

Wynik `NO_MATCH` pozostaje jawnie niedopasowany i ma stan `UNSCHEDULED`, dopóki
Administrator nie wybierze kompatybilnego slotu. Dla grup przed utworzeniem
awizacji obowiązują też `AMBIGUOUS_MATCH` i `INVALID`. Stany planowania nie
zastępują Planning Status, Change Status ani Operational Status z sekcji 8 i
nie upoważniają automatycznie do przejścia cyklu życia.

## BDP-TRN-001: Dane transportowe i downstream readiness

**APPROVED — Łukasz Gębicki, 2026-07-31**

Oba pola transportowe z `BDP-BOOK-002` są zawsze obowiązkowe w Supplier
reservation. Macierz `warehouse + loadCarrierType + goodsCategory` nie może
usunąć tego wymagania. Jej jedynym zakresem jest downstream readiness oraz
dostawy dodane lub zaimportowane przez Administratora, dla których określa
cztery kombinacje wymagań: żadna, tylko ciągnik, tylko naczepa/kontener albo
oba pola. Konflikt macierzy
prowadzi do jawnego stanu `VALIDATION_CONFLICT`, a nie do cichej utraty danych,
automatycznego przesunięcia terminu ani zmiany źródła rezerwacji.

Dla wielu pozycji SKU efektywne downstream requirement jest logicznym OR
wszystkich dopasowanych reguł, a UI wskazuje linię lub regułę powodującą
ostrzejsze wymaganie. Brak aktywnej kombinacji tworzy blokujący
`MISSING_TRANSPORT_RULE`; rekord nie osiąga `READY` bez konfiguracji albo
autoryzowanego wyjątku z powodem i historią.

## BDP-CAL-002: Kalendarz weekly planning

**APPROVED — Łukasz Gębicki, 2026-07-31**

Kalendarz pokazuje jedną kartę na awizację PO, nigdy kartę na każdą linię SKU.
Karta może pokazać źródło rezerwacji, PO, Supplier, planowany termin, status,
stan planowania, sumę palet, liczbę SKU, transport i bezpieczne dla roli
oznaczenie konfliktu. Przed wzbogaceniem pokazuje `Awaiting SKU details`, a nie
zerową lub pustą dostawę. Karta PO udostępnia
dokładną, dostępną klawiaturą akcję `Pokaż zawartość dostawy`, która ujawnia
SKU, opisy, jednostki, palety, rodzaj nośnika, kategorię, instrukcję obsługi i
ostrzeżenia linii albo poprawny stan braku szczegółów. Akcja działa myszą,
klawiaturą i dotykiem; hover nie może być jedyną drogą. Supplier nie widzi
wewnętrznych komentarzy ani technicznej lineage. Import nie zmienia slotu bez
jawnej akcji Administratora.

## BDP-REP-001: Raportowanie PO i SKU

**APPROVED — Łukasz Gębicki, 2026-07-31**

Raporty obejmują inkluzywny zakres planowanych dat i dwa poziomy: `PO` — jeden
wiersz na awizację, oraz `SKU` — jeden wiersz na pozycję produktu. Minimalny
zakres to:

- tygodniowy raport wszystkich dostaw;
- miesięczny raport Slipsheet;
- filtrowalny podgląd PO/SKU z terminem planowanym i stanem planowania;
- lokalny, demonstracyjny eksport CSV i XLSX.

Eksport nie oznacza zaawansowanej hurtowni raportowej ani integracji. Zakres
danych pozostaje ograniczony rolą, organizacją i przypisaniem magazynowym.
Filtry i kolumny obejmują w odpowiednim poziomie magazyn, datę/czas, PO, SKU,
opisy, Supplier, jednostki, palety, nośnik, kategorię, instrukcję, transport,
origin, planning status, appointment status i źródło importu. Appointment count
używa odrębnych appointment IDs, a jednostki i palety sumują każdą linię raz.
Eksport zachowuje aktywny zakres, filtry, kolumny, poziom i sortowanie.

## BDP-FLOW-001: Capability routing i opcjonalne role

**APPROVED — Łukasz Gębicki, 2026-07-31**

System utrzymuje sześć globalnych typów ról z sekcji 3, ale udział każdej roli
w konkretnym workflow jest opcjonalny. Każdy krok ma jedno jawne rozstrzygnięcie
`RUN`, `SKIP`, `DELEGATE` albo `BLOCK`. Brak Supplier oznacza `SKIP`: nie tworzy
się placeholdera, a dostawa może wejść przez piątkowy przepływ Administratora.
Brak aktora obowiązkowego oznacza wyłącznie autoryzowane `DELEGATE` lub `BLOCK`.

Routing opiera się na następujących capability identifiers:

- `BOOK_APPOINTMENT`;
- `IMPORT_DELIVERY_DETAILS`;
- `SCHEDULE_UNRESERVED_DELIVERY`;
- `RESOLVE_PLANNING_CONFLICT`;
- `APPROVE_APPOINTMENT`;
- `REJECT_APPOINTMENT`;
- `REQUEST_APPOINTMENT_DATA`;
- `CHECK_IN`;
- `CHECK_OUT`;
- `ASSIGN_DOCK`;
- `CHANGE_DOCK`;
- `PROGRESS_OPERATION`;
- `CONFIRM_NO_SHOW`;
- `MANAGE_SUPPLIER_USERS`.

Routing nie tworzy nowych ról, nie deleguje poza zatwierdzony zakres danych i
nie zmienia zatwierdzonych macierzy przejść.

Domyślne fallbacki są kontrolowane: import i planowanie niedopasowanej dostawy
delegują od Warehouse Administratora do System Administratora; manual approval
może delegować do autoryzowanego Warehouse Operatora, następnie System
Administratora; check-in/out od Security Officer do Warehouse Operatora,
następnie Warehouse Administratora; operacje dokowe od Warehouse Operatora do
Warehouse Administratora. Brak fallbacku daje `BLOCK`. Brak roli nigdy nie
może po cichu zatwierdzić, anulować, przesunąć slotu, wykonać check-in/out,
No Show, completion, importu ani override. Zmiana odpowiedzialności wymaga
powodu i historii.

## 29.10. Kolejność implementacji

Planowanie wymaga osobnych kontraktów i przebiega w kolejności:

1. `UI-MVP-FLOW-ROUTING-1`;
2. `UI-MVP-TRANSPORT-RULES-1`;
3. zrewidowany `UI-MVP-BOOKING-1`;
4. rozszerzony `UI-MVP-CALENDAR-CAPACITY-1`;
5. `UI-MVP-ADMIN-IMPORT-1`;
6. `UI-MVP-WEEKLY-PLANNING-1`;
7. konsumenci routingu lifecycle i gate;
8. rozszerzony `UI-MVP-LIST-DETAILS-1`;
9. `UI-MVP-REPORTING-1`;
10. pozostałe notification, dashboard i standing appointments.

Ta kolejność jest planem zależności, a nie zgodą na rozpoczęcie któregokolwiek
zadania. Każde zadanie wymaga osobnego stanu `READY`, kontraktu z exact SHA,
walidacji, niezależnego review, pull requestu i human merge.

# 30. Scenariusze akceptacyjne weekly planning

## AC-SUP-006

Supplier rezerwuje dostępny slot tygodnia W+1 dla jednego PO, bez pozycji SKU,
podając oba wymagane pola transportowe. Powstaje jedna lokalna rezerwacja
`SUPPLIER_RESERVED` ze stanem `AWAITING_DETAILS` i bez edytowalnych przez
Supplier pól produktu; granica demonstracyjna jest jawna.

## AC-SUP-007

Supplier nie może ukończyć rezerwacji bez `tractorRegistration` lub
`trailerOrContainerRegistration`; downstream matrix nie osłabia tej reguły.

## AC-SUP-008

Supplier User ani Supplier Administrator nie widzi akcji ani bezpośredniej
trasy importu. SKU, ilości, rodzaj nośnika, kategoria i handling są tylko do
odczytu albo ukryte zgodnie z widocznością, a diagnostyka importu jest ukryta.

## AC-FLOW-001

Brak aktywnego Supplier z `BOOK_APPOINTMENT` rozstrzyga
`SUPPLIER_RESERVE_NEXT_WEEK` jako `SKIP`, bez zadania i placeholdera; piątkowa
grupa może wejść do kolejki i później utworzyć `ADMIN_ADDED`.

## AC-FLOW-002

Obecny, aktywny Supplier z `BOOK_APPOINTMENT` rozstrzyga booking jako `RUN`, a
akcję widzą tylko aktorzy we właściwym zakresie Supplier i warehouse.

## AC-FLOW-003

Brak Warehouse Administratora z import capability deleguje piątkowy import do
System Administratora z `IMPORT_DELIVERY_DETAILS`, bez osłabienia walidacji.

## AC-FLOW-004

Brak primary i fallback z `IMPORT_DELIVERY_DETAILS` daje `BLOCK`; pliku nie
można zastosować, a UI pokazuje brak capability i sposób naprawy.

## AC-FLOW-005

Manual approval bez primary ani fallback approvera daje `BLOCK`; system nie
wykonuje auto-approval i nie zapisuje fałszywego zdarzenia sukcesu.

## AC-FLOW-006

Brak Security Officer deleguje check-in do Warehouse Operatora z `CHECK_IN` w
tym samym warehouse; operator z innego magazynu nie jest kandydatem.

## AC-FLOW-007

Nawigacja, widoczność akcji i bezpośredni route guard korzystają z jednego
źródła routingu i jednolicie egzekwują `SKIP`, `DELEGATE` lub `BLOCK`, bez
ukrytego obejścia.

## AC-ADM-001

Uprawniony routed actor wybiera poprawny template; plik jest lokalnie parsowany
i walidowany przed apply, wiele SKU jednego PO grupuje się w jedną dostawę,
ułamkowe palety zachowują precyzję i stan nie zmienia się przed jawnym apply.

## AC-ADM-002

Exact match po warehouse, Supplier, PO, week i delivery part dołącza SKU,
zachowuje slot Supplier, przelicza sumy i downstream transport readiness,
ustawia `READY` albo `VALIDATION_CONFLICT` i zachowuje batch/row lineage.

## AC-ADM-003

Różna niepusta wartość transportowa z importu jest warningiem reconciliation i
nie zastępuje po cichu wartości Supplier.

## AC-ADM-004

Poprawna grupa bez rezerwacji staje się `UNSCHEDULED`, nie tworzy awizacji ani
rezerwacji capacity i pokazuje uprawnionemu Administratorowi kompatybilne sloty.

## AC-ADM-005

Uprawniony aktor z `SCHEDULE_UNRESERVED_DELIVERY` potwierdza kompatybilny wolny
slot dla unmatched group; powstaje `ADMIN_ADDED` ze SKU, walidacją capacity,
compatibility i transport readiness oraz jedną kartą PO.

## AC-ADM-006

Więcej niż jedna pasująca rezerwacja daje `AMBIGUOUS_MATCH` i blokuje
dołączenie danych do jawnego rozstrzygnięcia lub korekty przez Administratora.

## AC-ADM-007

Jeżeli wzbogacenie wymaga większej capacity, innej capability lub dłuższego
czasu, slot nie jest przesuwany ani anulowany; powstaje `VALIDATION_CONFLICT`,
bezpieczne akcje naprawcze, a override wymaga powodu i historii.

## AC-ADM-008

Ponowny import równoważnych danych nie dubluje ilości; zmiana pokazuje before/
after replacement preview i wymaga jawnego apply oraz historii.

## AC-ADM-009

Warehouse Administrator przypisany do warehouse A, lecz nie B, może zastosować
poprawne grupy A niezależnie, ale nie może zastosować grup B.

## AC-TRN-001

Cztery konfiguracje downstream matrix są walidowane dla gotowości dalszego
przetwarzania oraz dostaw dodanych lub zaimportowanych przez Administratora;
każda wymaga dokładnie skonfigurowanego zestawu pól, lecz żadna nie zmienia
obowiązku obu pól podczas rezerwacji Supplier.

## AC-TRN-002

Wieloliniowe PO używa logicznego OR wymagań downstream; gdy jedna linia wymaga
naczepy, a druga ciągnika i naczepy, wynik wymaga obu i wskazuje źródłowe linie
lub reguły.

## AC-TRN-003

Brak aktywnej reguły dla linii tworzy blokujący `MISSING_TRANSPORT_RULE`, nie
pozwala osiągnąć `READY` i nie zakłada, że dane transportowe są zbędne.

## AC-CAL-002

Awizacja z trzema liniami SKU daje dokładnie jedną kartę PO; liczba SKU, suma
jednostek i palet są agregowane z linii dokładnie raz.

## AC-CAL-003

Akcja `Pokaż zawartość dostawy` działa myszą, klawiaturą i dotykiem oraz pokazuje
SKU, opisy, jednostki, palety, nośnik, kategorię i handling; Supplier nie widzi
wewnętrznych komentarzy ani technicznej lineage.

## AC-CAL-004

Rezerwacja bez SKU pokazuje na karcie `Awaiting SKU details`; UI nie wyciąga
wniosku o zerowej liczbie palet ani pustej dostawie.

## AC-REP-001

Uprawniony internal user wybiera pełny tydzień i poziom PO; wynik zawiera
wszystkie scoped appointments w inkluzywnym zakresie, odróżnia oba origins, a
eksport zawiera wyłącznie aktywny wynik.

## AC-REP-002

Uprawniony internal user wybiera pełny miesiąc, poziom SKU i Slipsheet; wynik i
eksport zawiera tylko pasujące linie z PO, Supplier, datą/czasem, ilościami i
wartościami transportowymi.

## AC-REP-003

W podsumowaniu per Supplier lub miesiąc wieloliniowe PO liczy awizację raz po
distinct appointment ID, a jednostki i palety sumuje z każdej linii raz.

## AC-REP-004

Lokalny CSV/XLSX zachowuje aktywny zakres dat, filtry, poziom, kolumny,
sortowanie, kolejność i zakres roli oraz nie sugeruje integracji ani trwałego
zapisu.
