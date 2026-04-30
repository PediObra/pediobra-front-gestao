# PediObra — Frontend (Painel Admin + Seller)

MVP do painel administrativo e de vendedores do **PediObra**, construído em Next.js 16 (App Router) + TypeScript + Tailwind v4 + shadcn/ui, consumindo a API NestJS em `backend/`.

## Stack

- Next.js 16 + React 19 (App Router, server components onde fizer sentido)
- TypeScript
- Tailwind v4 + shadcn/ui (Radix)
- TanStack Query v5 (cache, invalidation, retry)
- React Hook Form + Zod
- TanStack Table (server-side pagination)
- Zustand (auth store, persistido em `localStorage`)
- sonner (toasts)
- lucide-react (ícones)

## Design system — "Industrial Warm"

- Neutros: `zinc-50 / 200 / 700 / 900`
- Accent primário: `amber-500` (capacete de obra)
- Semânticos: `emerald-600` (sucesso), `red-600` (erro), `amber-400` (aviso)
- Tipografia: Geist Sans + Geist Mono para SKUs, códigos de pedido e valores

## Requisitos

- Bun ≥ 1.1 (monorepo usa workspaces)
- Backend rodando em `http://localhost:3000` (via `docker compose up -d` + `bun run dev:backend` na raiz)

## Configuração

1. A partir da raiz do monorepo, instale as dependências:

```bash
bun install
```

2. Crie o arquivo `frontend/.env.local` a partir de `frontend/.env.example`:

```bash
cp frontend/.env.example frontend/.env.local
```

Conteúdo padrão:

```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

3. Rode backend e frontend juntos (na raiz):

```bash
bun run dev
```

Ou só o frontend:

```bash
bun run dev:frontend
```

O painel abre em `http://localhost:3001`.

## Como logar com o seed

O backend possui um seed com usuários de exemplo. O master admin é:

- **E-mail**: `master@pediobra.local`
- **Senha**: `123456`

Outros papéis disponíveis no seed (verificar `backend/src/database/seed.ts` para a lista completa):

- Vendedores (SELLER) — têm acesso à gestão de uma loja específica (OWNER) ou como funcionário (EMPLOYEE) com permissões granulares.
- Clientes (CUSTOMER) — criados pelo fluxo de registro; recebem essa role por padrão.
- Motoristas (DRIVER) — aprovação e bloqueio feitos pela tela `/drivers`.

> A tela de registro público **não** está habilitada na v1 do painel. Para testar com outras contas, use o seed ou crie-as via `POST /auth/register` e depois ajuste as roles em `/users/[id]`.

## Estado atual

- Gestão de produtos base e ofertas de loja.
- Ofertas de loja têm preço e status ativa/inativa; estoque fica como dado operacional legado e não controla compra no MVP.
- Lista de ofertas filtra por ativa/inativa/todas e permite alternar disponibilidade quando o usuário tem permissão.
- Pedidos e pagamentos já refletem o fluxo real com endereço do cliente e Stripe/PaymentSheet no app cliente.
- Painel acompanha pedidos, evidências, entregadores, pagamentos, usuários, lojas e permissões por seller.

## Estrutura do projeto

```
src/
├── app/
│   ├── (app)/                    Rotas autenticadas (Sidebar + Topbar)
│   │   ├── dashboard/
│   │   ├── orders/
│   │   ├── products/
│   │   ├── seller-products/
│   │   ├── sellers/
│   │   ├── drivers/              (admin)
│   │   ├── users/                (admin)
│   │   ├── payments/             (admin)
│   │   └── profile/
│   └── (app)/login/
├── components/
│   ├── ui/                       shadcn primitives
│   ├── data-table/               Wrapper server-side
│   ├── layout/                   sidebar, topbar, page-header
│   ├── badges/                   OrderStatus, PaymentStatus, DriverStatus, Role
│   └── forms/                    MoneyInput, …
├── hooks/                        use-auth, use-debounced-value
├── lib/
│   ├── api/                      client.ts (fetch + Bearer + refresh on 401) + services
│   ├── auth/                     store (Zustand), provider, permissions
│   ├── formatters.ts
│   ├── query-keys.ts
│   └── utils.ts
└── .env.local
```

## Autenticação

- `POST /auth/login` retorna `accessToken`, `refreshToken` e `user`
- Tokens e user ficam no `localStorage` via Zustand persist
- Em toda request autenticada, o `client.ts` injeta `Authorization: Bearer <accessToken>`
- Em 401, o client chama `POST /auth/refresh` (com dedup de refresh in-flight), atualiza o token e re-executa a request original; se o refresh falha, a sessão é limpa e o usuário volta ao `/login`
- Em F5, o `AuthProvider` chama `GET /auth/me` para revalidar e hidratar o `user` (roles, sellers, driverProfiles)

## Permissões por tela

| Tela | Regras |
| --- | --- |
| `/dashboard`, `/profile` | Toda conta autenticada |
| `/users`, `/users/[id]` | ADMIN |
| `/sellers` | ADMIN vê todas; SELLER vê só as suas |
| `/sellers/[id]` | Editar: ADMIN, OWNER da loja ou `canEditSeller` |
| `/sellers/[id]/team` | Admins e OWNER — edições feitas em `/users/[id]` |
| `/products` | Todos leem; criar/editar só ADMIN |
| `/seller-products` | Filtrado por `sellerIds` do usuário; criar/editar com `canManageSellerProducts` |
| `/orders` | ADMIN vê tudo; SELLER filtra pelos próprios sellers |
| `/orders/[id]` | FSM respeita o backend (seller: CONFIRMED/PREPARING/READY_FOR_PICKUP/CANCELLED; admin: tudo). Atribuir motorista é ADMIN-only. Evidências ficam liberadas para quem tem acesso ao pedido |
| `/drivers`, `/drivers/[id]` | ADMIN (aprovar/rejeitar/bloquear) |
| `/payments` | ADMIN (listagem e atualização de status) |

## Scripts

No diretório `frontend/`:

- `bun run dev` — Next.js em modo desenvolvimento (porta 3001)
- `bun run build` — build de produção
- `bun run start` — serve build de produção
- `bun run lint` — ESLint

Na raiz do monorepo:

- `bun run dev` — backend + frontend em paralelo
- `bun run dev:backend` / `bun run dev:frontend` — isoladamente

## Pós-MVP (fora do escopo desta v1)

- App do motorista (localização em tempo real, aceite/recusa)
- Registro público pelo painel
- Upload real de imagens (hoje usamos URLs textuais, formato aceito pela API)
- Notificações real-time
