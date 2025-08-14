import { UUID } from 'crypto';
import {
  OmnixysColorScheme,
  ThemeMode,
} from '../../profile/model/entity/profile-settings.model.js';

/**
 * Seed-Daten für Benutzerprofile mit info & settings.
 */

export const profiles = [
  {
    userId: '0cf39eea-c751-4856-9d08-f4c3195613ff' as UUID,
    username: 'admin',

    info: {
      headline: 'Software Engineer at Omnixys',
      location: 'Berlin, Germany',
      profileImage: '/uploads/admin.jpg',
      coverImage: '/uploads/admin-cover.jpg',
      socialLinks: [
        {
          type: 'linkedin',
          link: 'https://linkedin.com/in/admin',
        },
        {
          type: 'twitter',
          link: 'https://twitter.com/admin',
        },
        ],
        kurzprofil: "Fullstack Developer mit Fokus auf TypeScript, GraphQL und Cloud- Infrastruktur.Zielorientiert, kreativ und immer bereit für neue Herausforderungen.",
        ausbildung: [{
            abschluss: "M.SC",
            in: "Computer Science",
            wo: "Universität Stuttgart"
        }, {
                abschluss: "B.SC",
                in: "Computer Science",
                wo: "Universität Stuttgart"
            }],
        berufserfahrung: [{
            wo: "Amazon",
            als: "It-Support",
            beschreibung: "string",
            von: "03.04.09",
            bis: "03.04.15",
        }, {
                wo: "Microsoft",
                als: "lead Software engineer",
                beschreibung: "code techi",
                von: "03.04.09",
                bis: "03.04.15",
            }],
            kenntnisse: [
                'TypeScript',
                'Next.js',
                'GraphQL',
                'MongoDB',
                'Docker',
                'Kubernetes',
        ],
        sprachen: ["Deutsch", "Englisch", "Französisch"],
        },

    settings: {
      isSuspended: false,
      language: 'de',
      colorMode: 'dark' as ThemeMode,
      colorScheme: 'blue' as OmnixysColorScheme,
      showWelcomeScreen: true,
      blockedUsers: [
        {
          blockedId: '00000000-0000-0000-0000-000000000002',
          blockedUsername: 'john_doe',
          blockedAt: new Date(),
          reason: 'Spamming in comments',
        },
        {
          blockedId: '00000000-0000-0000-0000-000000000003',
          blockedUsername: 'jane_doe',
          blockedAt: new Date(),
          reason: 'Inappropriate content',
        },
      ],
    },
  },
  {
    userId: '00000000-0000-0000-0000-000000000005' as UUID,
    username: 'erik',
    info: {
      headline: 'Backend Developer',
      location: 'Hamburg, Germany',
      profileImage: '/uploads/erik.jpg',
      coverImage: '/uploads/erik-cover.jpg',
      socialLinks: [
        {
          type: 'linkedin',
          link: 'https://linkedin.com/in/admin',
        },
        {
          type: 'twitter',
          link: 'https://twitter.com/admin',
        },
        ],
        kurzprofil: "Fullstack Developer mit Fokus auf TypeScript, GraphQL und Cloud- Infrastruktur.Zielorientiert, kreativ und immer bereit für neue Herausforderungen.",
        ausbildung: [{
            abschluss: "M.SC",
            in: "Computer Science",
            wo: "Universität Stuttgart"
        }, {
            abschluss: "B.SC",
            in: "Computer Science",
            wo: "Universität Stuttgart"
        }],
        berufserfahrung: [{
            wo: "Amazon",
            als: "It-Support",
            beschreibung: "string",
            von: "03.04.09",
            bis: "03.04.15",
        }, {
            wo: "Microsoft",
            als: "lead Software engineer",
            beschreibung: "code techi",
            von: "03.04.09",
            bis: "03.04.15",
        }],
        kenntnisse: [
            'TypeScript',
            'Next.js',
            'GraphQL',
            'MongoDB',
            'Docker',
            'Kubernetes',
        ],
        sprachen: ["Deutsch", "Englisch", "Französisch"],
    },
    settings: {
      isSuspended: false,
      language: 'en',
      colorMode: 'light' as ThemeMode,
      colorScheme: 'red' as OmnixysColorScheme,
      showWelcomeScreen: false,
    },
  },
  {
    userId: '00000000-0000-0000-0000-000000000025' as UUID,
    username: 'caleb-script',
    info: {
      headline: 'Fullstack Engineer & DevOps Enthusiast',
      location: 'Paris, France',
      profileImage: '/uploads/caleb.jpg',
      coverImage: '/uploads/caleb-cover.jpg',
      socialLinks: [
        {
          type: 'linkedin',
          link: 'https://linkedin.com/in/admin',
        },
        {
          type: 'twitter',
          link: 'https://twitter.com/admin',
        },
        ],
        kurzprofil: "Fullstack Developer mit Fokus auf TypeScript, GraphQL und Cloud- Infrastruktur.Zielorientiert, kreativ und immer bereit für neue Herausforderungen.",
        ausbildung: [{
            abschluss: "M.SC",
            in: "Computer Science",
            wo: "Universität Stuttgart"
        }, {
            abschluss: "B.SC",
            in: "Computer Science",
            wo: "Universität Stuttgart"
        }],
        berufserfahrung: [{
            wo: "Amazon",
            als: "It-Support",
            beschreibung: "string",
            von: "03.04.09",
            bis: "03.04.15",
        }, {
            wo: "Microsoft",
            als: "lead Software engineer",
            beschreibung: "code techi",
            von: "03.04.09",
            bis: "03.04.15",
        }],
        kenntnisse: [
            'TypeScript',
            'Next.js',
            'GraphQL',
            'MongoDB',
            'Docker',
            'Kubernetes',
        ],
        sprachen: ["Deutsch", "Englisch", "Französisch"],
    },
    settings: {
      isSuspended: false,
      language: 'fr',
      colorMode: 'system' as ThemeMode,
      colorScheme: 'yellow' as OmnixysColorScheme,
      showWelcomeScreen: true,
    },
  },
  {
    userId: '00000000-0000-0000-0000-000000000026' as UUID,
    username: 'leroy135',
    info: {
      headline: 'Cloud Architect',
      location: 'Zurich, Switzerland',
      profileImage: '/uploads/leroy.jpg',
      coverImage: '/uploads/leroy-cover.jpg',
      socialLinks: [
        {
          type: 'linkedin',
          link: 'https://linkedin.com/in/admin',
        },
        {
          type: 'twitter',
          link: 'https://twitter.com/admin',
        },
        ],
        kurzprofil: "Fullstack Developer mit Fokus auf TypeScript, GraphQL und Cloud- Infrastruktur.Zielorientiert, kreativ und immer bereit für neue Herausforderungen.",
        ausbildung: [{
            abschluss: "M.SC",
            in: "Computer Science",
            wo: "Universität Stuttgart"
        }, {
            abschluss: "B.SC",
            in: "Computer Science",
            wo: "Universität Stuttgart"
        }],
        berufserfahrung: [{
            wo: "Amazon",
            als: "It-Support",
            beschreibung: "string",
            von: "03.04.09",
            bis: "03.04.15",
        }, {
            wo: "Microsoft",
            als: "lead Software engineer",
            beschreibung: "code techi",
            von: "03.04.09",
            bis: "03.04.15",
        }],
        kenntnisse: [
            'TypeScript',
            'Next.js',
            'GraphQL',
            'MongoDB',
            'Docker',
            'Kubernetes',
        ],
        sprachen: ["Deutsch", "Englisch", "Französisch"],
    },
    settings: {
      isSuspended: false,
      language: 'de',
      colorMode: 'dark' as ThemeMode,
      colorScheme: 'green' as OmnixysColorScheme,
      showWelcomeScreen: false,
    },
  },
  {
    userId: '00000000-0000-0000-0000-000000000001' as UUID,
    username: 'rae',
    info: {
      headline: 'Frontend Developer & Designer',
      location: 'London, UK',
      profileImage: '/uploads/rae.jpg',
      coverImage: '/uploads/rae-cover.jpg',
      socialLinks: [
        {
          type: 'linkedin',
          link: 'https://linkedin.com/in/rae',
        },
        {
          type: 'twitter',
          link: 'https://twitter.com/rae',
        },
        ],
        kurzprofil: "Fullstack Developer mit Fokus auf TypeScript, GraphQL und Cloud- Infrastruktur.Zielorientiert, kreativ und immer bereit für neue Herausforderungen.",
        ausbildung: [{
            abschluss: "M.SC",
            in: "Computer Science",
            wo: "Universität Stuttgart"
        }, {
            abschluss: "B.SC",
            in: "Computer Science",
            wo: "Universität Stuttgart"
        }],
        berufserfahrung: [{
            wo: "Amazon",
            als: "It-Support",
            beschreibung: "string",
            von: "03.04.09",
            bis: "03.04.015",
        }, {
            wo: "Microsoft",
            als: "lead Software engineer",
            beschreibung: "code techi",
            von: "03.04.09",
            bis: "03.04.15",
        }],
        kenntnisse: [
            'TypeScript',
            'Next.js',
            'GraphQL',
            'MongoDB',
            'Docker',
            'Kubernetes',
        ],
        sprachen: ["Deutsch", "Englisch", "Französisch"],
    },
    settings: {
      isSuspended: false,
      language: 'en',
      colorMode: 'light' as ThemeMode,
      colorScheme: 'original' as OmnixysColorScheme,
      showWelcomeScreen: true,
    },
  },
];
