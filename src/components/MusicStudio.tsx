'use client';
import StudioShell, { type StudioConfig } from './StudioShell';

const config: StudioConfig = {
  id: 'music',
  label: 'Music Studio',
  icon: 'music',
  apiPath: '/api/studios/music',
  capabilities: ['generate', 'lyrics', 'instrumental'],
  primaryField: {
    name: 'prompt',
    label: 'Music prompt / lyrics seed',
    placeholder: 'Upbeat synthwave, 120 BPM, retro feel, or: [verse]\nThe city sleeps\n[chorus]\nNeon lights',
    rows: 4,
  },
  fields: [
    {
      name: 'durationSeconds',
      label: 'Duration (seconds)',
      type: 'number',
      placeholder: '30',
      defaultValue: 30,
    },
    {
      name: 'instrumental',
      label: 'Instrumental only',
      type: 'select',
      options: [
        { value: 'true', label: 'Yes' },
        { value: 'false', label: 'No (vocals ok)' },
      ],
    },
  ],
  historyStorageKey: 'studio-music-history',
};

export default function MusicStudio() {
  return <StudioShell config={config} />;
}
