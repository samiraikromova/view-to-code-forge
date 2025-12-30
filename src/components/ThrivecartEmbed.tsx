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

// ThriveCart checkout button component
import { Button, ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ThrivecartButtonProps extends Omit<ButtonProps, 'onClick'> {
  productId: number
  children: React.ReactNode
  userEmail?: string
}

export function ThrivecartButton({ productId, children, className, userEmail, ...props }: ThrivecartButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    
    // Find the product from THRIVECART_PRODUCTS by productId
    const product = Object.values(THRIVECART_PRODUCTS).find(p => p.productId === productId)
    const slug = product?.slug || 'cb4-starter'
    
    // Build the checkout URL
    let url = `https://tinder.thrivecart.com/${slug}/`
    
    // Add email passthrough if available
    if (userEmail) {
      url += `?passthrough[email]=${encodeURIComponent(userEmail)}`
    }
    
    // Open in popup window
    const width = 600
    const height = 700
    const left = (window.innerWidth - width) / 2
    const top = (window.innerHeight - height) / 2
    window.open(
      url,
      'thrivecart_checkout',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    )
  }

  return (
    <Button
      onClick={handleClick}
      className={cn(className)}
      {...props}
    >
      {children}
    </Button>
  )
}
