-- ═══════════════════════════════════════════════════════════════
-- PASSO 3 — Dupla aprovação de ajuste de caixa: proteção completa.
--
-- Substitui o trigger antigo (que só rodava em UPDATE e não amarrava
-- os IDs ao usuário logado). Pode rodar o arquivo inteiro de uma vez.
--
-- Obs.: INSERT/UPDATE em ajustes_caixa direto pelo SQL Editor passa a
-- ser bloqueado (auth.uid() é nulo lá) — é intencional.
-- ═══════════════════════════════════════════════════════════════

create or replace function public.protege_ajuste_caixa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(new.status,'pendente') <> 'pendente' then
      raise exception 'Um novo ajuste deve nascer pendente.';
    end if;
    new.status := 'pendente';
    new.aprovado_por_id := null;
    if new.solicitado_por_id is null or new.solicitado_por_id is distinct from auth.uid() then
      raise exception 'O solicitante do ajuste deve ser o próprio usuário logado.';
    end if;
    return new;
  end if;

  -- UPDATE
  if new.solicitado_por_id is distinct from old.solicitado_por_id then
    raise exception 'O solicitante de um ajuste não pode ser alterado.';
  end if;
  if old.status <> 'pendente' then
    raise exception 'Um ajuste já decidido não pode ser alterado.';
  end if;
  if new.status in ('aprovado','rejeitado') then
    if new.aprovado_por_id is null or new.aprovado_por_id is distinct from auth.uid() then
      raise exception 'A decisão deve ser registrada pelo próprio usuário logado.';
    end if;
    if new.aprovado_por_id = new.solicitado_por_id then
      raise exception 'Quem solicitou o ajuste não pode aprová-lo ou rejeitá-lo.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_bloqueia_auto_aprovacao on ajustes_caixa;
drop trigger if exists trg_protege_ajuste_caixa on ajustes_caixa;
create trigger trg_protege_ajuste_caixa
  before insert or update on ajustes_caixa
  for each row execute function protege_ajuste_caixa();
