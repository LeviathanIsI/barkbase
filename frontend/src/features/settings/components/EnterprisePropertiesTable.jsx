/**
 * Enterprise Properties Table - Phase 8 Enterprise Table System
 * enterprise properties table with rich metadata display
 * Token-based styling for consistent theming.
 */

import React, { useState } from 'react';
import { Shield, Lock, Package, Plus, FileCode, TrendingUp, GitBranch } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Checkbox from '@/components/ui/Checkbox';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@/components/ui/Table';

const PropertyTypeIcon = ({ type }) => {
  const icons = {
    system: <Shield className="w-4 h-4" style={{ color: 'var(--bb-color-status-negative)' }} />,
    standard: <Package className="w-4 h-4" style={{ color: 'var(--bb-color-accent)' }} />,
    protected: <Lock className="w-4 h-4" style={{ color: '#D97706' }} />,
    custom: <Plus className="w-4 h-4" style={{ color: 'var(--bb-color-status-positive)' }} />,
  };
  return icons[type] || null;
};

const PropertyTypeBadge = ({ type }) => {
  const variants = {
    system: 'destructive',
    standard: 'default',
    protected: 'warning',
    custom: 'success',
  };
  
  return (
    <Badge variant={variants[type] || 'default'} className="text-[var(--bb-font-size-xs,0.75rem)]">
      {type}
    </Badge>
  );
};

const AccessLevelBadge = ({ level, profiles }) => {
  // Determine most restrictive access
  if (level === 'read-write' || Object.values(profiles || {}).some(v => v === 'read-write')) {
    return <Badge variant="success" className="text-[var(--bb-font-size-xs,0.75rem)]">Everyone can edit</Badge>;
  }
  if (level === 'read-only' || Object.values(profiles || {}).every(v => v === 'read-only')) {
    return <Badge variant="secondary" className="text-[var(--bb-font-size-xs,0.75rem)]">Everyone can view</Badge>;
  }
  return <Badge variant="outline" className="text-[var(--bb-font-size-xs,0.75rem)]">Restricted access</Badge>;
};

