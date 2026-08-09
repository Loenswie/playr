import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { pool } from './index.js';
import { saveGame } from '../services/games.js';
import type { Game } from '../types.js';

/**
 * A handful of real IGDB ids so discovery works locally before IGDB credentials
 * are configured. Safe to run repeatedly - games are upserted by external_id.
 * No users are seeded: accounts are always created through registration.
 */
const GAMES: Omit<Game, 'id'>[] = [
  {
    externalId: 113112,
    title: 'Hades',
    slug: 'hades',
    description:
      'A rogue-like dungeon crawler in which you defy the god of the dead as you hack and slash out of the Underworld.',
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co39vc.jpg',
    backgroundUrl: 'https://images.igdb.com/igdb/image/upload/t_1080p/ar9tn.jpg',
    releaseDate: '2020-09-17',
    rating: 9.1,
    genres: ['Indie', 'Role-playing (RPG)', 'Hack and slash/Beat em up'],
    platforms: ['PC', 'Switch', 'PS5', 'XSX'],
  },
  {
    externalId: 1942,
    title: 'The Witcher 3: Wild Hunt',
    slug: 'the-witcher-3-wild-hunt',
    description:
      'A story-driven open world RPG set in a visually stunning fantasy universe, full of meaningful choices and impactful consequences.',
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1wyy.jpg',
    backgroundUrl: 'https://images.igdb.com/igdb/image/upload/t_1080p/ar9dz.jpg',
    releaseDate: '2015-05-19',
    rating: 9.3,
    genres: ['Role-playing (RPG)', 'Adventure'],
    platforms: ['PC', 'PS4', 'XONE', 'Switch'],
  },
  {
    externalId: 1905,
    title: 'Fortnite',
    slug: 'fortnite',
    description: 'A survival sandbox and battle royale where the last player standing wins.',
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co2ekt.jpg',
    backgroundUrl: null,
    releaseDate: '2017-07-25',
    rating: 7.5,
    genres: ['Shooter', 'Adventure'],
    platforms: ['PC', 'PS5', 'XSX', 'Switch'],
  },
  {
    externalId: 7346,
    title: 'The Legend of Zelda: Breath of the Wild',
    slug: 'the-legend-of-zelda-breath-of-the-wild',
    description:
      'Step into a world of discovery, exploration and adventure in this open-air reinvention of the Zelda formula.',
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co3p2d.jpg',
    backgroundUrl: 'https://images.igdb.com/igdb/image/upload/t_1080p/ar8ov.jpg',
    releaseDate: '2017-03-03',
    rating: 9.4,
    genres: ['Role-playing (RPG)', 'Adventure', 'Puzzle'],
    platforms: ['Switch', 'Wii U'],
  },
  {
    externalId: 11156,
    title: 'Hollow Knight',
    slug: 'hollow-knight',
    description:
      'Forge your own path in a classic, hand-drawn 2D adventure through a vast ruined kingdom of insects and heroes.',
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1rgi.jpg',
    backgroundUrl: null,
    releaseDate: '2017-02-24',
    rating: 9.0,
    genres: ['Platform', 'Adventure', 'Indie'],
    platforms: ['PC', 'Switch', 'PS4', 'XONE'],
  },
  {
    externalId: 1877,
    title: 'Cyberpunk 2077',
    slug: 'cyberpunk-2077',
    description:
      'An open-world action-adventure story set in Night City, a megalopolis obsessed with power, glamour and body modification.',
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co7497.jpg',
    backgroundUrl: 'https://images.igdb.com/igdb/image/upload/t_1080p/ar4wo.jpg',
    releaseDate: '2020-12-10',
    rating: 8.0,
    genres: ['Shooter', 'Role-playing (RPG)', 'Adventure'],
    platforms: ['PC', 'PS5', 'XSX'],
  },
  {
    externalId: 119171,
    title: 'It Takes Two',
    slug: 'it-takes-two',
    description:
      'A genre-bending co-op platform adventure about a couple turned into dolls by a magic spell.',
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co2mvv.jpg',
    backgroundUrl: null,
    releaseDate: '2021-03-26',
    rating: 8.9,
    genres: ['Platform', 'Adventure'],
    platforms: ['PC', 'PS5', 'XSX', 'Switch'],
  },
  {
    externalId: 26192,
    title: 'Celeste',
    slug: 'celeste',
    description:
      'Help Madeline survive her inner demons on her journey to the top of Celeste Mountain in this super-tight platformer.',
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co3byy.jpg',
    backgroundUrl: null,
    releaseDate: '2018-01-25',
    rating: 8.8,
    genres: ['Platform', 'Indie'],
    platforms: ['PC', 'Switch', 'PS4', 'XONE'],
  },
  {
    externalId: 19560,
    title: 'God of War',
    slug: 'god-of-war--1',
    description:
      'His vengeance against the gods of Olympus behind him, Kratos lives as a man in the realm of Norse gods and monsters.',
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1tmu.jpg',
    backgroundUrl: 'https://images.igdb.com/igdb/image/upload/t_1080p/ar5gs.jpg',
    releaseDate: '2018-04-20',
    rating: 9.2,
    genres: ['Hack and slash/Beat em up', 'Adventure'],
    platforms: ['PS4', 'PC'],
  },
  {
    externalId: 25076,
    title: 'Red Dead Redemption 2',
    slug: 'red-dead-redemption-2',
    description:
      'An epic tale of life in America at the dawn of the modern age, following outlaw Arthur Morgan and the Van der Linde gang.',
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1q1f.jpg',
    backgroundUrl: 'https://images.igdb.com/igdb/image/upload/t_1080p/ar5r2.jpg',
    releaseDate: '2018-10-26',
    rating: 9.3,
    genres: ['Shooter', 'Adventure'],
    platforms: ['PC', 'PS4', 'XONE'],
  },
  {
    externalId: 1020,
    title: 'Grand Theft Auto V',
    slug: 'grand-theft-auto-v',
    description:
      'Three very different criminals team up for a series of heists in the city of Los Santos and Blaine County.',
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co2lbd.jpg',
    backgroundUrl: null,
    releaseDate: '2013-09-17',
    rating: 9.0,
    genres: ['Shooter', 'Racing', 'Adventure'],
    platforms: ['PC', 'PS5', 'XSX'],
  },
  {
    externalId: 121, // Minecraft
    title: 'Minecraft',
    slug: 'minecraft',
    description:
      'A sandbox game about placing blocks and going on adventures in a procedurally generated world.',
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co49x5.jpg',
    backgroundUrl: null,
    releaseDate: '2011-11-18',
    rating: 8.5,
    genres: ['Simulator', 'Adventure', 'Indie'],
    platforms: ['PC', 'Switch', 'PS4', 'XONE'],
  },
];

export async function seed(log: (message: string) => void = console.log): Promise<void> {
  for (const game of GAMES) {
    await saveGame(game);
  }
  log(`seeded ${GAMES.length} games`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  seed()
    .then(() => pool.end())
    .catch((error: unknown) => {
      console.error(error);
      process.exit(1);
    });
}
