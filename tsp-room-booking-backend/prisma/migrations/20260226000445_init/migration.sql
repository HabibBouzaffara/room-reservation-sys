-- CreateTable
CREATE TABLE "Hardware" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Hardware_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Software" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Software_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Hardware_name_key" ON "Hardware"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Software_name_key" ON "Software"("name");
