import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import CompasIcon from "./CompasIcon";
import MoonIcon from "./MoonIcon";
import { useLocation } from "@/hooks/useLocation";
import { determineNextPrayer, calculateSpecialTimes, convertTo12HourFormat } from "@/utils/prayerUtils";
import { HijriDate, NextPrayerInfo, PrayerTime } from "@/types/prayer";
import PrayerCountdown from "./PrayerCountdown";
import { prayerNames, methodNames } from "@/constants/prayerNames";

interface PrayerTimesProps {
  initialLanguage?: "en" | "ar";
}

const PrayerTimes: React.FC<PrayerTimesProps> = ({ initialLanguage = "ar" }) => {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime | null>(null);
  const [nextPrayerInfo, setNextPrayerInfo] = useState<NextPrayerInfo | null>(null);
  const [language, setLanguage] = useState<"en" | "ar">(initialLanguage);
  const [isLoading, setIsLoading] = useState(true);
  const [calculationMethod, setCalculationMethod] = useState<string>("4");
  const [hijriDate, setHijriDate] = useState<HijriDate | null>(null);
  const [tomorrowFajr, setTomorrowFajr] = useState<string>("");

  const { location, error: locationError, getUserLocation } = useLocation();

  const fetchPrayerTimes = async (lat: number, lng: number, method: string) => {
    try {
      setIsLoading(true);
      const date = new Date();
      const tomorrow = new Date(date);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const dateStr = format(date, 'dd-MM-yyyy');
      const tomorrowStr = format(tomorrow, 'dd-MM-yyyy');

      const [response, tomorrowResponse] = await Promise.all([
        fetch(`https://api.aladhan.com/v1/timings/${dateStr}?latitude=${lat}&longitude=${lng}&method=${method}`),
        fetch(`https://api.aladhan.com/v1/timings/${tomorrowStr}?latitude=${lat}&longitude=${lng}&method=${method}`)
      ]);

      const data = await response.json();
      const tomorrowData = await tomorrowResponse.json();

      if (data.code === 200 && tomorrowData.code === 200) {
        const times = data.data.timings;
        const tomorrowFajr = tomorrowData.data.timings.Fajr;
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
          tomorrowFajr,
          date
        );

        setHijriDate(data.data.date.hijri);

        const allTimes = {
          ...formattedTimes,
          midnight: specialTimes.midnight,
          lastThird: specialTimes.lastThird
        };

        setPrayerTimes(allTimes);
        const nextPrayer = determineNextPrayer(allTimes, tomorrowFajr);
        if (nextPrayer) setNextPrayerInfo(nextPrayer);
      }
    } catch (error) {
      console.error("Error fetching prayer times:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      const locationData = await getUserLocation();
      if (locationData?.latitude && locationData?.longitude) {
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
              <h2 className="text-lg font-medium text-white">
                {language === "en" ? "Location" : "الموقع"}: {location.city}, {location.country}
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
              
              <select 
                value={calculationMethod}
                onChange={(e) => setCalculationMethod(e.target.value)}
                className="prayer-method-select"
                aria-label={language === "en" ? "Select calculation method" : "اختر طريقة الحساب"}
              >
                {Object.entries(methodNames[language]).map(([key, name]) => (
                  <option key={key} value={key}>
                    {name}
                  </option>
                ))}
              </select>
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
                {language === "en" 
                  ? convertTo12HourFormat(format(nextPrayerInfo.time, 'HH:mm'))
                  : format(nextPrayerInfo.time, 'HH:mm')}
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
      </div>
    </div>
  );
};

export default PrayerTimes;
