-- Habilita extensiones UUID (solo la primera vez)
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ===========================
-- Tablas principales
-- ===========================

-- Productos
create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  barcode text unique,
  description text,
  stock integer not null default 0,
  stock_inicial integer not null default 0,
  unit_of_measure text,
  administration_route text,
  notes text,
  issue_date date,
  expiration_date date,
  image_url text,
  shelf text,
  drawer text,
  section text,
  location_notes text,
  category text,           -- "Medicamentos" | "Dispositivos Médicos"
  specialty text,          -- solo se llena si categoría = Dispositivos Médicos
  reporting_unit text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by text,
  updated_by text
);

-- Movimientos de inventario
do $$
begin
  if not exists (select 1 from pg_type where typname = 'movement_type') then
    create type movement_type as enum ('entrada', 'salida', 'ajuste');
  end if;
end$$;

create table if not exists inventory_movements (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  movement_type movement_type not null,
  quantity integer not null check (quantity >= 0),
  reason text,
  notes text,
  reporting_unit text,
  recorded_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Lotes
create table if not exists product_batches (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  batch_number text not null,
  stock integer not null default 0,
  initial_stock integer not null default 0,
  issue_date date,
  expiration_date date not null,
  shelf text,
  drawer text,
  section text,
  location_notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,
  constraint uq_product_batch unique (product_id, batch_number)
);

-- Índices útiles
create index if not exists idx_products_name on products using gin (to_tsvector('spanish', name));
create index if not exists idx_products_barcode on products(barcode);
create index if not exists idx_products_deleted_at on products(deleted_at);
create index if not exists idx_batches_product on product_batches(product_id);
create index if not exists idx_batches_expiration on product_batches(expiration_date);
create index if not exists idx_movements_product on inventory_movements(product_id);
create index if not exists idx_movements_created on inventory_movements(created_at);

-- Trigger updated_at para tablas que lo usan
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at
before update on products
for each row execute procedure set_updated_at();

drop trigger if exists trg_batches_updated_at on product_batches;
create trigger trg_batches_updated_at
before update on product_batches
for each row execute procedure set_updated_at();

drop trigger if exists trg_movements_updated_at on inventory_movements;
create trigger trg_movements_updated_at
before update on inventory_movements
for each row execute procedure set_updated_at();

-- ===========================
-- Vistas que usa la app
-- ===========================

-- Resumen de stock por producto (usa el stock almacenado en products)
create or replace view product_stock_summary as
select
  p.id,
  p.name,
  p.stock_inicial,
  p.stock as stock_actual,
  p.updated_at
from products p
where p.deleted_at is null;

-- Resumen de lotes por producto
create or replace view product_batch_summary as
select
  p.id,
  p.name,
  coalesce(sum(pb.stock) filter (where pb.is_active), 0) as stock_en_lotes_activos,
  count(*) filter (where pb.is_active) as lotes_activos,
  min(pb.expiration_date) filter (where pb.is_active) as proxima_expiracion
from products p
left join product_batches pb on pb.product_id = p.id
where p.deleted_at is null
group by p.id, p.name;

-- Lotes por vencer (usada en /api/reporte/lotes-por-vencer)
create or replace view batches_expiring_soon as
select
  pb.id,
  pb.product_id,
  p.name as product_name,
  pb.batch_number,
  pb.stock,
  pb.expiration_date,
  pb.shelf,
  pb.drawer,
  pb.section,
  pb.is_active,
  pb.created_at,
  pb.updated_at,
  (pb.expiration_date - current_date) as days_until_expiration,
  case
    when pb.expiration_date < current_date then 'Vencido'
    when pb.expiration_date <= current_date + interval '7 day' then 'Crítico'
    when pb.expiration_date <= current_date + interval '15 day' then 'Alerta'
    else 'Normal'
  end as status
from product_batches pb
join products p on p.id = pb.product_id
where p.deleted_at is null;

-- ===========================
-- Datos semilla opcionales
-- ===========================

-- INSERT ejemplos mínimos (ajusta o elimina si no los quieres)
-- insert into products (name, stock, stock_inicial, category, unit_of_measure, reporting_unit)
-- values ('Producto demo', 0, 0, 'Medicamentos', 'tabletas', 'tabletas');
