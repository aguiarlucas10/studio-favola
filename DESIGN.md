---
name: Studio Favola
description: Painel interno de gestão financeira e de projetos para um estúdio de arquitetura e interiores
colors:
  true-black: "#000000"
  ink-black: "#1a1a1a"
  paper-white: "#FFFFFF"
  canvas-cream: "#F5F2EC"
  cool-gray: "#E2DED4"
  oat: "#D6D2C4"
  warm-gray: "#716B66"
  border-gray: "#DDD9D0"
  muted-taupe: "#6A635B"
  ledger-green: "#4A7C59"
  ledger-green-tint: "#E8F2EC"
  amber-pending: "#9A7B3E"
  amber-pending-tint: "#F5EDD8"
  signal-red: "#8B3A3A"
  signal-red-tint: "#F5E8E8"
  studio-blue: "#3A5F8B"
  studio-blue-tint: "#E8EFF5"
typography:
  display:
    fontFamily: "'Libre Baskerville', serif"
    fontSize: "40px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.06em"
  headline:
    fontFamily: "'Libre Baskerville', serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0.02em"
  title:
    fontFamily: "'Libre Baskerville', serif"
    fontSize: "13-17px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "normal"
  body:
    fontFamily: "'Spartan', sans-serif"
    fontSize: "12-13px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
  label:
    fontFamily: "'Spartan', sans-serif"
    fontSize: "8-11px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.1em to 0.35em"
    textTransform: "uppercase"
rounded:
  sm: "2px"
  md: "3px"
  lg: "4px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "20px"
  xl: "28px"
components:
  button-primary:
    backgroundColor: "{colors.true-black}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.md}"
    padding: "9px 18px"
  button-primary-hover:
    backgroundColor: "{colors.ink-black}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink-black}"
    rounded: "{rounded.md}"
    padding: "9px 18px"
  badge:
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  kpi-card:
    backgroundColor: "{colors.paper-white}"
    rounded: "{rounded.md}"
    padding: "13px 14px"
  input:
    backgroundColor: "{colors.paper-white}"
    rounded: "{rounded.md}"
    padding: "9px 12px"
---

# Design System: Studio Favola

## 1. Overview

**Creative North Star: "The Ledger Atelier"**

O painel cruza dois mundos: o caderno de contas discreto (ledger) e o gosto de um ateliê de arquitetura. A base é neutra e terrosa — creme, cinza-quente, preto suave — pontuada por uma paleta semântica de status (verde para saldo positivo, âmbar para pendente, vermelho para negativo/atrasado, azul para o marcador PJ/PF) que existe para informar decisão, não para decorar. A serifada Libre Baskerville aparece só nos momentos que merecem peso — o wordmark, títulos de página, valores em dinheiro — enquanto a Spartan uppercase de rastreamento largo cobre praticamente todo o resto: navegação, rótulos, badges, cabeçalhos de tabela. Esse contraste entre serifa pontual e sans-serif miúda e espaçada é a assinatura visual do sistema.

Isso rejeita explicitamente dois caminhos: o clichê de SaaS financeiro-corporativo (azul-marinho, cinza frio, ares de banco) e o clichê de painel "gerado por IA" (gradientes, cards idênticos em grade, glassmorphism, hero-metric). A superfície é quieta de propósito — cor e peso tipográfico aparecem só onde ajudam a leitura do número.

**Key Characteristics:**
- Paleta terrosa e neutra como base; cor semântica (verde/âmbar/vermelho/azul) só para status, nunca decorativa.
- Serifa (Libre Baskerville) reservada a poucos elementos de peso; Spartan uppercase com tracking largo domina rótulos e navegação.
- Superfícies planas por padrão; hierarquia vem de contraste tipográfico e de uma borda superior colorida de 2px nos cards de KPI, não de sombra.
- Densidade alta (fonte-base de 13px, muitos rótulos de 8-9px) — otimizado para quem já conhece o domínio, não para first-time users.

## 2. Colors

A paleta é de status funcional sobre uma base neutra terrosa — não existe um "accent de marca" único; a cor comunica o estado do dado (recebido, pendente, atrasado, tipo de conta).

