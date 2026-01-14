export interface DbModule {
  id: string;
  name: string;
  category: 'course' | 'call_recording';
  access_type: 'free' | 'tier_required' | 'purchase_required';
  required_tier: string | null;
  fanbases_product_id: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}
