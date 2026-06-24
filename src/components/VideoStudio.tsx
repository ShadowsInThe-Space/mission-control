'use client';
import StudioShell, { type StudioConfig } from './StudioShell';

const config: StudioConfig = {
  id: 'video',
  label: 'Video Studio',
  icon: 'video',
  apiPath: '/api/studios/video',
  capabilities: ['generate', 'edit', 'transcribe', 'render'],
  primaryField: {
    name: 'prompt',
    label: 'Prompt',
    placeholder: 'A drone shot over a misty pine forest at dawn, cinematic, slow motion',
    rows: 3,
  },
  fields: [
    {
      name: 'durationSeconds',
      label: 'Duration (seconds)',
      type: 'number',
      placeholder: '5',
      defaultValue: 5,
    },
  ],
  historyStorageKey: 'studio-video-history',
};

export default function VideoStudio() {
  return <StudioShell config={config} />;
}
