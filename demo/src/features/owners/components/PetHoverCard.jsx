/**
 * PetHoverCard Component - Demo Version
 * Shows pets on hover with mock data.
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PawPrint, Eye, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import petsData from '@/data/pets.json';

const PetHoverCard = ({ ownerId, petCount, children }) => {
  const navigate = useNavigate();
  const [isHovering, setIsHovering] = useState(false);
  const [pets, setPets] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const hoverTimeoutRef = useRef(null);
  const leaveTimeoutRef = useRef(null);
  const cardRef = useRef(null);

  // Fetch pets on hover
  useEffect(() => {
    if (isHovering && petCount > 0 && !pets) {
      setIsLoading(true);
      // Simulate API delay then filter mock data
      const timer = setTimeout(() => {
        const ownerPets = petsData.filter(
          (pet) => pet.ownerId === ownerId || pet.ownerId === parseInt(ownerId, 10)
        );
        setPets(ownerPets);
        setIsLoading(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isHovering, petCount, pets, ownerId]);

  const handleMouseEnter = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovering(true);
    }, 300);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    leaveTimeoutRef.current = setTimeout(() => {
      setIsHovering(false);
    }, 200);
  };

  if (petCount === 0) {
    return children;
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      ref={cardRef}
    >
      {children}

      {isHovering && (
        <div
          className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-64 rounded-lg border shadow-lg animate-in fade-in-0 zoom-in-95 duration-150"
          style={{
            backgroundColor: 'var(--bb-color-bg-surface)',
            borderColor: 'var(--bb-color-border-subtle)',
          }}
          onMouseEnter={() => {
            if (leaveTimeoutRef.current) {
              clearTimeout(leaveTimeoutRef.current);
            }
          }}
          onMouseLeave={handleMouseLeave}
        >
          <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
            <p className="text-sm font-semibold text-[color:var(--bb-color-text-primary)] flex items-center gap-1.5">
              <PawPrint className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
              Pets ({petCount})
            </p>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-[color:var(--bb-color-text-muted)]" />
              </div>
            ) : pets && pets.length > 0 ? (
              <div className="py-1">
                {pets.slice(0, 5).map((pet) => (
                  <div
                    key={pet.id}
                    className="px-3 py-2 hover:bg-[var(--bb-color-bg-elevated)] transition-colors cursor-pointer"
                    onClick={() => navigate(`/pets/${pet.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold"
                        style={{
                          backgroundColor: getSpeciesColor(pet.species),
                          color: '#fff',
                        }}
                      >
                        {pet.name?.[0]?.toUpperCase() || 'P'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)] truncate">
                          {pet.name}
                        </p>
                        <p className="text-xs text-[color:var(--bb-color-text-muted)]">
                          {pet.breed || pet.species || 'Pet'}
                        </p>
                      </div>
                      <Badge
                        variant={pet.status === 'active' ? 'success' : 'neutral'}
                        size="sm"
                      >
                        {pet.status || 'Active'}
                      </Badge>
                    </div>
                  </div>
                ))}
                {pets.length > 5 && (
                  <p className="px-3 py-2 text-xs text-center text-[color:var(--bb-color-text-muted)]">
                    +{pets.length - 5} more pets
                  </p>
                )}
              </div>
            ) : (
              <div className="py-4 text-center text-sm text-[color:var(--bb-color-text-muted)]">
                No pets found
              </div>
            )}
          </div>

          <div className="px-3 py-2 border-t" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
            <Button
              variant="link"
              size="sm"
              onClick={() => navigate(`/customers/${ownerId}?tab=pets`)}
              className="w-full justify-center"
            >
              <Eye className="h-3.5 w-3.5 mr-1" />
              View all pets
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper to get species-based avatar color
const getSpeciesColor = (species) => {
  const colors = {
    dog: '#10B981', // emerald
    cat: '#8B5CF6', // violet
    bird: '#F59E0B', // amber
    rabbit: '#EC4899', // pink
    hamster: '#6366F1', // indigo
    fish: '#06B6D4', // cyan
    reptile: '#84CC16', // lime
  };
  return colors[species?.toLowerCase()] || '#64748B'; // slate default
};

export default PetHoverCard;
