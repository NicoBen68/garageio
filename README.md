# 🚗 GarageIO

> Ton carnet d'entretien intelligent — zéro saisie manuelle.

GarageIO est une application mobile iOS/Android qui simplifie le suivi de l'entretien de tes véhicules. Ajoute un véhicule par sa plaque d'immatriculation, enregistre tes interventions, et reçois des rappels intelligents par date et kilométrage.

---

## ✨ Fonctionnalités

### Core (gratuit)
- 🔍 **Ajout par plaque** — infos véhicule auto-remplies via API SIV
- 📋 **Carnet d'entretien** — vidange, freins, pneus, CT, courroie, filtres...
- 🔔 **Rappels intelligents** — par date ET kilométrage (le premier atteint déclenche)
- 📸 **OCR factures** — extraction automatique via Claude Vision (photo ou PDF)
- 👤 **Multi-véhicules** — gère toute ta famille ou ta flotte
- 📊 **Entretien global** — toutes les interventions de tous les véhicules
- 🔔 **Notifications push** — rappels en temps réel

### Premium (à venir)
- 💰 **Suivi budgétaire** — toutes tes dépenses par véhicule
- 📈 **Coût réel au km** — calculé automatiquement depuis ton historique

---

## 🛠 Stack technique

| Couche | Technologie |
|--------|-------------|
| Mobile | React Native + Expo SDK 56 |
| Navigation | Expo Router |
| Styling | StyleSheet natif RN |
| State | Zustand |
| Backend / Auth | Supabase |
| Base de données | PostgreSQL (Supabase) |
| API plaque | RapidAPI — Api Plaque Immatriculation SIV |
| OCR factures | Claude Vision API (Anthropic) |
| Notifications | Expo Notifications |
| Paiement | Stripe *(à venir)* |
| Build / Deploy | EAS (Expo Application Services) |

---

## 🚀 Démarrage rapide

### Prérequis
- Node.js 18+
- Expo CLI
- Compte Supabase
- Compte RapidAPI (API plaque immatriculation)
- Compte Anthropic (OCR factures)

### Installation

```bash
git clone https://github.com/NicoBen68/garageio.git
cd garageio
npm install --legacy-peer-deps
```

### Variables d'environnement

Crée un fichier `.env.local` à la racine :

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJh...
EXPO_PUBLIC_PLATE_API_KEY=ta_cle_rapidapi
EXPO_PUBLIC_PLATE_API_HOST=api-plaque-immatriculation-siv.p.rapidapi.com
```

### Base de données

Lance le fichier `garageio_schema.sql` dans **Supabase > SQL Editor** pour créer toutes les tables, politiques RLS et données de seed.

### Lancer le projet

```bash
npx expo start
```

---

## 📁 Structure du projet

```
garageio/
├── app/
│   ├── _layout.tsx              # Layout racine (auth + notifications)
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   └── (tabs)/
│       ├── index.tsx            # Dashboard véhicules
│       ├── maintenance.tsx      # Entretien global
│       ├── reminders.tsx        # Rappels intelligents
│       ├── settings.tsx         # Profil & paramètres
│       ├── add-vehicle.tsx      # Ajout véhicule par plaque
│       └── vehicle/
│           ├── [id].tsx         # Détail véhicule
│           └── [id]/
│               ├── maintenance.tsx      # Carnet d'entretien
│               └── add-maintenance.tsx  # Ajouter une intervention
├── lib/
│   ├── supabase.ts      # Client Supabase
│   ├── plateApi.ts      # API plaque immatriculation
│   ├── ocr.ts           # OCR factures (Claude Vision)
│   └── notifications.ts # Notifications push
├── store/
│   └── authStore.ts     # State global auth (Zustand)
└── garageio_schema.sql  # Schéma BDD complet
```

---

## 🗄 Schéma de base de données

8 tables principales :
- `users` — profils utilisateurs
- `vehicles` — véhicules
- `maintenance_types` — catalogue d'interventions (système + custom)
- `maintenance_records` — historique des interventions
- `reminders` — rappels intelligents
- `mileage_logs` — historique kilométrage (premium)
- `cost_entries` — suivi budgétaire (premium)
- `subscriptions` — abonnements Stripe

---

## 📱 Build & Déploiement

### Development build (test sur device)
```bash
eas build --platform ios --profile development
```

### Preview build (TestFlight / beta)
```bash
eas build --platform ios --profile preview
eas submit --platform ios
```

### Production (App Store)
```bash
eas build --platform ios --profile production
eas submit --platform ios
```

### Android
```bash
eas build --platform android --profile production
eas submit --platform android
```

---

## 🗺 Roadmap

- [x] Auth (inscription / connexion / déconnexion)
- [x] Ajout véhicule par plaque d'immatriculation
- [x] Carnet d'entretien par véhicule
- [x] Écran entretien global (tous véhicules)
- [x] Rappels intelligents (date + kilométrage)
- [x] OCR factures (Claude Vision + PDF)
- [x] Profil utilisateur éditable
- [x] Notifications push
- [x] Compatibilité Android (modales custom)
- [x] Build iOS + TestFlight
- [x] Soumission App Store Connect
- [ ] Review Apple en cours ⏳
- [ ] Module premium (Stripe)
- [ ] Publication App Store
- [ ] Android build + Google Play

---

## 📄 Licence

MIT — Nicolas Bennek © 2026
