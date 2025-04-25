
export interface LocationData {
  latitude: number | null;
  longitude: number | null;
  city: string;
  country: string;
  source?: string;
}

export interface PrayerTime {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  midnight: string;
  lastThird: string;
}

export interface NextPrayerInfo {
  name: string;
  time: Date;
}

export interface HijriDate {
  day: string;
  month: { en: string; ar: string };
  year: string;
}
