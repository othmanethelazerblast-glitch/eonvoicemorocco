-- CreateEnum
CREATE TYPE "ProspectInviteStatus" AS ENUM ('pending', 'submitted', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "prospect_invites" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contactName" TEXT,
    "tokenHash" TEXT NOT NULL,
    "status" "ProspectInviteStatus" NOT NULL DEFAULT 'pending',
    "submittedData" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "approvedCompanyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prospect_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "prospect_invites_tokenHash_key" ON "prospect_invites"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "prospect_invites_approvedCompanyId_key" ON "prospect_invites"("approvedCompanyId");

-- CreateIndex
CREATE INDEX "prospect_invites_organizationId_idx" ON "prospect_invites"("organizationId");

-- AddForeignKey
ALTER TABLE "prospect_invites" ADD CONSTRAINT "prospect_invites_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prospect_invites" ADD CONSTRAINT "prospect_invites_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prospect_invites" ADD CONSTRAINT "prospect_invites_approvedCompanyId_fkey" FOREIGN KEY ("approvedCompanyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
