-- ═══════════════════════════════════════════════════════════════
-- PASSO 2 — ALLOWLIST: só quem está em `usuarios` acessa os dados.
--
-- ⚠️ PRÉ-REQUISITO: a consulta 0.9 do diagnóstico mostrou as DUAS
-- sócias em `usuarios`? Se não, insira quem falta ANTES de rodar,
-- senão vocês mesmas perdem acesso ao app.
--
-- Pode rodar o arquivo inteiro de uma vez. Idempotente.
--
-- A política RESTRICTIVE faz AND com a permissiva existente: além de
-- autenticado, o usuário precisa existir na tabela `usuarios`.
-- Complemento fora do SQL: desativar o signup público no painel
-- (Authentication → Sign In / Providers → "Allow new users to sign up").
-- ═══════════════════════════════════════════════════════════════

-- security definer: a checagem lê `usuarios` sem depender da RLS da
-- própria tabela (evita recursão de política).
create or replace function public.is_socia()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from usuarios where id = auth.uid());
$$;

grant execute on function public.is_socia() to authenticated;

do $$
declare t text;
begin
  foreach t in array array['usuarios','contratos','entradas','saidas',
                           'rt_comissoes','fluxo_caixa','contas_bancarias','ajustes_caixa']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists socia_only on %I', t);
    execute format(
      'create policy socia_only on %I as restrictive for all to authenticated using (is_socia()) with check (is_socia())', t);
  end loop;
end $$;

-- Verificação: recarregue o app logado — tudo deve continuar funcionando.
