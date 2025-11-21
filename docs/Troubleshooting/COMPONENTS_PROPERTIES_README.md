# Property Components

Reusable components for working with properties throughout BarkBase.

## Components

### PropertySelector

A dropdown/modal component for selecting properties. Used in filters, workflows, forms, etc.

**Props:**
- `objectType` - The object type to show properties for (required)
- `selectedProperty` - Currently selected property
- `onSelect` - Callback when a property is selected
- `allowedTypes` - Array of allowed property types to filter by (optional)
- `allowedGroups` - Array of allowed groups to filter by (optional)
- `showSearch` - Show search input (default: true)
- `showObjectSelector` - Allow switching object types (default: false)
- `placeholder` - Placeholder text (default: "Select a property...")
- `className` - Additional CSS classes

**Example:**
```jsx
import PropertySelector from '@/components/properties/PropertySelector';

function MyComponent() {
  const [selectedProperty, setSelectedProperty] = useState(null);

  return (
    <PropertySelector
      objectType="pets"
      selectedProperty={selectedProperty}
      onSelect={setSelectedProperty}
      allowedTypes={['string', 'number']} // Only show string and number fields
    />
  );
}
```

### PropertyConditionBuilder

Build filter conditions with property, operator, and value selection.

**Props:**
- `objectType` - The object type (required)
- `condition` - Initial condition object `{ property, operator, value }`
- `onChange` - Callback when condition changes
- `onRemove` - Callback to remove this condition
- `showRemove` - Show remove button (default: true)
- `className` - Additional CSS classes

**Example:**
```jsx
import PropertyConditionBuilder from '@/components/properties/PropertyConditionBuilder';

function MyFilterBuilder() {
  const [conditions, setConditions] = useState([]);

  const addCondition = () => {
    setConditions([...conditions, { id: Date.now() }]);
  };

  const updateCondition = (index, condition) => {
    const newConditions = [...conditions];
    newConditions[index] = condition;
    setConditions(newConditions);
  };

  const removeCondition = (index) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  return (
    <div>
      {conditions.map((condition, index) => (
        <PropertyConditionBuilder
          key={condition.id}
          objectType="pets"
          condition={condition}
          onChange={(newCondition) => updateCondition(index, newCondition)}
          onRemove={() => removeCondition(index)}
        />
      ))}
      <button onClick={addCondition}>Add Condition</button>
    </div>
  );
}
```

## Hooks

### useProperties

Hook for fetching and caching properties.

**Methods:**
- `fetchProperties(objectType)` - Fetch properties for an object type
- `getPropertiesFlat(objectType)` - Get flattened array of properties
- `getPropertiesGrouped(objectType)` - Get properties grouped by category
- `getProperty(objectType, propertyName)` - Get a specific property by name
- `refreshProperties(objectType)` - Refresh cached properties

**Example:**
```jsx
import { useProperties } from '@/hooks/useProperties';

function MyComponent() {
  const { fetchProperties, getPropertiesFlat, loading } = useProperties();

  useEffect(() => {
    fetchProperties('pets');
  }, []);

  const petProperties = getPropertiesFlat('pets');

  return (
    <div>
      {loading.pets ? (
        <p>Loading...</p>
      ) : (
        petProperties.map((prop) => (
          <div key={prop.id}>{prop.label}</div>
        ))
      )}
    </div>
  );
}
```

### useMultipleProperties

Hook for fetching multiple object types at once.

**Example:**
```jsx
import { useMultipleProperties } from '@/hooks/useProperties';

function MyComponent() {
  const { properties, loading } = useMultipleProperties(['pets', 'owners', 'bookings']);

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      {/* Access properties.pets, properties.owners, properties.bookings */}
    </div>
  );
}
```

## Integration Points

These components are designed to be used throughout BarkBase:

- **Workflows** - Build trigger conditions and filter criteria
- **Reports** - Select fields to include in reports
- **Forms** - Dynamic form builders
- **Filters** - Advanced filtering on list pages
- **Views** - Customize table columns
- **Exports** - Select fields to export
- **Integrations** - Map fields to external systems
