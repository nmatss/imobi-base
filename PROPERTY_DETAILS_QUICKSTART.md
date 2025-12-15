# Property Details Page - Quick Start Guide

## Overview
The public property details page is a fully responsive, SEO-optimized page for displaying property information to potential buyers/renters without requiring authentication.

## URL Structure
```
https://yourdomain.com/e/{tenant-slug}/imovel/{property-id}

Example:
https://yourdomain.com/e/minhaimmobiliaria/imovel/abc123
```

## Key Components

### 1. Image Gallery
```typescript
// Properties can have multiple images
images: ["url1.jpg", "url2.jpg", "url3.jpg"]

// If no images, uses fallback:
"https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200"
```

### 2. Property Data Structure
```typescript
{
  id: "uuid",
  tenantId: "uuid",
  title: "Apartamento 3 quartos com vista para o mar",
  description: "Lindo apartamento...",
  type: "apartment", // house, apartment, land, commercial
  category: "rent", // rent, sale
  price: "2500.00",
  address: "Rua das Flores, 123",
  city: "São Paulo",
  state: "SP",
  zipCode: "01234-567",
  bedrooms: 3,
  bathrooms: 2,
  area: 120,
  parkingSpots: 2, // OPTIONAL - newly added
  condoFee: "500.00", // OPTIONAL - newly added
  iptu: "150.00", // OPTIONAL - newly added
  features: [
    "Piscina",
    "Academia",
    "Churrasqueira",
    "Portaria 24h"
  ],
  images: ["img1.jpg", "img2.jpg"],
  status: "available",
  featured: true
}
```

### 3. Tenant Configuration
```typescript
{
  id: "uuid",
  name: "Imobiliária XYZ",
  slug: "imobiliaria-xyz",
  logo: "logo.png",
  primaryColor: "#0066cc",
  secondaryColor: "#333333",
  phone: "+5511999999999", // WhatsApp format
  email: "contato@imobiliaria.com",
  address: "Av. Principal, 500 - São Paulo, SP"
}
```

## Features Implementation

### WhatsApp Integration
Automatically creates pre-filled message:
```
Olá! Tenho interesse no imóvel: [Property Title] - [Page URL]
```

### Features Categorization
The system automatically categorizes features into:

**Estrutura** (Structure):
- Keywords: cozinha, banheiro, quarto, sala, closet, varanda, sacada, churrasqueira, despensa, lavabo

**Lazer** (Leisure):
- Keywords: piscina, academia, quadra, playground, salão, festa, jardim, sauna, cinema, jogos, espaço gourmet

**Segurança** (Security):
- Keywords: portaria, segurança, portão, eletrônico, câmera, alarme, cerca, vigilância

**Outros** (Others):
- Everything else

### SEO Meta Tags
Dynamically set on page load:
```html
<title>Property Title - Tenant Name</title>
<meta name="description" content="Property Title - Category por Price. City, State. Tenant Name">
<meta property="og:title" content="Property Title - Tenant Name">
<meta property="og:description" content="Description or fallback">
<meta property="og:image" content="First property image">
<meta property="og:url" content="Current page URL">
```

## Mobile-Specific Features

### Sticky Bottom CTA Bar
- Always visible at bottom of screen
- Contains: Contact, WhatsApp, Call buttons
- Z-index: 40
- Only shows on mobile (hidden on sm: breakpoint and up)

### Contact Form Modal
- Slides up from bottom
- Triggered by "Contato" button
- Black overlay with 50% opacity
- Click outside to close
- Smooth animation

### Horizontal Scrolling
All horizontal scroll containers have:
- Snap scrolling enabled
- Hidden scrollbars
- Touch-friendly interaction
- Proper spacing (gap-3 or gap-6)

## Desktop-Specific Features

### Sticky Sidebar
```css
className="hidden sm:block sticky top-24 space-y-4"
```
- Sticks at 96px from top (top-24 = 6rem = 96px)
- Always visible during scroll
- Contains contact form and info

