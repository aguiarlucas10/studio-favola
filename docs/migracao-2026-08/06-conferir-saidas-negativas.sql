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

-- 6.5 Confirmação de que não há mais nenhuma entrada negativa no banco
--     (o mesmo erro de sinal do outro lado). Esperado: vazio.
select id, data_pagamento, nome_contrato, valor, status, obs
from entradas
where valor < 0;

-- ═══════════════════════════════════════════════════════════════
-- 6.6 CORREÇÃO — rode APENAS depois de conferir 6.4 e 6.5 e de alinhar
--     com a Fer que o caixa vai CAIR R$ 7.674.
--
--     Restrito aos dois ids conhecidos de propósito: um `where valor < 0`
--     genérico pegaria também qualquer estorno futuro lançado de
--     propósito como negativo.
-- ═══════════════════════════════════════════════════════════════

-- update saidas set valor = abs(valor) where id in (24, 27) and valor < 0;

-- Conferência depois de rodar (esperado: 167.00 e 3670.00, positivos):
-- select id, data_pagamento, descricao, valor from saidas where id in (24,27);
