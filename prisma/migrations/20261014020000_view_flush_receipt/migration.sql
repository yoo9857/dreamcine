-- 조회 버퍼를 비운 뒤 데이터베이스에 반영하기 전에 프로세스가 죽으면 그 조회가 사라진다.
-- 청구 토큰을 남겨, 같은 버퍼를 다시 만나도 조회수를 한 번만 더하게 한다.
CREATE TABLE "view_flush_receipt" (
    "id" TEXT NOT NULL,
    "episode_id" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "view_flush_receipt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "view_flush_receipt_created_at_idx" ON "view_flush_receipt"("created_at");
