# Commission System - Implementation Guide

## Quick Start for Developers

This guide helps you complete the commission tracking system implementation by adding the required storage layer methods and integrations.

## Prerequisites

✅ Frontend components are complete
✅ Database schema is defined
✅ API routes are stubbed
✅ Migration file is ready

## Step 1: Run Database Migration

```bash
# PostgreSQL
psql -U your_user -d imobibase -f migrations/add-commissions-table.sql

# Or use your migration tool
npx drizzle-kit push
```

Verify the table was created:
```sql
SELECT * FROM commissions LIMIT 1;
```

## Step 2: Implement Storage Methods

Add these methods to `server/storage.ts` or create `server/storage-commissions.ts`:

```typescript
// Import at top of file
import { commissions } from "@shared/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";

// Add to storage object
async getCommissions(
  tenantId: string,
  filters: {
    period?: string;
    status?: string;
    type?: string;
    brokerId?: string;
    startDate?: Date;
    endDate?: Date;
  }
) {
  let query = db
    .select({
      commission: commissions,
      broker: users,
      property: properties,
      client: leads,
    })
    .from(commissions)
    .leftJoin(users, eq(commissions.brokerId, users.id))
    .leftJoin(propertySales, eq(commissions.saleId, propertySales.id))
    .leftJoin(rentalContracts, eq(commissions.rentalContractId, rentalContracts.id))
    .leftJoin(properties, /* join based on sale or rental */)
    .leftJoin(leads, /* join based on sale or rental */)
    .where(eq(commissions.tenantId, tenantId));

  // Apply filters
  if (filters.status) {
    query = query.where(eq(commissions.status, filters.status));
  }
  if (filters.type) {
    query = query.where(eq(commissions.transactionType, filters.type));
  }
  if (filters.brokerId) {
    query = query.where(eq(commissions.brokerId, filters.brokerId));
  }
  if (filters.startDate) {
    query = query.where(gte(commissions.createdAt, filters.startDate));
  }
  if (filters.endDate) {
    query = query.where(lte(commissions.createdAt, filters.endDate));
  }

  const results = await query.orderBy(desc(commissions.createdAt));

  // Transform to expected format
  return results.map(row => ({
    ...row.commission,
    brokerName: row.broker?.name || 'Unknown',
    brokerAvatar: row.broker?.avatar,
    propertyTitle: row.property?.title || 'Unknown Property',
    clientName: row.client?.name || 'Unknown Client',
  }));
},

async getBrokerPerformance(
  tenantId: string,
  startDate?: Date,
  endDate?: Date
) {
  // Get all brokers
  const brokers = await db
    .select()
    .from(users)
    .where(and(
      eq(users.tenantId, tenantId),
      eq(users.role, 'broker')
    ));

  // Calculate performance for each broker
  const performance = await Promise.all(
    brokers.map(async (broker) => {
      let query = db
        .select({
          totalCommission: sql<number>`SUM(${commissions.brokerCommission})`,
          pendingCommission: sql<number>`SUM(CASE WHEN ${commissions.status} = 'pending' THEN ${commissions.brokerCommission} ELSE 0 END)`,
          paidCommission: sql<number>`SUM(CASE WHEN ${commissions.status} = 'paid' THEN ${commissions.brokerCommission} ELSE 0 END)`,
          transactionCount: sql<number>`COUNT(*)`,
          salesCount: sql<number>`SUM(CASE WHEN ${commissions.transactionType} = 'sale' THEN 1 ELSE 0 END)`,
          rentalsCount: sql<number>`SUM(CASE WHEN ${commissions.transactionType} = 'rental' THEN 1 ELSE 0 END)`,
        })
        .from(commissions)
        .where(and(
          eq(commissions.tenantId, tenantId),
          eq(commissions.brokerId, broker.id)
        ));

      if (startDate) {
        query = query.where(gte(commissions.createdAt, startDate));
      }
      if (endDate) {
        query = query.where(lte(commissions.createdAt, endDate));
      }

      const [stats] = await query;

      return {
        brokerId: broker.id,
        brokerName: broker.name,
        brokerAvatar: broker.avatar,
        totalCommission: parseFloat(stats.totalCommission || '0'),
        pendingCommission: parseFloat(stats.pendingCommission || '0'),
        paidCommission: parseFloat(stats.paidCommission || '0'),
        transactionCount: parseInt(stats.transactionCount || '0'),
        salesCount: parseInt(stats.salesCount || '0'),
        rentalsCount: parseInt(stats.rentalsCount || '0'),
      };
    })
  );

  return performance.filter(p => p.transactionCount > 0);
},

async createCommission(data: InsertCommission) {
  const [commission] = await db
    .insert(commissions)
    .values({
      ...data,
      updatedAt: new Date(),
    })
    .returning();

  return commission;
},

async updateCommissionStatus(
  id: string,
  tenantId: string,
  status: 'pending' | 'approved' | 'paid'
) {
  const updates: any = {
    status,
    updatedAt: new Date(),
  };

  if (status === 'approved') {
    updates.approvedAt = new Date();
  } else if (status === 'paid') {
    updates.paidAt = new Date();
  }

  const [commission] = await db
    .update(commissions)
    .set(updates)
    .where(and(
      eq(commissions.id, id),
      eq(commissions.tenantId, tenantId)
    ))
    .returning();

  return commission;
},

async getCommissionById(id: string, tenantId: string) {
  const [commission] = await db
    .select()
    .from(commissions)
    .where(and(
      eq(commissions.id, id),
      eq(commissions.tenantId, tenantId)
    ));

  return commission || null;
},
```

