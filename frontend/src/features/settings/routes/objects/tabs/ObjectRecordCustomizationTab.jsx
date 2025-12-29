import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  Layout, Plus, GripVertical, Eye, Trash2, MoreVertical,
  FileText, Users, Paperclip, Loader2, Save, RotateCcw, Star, Edit, Copy
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { OBJECT_TYPES } from '../objectConfig';
import { useTimezoneUtils } from '@/lib/timezone';
import {
  useRecordLayouts,
  useCreateRecordLayout,
  useUpdateRecordLayout,
  useResetRecordLayout,
  useDeleteRecordLayout,
  useSetDefaultRecordLayout
} from '@/features/settings/api/objectSettingsApi';

const ObjectRecordCustomizationTab = ({ objectType }) => {
  const tz = useTimezoneUtils();
  const config = OBJECT_TYPES[objectType];
  const [selectedLayoutId, setSelectedLayoutId] = useState(null);
  const [showAddCardModal, setShowAddCardModal] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  // Local state for layout editing
  const [leftSidebarCards, setLeftSidebarCards] = useState([]);
  const [middleColumnConfig, setMiddleColumnConfig] = useState({ tabs: ['overview', 'activities'] });
  const [rightSidebarCards, setRightSidebarCards] = useState([]);

  // Fetch layouts from API
  const { data: layouts = [], isLoading } = useRecordLayouts(objectType);
  const createLayout = useCreateRecordLayout(objectType);
  const updateLayout = useUpdateRecordLayout(objectType);
  const resetLayout = useResetRecordLayout(objectType);
  const deleteLayout = useDeleteRecordLayout(objectType);
  const setDefaultLayout = useSetDefaultRecordLayout(objectType);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Set selected layout and initialize local state when data loads
  useEffect(() => {
    if (layouts.length > 0 && !selectedLayoutId) {
      const defaultLayout = layouts.find(l => l.isDefault) || layouts[0];
      setSelectedLayoutId(defaultLayout.id);
      setLeftSidebarCards(defaultLayout.leftSidebarConfig || []);
      setMiddleColumnConfig(defaultLayout.middleColumnConfig || { tabs: ['overview', 'activities'] });
      setRightSidebarCards(defaultLayout.rightSidebarConfig || []);
    }
  }, [layouts, selectedLayoutId]);

  // Update local state when selected layout changes
  useEffect(() => {
    if (selectedLayoutId) {
      const layout = layouts.find(l => l.id === selectedLayoutId);
      if (layout) {
        setLeftSidebarCards(layout.leftSidebarConfig || []);
        setMiddleColumnConfig(layout.middleColumnConfig || { tabs: ['overview', 'activities'] });
        setRightSidebarCards(layout.rightSidebarConfig || []);
        setHasUnsavedChanges(false);
      }
    }
  }, [selectedLayoutId, layouts]);

  if (!config) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Object type not found</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const selectedLayout = layouts.find(l => l.id === selectedLayoutId);

  const handleAddCard = (section, cardType) => {
    const newCard = {
      id: `card_${Date.now()}`,
      label: cardType === 'properties' ? 'Property Group' : cardType === 'associations' ? 'Associations' : 'Custom Card',
      type: cardType,
      expanded: false,
    };

    if (section === 'left') {
      setLeftSidebarCards([...leftSidebarCards, newCard]);
    } else if (section === 'right') {
      setRightSidebarCards([...rightSidebarCards, newCard]);
    }
    setShowAddCardModal(null);
    setHasUnsavedChanges(true);
  };

  const handleRemoveCard = (section, cardId) => {
    if (section === 'left') {
      setLeftSidebarCards((prev) => prev.filter((c) => c.id !== cardId));
    } else if (section === 'right') {
      setRightSidebarCards((prev) => prev.filter((c) => c.id !== cardId));
    }
    setHasUnsavedChanges(true);
  };

  const handleToggleTab = (tabId) => {
    const tabs = middleColumnConfig.tabs || [];
    const newTabs = tabs.includes(tabId)
      ? tabs.filter(t => t !== tabId)
      : [...tabs, tabId];
    setMiddleColumnConfig({ ...middleColumnConfig, tabs: newTabs });
    setHasUnsavedChanges(true);
  };

  const handleSaveLayout = async () => {
    try {
      await updateLayout.mutateAsync({
        id: selectedLayoutId,
        leftSidebarConfig: leftSidebarCards,
        middleColumnConfig,
        rightSidebarConfig: rightSidebarCards,
      });
      toast.success('Layout saved');
      setHasUnsavedChanges(false);
    } catch (error) {
      toast.error('Failed to save layout');
    }
  };

  const handleResetLayout = async () => {
    if (!confirm('Reset layout to default? This cannot be undone.')) return;
    try {
      await resetLayout.mutateAsync();
      toast.success('Layout reset to default');
    } catch (error) {
      toast.error('Failed to reset layout');
    }
  };

  const handleCreateLayout = async () => {
    const name = prompt('Enter view name:');
    if (!name) return;
    try {
      const result = await createLayout.mutateAsync({
        name,
        layoutType: 'custom',
        leftSidebarConfig: [],
        middleColumnConfig: { tabs: ['overview', 'activities'] },
        rightSidebarConfig: [],
      });
      toast.success('View created');
      setSelectedLayoutId(result.id);
    } catch (error) {
      toast.error('Failed to create view');
    }
  };

  const handleDeleteLayout = async (layoutId) => {
    const layout = layouts.find(l => l.id === layoutId);
    if (!confirm(`Delete "${layout?.name}"? This cannot be undone.`)) return;
    try {
      await deleteLayout.mutateAsync(layoutId);
      toast.success('View deleted');
      setOpenMenuId(null);
      if (selectedLayoutId === layoutId) {
        const remaining = layouts.filter(l => l.id !== layoutId);
        setSelectedLayoutId(remaining[0]?.id || null);
      }
    } catch (error) {
      toast.error('Failed to delete view');
    }
  };

  const handleSetDefault = async (layoutId) => {
    try {
      await setDefaultLayout.mutateAsync(layoutId);
      toast.success('Default view updated');
      setOpenMenuId(null);
    } catch (error) {
      toast.error('Failed to set default');
    }
  };

  const handleDuplicateLayout = async (layoutId) => {
    const layout = layouts.find(l => l.id === layoutId);
    if (!layout) return;
    try {
      const result = await createLayout.mutateAsync({
        name: `${layout.name} (Copy)`,
        layoutType: 'custom',
        leftSidebarConfig: layout.leftSidebarConfig || [],
        middleColumnConfig: layout.middleColumnConfig || { tabs: ['overview', 'activities'] },
        rightSidebarConfig: layout.rightSidebarConfig || [],
      });
      toast.success('View duplicated');
      setSelectedLayoutId(result.id);
      setOpenMenuId(null);
    } catch (error) {
      toast.error('Failed to duplicate view');
    }
  };

  const handleRenameLayout = async (layoutId) => {
    const layout = layouts.find(l => l.id === layoutId);
    const newName = prompt('Enter new name:', layout?.name);
    if (!newName || newName === layout?.name) return;
    try {
      await updateLayout.mutateAsync({ id: layoutId, name: newName });
      toast.success('View renamed');
      setOpenMenuId(null);
    } catch (error) {
      toast.error('Failed to rename view');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'activities', label: 'Activities' },
    { id: 'notes', label: 'Notes' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">
            Create views to customize the layout and content of {config.labelSingular} records.
          </p>
        </div>
      </div>

      {/* View Selector */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search by view name"
              className="w-64"
            />
            <Button size="sm" onClick={handleCreateLayout} disabled={createLayout.isPending}>
              {createLayout.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create team view
            </Button>
          </div>
        </div>
      </Card>

      {/* Views Table */}
      <Card className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface-secondary">
              <th className="px-4 py-3 text-left">
                <input type="checkbox" className="rounded border-border" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                View Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                Last Updated
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {layouts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted">
                  No views configured. Create a team view to customize layouts.
                </td>
              </tr>
            ) : (
              layouts.map(layout => (
                <tr
                  key={layout.id}
                  className={`hover:bg-surface-secondary/50 cursor-pointer ${selectedLayoutId === layout.id ? 'bg-primary/5' : ''}`}
                  onClick={() => setSelectedLayoutId(layout.id)}
                >
                  <td className="px-4 py-3">
                    <input type="checkbox" className="rounded border-border" onClick={e => e.stopPropagation()} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center">
                        <Layout className="w-3 h-3 text-primary" />
                      </div>
                      <span className={`text-sm font-medium ${selectedLayoutId === layout.id ? 'text-primary' : 'text-text'}`}>
                        {layout.name}
                      </span>
                      {layout.isDefault && (
                        <span className="px-1.5 py-0.5 text-[10px] bg-primary/10 text-primary rounded">Default</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted capitalize">{layout.layoutType}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-text">
                      {layout.updatedAt ? tz.formatShortDate(layout.updatedAt) : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="relative" ref={openMenuId === layout.id ? menuRef : null}>
                      <button
                        className="p-1.5 rounded hover:bg-surface-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === layout.id ? null : layout.id);
                        }}
                      >
                        <MoreVertical className="w-4 h-4 text-muted" />
                      </button>
                      {openMenuId === layout.id && (
                        <div className="absolute right-0 mt-1 w-48 bg-surface border border-border rounded-lg shadow-lg z-10">
                          <div className="py-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRenameLayout(layout.id); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface-secondary"
                            >
                              <Edit className="w-4 h-4" />
                              Rename
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDuplicateLayout(layout.id); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface-secondary"
                            >
                              <Copy className="w-4 h-4" />
                              Duplicate
                            </button>
                            {!layout.isDefault && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleSetDefault(layout.id); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface-secondary"
                              >
                                <Star className="w-4 h-4" />
                                Set as default
                              </button>
                            )}
                            <div className="border-t border-border my-1" />
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteLayout(layout.id); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-surface-secondary"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* Visual Layout Editor */}
      {selectedLayout && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text">Record Layout Editor - {selectedLayout.name}</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleResetLayout} disabled={resetLayout.isPending}>
                {resetLayout.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              </Button>
              <Button size="sm" onClick={handleSaveLayout} disabled={!hasUnsavedChanges || updateLayout.isPending}>
                {updateLayout.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Layout
              </Button>
            </div>
          </div>

          {/* 3-Column Layout Preview */}
          <div className="border border-border rounded-lg overflow-hidden bg-surface-secondary">
            {/* Header Bar */}
            <div className="px-4 py-3 border-b border-border bg-surface flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20" />
              <div>
                <div className="text-sm font-medium text-text">Sample {config.labelSingular}</div>
                <div className="text-xs text-muted">Record preview</div>
              </div>
            </div>

            <div className="grid grid-cols-12 min-h-[400px]">
              {/* Left Sidebar */}
              <div className="col-span-3 border-r border-border p-3 space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-muted uppercase">Left Sidebar</span>
                  <button
                    onClick={() => setShowAddCardModal('left')}
                    className="p-1 rounded hover:bg-surface"
                  >
                    <Plus className="w-3 h-3 text-muted" />
                  </button>
                </div>

                {leftSidebarCards.map((card) => (
                  <div
                    key={card.id}
                    className="border border-border rounded bg-surface p-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <GripVertical className="w-3 h-3 text-muted cursor-grab" />
                        <span className="text-xs font-medium text-text">{card.label}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveCard('left', card.id)}
                        className="p-0.5 rounded hover:bg-surface-secondary opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3 h-3 text-muted" />
                      </button>
                    </div>
                  </div>
                ))}

                {leftSidebarCards.length === 0 && (
                  <div className="border border-dashed border-border rounded p-3 text-center">
                    <span className="text-[10px] text-muted">Add cards here</span>
                  </div>
                )}
              </div>

              {/* Middle Content */}
              <div className="col-span-6 p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-semibold text-muted uppercase">Middle Column</span>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 border-b border-border mb-3">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                        middleColumnConfig.tabs?.includes(tab.id)
                          ? 'border-primary text-primary'
                          : 'border-transparent text-muted hover:text-text'
                      }`}
                      onClick={() => handleToggleTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Content Area */}
                <div className="space-y-3">
                  <div className="border border-dashed border-border rounded p-4 text-center">
                    <span className="text-xs text-muted">Data highlights card</span>
                  </div>
                  <div className="border border-dashed border-border rounded p-4 text-center">
                    <span className="text-xs text-muted">Activity timeline</span>
                  </div>
                </div>
              </div>

              {/* Right Sidebar */}
              <div className="col-span-3 border-l border-border p-3 space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-muted uppercase">Right Sidebar</span>
                  <button
                    onClick={() => setShowAddCardModal('right')}
                    className="p-1 rounded hover:bg-surface"
                  >
                    <Plus className="w-3 h-3 text-muted" />
                  </button>
                </div>

                {rightSidebarCards.map((card) => (
                  <div
                    key={card.id}
                    className="border border-border rounded bg-surface p-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <GripVertical className="w-3 h-3 text-muted cursor-grab" />
                        {card.type === 'associations' && <Users className="w-3 h-3 text-muted" />}
                        {card.type === 'attachments' && <Paperclip className="w-3 h-3 text-muted" />}
                        <span className="text-xs font-medium text-text">{card.label}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveCard('right', card.id)}
                        className="p-0.5 rounded hover:bg-surface-secondary opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3 h-3 text-muted" />
                      </button>
                    </div>
                  </div>
                ))}

                {rightSidebarCards.length === 0 && (
                  <div className="border border-dashed border-border rounded p-3 text-center">
                    <span className="text-[10px] text-muted">Add cards here</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Add Card Modal */}
      {showAddCardModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-sm p-5">
            <h3 className="text-lg font-semibold text-text mb-4">Add Card</h3>
            <div className="space-y-2">
              <button
                onClick={() => handleAddCard(showAddCardModal, 'properties')}
                className="w-full flex items-center gap-3 p-3 rounded border border-border hover:bg-surface-secondary text-left"
              >
                <FileText className="w-5 h-5 text-muted" />
                <div>
                  <div className="text-sm font-medium text-text">Property Group</div>
                  <div className="text-xs text-muted">Display a group of properties</div>
                </div>
              </button>
              <button
                onClick={() => handleAddCard(showAddCardModal, 'associations')}
                className="w-full flex items-center gap-3 p-3 rounded border border-border hover:bg-surface-secondary text-left"
              >
                <Users className="w-5 h-5 text-muted" />
                <div>
                  <div className="text-sm font-medium text-text">Associations</div>
                  <div className="text-xs text-muted">Show related records</div>
                </div>
              </button>
              <button
                onClick={() => handleAddCard(showAddCardModal, 'custom')}
                className="w-full flex items-center gap-3 p-3 rounded border border-border hover:bg-surface-secondary text-left"
              >
                <Layout className="w-5 h-5 text-muted" />
                <div>
                  <div className="text-sm font-medium text-text">Custom Card</div>
                  <div className="text-xs text-muted">Create a custom content card</div>
                </div>
              </button>
            </div>
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={() => setShowAddCardModal(null)}>
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ObjectRecordCustomizationTab;
