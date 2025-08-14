/**
 * Seed-Daten für Follower-Beziehungen.
 * Hinweis: followerId und followedId werden im Seeder dynamisch ergänzt.
 */
export const follows = [
  // Admin folgt Erik und Caleb
  {
    followerUsername: 'admin',
    followedUsername: 'erik',
    createdAt: new Date('2025-07-22T09:00:00Z'),
    updatedAt: new Date('2025-07-22T09:00:00Z'),
  },
  {
    followerUsername: 'admin',
    followedUsername: 'caleb-script',
    createdAt: new Date('2025-07-22T09:05:00Z'),
    updatedAt: new Date('2025-07-22T09:05:00Z'),
  },

  // Erik folgt Admin und Rae
  {
    followerUsername: 'erik',
    followedUsername: 'admin',
    createdAt: new Date('2025-07-22T09:10:00Z'),
    updatedAt: new Date('2025-07-22T09:10:00Z'),
  },
  {
    followerUsername: 'erik',
    followedUsername: 'rae',
    createdAt: new Date('2025-07-22T09:15:00Z'),
    updatedAt: new Date('2025-07-22T09:15:00Z'),
  },

  // Caleb folgt allen außer sich selbst
  {
    followerUsername: 'caleb-script',
    followedUsername: 'admin',
    createdAt: new Date('2025-07-22T09:20:00Z'),
    updatedAt: new Date('2025-07-22T09:20:00Z'),
  },
  {
    followerUsername: 'caleb-script',
    followedUsername: 'erik',
    createdAt: new Date('2025-07-22T09:25:00Z'),
    updatedAt: new Date('2025-07-22T09:25:00Z'),
  },
  {
    followerUsername: 'caleb-script',
    followedUsername: 'leroy135',
    createdAt: new Date('2025-07-22T09:30:00Z'),
    updatedAt: new Date('2025-07-22T09:30:00Z'),
  },
  {
    followerUsername: 'caleb-script',
    followedUsername: 'rae',
    createdAt: new Date('2025-07-22T09:35:00Z'),
    updatedAt: new Date('2025-07-22T09:35:00Z'),
  },

  // Leroy folgt Caleb
  {
    followerUsername: 'leroy135',
    followedUsername: 'caleb-script',
    createdAt: new Date('2025-07-22T09:40:00Z'),
    updatedAt: new Date('2025-07-22T09:40:00Z'),
  },

  // Rae folgt Admin
  {
    followerUsername: 'rae',
    followedUsername: 'admin',
    createdAt: new Date('2025-07-22T09:45:00Z'),
    updatedAt: new Date('2025-07-22T09:45:00Z'),
  },
];
