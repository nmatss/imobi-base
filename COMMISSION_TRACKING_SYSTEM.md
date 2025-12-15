# Commission Tracking System - ImobiBase

## Overview

The Commission Tracking System is a comprehensive solution for managing, calculating, and tracking broker commissions in ImobiBase. It provides real-time visibility into commission earnings, status tracking, and performance analytics.

## Features

### 1. Commission Calculator
- **Interactive Calculator**: Calculate commissions for sales and rentals
- **Flexible Parameters**:
  - Transaction type (Sale/Rental)
  - Transaction value
  - Commission rate (%)
  - Agency/Broker split percentage
  - Multiple broker support
- **Visual Breakdown**: Pie chart showing commission distribution
- **Real-time Calculations**: Instant feedback on commission amounts

### 2. Commission Dashboard
- **Summary Metrics**:
  - Total commissions
  - Pending commissions
  - Approved commissions
  - Paid commissions
- **Filtering Options**:
  - By status (Pending/Approved/Paid)
  - By type (Sale/Rental)
  - By broker
  - By time period

### 3. Commission Cards
Each commission displays:
- Property and client information
- Broker details with avatar
- Transaction type badge
- Status badge with color coding
- Commission breakdown:
  - Transaction value
  - Commission rate
  - Gross commission
  - Agency share
  - Broker commission (highlighted)
- Date information
- Approval and payment dates
- Notes field

### 4. Broker Performance Summary
- **Top Performers Podium**: Highlights top 3 brokers
- **Full Ranking List**: Shows all brokers with:
  - Rank position
  - Total commissions
  - Transaction count
  - Sales count
  - Rentals count
  - Progress bars
  - Commission status breakdown (Pending/Approved/Paid)

### 5. Commission Workflow
Status progression:
1. **Pending**: Commission generated but not yet approved
2. **Approved**: Commission approved and ready for payment
3. **Paid**: Commission has been paid to broker

## Data Structure

### Commission Table Schema

```sql
CREATE TABLE commissions (
  id VARCHAR PRIMARY KEY,
  tenant_id VARCHAR NOT NULL,
  sale_id VARCHAR,
  rental_contract_id VARCHAR,
  broker_id VARCHAR NOT NULL,
  transaction_type TEXT NOT NULL, -- 'sale' | 'rental'
  transaction_value DECIMAL(12, 2) NOT NULL,
  commission_rate DECIMAL(5, 2) NOT NULL,
  gross_commission DECIMAL(12, 2) NOT NULL,
  agency_split DECIMAL(5, 2) NOT NULL DEFAULT 50,
  broker_commission DECIMAL(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_at TIMESTAMP,
  paid_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

## File Structure

### Frontend Components

```
client/src/
├── pages/financial/components/
│   └── CommissionsTab.tsx          # Main commission tab component
├── components/commissions/
│   ├── CommissionCalculator.tsx    # Interactive calculator
│   ├── CommissionCard.tsx          # Individual commission display
│   └── BrokerCommissionSummary.tsx # Broker performance rankings
```

### Backend

```
server/
└── routes.ts                       # API endpoints for commissions

shared/
└── schema.ts                       # Database schema definition

migrations/
└── add-commissions-table.sql      # Database migration
```

## API Endpoints

### GET /api/commissions
Fetch all commissions with optional filters.

**Query Parameters**:
- `period`: Time period (currentMonth, lastMonth, year)
- `status`: Filter by status (pending, approved, paid)
- `type`: Filter by type (sale, rental)
- `brokerId`: Filter by specific broker

**Response**:
```json
{
  "commissions": [...],
  "brokerPerformance": [...]
}
```

### GET /api/commissions/:id
Fetch specific commission details.

### PATCH /api/commissions/:id/status
Update commission status.

**Body**:
```json
{
  "status": "approved" | "paid" | "pending"
}
```

### POST /api/commissions
Create a new commission record.

## Default Commission Rates

### Sales
- **Default Rate**: 6% of sale value
- **Example**: R$ 500,000 sale = R$ 30,000 gross commission
- **With 50% broker split**: R$ 15,000 to broker, R$ 15,000 to agency

### Rentals
- **Default Rate**: 100% of first month rent
- **Example**: R$ 3,000 monthly rent = R$ 3,000 gross commission
- **With 50% broker split**: R$ 1,500 to broker, R$ 1,500 to agency

## Integration Points

### 1. Property Sales Integration
When a sale is registered:
1. Commission is automatically calculated based on sale value
2. Commission record is created with "pending" status
3. Linked to sale ID for traceability
4. Financial entry is created for accounting

### 2. Rental Contracts Integration
When a rental contract is created:
1. Commission calculated based on first month rent
2. Commission record created with "pending" status
3. Linked to rental contract ID
4. Financial entry is created for accounting

### 3. Financial Module Integration
- Commission transactions appear in financial dashboard
- Categorized as "Comissões" in financial reports
- Tracked in cash flow and revenue reports
- Included in financial analytics

## Commission Calculation Formula

```javascript
// Calculate gross commission
const grossCommission = transactionValue * (commissionRate / 100);

