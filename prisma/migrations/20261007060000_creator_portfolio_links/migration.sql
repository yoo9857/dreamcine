ALTER TABLE "creator_application"
ADD COLUMN "additional_portfolio_urls" VARCHAR(500)[] NOT NULL DEFAULT ARRAY[]::VARCHAR(500)[];
