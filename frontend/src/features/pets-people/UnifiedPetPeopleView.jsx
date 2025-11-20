import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search, Plus, Filter, Users, PawPrint, Calendar, Phone, Mail,
  MapPin, DollarSign, AlertCircle, Shield, Heart, Clock,
  ChevronRight, Edit, MessageSquare, CalendarPlus, MoreVertical
} from 'lucide-react';
import { Card, PageHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import PetAvatar from '@/components/ui/PetAvatar';
import PetHoverPreview from '@/components/ui/PetHoverPreview';
import OwnerHoverPreview from '@/components/ui/OwnerHoverPreview';
import apiClient from '@/lib/apiClient';
import { cn } from '@/lib/cn';

/**
 * UnifiedPetPeopleView Component
 * Shows owner details with all pets in a single unified view
 * Addresses research finding: "pet/client info separated from operational context"
 */
const UnifiedPetPeopleView = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, active, inactive
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // grid, list

  // Fetch all owners with their pets
  const { data: owners = [], isLoading } = useQuery({
    queryKey: ['owners', 'with-pets'],
    queryFn: async () => {
      const [ownersResponse, petsResponse] = await Promise.all([
        apiClient.get('/api/v1/owners'),
        apiClient.get('/api/v1/pets')
      ]);

      const ownersList = Array.isArray(ownersResponse) ? ownersResponse : ownersResponse?.data || [];
      const petsList = Array.isArray(petsResponse) ? petsResponse : petsResponse?.data || [];

      // Map pets to owners
      return ownersList.map(owner => {
        const ownerPets = petsList.filter(pet => {
          // Check if pet has this owner
          if (pet.ownerId === owner.id) return true;
          if (pet.owners?.some(o => o.id === owner.id)) return true;
          if (pet.primaryOwnerId === owner.id) return true;
          return false;
        });

        return {
          ...owner,
          pets: ownerPets,
          activePets: ownerPets.filter(p => p.status !== 'inactive'),
          totalSpent: owner.totalSpent || Math.floor(Math.random() * 5000), // Mock data
          lastVisit: owner.lastVisit || new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        };
      });
    },
    refetchInterval: 60000
  });

  // Filter owners based on search and filter
  const filteredOwners = useMemo(() => {
    return owners.filter(owner => {
      // Search filter
      const matchesSearch = !searchTerm ||
        owner.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        owner.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        owner.phone?.includes(searchTerm) ||
        owner.pets?.some(pet => pet.name?.toLowerCase().includes(searchTerm.toLowerCase()));

      // Status filter
      const hasActivePets = owner.activePets?.length > 0;
      const matchesFilter = filterType === 'all' ||
        (filterType === 'active' && hasActivePets) ||
        (filterType === 'inactive' && !hasActivePets);

      return matchesSearch && matchesFilter;
    });
  }, [owners, searchTerm, filterType]);

  // Calculate stats
  const stats = useMemo(() => ({
    totalOwners: owners.length,
    activeOwners: owners.filter(o => o.activePets?.length > 0).length,
    totalPets: owners.reduce((sum, o) => sum + (o.pets?.length || 0), 0),
    activePets: owners.reduce((sum, o) => sum + (o.activePets?.length || 0), 0)
  }), [owners]);

  // Get vaccination status for pet
  const getVaccinationStatus = (pet) => {
    // Mock implementation - would connect to real vaccination data
    if (!pet.lastVaccinationDate) return 'missing';
    const daysSince = Math.floor((Date.now() - new Date(pet.lastVaccinationDate)) / (1000 * 60 * 60 * 24));
    if (daysSince > 365) return 'expired';
    if (daysSince > 335) return 'due-soon';
    return 'current';
  };

  // Owner Card Component
  const OwnerCard = ({ owner }) => {
    const [expanded, setExpanded] = useState(false);

    return (
      <Card className="overflow-hidden">
        {/* Owner Header */}
        <div className="p-6 border-b border-gray-100 dark:border-surface-border">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                {owner.name?.charAt(0) || owner.email?.charAt(0) || '?'}
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900 dark:text-text-primary">
                  <OwnerHoverPreview owner={owner}>
                    {owner.name || 'Unknown Owner'}
                  </OwnerHoverPreview>
                </h3>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-600 dark:text-text-secondary">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {owner.email || 'No email'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {owner.phone || 'No phone'}
                  </span>
                </div>
                {owner.address && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-gray-600 dark:text-text-secondary">
                    <MapPin className="w-3 h-3" />
                    {owner.address}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <Badge variant={owner.activePets?.length > 0 ? 'success' : 'neutral'}>
                {owner.activePets?.length > 0 ? 'Active' : 'Inactive'}
              </Badge>
              <p className="text-xs text-gray-600 dark:text-text-secondary mt-1">
                Customer since {new Date(owner.createdAt || Date.now()).getFullYear()}
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-surface-border">
            <div>
              <p className="text-xs text-gray-600 dark:text-text-secondary">Pets</p>
              <p className="text-lg font-semibold">{owner.pets?.length || 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-text-secondary">Total Spent</p>
              <p className="text-lg font-semibold">${owner.totalSpent || 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-text-secondary">Last Visit</p>
              <p className="text-sm font-medium">
                {owner.lastVisit ? new Date(owner.lastVisit).toLocaleDateString() : 'Never'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-text-secondary">Bookings</p>
              <p className="text-lg font-semibold">{owner.totalBookings || 0}</p>
            </div>
          </div>
        </div>

        {/* Pets Section */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-sm text-gray-700 dark:text-text-secondary">
              PETS ({owner.pets?.length || 0})
            </h4>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Show Less' : 'Show All'}
            </Button>
          </div>

          {/* Pet List */}
          <div className="space-y-3">
            {(expanded ? owner.pets : owner.pets?.slice(0, 2))?.map(pet => {
              const vaccStatus = getVaccinationStatus(pet);

              return (
                <div
                  key={pet.id}
                  className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-surface-secondary rounded-lg"
                >
                  <PetAvatar pet={pet} size="md" />

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        <PetHoverPreview pet={pet}>
                          {pet.name}
                        </PetHoverPreview>
                      </p>
                      {pet.status === 'inactive' && (
                        <Badge variant="neutral" className="text-xs">Inactive</Badge>
                      )}
                      {pet.hasMedicalAlerts && (
                        <Heart className="w-4 h-4 text-orange-500" title="Medical alerts" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-text-secondary">
                      {pet.breed || 'Unknown'} • {pet.age ? `${pet.age}y` : 'Age unknown'}
                    </p>

                    {/* Vaccination Status */}
                    <div className="flex items-center gap-2 mt-1">
                      <Shield className={cn(
                        "w-3 h-3",
                        vaccStatus === 'current' && "text-green-600",
                        vaccStatus === 'due-soon' && "text-yellow-600",
                        vaccStatus === 'expired' && "text-red-600",
                        vaccStatus === 'missing' && "text-gray-400"
                      )} />
                      <span className={cn(
                        "text-xs",
                        vaccStatus === 'current' && "text-green-600",
                        vaccStatus === 'due-soon' && "text-yellow-600",
                        vaccStatus === 'expired' && "text-red-600",
                        vaccStatus === 'missing' && "text-gray-500"
                      )}>
                        Vaccinations: {
                          vaccStatus === 'current' ? 'Up to date' :
                          vaccStatus === 'due-soon' ? 'Due soon' :
                          vaccStatus === 'expired' ? 'Expired' : 'Missing'
                        }
                      </span>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="px-2">
                      <CalendarPlus className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="px-2">
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="px-2">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {!expanded && owner.pets?.length > 2 && (
              <p className="text-center text-sm text-gray-500">
                +{owner.pets.length - 2} more pets
              </p>
            )}

            {owner.pets?.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                <PawPrint className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No pets registered</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-surface-border">
            <Button className="flex-1" size="sm">
              <CalendarPlus className="w-4 h-4 mr-1" />
              New Booking
            </Button>
            <Button variant="outline" className="flex-1" size="sm">
              <MessageSquare className="w-4 h-4 mr-1" />
              Message
            </Button>
            <Button variant="outline" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Pets & People" breadcrumb="Home > Pets & People" />
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-64 bg-gray-200 rounded-lg"></div>
            <div className="h-64 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Pets & People"
        breadcrumb="Home > Pets & People"
        action={
          <div className="flex gap-2">
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-1" />
              Add Owner
            </Button>
            <Button>
              <Plus className="w-4 h-4 mr-1" />
              Add Pet
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600 opacity-20" />
            <div>
              <p className="text-2xl font-bold">{stats.totalOwners}</p>
              <p className="text-xs text-gray-600 dark:text-text-secondary">Total Owners</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-green-600 opacity-20" />
            <div>
              <p className="text-2xl font-bold">{stats.activeOwners}</p>
              <p className="text-xs text-gray-600 dark:text-text-secondary">Active Owners</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <PawPrint className="w-8 h-8 text-purple-600 opacity-20" />
            <div>
              <p className="text-2xl font-bold">{stats.totalPets}</p>
              <p className="text-xs text-gray-600 dark:text-text-secondary">Total Pets</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <PawPrint className="w-8 h-8 text-orange-600 opacity-20" />
            <div>
              <p className="text-2xl font-bold">{stats.activePets}</p>
              <p className="text-xs text-gray-600 dark:text-text-secondary">Active Pets</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by owner name, email, phone, or pet name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-surface-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-surface-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Clients</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive</option>
          </select>

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              Grid
            </Button>
            <Button
              variant={viewMode === 'list' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              List
            </Button>
          </div>
        </div>
      </Card>

      {/* Owners Grid/List */}
      {filteredOwners.length > 0 ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : 'space-y-4'}>
          {filteredOwners.map(owner => (
            <OwnerCard key={owner.id} owner={owner} />
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2">No clients found</h3>
          <p className="text-gray-600 dark:text-text-secondary">
            {searchTerm ? `No results for "${searchTerm}"` : 'Start by adding your first client'}
          </p>
          {!searchTerm && (
            <Button className="mt-4">
              <Plus className="w-4 h-4 mr-1" />
              Add First Client
            </Button>
          )}
        </Card>
      )}
    </div>
  );
};

export default UnifiedPetPeopleView;