## Step 3: Update API Routes

Replace mock implementations in `server/routes.ts`:

```typescript
// GET /api/commissions
app.get("/api/commissions", requireAuth, async (req, res) => {
  try {
    const { period, status, type, brokerId } = req.query;

    // Calculate date range based on period
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (period === 'currentMonth') {
      startDate = startOfMonth(new Date());
      endDate = endOfMonth(new Date());
    } else if (period === 'lastMonth') {
      const lastMonth = subMonths(new Date(), 1);
      startDate = startOfMonth(lastMonth);
      endDate = endOfMonth(lastMonth);
    } else if (period === 'year') {
      startDate = startOfYear(new Date());
      endDate = endOfYear(new Date());
    }

    const [commissionsData, brokerPerformance] = await Promise.all([
      storage.getCommissions(req.user!.tenantId, {
        status: status as string,
        type: type as string,
        brokerId: brokerId as string,
        startDate,
        endDate,
      }),
      storage.getBrokerPerformance(req.user!.tenantId, startDate, endDate),
    ]);

    res.json({
      commissions: commissionsData,
      brokerPerformance,
    });
  } catch (error) {
    console.error("Error fetching commissions:", error);
    res.status(500).json({ error: "Erro ao buscar comissões" });
  }
});

// GET /api/commissions/:id
app.get("/api/commissions/:id", requireAuth, async (req, res) => {
  try {
    const commission = await storage.getCommissionById(
      req.params.id,
      req.user!.tenantId
    );

    if (!commission) {
      return res.status(404).json({ error: "Comissão não encontrada" });
    }

    res.json(commission);
  } catch (error) {
    console.error("Error fetching commission:", error);
    res.status(500).json({ error: "Erro ao buscar comissão" });
  }
});

// PATCH /api/commissions/:id/status
app.patch("/api/commissions/:id/status", requireAuth, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['pending', 'approved', 'paid'].includes(status)) {
      return res.status(400).json({ error: "Status inválido" });
    }

    const commission = await storage.updateCommissionStatus(
      req.params.id,
      req.user!.tenantId,
      status
    );

    if (!commission) {
      return res.status(404).json({ error: "Comissão não encontrada" });
    }

    res.json(commission);
  } catch (error) {
    console.error("Error updating commission status:", error);
    res.status(500).json({ error: "Erro ao atualizar status da comissão" });
  }
});
```

## Step 4: Add Automatic Commission Creation

### On Property Sale

In `POST /api/property-sales` route:

