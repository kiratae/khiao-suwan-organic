-- =============================================================================
-- Baan Tae: Khiao Suwan (บ้านเต้: เขียวสุวรรณ)
-- Supabase PostgreSQL Schema
-- =============================================================================
-- Run order: extensions → types → tables → indexes → RLS → seed data
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "moddatetime"; -- auto-update updated_at

-- ---------------------------------------------------------------------------
-- 1. Custom ENUM Types
-- ---------------------------------------------------------------------------
create type product_type as enum (
  'mangosteen',   -- มังคุด
  'durian'        -- ทุเรียนหมอนทอง
);

create type product_variant as enum (
  'ready_to_eat',    -- มังคุด: สุกพอดี พร้อมทาน
  'ripen_3_4_days',  -- มังคุด: รอสุกอีกนิด เก็บไว้แบ่งทาน
  'size_s',          -- ทุเรียน: S (3-4 kg)
  'size_m',          -- ทุเรียน: M (4-5 kg)
  'size_l'           -- ทุเรียน: L (5+ kg)
);

create type order_unit as enum (
  'kg',     -- used for mangosteen
  'pieces'  -- used for durian
);

create type order_status as enum (
  'pending',    -- รอการยืนยัน
  'confirmed',  -- ยืนยันแล้ว
  'shipped',    -- จัดส่งแล้ว
  'cancelled'   -- ยกเลิก
);

create type carrier as enum (
  'flash_express',
  'kex'
);

-- ---------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------

-- 2.1 Pre-orders ─────────────────────────────────────────────────────────────
create table pre_orders (
  id                uuid        primary key default gen_random_uuid(),

  -- Customer identity (PII)
  full_name         text        not null check (char_length(full_name) between 1 and 200),
  shipping_address  text        not null check (char_length(shipping_address) between 5 and 1000),

  -- Contact: at least one must be non-null (enforced by CHECK)
  email             text        check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone             text        check (phone ~ '^[0-9+\-\s()]{7,20}$'),
  line_id           text        check (char_length(line_id) between 1 and 100),

  -- PDPA consent — must be true before the row can be inserted
  pdpa_consent      boolean     not null default false
                                  check (pdpa_consent = true),

  -- Order lifecycle
  status            order_status not null default 'pending',
  notes             text,

  -- Shipping cost snapshot at order time (THB)
  shipping_fee_thb  numeric(10,2) not null default 0 check (shipping_fee_thb >= 0),
  packaging_fee_thb numeric(10,2) not null default 0 check (packaging_fee_thb >= 0),

  -- Timestamps
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- Enforce: at least one contact channel
  constraint contact_required check (
    email is not null
    or phone is not null
    or line_id is not null
  )
);

comment on table pre_orders is 'Customer pre-orders for Baan Tae: Khiao Suwan seasonal fruits.';
comment on column pre_orders.pdpa_consent is 'PDPA consent must be explicitly true; row cannot be inserted without it.';

-- 2.2 Order Items ─────────────────────────────────────────────────────────────
create table order_items (
  id              uuid          primary key default gen_random_uuid(),
  order_id        uuid          not null references pre_orders(id) on delete cascade,

  product_type    product_type  not null,
  variant         product_variant not null,
  unit            order_unit    not null,

  -- Quantity: kg for mangosteen, pieces for durian
  quantity        numeric(10,3) not null check (quantity > 0),

  -- Price snapshot at order time (THB / kg or per piece)
  unit_price_thb  numeric(10,2) not null check (unit_price_thb >= 0),
  subtotal_thb    numeric(10,2) generated always as (quantity * unit_price_thb) stored,

  created_at      timestamptz   not null default now(),

  -- Ensure mangosteen variants are not used with durian and vice-versa
  constraint variant_product_match check (
    (product_type = 'mangosteen' and variant in ('ready_to_eat', 'ripen_3_4_days'))
    or
    (product_type = 'durian' and variant in ('size_s', 'size_m', 'size_l'))
  ),

  -- Ensure correct unit per product
  constraint unit_product_match check (
    (product_type = 'mangosteen' and unit = 'kg')
    or
    (product_type = 'durian' and unit = 'pieces')
  )
);

