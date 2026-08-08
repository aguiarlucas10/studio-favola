-- ═══════════════════════════════════════════════════════════════
-- PASSO 1 — Colunas de identidade em ajustes_caixa
-- Seguro de rodar mesmo se já aplicado (idempotente).
-- Pode rodar o arquivo inteiro de uma vez.
-- ═══════════════════════════════════════════════════════════════

alter table ajustes_caixa add column if not exists solicitado_por_id uuid;
alter table ajustes_caixa add column if not exists aprovado_por_id   uuid;
