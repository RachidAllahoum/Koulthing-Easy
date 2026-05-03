/** Row shape for inserting/updating `shops` from an approved `seller_applications` row. */
export function shopPayloadFromSellerApplication(
  sellerId: string,
  application: Record<string, unknown>,
): Record<string, unknown> {
  return {
    seller_id: sellerId,
    name: (application.shop_name as string) || "Shop",
    description: (application.description as string | null) ?? "",
    logo_url: (application.logo_url as string | null) ?? null,
    cover_url: null,
    shop_category: (application.shop_category as string | null) ?? null,
    street_address: (application.street_address as string | null) ?? null,
    city: (application.city as string | null) ?? null,
    wilaya: (application.wilaya as string | null) ?? null,
    shop_phone: (application.shop_phone as string | null) ?? null,
    business_registration: (application.business_registration as string | null) ?? null,
    instagram_url: (application.instagram_url as string | null) ?? null,
    facebook_url: (application.facebook_url as string | null) ?? null,
    is_active: true,
  }
}
