import { useState } from 'react';
import { Trash2, Copy, ChevronDown, Plus } from 'lucide-react';
import CriteriaSelector from './CriteriaSelector';

const CriteriaGroup = ({ group, onUpdate, onRemove, isEnrollmentFilter = false }) => {
  const [showCriteriaSelector, setShowCriteriaSelector] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleAddCriteria = (criteriaConfig) => {
    const newCriteria = { recordId: `criteria-${Date.now()}`,
      ...criteriaConfig,
    };
    onUpdate({
      criteria: [...group.criteria, newCriteria],
    });
    setShowCriteriaSelector(false);
  };

  const handleRemoveCriteria = (criteriaId) => {
    onUpdate({
      criteria: group.criteria.filter(c => c.recordId !== criteriaId),
    });
  };

  const handleUpdateCriteria = (criteriaId, updates) => {
    onUpdate({
      criteria: group.criteria.map(c =>
        c.recordId === criteriaId ? { ...c, ...updates } : c
      ),
    });
  };

  return (
    <>
      <div className="bg-background rounded-lg border border-border overflow-hidden">
        {/* Group Header */}
        <div className="p-3 flex items-center justify-between bg-blue-500/5 border-b border-border">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 flex-1 text-left"
          >
            <ChevronDown
              className={`w-4 h-4 text-muted transition-transform ${
                isExpanded ? '' : '-rotate-90'
              }`}
            />
            <span className="text-sm font-semibold text-text">{group.name}</span>
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={onRemove}
              className="p-1.5 hover:bg-red-500/10 rounded text-muted hover:text-red-600 transition-colors"
              title="Delete group"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Group Content */}
        {isExpanded && (
          <div className="p-4">
            {group.criteria.length === 0 ? (
              <div className="text-center py-3">
                <p className="text-sm text-muted mb-3">
                  {isEnrollmentFilter
                    ? 'Your criteria will appear here'
                    : 'Records meet custom conditions'}
                </p>
                <button
                  onClick={() => setShowCriteriaSelector(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Add criteria
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {group.criteria.map((criteria, index) => (
                  <div key={criteria.recordId}>
                    {index > 0 && (
                      <div className="text-center py-1">
                        <span className="text-xs font-semibold text-muted">AND</span>
                      </div>
                    )}
                    <div className="bg-surface rounded border border-border p-3 flex items-center justify-between group">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-text">
                          {criteria.label || criteria.type}
                        </div>
                        <div className="text-xs text-muted mt-1">
                          {criteria.description || 'Custom condition'}
                        </div>
                        {/* Show property details if it's a property condition */}
                        {criteria.type === 'property-condition' && criteria.condition && (
                          <div className="mt-2 flex items-center gap-2 text-xs">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
                              {criteria.condition.property.type}
                            </span>
                            <span className="text-muted">
                              Property: {criteria.condition.property.label}
                            </span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveCriteria(criteria.recordId)}
                        className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 rounded text-muted hover:text-red-600 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => setShowCriteriaSelector(true)}
                  className="w-full px-3 py-2 text-sm text-muted hover:text-primary hover:bg-primary/5 rounded border border-dashed border-border hover:border-primary transition-colors flex items-center justify-center gap-2 mt-2"
                >
                  <Plus className="w-4 h-4" />
                  Add condition
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Criteria Selector Modal/Panel */}
      {showCriteriaSelector && (
        <CriteriaSelector
          onSelect={handleAddCriteria}
          onClose={() => setShowCriteriaSelector(false)}
        />
      )}
    </>
  );
};

export default CriteriaGroup;
