# Studio Favola — Gestão

Sistema interno de gestão financeira e de projetos do Studio Favola, um estúdio de arquitetura e interiores com duas sócias (Fernanda e Laís). App web estático (HTML/CSS/JS puro, sem build) com autenticação e banco de dados no [Supabase](https://supabase.com).

## Funcionalidades

| Página | O que faz |
|---|---|
| **Dashboard** | KPIs (caixa acumulado com ocultação, receita do mês, a receber, projetos ativos, RT pendente), gráfico de fluxo de 6 meses, custos e recebimentos dos próximos 30 dias |
| **Projetos** | Contratos com cliente, tipologia, serviço, parcelas e status; visão "Resultado p/ Projeto" com rateio de custos gerais entre projetos ativos e margem por contrato |
| **Financeiro** | Entradas e saídas, fluxo mensal com saldo acumulado, contas bancárias, e **importação de CSV do Nubank** (extrato e cartão) com classificação automática por palavras-chave |
| **RT / Comissões** | Comissões de responsabilidade técnica por fornecedor/categoria, com status a receber / pago / inadimplência |
| **Sócias** | Retiradas de lucro e pró-labore por sócia (divisão 50/50 quando "Ambas"), incluindo o espelho automático de pagamentos recebidos na conta PF |

Regras de negócio automatizadas:

- **Entrada PF paga** → cria automaticamente uma saída `[TD] {contrato}` como *retirada de lucros · Ambas* (espelho contábil, já que pagamento na conta pessoal é retirada direta). O espelho nasce quando a entrada **fica paga** — inclusive quando uma parcela "A Receber" é quitada depois (no modal ou em massa). Entradas PF pagas antes dessa automação não ganham espelho retroativo; se necessário, crie a saída manualmente.
- **RT paga em PF** → cria entrada + saída `[TD]` espelhadas.
- **Ajuste de caixa com dupla aprovação**: uma sócia solicita a conciliação com o extrato; a outra precisa aprovar no dashboard antes de o ajuste ser lançado. A identidade é validada pelo ID do usuário autenticado (Supabase Auth) — quem solicita não consegue aprovar o próprio ajuste.

## Estrutura

```
index.html          HTML das telas (login + 5 páginas, modais, drawer)
banner.png          Imagem da tela de login
css/styles.css      Todo o CSS
js/
  config.js         URL/chave do Supabase, client e helpers (fmt, esc, badge…)
  auth.js           Login, logout, sessão
  data.js           Carga das tabelas, navegação, cálculos de fluxo
  dashboard.js      Dashboard, contas bancárias e painéis de detalhe
  projetos.js       Tabela de projetos e resultado por projeto
  financeiro.js     Entradas, saídas e fluxo mensal
  rt.js             RT / comissões
  socias.js         Página das sócias
  modais.js         Modais de cadastro/edição, saves e exclusão
  bulk.js           Seleção em massa (apagar, duplicar, mudar status)
  import-csv.js     Importação de CSV do Nubank
  ajustes.js        Ajuste de caixa com dupla aprovação
  main.js           Bootstrap (checkSession)
docs/schema.sql     Esquema do banco (inferido) + migrações e RLS
```

Os arquivos em `js/` são scripts clássicos carregados em ordem no fim do `index.html` — compartilham o escopo global (necessário para os handlers `onclick` inline). Não há bundler, framework nem dependências além do CDN do supabase-js.

## Rodar localmente

Precisa de um servidor estático (abrir o arquivo direto com `file://` funciona parcialmente, mas o ideal é servir):

```bash
npx serve .
# ou
python -m http.server 8000
```

Abra `http://localhost:3000` (ou `:8000`) e faça login com um usuário cadastrado no Supabase Auth do projeto.

## Banco de dados (Supabase)

Tabelas: `usuarios`, `contratos`, `entradas`, `saidas`, `rt_comissoes`, `fluxo_caixa`, `contas_bancarias`, `ajustes_caixa` — ver [docs/schema.sql](docs/schema.sql). O esquema documentado foi **inferido do código**; valide contra o banco real antes de usá-lo para recriar algo.

**RLS**: todas as tabelas exigem usuário autenticado **e presente na tabela `usuarios`** (allowlist via política restritiva — ver `docs/migracao-2026-08.sql`, Seção 2). A chave `anon` exposta no `js/config.js` é pública por design do Supabase; a segurança vem das políticas RLS. Mantenha o *signup público desabilitado* no painel (Authentication → Sign In / Providers).

**Migração pendente ao publicar esta versão**: executar `docs/migracao-2026-08.sql` no SQL Editor do Supabase, seção por seção (diagnóstico, colunas de `ajustes_caixa`, allowlist, trigger de dupla aprovação, backfill do a receber legado, correção de `mes_ano` de CSVs antigos e a RPC `aprovar_ajuste`). **Sem a Seção 5 (RPC), aprovar ajuste de caixa retorna erro** — o app passou a aprovar via `db.rpc('aprovar_ajuste')` para a operação ser atômica.

## Deploy

É um site estático: qualquer host serve (GitHub Pages, Vercel, Netlify). Basta publicar a raiz do repositório — não há etapa de build.

## Dívidas técnicas conhecidas

- `mes_ano` é texto em formatos mistos no banco (`01/03/2026`, `2025-03`, …); `normalizaMesAno()` em `js/data.js` normaliza tudo para `MM/YYYY` em memória (a chave canônica de comparação — `mesAtual()` — usa esse mesmo formato). Migrar para uma coluna derivada de `data_pagamento` exige migração cuidadosa dos dados de produção.
- `contratos.a_receber` é coluna **legada e morta**: o app calcula o "a receber" somando as parcelas pendentes (`contratoAReceber()`); os saldos antigos viraram entradas `[Backfill saldo legado]` via migração. Não voltar a gravar nela.
- Sem responsividade mobile (sidebar fixa de 200px).
- Sem testes automatizados.
- `fluxo_caixa` existe no banco mas não é usada pelo app (a query foi removida; o fluxo é calculado em tempo real no cliente).
