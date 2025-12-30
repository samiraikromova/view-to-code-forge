import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Zap, Check, CreditCard } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import ThrivecartEmbed, { THRIVECART_PRODUCTS, ThrivecartButton } from "@/components/ThrivecartEmbed"

const topUpOptions = [
  {
    id: "topUp1000" as const,
    credits: 1000,
    price: 10,
    perCredit: 0.01,
    popular: false,
  },
  {
    id: "topUp2500" as const,
    credits: 2500,
    price: 25,
    perCredit: 0.01,
    savings: "0%",
    popular: false,
  },
  {
    id: "topUp5000" as const,
    credits: 5000,
    price: 50,
    perCredit: 0.01,
    savings: "0%",
    popular: true,
  },
  {
    id: "topUp10000" as const,
    credits: 10000,
    price: 100,
    perCredit: 0.01,
    savings: "0%",
    popular: false,
  },
]

export default function TopUp() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const currentCredits = profile?.credits || 0

  return (
    <div className="min-h-screen bg-background">
      <ThrivecartEmbed />
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Top Up Credits</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Add more credits to your account
            </p>
          </div>
        </div>

        {/* Current Balance */}
        <Card className="mb-8">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="text-3xl font-bold text-foreground">{currentCredits.toFixed(2)} credits</p>
              </div>
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                <CreditCard className="h-8 w-8 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Up Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {topUpOptions.map((option) => {
            const product = THRIVECART_PRODUCTS[option.id]
            return (
              <Card 
                key={option.id}
                className={`relative overflow-hidden transition-all hover:border-primary/50 ${
                  option.popular ? "border-primary" : "border-border"
                }`}
              >
                {option.popular && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-bl-lg">
                    Most Popular
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    <CardTitle>{option.credits.toLocaleString()} Credits</CardTitle>
                  </div>
                  <CardDescription>
                    ${option.perCredit.toFixed(2)} per credit
                    {option.savings && (
                      <span className="ml-2 text-primary font-medium">Save {option.savings}</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl font-bold text-foreground">${option.price}</span>
                  </div>
                  <ul className="space-y-2 mb-4">
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary" />
                      Instant credit delivery
                    </li>
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary" />
                      No expiration
                    </li>
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary" />
                      Use across all tools
                    </li>
                  </ul>
                  <ThrivecartButton 
                    productId={product.productId}
                    className="w-full"
                    variant={option.popular ? "default" : "outline"}
                  >
                    Purchase
                  </ThrivecartButton>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Info */}
        <Card className="bg-surface/50">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground text-center">
              Credits are added instantly after purchase. All purchases are processed securely through ThriveCart.
              Need more? <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/settings")}>Upgrade your plan</Button> for monthly credit allowances.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
