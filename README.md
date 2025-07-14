# 🐰 BunnyBuddy – Smart Finance Assistant

**BunnyBuddy** este o aplicație mobilă completă, care îmbină managementul financiar personal cu elemente avansate de inteligență artificială, gamificare și interacțiune naturală. Este concepută pentru utilizatori digitali moderni care caută o experiență intuitivă, prietenoasă și eficientă în gestionarea bugetului personal.

Aplicația înlocuiește interfețele rigide și sistemele manuale plictisitoare cu un asistent financiar virtual personalizat, alimentat de AI, care te motivează, te educă și îți oferă control deplin asupra cheltuielilor.

---

## 🧭 Navigare principală – 4 taburi funcționale

Aplicația este împărțită în patru module principale accesibile din bara de navigare:

---

### 📌 1. Budget Tab

Acest modul te ajută să creezi și să administrezi un buget lunar personalizat:

- **Creare buget în 4 pași**: proces ghidat cu UI clar, unde utilizatorul definește suma totală, alege categoriile dorite și alocă bugetul fiecărei categorii.

- **Editare buget**:
  - Adăugare / ștergere categorii.
  - Reajustare dinamică a sumei pe fiecare categorie.
  - Salvare în Firebase cu sincronizare în timp real.

- **Vizualizare buget**:
  - **Pie Chart** pentru distribuția procentuală a bugetului pe categorii.
  - **Progress bar** care arată procentul cheltuit.

---

### 📌 2. Overview Tab

Tabul "Overview" oferă o radiografie completă a cheltuielilor, prin trei pagini specializate:

#### 📋 List View

- Cheltuielile sunt afișate în ordine descrescătoare pe zile.
- Navigare prin lunile anterioare cu săgeți laterale.
- Buton **Add Bunnyspense** permite adăugarea manuală a unei cheltuieli printr-un formular intuitiv.

#### 📊 Chart View

- Vizualizarea cheltuielilor grupate pe categorii.
- Chart interactiv generat automat pe baza datelor stocate în Firestore.

#### 🗓 Calendar View

- Calendar lunar cu iconițe tematice pentru fiecare zi:
  - 🟢 Good Day – <33% din bugetul zilnic cheltuit.
  - 🟡 Medium Day – între 33% și 75%.
  - 🔴 Bad Day – peste 75% din bugetul zilnic cheltuit.

---

### 📌 3. AI Tab

Acest modul este sufletul aplicației și integrează toate componentele de AI, gamificare și feedback personalizat:

#### 💬 Tips & Categories

- **Tips**: recomandări generate automat în funcție de comportamentul general.
- **Categories**: tips-uri specifice fiecărei categorii de cheltuieli.

#### 📈 Stats

- Statistici comparative între luni și distribuții pe categorii.
- Trenduri personalizate și mesaje tematice motivaționale.

#### 🎯 Quests

- Misiuni zilnice, săptămânale și lunare:
  - Ex: „Cheltuie mai puțin de 50 RON azi”, „Nu depăși 30% din bugetul de food săptămâna asta”.
- Răsplată: **CarrotCoins**, XP, badge-uri, niveluri.

---

#### 🤖 Asistență Inteligentă

##### 🗨 Chatbox AI

- Introducere cheltuieli prin text.
- Suportă **română și engleză**.
- NLP personalizat:
  - Fișiere proprii `ro-en.ts` pentru traduceri.
  - Dicționar financiar creat manual.
  - Detectează: sumă, categorie, subcategorie, descriere, dată.

##### 🎙 Voice Assistant

- Suport vocal RO/EN (bazat pe `expo-speech`).
- Conversie voce → text → NLP.
- Comenzi hands-free.

##### 📷 OCR Scanner

- Implementare cu Tesseract.js.
- Scanează bonuri/facturi și extrage automat:
  - Suma totală, data, categoria, subcategoria.
- Curățare text + clasificare semantică + mapare inteligentă.

---

### 📌 4. Profile Tab

- Afișează și permite editarea datelor utilizatorului.
- Conectare cont bancar (GoCardless):
  - Extragere automată de tranzacții (activ doar în anumite țări).
- **Badge Wall**: galerie de insigne câștigate.

---

## 🎮 Sistem de Gamificare

Gamificarea este integrată complet și subtil în experiența BunnyBuddy:

### 🔑 Elemente cheie

