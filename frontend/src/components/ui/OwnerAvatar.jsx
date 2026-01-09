/**
 * OwnerAvatar Component
 * Specialized avatar for owners/people - wraps the unified Avatar component
 * with person-specific defaults and convenience props
 */

import React from 'react';
import Avatar from './Avatar';

const OwnerAvatar = ({
  owner,
  size = 'md',
  className,
  showBorder = false,
  showStatus = false,
  onClick,
  ...props
}) => {
  // Extract owner data with fallbacks
  const firstName = owner?.firstName || owner?.first_name || '';
  const lastName = owner?.lastName || owner?.last_name || '';
  const email = owner?.email || '';

  // Build full name
  let name = `${firstName} ${lastName}`.trim();
  if (!name && email) {
    name = email.split('@')[0];
  }
  if (!name) {
    name = 'Owner';
  }

  const photoUrl = owner?.photoUrl || owner?.photo || owner?.avatarUrl || owner?.avatar;
  const status = owner?.status;

  return (
    <Avatar
      name={name}
      src={photoUrl}
      alt={name}
      size={size}
      shape="round" // People get fully round avatars
      showRing={showBorder}
      status={status}
      showStatus={showStatus}
      onClick={onClick}
      interactive={!!onClick}
      className={className}
      {...props}
    />
  );
};

export default OwnerAvatar;
