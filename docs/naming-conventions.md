

# Property Naming Conventions

## Overview

BarkBase enforces strict naming conventions to ensure consistency, prevent collisions, and enable automatic tooling. These conventions are based on industry standards from HubSpot, Salesforce, and enterprise CRM systems.

## Four-Tier Property Classification

### 1. System Properties (Immutable)

**Pattern:** `sys_lowercase_underscore`

**Prefix:** `sys_`

**Examples:**
- `sys_record_id`
- `sys_created_at`
- `sys_updated_at`
- `sys_tenant_id`

**Rules:**
- Must start with `sys_` prefix
- Use lowercase with underscores
- Cannot be modified or deleted
- Created and managed by BarkBase system

### 2. Standard Properties (BarkBase-Defined)

**Pattern:** `UpperCamelCase`

**Semantic Prefixes:**
- `Date` - Date fields (e.g., `DateOfBirth`, `DateJoined`)
- `DateTime` - DateTime fields (e.g., `DateTimeLastLogin`)
- `Status` - Status fields (e.g., `StatusCode`, `StatusReason`)
- `Is` - Boolean flags (e.g., `IsActive`, `IsVerified`)
- `Has` - Boolean flags (e.g., `HasInsurance`, `HasAllergies`)
- `Total` - Aggregate values (e.g., `TotalCents`, `TotalBookings`)
- `Count` - Count values (e.g., `CountVisits`, `CountReferrals`)

**Examples:**
- `FirstName`
- `LastName`
- `EmailAddress`
- `PhoneNumber`
- `DateOfBirth`
- `IsNeutered`
- `BalanceDueCents`

**Rules:**
- Use UpperCamelCase (PascalCase)
- Start with uppercase letter
- No underscores or hyphens
- Use semantic prefixes where appropriate
- Cannot be deleted, but can be archived

### 3. Protected Properties (Business Logic)

**Pattern:** `UpperCamelCase` (same as standard)

**Examples:**
- `BalanceDueCents`
- `DepositCents`
- `TotalCents`
- `PaidCents`
- `StatusCode`

**Rules:**
- Follow same naming as standard properties
- Require approval workflow for modifications
- Cannot be deleted without admin approval
- Critical to business operations

### 4. Custom Properties (User-Defined)

**Pattern:** `custom_lowercase_underscore_suffix`

**Prefix:** `custom_`

**Type Suffixes:**
- `_d` - Date
- `_dt` - DateTime
- `_t` - Text / Multi-line Text
- `_n` - Number
- `_c` - Currency
- `_b` - Boolean
- `_ss` - Single Select
- `_ms` - Multi Select
- `_f` - Formula / Calculated
- `_ru` - Rollup

**Examples:**
- `custom_favorite_color_ss`
- `custom_birthday_d`
- `custom_loyalty_points_n`
- `custom_special_instructions_t`
- `custom_is_vip_b`
- `custom_preferred_activities_ms`
- `custom_total_visits_ru`

**Rules:**
- Must start with `custom_` prefix
- Use lowercase with underscores
- Must end with appropriate type suffix
- Can be fully edited and deleted by users

## Grouped Properties

For related properties, use shared prefixes:

**Examples:**
- `Booking_StartDate`, `Booking_EndDate`, `Booking_Status`
- `Payment_Method`, `Payment_ProcessedAt`, `Payment_AmountCents`
- `Medical_LastCheckup`, `Medical_VetName`, `Medical_Conditions`

## Reserved Keywords

The following keywords **CANNOT** be used as property names:

### SQL Keywords
`select`, `insert`, `update`, `delete`, `drop`, `create`, `alter`, `table`, `where`, `from`, `join`, `group`, `order`, `having`, `limit`, `offset`

### JavaScript Keywords
`class`, `function`, `return`, `if`, `else`, `for`, `while`, `do`, `switch`, `case`, `break`, `continue`, `try`, `catch`, `throw`, `new`, `this`

### BarkBase System Terms
`tenant`, `user`, `admin`, `system`, `metadata`, `schema`, `migration`

## Naming Decision Tree

```
Start
│
├─ Is this a system field (core infrastructure)?
│  └─ YES → Use sys_lowercase_underscore
│
├─ Is this created by BarkBase (ships with all deployments)?
│  └─ YES → Use UpperCamelCase
│     └─ Does it have business logic dependencies?
│        └─ YES → Mark as Protected Property
│        └─ NO → Mark as Standard Property
│
└─ Is this user-defined (custom)?
   └─ YES → Use custom_lowercase_type_suffix
```

