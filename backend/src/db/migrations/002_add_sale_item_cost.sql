-- Satış anındaki alış fiyatı snapshot (geçmiş kâr raporları için)
ALTER TABLE sale_items
  ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(10, 2);

COMMENT ON COLUMN sale_items.purchase_price IS
  'Satış anındaki ürün alış fiyatı; ürün fiyatı sonradan değişse bile geçmiş kâr korunur.';
