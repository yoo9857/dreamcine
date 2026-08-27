-- T16 역할 등급 체계 (ISS-020)
--
-- PostgreSQL 16 이므로 `ALTER TYPE ... ADD VALUE` 를 트랜잭션 안에서 실행할 수
-- 있다. 같은 트랜잭션에서 새 값을 **사용**하는 것만 금지되는데, 이 마이그레이션은
-- 값을 추가만 하고 쓰지 않는다. 기존 행의 role 은 그대로 남는다 — MEMBER 는
-- 저장하지 않고 `emailVerified` 에서 유도하며, PARTNER 는 명시 부여만 가능하다.

-- CreateEnum
CREATE TYPE "MemberTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'MEMBER';
ALTER TYPE "UserRole" ADD VALUE 'PARTNER';

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "role_granted_at" TIMESTAMP(3),
ADD COLUMN     "role_granted_by" TEXT,
ADD COLUMN     "tier" "MemberTier" NOT NULL DEFAULT 'BRONZE',
ADD COLUMN     "tier_evaluated_at" TIMESTAMP(3),
ADD COLUMN     "tier_points" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "role_grant" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "from_role" "UserRole" NOT NULL,
    "to_role" "UserRole" NOT NULL,
    "granted_by" TEXT,
    "reason" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_grant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "role_grant_user_id_created_at_idx" ON "role_grant"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "role_grant_to_role_created_at_idx" ON "role_grant"("to_role", "created_at" DESC);

-- CreateIndex
CREATE INDEX "role_grant_granted_by_created_at_idx" ON "role_grant"("granted_by", "created_at" DESC);

-- CreateIndex
CREATE INDEX "user_tier_tier_points_idx" ON "user"("tier", "tier_points" DESC);

-- AddForeignKey
ALTER TABLE "role_grant" ADD CONSTRAINT "role_grant_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_grant" ADD CONSTRAINT "role_grant_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── 기존 계정의 등급 초기 산정
--
-- 전원 BRONZE 로 시작시키지 않는다. 이미 활동한 계정이 신규와 같은 등급이면
-- 등급이 "언제 가입했나" 를 뜻하게 되고, 배치가 돌기 전까지 혜택이 어긋난다.
-- 여기서는 저장된 카운터만으로 보수적으로 한 번 계산하고, 정밀 재평가는
-- `tier.reevaluate` 배치가 맡는다. 가중치는
-- `packages/core/src/rules/member-tier.ts` 의 TIER_WEIGHTS 와 같아야 한다.
-- 캐스팅은 LEAST 뒤에 온다. total_views 는 BIGINT 이므로 먼저 int 로 자르면
-- 대형 채널에서 오버플로가 난다.
UPDATE "user" SET
  "tier_points" =
      LEAST("follower_count", 50000) * 1
    + LEAST("episode_count", 1000) * 40
    + LEAST("total_views" / 100, 60000)::int * 1
    + LEAST(EXTRACT(DAY FROM (NOW() - "created_at"))::int, 3650) * 2,
  "tier_evaluated_at" = NOW()
WHERE "deleted_at" IS NULL;

UPDATE "user" SET "tier" = CASE
  WHEN "tier_points" >= 100000 THEN 'DIAMOND'::"MemberTier"
  WHEN "tier_points" >= 25000  THEN 'PLATINUM'::"MemberTier"
  WHEN "tier_points" >= 5000   THEN 'GOLD'::"MemberTier"
  WHEN "tier_points" >= 500    THEN 'SILVER'::"MemberTier"
  ELSE 'BRONZE'::"MemberTier"
END
WHERE "deleted_at" IS NULL;
