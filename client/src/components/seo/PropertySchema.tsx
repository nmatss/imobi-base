import React from "react";
/**
 * PropertySchema Component
 * Generates Schema.org JSON-LD structured data for property listings
 * Improves SEO and search engine visibility
 */

import { type Property } from "@/lib/imobi-context";
import { useEffect } from "react";

interface PropertySchemaProps {
  property: Property;
  tenantName?: string;
  tenantUrl?: string;
}

export function PropertySchema({ property, tenantName, tenantUrl }: PropertySchemaProps) {
  useEffect(() => {
    const schema = {
      "@context": "https://schema.org",
      "@type": ["Product", "Residence"],
      "@id": `${tenantUrl || window.location.origin}/properties/${property.id}`,
      "name": property.title,
      "description": property.description || `${property.type} em ${property.city}, ${property.state}`,
      "image": property.images && property.images.length > 0
        ? property.images.map(img => ({
            "@type": "ImageObject",
            "url": img,
          }))
        : undefined,
      "offers": {
        "@type": "Offer",
        "price": property.price,
        "priceCurrency": "BRL",
        "availability": property.status === "available"
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
        "seller": {
          "@type": "RealEstateAgent",
          "name": tenantName || "ImobiBase",
          "url": tenantUrl || window.location.origin,
        },
      },
      "address": {
        "@type": "PostalAddress",
        "streetAddress": property.address,
        "addressLocality": property.city,
        "addressRegion": property.state,
        "postalCode": property.zipCode || undefined,
        "addressCountry": "BR",
      },
      "geo": property.latitude && property.longitude ? {
        "@type": "GeoCoordinates",
        "latitude": property.latitude,
        "longitude": property.longitude,
      } : undefined,
      "numberOfRooms": property.bedrooms || undefined,
      "numberOfBathroomsTotal": property.bathrooms || undefined,
      "floorSize": property.area ? {
        "@type": "QuantitativeValue",
        "value": property.area,
        "unitCode": "MTK", // Square meters
      } : undefined,
      "propertyID": property.id,
      "datePosted": property.createdAt,
      "category": property.category === "rent" ? "Aluguel" : "Venda",
      "additionalProperty": property.features && property.features.length > 0 ?
        property.features.map(feature => ({
          "@type": "PropertyValue",
          "name": feature,
        })) : undefined,
    };

    // Remove undefined values
    const cleanedSchema = JSON.parse(JSON.stringify(schema));

    // Create and inject script tag
    const scriptTag = document.createElement('script');
    scriptTag.type = 'application/ld+json';
    scriptTag.id = `schema-property-${property.id}`;
    scriptTag.textContent = JSON.stringify(cleanedSchema, null, 2);
    document.head.appendChild(scriptTag);

    // Cleanup on unmount
    return () => {
      const existingScript = document.getElementById(`schema-property-${property.id}`);
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, [property, tenantName, tenantUrl]);

  return null; // This component doesn't render anything visible
}
