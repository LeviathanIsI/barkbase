/**
 * Incidents Page
 * Main page for incident reporting and management
 */
import { useState, useCallback } from 'react';
import IncidentList from '../components/IncidentList';
import IncidentForm from '../components/IncidentForm';
import { createIncident, updateIncident } from '../api';

export default function IncidentsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreateNew = useCallback(() => {
    setSelectedIncident(null);
    setFormOpen(true);
  }, []);

  const handleViewIncident = useCallback((incident) => {
    setSelectedIncident(incident);
    setFormOpen(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setFormOpen(false);
    setSelectedIncident(null);
  }, []);

  const handleSubmit = useCallback(async (data) => {
    try {
      setIsSubmitting(true);
      
      if (selectedIncident) {
        await updateIncident(selectedIncident.id, data);
      } else {
        await createIncident(data);
      }
      
      handleCloseForm();
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error('Failed to save incident:', err);
      alert(err.message || 'Failed to save incident report');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedIncident, handleCloseForm]);

  return (
    <div
      className="min-h-screen p-6"
      style={{ backgroundColor: 'var(--bb-color-bg-base)' }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <h1
            className="text-2xl font-bold mb-1"
            style={{ color: 'var(--bb-color-text-primary)' }}
          >
            Incident Reports
          </h1>
          <p
            className="text-sm"
            style={{ color: 'var(--bb-color-text-secondary)' }}
          >
            Document and track incidents for compliance and liability protection
          </p>
        </div>

        {/* Incident List */}
        <IncidentList
          key={refreshKey}
          onCreateNew={handleCreateNew}
          onViewIncident={handleViewIncident}
          onRefresh={() => setRefreshKey((prev) => prev + 1)}
        />

        {/* Incident Form Modal */}
        <IncidentForm
          open={formOpen}
          onClose={handleCloseForm}
          onSubmit={handleSubmit}
          incident={selectedIncident}
          isLoading={isSubmitting}
        />
      </div>
    </div>
  );
}

