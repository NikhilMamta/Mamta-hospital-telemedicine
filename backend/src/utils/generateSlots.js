/**
 * Converts HH:mm time string to minutes since midnight
 */
export const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Converts minutes since midnight back to HH:mm string
 */
export const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

/**
 * Generates slots from startTime to endTime based on duration and bufferTime
 */
export const generateSlots = (startTime, endTime, slotDuration, bufferTime = 0) => {
  const slots = [];
  const startMins = timeToMinutes(startTime);
  const endMins = timeToMinutes(endTime);

  let current = startMins;

  while (current + slotDuration <= endMins) {
    const slotStart = current;
    const slotEnd = current + slotDuration;

    slots.push({
      startTime: minutesToTime(slotStart),
      endTime: minutesToTime(slotEnd),
    });

    current = slotEnd + bufferTime;
  }

  return slots;
};
