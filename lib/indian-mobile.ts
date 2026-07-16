const INDIAN_MOBILE_TEN_DIGITS = /^[6-9]\d{9}$/;

/**
 * Strips non-digits and normalizes common Indian prefixes (+91, 91, leading 0).
 */
export function normalizeIndianMobileDigits(input: string): string {
    let digits = input.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) {
        digits = digits.slice(2);
    } else if (digits.length === 11 && digits.startsWith('0')) {
        digits = digits.slice(1);
    }
    return digits;
}

export function isValidIndianMobile(input: string): boolean {
    return INDIAN_MOBILE_TEN_DIGITS.test(normalizeIndianMobileDigits(input));
}

/** Build a wa.me deep link for an Indian mobile number (adds 91 when needed). */
export function toWhatsAppChatUrl(input: string, message?: string): string | null {
    const digits = normalizeIndianMobileDigits(input);
    if (!INDIAN_MOBILE_TEN_DIGITS.test(digits)) return null;
    const base = `https://wa.me/91${digits}`;
    if (!message) return base;
    return `${base}?text=${encodeURIComponent(message)}`;
}
