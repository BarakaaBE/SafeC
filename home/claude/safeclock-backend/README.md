# SafeClock — Backend Setup

## Prérequis
- Node.js 18+
- Compte Neon (https://neon.tech)

## Installation

### 1. Installer les dépendances
```bash
npm install
```

### 2. Configurer les variables d'environnement
```bash
cp .env.example .env.local
```

Ouvrez `.env.local` et remplissez :
- `DATABASE_URL` → votre URL Neon (postgresql://...)
- `NEXTAUTH_SECRET` → générez avec : `openssl rand -base64 32`

### 3. Créer les tables en base
```bash
npm run db:push
```

### 4. Charger les données de test
```bash
npm run db:seed
```

### 5. Lancer en développement
```bash
npm run dev
```

## Comptes de test (après seed)
| Email | Mot de passe | Rôle |
|-------|-------------|------|
| alice@safeclock.be | Admin123 | Owner |
| bob@safeclock.be | Bob123 | Employé |
| emma@safeclock.be | Emma123 | Employée |
