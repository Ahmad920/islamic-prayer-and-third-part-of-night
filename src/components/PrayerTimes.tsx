import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import CompasIcon from "./CompasIcon";
import MoonIcon from "./MoonIcon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MapPin } from "lucide-react";

const prayerNames = {
  en: {
    fajr: "Fajr",
    sunrise: "Sunrise",
    dhuhr: "Dhuhr",
    asr: "Asr",
    maghrib: "Maghrib",
    isha: "Isha",
    midnight: "Islamic Midnight",
    lastThird: "Last Third of Night",
  },
  ar: {
    fajr: "الفجر",
    sunrise: "الشروق",
    dhuhr: "الظهر",
    asr: "العصر",
    maghrib: "المغرب",
    isha: "العشاء",
    midnight: "منتصف الليل الشرعي",
    lastThird: "الثلث الأخير من الليل",
  },
};

const methodNames = {
  en: {
    0: "Shia Ithna-Ansari",
    1: "University of Islamic Sciences, Karachi",
    2: "Islamic Society of North America",
    3: "Muslim World League",
    4: "Umm Al-Qura University, Makkah",
    5: "Egyptian General Authority of Survey",
    7: "Institute of Geophysics, University of Tehran",
    8: "Gulf Region",
    9: "Kuwait",
    10: "Qatar",
    11: "Majlis Ugama Islam Singapura, Singapore",
    12: "Union Organization Islamic de France",
    13: "Diyanet İşleri Başkanlığı, Turkey",
    14: "Spiritual Administration of Muslims of Russia",
    15: "Moonsighting Committee Worldwide"
  },
  ar: {
    0: "الشيعة الإثنا عشرية",
    1: "جامعة العلوم الإسلامية، كراتشي",
    2: "الجمعية الإسلامية لأمريكا الشمالية",
    3: "رابطة العالم الإسلامي",
    4: "جامعة أم القرى، مكة المكرمة",
    5: "الهيئة المصرية العامة للمساحة",
    7: "معهد الجيوفيزياء، جامعة طهران",
    8: "منطقة الخليج",
    9: "الكويت",
    10: "قطر",
    11: "مجلس أوغاما الإسلامي سنغافورة",
    12: "اتحاد المنظمات الإسلامية في فرنسا",
    13: "رئاسة الشؤون الدينية، تركيا",
    14: "الإدارة الروحية لمسلمي روسيا",
    15: "لجنة استطلاع الهلال العالمية"
  }
};

interface PrayerTimesProps {
  initialLanguage?: "en" | "ar";
}

