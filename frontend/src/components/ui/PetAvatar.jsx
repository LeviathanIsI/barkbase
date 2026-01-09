/**
 * PetAvatar Component
 * Specialized avatar for pets - wraps the unified Avatar component
 * with pet-specific defaults and convenience props
 */

import React from 'react';
import Avatar from './Avatar';

const PetAvatar = ({
  pet,
  size = 'md',
  className,
  showBorder = true,
  showStatus = false,
  showSpecies = false,
  onClick,
  ...props
}) => {
  // Extract pet data with fallbacks
  const name = pet?.name || pet?.petName || 'Pet';
  const photoUrl = pet?.photoUrl || pet?.photo || pet?.imageUrl;
  const species = pet?.species || pet?.petSpecies;
  const status = pet?.status;
  const hasMedicalAlerts = pet?.hasMedicalAlerts;

  return (
    <Avatar
      name={name}
      src={photoUrl}
      alt={name}
      size={size}
      shape="rounded" // Pets get slightly rounded corners
      showRing={showBorder}
      species={species}
      showSpecies={showSpecies}
      status={status}
      showStatus={showStatus}
      badge={hasMedicalAlerts ? '!' : undefined}
      onClick={onClick}
      interactive={!!onClick}
      className={className}
      {...props}
    />
  );
};

export default PetAvatar;
