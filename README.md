# 🚗 GarageIO

> Ton carnet d'entretien intelligent — zéro saisie manuelle.

GarageIO est une application mobile iOS/Android qui simplifie le suivi de l'entretien de tes véhicules. Ajoute un véhicule par sa plaque d'immatriculation, enregistre tes interventions, et reçois des rappels intelligents par date et kilométrage.

---

## ✨ Fonctionnalités

### Core (gratuit)
- 🔍 **Ajout par plaque** — infos véhicule auto-remplies via API SIV
- 📋 **Carnet d'entretien** — vidange, freins, pneus, CT, courroie, filtres...
- 🔔 **Rappels intelligents** — par date ET kilométrage (le premier atteint déclenche)
- 📸 **OCR factures** — extraction automatique via Claude Vision *(en cours)*
- 👤 **Multi-véhicules** — gère toute ta famille ou ta flotte

### Premium (à venir)
- 💰 **Suivi budgétaire** — toutes tes dépenses par véhicule
- 📊 **Coût réel au km** — calculé automatiquement depuis ton historique
- 🔔 **Notifications push** — rappels en temps réel

---

## 🛠 Stack technique

| Couche | Technologie |
|--------|-------------|
| Mobile | React Native + Expo SDK 56 |
| Navigation | Expo Router |
| Backend / Auth | Supabase |
| Base de données | PostgreSQL (Supabase) |
| API plaque | RapidAPI — Api Plaque Immatriculation SIV |
| OCR factures | Claude Vision API *(en cours)* |
| Paiement | Stripe *(à venir)* |
| Build / Deploy | EAS (Expo Application Services) |

---

## 🚀 Démarrage rapide

### Prérequis
- Node.js 18+
- Expo CLI
- Compte Supabase
- Compte RapidAPI (API plaque immatriculation)

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
│   ├── (auth)/          # Login, Register
│   └── (tabs)/          # Dashboard, Entretien, Rappels, Profil
│       └── vehicle/
│           ├── [id].tsx           # Détail véhicule
│           └── [id]/
│               ├── maintenance.tsx      # Carnet d'entretien
│               └── add-maintenance.tsx  # Ajouter une intervention
├── lib/
│   ├── supabase.ts      # Client Supabase
│   └── plateApi.ts      # API plaque immatriculation
├── store/
│   └── authStore.ts     # State global auth (Zustand)
└── garageio_schema.sql  # Schéma BDD complet
```

---

## 🗺 Roadmap

- [x] Auth (inscription / connexion)
- [x] Ajout véhicule par plaque
- [x] Carnet d'entretien
- [x] Rappels intelligents
- [x] Profil utilisateur
- [ ] OCR factures (Claude Vision)
- [ ] Notifications push
- [ ] Écran entretien global
- [ ] Module premium (Stripe)
- [ ] Publication App Store / Google Play

---

## 📄 Licence

MIT — Nicolas Bennek © 2026
