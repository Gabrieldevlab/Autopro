-- =======================================================
--  MIGRACAO — Forma de Pagamento + Relatorio por Periodo
--  Execute no SQL Editor do Supabase
--  (apenas se o banco ja estava criado antes desta atualizacao)
-- =======================================================

-- 1. Adicionar coluna de forma de pagamento na tabela de OS
alter table orders
  add column if not exists payment_method text
  check (payment_method in ('pix', 'credit', 'debit', 'cash'));

-- 2. Verificar se a coluna foi criada corretamente
select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'orders' and column_name = 'payment_method';
