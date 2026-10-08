// UI の一覧。vite.config.ts からも読むので React を import しない
export const UIS = [
  { id: 'cloudscape', label: 'Cloudscape', by: 'AWS' },
  { id: 'primer', label: 'Primer', by: 'GitHub' },
  { id: 'semi', label: 'Semi Design', by: 'ByteDance (Douyin)' },
  { id: 'fluent', label: 'Fluent 2', by: 'Microsoft' },
  { id: 'antd', label: 'Ant Design', by: 'Alibaba' },
  { id: 'spectrum', label: 'Spectrum 2', by: 'Adobe' },
  { id: 'amplify', label: 'Amplify UI', by: 'AWS' },
  { id: 'arco', label: 'Arco Design', by: 'ByteDance' },
] as const;
export type UiId = (typeof UIS)[number]['id'];
