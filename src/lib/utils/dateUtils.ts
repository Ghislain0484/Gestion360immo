/**
 * Utilities for handling calendar dates (check-in/check-out) consistently
 * across different timezones. Avoids the "one-day-off" bug common with 
 * new Date("YYYY-MM-DD").
 */

/**
 * Parses a date string (YYYY-MM-DD or ISO) into a local Date object
 * representing that specific calendar day at midnight local time.
 */
export const getCalendarDate = (dateStr: string | null | undefined): Date => {
    if (!dateStr) return new Date();
    
    // Extract YYYY, MM, DD components
    // Handles both "2026-03-20" and "2026-03-20T00:00:00Z"
    const match = dateStr.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
    if (!match) return new Date(dateStr);
    
    const [_, year, month, day] = match.map(Number);
    // month - 1 because JS months are 0-indexed
    return new Date(year, month - 1, day, 0, 0, 0, 0);
};

/**
 * Checks if two dates represent the same calendar day in local time.
 */
export const isSameDay = (d1: Date, d2: Date): boolean => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
};

/**
 * Returns today's date at midnight local time.
 */
export const getTodayLocal = (): Date => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
};

/**
 * Formats a date string nicely for display, ensuring no timezone shift.
 */
export const formatCalendarDate = (dateStr: string, options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }): string => {
    const date = getCalendarDate(dateStr);
    return date.toLocaleDateString('fr-FR', options);
};
