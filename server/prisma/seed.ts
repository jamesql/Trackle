import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { searchTracks } from '../src/services/spotify.js';

const prisma = new PrismaClient();

// Songs to look up via Spotify search API at seed time
const songQueries = [
  { query: 'Shape of You Ed Sheeran', genre: 'pop' },
  { query: 'Blinding Lights The Weeknd', genre: 'pop' },
  { query: 'Bohemian Rhapsody Queen', genre: 'rock' },
  { query: 'Mr. Brightside The Killers', genre: 'rock' },
  { query: 'Levitating Dua Lipa', genre: 'pop' },
  { query: 'Dancing Queen ABBA', genre: 'pop' },
  { query: 'Uptown Funk Bruno Mars', genre: 'pop' },
  { query: 'Billie Jean Michael Jackson', genre: 'pop' },
  { query: 'Believer Imagine Dragons', genre: 'rock' },
  { query: 'Cruel Summer Taylor Swift', genre: 'pop' },
  { query: 'Smells Like Teen Spirit Nirvana', genre: 'rock' },
  { query: 'Africa Toto', genre: 'rock' },
  { query: 'Happy Pharrell Williams', genre: 'pop' },
  { query: 'Radioactive Imagine Dragons', genre: 'rock' },
  { query: 'Closer Chainsmokers Halsey', genre: 'electronic' },
  { query: 'Starboy The Weeknd', genre: 'pop' },
  { query: 'Wonderwall Oasis', genre: 'rock' },
  { query: 'Watermelon Sugar Harry Styles', genre: 'pop' },
  { query: 'Take Me to Church Hozier', genre: 'indie' },
  { query: 'Shake It Off Taylor Swift', genre: 'pop' },
  { query: 'bad guy Billie Eilish', genre: 'pop' },
  { query: 'Take On Me a-ha', genre: 'pop' },
  { query: 'Dont Stop Believin Journey', genre: 'rock' },
  { query: 'Havana Camila Cabello', genre: 'pop' },
  { query: 'Counting Stars OneRepublic', genre: 'pop' },
  { query: 'Thunder Imagine Dragons', genre: 'rock' },
  { query: 'Thinking Out Loud Ed Sheeran', genre: 'pop' },
  { query: 'Circles Post Malone', genre: 'pop' },
  { query: 'Someone Like You Adele', genre: 'pop' },
  { query: 'Rolling in the Deep Adele', genre: 'pop' },
  { query: 'Lose Yourself Eminem', genre: 'hip-hop' },
  { query: 'Sweet Child O Mine Guns N Roses', genre: 'rock' },
  { query: 'Superstition Stevie Wonder', genre: 'soul' },
  { query: 'September Earth Wind Fire', genre: 'soul' },
  { query: 'Thriller Michael Jackson', genre: 'pop' },
  { query: 'Toxic Britney Spears', genre: 'pop' },
  { query: 'Umbrella Rihanna', genre: 'pop' },
  { query: 'Viva la Vida Coldplay', genre: 'rock' },
  { query: 'Clocks Coldplay', genre: 'rock' },
  { query: 'Use Somebody Kings of Leon', genre: 'rock' },
  { query: 'Seven Nation Army White Stripes', genre: 'rock' },
  { query: 'Pumped Up Kicks Foster the People', genre: 'indie' },
  { query: 'Somebody That I Used to Know Gotye', genre: 'indie' },
  { query: 'Hey Ya OutKast', genre: 'hip-hop' },
  { query: 'Feel Good Inc Gorillaz', genre: 'rock' },
  { query: 'Get Lucky Daft Punk', genre: 'electronic' },
  { query: 'Riptide Vance Joy', genre: 'indie' },
  { query: 'Royals Lorde', genre: 'pop' },
  { query: 'Ho Hey Lumineers', genre: 'indie' },
  { query: 'Dont Look Back in Anger Oasis', genre: 'rock' },
];

async function main() {
  console.log('Seeding song pool from Spotify search...');

  let seeded = 0;
  for (const { query, genre } of songQueries) {
    try {
      const results = await searchTracks(query, 1);
      if (results.length === 0) {
        console.warn(`  No results for: ${query}`);
        continue;
      }
      const track = results[0];
      await prisma.songPool.upsert({
        where: { trackId: track.trackId },
        update: {},
        create: {
          trackId: track.trackId,
          title: track.title,
          artist: track.artist,
          genre,
        },
      });
      console.log(`  ✓ ${track.title} — ${track.artist} (${track.trackId})`);
      seeded++;
    } catch (e: unknown) {
      console.warn(`  Failed: ${query}`, e instanceof Error ? e.message : e);
    }
  }

  console.log(`Seeded ${seeded} tracks.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
