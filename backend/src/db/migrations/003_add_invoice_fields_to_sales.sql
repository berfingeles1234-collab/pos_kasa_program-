-- Fatura modu: uygulama içi fatura bilgili satış alanları
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS invoice_mode BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoice_customer_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS invoice_tax_no VARCHAR(50),
  ADD COLUMN IF NOT EXISTS invoice_tax_office VARCHAR(100),
  ADD COLUMN IF NOT EXISTS invoice_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS invoice_address TEXT,
  ADD COLUMN IF NOT EXISTS invoice_email VARCHAR(255);
