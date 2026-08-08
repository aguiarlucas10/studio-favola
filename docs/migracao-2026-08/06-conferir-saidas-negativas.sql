-- ═══════════════════════════════════════════════════════════════
-- PASSO 6 — CONFERIR (e só então corrigir) saídas com valor negativo.
--
-- Por que isso importa: o app trata `saidas.valor` como grandeza
-- POSITIVA — o caixa é calculado como (entradas pagas − saídas pagas).
-- Uma saída gravada com valor negativo, portanto, AUMENTA o caixa em vez
-- de reduzir: uma despesa de R$ 500 lançada como -500 infla o saldo em
-- R$ 500 e ainda deixa o Fluxo Mensal com "saídas" negativas.
--
-- De onde vinham: no extrato do Nubank as saídas são negativas, e a
-- importação de CSV gravava o valor cru. Já corrigido no app (agora usa
-- Math.abs), mas registros importados ANTES da correção podem estar no
-- banco com o sinal invertido.
-- ═══════════════════════════════════════════════════════════════

-- 6.1 DIAGNÓSTICO — rode primeiro. Se voltar vazio, não há nada a fazer
--     e você pode ignorar o resto deste arquivo.
select id, data_pagamento, descricao, tipo_saida, valor, status, obs
from saidas
where valor < 0
order by data_pagamento;

-- 6.2 Impacto no caixa, caso existam (o saldo está inflado nesse valor ×2:
--     uma vez por não ter descontado, outra por ter somado).
select count(*) as qtd,
       sum(abs(valor)) as total_absoluto,
       sum(abs(valor)) * 2 as caixa_inflado_em
from saidas
where valor < 0 and status = 'Pago';

-- ───────────────────────────────────────────────────────────────
-- RESULTADO EM 08/08/2026 — a 6.1 retornou 2 linhas:
--
--   id 24 | 2023-07-25 | TD Contrato Ap Grazi e André |   -167,00 | parcela 3/7
--   id 27 | 2023-08-07 | TD Contrato Ap Margareth     | -3.670,00 | parcela 1/2
--
-- Ambas são espelhos [TD] (retirada de lucros) lançados manualmente em
-- 2023 — não vieram do import de CSV. Somam R$ 3.837 com o sinal
-- trocado, o que infla o caixa em R$ 7.674 (deixa de subtrair 3.837 e
-- ainda soma 3.837).
-- ───────────────────────────────────────────────────────────────

-- 6.4 ⭐ ANTES DE CORRIGIR: as entradas que esses espelhos acompanham
--     estão com o sinal certo? Se a entrada também estiver negativa, o
--     par se comporta de outro jeito e corrigir só a saída piora a conta.
--     REPORTE O RESULTADO.
select 'entrada' as origem, id, data_pagamento, nome_contrato, projeto,
       valor, conta, status, obs
from entradas
where data_pagamento between '2023-07-01' and '2023-09-30'
  and (coalesce(nome_contrato,'') || ' ' || coalesce(projeto,'')) ~* '(Grazi|André|Andre|Margareth)'
union all
select 'saida', id, data_pagamento, nome_contrato, projeto,
       valor, conta, status, obs
from saidas
where data_pagamento between '2023-07-01' and '2023-09-30'
  and (coalesce(nome_contrato,'') || ' ' || coalesce(descricao,'')) ~* '(Grazi|André|Andre|Margareth)'
order by origem, data_pagamento;

-- 6.5 Confirmação de que não há nenhuma entrada negativa no banco
--     (o mesmo erro de sinal do outro lado). Esperado: vazio.
select id, data_pagamento, nome_contrato, valor, status, obs
from entradas
where valor < 0;

-- ───────────────────────────────────────────────────────────────
-- RESULTADO DE 6.4 E 6.5 (08/08/2026) — o problema é MAIOR que o sinal
--
--   data       entrada PF        espelho [TD]   confere?
--   25/07/23   1.833 (3/7)         -167,00      NÃO
--   07/08/23   3.900 (1/2)       -3.670,00      NÃO
--   25/08/23   1.833 (4/7)        1.833,00      sim
--   05/09/23   3.900 (2/2)           15,00      NÃO  ← nem é negativo
--   25/09/23   1.833 (5/7)        1.833,00      sim
--
-- Quando o espelho está certo, ele é IGUAL à entrada (a retirada espelha
-- o valor que caiu na conta PF). Nos três errados o valor também está
-- errado, não só o sinal — e um deles (id 41, R$ 15) nem aparecia na
-- consulta 6.1 porque é positivo.
--
-- 6.5 voltou vazia: nenhuma entrada negativa. Os valores das entradas
-- (1.833 e 3.900) são consistentes entre si e com as parcelas, então
-- são elas que estão certas.
--
-- ⚠️ POR ISSO O UPDATE ABAIXO NÃO É SUFICIENTE, e nada aqui deve ser
-- rodado antes da Fer decidir. São três cenários possíveis:
--   (a) foram retiradas PARCIAIS de propósito em 2023 → só o sinal está
--       errado nos ids 24 e 27, e o id 41 está correto;
--   (b) são erros de digitação → os três deveriam ser iguais às entradas
--       (1.833, 3.900 e 3.900);
--   (c) mistura das duas.
-- Só quem lançou sabe. O impacto no caixa é diferente em cada cenário.
-- ───────────────────────────────────────────────────────────────

-- 6.5b Todos os espelhos [TD] cujo valor NÃO bate com uma entrada PF
--      paga de mesma data — a lista completa do problema, para a Fer
--      revisar de uma vez em vez de descobrir aos poucos.
select s.id, s.data_pagamento, s.descricao, s.valor as valor_espelho,
       (select string_agg(e.valor::text, ' + ')
        from entradas e
        where e.conta = 'pessoal' and e.status = 'Pago'
          and e.data_pagamento = s.data_pagamento) as entradas_pf_do_dia
from saidas s
where s.descricao ~* '^(\[TD\]|TD )'
  and s.status = 'Pago'
  and not exists (
    select 1 from entradas e
    where e.conta = 'pessoal' and e.status = 'Pago'
      and e.data_pagamento = s.data_pagamento
      and abs(e.valor - s.valor) < 0.01
  )
order by s.data_pagamento;

-- ═══════════════════════════════════════════════════════════════
-- 6.6 CORREÇÃO — NÃO RODE ainda. Escolha o cenário com a Fer primeiro.
--     Os dois blocos estão comentados de propósito.
--
--     ⚠️ Qualquer um deles FAZ O CAIXA CAIR. Avise antes, senão a queda
--     no saldo vai parecer um problema novo.
-- ═══════════════════════════════════════════════════════════════

-- CENÁRIO (a) — foram retiradas parciais; só o sinal está errado.
--   Efeito: caixa cai R$ 7.674,00.
-- update saidas set valor = abs(valor) where id in (24, 27) and valor < 0;

-- CENÁRIO (b) — foram erros de digitação; o espelho deve igualar a entrada.
--   Efeito: caixa cai R$ 7.674,00 (sinal) + R$ 5.548,00 (diferenças) =
--           R$ 13.222,00 no total.
--   Confira os valores na tabela do comentário acima antes de rodar.
-- update saidas set valor = 1833.00 where id = 24;  -- espelha entrada 20
-- update saidas set valor = 3900.00 where id = 27;  -- espelha entrada 24
-- update saidas set valor = 3900.00 where id = 41;  -- espelha entrada 28

-- Conferência depois de rodar (nenhum valor negativo, valores esperados):
-- select id, data_pagamento, descricao, valor from saidas where id in (24,27,41);
