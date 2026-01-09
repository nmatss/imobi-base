# E-Signature Integration with ClickSign - Complete Setup Guide

## Overview

This document provides comprehensive setup and usage instructions for the ClickSign e-signature integration in ImobiBase. The integration enables legally valid electronic signatures for contracts in Brazil, complying with ICP-Brasil standards and LGPD requirements.

## Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Setup](#setup)
4. [API Reference](#api-reference)
5. [Usage Examples](#usage-examples)
6. [Compliance](#compliance)
7. [Troubleshooting](#troubleshooting)

---

## Features

### Core Capabilities

- **Document Upload & Management**: Upload PDF contracts for signature
- **Multi-Party Signatures**: Support for multiple signers (landlord, tenant, witnesses, etc.)
- **Sequential & Parallel Signing**: Configure signing order
- **Signature Tracking**: Real-time status updates via webhooks
- **Certificate Support**: ICP-Brasil digital certificate integration
- **Audit Trail**: Complete logging for legal compliance
- **Template System**: Pre-configured contract templates
- **Auto-Generation**: Generate contracts from data

### Contract Types Supported

1. **Rental Contracts** (Contratos de Locação)
   - Residential and commercial
   - Automatic contract generation
   - Landlord → Tenant → Witnesses signing order

2. **Sale Contracts** (Contratos de Compra e Venda)
   - Property sale agreements
   - Buyer, seller, and realtor signatures

3. **Service Contracts** (Contratos de Prestação de Serviços)
   - Real estate services
   - Property management agreements

### Authentication Methods

- Email verification (default)
- SMS token
- WhatsApp verification
- PIX authentication
- Selfie verification
- ICP-Brasil digital certificates

---

## Architecture

### Server-Side Components

```
server/integrations/clicksign/
├── clicksign-client.ts       # API client with retry logic
├── document-service.ts        # Document upload & management
├── signer-service.ts          # Signer operations
├── webhook-handler.ts         # Event processing
├── template-manager.ts        # Contract templates
├── contract-generator.ts      # PDF generation
├── certificate-storage.ts     # Digital certificates
└── audit.ts                   # Compliance & audit trail
```

### Client-Side Components

```
client/src/components/esignature/
├── SignatureRequest.tsx       # Create signature requests
├── SignatureStatus.tsx        # Track progress
├── SignerList.tsx            # Manage signers
└── DocumentPreview.tsx       # Preview before signing
```

### Database Schema Extensions

The integration uses existing contract tables and adds:
- `clicksignDocumentKey` field to contracts table
- Audit logs for all signature events
- Certificate storage (future enhancement)

---

## Setup

### 1. Environment Variables

Add to your `.env` file:

```bash
# ClickSign API Configuration
CLICKSIGN_API_KEY=your_clicksign_api_key_here
CLICKSIGN_WEBHOOK_SECRET=your_webhook_secret_here

# Optional: Custom ClickSign API URL (for testing)
# CLICKSIGN_API_URL=https://sandbox.clicksign.com/v3
```

### 2. Obtain ClickSign API Key

1. Create account at [ClickSign](https://www.clicksign.com/)
2. Navigate to Settings → Integrations → API
3. Generate new API key
4. Copy key to `.env` file

### 3. Configure Webhook

Set up webhook URL in ClickSign dashboard:

```
URL: https://your-domain.com/api/webhooks/clicksign
Events: All signature events
Secret: (generate and add to .env)
```

### 4. Install Dependencies

All required dependencies are already in `package.json`:

```json
{
  "jspdf": "^3.0.4",        // PDF generation
  "form-data": "^4.0.0"     // File uploads
}
```

If missing, install:

```bash
npm install jspdf form-data
npm install --save-dev @types/node
```

### 5. Database Migration

The integration uses existing schema. Optionally add these fields to contracts table:

```sql
ALTER TABLE contracts ADD COLUMN clicksign_document_key VARCHAR(255);
ALTER TABLE contracts ADD COLUMN clicksign_list_key VARCHAR(255);
ALTER TABLE contracts ADD COLUMN signed_at TIMESTAMP;
```

### 6. Test Connection

```typescript
import { getClickSignClient } from './server/integrations/clicksign/clicksign-client';

const client = getClickSignClient();
const connected = await client.testConnection();
console.log('ClickSign connected:', connected);
```

---

## API Reference

### Upload Document

**POST** `/api/esignature/upload`

Upload a PDF document for signature.

```json
{
  "tenantId": "tenant_123",
  "filename": "contract.pdf",
  "contentBase64": "base64_encoded_pdf",
  "deadline": "2024-12-31T23:59:59Z",
  "autoClose": true,
  "locale": "pt-BR"
}
```

**Response:**
```json
{
  "success": true,
  "document": {
    "key": "doc_abc123",
    "filename": "contract.pdf",
    "status": "draft",
    "uploadedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Create Signature Request

**POST** `/api/esignature/create-request`

Create a signature request with multiple signers.

```json
{
  "tenantId": "tenant_123",
  "documentKey": "doc_abc123",
  "listName": "Rental Contract Signatures",
  "signers": [
    {
      "name": "João Silva",
      "email": "joao@example.com",
      "cpf": "123.456.789-00",
      "phone": "+5511999999999",
      "role": "Locador"
    },
    {
      "name": "Maria Santos",
      "email": "maria@example.com",
      "cpf": "987.654.321-00",
      "role": "Locatário"
    }
  ],
  "signingConfig": {
    "order": "sequential",
    "refusable": true,
    "customMessage": "Por favor, assine o contrato de locação."
  }
}
```

### Send Invitations

**POST** `/api/esignature/send`

Send signature invitations to all signers.

```json
{
  "tenantId": "tenant_123",
  "listKey": "list_xyz789",
  "message": "Você tem um documento para assinar."
}
```

### Get Signature Status

**GET** `/api/esignature/status/:documentKey`

Get current signature status.

**Response:**
```json
{
  "success": true,
  "document": {
    "key": "doc_abc123",
    "filename": "contract.pdf",
    "status": "running",
    "isComplete": false,
    "uploadedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Get Signer Status

**GET** `/api/esignature/signers/:listKey`

Get detailed signer information.

**Response:**
```json
{
  "success": true,
  "signers": [
    {
      "name": "João Silva",
      "email": "joao@example.com",
      "status": "signed",
      "signedAt": "2024-01-15T14:30:00Z"
    },
    {
      "name": "Maria Santos",
      "email": "maria@example.com",
      "status": "viewed",
      "viewedAt": "2024-01-15T15:00:00Z"
    }
  ],
  "summary": {
    "total": 2,
    "signed": 1,
    "pending": 1,
    "refused": 0
  }
}
```

### Download Signed Document

**GET** `/api/esignature/download/:documentKey`

Download the fully signed PDF.

Returns PDF file with `Content-Disposition: attachment`.

### Cancel Request

**POST** `/api/esignature/cancel/:documentKey`

Cancel an ongoing signature request.

```json
{
  "tenantId": "tenant_123",
  "reason": "Contract terms changed"
}
```

### Resend Invitation

**POST** `/api/esignature/resend/:listKey/:signerKey`

Resend invitation to a specific signer.

```json
{
  "tenantId": "tenant_123"
}
```

---

## Usage Examples

### 1. Simple Document Signature

```typescript
import { DocumentService } from './server/integrations/clicksign/document-service';
import { SignerService } from './server/integrations/clicksign/signer-service';

const docService = new DocumentService();
const signerService = new SignerService();

// Upload document
const doc = await docService.uploadDocument({
  path: '/contracts/rental_123.pdf',
  filename: 'Contrato_Locacao.pdf',
  content_base64: pdfBase64,
  auto_close: true,
  locale: 'pt-BR',
});

// Create signature list
const list = await docService.createSignatureList(
  doc.key,
  'Rental Agreement Signatures'
);

// Add signers
const signers = await signerService.addSigners(
  doc.key,
  list.key,
  [
    {
      name: 'João Silva',
      email: 'joao@example.com',
      cpf: '123.456.789-00',
      role: 'Landlord',
    },
    {
      name: 'Maria Santos',
      email: 'maria@example.com',
      cpf: '987.654.321-00',
      role: 'Tenant',
    },
  ],
  {
    order: 'sequential',
    refusable: true,
  }
);

// Send invitations
await signerService.sendInvitations(list.key);
```

### 2. Generate and Sign Rental Contract

```typescript
import { contractGenerator } from './server/integrations/clicksign/contract-generator';

const contractData = {
  landlord: {
    name: 'João Silva',
    cpf: '123.456.789-00',
    address: 'Rua A, 123',
    email: 'joao@example.com',
    phone: '+5511999999999',
  },
  tenant: {
    name: 'Maria Santos',
    cpf: '987.654.321-00',
    address: 'Rua B, 456',
    email: 'maria@example.com',
  },
  property: {
    address: 'Av. Paulista, 1000',
    type: 'residential',
  },
  financial: {
    rentalValue: 2500,
    dueDay: 10,
    deposit: 2500,
    iptuIncluded: false,
    condoIncluded: true,
  },
  contract: {
    duration: 12,
    startDate: new Date('2024-02-01'),
    endDate: new Date('2025-01-31'),
    renewalType: 'automatic',
  },
};

const result = await contractGenerator.sendRentalContractForSignature(
  contractData,
  'contract_123'
);

console.log('Document key:', result.documentKey);
console.log('List key:', result.listKey);
```

### 3. Track Signature Progress

```typescript
import { SignerService } from './server/integrations/clicksign/signer-service';

const signerService = new SignerService();

const status = await signerService.getSignerStatus(listKey);

console.log(`Progress: ${status.summary.signed}/${status.summary.total}`);

status.signers.forEach(signer => {
  console.log(`${signer.name}: ${signer.status}`);
});
```

### 4. React Component Usage

```tsx
import { SignatureRequest } from '@/components/esignature/SignatureRequest';
import { SignatureStatus } from '@/components/esignature/SignatureStatus';

function ContractPage() {
  const [documentKey, setDocumentKey] = useState(null);
  const [listKey, setListKey] = useState(null);

  return (
    <div>
      <SignatureRequest
        tenantId="tenant_123"
        contractId="contract_456"
        onSuccess={(data) => {
          setDocumentKey(data.documentKey);
          setListKey(data.listKey);
        }}
      />

      {documentKey && listKey && (
        <SignatureStatus
          documentKey={documentKey}
          listKey={listKey}
        />
      )}
    </div>
  );
}
```

---

## Compliance

### LGPD (Brazilian GDPR)

The integration complies with LGPD requirements:

1. **Data Minimization**: Only collects necessary personal data
2. **Consent**: Signers explicitly consent to electronic signatures
3. **Purpose Limitation**: Data used only for contract signing
4. **Security**: All data encrypted in transit and at rest
5. **Audit Trail**: Complete record of all data access
6. **Right to Delete**: Automatic data cleanup after contract period

### ICP-Brasil Standards

Supports ICP-Brasil digital certificates:

- Certificate storage and validation
- Certificate chain verification
- Expiration monitoring
- Compliance with MP 2.200-2/2001

### Legal Validity

Electronic signatures are legally valid in Brazil under:

- **MP 2.200-2/2001**: Electronic signatures law
- **Lei 14.063/2020**: Electronic government services
- **ICP-Brasil**: Public key infrastructure

Signature types supported:
1. **Simple Electronic**: Email/SMS verification
2. **Advanced Electronic**: Certificate + biometrics
3. **Qualified Electronic**: ICP-Brasil certificates

---

## Troubleshooting

### Common Issues

#### 1. API Connection Fails

**Problem**: Cannot connect to ClickSign API

**Solutions**:
- Verify `CLICKSIGN_API_KEY` is set correctly
- Check network/firewall settings
- Test with sandbox URL first
- Verify API key has not expired

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://api.clicksign.com/v3/documents?limit=1
```

#### 2. Webhook Not Receiving Events

**Problem**: Webhooks not triggering updates

**Solutions**:
- Verify webhook URL is publicly accessible
- Check `CLICKSIGN_WEBHOOK_SECRET` matches dashboard
- Review webhook logs in ClickSign dashboard
- Test webhook endpoint manually

```bash
curl -X POST https://your-domain.com/api/webhooks/clicksign \
  -H "Content-Type: application/json" \
  -d '{"event":"document.signed","data":{}}'
```

#### 3. PDF Generation Fails

**Problem**: Contract PDFs not generating

**Solutions**:
- Verify jsPDF is installed
- Check template data is complete
- Review PDF generation logs
- Test with minimal data first

#### 4. Signer Not Receiving Email

**Problem**: Invitation emails not arriving

**Solutions**:
- Verify email address is correct
- Check spam/junk folders
- Confirm ClickSign email settings
- Resend invitation via API

#### 5. Certificate Validation Fails

**Problem**: ICP-Brasil certificate rejected

**Solutions**:
- Verify certificate is not expired
- Check certificate chain is complete
- Confirm issuer is ICP-Brasil accredited
- Review certificate format (PEM/DER)

### Debug Mode

Enable detailed logging:

```typescript
// In clicksign-client.ts
console.log('Request:', endpoint, options);
console.log('Response:', response);
```

### Support

For issues not covered here:

1. Check ClickSign documentation: https://developers.clicksign.com
2. Review server logs: `tail -f logs/server.log`
3. Test in sandbox environment first
4. Contact ClickSign support: suporte@clicksign.com

---

## Advanced Features

### Custom Templates

Create custom contract templates:

```typescript
import { templateManager } from './server/integrations/clicksign/template-manager';

const customTemplate = {
  id: 'custom-lease-template',
  name: 'Custom Lease Agreement',
  category: 'rental',
  templateUrl: '/templates/custom-lease.pdf',
  fields: [
    {
      name: 'custom_field',
      type: 'text',
      required: true,
      x: 100,
      y: 200,
      page: 1,
    },
  ],
  variables: {
    '{{CUSTOM_VAR}}': 'custom_field',
  },
  signaturePositions: {
    party1: { x: 100, y: 700, page: 2 },
    party2: { x: 350, y: 700, page: 2 },
  },
};

templateManager.registerTemplate(customTemplate);
```

### Audit Reports

Generate compliance reports:

```typescript
import { auditTrailService } from './server/integrations/clicksign/audit';

const report = await auditTrailService.generateDocumentAuditReport('doc_abc123');

console.log('Total events:', report.summary.totalEvents);
console.log('LGPD compliant:', report.complianceStatus.lgpdCompliant);
console.log('ICP-Brasil compliant:', report.complianceStatus.icpBrasilCompliant);
```

### Certificate Management

Manage digital certificates:

```typescript
import { certificateStorage } from './server/integrations/clicksign/certificate-storage';

// Store certificate
const cert = await certificateStorage.storeCertificate({
  tenantId: 'tenant_123',
  userId: 'user_456',
  certificateType: 'ICP-Brasil',
  holderName: 'João Silva',
  holderCPF: '123.456.789-00',
  issuer: 'AC Serpro',
  serialNumber: '1234567890',
  validFrom: new Date(),
  validUntil: new Date('2025-12-31'),
  status: 'active',
});

// Validate certificate
const validation = await certificateStorage.validateCertificate(cert.id);
if (!validation.valid) {
  console.log('Errors:', validation.errors);
}
```

---

## Best Practices

1. **Always use sequential signing** for rental contracts (landlord first)
2. **Set reasonable deadlines** (30 days recommended)
3. **Enable refusal option** for transparency
4. **Send reminder emails** after 7 days
5. **Archive signed documents** securely
6. **Keep audit trails** for 5+ years
7. **Test in sandbox** before production
8. **Monitor webhook events** for failures
9. **Validate CPF format** before submission
10. **Use custom messages** to explain the document

---

## Security Considerations

1. **API Keys**: Store in environment variables, never in code
2. **Webhook Secrets**: Validate all incoming webhooks
3. **PDF Content**: Sanitize all user input before PDF generation
4. **Personal Data**: Encrypt PII in database
5. **Access Control**: Restrict document access to authorized users
6. **HTTPS Only**: Never use HTTP for production
7. **Rate Limiting**: Implement on all endpoints
8. **Audit Logging**: Log all signature operations

---

## Performance Optimization

1. **Batch Operations**: Group multiple signers in one request
2. **Caching**: Cache template data
3. **Async Processing**: Use background jobs for PDF generation
4. **CDN**: Serve signed documents via CDN
5. **Database Indexes**: Index on documentKey and listKey fields
6. **Webhook Queue**: Process webhooks asynchronously

---

## Roadmap

Future enhancements planned:

- [ ] Bulk signature requests
- [ ] Template editor UI
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Mobile app integration
- [ ] Video signature verification
- [ ] Blockchain timestamping
- [ ] AI-powered document review

---

## License

This integration is part of ImobiBase and follows the same license terms.

---

## Contributors

- Agent 8 - E-Signature Engineer
- ClickSign API Team
- ImobiBase Development Team

---

**Last Updated**: December 2024
**Version**: 1.0.0
