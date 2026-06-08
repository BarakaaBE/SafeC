# SafeClock — Backend Setup

## Prérequis
- Node.js 18+ (https://nodejs.org)
- Compte Neon (https://neon.tech)

## Installation

### 1. Renommer le dossier nextauth (important !)
Après extraction, renommez le dossier :
  src/app/api/auth/nextauth
en :
  src/app/api/auth/[...nextauth]

Les crochets sont obligatoires pour Next.js.

### 2. Installer les dépendances
```
npm install
```

### 3. Configurer les variables d'environnement
Renommez .env.example en .env.local
Ouvrez .env.local et remplissez :
- DATABASE_URL = votre URL Neon
- NEXTAUTH_SECRET = générez avec : openssl rand -base64 32

### 4. Créer les tables
```
npm run db:push
```

### 5. Charger les données de test
```
npm run db:seed
```

### 6. Lancer
```
npm run dev
```

## Comptes de test
alice@safeclock.be / Admin123  (Owner)
bob@safeclock.be   / Bob123    (Employé)
emma@safeclock.be  / Emma123   (Employée)
