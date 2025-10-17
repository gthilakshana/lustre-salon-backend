
export function parseTimeToHoursMinutes(timeStr) {
    if (!timeStr) return { hours: 0, minutes: 0 };

    const trimmed = timeStr.trim();
    const ampmMatch = trimmed.match(/(AM|PM|am|pm)$/);
    if (ampmMatch) {
       
        const parts = trimmed.split(/[:\s]/).filter(p => p !== '');
        if (parts.length < 2) return { hours: 0, minutes: 0 }; 

        let hours = Number(parts[0]);
        const minutes = Number(parts[1]);
        const mod = parts.find(p => p.toUpperCase() === 'AM' || p.toUpperCase() === 'PM').toUpperCase();

        if (mod === "PM" && hours !== 12) hours += 12;
        if (mod === "AM" && hours === 12) hours = 0;
        return { hours, minutes };
    } else {
        const [hoursStr, minutesStr] = trimmed.split(":");
        return { hours: Number(hoursStr), minutes: Number(minutesStr || 0) };
    }
}


export function combineDateAndTime(dateInput, timeStr) {
    let date;

  
    if (typeof dateInput === "string") {
  
        date = new Date(dateInput + 'T12:00:00'); 
    } else if (dateInput instanceof Date) {
        date = new Date(dateInput.getTime()); 
    } else {
      
        return new Date(NaN); 
    }

    if (!timeStr) return date;
    
    
    const { hours, minutes } = parseTimeToHoursMinutes(timeStr);

    date.setHours(hours, minutes, 0, 0); 

   
    return date;
}

// --- addMinutesToTimeStr remains unchanged, it is correct for string manipulation ---
export function addMinutesToTimeStr(timeStr, minutesToAdd) {
    const { hours, minutes } = parseTimeToHoursMinutes(timeStr);
    const date = new Date(); 
    date.setHours(hours, minutes, 0, 0);
    date.setMinutes(date.getMinutes() + minutesToAdd);

    let h = date.getHours();
    const m = date.getMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    if (h === 0) h = 12;
    if (h > 12) h -= 12;
    const mm = m < 10 ? `0${m}` : m;
    return `${h}:${mm} ${ampm}`;
}