comment on table order_items is 'Line items within a pre_order.';

-- 2.3 Product Prices (admin-managed) ──────────────────────────────────────────
create table product_prices (
  id              uuid          primary key default gen_random_uuid(),
  product_type    product_type  not null,
  variant         product_variant not null,

  -- THB per kg (mangosteen) or per piece (durian)
  price_thb       numeric(10,2) not null check (price_thb > 0),

  set_by          text          not null default 'admin',
  updated_at      timestamptz   not null default now(),

  -- Only one active price row per product+variant
  constraint product_prices_unique unique (product_type, variant)
);

comment on table product_prices is 'Admin-set prices. If no row exists for a variant, the app falls back to DOAE market price.';

-- 2.4 Yield Settings (admin-managed, per product per year) ────────────────────
create table yield_settings (
  id                uuid          primary key default gen_random_uuid(),
  product_type      product_type  not null,
  harvest_year      int           not null check (harvest_year between 2000 and 2100),

  -- Raw historical yield in kg (imported from CSV)
  historical_yield_kg  numeric(12,2) not null check (historical_yield_kg > 0),

  -- Bias factor applied to estimate available quota (e.g. 0.9 = conservative)
  bias_factor       numeric(4,3)  not null default 0.900
                                    check (bias_factor > 0 and bias_factor <= 1),

  -- Computed: available_quota_kg = historical_yield_kg * bias_factor (stored for performance)
  available_quota_kg  numeric(12,2) generated always as
                        (historical_yield_kg * bias_factor) stored,

  notes             text,
  updated_at        timestamptz   not null default now(),

  constraint yield_settings_unique unique (product_type, harvest_year)
);

comment on table yield_settings is 'Annual yield data with bias factor. available_quota_kg is the pre-order cap.';

-- 2.5 Shipping Rates ──────────────────────────────────────────────────────────
create table shipping_rates (
  id                  uuid      primary key default gen_random_uuid(),
  carrier             carrier   not null,

  -- Weight range in kg (inclusive lower, exclusive upper; NULL upper = open-ended)
  min_weight_kg       numeric(8,2) not null check (min_weight_kg >= 0),
  max_weight_kg       numeric(8,2) check (max_weight_kg > min_weight_kg),

  -- THB per kg within this tier
  rate_thb_per_kg     numeric(8,2) not null check (rate_thb_per_kg > 0),

  -- Fixed packaging fee added once per order (stored per carrier for reference)
  packaging_fee_thb   numeric(8,2) not null default 0 check (packaging_fee_thb >= 0),

  effective_from      date      not null default current_date,
  updated_at          timestamptz not null default now()
);

comment on table shipping_rates is 'Weight-tier rates for Flash Express and KEX. Shipping fee = avg(flash, kex) * weight + packaging.';

-- ---------------------------------------------------------------------------
-- 3. Indexes
-- ---------------------------------------------------------------------------
create index idx_pre_orders_status        on pre_orders(status);
create index idx_pre_orders_created_at    on pre_orders(created_at desc);
create index idx_order_items_order_id     on order_items(order_id);
create index idx_product_prices_variant   on product_prices(product_type, variant);
create index idx_yield_settings_product   on yield_settings(product_type, harvest_year);
create index idx_shipping_rates_carrier   on shipping_rates(carrier, min_weight_kg);

-- ---------------------------------------------------------------------------
-- 4. Auto-update updated_at via moddatetime trigger
-- ---------------------------------------------------------------------------
create trigger handle_updated_at_pre_orders
  before update on pre_orders
  for each row execute procedure moddatetime(updated_at);

create trigger handle_updated_at_product_prices
  before update on product_prices
  for each row execute procedure moddatetime(updated_at);