### Primary
- **Ink Black** (#1a1a1a): cor de ação — fundo de botões primários, texto principal, estado ativo da navegação lateral. É o que mais se aproxima de um "accent" no sistema, mas funciona como tinta, não como cor de marca.

### Secondary
- **Ledger Green** (#4A7C59): a cor mais carregada de sentido no produto — saldo em caixa, valores recebidos, resultado positivo por projeto. É a cor que a sócia mais quer ver.
- **Ledger Green Tint** (#E8F2EC): fundo dos badges "Pago"/"Ativo".

### Tertiary
- **Amber Pending** (#9A7B3E): valores a receber, status pendente, avisos (ex.: aviso de retirada automática em pagamento PF).
- **Amber Pending Tint** (#F5EDD8): fundo dos badges "A Receber"/"Pausado"/"Proposta".
- **Signal Red** (#8B3A3A): atrasos, inadimplência, exclusão. Reservado a estados que exigem atenção real.
- **Signal Red Tint** (#F5E8E8): fundo dos badges "Atrasado"/"Inadimplência" e do botão de apagar.
- **Studio Blue** (#3A5F8B): uso estreito e específico — o marcador de conta jurídica (PJ) e badges informativos.
- **Studio Blue Tint** (#E8EFF5): fundo do badge PJ e de botões secundários com acento azul (importar CSV).

### Neutral
- **Paper White** (#FFFFFF): fundo de cards, painéis, tabelas, modais — a superfície "de repouso".
- **Canvas Cream** (#F5F2EC): fundo geral do app atrás dos painéis; separa visualmente o "chão" do "papel".
- **Cool Gray** (#E2DED4): divisores dentro de painéis (cabeçalho de painel, sidebar).
- **Oat** (#D6D2C4): toques decorativos discretos (divisor do login, barra "saídas" do gráfico, avatar das sócias).
- **Warm Gray** (#716B66): a cor de texto secundário mais usada no sistema — rótulos, legendas, itens de navegação inativos.
- **Border Gray** (#DDD9D0): borda padrão de inputs, cards, painéis.
- **Muted Taupe** (#6A635B): texto ainda mais discreto que Warm Gray — sub-legendas.

### Named Rules
**The Status-Only Color Rule.** Verde, âmbar, vermelho e azul só aparecem para comunicar o estado de um dado (pago/pendente/atrasado/tipo de conta). Nenhuma cor de status decora um elemento neutro — se não há status para comunicar, o elemento é preto, branco ou cinza-quente.

## 3. Typography

**Display/Title Font:** 'Libre Baskerville', serif
**Body/Label Font:** 'Spartan', sans-serif (300-600)

**Character:** Uma serifa editorial clássica reservada para os momentos de maior peso (o wordmark, valores em dinheiro, títulos), contra uma grotesca geométrica miúda que domina o resto do sistema quase sempre em uppercase com tracking largo — o efeito é "ledger impresso": números que importam ganham serifa, o resto é etiqueta.

### Hierarchy
- **Display** (400, 40px, line-height 1): o wordmark "FAVOLA" na tela de login. Único uso desse tamanho no sistema.
- **Headline** (400, 18-20px, line-height 1.2): título de cada página (`page-header h1`) e o wordmark reduzido da sidebar.
- **Title** (400, 13-17px): valores monetários (`kpi-val`, `td-money`, `stat-val`), títulos de painel (`panel-title`), cabeçalhos de modal e drawer. É o estilo mais repetido do sistema depois do label.
- **Body** (400, 12-13px): células de tabela, linhas de sócias/drawer, texto de formulário. Sem max-width de linha definido — como é dado tabular, não prosa longa, isso é aceitável.
- **Label** (600, 8-11px, letter-spacing 0.1-0.35em, uppercase): a unidade mais usada do sistema — itens de navegação, rótulos de KPI, cabeçalhos de tabela (`th`), badges, `form-label`, botões (`btn-primary`, `btn-edit`). Em telas densas como Financeiro e RT, esse é o estilo dominante visualmente.

### Named Rules
**The Ledger Weight Rule.** Serifa aparece só em números que importam (dinheiro, títulos) e em nomes próprios (wordmark). Tudo que é estrutura, navegação ou metadado é Spartan uppercase — nunca o contrário.

## 4. Elevation

O sistema é flat por padrão: painéis, cards e tabelas se separam da superfície de fundo por uma borda de 1px (`--border`) e por contraste de cor de fundo (branco sobre creme), não por sombra. Sombra aparece só como resposta a uma interação temporária ou a uma superfície que se sobrepõe ao conteúdo: o hover de um KPI (`box-shadow:0 2px 12px rgba(0,0,0,.06)`, quase imperceptível), o drawer lateral que desliza por cima da tela (`-4px 0 24px rgba(0,0,0,.1)`) e o backdrop escurecido de modal/confirm/drawer. Isso é coerente com o tom "discreto e confiável": nada flutua sem motivo.

### Shadow Vocabulary
- **kpi-hover** (`box-shadow: 0 2px 12px rgba(0,0,0,.06)`): resposta ao hover num card de KPI clicável — convite sutil, não um "elevar" permanente.
- **drawer-overlay** (`box-shadow: -4px 0 24px rgba(0,0,0,.1)`): o painel de detalhe que desliza da direita; a única sombra estrutural do sistema, porque o drawer de fato flutua sobre o conteúdo.

### Named Rules
**The Quiet Elevation Rule.** Superfícies são planas em repouso. Sombra só existe quando algo está temporariamente por cima de outra coisa (drawer, modal) ou reagindo a um hover — nunca como decoração permanente de card.

## 5. Components

### Buttons
- **Shape:** cantos levemente arredondados (3px, `--rounded.md`).
- **Primary:** fundo preto (`#1a1a1a` em hover, `#000` implícito via `--preto`), texto branco, label uppercase 10px com tracking 0.15em, padding 9px 18px.
- **Secondary:** fundo transparente, borda `--border`, texto `--preto-soft`; hover só troca a cor da borda para `--warm-gray` — sem preencher o fundo.
- **Hover / Focus:** transições rápidas (`.2s`) de cor de fundo/borda; não há estado de foco visível customizado além do `:focus` nativo dos inputs (ponto de atenção de acessibilidade).
- **Destructivo (`btn-delete`):** outline vermelho sobre fundo transparente; preenche de vermelho sólido só no hover — a única cor "perigosa" do sistema é reservada para essa ação.

### Badges
- **Style:** fundo tintado (`*-light`) + texto na cor sólida correspondente, cantos de 2px, uppercase 9px, sem borda. Um badge nunca usa cor sólida de fundo — sempre o tint, para não competir com valores monetários (que usam a cor sólida).

### Cards / Painéis (KPI, panel, stat-card, socia-card)
- **Corner Style:** 3px, consistente em quase todo o sistema.
- **Background:** branco puro sobre o fundo creme geral — é o principal (e único) sinal de "isto é uma superfície".
- **Shadow Strategy:** nenhuma em repouso; ver seção Elevation.
- **Border:** cards de KPI e stat-card usam borda superior de 2px na cor de status (verde/âmbar/vermelho/azul/cinza) em vez de borda completa — é a principal forma de comunicar categoria num relance.
- **Internal Padding:** 13-22px conforme densidade do card.

### Inputs / Campos
- **Style:** borda 1px `--border`, fundo branco, cantos 3px, fonte Spartan 12px.
- **Focus:** borda muda para `--warm-gray` — mudança discreta de cor, sem glow, sem espessamento.
- **Error / Disabled:** erro de formulário não tem um padrão de campo (usa `alert()` nativo do navegador em quase todos os saves); `disabled` só está definido no botão de login (opacidade 0.4).

### Navegação (sidebar)
- **Style:** lista vertical de botões texto, uppercase 10px, tracking 0.08em, ícone unicode à esquerda; item ativo vira uma "pílula" preta com texto branco; hover é só uma troca de fundo para o creme geral. Sem versão mobile/colapsada — a sidebar é fixa em 200px.

### Tabelas
- **Style:** cabeçalho uppercase muted sobre fundo branco, linhas separadas por borda 1px `--bg` (quase invisível), hover de linha muda o fundo pra um branco levemente acinzentado (`#FAFAF8`). Valores monetários sempre em serifa; o resto em Spartan.

## 6. Do's and Don'ts

### Do:
- **Do** usar serifa (Libre Baskerville) só para dinheiro, títulos de página/painel e o wordmark — nunca para rótulo, navegação ou texto de tabela.
- **Do** comunicar status (pago/pendente/atrasado/tipo de conta) só com as quatro cores semânticas (verde/âmbar/vermelho/azul), sempre como badge tintado ou borda superior de 2px — nunca como cor decorativa de um elemento sem status.
- **Do** manter superfícies planas em repouso; usar sombra só em drawer, modal e hover temporário de KPI.
- **Do** manter o corpo em uppercase Spartan com tracking largo para rótulos e navegação — é a assinatura tipográfica do sistema.

### Don't:
- **Don't** usar azul-marinho, cinza frio ou qualquer estética de "app de banco" — o Studio Favola é um estúdio de arquitetura, não uma fintech (anti-referência confirmada em PRODUCT.md).
- **Don't** usar gradient text, cards idênticos em grade, glassmorphism ou layout de hero-metric — clichês de "isso parece gerado por IA" que o produto rejeita explicitamente.
- **Don't** introduzir sombra decorativa permanente em cards que hoje são planos; isso quebraria a Quiet Elevation Rule.
- **Don't** usar `border-left`/`border-right` colorido como indicador (o sistema já usa esse padrão em `.alert-pf` — está listado aqui como um ponto a revisar, não a repetir em novos componentes).
