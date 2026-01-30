import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Zap, Crown, BookOpen, CreditCard, Receipt, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

interface Transaction {
  id: string;
  checkout_session_id: string;
  product_type: string;
  product_id: string | null;
  amount_cents: number | null;
  status: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

// Format product type for display
function formatProductType(type: string): string {
  const typeMap: Record<string, string> = {
    topup: "Credit Top-Up",
    subscription: "Subscription",
    module: "Module Purchase",
    card_setup: "Card Setup",
  };
  return typeMap[type] || type;
}

// Get icon for product type
function getProductIcon(type: string) {
  switch (type) {
    case "topup":
      return <Zap className="h-4 w-4 text-accent" />;
    case "subscription":
      return <Crown className="h-4 w-4 text-primary" />;
    case "module":
      return <BookOpen className="h-4 w-4 text-accent" />;
    case "card_setup":
      return <CreditCard className="h-4 w-4 text-primary" />;
    default:
      return <Receipt className="h-4 w-4 text-muted-foreground" />;
  }
}

// Format what the user received
function formatReceived(tx: Transaction): string {
  switch (tx.product_type) {
    case "topup":
      // Extract credits from product_id (e.g., "2500_credits" -> "2,500 credits")
      const creditsMatch = tx.product_id?.match(/(\d+)_credits/);
      if (creditsMatch) {
        return `${parseInt(creditsMatch[1]).toLocaleString()} credits`;
      }
      return "Credits";
    case "subscription":
      if (tx.product_id === "tier1") {
        return "Starter Plan (10,000 credits)";
      } else if (tx.product_id === "tier2") {
        return "Pro Plan (40,000 credits)";
      }
      return "Subscription";
    case "module":
      return tx.product_id || "Module access";
    case "card_setup":
      return "Payment method saved";
    default:
      return tx.product_id || "Purchase";
  }
}

// Format amount for display
function formatAmount(amountCents: number | null, productType: string): string {
  if (productType === "card_setup") {
    return "Free";
  }
  if (amountCents === null || amountCents === 0) {
    return "—";
  }
  return `$${(amountCents / 100).toFixed(2)}`;
}

const ITEMS_PER_PAGE = 10;

export function TransactionHistory() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const fetchTransactions = async (isRefresh = false, page = 1) => {
    if (!user) return;
    
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // First get total count
      const { count } = await supabase
        .from("checkout_sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "completed");

      setTotalCount(count || 0);

      // Then get paginated data
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, error } = await supabase
        .from("checkout_sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.error("Error fetching transactions:", error);
        return;
      }

      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchTransactions(false, newPage);
  };

  useEffect(() => {
    fetchTransactions();
  }, [user]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>Your completed purchases and subscriptions</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchTransactions(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : transactions.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>What You Got</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(tx.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getProductIcon(tx.product_type)}
                        <span className="text-foreground">{formatProductType(tx.product_type)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground font-medium">
                      {formatReceived(tx)}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {formatAmount(tx.amount_cents, tx.product_type)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-primary/10 text-primary/70 border-primary/20">
                        Completed
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No transactions yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your purchases will appear here
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}