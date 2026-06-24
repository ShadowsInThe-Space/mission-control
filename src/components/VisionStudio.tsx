'use client';
import StudioShell, { type StudioConfig } from './StudioShell';

const config: StudioConfig = {
  id: 'vision',
  label: 'Vision Studio',
  icon: 'vision',
  apiPath: '/api/studios/vision',
  capabilities: ['describe', 'ocr', 'classify', 'embed'],
  primaryField: {
    name: 'image',
    label: 'Image (URL or base64 data URI)',
    placeholder: 'https://example.com/photo.jpg  or  data:image/png;base64,iVBORw0K...',
    rows: 3,
  },
  fields: [
    {
      name: 'task',
      label: 'Task',
      type: 'select',
      defaultValue: 'describe',
      options: [
        { value: 'describe', label: 'Describe' },
        { value: 'ocr', label: 'OCR (extract text)' },
        { value: 'classify', label: 'Classify' },
        { value: 'embed', label: 'Embed (vector)' },
      ],
    },
  ],
  historyStorageKey: 'studio-vision-history',
};

export default function VisionStudio() {
  return <StudioShell config={config} />;
}
