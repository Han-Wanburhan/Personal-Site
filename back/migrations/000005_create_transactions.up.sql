CREATE TABLE transactions (
  id         INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  item_id    INT UNSIGNED   NOT NULL,
  amount     DECIMAL(12,2)  NOT NULL,
  txn_date   DATE           NOT NULL,
  note       VARCHAR(255)   NULL,
  created_at DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_transactions_date (txn_date),
  KEY idx_transactions_item_date (item_id, txn_date),
  CONSTRAINT fk_transactions_item FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE RESTRICT,
  CONSTRAINT chk_transactions_amount CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
