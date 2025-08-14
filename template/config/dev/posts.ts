/**
 * Seed-Daten für Beiträge (Posts).
 * Hinweis: Die profileId wird im Seeder dynamisch ergänzt, basierend auf den erstellten Profilen.
 */
export const posts = [
  {
    id: '00000000-0000-0000-0000-000000000101',
    content: 'Welcome to Omnixys! Excited to start this journey.',
    media: [],
    isArchived: false,
    profileUsername: 'admin',
    createdAt: new Date('2025-07-20T10:00:00Z'),
    updatedAt: new Date('2025-07-20T10:00:00Z'),
  },
  {
    id: '00000000-0000-0000-0000-000000000102',
    content: 'Excited to share my new project on GitHub!',
    media: ['/uploads/project-screenshot.png'],
    isArchived: false,
    profileUsername: 'admin',
    createdAt: new Date('2025-07-20T08:00:00Z'),
    updatedAt: new Date('2025-07-20T08:00:00Z'),
  },
  {
    id: '00000000-0000-0000-0000-000000000103',
    content: 'Working on a new backend feature for Omnixys.',
    media: [],
    isArchived: false,
    profileUsername: 'erik',
    createdAt: new Date('2025-07-21T09:15:00Z'),
    updatedAt: new Date('2025-07-21T09:15:00Z'),
  },
  {
    id: '00000000-0000-0000-0000-000000000104',
    content: 'Deploying microservices with Kubernetes and Helm charts!',
    media: ['/uploads/devops-diagram.png'],
    isArchived: false,
    profileUsername: 'caleb-script',
    createdAt: new Date('2025-07-22T10:30:00Z'),
    updatedAt: new Date('2025-07-22T10:30:00Z'),
  },
  {
    id: '00000000-0000-0000-0000-000000000105',
    content: 'Exploring cloud-native architectures on AWS ☁️',
    media: ['/uploads/aws-architecture.png'],
    isArchived: false,
    profileUsername: 'leroy135',
    createdAt: new Date('2025-07-22T11:00:00Z'),
    updatedAt: new Date('2025-07-22T11:00:00Z'),
  },
  {
    id: '00000000-0000-0000-0000-000000000106',
    content: 'Designing a new UI for the Omnixys dashboard 🚀',
    media: ['/uploads/ui-design.png'],
    isArchived: false,
    profileUsername: 'rae',
    createdAt: new Date('2025-07-22T12:00:00Z'),
    updatedAt: new Date('2025-07-22T12:00:00Z'),
  },
];
