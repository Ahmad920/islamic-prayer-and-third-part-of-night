
import { format } from "date-fns";
import { NextPrayerInfo, PrayerTime } from "@/types/prayer";

export const convertTo12HourFormat = (time24: string) => {
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${period}`;
};

export const parseTimeString = (timeStr: string, date: Date = new Date()) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const newDate = new Date(date);
  newDate.setHours(hours, minutes, 0, 0);
  return newDate;
};

export const calculateSpecialTimes = (maghribTime: string, nextFajrTime: string, date: Date) => {
  const maghribDate = parseTimeString(maghribTime, date);
  
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  const fajrDate = parseTimeString(nextFajrTime, nextDay);
  
  const nightDuration = fajrDate.getTime() - maghribDate.getTime();
  
  const midnightTime = new Date(maghribDate.getTime() + nightDuration / 2);
  const lastThirdTime = new Date(maghribDate.getTime() + (nightDuration * 2) / 3);
  
  return {
    midnight: format(midnightTime, 'HH:mm'),
    lastThird: format(lastThirdTime, 'HH:mm')
  };
};

export const determineNextPrayer = (
  prayerTimes: PrayerTime | null,
  tomorrowFajr: string
): NextPrayerInfo | null => {
  if (!prayerTimes) return null;

  const now = new Date();
  const allTimes = [
    { name: 'fajr', time: parseTimeString(prayerTimes.fajr) },
    { name: 'sunrise', time: parseTimeString(prayerTimes.sunrise) },
    { name: 'dhuhr', time: parseTimeString(prayerTimes.dhuhr) },
    { name: 'asr', time: parseTimeString(prayerTimes.asr) },
    { name: 'maghrib', time: parseTimeString(prayerTimes.maghrib) },
    { name: 'isha', time: parseTimeString(prayerTimes.isha) },
    { name: 'midnight', time: parseTimeString(prayerTimes.midnight) },
    { name: 'lastThird', time: parseTimeString(prayerTimes.lastThird) }
  ];

  const tomorrowFajrTime = parseTimeString(tomorrowFajr);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrowFajrTime.setDate(tomorrow.getDate());
  
  allTimes.push({ name: 'fajr-tomorrow', time: tomorrowFajrTime });
  allTimes.sort((a, b) => a.time.getTime() - b.time.getTime());

  for (let i = 0; i < allTimes.length; i++) {
    if (allTimes[i].time > now) {
      return {
        name: allTimes[i].name === 'fajr-tomorrow' ? 'fajr' : allTimes[i].name,
        time: allTimes[i].time
      };
    }
  }

  return { name: 'fajr', time: allTimes[0].time };
};
