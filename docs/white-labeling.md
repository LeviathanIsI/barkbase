# White-Label Customization

## Theme Pipeline
- Tenant theme JSON stored in Prisma `Tenant.theme`
- Frontend `tenant` store merges defaults and applies CSS variables
- Colors defined in Tailwind config via runtime variables (primary/secondary/accent/etc.)

### Updating Theme via API
```
PUT /api/v1/tenants/theme
{
  "colors": {
    "primary": "45 125 220",
    "background": "255 255 255"
  },
  "fonts": {
    "sans": "\"Poppins\", sans-serif"
  },
  "mode": "light"
}
```

## Terminology
- `Tenant.terminology` field stores overrides (e.g., kennel → suite)
- Sidebar and UI copy read from the terminology map

## Feature Flags
- `Tenant.featureFlags` toggles optional modules per subscription tier
- Accessible via `PUT /api/v1/tenants/features`

## Email Templates
- Nodemailer transport load templates per tenant (TODO: hooking view renderers)
- Template metadata stored alongside theme; ensure required merge vars remain intact

## Domain & SSL
- `customDomain` stored on tenant; reverse proxy layer (Traefik/Nginx) maps domain → tenant slug
- For new domains, provision certificates via Let's Encrypt ACME flow (documented in deployment guide)

## Asset Management
- Uploaded logos saved under `uploads/<tenantId>/`
- `applyTheme` sets `--logo-url` for consuming components (header, login screen)

## Future Enhancements
- Inline preview editor for color & typography adjustments
- Per-tenant Storybook theme overrides for rapid QA
- White-label email builder integrating MJML or Handlebars templates
