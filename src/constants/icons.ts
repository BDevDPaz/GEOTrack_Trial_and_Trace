export const ICONS = {
  tabs: {
    home: { active: 'grid', inactive: 'grid-outline' },
    history: { active: 'time', inactive: 'time-outline' },
    report: { active: 'document-text', inactive: 'document-text-outline' },
    settings: { active: 'settings', inactive: 'settings-outline' },
  },
  system: {
    success: 'checkmark-circle-outline',
    error: 'alert-circle-outline',
    warning: 'warning-outline',
    info: 'information-circle-outline',
    close: 'close',
    back: 'chevron-back',
    forward: 'chevron-forward',
    lock: 'lock-closed',
    unlock: 'lock-open',
    location: 'location-outline',
    time: 'time-outline',
  },
} as const;
