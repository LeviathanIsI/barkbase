import { usePetQuery } from '@/features/pets/api';

export default function usePet(petId, options = {}) {
  return usePetQuery(petId, options);
}
