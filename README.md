# ChangeProof AI

Application Next.js pour generer, tracer et auditer la documentation liee aux changements projet.

## Prerequis

- Node.js 24+
- npm 11+
- Docker, pour lancer PostgreSQL/pgvector en local

## Installation

```bash
npm install
cp .env.example .env
```

Renseigner au minimum `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL` et `NEXT_PUBLIC_APP_URL` dans `.env`.

## Base de donnees

Demarrer PostgreSQL local:

```bash
docker compose up -d db
```

Initialiser Prisma:

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

## Developpement

```bash
npm run dev
```

L'application ecoute par defaut sur `http://localhost:3000`.

## Verification

```bash
npm run build
npm run typecheck
npm run lint
npm test -- --coverage
npm run test:e2e
npm audit --audit-level=high
```

## Scripts utiles

- `npm run db:migrate` : cree une migration Prisma de developpement.
- `npm run db:studio` : ouvre Prisma Studio.
- `npm run format` : formate le projet avec Prettier.
- `npm run start` : lance le build Next.js en mode production.
