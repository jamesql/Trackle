-- CreateTable
CREATE TABLE "DiscordDailyResult" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "score" TEXT NOT NULL,
    "guessGrid" TEXT NOT NULL,
    "won" BOOLEAN NOT NULL,
    "attempts" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DiscordReviewChannel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscordDailyResult_date_discordId_guildId_key" ON "DiscordDailyResult"("date", "discordId", "guildId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscordReviewChannel_guildId_key" ON "DiscordReviewChannel"("guildId");
