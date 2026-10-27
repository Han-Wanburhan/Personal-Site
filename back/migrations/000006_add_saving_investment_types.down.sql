-- Fails on purpose while negative amounts or saving/investment categories exist
-- (the CHECK and strict mode refuse them): move or delete those first.
ALTER TABLE transactions
  DROP CHECK chk_transactions_amount,
  ADD CONSTRAINT chk_transactions_amount CHECK (amount > 0);

ALTER TABLE categories
  MODIFY type ENUM('income', 'expense') NOT NULL;
