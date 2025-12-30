import { useEffect } from "react"
import { Button, ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ThrivecartEmbedProps {
  productId?: string
}

export default function ThrivecartEmbed({ productId }: ThrivecartEmbedProps) {
  useEffect(() => {
    // Dynamically inject Thrivecart script on client only
    const existingScript = document.querySelector('script[src*="thrivecart.js"]')
    if (existingScript) return

    const script = document.createElement("script")
    script.src = "https://tinder.thrivecart.com/embed/v1/thrivecart.js"
    script.async = true
    document.body.appendChild(script)

    return () => {
      // Only remove if we added it
      const scriptToRemove = document.querySelector('script[src*="thrivecart.js"]')
      if (scriptToRemove) {
        document.body.removeChild(scriptToRemove)
      }
    }
  }, [])

  return null
}

// ThriveCart checkout link generator
export function getThriveCartCheckoutUrl(productSlug: string, email?: string): string {
  const baseUrl = `https://tinder.thrivecart.com/${productSlug}`
  if (email) {
    return `${baseUrl}?passthrough[email]=${encodeURIComponent(email)}`
  }
  return baseUrl
}

// ThriveCart popup button component
interface ThrivecartButtonProps extends Omit<ButtonProps, 'onClick'> {
  productId: number
  children: React.ReactNode
}

export function ThrivecartButton({ productId, children, className, ...props }: ThrivecartButtonProps) {
  return (
    <a
      data-thrivecart-account="leveraged-creator"
      data-thrivecart-tpl="v2"
      data-thrivecart-product={productId}
      className={cn(
        "thrivecart-button thrivecart-button-styled cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0",
        props.variant === "outline" 
          ? "border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground"
          : "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        props.size === "sm" ? "h-8 px-3 text-xs" : "h-9 px-4 py-2",
        className
      )}
    >
      {children}
    </a>
  )
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