```typescript
app.post("/api/property-sales", requireAuth, async (req, res) => {
  try {
    const data = insertPropertySaleSchema.parse({
      ...req.body,
      tenantId: req.user!.tenantId,
    });

    const sale = await storage.createPropertySale(data);

    // Calculate and create commission
    const commissionRate = parseFloat(sale.commissionRate || '6');
    const saleValue = parseFloat(sale.saleValue);
    const grossCommission = saleValue * (commissionRate / 100);
    const agencySplit = 50; // Get from settings
    const brokerCommission = grossCommission * (agencySplit / 100);

    await storage.createCommission({
      tenantId: req.user!.tenantId,
      saleId: sale.id,
      brokerId: sale.brokerId,
      transactionType: 'sale',
      transactionValue: sale.saleValue,
      commissionRate: sale.commissionRate || '6',
      grossCommission: grossCommission.toString(),
      agencySplit: agencySplit.toString(),
      brokerCommission: brokerCommission.toString(),
      status: 'pending',
    });

    res.json(sale);
  } catch (error) {
    // ... error handling
  }
});
```

### On Rental Contract

In `POST /api/rental-contracts` route:

```typescript
app.post("/api/rental-contracts", requireAuth, async (req, res) => {
  try {
    const data = insertRentalContractSchema.parse({
      ...req.body,
      tenantId: req.user!.tenantId,
    });

    const contract = await storage.createRentalContract(data);

    // Calculate and create commission (100% of first month)
    const rentValue = parseFloat(contract.rentValue);
    const grossCommission = rentValue; // 100%
    const agencySplit = 50; // Get from settings
    const brokerCommission = grossCommission * (agencySplit / 100);

    // Get broker ID from contract or lead
    const brokerId = contract.assignedBroker || req.user!.id;

    await storage.createCommission({
      tenantId: req.user!.tenantId,
      rentalContractId: contract.id,
      brokerId: brokerId,
      transactionType: 'rental',
      transactionValue: contract.rentValue,
      commissionRate: '100',
      grossCommission: grossCommission.toString(),
      agencySplit: agencySplit.toString(),
      brokerCommission: brokerCommission.toString(),
      status: 'pending',
    });

    res.json(contract);
  } catch (error) {
    // ... error handling
  }
});
```

## Step 5: Add Settings Integration

Add to Settings page (`/client/src/pages/settings/tabs/GeneralTab.tsx`):

```tsx
// Commission Settings Section
<div className="space-y-4">
  <h3 className="text-lg font-semibold">Configurações de Comissões</h3>

  <div className="grid gap-4 md:grid-cols-2">
    <div className="space-y-2">
      <Label htmlFor="defaultSaleCommissionRate">
        Taxa Padrão - Vendas (%)
      </Label>
      <Input
        id="defaultSaleCommissionRate"
        type="number"
        step="0.1"
        defaultValue="6"
        placeholder="6"
      />
    </div>

    <div className="space-y-2">
      <Label htmlFor="defaultRentalCommissionRate">
        Taxa Padrão - Locações (%)
      </Label>
      <Input
        id="defaultRentalCommissionRate"
        type="number"
        step="0.1"
        defaultValue="100"
        placeholder="100"
      />
    </div>

    <div className="space-y-2">
      <Label htmlFor="defaultAgencySplit">
        Divisão Corretor/Imobiliária (%)
      </Label>
      <Input
        id="defaultAgencySplit"
        type="number"
        step="1"
        defaultValue="50"
        placeholder="50"
      />
      <p className="text-xs text-muted-foreground">
        Porcentagem da comissão que vai para o(s) corretor(es)
      </p>
    </div>
  </div>
</div>
```

## Step 6: Testing

### Test Commission Calculator
1. Go to Financial → Comissões → Calculadora
2. Enter a sale value (e.g., R$ 500,000)
3. Set commission rate (e.g., 6%)
4. Verify calculations:
   - Gross: R$ 30,000
   - Agency: R$ 15,000
   - Broker: R$ 15,000

### Test Commission Creation
1. Create a property sale with a broker
2. Check that commission record was created
3. Verify status is "pending"
4. Check commission values are correct

