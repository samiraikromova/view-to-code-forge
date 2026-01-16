export interface DbModule {
  id: string;
  name: string;
  category: 'course' | 'call_recording';
  access_type: 'free' | 'tier_required' | 'purchase_required' | 'book_a_call';
  required_tier: string | null;
  fanbases_product_id: string | null;
  price_cents: number | null;
  booking_url: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}