// Calculate broker share
const brokerTotalShare = grossCommission * (agencySplit / 100);

// Calculate agency share
const agencyShare = grossCommission - brokerTotalShare;

// If multiple brokers
const perBrokerShare = brokerTotalShare / numberOfBrokers;
```

## Usage Examples

### Example 1: Property Sale
- **Sale Value**: R$ 800,000
- **Commission Rate**: 6%
- **Broker Split**: 50%

**Calculation**:
- Gross Commission: R$ 48,000
- Agency Share: R$ 24,000
- Broker Share: R$ 24,000

### Example 2: Rental Contract
- **Monthly Rent**: R$ 4,500
- **Commission Rate**: 100% (1 month)
- **Broker Split**: 60%

**Calculation**:
- Gross Commission: R$ 4,500
- Agency Share: R$ 1,800
- Broker Share: R$ 2,700

### Example 3: Multiple Brokers
- **Sale Value**: R$ 1,000,000
- **Commission Rate**: 5%
- **Broker Split**: 50%
- **Number of Brokers**: 2

**Calculation**:
- Gross Commission: R$ 50,000
- Agency Share: R$ 25,000
- Total Broker Share: R$ 25,000
- Per Broker: R$ 12,500 each

## UI Components

### Commission Calculator
Location: Financial → Commissions Tab → Calculator

Features:
- Type selection (Sale/Rental)
- Value input with currency formatting
- Rate input with percentage
- Split percentage slider
- Number of brokers selector
- Real-time calculation results
- Visual breakdown chart

### Commission List View
Location: Financial → Commissions Tab → Listagem

Features:
- Grid layout of commission cards
- Filter by status, type, and broker
- Color-coded status badges
- Quick action menu per card
- Responsive design

### Broker Performance View
Location: Financial → Commissions Tab → Por Corretor

Features:
- Top 3 performers podium
- Full ranking list with progress bars
- Performance metrics per broker
- Status breakdown (Pending/Approved/Paid)
- Transaction counts

## Status Management

### Pending → Approved
- Admin/Manager reviews commission
- Verifies transaction completion
- Approves commission for payment
- Sets `approved_at` timestamp

### Approved → Paid
- Finance team processes payment
- Marks commission as paid
- Sets `paid_at` timestamp
- Can add payment notes

### Reversing Status
- Approved can be reverted to Pending
- Paid can be reverted to Approved (if needed)
- Audit trail maintained via timestamps

## Permissions

- **Brokers**: Can view their own commissions
- **Managers**: Can view all commissions, approve pending
- **Admins**: Full access, can approve and mark as paid
- **Finance**: Can mark approved commissions as paid

## Future Enhancements

1. **Goal Tracking**: Set monthly/quarterly commission goals for brokers
2. **Payment Integration**: Direct bank transfer integration
3. **Commission Plans**: Different commission rates by property type/value
4. **Team Commissions**: Split commissions across teams
5. **Historical Analytics**: Trend analysis and forecasting
6. **Export Reports**: PDF/Excel export of commission statements
7. **Email Notifications**: Auto-notify brokers of status changes
8. **Bonus Structure**: Performance-based bonus calculations

## Technical Notes

### State Management
- Uses React hooks (useState, useEffect)
- Real-time updates on status changes
- Optimistic UI updates for better UX

### Performance
- Indexed database queries
- Pagination for large datasets
- Lazy loading of commission cards
- Efficient filtering and sorting

### Accessibility
- Keyboard navigation support
- Screen reader friendly
- High contrast mode support
- Focus management

### Responsive Design
- Mobile-first approach
- Touch-friendly controls
- Adaptive layouts
- Optimized for all screen sizes

## Support

For issues or questions about the commission system:
1. Check this documentation
2. Review the code comments
3. Contact the development team
4. Create a GitHub issue

---

**Version**: 1.0
**Last Updated**: December 2024
**Maintained By**: ImobiBase Development Team
