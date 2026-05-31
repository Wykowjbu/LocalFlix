"use client";

import Icon from "./icon";

export default function RoundButton({
  icon,
  label,
  filled = false,
  size = "md",
  onClick,
}: {
  icon: "play" | "plus" | "like" | "dislike" | "chevron" | "check" | "volume" | "x";
  label: string;
  filled?: boolean;
  size?: "sm" | "md";
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid cursor-pointer place-items-center rounded-full border-2 transition-colors ${
        size === "sm" ? "h-8 w-8" : "h-10 w-10"
      } ${
        filled ? "border-white bg-white text-black" : "border-white/50 bg-[#2a2a2a]/60 text-white hover:border-white hover:bg-[#3a3a3a]"
      }`}
    >
      <Icon name={icon} className={icon === "chevron" ? "h-5 w-5 rotate-90" : icon === "dislike" ? "h-5 w-5 rotate-180" : "h-5 w-5"} />
    </button>
  );
}
