-- 내 등급 화면(/account/tier)이 회원별 댓글 수를 센다. 기존 인덱스는 회차·부모
-- 기준뿐이라 user_id 로 세면 표 전체를 훑는다.
CREATE INDEX "comment_user_id_idx" ON "comment"("user_id");
