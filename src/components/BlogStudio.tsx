'use client';
import StudioShell, { type StudioConfig } from './StudioShell';

const config: StudioConfig = {
  id: 'blog',
  label: 'Blog Studio',
  icon: 'blog',
  apiPath: '/api/studios/blog',
  capabilities: ['outline', 'draft', 'edit', 'seo-check', 'generate'],
  primaryField: {
    name: 'topic',
    label: 'Topic',
    placeholder: 'How to choose the right AI agent stack for a 3-person agency',
    rows: 3,
  },
  fields: [
    {
      name: 'tone',
      label: 'Tone',
      type: 'select',
      defaultValue: 'editorial',
      options: [
        { value: 'editorial', label: 'Editorial' },
        { value: 'punchy', label: 'Punchy / direct' },
        { value: 'tutorial', label: 'Tutorial / how-to' },
        { value: 'analytical', label: 'Analytical / data-driven' },
      ],
    },
    {
      name: 'audience',
      label: 'Audience',
      type: 'text',
      placeholder: 'tech-savvy founders and developers',
      defaultValue: 'tech-savvy founders and developers',
    },
    {
      name: 'lengthWords',
      label: 'Target length (words)',
      type: 'number',
      placeholder: '600',
      defaultValue: 600,
    },
  ],
  historyStorageKey: 'studio-blog-history',
};

export default function BlogStudio() {
  return <StudioShell config={config} />;
}
