import { useEffect } from "react";
import { cn } from "@/lib/utils";

// ThriveCart account name - MUST match the account in the script URL
const THRIVECART_ACCOUNT = "leveraged-creator";

export default function ThrivecartEmbed() {
  useEffect(() => {
    // Check if script already exists
    const existingScript = document.querySelector('script[src*="thrivecart.js"]');
    if (existingScript) {
      return;
    }

    // Dynamically inject Thrivecart script - using correct embed URL
    const script = document.createElement("script");
    script.src = "https://tinder.thrivecart.com/embed/v1/thrivecart.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup on unmount (optional)
    };
  }, []);

  return null;
}

// Product configurations matching edge function PRODUCT_CONFIG
// Product IDs: 7=Starter, 8=Pro, 9=1000cr, 10=2500cr, 12=5000cr, 13=10000cr
export const THRIVECART_PRODUCTS = {
  // Subscriptions
  starter: {
    slug: "cb4-starter",
    productId: 7,
    name: "Starter Plan",
    credits: 10000,
    price: 29,
    type: "subscription",
  },
  pro: {
    slug: "cb4-pro",
    productId: 8,
    name: "Pro Plan",
    credits: 40000,
    price: 99,
    type: "subscription",
  },
  // Top-ups
  topUp1000: {
    slug: "cb4-credits-1000",
    productId: 9,
    name: "1,000 Credits",
    credits: 1000,
    price: 10,
    type: "topup",
  },
  topUp2500: {
    slug: "cb4-credits-2500",
    productId: 10,
    name: "2,500 Credits",
    credits: 2500,
    price: 25,
    type: "topup",
  },
  topUp5000: {
    slug: "cb4-credits-5000",
    productId: 12,
    name: "5,000 Credits",
    credits: 5000,
    price: 50,
    type: "topup",
  },
  topUp10000: {
    slug: "cb4-credits-10000",
    productId: 13,
    name: "10,000 Credits",
    credits: 10000,
    price: 100,
    type: "topup",
  },
}

// ThriveCart Link component - pure anchor for popup trigger
interface ThrivecartLinkProps {
  productId: number
  children: React.ReactNode
  className?: string
}

export function ThrivecartLink({ productId, children, className }: ThrivecartLinkProps) {
  return (
    <a
      data-thrivecart-account={THRIVECART_ACCOUNT}
      data-thrivecart-tpl="v2"
      data-thrivecart-product={productId}
      className={cn("thrivecart-button cursor-pointer", className)}
    >
      {children}
    </a>
  )
}

// Styled button using ThriveCart popup
interface ThrivecartButtonProps {
  productId: number
  children: React.ReactNode
  className?: string
  variant?: "default" | "outline" | "ghost"
  size?: "sm" | "lg"
  userEmail?: string
}

export function ThrivecartButton({ productId, children, className, variant = "default", size }: ThrivecartButtonProps) {
  const buttonClasses = cn(
    "thrivecart-button inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer",
    variant === "default" && "bg-primary text-primary-foreground shadow hover:bg-primary/90",
    variant === "outline" && "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
    variant === "ghost" && "hover:bg-accent hover:text-accent-foreground",
    size === "sm" && "h-8 rounded-md px-3 text-xs",
    size === "lg" && "h-10 rounded-md px-8",
    !size && "h-9 px-4 py-2",
    className
  );

  return (
    <a
      data-thrivecart-account={THRIVECART_ACCOUNT}
      data-thrivecart-tpl="v2"
      data-thrivecart-product={productId}
      className={buttonClasses}
    >
      {children}
    </a>
  )
}
