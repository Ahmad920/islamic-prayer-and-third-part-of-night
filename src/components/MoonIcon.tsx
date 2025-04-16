
import React from "react";

interface MoonIconProps {
  className?: string;
}

const MoonIcon: React.FC<MoonIconProps> = ({ className = "w-6 h-6" }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        d="M21.53 15.93C20.12 17.52 18.02 18.58 15.6 18.58C11.29 18.58 7.79 15.08 7.79 10.77C7.79 7.97 9.33 5.57 11.63 4.35C7.13 4.75 3.5 8.59 3.5 13.29C3.5 18.3 7.56 22.36 12.57 22.36C16.48 22.36 19.86 19.73 21.53 15.93Z" 
        fill="currentColor"
      />
    </svg>
  );
};

export default MoonIcon;
