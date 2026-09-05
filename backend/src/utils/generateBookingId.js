/**
   * Helper to format a Date object into YYYYMMDD string in Asia/Kolkata timezone
   */
export const getISTDateString = (date) => {
  const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(new Date(date));
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  return `${year}${month}${day}`;
};

/**
 * Generates a unique human-readable booking ID: HC-YYYYMMDD-XXXX
 */
export const generateBookingId = (date, sequenceCount) => {
  const dateStr = getISTDateString(date);
  const seq = sequenceCount.toString().padStart(4, '0');
  return `HC-${dateStr}-${seq}`;
};
