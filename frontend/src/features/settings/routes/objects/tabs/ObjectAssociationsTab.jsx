import { useState } from 'react';
import {
  Link2, Plus, Search, Filter, ExternalLink, MoreVertical,
  ArrowRight, Settings, Trash2, Edit
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { OBJECT_TYPES, DEFAULT_ASSOCIATIONS } from '../objectConfig';

const ObjectAssociationsTab = ({ objectType }) => {
  const config = OBJECT_TYPES[objectType];
  const associations = DEFAULT_ASSOCIATIONS[objectType] || [];
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLimit, setFilterLimit] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  if (!config) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Object type not found</p>
      </div>
    );
  }

  const filteredAssociations = associations.filter((assoc) => {
    const relatedConfig = OBJECT_TYPES[assoc.objectId];
    if (!relatedConfig) return false;

    const matchesSearch = !searchQuery ||
      relatedConfig.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assoc.label.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  const getCardinalityDisplay = (cardinality) => {
    switch (cardinality) {
      case '1:1': return '1-to-1';
      case '1:many': return '1-to-many';
      case 'many:1': return 'Many-to-1';
      case 'many:many': return 'Many-to-many';
      default: return cardinality;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header description */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">
            Use associations to identify and track the connections between your objects.{' '}
            <a href="#" className="text-primary hover:underline">Learn more</a>
          </p>
        </div>
      </div>

      {/* Association Selector Card */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-text">Select object association</span>
          <Select
            value={`${config.id}-to-all`}
            onChange={() => {}}
            options={[
              { value: `${config.id}-to-all`, label: `${config.labelPlural}-to-All Objects` },
              ...associations.map((assoc) => {
                const relatedConfig = OBJECT_TYPES[assoc.objectId];
                return {
                  value: `${config.id}-to-${assoc.objectId}`,
                  label: `${config.labelPlural}-to-${relatedConfig?.labelPlural || assoc.objectId}`,
                };
              }),
            ]}
            className="w-64"
          />
        </div>
      </Card>

      {/* Association Limits Info */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-text mb-2">Association limits</h3>
        <ul className="text-sm text-muted space-y-1 list-disc list-inside">
          <li>Each {config.labelSingular} can be associated to <strong>many</strong> other objects.</li>
          <li>Each related object can be associated to <strong>many</strong> {config.labelPlural}.</li>
        </ul>
      </Card>

      {/* Search and Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search"
            className="pl-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Filter by:</span>
          <Select
            value={filterLimit}
            onChange={(e) => setFilterLimit(e.target.value)}
            options={[
              { value: 'all', label: 'All label limits' },
              { value: '1:1', label: '1-to-1' },
              { value: '1:many', label: '1-to-many' },
              { value: 'many:many', label: 'Many-to-many' },
            ]}
            className="w-40"
          />
          <Select
            value="all"
            onChange={() => {}}
            options={[
              { value: 'all', label: 'All users' },
              { value: 'admin', label: 'Admins only' },
            ]}
            className="w-32"
          />
        </div>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Create and configure
        </Button>
      </div>

      {/* Associations Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-secondary">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Label
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Limits
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Object Association
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Created by System
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted uppercase tracking-wider">
                  Used In
                </th>
                <th className="px-4 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAssociations.map((assoc, idx) => {
                const relatedConfig = OBJECT_TYPES[assoc.objectId];
                if (!relatedConfig) return null;

                const RelatedIcon = relatedConfig.icon;
                const usedCount = Math.floor(Math.random() * 100);

                return (
                  <tr key={idx} className="hover:bg-surface-secondary/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link2 className="w-4 h-4 text-muted" />
                        <a href="#" className="text-sm text-primary hover:underline font-medium">
                          {assoc.label}
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-text">
                        {getCardinalityDisplay(assoc.cardinality)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <RelatedIcon className="w-4 h-4 text-muted" />
                        <span className="text-sm text-text">{relatedConfig.labelPlural}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-text">Yes</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm ${usedCount > 0 ? 'text-primary font-medium' : 'text-muted'}`}>
                        {usedCount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button className="p-1.5 rounded hover:bg-surface-secondary">
                        <MoreVertical className="w-4 h-4 text-muted" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredAssociations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Link2 className="w-8 h-8 text-muted mx-auto mb-2" />
                    <p className="text-sm text-muted">No associations found</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setShowCreateModal(true)}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      Create association
                    </Button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Visual Association Map */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-text mb-4">Association Map</h3>
        <div className="flex items-center justify-center gap-8 py-6">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-xl bg-primary/10 border-2 border-primary flex items-center justify-center">
              <config.icon className="w-8 h-8 text-primary" />
            </div>
            <span className="mt-2 text-sm font-medium text-text">{config.labelPlural}</span>
          </div>

          <div className="flex flex-col gap-2">
            {associations.slice(0, 4).map((assoc, idx) => {
              const relatedConfig = OBJECT_TYPES[assoc.objectId];
              if (!relatedConfig) return null;

              return (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-16 border-t border-dashed border-border" />
                  <ArrowRight className="w-4 h-4 text-muted" />
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-secondary border border-border">
                    <relatedConfig.icon className="w-4 h-4 text-muted" />
                    <span className="text-xs text-text">{relatedConfig.labelPlural}</span>
                  </div>
                </div>
              );
            })}
            {associations.length > 4 && (
              <span className="text-xs text-muted ml-20">+{associations.length - 4} more</span>
            )}
          </div>
        </div>
      </Card>

      {/* Create Association Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-5">
            <h3 className="text-lg font-semibold text-text mb-4">Create Association</h3>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted">From Object</label>
                <div className="flex items-center gap-2 px-3 py-2 rounded border border-border bg-surface-secondary">
                  <config.icon className="w-4 h-4 text-muted" />
                  <span className="text-sm text-text">{config.labelPlural}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted">To Object</label>
                <Select
                  value=""
                  onChange={() => {}}
                  options={[
                    { value: '', label: 'Select an object...' },
                    ...Object.values(OBJECT_TYPES)
                      .filter(o => o.id !== objectType)
                      .map(o => ({ value: o.id, label: o.labelPlural }))
                  ]}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted">Cardinality</label>
                <Select
                  value="many:many"
                  onChange={() => {}}
                  options={[
                    { value: '1:1', label: '1-to-1' },
                    { value: '1:many', label: '1-to-many' },
                    { value: 'many:1', label: 'Many-to-1' },
                    { value: 'many:many', label: 'Many-to-many' },
                  ]}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted">Label</label>
                <Input placeholder="e.g., Primary Contact" />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowCreateModal(false)}>
                Create Association
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ObjectAssociationsTab;
