'use client';
import StudioShell, { type StudioConfig } from './StudioShell';

const config: StudioConfig = {
  id: 'image',
  label: 'Image Studio',
  icon: 'image',
  apiPath: '/api/studios/image',
  capabilities: ['generate', 'edit', 'upscale', 'vision-check'],
  primaryField: {
    name: 'prompt',
    label: 'Prompt',
    placeholder: 'A vintage record store at sunset, warm light through dusty windows',
    rows: 3,
  },
  fields: [
    {
      name: 'model',
      label: 'Model',
      type: 'select',
      placeholder: 'Provider default',
      options: [
        { value: 'openai/gpt-image-1.5', label: 'OpenAI gpt-image-1.5' },
        { value: 'fal/flux-pro', label: 'FAL Flux Pro' },
        { value: 'fal/krea', label: 'FAL Krea' },
      ],
    },
    {
      name: 'size',
      label: 'Size',
      type: 'select',
      placeholder: 'Default',
      options: [
        { value: '1024x1024', label: '1024×1024 (square)' },
        { value: '1536x1024', label: '1536×1024 (landscape)' },
        { value: '1024x1536', label: '1024×1536 (portrait)' },
      ],
    },
  ],
  historyStorageKey: 'studio-image-history',
};

export default function ImageStudio() {
  return <StudioShell config={config} />;
}
