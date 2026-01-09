/**
 * Rentals Components Index
 *
 * Export all rental-related components for easy import
 */

export { RentalDashboard } from "./RentalDashboard";
export { RentalAlerts } from "./RentalAlerts";
export { RentalContractCard } from "./RentalContractCard";
export { PaymentTimeline } from "./PaymentTimeline";

export type { PaymentStatus } from "./PaymentTimeline";
export type { RentalContractCardProps } from "./RentalContractCard";

// Re-export tab components
export { LocadoresTab } from "./tabs/LocadoresTab";
export { InquilinosTab } from "./tabs/InquilinosTab";
export { RepassesTab } from "./tabs/RepassesTab";
