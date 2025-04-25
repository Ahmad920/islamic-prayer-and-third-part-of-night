
import React, { useEffect, useState } from 'react';
import { NextPrayerInfo } from '@/types/prayer';
import { Timer } from 'lucide-react';

interface PrayerCountdownProps {
  nextPrayerInfo: NextPrayerInfo | null;
  prayerNames: Record<string, Record<string, string>>;
  language: "en" | "ar";
  onCountdownEnd?: () => void;
}

const PrayerCountdown: React.FC<PrayerCountdownProps> = ({
  nextPrayerInfo,
  prayerNames,
  language,
  onCountdownEnd
}) => {
  const [countdownTime, setCountdownTime] = useState("00:00:00");

  const calculateCountdown = () => {
    if (!nextPrayerInfo) return;

    const now = new Date();
    const nextPrayerTime = nextPrayerInfo.time;
    const difference = nextPrayerTime.getTime() - now.getTime();

    if (difference <= 0) {
      onCountdownEnd?.();
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

  useEffect(() => {
    const timer = setInterval(calculateCountdown, 1000);
    return () => clearInterval(timer);
  }, [nextPrayerInfo]);

  if (!nextPrayerInfo) return null;

  return (
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
          {nextPrayerInfo.time.toLocaleTimeString(language === "en" ? "en-US" : "ar-SA", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: language === "en"
          })}
        </span>
      </div>
      <div className="mt-3 text-3xl font-bold text-accent pulse-animation accent-glow flex items-center justify-center gap-2">
        <Timer className="h-6 w-6" />
        {countdownTime}
      </div>
    </div>
  );
};

export default PrayerCountdown;
