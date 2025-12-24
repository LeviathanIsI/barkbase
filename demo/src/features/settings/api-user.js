/**
 * Demo User Profile API
 * Provides mock user profile data for the demo.
 */

import { useQuery } from '@tanstack/react-query';

/**
 * Demo user profile for the logged-in user
 */
const demoUserProfile = {
  id: 'user-demo-001',
  email: 'sarah@happypaws.com',
  firstName: 'Sarah',
  lastName: 'Henderson',
  role: 'admin',
  propertyName: 'Happy Paws Pet Resort',
  businessName: 'Happy Paws Pet Resort',
  phone: '(555) 234-5678',
  avatar: null,
  timezone: 'America/Los_Angeles',
  notifications: {
    email: true,
    push: true,
    sms: true,
  },
};

/**
 * Fetch user profile (mock)
 */
export const useUserProfileQuery = (options = {}) => {
  return useQuery({
    queryKey: ['demo', 'user', 'profile'],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 100));
      return demoUserProfile;
    },
    staleTime: Infinity, // Profile rarely changes
    ...options,
  });
};

/**
 * Alias for compatibility
 */
export const useUserProfile = useUserProfileQuery;
