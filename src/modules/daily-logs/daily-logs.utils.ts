export const getTodayRange = (timezoneOffsetMinutes?: number) => {
  const now = new Date();
  const offset = timezoneOffsetMinutes !== undefined ? timezoneOffsetMinutes : now.getTimezoneOffset();
  
  // Convert to client's local time representation
  const clientLocalTime = new Date(now.getTime() - offset * 60 * 1000);
  
  // Start of day in client's local time
  const startOfLocalDay = new Date(clientLocalTime);
  startOfLocalDay.setUTCHours(0, 0, 0, 0);
  
  // End of day in client's local time
  const endOfLocalDay = new Date(clientLocalTime);
  endOfLocalDay.setUTCHours(23, 59, 59, 999);
  
  // Convert back to UTC objects for Prisma query bounds
  const start = new Date(startOfLocalDay.getTime() + offset * 60 * 1000);
  const end = new Date(endOfLocalDay.getTime() + offset * 60 * 1000);
  
  return { start, end };
};
