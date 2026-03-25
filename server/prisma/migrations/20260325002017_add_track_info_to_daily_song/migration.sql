-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DailySong" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "artist" TEXT NOT NULL DEFAULT '',
    "albumArt" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_DailySong" ("createdAt", "date", "id", "trackId") SELECT "createdAt", "date", "id", "trackId" FROM "DailySong";
DROP TABLE "DailySong";
ALTER TABLE "new_DailySong" RENAME TO "DailySong";
CREATE UNIQUE INDEX "DailySong_date_key" ON "DailySong"("date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
