# Migração 2026-08 — passo a passo

## ✅ Estado em 08/08/2026 — SQL concluído

- [x] Diagnóstico (0.5 e 0.9 conferidas; 0.7/0.8/0.10/0.11/0.12 reportadas)
- [x] **Passo 01** — colunas de `ajustes_caixa`
- [x] **Passo 02** — allowlist
- [x] **Passo 03** — trigger de dupla aprovação
- [x] **Passo 04** — backfill do a receber legado
- [x] **Passo 05** — RPC `aprovar_ajuste`
- [ ] **Painel** — Authentication → Sign In / Providers → desativar "Allow new users to sign up"
- [ ] **Conferir no app** com a Fer antes do push

**Passo 04b: dispensado** — a consulta 0.8 voltou vazia (nenhum `mes_ano`
inválido no banco) e o bug que os gerava já foi corrigido no app. O arquivo
fica só como remédio, caso a 0.8 volte a retornar linhas algum dia.


Mesma migração de `docs/migracao-2026-08.sql`, separada em arquivos para rodar
**um de cada vez**, na ordem, no SQL Editor do Supabase
(Dashboard → projeto `cvymqbjaxtricwimusld` → SQL Editor → New query →
colar o conteúdo do arquivo → Run).

| Ordem | Arquivo | O que faz | Atenção |
|---|---|---|---|
| 1º | `00-diagnostico.sql` | Só leitura (SELECTs) | **Rode cada consulta separadamente** (selecione o bloco e Run) — rodando tudo junto só o último resultado aparece. Guarde/print os resultados. |
| 2º | `01-ajustes-caixa-colunas.sql` | Colunas de identidade em `ajustes_caixa` | **Rode.** O trigger antigo estar ativo (0.11) não prova que as colunas existem — o PL/pgSQL só resolve `new.<coluna>` em tempo de execução. É `add column if not exists`: sem efeito se já existirem. |
| 3º | `02-allowlist-rls.sql` | Só quem está em `usuarios` acessa os dados | **Antes**: confira no resultado do diagnóstico (consulta 0.9) que as DUAS sócias aparecem em `usuarios` — senão vocês mesmas perdem acesso. |
| 4º | `03-trigger-dupla-aprovacao.sql` | Blindagem da dupla aprovação no banco | Seguro; substitui o trigger antigo. |
| 5º | `04-backfill-a-receber.sql` | Cria as parcelas do saldo legado | **Só depois** de conferir com a Fer a lista da consulta 0.5 do diagnóstico. Reversível (instrução no arquivo). |
| 6º | ~~`04b-corrige-mes-ano-csv.sql`~~ | Conserta `mes_ano` inválido de CSVs antigos | **PULAR** — a consulta 0.8 voltou vazia em 08/08/2026: não há `mes_ano` inválido no banco. |
| 7º | `05-rpc-aprovar-ajuste.sql` | Aprovação atômica de ajuste | **Obrigatório**: sem ele, aprovar ajuste de caixa no app falha. |

## O que fazer com cada resultado do diagnóstico

Não precisa reportar tudo — a maioria é conferência local antes de seguir.

| Consulta | O que fazer com o resultado |
|---|---|
| 0.1 / 0.2 / 0.3 / 0.4 | Só olhar (os passos 01–03 corrigem o que for preciso de qualquer forma). |
| **0.5** | **Conferir com a Fer**: são os contratos que voltarão a ter "A Receber". Algum já está quitado? Zere o `a_receber` dele antes do passo 04. |
| 0.6 / 0.6b | Só olhar: os formatos devem ser `DD/MM/YYYY`, `MM/YYYY`, `YYYY-MM` ou `YYYY/MM`. Se aparecer algum diferente, me avise. |
| ~~0.7 / 0.7b~~ | ✅ Feito em 08/08/2026 — revelou a coluna gerada `is_retirada_automatica` (causa do bug do "Duplicar") e o UNIQUE em `contratos.numero`. `schema.sql` foi reescrito com o schema real. |
| ~~0.8~~ | ✅ Voltou vazia — **pule o passo 04b**. |
| **0.9** | **Conferir você**: as duas sócias aparecem? Se sim, pode rodar o passo 02. Se faltar alguma, me avise antes. |
| ~~0.10 / 0.11 / 0.12~~ | ✅ Feito — a coluna gerada é só `conta = 'pessoal'` (inofensiva); único trigger de negócio é o de `ajustes_caixa`; a coluna legada `projeto` está preenchida em ~99% do histórico e agora entra no vínculo lançamento↔contrato. |

## Fora do SQL (painel do Supabase)

**Authentication → Sign In / Providers → desativar "Allow new users to sign up"**,
e conferir em Authentication → Users que só existem as contas das duas sócias.

Depois de tudo: abra o app, confira que as abas carregam, e teste no console
(F12) que `await db.from('ajustes_caixa').insert({ valor_novo: 1, status: 'aprovado' })`
falha com o erro do trigger.
