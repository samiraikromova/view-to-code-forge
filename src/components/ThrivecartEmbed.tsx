import { useEffect } from "react";

export default function ThrivecartEmbed() {
  useEffect(() => {
    // Dynamically inject Thrivecart script on client only
    const script = document.createElement("script");
    script.src = "https://tinder.thrivecart.com/embed/v1/thrivecart.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
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

// ThriveCart Link component - uses anchor tag with data attributes for popup
import { cn } from "@/lib/utils"

interface ThrivecartLinkProps {
  productId: number
  children: React.ReactNode
  className?: string
}

export function ThrivecartLink({ productId, children, className }: ThrivecartLinkProps) {
  return (
    <a
      data-thrivecart-account="tinder"
      data-thrivecart-tpl="v2"
      data-thrivecart-product={productId}
      className={cn(
        "thrivecart-button cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        className
      )}
    >
      {children}
    </a>
  )
}

// Button variant for styled buttons
import { Button, ButtonProps } from "@/components/ui/button"

interface ThrivecartButtonProps extends Omit<ButtonProps, 'onClick' | 'asChild'> {
  productId: number
  children: React.ReactNode
  userEmail?: string // Not used in new approach but kept for backward compatibility
}

export function ThrivecartButton({ productId, children, className, variant, size, userEmail, ...props }: ThrivecartButtonProps) {
  return (
    <Button asChild variant={variant} size={size} className={className} {...props}>
      <a
        data-thrivecart-account="tinder"
        data-thrivecart-tpl="v2"
        data-thrivecart-product={productId}
        className="thrivecart-button cursor-pointer"
      >
        {children}
      </a>
    </Button>
  )
}
