/**
 * Vaccinations Feature - Demo
 * Exports vaccination components and hooks for the demo app.
 */

export { default as Vaccinations } from './routes/Vaccinations';

export {
  useExpiringVaccinationsQuery,
  usePetVaccinationsQuery,
  useRenewVaccinationMutation,
  useDeleteVaccinationMutation,
} from './api';
