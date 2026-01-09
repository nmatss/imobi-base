import React from "react";
/**
 * OpenGraphTags Component
 * Generates Open Graph meta tags for social media sharing
 * Improves visibility on Facebook, Twitter, LinkedIn, WhatsApp
 */

import { type Property } from "@/lib/imobi-context";
import { useEffect } from "react";

interface OpenGraphTagsProps {
  property: Property;
  tenantName?: string;
}

export function OpenGraphTags({ property, tenantName }: OpenGraphTagsProps) {
  useEffect(() => {
    const baseUrl = window.location.origin;
    const propertyUrl = `${baseUrl}/properties/${property.id}`;
    const propertyImage = property.images && property.images.length > 0
      ? property.images[0]
      : `${baseUrl}/placeholder.jpg`;

    const title = `${property.title} - ${tenantName || 'ImobiBase'}`;
    const description = property.description ||
      `${property.type} em ${property.city}, ${property.state}. ${property.bedrooms ? `${property.bedrooms} quartos` : ''} ${property.bathrooms ? `${property.bathrooms} banheiros` : ''} ${property.area ? `- ${property.area}m²` : ''}`.trim();

    const price = typeof property.price === 'string'
      ? property.price
      : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(property.price));

    const ogTags = [
      // Open Graph / Facebook
      { property: 'og:type', content: 'product' },
      { property: 'og:url', content: propertyUrl },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:image', content: propertyImage },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:site_name', content: tenantName || 'ImobiBase' },
      { property: 'og:locale', content: 'pt_BR' },

      // Twitter Card
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:url', content: propertyUrl },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: propertyImage },

      // Additional meta tags
      { name: 'description', content: description },
      { name: 'keywords', content: `imóvel, ${property.type}, ${property.city}, ${property.state}, ${property.category === 'rent' ? 'aluguel' : 'venda'}` },

      // Product-specific tags
      { property: 'product:price:amount', content: property.price },
      { property: 'product:price:currency', content: 'BRL' },
      { property: 'product:availability', content: property.status === 'available' ? 'in stock' : 'out of stock' },
    ];

    // Create or update meta tags
    const metaTags: HTMLMetaElement[] = [];

    ogTags.forEach(tag => {
      const selector = tag.property
        ? `meta[property="${tag.property}"]`
        : `meta[name="${tag.name}"]`;

      let metaTag = document.querySelector<HTMLMetaElement>(selector);

      if (!metaTag) {
        metaTag = document.createElement('meta');
        if (tag.property) {
          metaTag.setAttribute('property', tag.property);
        } else if (tag.name) {
          metaTag.setAttribute('name', tag.name);
        }
        document.head.appendChild(metaTag);
        metaTags.push(metaTag);
      }

      metaTag.content = tag.content;
    });

    // Cleanup on unmount
    return () => {
      metaTags.forEach(tag => {
        if (tag.parentNode) {
          tag.parentNode.removeChild(tag);
        }
      });
    };
  }, [property, tenantName]);

  return null; // This component doesn't render anything visible
}
