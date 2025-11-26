import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to fetch and cache properties for all object types
 * Used throughout the app for filters, workflows, forms, etc.
 * Uses v2 properties API exclusively.
 */
export function useProperties() {
  const [properties, setProperties] = useState({});
  const [loading, setLoading] = useState({});
  const [error, setError] = useState(null);

  /**
   * Fetch properties for a specific object type (uses v2 API)
   */
  const fetchProperties = useCallback(async (objectType) => {
    if (properties[objectType] || loading[objectType]) {
      return properties[objectType];
    }

    setLoading((prev) => ({ ...prev, [objectType]: true }));
    try {
      const response = await fetch(`/api/v2/properties?objectType=${objectType}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch properties for ${objectType}`);
      }
      const data = await response.json();
      // v2 API returns { properties: [], metadata: {...} }
      const normalized = data?.properties || data;

      setProperties((prev) => ({ ...prev, [objectType]: normalized }));
      setLoading((prev) => ({ ...prev, [objectType]: false }));

      return normalized;
    } catch (err) {
      console.error(`Error fetching properties for ${objectType}:`, err);
      setError(err.message);
      setLoading((prev) => ({ ...prev, [objectType]: false }));
      return null;
    }
  }, [properties, loading]);

  /**
   * Get flattened properties for an object type
   */
  const getPropertiesFlat = useCallback((objectType) => {
    const data = properties[objectType];
    if (!data || !data.groups) return [];

    return data.groups.flatMap((group) => group.properties || []);
  }, [properties]);

  /**
   * Get properties grouped by category
   */
  const getPropertiesGrouped = useCallback((objectType) => {
    const data = properties[objectType];
    if (!data || !data.groups) return [];

    return data.groups;
  }, [properties]);

  /**
   * Get a specific property by name
   */
  const getProperty = useCallback((objectType, propertyName) => {
    const allProperties = getPropertiesFlat(objectType);
    return allProperties.find((p) => p.name === propertyName);
  }, [getPropertiesFlat]);

  /**
   * Refresh properties for an object type
   */
  const refreshProperties = useCallback(async (objectType) => {
    setProperties((prev) => {
      const newProps = { ...prev };
      delete newProps[objectType];
      return newProps;
    });
    return fetchProperties(objectType);
  }, [fetchProperties]);

  return {
    properties,
    loading,
    error,
    fetchProperties,
    getPropertiesFlat,
    getPropertiesGrouped,
    getProperty,
    refreshProperties,
  };
}

/**
 * Hook to fetch properties for multiple object types at once
 */
export function useMultipleProperties(objectTypes = []) {
  const { fetchProperties, properties, loading } = useProperties();

  useEffect(() => {
    objectTypes.forEach((objectType) => {
      fetchProperties(objectType);
    });
  }, [objectTypes.join(','), fetchProperties]);

  const allLoading = objectTypes.some((type) => loading[type]);

  return {
    properties,
    loading: allLoading,
    fetchProperties,
  };
}
