-- ================================================================
-- CLARITY LEDGER — Complete Supabase Multi-Tenant Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, email TEXT, phone TEXT, address TEXT,
  tax_id TEXT, bank_name TEXT, bank_account TEXT, bank_acc_name TEXT,
  currency TEXT DEFAULT '₦', plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE business_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'staff', name TEXT, email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, user_id)
);

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL, email TEXT, phone TEXT, address TEXT, notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL, contact_name TEXT, email TEXT, phone TEXT,
  address TEXT, bank_details TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL, unit_cost NUMERIC(15,2) DEFAULT 0,
  unit_price NUMERIC(15,2) DEFAULT 0, opening_stock INTEGER DEFAULT 0,
  reorder_level INTEGER DEFAULT 5, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  type TEXT NOT NULL, quantity INTEGER NOT NULL,
  reference_id UUID, note TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL, type TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0, category TEXT,
  receipt_url TEXT, recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id),
  date DATE DEFAULT CURRENT_DATE, due_date DATE,
  status TEXT DEFAULT 'pending',
  subtotal NUMERIC(15,2) DEFAULT 0, discount_pct NUMERIC(5,2) DEFAULT 0,
  vat_pct NUMERIC(5,2) DEFAULT 7.5, total_amount NUMERIC(15,2) DEFAULT 0,
  amount_paid NUMERIC(15,2) DEFAULT 0, notes TEXT, sales_person TEXT,
  created_by UUID REFERENCES auth.users(id), created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  description TEXT NOT NULL, quantity NUMERIC(10,2) DEFAULT 1,
  unit_price NUMERIC(15,2) DEFAULT 0,
  total NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id),
  product_id UUID REFERENCES products(id),
  date DATE DEFAULT CURRENT_DATE, quantity INTEGER NOT NULL,
  unit_cost NUMERIC(15,2) NOT NULL,
  total_cost NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  status TEXT DEFAULT 'pending', amount_paid NUMERIC(15,2) DEFAULT 0,
  due_date DATE, created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoice_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL, date DATE DEFAULT CURRENT_DATE,
  method TEXT DEFAULT 'bank_transfer', note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── VIEWS ──────────────────────────────────────────────────────
CREATE OR REPLACE VIEW monthly_pl AS
SELECT business_id,
  DATE_TRUNC('month', date) AS month,
  TO_CHAR(date, 'FMMonth YYYY') AS month_label,
  SUM(CASE WHEN type='income'  THEN amount ELSE 0 END) AS total_income,
  SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS total_expense,
  SUM(CASE WHEN type='income'  THEN amount ELSE 0 END) -
  SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS net_profit
FROM transactions
GROUP BY business_id, DATE_TRUNC('month', date), TO_CHAR(date, 'FMMonth YYYY');

CREATE OR REPLACE VIEW stock_levels AS
SELECT p.business_id, p.id AS product_id, p.name, p.unit_cost,
  p.unit_price, p.reorder_level,
  p.opening_stock + COALESCE(SUM(
    CASE WHEN sm.type='purchase' THEN sm.quantity
         WHEN sm.type='sale'     THEN -sm.quantity
         ELSE sm.quantity END), 0) AS available_stock,
  COALESCE(SUM(CASE WHEN sm.type='sale' THEN sm.quantity ELSE 0 END),0) AS total_sold
FROM products p
LEFT JOIN stock_movements sm ON sm.product_id = p.id
GROUP BY p.business_id, p.id, p.name, p.unit_cost, p.unit_price, p.reorder_level, p.opening_stock;

-- ── RLS ────────────────────────────────────────────────────────
ALTER TABLE businesses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices         ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases        ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_user_business_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER AS $$
  SELECT business_id FROM business_members WHERE user_id = auth.uid() LIMIT 1; $$;

CREATE POLICY "own"    ON businesses       FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "member_select" ON business_members FOR SELECT USING (business_id = get_user_business_id());
CREATE POLICY "member_insert" ON business_members FOR INSERT WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()) OR business_id = get_user_business_id());
CREATE POLICY "member_update" ON business_members FOR UPDATE USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "member_delete" ON business_members FOR DELETE USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "member" ON customers        FOR ALL USING (business_id = get_user_business_id());
CREATE POLICY "member" ON suppliers        FOR ALL USING (business_id = get_user_business_id());
CREATE POLICY "member" ON products         FOR ALL USING (business_id = get_user_business_id());
CREATE POLICY "member" ON stock_movements  FOR ALL USING (business_id = get_user_business_id());
CREATE POLICY "member" ON transactions     FOR ALL USING (business_id = get_user_business_id());
CREATE POLICY "member" ON invoices         FOR ALL USING (business_id = get_user_business_id());
CREATE POLICY "member" ON purchases        FOR ALL USING (business_id = get_user_business_id());
CREATE POLICY "member" ON invoice_items    FOR ALL USING (
  invoice_id IN (SELECT id FROM invoices WHERE business_id = get_user_business_id()));
CREATE POLICY "member" ON invoice_payments FOR ALL USING (
  invoice_id IN (SELECT id FROM invoices WHERE business_id = get_user_business_id()));

-- ── TRIGGERS ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_invoice_number() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE seq INTEGER;
BEGIN
  SELECT COUNT(*)+1 INTO seq FROM invoices WHERE business_id = NEW.business_id;
  NEW.invoice_number := 'INV-'||TO_CHAR(NOW(),'YYYYMMDD')||'-'||LPAD(seq::TEXT,4,'0');
  RETURN NEW;
END; $$;
CREATE TRIGGER auto_invoice_number BEFORE INSERT ON invoices
  FOR EACH ROW WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '')
  EXECUTE FUNCTION generate_invoice_number();

CREATE OR REPLACE FUNCTION sync_invoice_payment() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_total NUMERIC; v_paid NUMERIC;
BEGIN
  SELECT total_amount INTO v_total FROM invoices WHERE id = NEW.invoice_id;
  SELECT COALESCE(SUM(amount),0) INTO v_paid FROM invoice_payments WHERE invoice_id = NEW.invoice_id;
  UPDATE invoices SET amount_paid = v_paid,
    status = CASE WHEN v_paid >= v_total THEN 'paid'
                  WHEN v_paid > 0 THEN 'part_payment' ELSE 'pending' END
  WHERE id = NEW.invoice_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER sync_payment AFTER INSERT OR UPDATE ON invoice_payments
  FOR EACH ROW EXECUTE FUNCTION sync_invoice_payment();

CREATE OR REPLACE FUNCTION auto_stock_purchase() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO stock_movements(business_id,product_id,type,quantity,reference_id,note)
  VALUES(NEW.business_id,NEW.product_id,'purchase',NEW.quantity,NEW.id,'Auto: purchase');
  RETURN NEW;
END; $$;
CREATE TRIGGER purchase_stock AFTER INSERT ON purchases
  FOR EACH ROW EXECUTE FUNCTION auto_stock_purchase();

CREATE OR REPLACE FUNCTION auto_stock_sale() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_bid UUID;
BEGIN
  SELECT business_id INTO v_bid FROM invoices WHERE id = NEW.invoice_id;
  IF NEW.product_id IS NOT NULL THEN
    INSERT INTO stock_movements(business_id,product_id,type,quantity,reference_id,note)
    VALUES(v_bid,NEW.product_id,'sale',NEW.quantity::INTEGER,NEW.invoice_id,'Auto: sale');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER sale_stock AFTER INSERT ON invoice_items
  FOR EACH ROW EXECUTE FUNCTION auto_stock_sale();
