"use client";

import Hls from "hls.js";
import { MouseEvent, useEffect, useMemo, useRef, useState } from "react";

const mockResponse = {
  status: "success",
  movie: {
    id: "ccf2c17d9d1388d86d3bdb68bc85a49b",
    name: "Lớp Học Tình Yêu (Phần 3)",
    original_name: "Love Class (Season 3)",
    total_episodes: 10,
    current_episode: "Tập 2",
    quality: "HD",
    language: "Vietsub",
    episodes: [
      {
        server_name: "Vietsub #1",
        items: [
          {
            name: "1",
            slug: "tap-1",
            embed: "https://embed14.streamc.xyz/embed.php?hash=ae8eb61960fde2d826e0e467e803d0bf",
            m3u8: "https://sing.phimmoi.net/ae8eb61960fde2d826e0e467e803d0bf/hls.m3u8",
          },
          {
            name: "2",
            slug: "tap-2",
            embed: "https://embed11.streamc.xyz/embed.php?hash=62cf265c97dcf8ca1e086fe5cfc8b270",
            m3u8: "https://sing.phimmoi.net/62cf265c97dcf8ca1e086fe5cfc8b270/hls.m3u8",
          },
        ],
      },
    ],
  },
};

type IconName = "back" | "flag" | "play" | "pause" | "rewind" | "forward" | "volume" | "muted" | "fullscreen" | "episodes" | "settings" | "check";

