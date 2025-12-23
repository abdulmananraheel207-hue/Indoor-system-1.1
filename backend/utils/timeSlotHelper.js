function generateTimeSlots(opening_time, closing_time, slot_duration) {
    const slots = [];

    const startHour = parseInt(opening_time.split(":")[0]);
    const endHour = parseInt(closing_time.split(":")[0]);
    const durationHours = slot_duration / 60;

    for (let hour = startHour; hour < endHour; hour += durationHours) {
        const startHourStr = hour.toString().padStart(2, "0");
        const endHourStr = (hour + durationHours).toString().padStart(2, "0");

        slots.push({
            start_time: `${startHourStr}:00`,
            end_time: `${endHourStr}:00`,
        });
    }

    return slots;
}