### Floating WhatsApp Button
- Bottom-right corner
- Green WhatsApp color (#25D366)
- Scale animation on hover
- Only visible on desktop

## Customization Guide

### Change Primary Color
Update tenant record in database:
```sql
UPDATE tenants
SET primary_color = '#FF5722'
WHERE id = 'tenant-id';
```
Color is automatically applied to:
- Price display
- Feature bullet points
- Badge backgrounds

### Add Custom Features
Simply add to features array:
```typescript
features: [
  "Custom Feature 1",
  "Custom Feature 2"
]
```
System will auto-categorize or place in "Outros"

### Update Map
Replace placeholder API key:
```typescript
// In property-details.tsx, line ~612
src={`https://www.google.com/maps/embed/v1/place?key=YOUR_ACTUAL_API_KEY&q=...`}
```

### Add More Similar Properties
Change limit in API call:
```typescript
// Line ~138
const similarRes = await fetch(
  `/api/properties/public/${tenantData.id}?limit=6&type=${propertyData.type}...`
);
```

## API Integration

### Required Endpoints

#### 1. Get Tenant by Slug
```
GET /api/tenants/slug/:slug
Response: Tenant object
```

#### 2. Get Property Details
```
GET /api/properties/public/:tenantId/:propertyId
Response: Property object
```

#### 3. Get Similar Properties
```
GET /api/properties/public/:tenantId?limit=3&type=apartment&category=rent&exclude=current-id
Response: Property[]
```

#### 4. Submit Lead
```
POST /api/leads/public
Body: {
  name, email, phone, message,
  tenantId, propertyId, source: "portal_publico",
  status: "new", interests: [propertyTitle]
}
Response: { id, ... }
```

## Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 639px) {
  - Single column layout
  - Horizontal scrolling for specs and similar properties
  - Sticky bottom CTA bar
  - Full-screen modals
}

/* Tablet */
@media (min-width: 640px) and (max-width: 1023px) {
  - 2 column grid for features
  - Sidebar appears
  - Grid layout for similar properties
}

/* Desktop */
@media (min-width: 1024px) {
  - 3-4 column grids
  - Sticky sidebar
  - Floating WhatsApp button
  - Larger image sizes
}
```

## Performance Tips

### Image Optimization
Recommended sizes:
- Main image: 1600x900px (16:9)
- Thumbnails: 160x160px
- Similar properties: 800x600px (4:3)

### Lazy Loading
- Main image: `loading="eager"`
- Thumbnails: `loading="lazy"`
- Similar properties: `loading="lazy"`

### API Caching
Consider implementing:
```javascript
// Add cache headers on API responses
Cache-Control: public, max-age=300 // 5 minutes
```

## Analytics Events to Track

```javascript
// Page view
analytics.track('property_viewed', {
  propertyId,
  tenantId,
  category,
  type,
  price
});

// Contact form submission
analytics.track('contact_form_submitted', {
  propertyId,
  source: 'interest_form'
});

// WhatsApp click
analytics.track('whatsapp_clicked', {
  propertyId,
  device: isMobile ? 'mobile' : 'desktop'
});

// Share button clicked
analytics.track('property_shared', {
  propertyId,
  method: 'web_share' | 'clipboard'
});
```

## Common Issues & Solutions

### Issue: Map not loading
**Solution**: Add Google Maps API key to environment variables

### Issue: WhatsApp link not working
**Solution**: Ensure phone number is in international format: +5511999999999

### Issue: Images not displaying
**Solution**: Check CORS headers on image URLs

### Issue: Sidebar not sticky
**Solution**: Ensure parent container doesn't have overflow:hidden

### Issue: Mobile CTA bar overlapping content
**Solution**: Add pb-20 to main content on mobile

## Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile Safari (iOS 13+)
- ✅ Chrome Mobile (Android 8+)

## Accessibility Checklist

- [x] Keyboard navigation
- [x] Focus indicators
- [x] Alt text on images
- [x] ARIA labels on icon buttons
- [x] Semantic HTML
- [x] Color contrast (WCAG AA)
- [x] Touch targets (44x44px minimum)

## Next Steps

1. Configure Google Maps API key
2. Test on real devices
3. Add analytics tracking
4. Implement image CDN (optional)
5. Set up monitoring for page performance
6. Create A/B tests for CTA placement

---

**Need Help?** Check `/PROPERTY_DETAILS_IMPLEMENTATION.md` for complete technical documentation.
