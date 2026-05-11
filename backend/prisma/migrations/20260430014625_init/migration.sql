-- CreateTable
CREATE TABLE "Import" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "vendorKey" TEXT NOT NULL,
    "periodText" TEXT NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "periodWeek" INTEGER,
    "periodYear" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "rowsCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Import_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierSale" (
    "id" SERIAL NOT NULL,
    "importId" INTEGER NOT NULL,
    "vendorKey" TEXT NOT NULL,
    "supplierCode" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "factoryKey" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientSale" (
    "id" SERIAL NOT NULL,
    "importId" INTEGER NOT NULL,
    "vendorKey" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientCode" TEXT NOT NULL,
    "totalValue" DOUBLE PRECISION NOT NULL,
    "city" TEXT NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "periodYear" INTEGER NOT NULL,

    CONSTRAINT "ClientSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meta" (
    "id" SERIAL NOT NULL,
    "vendorKey" TEXT NOT NULL,
    "factoryKey" TEXT NOT NULL,
    "metaMensal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metaAnual" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Meta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Meta_vendorKey_factoryKey_key" ON "Meta"("vendorKey", "factoryKey");

-- AddForeignKey
ALTER TABLE "SupplierSale" ADD CONSTRAINT "SupplierSale_importId_fkey" FOREIGN KEY ("importId") REFERENCES "Import"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientSale" ADD CONSTRAINT "ClientSale_importId_fkey" FOREIGN KEY ("importId") REFERENCES "Import"("id") ON DELETE CASCADE ON UPDATE CASCADE;
