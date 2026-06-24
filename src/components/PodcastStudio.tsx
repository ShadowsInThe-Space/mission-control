'use client';
import StudioShell, { type StudioConfig } from './StudioShell';

const config: StudioConfig = {
  id: 'podcast',
  label: 'Podcast Studio',
  icon: 'podcast',
  apiPath: '/api/studios/podcast',
  capabilities: ['script', 'tts', 'mix', 'publish'],
  primaryField: {
    name: 'topic',
    label: 'Episode topic',
    placeholder: 'How small DACH agencies can win with AI agents in 2026',
    rows: 3,
  },
  fields: [
    {
      name: 'durationMinutes',
      label: 'Target duration (minutes)',
      type: 'number',
      placeholder: '15',
      defaultValue: 15,
    },
  ],
  historyStorageKey: 'studio-podcast-history',
};

export default function PodcastStudio() {
  return <StudioShell config={config} />;
}
