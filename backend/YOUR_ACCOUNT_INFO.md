# Your BarkBase Account Information

## Account IDs
- **User ID**: cmgtdqv2g0001us2syvg55ugt
- **Tenant ID**: cmgtdqv000000us2sh5t96che  
- **Membership ID**: cmgtdqv7i0003us2sysxfuxco

## Login Credentials
- **Email**: joshua.r.bradford1@gmail.com
- **Tenant**: testing

## Sample Data Created
- 3 Kennels (Suite A1, Standard K1, Daycare Area 1)
- 3 Services (Basic Grooming, Playtime Session, Medication Administration)
- 5 Owners with pets
- Sample bookings
- Staff profile for you (Owner/Manager)

## Quick Commands

### Re-seed your account data:
```bash
node backend/prisma/seed.yourAccount.js
```

### Start the app:
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend  
cd frontend && npm run dev
```

### Clear and re-seed (if needed):
```bash
# This will clear ONLY your tenant's data and re-seed
cd backend
node scripts/nuke-data.js
node prisma/seed.yourAccount.js
```

## Notes
- All seed data is scoped to YOUR tenant only
- The seed script won't recreate your user/tenant (just adds data)
- You can run it multiple times safely