create trigger handle_updated_at_yield_settings
  before update on yield_settings
  for each row execute procedure moddatetime(updated_at);

create trigger handle_updated_at_shipping_rates
  before update on shipping_rates
  for each row execute procedure moddatetime(updated_at);

-- ---------------------------------------------------------------------------
-- 5. Row Level Security (RLS)
-- ---------------------------------------------------------------------------
-- Strategy:
--   • Public (anon key):  INSERT on pre_orders + order_items (submit form)
--                         SELECT on product_prices, yield_settings, shipping_rates (read-only lookups)
--   • Authenticated:      No Supabase users — admin uses service-role key server-side only.
--                         Service-role bypasses RLS entirely; no policies needed for admin paths.
-- ---------------------------------------------------------------------------

alter table pre_orders      enable row level security;
alter table order_items     enable row level security;
alter table product_prices  enable row level security;
alter table yield_settings  enable row level security;
alter table shipping_rates  enable row level security;

-- 5.1 pre_orders ──────────────────────────────────────────────────────────────

-- Anyone (anon) can insert a new pre-order (the form submission)
create policy "anon_insert_pre_orders"
  on pre_orders
  for insert
  to anon
  with check (
    -- PDPA consent must be true (belt-and-suspenders alongside the CHECK constraint)
    pdpa_consent = true
  );

-- Anon users cannot read, update, or delete their own orders (no auth)
-- Admin reads/writes via service-role key which bypasses RLS.

-- 5.2 order_items ─────────────────────────────────────────────────────────────

-- Anon can insert items only for orders they just created in the same request
-- (enforced at application layer; RLS allows insert to anon role)
create policy "anon_insert_order_items"
  on order_items
  for insert
  to anon
  with check (true);

-- 5.3 product_prices ──────────────────────────────────────────────────────────

-- Public can read prices (needed to display price on the pre-order form)
create policy "public_read_product_prices"
  on product_prices
  for select
  to anon
  using (true);

-- No INSERT/UPDATE/DELETE for anon — admin uses service-role.

-- 5.4 yield_settings ──────────────────────────────────────────────────────────

-- Public can read yield/quota info (shown on form as remaining quota)
create policy "public_read_yield_settings"
  on yield_settings
  for select
  to anon
  using (true);

-- 5.5 shipping_rates ──────────────────────────────────────────────────────────

-- Public can read shipping rates (needed for live shipping estimate on form)
create policy "public_read_shipping_rates"
  on shipping_rates
  for select
  to anon
  using (true);

-- ---------------------------------------------------------------------------
-- 6. Seed Data
-- ---------------------------------------------------------------------------

-- 6.1 Shipping rates (Flash Express & KEX — adjust to actual carrier tariffs)
insert into shipping_rates (carrier, min_weight_kg, max_weight_kg, rate_thb_per_kg, packaging_fee_thb) values
  ('flash_express', 0,    5,    25.00, 50.00),
  ('flash_express', 5,    10,   22.00, 50.00),
  ('flash_express', 10,   20,   20.00, 50.00),
  ('flash_express', 20,   null, 18.00, 50.00),
  ('kex',           0,    5,    28.00, 60.00),
  ('kex',           5,    10,   24.00, 60.00),
  ('kex',           10,   20,   21.00, 60.00),
  ('kex',           20,   null, 19.00, 60.00);

-- 6.2 Yield settings (2025 season — import actual CSV values here)
insert into yield_settings (product_type, harvest_year, historical_yield_kg, bias_factor, notes) values
  ('mangosteen', 2025, 5000.00, 0.900, 'นำเข้าจาก CSV ผลผลิตปี 2568'),
  ('durian',     2025, 3000.00, 0.900, 'นำเข้าจาก CSV ผลผลิตปี 2568');

-- 6.3 No product_prices seed — admin sets these via /admin/prices dashboard.
--     The app will fall back to DOAE market prices until admin prices are set.

-- ---------------------------------------------------------------------------
-- End of schema.sql
-- ---------------------------------------------------------------------------