## Examples by Object Type

### Pets
- **System:** `sys_record_id`, `sys_created_at`
- **Standard:** `Name`, `Breed`, `Color`, `Weight`, `DateOfBirth`, `IsNeutered`
- **Custom:** `custom_favorite_toy_t`, `custom_energy_level_ss`, `custom_gotcha_day_d`

### Owners
- **System:** `sys_record_id`, `sys_tenant_id`
- **Standard:** `FirstName`, `LastName`, `EmailAddress`, `PhoneNumber`, `AddressLine1`
- **Custom:** `custom_referral_source_ss`, `custom_preferred_contact_time_dt`

### Bookings
- **System:** `sys_record_id`, `sys_created_at`
- **Standard:** `CheckInDate`, `CheckOutDate`, `StatusCode`
- **Protected:** `DepositCents`, `TotalCents`, `BalanceDueCents`
- **Custom:** `custom_special_requests_t`, `custom_pickup_notes_t`

### Payments
- **System:** `sys_record_id`, `sys_tenant_id`
- **Protected:** `AmountCents`, `PaidCents`, `RefundedCents`
- **Standard:** `PaymentMethod`, `ProcessedAt`, `TransactionId`

## Validation Rules

### Length
- Minimum: 2 characters
- Maximum: 100 characters

### Characters
- Allowed: `a-z`, `A-Z`, `0-9`, `_`
- Not allowed: Spaces, hyphens, special characters

### Case Sensitivity
- Property names are case-sensitive
- `FirstName` ≠ `firstname` ≠ `firstName`

## Best Practices

### DO:
✅ Use descriptive, clear names
✅ Follow the type-specific pattern strictly
✅ Use semantic prefixes for standard properties
✅ Group related properties with shared prefixes
✅ Include type suffix for custom properties

### DON'T:
❌ Use abbreviations unless industry-standard (e.g., `ID` is OK, `Nm` for Name is not)
❌ Mix naming conventions
❌ Use reserved keywords
❌ Create overly long names (>50 chars if possible)
❌ Use ambiguous names (`Data`, `Info`, `Value`)

## Migration from Legacy Names

If you have existing properties with non-conforming names:

1. **Audit:** Run naming validator on all properties
2. **Plan:** Identify properties requiring rename
3. **Export:** Export data from non-conforming properties
4. **Create:** Create new properties with correct names
5. **Migrate:** Copy data to new properties
6. **Archive:** Archive old properties after validation

## Interactive Validator

Use the naming validator in the Property Creation Wizard:

```javascript
// API endpoint
POST /api/v1/properties/validate-name
{
  "propertyName": "my_property_name",
  "propertyType": "custom",
  "dataType": "text"
}

// Response
{
  "valid": false,
  "errors": ["Custom property with data type 'text' should end with '_t'"],
  "suggestions": ["custom_my_property_name_t"]
}
```

## Naming Examples from BarkBase Schemas

### Complete Pet Schema
```
System:
- sys_record_id
- sys_tenant_id
- sys_created_at
- sys_updated_at

Standard:
- Name
- Breed
- Color
- Weight
- DateOfBirth
- Sex
- IsNeutered
- IsDeceased
- MicrochipNumber

Custom Examples:
- custom_favorite_food_t
- custom_energy_level_ss (High/Medium/Low)
- custom_gotcha_day_d
- custom_vet_expenses_ytd_c
- custom_is_service_animal_b
```

### Complete Booking Schema
```
System:
- sys_record_id
- sys_tenant_id
- sys_created_at

Standard:
- CheckInDate
- CheckOutDate
- CheckInTime
- CheckOutTime
- StatusCode
- StatusReason

Protected:
- DepositCents
- TotalCents
- BalanceDueCents
- TaxCents

Custom Examples:
- custom_special_diet_t
- custom_pickup_authorized_persons_ms
- custom_last_daycare_visit_d
```

## Tools & Resources

- **Naming Validator API:** `/api/v1/properties/validate-name`
- **Suggestion Generator:** Provides naming suggestions from description
- **Collision Checker:** Checks for existing property names
- **Interactive Naming Guide:** In Property Creation Wizard

## Support

For questions about naming conventions:
- Refer to this documentation
- Use the interactive validator in the UI
- Contact BarkBase support for complex cases

