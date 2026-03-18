-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('NONE', 'REQUESTED', 'RECEIVED', 'REFUNDED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "returnReceivedAt" TIMESTAMP(3),
ADD COLUMN     "returnRequestedAt" TIMESTAMP(3),
ADD COLUMN     "returnStatus" "ReturnStatus" NOT NULL DEFAULT 'NONE';
