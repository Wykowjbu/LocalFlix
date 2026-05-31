"use client";

export default function Icon({
  name,
  className = "h-5 w-5",
}: {
  name:
    | "play"
    | "info"
    | "plus"
    | "like"
    | "dislike"
    | "search"
    | "bell"
    | "pencil"
    | "chevron"
    | "check"
    | "volume"
    | "x"
    | "transfer"
    | "user"
    | "help"
    | "signout"
    | "sync"
    | "database";
  className?: string;
}) {
  const paths = {
    play: "M8 5v14l11-7z",
    info: "M11 17h2v-6h-2v6Zm1-8.75a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z",
    plus: "M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z",
    like: "M7 10v10H4V10h3Zm3.2 10H8V9.4L12.7 3l1.1.8c.4.3.6.8.5 1.3l-.7 3.4H20c.7 0 1.2.6 1 1.3l-1.6 8.1c-.2 1.2-1.2 2.1-2.4 2.1h-6.8Z",
    dislike: "M7 10v10H4V10h3Zm3.2 10H8V9.4L12.7 3l1.1.8c.4.3.6.8.5 1.3l-.7 3.4H20c.7 0 1.2.6 1 1.3l-1.6 8.1c-.2 1.2-1.2 2.1-2.4 2.1h-6.8Z",
    search: "m20 20-4.2-4.2M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z",
    bell: "M18 16H6l1.2-1.4V10a4.8 4.8 0 1 1 9.6 0v4.6L18 16Zm-4 2a2 2 0 0 1-4 0",
    pencil: "M5 16.5V20h3.5L19 9.5 15.5 6 5 16.5Zm12.7-9.7 1.5-1.5-2.5-2.5-1.5 1.5 2.5 2.5Z",
    chevron: "m9 6 6 6-6 6",
    check: "m5 12 4 4L19 6",
    volume: "M11 5 6.5 9H3v6h3.5l4.5 4V5Zm5.5 2.5a6.5 6.5 0 0 1 0 9M14 10a3 3 0 0 1 0 4",
    x: "m6 6 12 12M18 6 6 18",
    transfer: "M7 7h9m0 0-3-3m3 3-3 3M17 17H8m0 0 3 3m-3-3 3-3",
    user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0",
    help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-2-12a2 2 0 1 1 3.2 1.6c-.7.4-1.2.9-1.2 1.9v.5m0 3h.01",
    signout: "M10 17l5-5-5-5m5 5H3m10-8h5a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-5",
    sync: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
    database: "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4",
  };

  return (
    <svg className={className} viewBox="0 0 24 24" fill={name === "play" ? "currentColor" : "none"} aria-hidden="true">
      <path d={paths[name]} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
