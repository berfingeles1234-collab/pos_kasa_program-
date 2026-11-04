-- 001_init.sql — Çok müşterili POS sistemi başlangıç şeması

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enum tipleri
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'platform_admin',
    'customer_admin',
    'store_manager',
    'cashier'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sale_status AS ENUM (
    'completed',
    'cancelled',
    'refunded',
    'pending_sync'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE stock_movement_type AS ENUM (
    'sale',
    'purchase',
    'adjustment',
    'return',
    'transfer'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE license_status AS ENUM (
    'trial',
    'active',
    'suspended',
    'expired'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Yardımcı fonksiyon: updated_at otomatik güncelleme
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- customers — Kiracı / müşteri firması
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS customers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                VARCHAR(32) NOT NULL,
  name                VARCHAR(255) NOT NULL,
  tax_number          VARCHAR(20),
  tax_office          VARCHAR(100),
  email               VARCHAR(255) NOT NULL,
  phone               VARCHAR(30),
  address             TEXT,
  license_status      license_status NOT NULL DEFAULT 'trial',
  license_expires_at  TIMESTAMPTZ,
  max_stores          INT NOT NULL DEFAULT 1,
  max_users           INT NOT NULL DEFAULT 5,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT customers_code_unique UNIQUE (code),
  CONSTRAINT customers_email_unique UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_customers_license_status ON customers (license_status);
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers (is_active);

DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ---------------------------------------------------------------------------
-- stores — Mağaza / şube
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS stores (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID NOT NULL,
  code         VARCHAR(32) NOT NULL,
  name         VARCHAR(255) NOT NULL,
  address      TEXT,
  phone        VARCHAR(30),
  timezone     VARCHAR(50) NOT NULL DEFAULT 'Europe/Istanbul',
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT stores_customer_fk
    FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE RESTRICT,
  CONSTRAINT stores_customer_code_unique UNIQUE (customer_id, code)
);

CREATE INDEX IF NOT EXISTS idx_stores_customer_id ON stores (customer_id);
CREATE INDEX IF NOT EXISTS idx_stores_is_active ON stores (is_active);

DROP TRIGGER IF EXISTS trg_stores_updated_at ON stores;
CREATE TRIGGER trg_stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ---------------------------------------------------------------------------
-- users — Kullanıcılar
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id           UUID NOT NULL,
  store_id              UUID,
  username              VARCHAR(100) NOT NULL,
  password_hash         TEXT NOT NULL,
  full_name             VARCHAR(255),
  role                  user_role NOT NULL DEFAULT 'cashier',
  must_change_password  BOOLEAN NOT NULL DEFAULT true,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  last_login_at         TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT users_customer_fk
    FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE RESTRICT,
  CONSTRAINT users_store_fk
    FOREIGN KEY (store_id) REFERENCES stores (id) ON DELETE SET NULL,
  CONSTRAINT users_customer_username_unique UNIQUE (customer_id, username)
);

CREATE INDEX IF NOT EXISTS idx_users_customer_id ON users (customer_id);
CREATE INDEX IF NOT EXISTS idx_users_store_id ON users (store_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ---------------------------------------------------------------------------
-- products — Ürünler (mağaza bazlı veya merkezi katalog)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS products (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      UUID NOT NULL,
  store_id         UUID,
  barcode          VARCHAR(64) NOT NULL,
  name             VARCHAR(255) NOT NULL,
  category         VARCHAR(100),
  unit             VARCHAR(30) NOT NULL DEFAULT 'Adet',
  product_type     VARCHAR(10) NOT NULL DEFAULT 'A',
  purchase_price   NUMERIC(12, 2) NOT NULL DEFAULT 0,
  sale_price       NUMERIC(12, 2) NOT NULL,
  vat_rate         NUMERIC(5, 2) NOT NULL DEFAULT 0,
  stock_quantity   NUMERIC(12, 3) NOT NULL DEFAULT 0,
  min_stock_level  NUMERIC(12, 3) NOT NULL DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT products_customer_fk
    FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE RESTRICT,
  CONSTRAINT products_store_fk
    FOREIGN KEY (store_id) REFERENCES stores (id) ON DELETE CASCADE,
  CONSTRAINT products_sale_price_non_negative CHECK (sale_price >= 0),
  CONSTRAINT products_vat_rate_valid CHECK (vat_rate >= 0 AND vat_rate <= 100)
);

CREATE INDEX IF NOT EXISTS idx_products_customer_id ON products (customer_id);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products (store_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products (customer_id, barcode);
CREATE INDEX IF NOT EXISTS idx_products_active ON products (customer_id, is_active);

-- Merkezi katalog (store_id NULL): müşteri içinde barkod tekil
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_customer_barcode_global
  ON products (customer_id, barcode)
  WHERE store_id IS NULL;

-- Mağaza stoğu (store_id dolu): mağaza içinde barkod tekil
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_store_barcode
  ON products (customer_id, store_id, barcode)
  WHERE store_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ---------------------------------------------------------------------------
-- sales — Satış başlıkları
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sales (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      UUID NOT NULL,
  store_id         UUID NOT NULL,
  user_id          UUID NOT NULL,
  receipt_no       VARCHAR(50) NOT NULL,
  status           sale_status NOT NULL DEFAULT 'completed',
  total_amount     NUMERIC(12, 2) NOT NULL,
  item_count       INT NOT NULL,
  cash_received    NUMERIC(12, 2),
  change_amount    NUMERIC(12, 2),
  client_sale_id   UUID,
  synced_at        TIMESTAMPTZ,
  sold_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sales_customer_fk
    FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE RESTRICT,
  CONSTRAINT sales_store_fk
    FOREIGN KEY (store_id) REFERENCES stores (id) ON DELETE RESTRICT,
  CONSTRAINT sales_user_fk
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT sales_store_receipt_unique UNIQUE (store_id, receipt_no),
  CONSTRAINT sales_total_amount_non_negative CHECK (total_amount >= 0),
  CONSTRAINT sales_item_count_non_negative CHECK (item_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_sales_customer_store_sold_at
  ON sales (customer_id, store_id, sold_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales (user_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales (status);

-- Offline sync: aynı client_sale_id mağaza içinde tekrarlanamaz
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_store_client_sale_id
  ON sales (store_id, client_sale_id)
  WHERE client_sale_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- sale_items — Satış kalemleri
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sale_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID NOT NULL,
  store_id     UUID NOT NULL,
  sale_id      UUID NOT NULL,
  product_id   UUID NOT NULL,
  quantity     NUMERIC(12, 3) NOT NULL,
  unit_price   NUMERIC(12, 2) NOT NULL,
  vat_rate     NUMERIC(5, 2) NOT NULL DEFAULT 0,
  line_total   NUMERIC(12, 2) NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sale_items_customer_fk
    FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE RESTRICT,
  CONSTRAINT sale_items_store_fk
    FOREIGN KEY (store_id) REFERENCES stores (id) ON DELETE RESTRICT,
  CONSTRAINT sale_items_sale_fk
    FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE,
  CONSTRAINT sale_items_product_fk
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT,
  CONSTRAINT sale_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT sale_items_unit_price_non_negative CHECK (unit_price >= 0),
  CONSTRAINT sale_items_line_total_non_negative CHECK (line_total >= 0)
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items (sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items (product_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_customer_store ON sale_items (customer_id, store_id);

-- ---------------------------------------------------------------------------
-- stock_movements — Stok hareketleri (audit trail)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS stock_movements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      UUID NOT NULL,
  store_id         UUID NOT NULL,
  product_id       UUID NOT NULL,
  movement_type    stock_movement_type NOT NULL,
  quantity_change  NUMERIC(12, 3) NOT NULL,
  quantity_after   NUMERIC(12, 3) NOT NULL,
  reference_type   VARCHAR(50),
  reference_id     UUID,
  note             TEXT,
  user_id          UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT stock_movements_customer_fk
    FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE RESTRICT,
  CONSTRAINT stock_movements_store_fk
    FOREIGN KEY (store_id) REFERENCES stores (id) ON DELETE RESTRICT,
  CONSTRAINT stock_movements_product_fk
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT,
  CONSTRAINT stock_movements_user_fk
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product_created
  ON stock_movements (product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_movements_store_created
  ON stock_movements (store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_movements_reference
  ON stock_movements (reference_type, reference_id);

-- ---------------------------------------------------------------------------
-- app_settings — Mağaza / müşteri ayarları (JSONB)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS app_settings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID NOT NULL,
  store_id     UUID,
  setting_key  VARCHAR(100) NOT NULL,
  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_customer_fk
    FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE RESTRICT,
  CONSTRAINT app_settings_store_fk
    FOREIGN KEY (store_id) REFERENCES stores (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_app_settings_customer_id ON app_settings (customer_id);
CREATE INDEX IF NOT EXISTS idx_app_settings_store_id ON app_settings (store_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_app_settings_customer_key_global
  ON app_settings (customer_id, setting_key)
  WHERE store_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_app_settings_store_key
  ON app_settings (customer_id, store_id, setting_key)
  WHERE store_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_app_settings_updated_at ON app_settings;
CREATE TRIGGER trg_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ---------------------------------------------------------------------------
-- licenses — Lisans / aktivasyon
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS licenses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         UUID NOT NULL,
  store_id            UUID,
  license_key         VARCHAR(64) NOT NULL,
  device_fingerprint  TEXT,
  activated_at        TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT licenses_customer_fk
    FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE,
  CONSTRAINT licenses_store_fk
    FOREIGN KEY (store_id) REFERENCES stores (id) ON DELETE SET NULL,
  CONSTRAINT licenses_license_key_unique UNIQUE (license_key)
);

CREATE INDEX IF NOT EXISTS idx_licenses_customer_id ON licenses (customer_id);
CREATE INDEX IF NOT EXISTS idx_licenses_store_id ON licenses (store_id);
CREATE INDEX IF NOT EXISTS idx_licenses_is_active ON licenses (is_active);

DROP TRIGGER IF EXISTS trg_licenses_updated_at ON licenses;
CREATE TRIGGER trg_licenses_updated_at
  BEFORE UPDATE ON licenses
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ---------------------------------------------------------------------------
-- devices — Kayıtlı kasa cihazları
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS devices (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         UUID NOT NULL,
  store_id            UUID NOT NULL,
  device_name         VARCHAR(100),
  device_fingerprint  TEXT NOT NULL,
  app_version         VARCHAR(20),
  last_seen_at        TIMESTAMPTZ,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT devices_customer_fk
    FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE RESTRICT,
  CONSTRAINT devices_store_fk
    FOREIGN KEY (store_id) REFERENCES stores (id) ON DELETE RESTRICT,
  CONSTRAINT devices_customer_fingerprint_unique UNIQUE (customer_id, device_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_devices_customer_id ON devices (customer_id);
CREATE INDEX IF NOT EXISTS idx_devices_store_id ON devices (store_id);
CREATE INDEX IF NOT EXISTS idx_devices_is_active ON devices (is_active);

DROP TRIGGER IF EXISTS trg_devices_updated_at ON devices;
CREATE TRIGGER trg_devices_updated_at
  BEFORE UPDATE ON devices
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ---------------------------------------------------------------------------
-- audit_logs — Kullanıcı / sistem işlem kayıtları
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID,
  store_id     UUID,
  user_id      UUID,
  action       VARCHAR(100) NOT NULL,
  entity_type  VARCHAR(50),
  entity_id    UUID,
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address   INET,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT audit_logs_customer_fk
    FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE SET NULL,
  CONSTRAINT audit_logs_store_fk
    FOREIGN KEY (store_id) REFERENCES stores (id) ON DELETE SET NULL,
  CONSTRAINT audit_logs_user_fk
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_customer_created
  ON audit_logs (customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_store_created
  ON audit_logs (store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
