/**
 * Pet Date Utilities
 * 
 * Shared helpers for converting between age and birthdate.
 * Used by Pets Directory (inline editing) and PetDetail.
 */

/**
 * Calculate age from a birthdate.
 * Returns the age as a number of years (integer), or null if invalid.
 * 
 * @param {string|Date|null} birthdate - ISO date string or Date object
 * @returns {number|null} Age in years, or null if birthdate is invalid
 */
export const getAgeFromBirthdate = (birthdate) => {
  if (!birthdate) return null;
  
  const birth = new Date(birthdate);
  if (isNaN(birth.getTime())) return null;
  
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  
  // Adjust if birthday hasn't occurred yet this year
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    years--;
  }
  
  return years >= 0 ? years : null;
};

/**
 * Format age for display (e.g., "3 years old" or "8 months" for < 1 year)
 * 
 * @param {string|Date|null} birthdate - ISO date string or Date object
 * @returns {string|null} Formatted age string, or null if birthdate is invalid
 */
export const formatAgeFromBirthdate = (birthdate) => {
  if (!birthdate) return null;
  
  const birth = new Date(birthdate);
  if (isNaN(birth.getTime())) return null;
  
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  
  // Adjust if birthday hasn't occurred yet this year
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    years--;
  }
  
  if (years < 1) {
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
    return `${months} months`;
  }
  
  return `${years} ${years === 1 ? 'year' : 'years'} old`;
};

/**
 * Convert an age in years to a birthdate (ISO date string).
 * Uses today's date and subtracts the given years.
 * Sets month/day to January 1st for consistency.
 * 
 * @param {number} ageYears - Age in whole years
 * @returns {string} ISO date string (YYYY-MM-DD)
 * @throws {Error} If ageYears is not a valid non-negative number
 */
export const getBirthdateFromAge = (ageYears) => {
  const numericAge = Number(ageYears);
  
  if (Number.isNaN(numericAge) || numericAge < 0) {
    throw new Error('Invalid age value');
  }
  
  const today = new Date();
  const birthYear = today.getFullYear() - Math.floor(numericAge);
  
  // Use January 1st of the calculated birth year for consistency
  const birthdate = new Date(birthYear, 0, 1);
  
  const yyyy = birthdate.getFullYear();
  const mm = String(birthdate.getMonth() + 1).padStart(2, '0');
  const dd = String(birthdate.getDate()).padStart(2, '0');
  
  return `${yyyy}-${mm}-${dd}`;
};

