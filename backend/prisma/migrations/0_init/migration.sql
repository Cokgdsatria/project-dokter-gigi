-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('DRAFT', 'UPLOADED', 'PROCESSING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "HomebaseType" AS ENUM ('RUMAH_SAKIT', 'KLINIK', 'LAINNYA');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fullname" TEXT NOT NULL,
    "phone" TEXT,
    "position" TEXT DEFAULT 'Dokter Gigi',
    "role" TEXT NOT NULL DEFAULT 'DOKTER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "medicalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER,
    "gender" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "doctorId" TEXT NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanHistory" (
    "id" TEXT NOT NULL,
    "homebaseType" "HomebaseType" NOT NULL DEFAULT 'RUMAH_SAKIT',
    "homebaseName" TEXT NOT NULL,
    "homebaseAddress" TEXT NOT NULL,
    "diagnosisAwal" TEXT[],
    "catatanDokter" TEXT,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "imageUrl" TEXT,
    "imageObjectPath" TEXT NOT NULL,
    "imageSha256" TEXT,
    "idempotencyKey" TEXT,
    "status" "ScanStatus" NOT NULL DEFAULT 'DRAFT',
    "resultLabel" TEXT,
    "resultConfidence" DOUBLE PRECISION,
    "predictions" JSONB,
    "errorMessage" TEXT,
    "resultNumber" TEXT,
    "reportPdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "homebaseId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,

    CONSTRAINT "ScanHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Homebase" (
    "id" TEXT NOT NULL,
    "type" "HomebaseType" NOT NULL DEFAULT 'RUMAH_SAKIT',
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "doctorId" TEXT NOT NULL,

    CONSTRAINT "Homebase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedByTokenHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_doctorId_medicalId_key" ON "Patient"("doctorId", "medicalId");

-- CreateIndex
CREATE UNIQUE INDEX "ScanHistory_resultNumber_key" ON "ScanHistory"("resultNumber");

-- CreateIndex
CREATE INDEX "ScanHistory_doctorId_createdAt_idx" ON "ScanHistory"("doctorId", "createdAt");

-- CreateIndex
CREATE INDEX "ScanHistory_patientId_createdAt_idx" ON "ScanHistory"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "ScanHistory_homebaseId_createdAt_idx" ON "ScanHistory"("homebaseId", "createdAt");

-- CreateIndex
CREATE INDEX "ScanHistory_status_updatedAt_idx" ON "ScanHistory"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ScanHistory_doctorId_idempotencyKey_key" ON "ScanHistory"("doctorId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Homebase_doctorId_type_name_address_key" ON "Homebase"("doctorId", "type", "name", "address");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanHistory" ADD CONSTRAINT "ScanHistory_homebaseId_fkey" FOREIGN KEY ("homebaseId") REFERENCES "Homebase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanHistory" ADD CONSTRAINT "ScanHistory_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanHistory" ADD CONSTRAINT "ScanHistory_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homebase" ADD CONSTRAINT "Homebase_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
