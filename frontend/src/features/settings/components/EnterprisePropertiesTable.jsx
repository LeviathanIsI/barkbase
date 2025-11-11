/**
 * Enterprise Properties Table
 * HubSpot-style properties table with rich metadata display
 * Columns: NAME, PROPERTY TYPE, PROPERTY ACCESS, GROUP, CREATED BY, USED IN, DEPENDENCIES, FILL RATE
 */

import React, { useState } from 'react';
import { Shield, Lock, Package, Plus, FileCode, TrendingUp, GitBranch } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Checkbox from '@/components/ui/Checkbox';

const PropertyTypeIcon = ({ type }) => {
  const icons = {
    system: <Shield className="w-4 h-4 text-red-600" />,
    standard: <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
    protected: <Lock className="w-4 h-4 text-amber-600" />,
    custom: <Plus className="w-4 h-4 text-green-600" />,
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
    <Badge variant={variants[type] || 'default'} className="text-xs">
      {type}
    </Badge>
  );
};

const AccessLevelBadge = ({ level, profiles }) => {
  // Determine most restrictive access
  if (level === 'read-write' || Object.values(profiles || {}).some(v => v === 'read-write')) {
    return <Badge variant="success" className="text-xs">Everyone can edit</Badge>;
  }
  if (level === 'read-only' || Object.values(profiles || {}).every(v => v === 'read-only')) {
    return <Badge variant="secondary" className="text-xs">Everyone can view</Badge>;
  }
  return <Badge variant="outline" className="text-xs">Restricted access</Badge>;
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
    <div className="border rounded-lg overflow-x-auto">
      <table className="w-full min-w-[900px]">
        <thead className="bg-gray-50 dark:bg-surface-secondary border-b">
          <tr>
            <th className="w-12 px-4 py-3 text-left">
              <Checkbox 
                checked={isAllSelected}
                onCheckedChange={onSelectAll}
              />
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-surface-secondary dark:bg-surface-secondary"
                onClick={() => handleSort('displayLabel')}>
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-text-secondary uppercase tracking-wider">
              Property Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-text-secondary uppercase tracking-wider">
              Property Access
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-text-secondary uppercase tracking-wider">
              Group
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-text-secondary uppercase tracking-wider">
              Created By
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-text-secondary uppercase tracking-wider">
              Used In
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-text-secondary uppercase tracking-wider">
              Dependencies
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-text-secondary uppercase tracking-wider">
              Fill Rate
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-text-secondary uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-surface-primary divide-y divide-gray-200 dark:divide-surface-border">
          {sortedProperties.map((property) => {
            const isSelected = selectedProperties.includes(property.propertyId);
            const canSelect = property.propertyType === 'custom';
            const usage = property.usage || {};
            const dependencies = property.dependencies || {};
            const totalUsage = (usage.usedInWorkflows || 0) + (usage.usedInForms || 0) + (usage.usedInReports || 0);
            const totalDeps = (dependencies.totalCount || 0);

            return (
              <tr 
                key={property.propertyId}
                className={`hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary ${isSelected ? 'bg-blue-50 dark:bg-surface-primary' : ''}`}
              >
                <td className="px-4 py-4">
                  {canSelect && (
                    <Checkbox 
                      checked={isSelected}
                      onCheckedChange={() => onSelectProperty(property.propertyId)}
                    />
                  )}
                </td>
                
                <td className="px-4 py-4">
                  <div className="flex items-center space-x-2">
                    <PropertyTypeIcon type={property.propertyType} />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-text-primary">
                        {property.displayLabel}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-text-secondary font-mono">
                        {property.propertyName}
                      </div>
                    </div>
                    {property.isRequired && (
                      <Badge variant="outline" className="text-xs">Required</Badge>
                    )}
                  </div>
                </td>
                
                <td className="px-4 py-4">
                  <PropertyTypeBadge type={property.propertyType} />
                </td>
                
                <td className="px-4 py-4">
                  <AccessLevelBadge 
                    level={property.accessLevel} 
                    profiles={property.permissionProfiles}
                  />
                </td>
                
                <td className="px-4 py-4 text-sm text-gray-700 dark:text-text-primary">
                  {property.propertyGroup || '—'}
                </td>
                
                <td className="px-4 py-4 text-sm text-gray-700 dark:text-text-primary">
                  {property.createdBy || 'System'}
                </td>
                
                <td className="px-4 py-4">
                  {totalUsage > 0 ? (
                    <Button 
                      variant="link" 
                      size="sm"
                      onClick={() => onViewUsage(property)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:text-blue-200 p-0"
                    >
                      <FileCode className="w-4 h-4 mr-1" />
                      {totalUsage} assets
                    </Button>
                  ) : (
                    <span className="text-sm text-gray-400 dark:text-text-tertiary">Not used</span>
                  )}
                </td>
                
                <td className="px-4 py-4">
                  {totalDeps > 0 ? (
                    <Button 
                      variant="link" 
                      size="sm"
                      onClick={() => onViewDependencies(property)}
                      className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:text-purple-200 p-0"
                    >
                      <GitBranch className="w-4 h-4 mr-1" />
                      {totalDeps}
                    </Button>
                  ) : (
                    <span className="text-sm text-gray-400 dark:text-text-tertiary">None</span>
                  )}
                </td>
                
                <td className="px-4 py-4">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 dark:bg-surface-border rounded-full h-2 max-w-[60px]">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${usage.fillRate || 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 dark:text-text-secondary">{usage.fillRate || 0}%</span>
                  </div>
                </td>
                
                <td className="px-4 py-4 text-right space-x-2">
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
                      className="text-red-600 hover:text-red-800 dark:text-red-200"
                    >
                      Delete
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {properties.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-text-secondary">
          <Package className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-text-tertiary" />
          <p>No properties found</p>
        </div>
      )}
    </div>
  );
};

export default EnterprisePropertiesTable;

