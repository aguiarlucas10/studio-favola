# Migração 2026-08 — passo a passo

Mesma migração de `docs/migracao-2026-08.sql`, separada em arquivos para rodar
**um de cada vez**, na ordem, no SQL Editor do Supabase
(Dashboard → projeto `cvymqbjaxtricwimusld` → SQL Editor → New query →
colar o conteúdo do arquivo → Run).

| Ordem | Arquivo | O que faz | Atenção |
|---|---|---|---|
| 1º | `00-diagnostico.sql` | Só leitura (SELECTs) | **Rode cada consulta separadamente** (selecione o bloco e Run) — rodando tudo junto só o último resultado aparece. Guarde/print os resultados. |
| 2º | `01-ajustes-caixa-colunas.sql` | Colunas de identidade em `ajustes_caixa` | Seguro; idempotente. |
| 3º | `02-allowlist-rls.sql` | Só quem está em `usuarios` acessa os dados | **Antes**: confira no resultado do diagnóstico (consulta 0.9) que as DUAS sócias aparecem em `usuarios` — senão vocês mesmas perdem acesso. |
| 4º | `03-trigger-dupla-aprovacao.sql` | Blindagem da dupla aprovação no banco | Seguro; substitui o trigger antigo. |
| 5º | `04-backfill-a-receber.sql` | Cria as parcelas do saldo legado | **Só depois** de conferir com a Fer a lista da consulta 0.5 do diagnóstico. Reversível (instrução no arquivo). |
| 6º | `04b-corrige-mes-ano-csv.sql` | Conserta `mes_ano` inválido de CSVs antigos | Confira antes o preview da consulta 0.8. Se 0.8 voltou vazio, pule este arquivo. |
| 7º | `05-rpc-aprovar-ajuste.sql` | Aprovação atômica de ajuste | **Obrigatório**: sem ele, aprovar ajuste de caixa no app falha. |

Fora do SQL (painel do Supabase): **Authentication → Sign In / Providers →
desativar "Allow new users to sign up"**, e conferir em Authentication → Users
que só existem as contas das duas sócias.

Depois de tudo: abra o app, confira que as abas carregam, e teste no console
(F12) que `await db.from('ajustes_caixa').insert({ valor_novo: 1, status: 'aprovado' })`
falha com o erro do trigger.
