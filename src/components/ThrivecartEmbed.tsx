import { useEffect } from "react"

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

// Product configurations
export const THRIVECART_PRODUCTS = {
  starter: {
    slug: "cb4-starter",
    name: "Starter Plan",
    price: 29,
  },
  pro: {
    slug: "cb4-pro", 
    name: "Pro Plan",
    price: 99,
  },
  topUp10: {
    slug: "cb4-credits-10",
    name: "10 Credits",
    price: 10,
  },
  topUp25: {
    slug: "cb4-credits-25",
    name: "25 Credits",
    price: 22,
  },
  topUp50: {
    slug: "cb4-credits-50",
    name: "50 Credits",
    price: 40,
  },
  topUp100: {
    slug: "cb4-credits-100",
    name: "100 Credits",
    price: 75,
  },
}