export const EnterprisePropertiesTable = ({
  properties = [],
  onEditProperty,
  onDeleteProperty,
  onViewDependencies,
  onViewUsage,
  selectedProperties = [],
  onSelectProperty,
  onSelectAll,
}) => {
  const [sortBy, setSortBy] = useState('displayOrder');
  const [sortDirection, setSortDirection] = useState('asc');

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  const sortedProperties = [...properties].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    
    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const isAllSelected = properties.length > 0 && selectedProperties.length === properties.filter(p => p.propertyType === 'custom').length;

  return (
    <div
      className="border rounded-lg overflow-x-auto"
      style={{
        borderColor: 'var(--bb-color-border-subtle)',
        backgroundColor: 'var(--bb-color-bg-surface)',
      }}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox 
                checked={isAllSelected}
                onCheckedChange={onSelectAll}
              />
            </TableHead>
            <TableHead
              className="cursor-pointer"
              onClick={() => handleSort('displayLabel')}
            >
              Name
            </TableHead>
            <TableHead>Property Type</TableHead>
            <TableHead>Property Access</TableHead>
            <TableHead>Group</TableHead>
            <TableHead>Created By</TableHead>
            <TableHead>Used In</TableHead>
            <TableHead>Dependencies</TableHead>
            <TableHead>Fill Rate</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedProperties.length === 0 ? (
            <TableEmpty
              icon={Package}
              message="No properties found"
              colSpan={10}
            />
          ) : (
            sortedProperties.map((property) => {
              const isSelected = selectedProperties.includes(property.propertyId);
              const canSelect = property.propertyType === 'custom';
              const usage = property.usage || {};
              const dependencies = property.dependencies || {};
              const totalUsage = (usage.usedInWorkflows || 0) + (usage.usedInForms || 0) + (usage.usedInReports || 0);
              const totalDeps = (dependencies.totalCount || 0);

              return (
                <TableRow
                  key={property.propertyId}
                  selected={isSelected}
                >
                  <TableCell>
                    {canSelect && (
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={() => onSelectProperty(property.propertyId)}
                      />
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center space-x-[var(--bb-space-2,0.5rem)]">
                      <PropertyTypeIcon type={property.propertyType} />
                      <div>
                        <div
                          className="text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
                          style={{ color: 'var(--bb-color-text-primary)' }}
                        >
                          {property.displayLabel}
                        </div>
                        <div
                          className="text-[var(--bb-font-size-xs,0.75rem)] font-mono"
                          style={{ color: 'var(--bb-color-text-muted)' }}
                        >
                          {property.propertyName}
                        </div>
                      </div>
                      {property.isRequired && (
                        <Badge variant="outline" className="text-[var(--bb-font-size-xs,0.75rem)]">Required</Badge>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <PropertyTypeBadge type={property.propertyType} />
                  </TableCell>
                  
                  <TableCell>
                    <AccessLevelBadge 
                      level={property.accessLevel} 
                      profiles={property.permissionProfiles}
                    />
                  </TableCell>
                  
                  <TableCell>
                    <span
                      className="text-[var(--bb-font-size-sm,0.875rem)]"
                      style={{ color: 'var(--bb-color-text-primary)' }}
                    >
                      {property.propertyGroup || '—'}
                    </span>
                  </TableCell>
                  
                  <TableCell>
                    <span
                      className="text-[var(--bb-font-size-sm,0.875rem)]"
                      style={{ color: 'var(--bb-color-text-primary)' }}
                    >
                      {property.createdBy || 'System'}
                    </span>
                  </TableCell>
                  
                  <TableCell>
                    {totalUsage > 0 ? (
                      <Button 
                        variant="link" 
                        size="sm"
                        onClick={() => onViewUsage(property)}
                        className="p-0"
                        style={{ color: 'var(--bb-color-accent)' }}
                      >
                        <FileCode className="w-4 h-4 mr-[var(--bb-space-1,0.25rem)]" />
                        {totalUsage} assets
                      </Button>
                    ) : (
                      <span
                        className="text-[var(--bb-font-size-sm,0.875rem)]"
                        style={{ color: 'var(--bb-color-text-muted)' }}
                      >
                        Not used
                      </span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {totalDeps > 0 ? (
                      <Button 
                        variant="link" 
                        size="sm"
                        onClick={() => onViewDependencies(property)}
                        className="p-0"
                        style={{ color: '#9333EA' }}
                      >
                        <GitBranch className="w-4 h-4 mr-[var(--bb-space-1,0.25rem)]" />
                        {totalDeps}
                      </Button>
                    ) : (
                      <span
                        className="text-[var(--bb-font-size-sm,0.875rem)]"
                        style={{ color: 'var(--bb-color-text-muted)' }}
                      >
                        None
                      </span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center space-x-[var(--bb-space-2,0.5rem)]">
                      <div
                        className="flex-1 rounded-md h-2 max-w-[60px]"
                        style={{ backgroundColor: 'var(--bb-color-border-subtle)' }}
                      >
                        <div 
                          className="h-2 rounded-full"
                          style={{
                            width: `${usage.fillRate || 0}%`,
                            backgroundColor: 'var(--bb-color-status-positive)',
                          }}
                        />
                      </div>
                      <span
                        className="text-[var(--bb-font-size-xs,0.75rem)]"
                        style={{ color: 'var(--bb-color-text-muted)' }}
                      >
                        {usage.fillRate || 0}%
                      </span>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-right space-x-[var(--bb-space-2,0.5rem)]">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onEditProperty(property)}
                    >
                      Edit
                    </Button>
                    {property.propertyType === 'custom' && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onDeleteProperty(property)}
                        style={{ color: 'var(--bb-color-status-negative)' }}
                      >
                        Delete
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default EnterprisePropertiesTable;
