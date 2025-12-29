import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, CheckCircle, Bell, Command, X, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTimezoneUtils } from '@/lib/timezone';
import Button from '@/components/ui/Button';
import apiClient from '@/lib/apiClient';
import { canonicalEndpoints } from '@/lib/canonicalEndpoints';
import toast from 'react-hot-toast';
import { useUnreadNotificationsCount } from '@/features/notifications/api';

/**
 * QuickAccessBar Component
 * Provides global quick actions with keyboard shortcuts
 * Addresses research finding: "need 2-click access to any function"
 */
const QuickAccessBar = () => {
  const navigate = useNavigate();
  const tz = useTimezoneUtils();
  const searchInputRef = useRef(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ pets: [], owners: [], bookings: [] });
  const [isSearching, setIsSearching] = useState(false);

  // Fetch unread notification count from backend
  const { data: notificationCount = 0 } = useUnreadNotificationsCount();

  // Global search function
  const performSearch = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults({ pets: [], owners: [], bookings: [] });
      return;
    }

    setIsSearching(true);
    try {
      const normalizeList = (response) => {
        if (!response) return [];
        if (Array.isArray(response.data)) return response.data;
        if (Array.isArray(response.data?.data)) return response.data.data;
        return [];
      };

      // Search across pets, owners, and bookings
      const [petsResponse, ownersResponse, bookingsResponse] = await Promise.all([
        apiClient.get(canonicalEndpoints.pets.list, { params: { search: query, limit: 5 } }).catch(() => ({ data: [] })),
        apiClient.get(canonicalEndpoints.owners.list, { params: { search: query, limit: 5 } }).catch(() => ({ data: [] })),
        apiClient.get(canonicalEndpoints.bookings.list, { params: { search: query, limit: 5 } }).catch(() => ({ data: [] }))
      ]);

      setSearchResults({
        pets: normalizeList(petsResponse),
        owners: normalizeList(ownersResponse),
        bookings: normalizeList(bookingsResponse),
      });
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        performSearch(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd+K or Ctrl+K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }

      // Escape to close search
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
        setSearchQuery('');
        setSearchResults({ pets: [], owners: [], bookings: [] });
      }

      // Quick shortcuts (when not in input)
      if (!e.target.matches('input, textarea')) {
        // C for check-in
        if (e.key === 'c' && !e.metaKey && !e.ctrlKey) {
          navigate('/bookings?view=checkin');
        }

        // B for new booking
        if (e.key === 'b' && !e.metaKey && !e.ctrlKey) {
          navigate('/bookings?action=new');
        }

        // N for notifications
        if (e.key === 'n' && !e.metaKey && !e.ctrlKey) {
          navigate('/notifications');
        }

        // / for search (slash key)
        if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          setSearchOpen(true);
          setTimeout(() => searchInputRef.current?.focus(), 100);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen, navigate]);

  const navigateToResult = (type, item) => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults({ pets: [], owners: [], bookings: [] });

    switch (type) {
      case 'pet':
        navigate(`/pets/${item.id || item.recordId}`);
        break;
      case 'owner':
        navigate(`/owners/${item.id || item.recordId}`);
        break;
      case 'booking':
        navigate(`/bookings/${item.id || item.recordId}`);
        break;
      default:
        break;
    }
  };

  return (
    <>
      {/* Quick Access Bar */}
      {/* TODO (Nav Cleanup - Phase B:2): Consolidate these quick actions with sidebar/header links so Today/Bookings aren’t exposed in three different nav zones. */}
      <div className="bg-white dark:bg-surface-primary border-b border-gray-200 dark:border-surface-border px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left side - Quick Actions */}
          {/* NOTE: QuickAccessBar is reserved for high-frequency actions, not duplicate page links. See NAV_CLEANUP_PLAN.md. */}
          <div className="flex items-center gap-2">
            {/* Global Search */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchOpen(true);
                setTimeout(() => searchInputRef.current?.focus(), 100);
              }}
              className="flex items-center gap-2 px-3"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-surface-secondary rounded">
                <Command className="w-3 h-3" />K
              </kbd>
            </Button>

            {/* Quick Check-in */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/bookings?view=checkin')}
              className="flex items-center gap-2 px-3"
            >
              <CheckCircle className="w-4 h-4 text-success-600" />
              <span className="hidden sm:inline">Quick Check-in</span>
              <kbd className="hidden lg:inline px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-surface-secondary rounded">C</kbd>
            </Button>

            {/* New Booking */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/bookings?action=new')}
              className="flex items-center gap-2 px-3"
            >
              <Plus className="w-4 h-4 text-blue-600" />
              <span className="hidden sm:inline">New Booking</span>
              <kbd className="hidden lg:inline px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-surface-secondary rounded">B</kbd>
            </Button>

          </div>

          {/* Right side - Notifications */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/notifications')}
              className="relative flex items-center gap-2 px-3"
            >
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Alerts</span>
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
              <kbd className="hidden lg:inline px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-surface-secondary rounded">N</kbd>
            </Button>
          </div>
        </div>
      </div>

      {/* Global Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setSearchOpen(false);
              setSearchQuery('');
              setSearchResults({ pets: [], owners: [], bookings: [] });
            }}
          />
          <div className="relative w-full max-w-2xl bg-white dark:bg-surface-primary rounded-lg shadow-2xl">
            {/* Search Input */}
            <div className="flex items-center border-b border-gray-200 dark:border-surface-border">
              <Search className="w-5 h-5 text-gray-400 ml-4" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pets, owners, bookings..."
                className="flex-1 px-4 py-4 text-base outline-none bg-transparent"
                autoFocus
              />
              <button
                onClick={() => {
                  setSearchOpen(false);
                  setSearchQuery('');
                  setSearchResults({ pets: [], owners: [], bookings: [] });
                }}
                className="p-2 mr-2 hover:bg-gray-100 dark:hover:bg-surface-secondary rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Results */}
            <div className="max-h-[400px] overflow-y-auto">
              {isSearching ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2">Searching...</p>
                </div>
              ) : searchQuery.length >= 2 ? (
                <>
                  {/* Pets Results */}
                  {searchResults.pets.length > 0 && (
                    <div className="p-4">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Pets</h3>
                      <div className="space-y-1">
                        {searchResults.pets.map((pet) => (
                          <button
                            key={pet.id || pet.recordId}
                            onClick={() => navigateToResult('pet', pet)}
                            className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-surface-secondary rounded-lg text-left"
                          >
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-sm font-semibold">
                              {pet.name?.charAt(0) || 'P'}
                            </div>
                            <div>
                              <div className="font-medium">{pet.name}</div>
                              <div className="text-xs text-gray-500">
                                {pet.breed} • {pet.ownerName || 'Owner'}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Owners Results */}
                  {searchResults.owners.length > 0 && (
                    <div className="p-4 border-t border-gray-100 dark:border-surface-border">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Owners</h3>
                      <div className="space-y-1">
                        {searchResults.owners.map((owner) => (
                          <button
                            key={owner.id || owner.recordId}
                            onClick={() => navigateToResult('owner', owner)}
                            className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-surface-secondary rounded-lg text-left"
                          >
                            <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center text-sm font-semibold">
                              {owner.name?.charAt(0) || 'O'}
                            </div>
                            <div>
                              <div className="font-medium">{owner.name}</div>
                              <div className="text-xs text-gray-500">
                                {owner.email} • {owner.phone}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bookings Results */}
                  {searchResults.bookings.length > 0 && (
                    <div className="p-4 border-t border-gray-100 dark:border-surface-border">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Bookings</h3>
                      <div className="space-y-1">
                        {searchResults.bookings.map((booking) => (
                          <button
                            key={booking.id || booking.recordId}
                            onClick={() => navigateToResult('booking', booking)}
                            className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-surface-secondary rounded-lg text-left"
                          >
                            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center text-sm font-semibold">
                              <Calendar className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-medium">
                                {booking.petName} - {booking.service}
                              </div>
                              <div className="text-xs text-gray-500">
                                {tz.formatShortDate(booking.startDate)} • {booking.status}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No Results */}
                  {searchResults.pets.length === 0 &&
                   searchResults.owners.length === 0 &&
                   searchResults.bookings.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                      <p>No results found for "{searchQuery}"</p>
                    </div>
                  )}
                </>
              ) : searchQuery.length > 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>Type at least 2 characters to search</p>
                </div>
              ) : (
                <div className="p-8">
                  {/* Quick Actions when no search */}
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setSearchOpen(false);
                        navigate('/pets/new');
                      }}
                      className="flex items-center gap-2 p-3 hover:bg-gray-50 dark:hover:bg-surface-secondary rounded-lg"
                    >
                      <Plus className="w-4 h-4 text-blue-600" />
                      <span>Add New Pet</span>
                    </button>
                    <button
                      onClick={() => {
                        setSearchOpen(false);
                        navigate('/owners/new');
                      }}
                      className="flex items-center gap-2 p-3 hover:bg-gray-50 dark:hover:bg-surface-secondary rounded-lg"
                    >
                      <Plus className="w-4 h-4 text-success-600" />
                      <span>Add New Owner</span>
                    </button>
                    <button
                      onClick={() => {
                        setSearchOpen(false);
                        navigate('/bookings?view=calendar');
                      }}
                      className="flex items-center gap-2 p-3 hover:bg-gray-50 dark:hover:bg-surface-secondary rounded-lg"
                    >
                      <Calendar className="w-4 h-4 text-purple-600" />
                      <span>View Calendar</span>
                    </button>
                    <button
                      onClick={() => {
                        setSearchOpen(false);
                        navigate('/reports');
                      }}
                      className="flex items-center gap-2 p-3 hover:bg-gray-50 dark:hover:bg-surface-secondary rounded-lg"
                    >
                      <Bell className="w-4 h-4 text-orange-600" />
                      <span>View Reports</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer with shortcuts */}
            <div className="border-t border-gray-200 dark:border-surface-border px-4 py-2 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-surface-secondary rounded">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-surface-secondary rounded">Enter</kbd>
                  Select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-surface-secondary rounded">Esc</kbd>
                  Close
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QuickAccessBar;