function Icon({ name, className = "h-7 w-7" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, string> = {
    back: "M15 18 9 12l6-6M10 12h11",
    flag: "M5 21V4m0 0h11l-1 4 1 4H5",
    play: "M8 5v14l11-7z",
    pause: "M8 5h3v14H8V5Zm5 0h3v14h-3V5Z",
    rewind: "M11 19 4 12l7-7v14Zm9 0-7-7 7-7v14Z",
    forward: "m13 5 7 7-7 7V5ZM4 5l7 7-7 7V5Z",
    volume: "M11 5 6.5 9H3v6h3.5l4.5 4V5Zm5.5 2.5a6.5 6.5 0 0 1 0 9M14 10a3 3 0 0 1 0 4",
    muted: "M11 5 6.5 9H3v6h3.5l4.5 4V5Zm5 5 5 5m0-5-5 5",
    fullscreen: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
    episodes: "M4 6h16M4 12h16M4 18h16",
    settings: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 3.4-.2-.1a1.7 1.7 0 0 0-2 .3l-.2.2-3.8-2.2.1-.3a1.7 1.7 0 0 0-.9-1.6l-.3-.1v-4.4l.3-.1a1.7 1.7 0 0 0 .9-1.6l-.1-.3L15.4 8l.2.2a1.7 1.7 0 0 0 2 .3l.2-.1 2 3.4-.1.1a1.7 1.7 0 0 0-.3 1.9l.1.2v.8l-.1.2Z",
    check: "m5 12 4 4L19 6",
  };

  return (
    <svg className={className} viewBox="0 0 24 24" fill={name === "play" || name === "pause" ? "currentColor" : "none"} aria-hidden="true">
      <path d={paths[name]} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "00:00";
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function WatchPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const hideControlsTimer = useRef<number | null>(null);
  const episodes = mockResponse.movie.episodes[0].items;
  const [episodeIndex, setEpisodeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [error, setError] = useState("");
  const activeEpisode = episodes[episodeIndex];
  const title = `${mockResponse.movie.name} - Tập ${activeEpisode.name}`;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const timelineStyle = useMemo(
    () => ({
      background: `linear-gradient(to right, #e50914 ${progress}%, rgba(255,255,255,.45) ${progress}%)`,
    }),
    [progress]
  );

  const revealControls = () => {
    setShowControls(true);
    if (hideControlsTimer.current) window.clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = window.setTimeout(() => setShowControls(false), 3000);
  };

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      await video.play().catch(() => setError("Trình duyệt đang chặn autoplay. Bấm play lại để phát video."));
    } else {
      video.pause();
    }
  };

  const seekBy = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(Math.max(video.currentTime + seconds, 0), video.duration || 0);
  };

  const seekToPercent = (event: MouseEvent<HTMLElement>) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const next = (event.clientX - rect.left) / rect.width;
    video.currentTime = Math.min(Math.max(next, 0), 1) * duration;
  };

  const updateVolume = (value: number) => {
    const video = videoRef.current;
    setVolume(value);
    setMuted(value === 0);
    if (video) {
      video.volume = value;
      video.muted = value === 0;
    }
  };

  const updateSpeed = (value: number) => {
    const video = videoRef.current;
    setSpeed(value);
    setShowSpeedMenu(false);
    if (video) video.playbackRate = value;
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await shellRef.current?.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setError("");
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setShowControls(true);
    video.pause();
    video.removeAttribute("src");
    video.load();

    let hls: Hls | null = null;
    const source = activeEpisode.m3u8;
    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true });
      hls.loadSource(source);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) setError("Không thể tải luồng HLS này. Thử tập khác hoặc server khác.");
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = source;
    } else {
      setError("Trình duyệt này không hỗ trợ HLS.");
    }

    return () => {
      hls?.destroy();
    };
  }, [activeEpisode.m3u8]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = muted;
    video.playbackRate = speed;

    const onPlay = () => {
      setIsPlaying(true);
      revealControls();
    };
    const onPause = () => {
      setIsPlaying(false);
      revealControls();
    };
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onLoadedMetadata = () => setDuration(video.duration || 0);
    const onDurationChange = () => setDuration(video.duration || 0);

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("durationchange", onDurationChange);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("durationchange", onDurationChange);
    };
  }, [muted, speed, volume]);

  useEffect(() => {
    hideControlsTimer.current = window.setTimeout(() => setShowControls(false), 3000);
    return () => {
      if (hideControlsTimer.current) window.clearTimeout(hideControlsTimer.current);
    };
  }, []);

  return (
    <main
      ref={shellRef}
      className={`fixed inset-0 h-screen w-screen overflow-hidden bg-black text-white ${showControls ? "cursor-default" : "cursor-none"}`}
      onMouseMove={revealControls}
    >
      <video ref={videoRef} className="h-full w-full bg-black object-contain" playsInline onClick={togglePlay} />

      <div className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}>
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/90 via-black/35 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/95 via-black/55 to-transparent" />
      </div>

      <header className={`absolute inset-x-0 top-0 flex h-24 items-center justify-between px-8 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}>
        <button className="grid size-12 place-items-center rounded-full text-white transition hover:bg-white/10" type="button" aria-label="Quay lại" onClick={() => history.back()}>
          <Icon name="back" />
        </button>
        <h1 className={`pointer-events-none absolute left-1/2 max-w-[60vw] -translate-x-1/2 truncate text-center text-[22px] font-medium transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}>
          {title}
        </h1>
        <button className="grid size-12 place-items-center rounded-full text-white transition hover:bg-white/10" type="button" aria-label="Báo cáo lỗi">
          <Icon name="flag" />
        </button>
      </header>

      {error ? (
        <div className="absolute left-1/2 top-1/2 max-w-xl -translate-x-1/2 -translate-y-1/2 rounded bg-black/80 px-6 py-4 text-center text-[16px] text-[#e5e5e5]">
          {error}
        </div>
      ) : null}

      {!isPlaying ? (
        <button
          type="button"
          aria-label="Phát video"
          onClick={togglePlay}
          className="absolute left-1/2 top-1/2 grid size-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition hover:scale-105 hover:bg-white/25"
        >
          <Icon name="play" className="ml-1 h-12 w-12" />
        </button>
      ) : null}

      <section className={`absolute inset-x-0 bottom-0 px-8 pb-8 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}>
        <div className="mb-5 flex items-center gap-4">
          <button className="group relative h-5 flex-1 cursor-pointer" type="button" aria-label="Tua video" onClick={seekToPercent}>
            <span className="absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 rounded-full" style={timelineStyle} />
            <span className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e50914] opacity-0 transition group-hover:opacity-100" style={{ left: `${progress}%` }} />
          </button>
          <span className="min-w-[120px] text-right text-[14px] text-[#e5e5e5]">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button type="button" aria-label={isPlaying ? "Tạm dừng" : "Phát"} onClick={togglePlay} className="grid size-11 place-items-center rounded-full transition hover:bg-white/10">
              <Icon name={isPlaying ? "pause" : "play"} />
            </button>
            <button type="button" aria-label="Tua lui 10 giây" onClick={() => seekBy(-10)} className="grid size-11 place-items-center rounded-full transition hover:bg-white/10">
              <Icon name="rewind" />
            </button>
            <button type="button" aria-label="Tua tiến 10 giây" onClick={() => seekBy(10)} className="grid size-11 place-items-center rounded-full transition hover:bg-white/10">
              <Icon name="forward" />
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label={muted ? "Bật âm thanh" : "Tắt âm thanh"}
                onClick={() => {
                  const next = !muted;
                  setMuted(next);
                  if (videoRef.current) videoRef.current.muted = next;
                }}
                className="grid size-11 place-items-center rounded-full transition hover:bg-white/10"
              >
                <Icon name={muted || volume === 0 ? "muted" : "volume"} />
              </button>
              <input
                aria-label="Âm lượng"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={muted ? 0 : volume}
                onChange={(event) => updateVolume(Number(event.target.value))}
                className="h-1 w-28 accent-[#e50914]"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              {showSpeedMenu ? (
                <div className="absolute bottom-14 right-0 w-40 overflow-hidden rounded bg-[#181818]/95 py-2 shadow-[0_8px_30px_rgba(0,0,0,.45)]">
                  {[1, 1.25, 1.5].map((value) => (
                    <button key={value} type="button" onClick={() => updateSpeed(value)} className="flex w-full items-center justify-between px-4 py-2 text-left text-[14px] hover:bg-white/10">
                      {value}x
                      {speed === value ? <Icon name="check" className="h-4 w-4" /> : null}
                    </button>
                  ))}
                </div>
              ) : null}
              <button type="button" aria-label="Cài đặt tốc độ" onClick={() => setShowSpeedMenu((value) => !value)} className="flex h-11 items-center gap-2 rounded-full px-3 transition hover:bg-white/10">
                <Icon name="settings" />
                <span className="text-[14px]">{speed}x</span>
              </button>
            </div>

            <div className="relative">
              {showEpisodes ? (
                <div className="absolute bottom-14 right-0 w-72 overflow-hidden rounded bg-[#181818]/95 py-3 shadow-[0_8px_30px_rgba(0,0,0,.45)]">
                  <div className="px-4 pb-2 text-[13px] text-[#b3b3b3]">{mockResponse.movie.episodes[0].server_name}</div>
                  {episodes.map((episode, index) => (
                    <button
                      key={episode.slug}
                      type="button"
                      onClick={() => {
                        setEpisodeIndex(index);
                        setShowEpisodes(false);
                      }}
                      className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-white/10"
                    >
                      <span>Tập {episode.name}</span>
                      {episodeIndex === index ? <Icon name="check" className="h-4 w-4 text-[#46d369]" /> : null}
                    </button>
                  ))}
                </div>
              ) : null}
              <button type="button" aria-label="Danh sách tập" onClick={() => setShowEpisodes((value) => !value)} className="flex h-11 items-center gap-2 rounded-full px-3 transition hover:bg-white/10">
                <Icon name="episodes" />
                <span className="hidden text-[14px] md:inline">Tập phim</span>
              </button>
            </div>

            <button type="button" aria-label="Toàn màn hình" onClick={toggleFullscreen} className="grid size-11 place-items-center rounded-full transition hover:bg-white/10">
              <Icon name="fullscreen" />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
