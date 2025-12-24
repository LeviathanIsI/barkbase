import { useOwnerQuery } from '@/features/owners/api';

export default function useOwner(ownerId, options = {}) {
  return useOwnerQuery(ownerId, options);
}
