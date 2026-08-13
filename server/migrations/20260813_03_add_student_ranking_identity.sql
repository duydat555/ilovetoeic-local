SET @has_family_middle_name = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'users'
      AND column_name = 'family_middle_name'
);

SET @add_family_middle_name = IF(
    @has_family_middle_name = 0,
    "ALTER TABLE users ADD COLUMN family_middle_name VARCHAR(100) NOT NULL DEFAULT '' AFTER full_name",
    'SELECT 1'
);

PREPARE add_family_middle_name_stmt FROM @add_family_middle_name;
EXECUTE add_family_middle_name_stmt;
DEALLOCATE PREPARE add_family_middle_name_stmt;
