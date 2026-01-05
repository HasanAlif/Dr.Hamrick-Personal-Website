// All dates in this application are stored and processed in UTC.
// The server runs with TZ=UTC to ensure new Date() always returns UTC.
// Frontend is responsible for converting UTC dates to user's local timezone for display.
export const nowUTC = (): Date => {
  return new Date();
};

export const parseToUTC = (dateString: string): Date => {
  if (!dateString || !dateString.trim()) {
    return nowUTC();
  }

  // Try parsing the date first to handle various formats (MM/DD/YYYY, DD-MM-YYYY, etc.)
  let date = new Date(dateString);

  // If direct parsing worked and is valid
  if (!isNaN(date.getTime())) {
    return date;
  }

  // If string doesn't have timezone info, append Z to treat as UTC
  const hasTimezone =
    dateString.endsWith("Z") ||
    /[+-]\d{2}:\d{2}$/.test(dateString) ||
    /[+-]\d{4}$/.test(dateString);

  if (!hasTimezone && dateString.includes("T")) {
    // DateTime without timezone - treat as UTC
    dateString = dateString + "Z";
  } else if (!hasTimezone && !dateString.includes("T")) {
    // Date only without time - treat as UTC midnight
    // Check if it's in ISO format (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString.trim())) {
      dateString = dateString + "T00:00:00Z";
    }
  }

  date = new Date(dateString);

  // Check if date is valid
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`);
  }

  return date;
};

export const isInFuture = (date: string | Date): boolean => {
  const targetDate = typeof date === "string" ? parseToUTC(date) : date;
  return targetDate.getTime() > nowUTC().getTime();
};

export const isInPast = (date: string | Date): boolean => {
  const targetDate = typeof date === "string" ? parseToUTC(date) : date;
  return targetDate.getTime() < nowUTC().getTime();
};

export const isExpired = (expiryDate: Date | undefined | null): boolean => {
  if (!expiryDate) return true;
  return expiryDate.getTime() < nowUTC().getTime();
};

export const createExpiry = (minutes: number): Date => {
  return new Date(Date.now() + minutes * 60 * 1000);
};

export const startOfDayUTC = (date: string | Date): Date => {
  const d = typeof date === "string" ? parseToUTC(date) : new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

export const endOfDayUTC = (date: string | Date): Date => {
  const d = typeof date === "string" ? parseToUTC(date) : new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
};
