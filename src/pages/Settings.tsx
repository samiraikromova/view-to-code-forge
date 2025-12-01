import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, CreditCard, Download, ExternalLink, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PLANS, SubscriptionTier } from "@/types/subscription";
import { useState } from "react";

const billingHistory = [
  { id: "INV-001", date: "Dec 1, 2025", amount: 99.00, status: "Paid", plan: "Pro" },
  { id: "INV-002", date: "Nov 1, 2025", amount: 99.00, status: "Paid", plan: "Pro" },
  { id: "INV-003", date: "Oct 1, 2025", amount: 29.00, status: "Paid", plan: "Starter" },
  { id: "INV-004", date: "Sep 1, 2025", amount: 29.00, status: "Paid", plan: "Starter" },
];

const paymentMethods = [
  { id: "pm-1", type: "Visa", last4: "4242", expiry: "12/2026", isDefault: true },
  { id: "pm-2", type: "Mastercard", last4: "5555", expiry: "08/2025", isDefault: false },
];

export default function Settings() {
  const navigate = useNavigate();
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>("starter");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your subscription and billing</p>
          </div>
        </div>

        {/* Subscription Plan Management */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Subscription Plan</CardTitle>
            <CardDescription>Manage your current plan and billing cycle</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Current Plan */}
              <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-surface/50">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-foreground">{PLANS[currentTier].name} Plan</h3>
                    <Badge variant="outline" className="bg-primary/20 text-primary-foreground border-primary/30">
                      Current Plan
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold text-foreground mt-1">${PLANS[currentTier].price}/month</p>
                  <ul className="mt-3 space-y-2">
                    {PLANS[currentTier].features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col gap-2">
                  {currentTier !== "pro" && (
                    <Button className="bg-accent hover:bg-accent/90">Upgrade to Pro</Button>
                  )}
                  <Button variant="outline">Cancel Subscription</Button>
                </div>
              </div>

              <Separator />

              {/* Available Plans */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-4">Available Plans</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(Object.keys(PLANS) as SubscriptionTier[]).map((tier) => {
                    const plan = PLANS[tier];
                    const isCurrent = tier === currentTier;
                    return (
                      <div
                        key={tier}
                        className={`p-4 border rounded-lg ${
                          isCurrent ? "border-primary bg-primary/5" : "border-border bg-surface/30"
                        }`}
                      >
                        <h5 className="font-semibold text-foreground">{plan.name}</h5>
                        <p className="text-2xl font-bold text-foreground mt-2">${plan.price}</p>
                        <p className="text-xs text-muted-foreground">per month</p>
                        <ul className="mt-4 space-y-2">
                          {plan.features.map((feature, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                              <Check className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                        {!isCurrent && (
                          <Button
                            variant={tier === "pro" ? "default" : "outline"}
                            className="w-full mt-4"
                            size="sm"
                          >
                            {tier === "pro" ? "Upgrade" : "Downgrade"}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Billing History */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>View and download your past invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingHistory.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.id}</TableCell>
                    <TableCell>{invoice.date}</TableCell>
                    <TableCell>{invoice.plan}</TableCell>
                    <TableCell>${invoice.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-primary/20 text-primary-foreground border-primary/30">
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Manage your credit cards and payment options</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <CreditCard className="h-4 w-4 mr-2" />
                Add Payment Method
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg bg-surface/30"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-8 bg-surface border border-border rounded flex items-center justify-center">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">
                          {method.type} •••• {method.last4}
                        </p>
                        {method.isDefault && (
                          <Badge variant="outline" className="bg-primary/20 text-primary-foreground border-primary/30">
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">Expires {method.expiry}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!method.isDefault && (
                      <Button variant="ghost" size="sm">
                        Set as Default
                      </Button>
                    )}
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm">
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
