/**
 * UserSelect - Staff user selector component
 * Fetches and displays staff users for assignment
 */
import Select from 'react-select';
import { useStaffUsers } from '../../../hooks';
import { cn } from '@/lib/cn';

// Dark theme styles for react-select
const darkSelectStyles = {
  control: (base, state) => ({
    ...base,
    backgroundColor: 'var(--bb-color-bg-body)',
    borderColor: state.isFocused ? 'var(--bb-color-accent)' : 'var(--bb-color-border-subtle)',
    borderRadius: '0.375rem',
    minHeight: '38px',
    boxShadow: 'none',
    '&:hover': {
      borderColor: 'var(--bb-color-border-strong)',
    },
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: 'var(--bb-color-bg-elevated)',
    border: '1px solid var(--bb-color-border-subtle)',
    borderRadius: '0.375rem',
    zIndex: 50,
  }),
  menuList: (base) => ({
    ...base,
    padding: '4px',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused
      ? 'var(--bb-color-bg-surface)'
      : state.isSelected
        ? 'var(--bb-color-accent-soft)'
        : 'transparent',
    color: 'var(--bb-color-text-primary)',
    borderRadius: '0.25rem',
    padding: '8px 12px',
    cursor: 'pointer',
    '&:active': {
      backgroundColor: 'var(--bb-color-bg-surface)',
    },
  }),
  singleValue: (base) => ({
    ...base,
    color: 'var(--bb-color-text-primary)',
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: 'var(--bb-color-bg-surface)',
    borderRadius: '0.25rem',
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: 'var(--bb-color-text-primary)',
    padding: '2px 6px',
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: 'var(--bb-color-text-tertiary)',
    '&:hover': {
      backgroundColor: 'var(--bb-color-status-negative)',
      color: 'white',
    },
  }),
  input: (base) => ({
    ...base,
    color: 'var(--bb-color-text-primary)',
  }),
  placeholder: (base) => ({
    ...base,
    color: 'var(--bb-color-text-tertiary)',
  }),
  noOptionsMessage: (base) => ({
    ...base,
    color: 'var(--bb-color-text-tertiary)',
  }),
  loadingMessage: (base) => ({
    ...base,
    color: 'var(--bb-color-text-tertiary)',
  }),
  indicatorSeparator: () => ({
    display: 'none',
  }),
  dropdownIndicator: (base) => ({
    ...base,
    color: 'var(--bb-color-text-tertiary)',
    '&:hover': {
      color: 'var(--bb-color-text-secondary)',
    },
  }),
  clearIndicator: (base) => ({
    ...base,
    color: 'var(--bb-color-text-tertiary)',
    '&:hover': {
      color: 'var(--bb-color-text-secondary)',
    },
  }),
};

// Custom option component to show user details
function formatOptionLabel({ label, email, role }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm">{label}</div>
        {email && <div className="text-xs text-[var(--bb-color-text-tertiary)]">{email}</div>}
      </div>
      {role && (
        <span
          className={cn(
            'text-xs px-2 py-0.5 rounded',
            role === 'admin'
              ? 'bg-[rgba(139,92,246,0.2)] text-[#A78BFA]'
              : role === 'manager'
                ? 'bg-[rgba(59,130,246,0.2)] text-[#60A5FA]'
                : 'bg-[var(--bb-color-bg-surface)] text-[var(--bb-color-text-tertiary)]'
          )}
        >
          {role}
        </span>
      )}
    </div>
  );
}

export default function UserSelect({
  value,
  onChange,
  placeholder = 'Select user...',
  isMulti = false,
  isDisabled = false,
}) {
  const { data: usersData, isLoading } = useStaffUsers();
  const users = usersData?.data || usersData || [];

  // Map users to select options
  const options = users.map((user) => ({
    value: user.id,
    label: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
    email: user.email,
    role: user.role,
  }));

  // Get selected value(s)
  const selectedValue = isMulti
    ? options.filter((o) => (value || []).includes(o.value))
    : options.find((o) => o.value === value) || null;

  // Handle change
  const handleChange = (selected) => {
    if (isMulti) {
      onChange(selected ? selected.map((s) => s.value) : []);
    } else {
      onChange(selected?.value || null);
    }
  };

  return (
    <Select
      options={options}
      value={selectedValue}
      onChange={handleChange}
      isMulti={isMulti}
      isLoading={isLoading}
      isDisabled={isDisabled}
      placeholder={isLoading ? 'Loading users...' : placeholder}
      formatOptionLabel={formatOptionLabel}
      styles={darkSelectStyles}
      noOptionsMessage={() => 'No users found'}
      loadingMessage={() => 'Loading users...'}
      isClearable
      classNamePrefix="user-select"
    />
  );
}
