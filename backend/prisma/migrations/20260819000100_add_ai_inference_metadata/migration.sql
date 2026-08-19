ALTER TABLE public."ScanHistory"
ADD COLUMN "aiModelId" TEXT,
ADD COLUMN "aiConfidenceThreshold" DOUBLE PRECISION,
ADD COLUMN "aiOverlapThreshold" DOUBLE PRECISION,
ADD COLUMN "aiResponseMaskFormat" TEXT,
ADD COLUMN "inferenceTraceId" TEXT;

CREATE INDEX "ScanHistory_aiModelId_createdAt_idx"
ON public."ScanHistory" ("aiModelId", "createdAt");