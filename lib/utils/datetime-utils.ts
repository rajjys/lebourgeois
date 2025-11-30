import { Weekday } from "../generated/prisma/client";
  
export function formatDuration(minutes: number | null): string {
    if (minutes === null) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    }
    return `${mins}m`;
  }
  
export function formatTime(timeStr: string | null): string {
    if (!timeStr) return 'N/A';
    const [hours, minutes] = timeStr.split(':');
    return `${hours}:${minutes}`;
  }
  
export function getWeekdayFromDate(date: Date): Weekday {
    const map: Weekday[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return map[date.getDay()];
  }