const PrayerTimes: React.FC<PrayerTimesProps> = ({ 
  initialLanguage = "ar" 
}) => {
  const [prayerTimes, setPrayerTimes] = useState<any>(null);
  const [nextPrayerInfo, setNextPrayerInfo] = useState<any>(null);
  const [location, setLocation] = useState<any>({ latitude: null, longitude: null, city: "Loading...", country: "..." });
  const [language, setLanguage] = useState<"en" | "ar">(initialLanguage);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calculationMethod, setCalculationMethod] = useState<string>("4");
  const [hijriDate, setHijriDate] = useState<any>(null);
  const [countdownTime, setCountdownTime] = useState<string>("00:00:00");
  const [tomorrowFajr, setTomorrowFajr] = useState<string>("");
  const [timezone, setTimezone] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualCityInput, setManualCityInput] = useState("");
  const [manualLookupError, setManualLookupError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  // Compute a Date representing wall-clock time in a given IANA timezone
  const zonedWallTimeToDate = (y: number, m: number, d: number, h: number, min: number, tz: string) => {
    const utcGuess = Date.UTC(y, m - 1, d, h, min, 0);
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    const parts = dtf.formatToParts(new Date(utcGuess)).reduce((acc: any, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});
    const asUTC = Date.UTC(
      parseInt(parts.year), parseInt(parts.month) - 1, parseInt(parts.day),
      parseInt(parts.hour), parseInt(parts.minute), parseInt(parts.second)
    );
    const offset = asUTC - utcGuess;
    return new Date(utcGuess - offset);
  };

  const nowInTz = (tz: string) => {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
    });
    const parts = dtf.formatToParts(new Date()).reduce((acc: any, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});
    return { year: parseInt(parts.year), month: parseInt(parts.month), day: parseInt(parts.day) };
  };

  const handleManualLocationSubmit = async () => {
    const query = manualCityInput.trim();
    if (!query) return;
    setIsLookingUp(true);
    setManualLookupError(null);
    const result = await getLocationByCityName(query);
    setIsLookingUp(false);
    if (result) {
      setLocation(result);
      setError(null);
      setManualDialogOpen(false);
      setManualCityInput("");
      fetchPrayerTimes(result.latitude, result.longitude, calculationMethod);
    } else {
      setManualLookupError(
        language === "ar" ? "تعذر العثور على الموقع" : "Location not found"
      );
    }
  };

  const getLocationByIP = async () => {
    // Try multiple IP geolocation services for reliability
    const providers = [
      {
        url: "https://ipwho.is/",
        parse: (d: any) =>
          d && d.success !== false && d.latitude && d.longitude
            ? { latitude: d.latitude, longitude: d.longitude, city: d.city, country: d.country }
            : null,
      },
      {
        url: "https://get.geojs.io/v1/ip/geo.json",
        parse: (d: any) =>
          d && d.latitude && d.longitude
            ? {
                latitude: parseFloat(d.latitude),
                longitude: parseFloat(d.longitude),
                city: d.city,
                country: d.country,
              }
            : null,
      },
      {
        url: "https://ipapi.co/json/",
        parse: (d: any) =>
          d && d.latitude && d.longitude
            ? { latitude: d.latitude, longitude: d.longitude, city: d.city, country: d.country_name }
            : null,
      },
    ];

    for (const p of providers) {
      try {
        const response = await fetch(p.url);
        if (!response.ok) continue;
        const data = await response.json();
        const parsed = p.parse(data);
        if (parsed) return { ...parsed, source: "ip" };
      } catch (error) {
        console.error(`IP provider failed (${p.url}):`, error);
      }
    }
    return null;
  };

  const getLocationByCityName = async (cityName: string) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1&accept-language=${language}`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const result = data[0];
        const parts = (result.display_name || "").split(",").map((s: string) => s.trim());
        return {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          city: parts[0] || cityName,
          country: parts[parts.length - 1] || "",
          source: "manual",
        };
      }
      return null;
    } catch (error) {
      console.error("Error geocoding city:", error);
      return null;
    }
  };

  const getLocationByBrowser = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            city: "Current Location",
            country: "",
            source: "browser"
          });
        },
        (error) => {
          reject(error);
        }
      );
    });
  };

  const getUserLocation = async () => {
    try {
      setIsLoading(true);
      const ipLocation = await getLocationByIP();
      
      if (ipLocation && ipLocation.latitude && ipLocation.longitude) {
        setLocation(ipLocation);
        return ipLocation;
      }
      
      try {
        const browserLocation = await getLocationByBrowser();
        setLocation(browserLocation);
        return browserLocation;
      } catch (geoError) {
        throw new Error("Could not determine your location. Please enter it manually.");
      }
    } catch (error) {
      console.error("Error getting user location:", error);
      setError(error instanceof Error ? error.message : "Unknown error getting location");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const convertTo12HourFormat = (time24: string) => {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${period}`;
  };

  const parseTimeString = (timeStr: string, dayOffset: number = 0) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const { year, month, day } = nowInTz(timezone);
    // Build a date at the given wall-clock time in the location's timezone.
    // Using UTC math + dayOffset avoids DST edge cases.
    const base = Date.UTC(year, month - 1, day + dayOffset);
    const baseDate = new Date(base);
    return zonedWallTimeToDate(
      baseDate.getUTCFullYear(),
      baseDate.getUTCMonth() + 1,
      baseDate.getUTCDate(),
      hours,
      minutes,
      timezone
    );
  };

  const calculateSpecialTimes = (maghribTime: string, nextFajrTime: string) => {
    const maghribDate = parseTimeString(maghribTime, 0);
    const fajrDate = parseTimeString(nextFajrTime, 1);

    const nightDuration = fajrDate.getTime() - maghribDate.getTime();
    const midnightTime = new Date(maghribDate.getTime() + nightDuration / 2);
    const lastThirdTime = new Date(maghribDate.getTime() + (nightDuration * 2) / 3);

    // Format in the target timezone
    const fmt = (d: Date) => new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone, hourCycle: "h23", hour: "2-digit", minute: "2-digit",
    }).format(d);

    return { midnight: fmt(midnightTime), lastThird: fmt(lastThirdTime) };
  };


  const calculateCountdown = () => {
    if (!nextPrayerInfo) return;

    const now = new Date();
    const nextPrayerTime = nextPrayerInfo.time;
    const difference = nextPrayerTime.getTime() - now.getTime();

    if (difference <= 0) {
      determineNextPrayer();
      return;
    }

    let seconds = Math.floor(difference / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);

    seconds %= 60;
    minutes %= 60;

    const formattedHours = hours.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = seconds.toString().padStart(2, '0');

    setCountdownTime(`${formattedHours}:${formattedMinutes}:${formattedSeconds}`);
  };

  const determineNextPrayer = () => {
    if (!prayerTimes) return;

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

    const tomorrowFajrTime = parseTimeString(tomorrowFajr, 1);

    allTimes.push({ name: 'fajr-tomorrow', time: tomorrowFajrTime });


    allTimes.sort((a, b) => a.time.getTime() - b.time.getTime());

    for (let i = 0; i < allTimes.length; i++) {
      if (allTimes[i].time > now) {
        setNextPrayerInfo({
          name: allTimes[i].name === 'fajr-tomorrow' ? 'fajr' : allTimes[i].name,
          time: allTimes[i].time
        });
        return;
      }
    }

    setNextPrayerInfo({ name: 'fajr', time: allTimes[0].time });
  };

  const fetchPrayerTimes = async (lat: number, lng: number, method: string) => {
    try {
      setIsLoading(true);
      const date = new Date();
      const tomorrow = new Date(date);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const dateStr = format(date, 'dd-MM-yyyy');
      const tomorrowStr = format(tomorrow, 'dd-MM-yyyy');

      const response = await fetch(
        `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${lat}&longitude=${lng}&method=${method}`
      );
      const data = await response.json();

      const tomorrowResponse = await fetch(
        `https://api.aladhan.com/v1/timings/${tomorrowStr}?latitude=${lat}&longitude=${lng}&method=${method}`
      );
      const tomorrowData = await tomorrowResponse.json();

      if (data.code === 200 && tomorrowData.code === 200) {
        const times = data.data.timings;
        const tomorrowFajr = tomorrowData.data.timings.Fajr;
        const apiTz = data.data.meta?.timezone;
        if (apiTz) setTimezone(apiTz);
        setTomorrowFajr(tomorrowFajr);

        const formattedTimes = {
          fajr: times.Fajr,
          sunrise: times.Sunrise,
          dhuhr: times.Dhuhr,
          asr: times.Asr,
          maghrib: times.Maghrib,
          isha: times.Isha
        };

        const specialTimes = calculateSpecialTimes(
          times.Maghrib,
          tomorrowFajr
        );

        setHijriDate(data.data.date.hijri);

        setPrayerTimes({
          ...formattedTimes,
          midnight: specialTimes.midnight,
          lastThird: specialTimes.lastThird
        });
      } else {
        throw new Error("Failed to fetch prayer times");
      }
    } catch (error) {
      console.error("Error fetching prayer times:", error);
      setError("Failed to fetch prayer times. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      const locationData = await getUserLocation();
      if (locationData && locationData.latitude && locationData.longitude) {
        fetchPrayerTimes(locationData.latitude, locationData.longitude, calculationMethod);
      }
    };

    initializeApp();
  }, []);

  useEffect(() => {
    if (location.latitude && location.longitude) {
      fetchPrayerTimes(location.latitude, location.longitude, calculationMethod);
    }
  }, [calculationMethod]);

  useEffect(() => {
    const timer = setInterval(calculateCountdown, 1000);
    return () => clearInterval(timer);
  }, [nextPrayerInfo]);

  useEffect(() => {
    if (prayerTimes) {
      determineNextPrayer();
    }
  }, [prayerTimes]);

  const formatDate = (date: Date, lang: "en" | "ar") => {
    return format(date, 'EEEE, MMMM d, yyyy', {
      locale: lang === "en" ? enUS : ar
    });
  };

  const toggleLanguage = () => {
    setLanguage(prevLang => (prevLang === "en" ? "ar" : "en"));
  };

  return (
    <div className={`min-h-screen islamic-pattern ${language === "ar" ? "rtl" : "ltr"}`}>
      <div className="geometric-accent"></div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 relative">
        <div className="header-container text-center">
          <div className="flex justify-center mb-4">
            <CompasIcon className="h-16 w-16 text-accent animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold text-white sm:text-4xl mb-2 accent-glow">
            {language === "en" ? "Prayer Times" : "أوقات الصلاة"}
          </h1>
          <p className="text-lg text-gray-200 max-w-xl mx-auto">
            {language === "en" 
              ? "Islamic prayer times, midnight, and last third of night calculations" 
              : "حساب أوقات الصلاة الإسلامية ومنتصف الليل والثلث الأخير من الليل"}
          </p>
        </div>

        <div className="location-card p-4 mb-6">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-medium text-white flex items-center gap-2 flex-wrap">
                <span>
                  {language === "en" ? "Location" : "الموقع"}: {location.city}, {location.country}
                </span>
                <button
                  onClick={() => { setManualLookupError(null); setManualDialogOpen(true); }}
                  className="language-toggle hover:bg-opacity-20 text-sm"
                  title={language === "ar" ? "تحديد الموقع يدويًا" : "Set location manually"}
                >
                  <MapPin className="w-4 h-4" />
                  <span>{language === "ar" ? "تغيير" : "Change"}</span>
                </button>
              </h2>
              
              <div className="flex items-center text-gray-300 mt-1">
                <span>
                  {language === "en" 
                    ? formatDate(new Date(), "en") 
                    : formatDate(new Date(), "ar")}
                </span>
                {hijriDate && (
                  <span className="mx-2">|</span>
                )}
                {hijriDate && (
                  <span className="text-accent">
                    {language === "en" 
                      ? `${hijriDate.day} ${hijriDate.month.en} ${hijriDate.year} AH` 
                      : `${hijriDate.day} ${hijriDate.month.ar} ${hijriDate.year} هـ`}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={toggleLanguage} 
                className="language-toggle hover:bg-opacity-20"
              >
                <span className={language === "en" ? "font-bold" : ""}>EN</span>
                <span>/</span>
                <span className={language === "ar" ? "font-bold" : ""}>عربي</span>
              </button>
              
              <div className="w-full md:w-auto">
                <Select
                  value={calculationMethod}
                  onValueChange={(value) => setCalculationMethod(value)}
                >
                  <SelectTrigger className="prayer-method-select w-[200px] max-w-full">
                    <SelectValue placeholder={language === "en" ? "Select method" : "اختر الطريقة"} />
                  </SelectTrigger>
                  <SelectContent className="bg-sidebar text-foreground border-white/10">
                    {Object.entries(methodNames[language]).map(([key, name]) => (
                      <SelectItem key={key} value={key} className="focus:bg-accent/30 focus:text-white hover:bg-accent/20">
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {nextPrayerInfo && (
          <div className="countdown-container p-6 mb-6 text-center">
            <h2 className="text-lg font-medium text-gray-200">
              {language === "en" ? "Next Time" : "الوقت القادم"}
            </h2>
            <div className="mt-2">
              <span className="text-2xl font-bold text-accent accent-glow">
                {prayerNames[language][nextPrayerInfo.name as keyof typeof prayerNames.en] || nextPrayerInfo.name}
              </span>
              <span className="mx-2 text-gray-400">|</span>
              <span className="text-xl font-medium text-white">
                {(() => {
                  const t = new Intl.DateTimeFormat("en-GB", {
                    timeZone: timezone, hourCycle: "h23", hour: "2-digit", minute: "2-digit",
                  }).format(nextPrayerInfo.time);
                  return language === "en" ? convertTo12HourFormat(t) : t;
                })()}
              </span>
            </div>
            <div className="mt-3 text-3xl font-bold text-accent pulse-animation accent-glow">
              {countdownTime}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent mx-auto"></div>
            <p className="mt-4 text-gray-300">
              {language === "en" ? "Loading prayer times..." : "جارٍ تحميل أوقات الصلاة..."}
            </p>
          </div>
        ) : error ? (
          <div className="bg-red-900/20 text-red-200 p-4 rounded-lg border border-red-500/30 backdrop-blur-sm">
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 px-4 py-2 bg-red-900/30 rounded-md hover:bg-red-800/40"
            >
              {language === "en" ? "Retry" : "إعادة المحاولة"}
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {prayerTimes && Object.entries(prayerTimes)
                .filter(([key]) => key !== "midnight" && key !== "lastThird")
                .map(([key, time]) => (
                  <div 
                    key={key} 
                    className={`prayer-card p-4 ${nextPrayerInfo && nextPrayerInfo.name === key ? 'next-prayer' : ''}`}
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium text-white">
                        {prayerNames[language][key as keyof typeof prayerNames.en] || key}
                      </h3>
                      <div className="text-xl font-semibold text-accent">
                        {language === "en" 
                          ? convertTo12HourFormat(time as string)
                          : time as string}
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>

            <div className="geometric-divider"></div>

            <div className="special-times-container p-4 mb-4">
              <h3 className="text-lg font-medium mb-3 text-center text-white">
                {language === "en" ? "Special Times" : "أوقات خاصة"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {prayerTimes && (
                  <>
                    <div className="flex justify-between items-center border border-white/10 rounded-lg p-3 bg-white/5 backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <MoonIcon className="w-5 h-5 text-accent" />
                        <h4 className="font-medium text-white">
                          {prayerNames[language].midnight}
                        </h4>
                      </div>
                      <div className="text-lg font-semibold text-accent">
                        {language === "en" 
                          ? convertTo12HourFormat(prayerTimes.midnight as string)
                          : prayerTimes.midnight as string}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center border border-white/10 rounded-lg p-3 bg-white/5 backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <MoonIcon className="w-5 h-5 text-accent" />
                        <h4 className="font-medium text-white">
                          {prayerNames[language].lastThird}
                        </h4>
                      </div>
                      <div className="text-lg font-semibold text-accent">
                        {language === "en" 
                          ? convertTo12HourFormat(prayerTimes.lastThird as string)
                          : prayerTimes.lastThird as string}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        <div className="app-footer text-center text-sm mt-8 pt-4">
          <p>
            {language === "en" 
              ? "Prayer times calculated using Aladhan API" 
              : "تم حساب أوقات الصلاة باستخدام واجهة برمجة الأذان"}
          </p>
        </div>

        <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
          <DialogContent className="bg-sidebar text-white border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">
                {language === "ar" ? "تحديد الموقع يدويًا" : "Set Location Manually"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <label className="text-sm text-gray-300 block">
                {language === "ar"
                  ? "أدخل اسم المدينة (والدولة اختياريًا)"
                  : "Enter city name (country optional)"}
              </label>
              <input
                type="text"
                value={manualCityInput}
                onChange={(e) => setManualCityInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleManualLocationSubmit(); }}
                placeholder={language === "ar" ? "مثال: الرياض، السعودية" : "e.g. Riyadh, Saudi Arabia"}
                className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/60"
              />
              {manualLookupError && (
                <p className="text-red-300 text-sm">{manualLookupError}</p>
              )}
            </div>
            <DialogFooter>
              <button
                onClick={() => setManualDialogOpen(false)}
                className="language-toggle hover:bg-opacity-20"
              >
                {language === "ar" ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={handleManualLocationSubmit}
                disabled={isLookingUp || !manualCityInput.trim()}
                className="language-toggle hover:bg-opacity-20 disabled:opacity-50"
              >
                {isLookingUp
                  ? (language === "ar" ? "جارٍ البحث..." : "Searching...")
                  : (language === "ar" ? "بحث" : "Search")}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default PrayerTimes;
