import { useState } from 'react';
import {
  Calendar,
  PawPrint,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  Plus,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import CustomerBookingsList from '../components/CustomerBookingsList';
import CustomerBookingPortal from '../components/CustomerBookingPortal';
import { useCustomerProfileQuery, useCustomerPetsQuery } from '../api';

const TABS = [
  { id: 'bookings', label: 'My Bookings', icon: Calendar },
  { id: 'pets', label: 'My Pets', icon: PawPrint },
  { id: 'profile', label: 'Profile', icon: User },
];

/**
 * Customer Portal
 * Self-service portal for pet owners to manage their bookings and profile
 */
const CustomerPortal = () => {
  const [activeTab, setActiveTab] = useState('bookings');
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { data: profile } = useCustomerProfileQuery();
  const { data: pets = [] } = useCustomerPetsQuery();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-surface-primary">
      {/* Header */}
      <header className="bg-white dark:bg-surface-secondary border-b border-gray-200 dark:border-surface-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <PawPrint className="w-8 h-8 text-primary" />
              <div>
                <h1 className="font-bold text-lg">Customer Portal</h1>
                {profile?.firstName && (
                  <p className="text-sm text-gray-500 dark:text-text-secondary">
                    Welcome back, {profile.firstName}!
                  </p>
                )}
              </div>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-2">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      activeTab === tab.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-600 dark:text-text-secondary hover:bg-gray-100 dark:hover:bg-surface-primary'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              <Button onClick={() => setShowNewBooking(true)} className="hidden sm:flex">
                <Plus className="w-4 h-4 mr-2" />
                Book Now
              </Button>
              
              {/* Mobile menu button */}
              <button
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-surface-primary"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-surface-border bg-white dark:bg-surface-secondary">
            <nav className="px-4 py-2 space-y-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      'flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                      activeTab === tab.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-600 dark:text-text-secondary hover:bg-gray-100 dark:hover:bg-surface-primary'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'bookings' && (
          <CustomerBookingsList
            onViewBooking={setSelectedBooking}
            onNewBooking={() => setShowNewBooking(true)}
          />
        )}

        {activeTab === 'pets' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">My Pets</h2>
              <p className="text-gray-500 dark:text-text-secondary">
                View your registered pets
              </p>
            </div>

            {pets.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-surface-secondary rounded-lg border border-gray-200 dark:border-surface-border">
                <PawPrint className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">No pets registered yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Contact the facility to add your pets to your profile
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pets.map((pet) => (
                  <div
                    key={pet.id}
                    className="bg-white dark:bg-surface-secondary rounded-lg border border-gray-200 dark:border-surface-border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <PawPrint className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{pet.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-text-secondary">
                          {pet.breed} • {pet.species || 'Dog'}
                        </p>
                      </div>
                    </div>
                    {pet.specialNeeds && (
                      <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-sm text-yellow-800 dark:text-yellow-300">
                        Special needs: {pet.specialNeeds}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">My Profile</h2>
              <p className="text-gray-500 dark:text-text-secondary">
                Your contact information
              </p>
            </div>

            {profile ? (
              <div className="bg-white dark:bg-surface-secondary rounded-lg border border-gray-200 dark:border-surface-border p-6 max-w-2xl">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm text-gray-500 dark:text-text-secondary">Name</label>
                    <p className="font-medium">{profile.firstName} {profile.lastName}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-text-secondary">Email</label>
                    <p className="font-medium">{profile.email}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-text-secondary">Phone</label>
                    <p className="font-medium">{profile.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-text-secondary">Address</label>
                    <p className="font-medium">
                      {profile.address ? (
                        <>
                          {profile.address}
                          {profile.city && `, ${profile.city}`}
                          {profile.state && ` ${profile.state}`}
                          {profile.zipCode && ` ${profile.zipCode}`}
                        </>
                      ) : (
                        'Not provided'
                      )}
                    </p>
                  </div>
                </div>

                {(profile.emergencyContactName || profile.emergencyContactPhone) && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-surface-border">
                    <h3 className="font-medium mb-4">Emergency Contact</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm text-gray-500 dark:text-text-secondary">Name</label>
                        <p className="font-medium">{profile.emergencyContactName || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500 dark:text-text-secondary">Phone</label>
                        <p className="font-medium">{profile.emergencyContactPhone || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-surface-border">
                  <p className="text-sm text-gray-500 dark:text-text-secondary">
                    To update your profile information, please contact the facility.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-white dark:bg-surface-secondary rounded-lg border border-gray-200 dark:border-surface-border">
                <User className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">Profile not found</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* New Booking Modal */}
      <Modal
        open={showNewBooking}
        onClose={() => setShowNewBooking(false)}
        title="Book a Stay"
        description="Reserve boarding for your pet"
        size="xl"
      >
        <CustomerBookingPortal
          onClose={() => setShowNewBooking(false)}
          onSuccess={() => setShowNewBooking(false)}
        />
      </Modal>

      {/* Mobile FAB for new booking */}
      <Button
        className="sm:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg"
        onClick={() => setShowNewBooking(true)}
      >
        <Plus className="w-6 h-6" />
      </Button>
    </div>
  );
};

export default CustomerPortal;

