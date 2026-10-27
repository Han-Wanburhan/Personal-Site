-- Two more kinds of money besides income and expense:
--   saving     = moved to a savings account (still yours)
--   investment = moved into funds / stocks (still yours)
ALTER TABLE categories
  MODIFY type ENUM('income', 'expense', 'saving', 'investment') NOT NULL;

-- Their transactions may be negative: a withdrawal / a sale.
-- Zero is still refused. That only savings/investments go negative is checked
-- in the Go service (a CHECK constraint can't look at the category's type).
ALTER TABLE transactions
  DROP CHECK chk_transactions_amount,
  ADD CONSTRAINT chk_transactions_amount CHECK (amount <> 0);
