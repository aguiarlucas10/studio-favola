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

-- ═══════════════════════════════════════════════════════════════
-- 6.3 CORREÇÃO — rode APENAS se 6.1 retornou linhas e você conferiu
--     que todas são de fato despesas (não estornos legítimos lançados
--     como saída negativa de propósito).
--
--     ⚠️ Isto MUDA o saldo do caixa. Confira o valor de 6.2 com a Fer
--     antes, para que ninguém estranhe a variação.
-- ═══════════════════════════════════════════════════════════════

-- update saidas set valor = abs(valor) where valor < 0;
