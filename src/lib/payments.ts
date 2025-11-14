export function isStripeCheckoutUrl(url?: string | null): url is string {
  if (!url) return false

  try {
    const parsed = new URL(url)
    return parsed.hostname.includes("stripe.com")
  } catch {
    return url.includes("stripe.com")
  }
}
