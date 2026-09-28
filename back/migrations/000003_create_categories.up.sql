CREATE TABLE categories (
  id         INT UNSIGNED               NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED               NOT NULL,
  name       VARCHAR(100)               NOT NULL,
  type       ENUM('income', 'expense')  NOT NULL,
  is_active  TINYINT(1)                 NOT NULL DEFAULT 1,
  created_at DATETIME                   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME                   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  -- one "Food" expense category per user
  UNIQUE KEY uq_categories_user_type_name (user_id, type, name),
  CONSTRAINT fk_categories_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
