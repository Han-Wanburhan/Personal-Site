CREATE TABLE items (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  category_id INT UNSIGNED  NOT NULL,
  name        VARCHAR(100)  NOT NULL,
  is_active   TINYINT(1)    NOT NULL DEFAULT 1,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_items_category_name (category_id, name),
  -- RESTRICT: hide a category with is_active = 0 instead of deleting it
  CONSTRAINT fk_items_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
