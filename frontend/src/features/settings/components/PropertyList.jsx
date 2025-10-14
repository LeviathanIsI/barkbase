import PropertyItem from './PropertyItem';

const PropertyList = ({ data, onEdit, onDelete }) => {
  if (!data || !data.groups || data.groups.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center">
        <p className="text-sm text-muted">No properties found for this object type</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {data.groups.map((group) => (
        <div key={group.recordId} className="rounded-lg border border-border bg-surface">
          {/* Group Header */}
          <div className="border-b border-border bg-surface/50 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-text">{group.label}</h3>
                {group.properties && (
                  <p className="mt-0.5 text-xs text-muted">
                    {group.properties.length} {group.properties.length === 1 ? 'property' : 'properties'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Group Properties */}
          <div className="divide-y divide-border">
            {group.properties && group.properties.length > 0 ? (
              group.properties.map((property) => (
                <PropertyItem
                  key={property.recordId}
                  property={property}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))
            ) : (
              <div className="px-6 py-4 text-sm text-muted">
                No properties in this group
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PropertyList;
