import { cn } from "@/lib/utils";
import { Button, ButtonProps } from "@/components/ui/button";

const THRIVECART_ACCOUNT = "tinder";

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

// Get product slug by productId
function getProductSlugById(productId: number): string | null {
  for (const product of Object.values(THRIVECART_PRODUCTS)) {
    if (product.productId === productId) {
      return product.slug;
    }
  }
  return null;
}

// Open ThriveCart checkout in popup window
export function openThrivecartPopup(productId: number, email?: string) {
  const slug = getProductSlugById(productId);
  if (!slug) {
    console.error("Unknown ThriveCart product ID:", productId);
    return;
  }
  
  let url = `https://${THRIVECART_ACCOUNT}.thrivecart.com/${slug}/`;
  if (email) {
    url += `?passthrough[email]=${encodeURIComponent(email)}`;
  }
  
  const width = 600;
  const height = 700;
  const left = (window.innerWidth - width) / 2 + window.screenX;
  const top = (window.innerHeight - height) / 2 + window.screenY;
  
  window.open(
    url,
    'thrivecart_checkout',
    `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
  );
}

// No-op embed component (kept for backward compatibility)
export default function ThrivecartEmbed() {
  return null;
}

// Button component that opens ThriveCart popup
interface ThrivecartButtonProps extends Omit<ButtonProps, 'onClick'> {
  productId: number
  children: React.ReactNode
  userEmail?: string
}

export function ThrivecartButton({ productId, children, userEmail, ...props }: ThrivecartButtonProps) {
  return (
    <Button
      onClick={() => openThrivecartPopup(productId, userEmail)}
      {...props}
    >
      {children}
    </Button>
  );
}

// Link component that opens ThriveCart popup
interface ThrivecartLinkProps {
  productId: number
  children: React.ReactNode
  className?: string
  userEmail?: string
}

export function ThrivecartLink({ productId, children, className, userEmail }: ThrivecartLinkProps) {
  return (
    <button
      onClick={() => openThrivecartPopup(productId, userEmail)}
      className={cn("cursor-pointer", className)}
    >
      {children}
    </button>
  );
}
