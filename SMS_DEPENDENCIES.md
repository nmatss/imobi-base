# SMS Service - Dependencies Installation Guide

## Required Dependencies

### 1. Twilio SDK
**Package:** `twilio`
**Version:** ^4.20.0
**Purpose:** Official Twilio API client for sending SMS/MMS

```bash
npm install twilio
```

### 2. Phone Number Library
**Package:** `libphonenumber-js`
**Version:** ^1.10.51
**Purpose:** Parse, format, and validate international phone numbers

```bash
npm install libphonenumber-js
```

## Installation

### Quick Install
```bash
npm install twilio libphonenumber-js
```

### Or add to package.json

```json
{
  "dependencies": {
    "twilio": "^4.20.0",
    "libphonenumber-js": "^1.10.51"
  }
}
```

Then run:
```bash
npm install
```

## Type Definitions

TypeScript definitions are included in both packages:
- ✅ `twilio` - Includes @types
- ✅ `libphonenumber-js` - Includes TypeScript support

No additional `@types` packages needed.

## Verification

After installation, verify the packages:

```bash
npm list twilio
npm list libphonenumber-js
```

Expected output:
```
imobibase@1.0.0 /path/to/imobibase
├── twilio@4.20.0
└── libphonenumber-js@1.10.51
```

## Test Import

Create a test file to verify:

```typescript
// test-sms-deps.ts
import twilio from 'twilio';
import { parsePhoneNumber } from 'libphonenumber-js';

console.log('Twilio:', typeof twilio); // Should output: function
console.log('PhoneNumber:', typeof parsePhoneNumber); // Should output: function
```

Run:
```bash
npx tsx test-sms-deps.ts
```

## Environment Setup

After installing dependencies, configure your environment:

1. Copy `.env.example` to `.env`
2. Add Twilio credentials:

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+5511999999999
```

3. Get credentials from: https://console.twilio.com

## Database Setup

Run the SQL schema:

```bash
psql $DATABASE_URL -f db/schema-sms.sql
```

Or for Supabase:
```bash
psql "postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres" -f db/schema-sms.sql
```

## Troubleshooting

### Issue: Cannot find module 'twilio'
**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: TypeScript errors
**Solution:**
```bash
npm install --save-dev @types/node
```

### Issue: Twilio authentication fails
**Solution:**
1. Verify credentials in Twilio Console
2. Check `.env` file has correct values
3. Restart development server

## Production Deployment

### Vercel
Add environment variables in Vercel dashboard:
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_PHONE_NUMBER

### Docker
Include in Dockerfile:
```dockerfile
RUN npm install twilio libphonenumber-js
```

### Heroku
Dependencies auto-installed from package.json

## Version Updates

To update to latest versions:

```bash
npm update twilio libphonenumber-js
```

Or specific version:
```bash
npm install twilio@latest libphonenumber-js@latest
```

## License Information

- **twilio**: MIT License
- **libphonenumber-js**: MIT License

Both are free for commercial use.

## Support

- Twilio Docs: https://www.twilio.com/docs/sms
- libphonenumber-js: https://www.npmjs.com/package/libphonenumber-js

---

**Installation Time:** ~2 minutes
**Total Package Size:** ~5 MB
**Node Version Required:** >= 14.0.0
