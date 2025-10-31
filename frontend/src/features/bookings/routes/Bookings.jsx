import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar, Plus, List } from 'lucide-react';
import Button from '@/components/ui/Button';
import SinglePageBookingWizard from '../components/SinglePageBookingWizard';
import VisualRunBoard from '../components/VisualRunBoard';
import BookingsOverview from './BookingsOverview';

const Bookings = () => {
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState('calendar'); // calendar, list, new
  const [showNewBooking, setShowNewBooking] = useState(searchParams.get('action') === 'new');

  // Handle booking completion
  // The wizard already handles API calls internally, we just need to close it
  const handleBookingComplete = () => {
    setShowNewBooking(false);
    setViewMode('calendar');
    // Views will automatically refresh via React Query
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings & Availability</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage reservations and facility capacity
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggles - Hidden when in New Booking mode */}
          {!showNewBooking && (
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                  viewMode === 'calendar'
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Calendar className="h-4 w-4 inline mr-1.5" />
                Run Board
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="h-4 w-4 inline mr-1.5" />
                List View
              </button>
            </div>
          )}

          {/* New Booking Button */}
          <Button onClick={() => setShowNewBooking(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Booking
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0">
        {showNewBooking ? (
          <SinglePageBookingWizard 
            onComplete={handleBookingComplete}
          />
        ) : viewMode === 'calendar' ? (
          <VisualRunBoard />
        ) : (
          <BookingsOverview />
        )}
      </div>
    </div>
  );
};

export default Bookings;
