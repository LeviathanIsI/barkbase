// Centralized query keys used across the app
// Keys are arrays; we also export stable prefixes for setQueriesData pattern

export const qk = {
  bookings: {
    list: (params?: Record<string, unknown>) => ['bookings', 'list', params ?? {}] as const,
    id: (id: string) => ['bookings', 'id', id] as const,
    _prefix: ['bookings'] as const,
  },
  kennels: {
    list: () => ['kennels', 'list'] as const,
    _prefix: ['kennels'] as const,
  },
  tasks: {
    list: (params?: Record<string, unknown>) => ['tasks', 'list', params ?? {}] as const,
    _prefix: ['tasks'] as const,
  },
  facility: {
    occupancy: (isoDate: string) => ['facility', 'occupancy', isoDate] as const,
    _prefix: ['facility'] as const,
  },
};

export type QueryKey = ReturnType<
  typeof qk.bookings.list | typeof qk.bookings.id | typeof qk.kennels.list | typeof qk.tasks.list | typeof qk.facility.occupancy
>;


