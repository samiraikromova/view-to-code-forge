
# Fix: Product Lookup Failing Due to Pagination

## Problem Summary
The system is looking for product `Q0QJ9` but only fetching the first 100 products from a catalog of 259+. The pagination code appears to exist but isn't working as expected.

## Root Cause Analysis
Based on the logs showing `"[Fanbases Checkout] Fetched 100 products from Fanbases"` (old log format), the pagination updates may not be deployed. The newer code should log `"Starting product fetch with pagination..."`.

However, even if deployed, there's a better solution based on the API structure.

## Proposed Solution: Use Single Product Lookup

Instead of fetching all 259+ products with pagination (which is slow and resource-intensive), use the Fanbases API to get a **single product by ID**.

Based on standard API patterns and the Fanbases API structure, there should be an endpoint:
```
GET /products/{product_id}
```

This is more efficient because:
- Single API call instead of 3+ paginated calls
- Faster response time
- Less memory usage
- No pagination complexity

## Implementation Plan

### 1. Update `fanbases-checkout` edge function

Replace the pagination loop with a direct product lookup:

```typescript
// Instead of fetching all products with pagination:
const productResponse = await fetch(
  `${FANBASES_API_URL}/products/${product.fanbases_product_id}`,
  {
    method: "GET",
    headers: {
      Accept: "application/json",
      "x-api-key": FANBASES_API_KEY,
    },
  }
);

if (!productResponse.ok) {
  // Fall back to paginated search if single lookup fails
}

const fanbasesProduct = productResponse.json();
```

### 2. Add fallback pagination with proper verification

If the single product endpoint doesn't exist, fix the pagination by ensuring:
- All log messages match the code that's deployed
- The `do-while` loop properly continues through all pages
- Add a verification step to confirm `last_page > 1`

### 3. Files to modify

| File | Change |
|------|--------|
| `supabase/functions/fanbases-checkout/index.ts` | Replace pagination with single product lookup, add fallback |

## Technical Details

The key changes will be:

1. **Primary approach**: Try `GET /products/{id}` first
2. **Fallback approach**: If 404, use full pagination as backup
3. **Logging**: Add clear logs to verify which approach is used

This approach handles both cases:
- If single product endpoint exists → fast, single API call
- If not → graceful fallback to pagination

## Alternative: Force Pagination to Work

If we must keep pagination, we need to:
1. Add more debug logging to confirm which code branch executes
2. Verify the API response structure matches expectations
3. Ensure the edge function is properly redeployed

Would you like me to implement this solution?