- **CarrotCoins**: monedă internă obținută din questuri și utilizată pentru progres.
- **Daily / Weekly / Monthly Quests**: misiuni generate dinamic de AI.
- **Badge-uri și niveluri**: răsplată pentru comportament financiar pozitiv.

### 🎨 Denumiri tematice

| Funcționalitate clasică | Denumire în BunnyBuddy      |
|-------------------------|-----------------------------|
| Adaugă cheltuială       | Add a Bunnyspense           |
| Calendar                | Daily Hop                   |
| Istoric cheltuieli      | Carrot Trail                |
| Asistent AI             | Bunny Assistant             |
| Vizualizare buget       | Burrow Insights             |

### 💬 Mesaje tematice

- *“Any notes, bunbun?”* – în formularul de cheltuială.
- *“Every carrot counts!”* – în secțiunea Tips.
- *“Small steps lead to big bunny hops!”* – în zona de Quests.
- *“Hopping your spending patterns?”* – în zona Categories.
- *“You're doing bunny-tastic with your budget!”* – în zona Stats.

### 🎯 Design

- Iepurași animați, culori pastel și iconițe prietenoase.
- Mesaje motivaționale și metafore vizuale în toate componentele aplicației.

---

## 🧠 Arhitectură și Tehnologii

- **Frontend**: React Native + Expo SDK + TypeScript
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Routing**: expo-router
- **State Management**: Context API + AsyncStorage
- **AI/NLP**: Fișiere `.ts` custom pentru interpretare financiară
- **OCR**: Tesseract.js
- **Voice**: expo-speech

---

## 🗂 Structura codului

```plaintext
/auth         – Autentificare și gestionare conturi
/ai           – NLP, Voice Assistant, OCR
/bank-connect – Integrare GoCardless
/tabs         – Structura celor 4 taburi
/screens      – Fiecare view principal
/components   – Componente UI reutilizabile
/utils        – Helperi, tipuri, traduceri, clasificatori AI
```

---

## 🧪 Instalare locală
```
git clone https://github.com/username/BunnyBuddy.git
cd BunnyBuddy
npm install
npx expo start
```
🔐 Creează un cont Firebase și adaugă firebaseConfig.ts.

---

## 🛡️ Securitate
-Autentificare Firebase cu sesiune persistentă.
-Reguli Firestore pentru protecție la nivel de document.
-AsyncStorage pentru stocare locală criptată.

---

## 📸 Demos
🎞️ [creare Budget](https://drive.google.com/drive/folders/1zD9nYU2fS9u6U8J6LleyPth1kbmpWRdg?dmr=1&ec=wgc-drive-hero-goto)
🎞️ [chatbox](https://drive.google.com/drive/folders/1zD9nYU2fS9u6U8J6LleyPth1kbmpWRdg?dmr=1&ec=wgc-drive-hero-goto)
🎞️ [OCR](https://drive.google.com/drive/folders/1zD9nYU2fS9u6U8J6LleyPth1kbmpWRdg?dmr=1&ec=wgc-drive-hero-goto)
🎞️ [Add Bunnyspense + Card](https://drive.google.com/drive/folders/1zD9nYU2fS9u6U8J6LleyPth1kbmpWRdg?dmr=1&ec=wgc-drive-hero-goto)
🎞️ [Ai pages](https://drive.google.com/drive/folders/1zD9nYU2fS9u6U8J6LleyPth1kbmpWRdg?dmr=1&ec=wgc-drive-hero-goto)

## 🖼️ Some Screenshots

<table>
  <tr>
    <td><img src="./assets/screenshots/budget.png" width="250"/></td>
    <td><img src="./assets/screenshots/overviewlist.png" width="250"/></td>
    <td><img src="./assets/screenshots/overviewchart.png" width="250"/></td>
  </tr>
  <tr>
    <td><img src="./assets/screenshots/overviewcalendar.png" width="250"/></td>
    <td><img src="./assets/screenshots/chatbox.png" width="250"/></td>
    <td><img src="./assets/screenshots/AI.png" width="250"/></td>
  </tr>
  <tr>
    <td><img src="./assets/screenshots/profile.png" width="250"/></td>
    <td><img src="./assets/screenshots/bank.png" width="250"/></td>
    <td></td>
  </tr>
</table>


---

## 👩‍💻 Autor
Aplicație dezvoltată de Cojan Alexia Ilaria
Licență – Facultatea de Matematică și Informatică
Universitatea Babeș-Bolyai, Cluj-Napoca
Coordonator: Prof. Univ. Dr. Lazăr Ioan
