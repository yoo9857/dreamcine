-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('FEMALE', 'MALE', 'NON_BINARY', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "SignupPurpose" AS ENUM ('VIEWER', 'CREATOR', 'BOTH');

-- AlterTable
ALTER TABLE "user"
ADD COLUMN "gender" "Gender",
ADD COLUMN "signup_purpose" "SignupPurpose";
