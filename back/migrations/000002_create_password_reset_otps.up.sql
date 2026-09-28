CREATE TABLE password_reset_otps (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id         INT UNSIGNED  NOT NULL,
  otp_hash        VARCHAR(255)  NOT NULL,
  expiration_date DATETIME      NOT NULL,
  is_use          TINYINT(1)    NOT NULL DEFAULT 0,
  num_of_wrong    INT           NOT NULL DEFAULT 0,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_otps_user (user_id),
  CONSTRAINT fk_otps_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
