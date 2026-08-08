-- ═══════════════════════════════════════════════════════════════
-- PASSO 5 — RPC de aprovação atômica. ⚠️ OBRIGATÓRIO: sem esta função,
-- aprovar ajuste de caixa no app falha (o app chama
-- db.rpc('aprovar_ajuste')).
--
-- Aprova o ajuste E lança a entrada/saída de conciliação NA MESMA
-- TRANSAÇÃO — nunca aplica duas vezes nem aprova sem lançar.
-- Pode rodar o arquivo inteiro de uma vez.
-- ═══════════════════════════════════════════════════════════════

create or replace function public.aprovar_ajuste(p_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a      ajustes_caixa%rowtype;
  v_uid  uuid := auth.uid();
  v_nome text;
  v_data date;
  v_mes  text;
begin
  if v_uid is null then
    raise exception 'Não autenticado.';
  end if;

  select * into a from ajustes_caixa where id = p_id for update;
  if not found then
    raise exception 'Ajuste não encontrado.';
  end if;
  if a.status <> 'pendente' then
    raise exception 'Este ajuste já foi decidido.';
  end if;
  if a.solicitado_por_id is not null and a.solicitado_por_id = v_uid then
    raise exception 'Quem solicitou o ajuste não pode aprová-lo.';
  end if;
  if coalesce(a.diferenca, 0) = 0 then
    raise exception 'Ajuste sem diferença a aplicar.';
  end if;

  select nome into v_nome from usuarios where id = v_uid;
  v_nome := coalesce(v_nome, 'sócia');
  -- data local de Brasília, não UTC (após as 21h o dia UTC já virou)
  v_data := coalesce(a.data_referencia, (now() at time zone 'America/Sao_Paulo')::date);
  v_mes  := '01/' || to_char(v_data, 'MM/YYYY');

  if a.diferenca > 0 then
    insert into entradas (nome_contrato, cliente, tipo_entrada, valor,
                          data_pagamento, conta, forma_pagto, status, mes_ano, obs)
    values (null, null, 'ajuste de caixa', a.diferenca,
            v_data, 'jurídica', 'Ajuste', 'Pago', v_mes,
            '[Ajuste de Caixa] ' || coalesce(a.motivo,'')
              || ' · aprovado por ' || coalesce(a.solicitado_por,'?') || ' e ' || v_nome);
  else
    insert into saidas (tipo_saida, descricao, valor, data_pagamento,
                        conta, socia, status, mes_ano, obs)
    values ('ajuste de caixa', '[Ajuste de Caixa] ' || coalesce(a.motivo,'Conciliação'),
            abs(a.diferenca), v_data, 'jurídica', 'Ambas', 'Pago', v_mes,
            'Aprovado por ' || coalesce(a.solicitado_por,'?') || ' e ' || v_nome);
  end if;

  update ajustes_caixa
  set status = 'aprovado', aprovado_por = v_nome,
      aprovado_por_id = v_uid, updated_at = now()
  where id = p_id;
end;
$$;

grant execute on function public.aprovar_ajuste(bigint) to authenticated;
revoke execute on function public.aprovar_ajuste(bigint) from anon, public;
