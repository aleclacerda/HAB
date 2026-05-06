# Habitus — App (Vite + React + TypeScript)

Inteligência imobiliária para decisões melhores. MVP focado em **Sorocaba**.

## Stack
- **Vite** (build & dev server)
- **React 18** + **TypeScript**
- CSS puro com tokens (sem framework para manter o bundle leve)

## Comandos
```bash
npm install      # instala dependências
npm run dev      # dev server em http://localhost:5173
npm run build    # build de produção em dist/
npm run preview  # preview do build
npm run lint     # type-check (tsc --noEmit)
```

## Estrutura
```
app/
├─ public/                # assets estáticos (logo, foto)
├─ src/
│  ├─ components/         # Nav, Hero, SearchPanel, OpportunityCard, etc.
│  ├─ data/               # dados mock (oportunidades, construtoras)
│  ├─ hooks/              # useSearchFilters
│  ├─ styles/global.css   # design system completo
│  ├─ types.ts
│  ├─ App.tsx
│  └─ main.tsx
├─ index.html             # entrada Vite
└─ vite.config.ts
```

## Próximos passos sugeridos
1. **Backend**: endpoint `/api/opportunities` que retorna `Opportunity[]` enriquecido com:
   - `scoreHabitus` (preço x região x construtora)
   - `valorizacaoBairro12m` (ITBI prefeitura + portais)
   - `construtora.entregasPontuais` e `reclameAquiScore`
2. **TanStack Query** para fetch + cache (`@tanstack/react-query`).
3. **Mapa interativo** (Mapbox ou Leaflet) com clustering por bairro.
4. **Comparador lado-a-lado** de até 3 imóveis com radar chart de scores.
5. **Alertas**: usuário cria filtro salvo, recebe email/push quando novo match aparecer.
