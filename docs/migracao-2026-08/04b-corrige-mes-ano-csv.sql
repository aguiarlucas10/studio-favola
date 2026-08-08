-- ═══════════════════════════════════════════════════════════════
-- PASSO 4b — NÃO É NECESSÁRIO. NÃO RODE.
--
-- Verificado em 08/08/2026: a consulta 0.8 do diagnóstico voltou VAZIA,
-- ou seja, não existe nenhum mes_ano inválido no banco. O bug que os
-- gerava (import de CSV gravando '01/MM/DD', com o dia no lugar do ano)
-- foi corrigido no app, então não surgirão novos.
--
-- Este arquivo fica apenas como remédio, caso algum dia a consulta 0.8
-- volte a retornar linhas. Antes de rodar, confira o preview dela — os
-- UPDATEs abaixo só tocam linhas com formato inválido E data preenchida,
-- derivando o valor correto de data_pagamento.
-- ═══════════════════════════════════════════════════════════════

update entradas
set mes_ano = '01/' || to_char(data_pagamento, 'MM/YYYY')
where mes_ano is not null
  and mes_ano !~ '^(\d{1,2}/\d{1,2}/\d{4}|\d{4}-\d{2}|\d{4}/\d{2}|\d{2}/\d{4})$'
  and data_pagamento is not null;

update saidas
set mes_ano = '01/' || to_char(data_pagamento, 'MM/YYYY')
where mes_ano is not null
  and mes_ano !~ '^(\d{1,2}/\d{1,2}/\d{4}|\d{4}-\d{2}|\d{4}/\d{2}|\d{2}/\d{4})$'
  and data_pagamento is not null;
