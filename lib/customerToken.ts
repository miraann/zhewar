import { createHmac, timingSafeEqual } from 'crypto';

// There's no OTP/SMS verification in this app, so phone_number alone can't
// prove ownership. Instead, the FIRST registration for a phone number mints
// an opaque access_token (HMAC of the phone, keyed by a server secret) that
// the client stores locally (luxe_customer_token) and must present to modify
// that record again or to list its bookings. The token is only ever returned
// at creation time or to a caller that already holds it.
export function customerAccessToken(phoneNumber: string): string {
  return createHmac('sha256', process.env.BOOKING_HMAC_SECRET!)
    .update(`customer_access:${phoneNumber}`)
    .digest('hex');
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    return bufA.length > 0 && bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export function isCustomerAccessToken(token: unknown, phoneNumber: string): boolean {
  return typeof token === 'string' && safeEqualHex(token, customerAccessToken(phoneNumber));
}
