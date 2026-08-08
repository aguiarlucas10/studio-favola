-- ═══════════════════════════════════════════════════════════════
-- PASSO 4b — Corrige mes_ano inválido de importações CSV antigas
-- (bug já corrigido no app: gravava '01/MM/DD' com o dia no lugar do ano).
--
-- ⚠️ Confira antes o preview da consulta 0.8 do diagnóstico — são essas
-- as linhas que serão corrigidas. SE 0.8 VOLTOU VAZIO, PULE ESTE PASSO.
--
-- Deriva o valor correto de data_pagamento; só toca linhas com formato
-- inválido E data preenchida. Pode rodar o arquivo inteiro de uma vez.
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
