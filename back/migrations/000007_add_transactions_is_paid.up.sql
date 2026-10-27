-- Tick box per transaction: has this been paid (or received) yet?
-- New transactions start unpaid; everything recorded before this migration was real, so it is marked paid.
ALTER TABLE transactions
  ADD COLUMN is_paid TINYINT(1) NOT NULL DEFAULT 0 AFTER note;

UPDATE transactions SET is_paid = 1;