### Test Status Workflow
1. Create a commission (or use existing)
2. Change status from Pending → Approved
3. Verify `approved_at` timestamp is set
4. Change status to Paid
5. Verify `paid_at` timestamp is set

### Test Broker Performance
1. Create multiple commissions for different brokers
2. Go to Financial → Comissões → Por Corretor
3. Verify rankings are correct
4. Check totals match individual commissions

## Step 7: Optional Enhancements

### Add Email Notifications
```typescript
// When commission is approved
await sendEmail({
  to: broker.email,
  subject: 'Comissão Aprovada',
  template: 'commission-approved',
  data: { commission, broker }
});

// When commission is paid
await sendEmail({
  to: broker.email,
  subject: 'Comissão Paga',
  template: 'commission-paid',
  data: { commission, broker }
});
```

### Add Financial Entry Link
```typescript
// When creating commission, also create financial entry
await storage.createFinanceEntry({
  tenantId: req.user!.tenantId,
  description: `Comissão - ${property.title}`,
  amount: brokerCommission,
  flow: 'out',
  entryDate: new Date(),
  originType: 'commission',
  originId: commission.id,
  status: 'scheduled', // Changes to 'completed' when paid
});
```

### Add Permission Checks
```typescript
// In routes
const canApprove = req.user!.role === 'admin' || req.user!.role === 'manager';
const canMarkAsPaid = req.user!.role === 'admin' || req.user!.role === 'finance';

if (!canApprove && status === 'approved') {
  return res.status(403).json({ error: 'Sem permissão para aprovar' });
}
```

## Common Issues & Solutions

### Issue: Commissions not appearing
**Solution**: Check that `tenantId` matches and dates are within range

### Issue: Broker performance showing zero
**Solution**: Verify commission records exist and have correct `brokerId`

### Issue: Calculations are wrong
**Solution**: Check that values are numbers, not strings. Use `parseFloat()`

### Issue: Status won't update
**Solution**: Verify user has permission and commission ID is correct

## Database Queries for Debugging

```sql
-- Check all commissions
SELECT * FROM commissions ORDER BY created_at DESC LIMIT 10;

-- Check broker totals
SELECT
  broker_id,
  COUNT(*) as total_commissions,
  SUM(broker_commission) as total_amount,
  SUM(CASE WHEN status = 'pending' THEN broker_commission ELSE 0 END) as pending,
  SUM(CASE WHEN status = 'paid' THEN broker_commission ELSE 0 END) as paid
FROM commissions
GROUP BY broker_id;

-- Check commission by ID
SELECT
  c.*,
  u.name as broker_name,
  p.title as property_title
FROM commissions c
LEFT JOIN users u ON c.broker_id = u.id
LEFT JOIN property_sales ps ON c.sale_id = ps.id
LEFT JOIN properties p ON ps.property_id = p.id
WHERE c.id = 'your-commission-id';
```

## Performance Tips

1. **Use Indexes**: The migration already creates necessary indexes
2. **Limit Results**: Add pagination for large datasets
3. **Cache Performance**: Cache broker performance for current month
4. **Optimize Joins**: Only join tables when necessary

## Security Checklist

- [ ] Multi-tenant isolation enforced (check `tenantId`)
- [ ] Authentication required on all endpoints
- [ ] Permission checks for status changes
- [ ] Input validation on all fields
- [ ] SQL injection prevention (use parameterized queries)
- [ ] XSS prevention (React handles this)

## Final Verification

Run this checklist before deploying:

- [ ] Database migration completed
- [ ] Storage methods implemented and tested
- [ ] API routes updated with real logic
- [ ] Automatic commission creation works
- [ ] Status workflow functions correctly
- [ ] Broker performance displays accurately
- [ ] Settings page has commission config
- [ ] No TypeScript errors
- [ ] Build succeeds
- [ ] All tests pass
- [ ] Documentation is complete

---

**Need Help?**
- Check COMMISSION_TRACKING_SYSTEM.md for detailed documentation
- Review AGENT_14_COMMISSION_SYSTEM_SUMMARY.md for component details
- Examine the code comments in each file
- Test with mock data first before integrating

**Good luck with the implementation! 🚀**
