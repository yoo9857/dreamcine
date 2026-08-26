DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "user"
        WHERE "handle" = 'devoh'
          AND "deleted_at" IS NULL
    ) THEN
        IF EXISTS (
            SELECT 1
            FROM "user"
            WHERE "handle" = 'hanbin'
        ) THEN
            RAISE EXCEPTION 'Cannot rename @devoh: @hanbin already exists';
        END IF;

        UPDATE "user"
        SET
            "handle" = 'hanbin',
            "display_name" = '한빈',
            "bio" = '기억에 오래 남는 장면과 사람의 이야기를 만듭니다. 영화와 현실 사이, 아직 이름 붙지 않은 감정을 기록하는 크리에이터입니다.',
            "updated_at" = CURRENT_TIMESTAMP
        WHERE "handle" = 'devoh'
          AND "deleted_at" IS NULL;
    END IF;
END $$;
