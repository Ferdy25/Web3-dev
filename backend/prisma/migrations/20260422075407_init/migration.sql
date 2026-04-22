-- CreateTable
CREATE TABLE "Siswa" (
    "id" SERIAL NOT NULL,
    "alamat" TEXT NOT NULL,
    "nis" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Siswa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nilai" (
    "id" TEXT NOT NULL,
    "idNilai" TEXT NOT NULL,
    "alamatSiswa" TEXT NOT NULL,
    "mapel" TEXT NOT NULL,
    "nilaiAngka" INTEGER NOT NULL,
    "predikat" TEXT NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Nilai_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Siswa_alamat_key" ON "Siswa"("alamat");

-- CreateIndex
CREATE UNIQUE INDEX "Nilai_idNilai_key" ON "Nilai"("idNilai");

-- AddForeignKey
ALTER TABLE "Nilai" ADD CONSTRAINT "Nilai_alamatSiswa_fkey" FOREIGN KEY ("alamatSiswa") REFERENCES "Siswa"("alamat") ON DELETE RESTRICT ON UPDATE CASCADE;
