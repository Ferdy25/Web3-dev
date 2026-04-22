-- CreateTable
CREATE TABLE "Institusi" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "alamat" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institusi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Siswa" (
    "id" SERIAL NOT NULL,
    "alamat" TEXT NOT NULL,
    "nis" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "institusiId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Siswa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guru" (
    "id" SERIAL NOT NULL,
    "alamat" TEXT NOT NULL,
    "nip" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "institusiId" INTEGER NOT NULL,
    "mataPelajaran" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guru_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "Institusi_nama_key" ON "Institusi"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "Siswa_alamat_key" ON "Siswa"("alamat");

-- CreateIndex
CREATE UNIQUE INDEX "Guru_alamat_key" ON "Guru"("alamat");

-- CreateIndex
CREATE UNIQUE INDEX "Guru_nip_key" ON "Guru"("nip");

-- CreateIndex
CREATE UNIQUE INDEX "Nilai_idNilai_key" ON "Nilai"("idNilai");

-- AddForeignKey
ALTER TABLE "Siswa" ADD CONSTRAINT "Siswa_institusiId_fkey" FOREIGN KEY ("institusiId") REFERENCES "Institusi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guru" ADD CONSTRAINT "Guru_institusiId_fkey" FOREIGN KEY ("institusiId") REFERENCES "Institusi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nilai" ADD CONSTRAINT "Nilai_alamatSiswa_fkey" FOREIGN KEY ("alamatSiswa") REFERENCES "Siswa"("alamat") ON DELETE RESTRICT ON UPDATE CASCADE;
