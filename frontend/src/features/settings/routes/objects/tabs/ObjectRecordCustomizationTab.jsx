import { useState } from 'react';
import {
  Layout, Plus, GripVertical, Eye, Settings, Trash2, ChevronDown,
  ChevronRight, Columns, Sidebar, PanelRight, FileText, Activity,
  Users, Paperclip, MoreVertical
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { OBJECT_TYPES } from '../objectConfig';

const ObjectRecordCustomizationTab = ({ objectType }) => {
  const config = OBJECT_TYPES[objectType];
  const [activeView, setActiveView] = useState('default');
  const [leftSidebarCards, setLeftSidebarCards] = useState([
    { id: 'about', label: `About this ${config?.labelSingular}`, type: 'about', expanded: true },
    { id: 'details', label: 'Details', type: 'properties', expanded: false },
  ]);
  const [middleColumns, setMiddleColumns] = useState([
    { id: 'overview', label: 'Overview', active: true },
    { id: 'activities', label: 'Activities', active: true },
    { id: 'notes', label: 'Notes', active: false },
  ]);
  const [rightSidebarCards, setRightSidebarCards] = useState([
    { id: 'associations', label: 'Associations', type: 'associations' },
    { id: 'attachments', label: 'Attachments', type: 'attachments' },
  ]);
  const [showAddCardModal, setShowAddCardModal] = useState(null);

  if (!config) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Object type not found</p>
      </div>
    );
  }

  const handleAddCard = (section, cardType) => {
    const newCard = {
      id: `card_${Date.now()}`,
      label: cardType === 'properties' ? 'Property Group' : 'Custom Card',
      type: cardType,
      expanded: false,
    };

    if (section === 'left') {
      setLeftSidebarCards([...leftSidebarCards, newCard]);
    } else if (section === 'right') {
      setRightSidebarCards([...rightSidebarCards, newCard]);
    }
    setShowAddCardModal(null);
  };

  const handleRemoveCard = (section, cardId) => {
    if (section === 'left') {
      setLeftSidebarCards((prev) => prev.filter((c) => c.id !== cardId));
    } else if (section === 'right') {
      setRightSidebarCards((prev) => prev.filter((c) => c.id !== cardId));
    }
  };

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
              leftIcon={<Eye className="w-4 h-4" />}
            />
            <Button size="sm">
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
                Assigned To
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
            <tr className="hover:bg-surface-secondary/50">
              <td className="px-4 py-3">
                <input type="checkbox" className="rounded border-border" />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center">
                    <Layout className="w-3 h-3 text-primary" />
                  </div>
                  <a href="#" className="text-sm text-primary hover:underline font-medium">
                    Default view
                  </a>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="text-sm text-muted">All unassigned teams and users</span>
              </td>
              <td className="px-4 py-3">
                <span className="text-sm text-text">Dec 12, 2024 3:45 PM</span>
              </td>
              <td className="px-4 py-3 text-right">
                <button className="p-1.5 rounded hover:bg-surface-secondary">
                  <MoreVertical className="w-4 h-4 text-muted" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </Card>

      {/* Visual Layout Editor */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text">Record Layout Editor</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              Preview
            </Button>
            <Button size="sm">
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
                  {card.expanded && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <div className="space-y-1">
                        <div className="h-2 bg-surface-secondary rounded w-3/4" />
                        <div className="h-2 bg-surface-secondary rounded w-1/2" />
                        <div className="h-2 bg-surface-secondary rounded w-2/3" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Middle Content */}
            <div className="col-span-6 p-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-semibold text-muted uppercase">Middle Column</span>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 border-b border-border mb-3">
                {middleColumns.map((tab) => (
                  <button
                    key={tab.id}
                    className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                      tab.active
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted hover:text-text'
                    }`}
                    onClick={() => {
                      setMiddleColumns((prev) =>
                        prev.map((t) =>
                          t.id === tab.id ? { ...t, active: !t.active } : t
                        )
                      );
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
                <button className="px-2 py-1.5 text-xs text-muted hover:text-text">
                  <Plus className="w-3 h-3" />
                </button>
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
            </div>
          </div>
        </div>
      </Card>

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
