"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-12 w-12 shrink-0 overflow-hidden rounded-full ring-1 ring-border",
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

// Generate consistent color based on initials
const getAvatarColor = (initials: string) => {
  const colors = [
    "bg-blue-500 text-white",
    "bg-purple-500 text-white",
    "bg-pink-500 text-white",
    "bg-green-500 text-white",
    "bg-yellow-500 text-white",
    "bg-red-500 text-white",
    "bg-indigo-500 text-white",
    "bg-cyan-500 text-white",
    "bg-orange-500 text-white",
    "bg-emerald-500 text-white",
  ];
  const charCode = initials.charCodeAt(0) + (initials.charCodeAt(1) || 0);
  return colors[charCode % colors.length];
};

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> & {
    initials?: string;
  }
>(({ className, initials, children, ...props }, ref) => {
  const colorClass = initials ? getAvatarColor(initials) : "bg-muted text-muted-foreground";

  return (
    <AvatarPrimitive.Fallback
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full font-semibold text-sm",
        colorClass,
        className
      )}
      {...props}
    >
      {children}
    </AvatarPrimitive.Fallback>
  );
})
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
