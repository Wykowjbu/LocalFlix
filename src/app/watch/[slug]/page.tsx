"use client";

import { use } from "react";
import Hls from "hls.js";
import { MouseEvent, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getStoredActiveProfileId, getStoredSession } from "@/lib/session";

type EpisodeItem = { id: string; name: string; slug: string; serverName: string; embedUrl: string | null; m3u8Url: string | null };
type MovieData = { slug: string; name: string; episodes?: EpisodeItem[] };
type HistoryRow = { movieSlug: string; episodeSlug: string | null; serverName: string | null; progress: number | null; duration: number | null };

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

function embedAutoplayUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("autoplay", "1");
    return parsed.toString();
  } catch {
    return url;
  }
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

function getPlaybackProfileId() {
  const session = getStoredSession();
  if (!session?.profiles?.length) return null;
  const activeProfileId = getStoredActiveProfileId();
  return session.profiles.find((profile) => profile.id === activeProfileId)?.id || session.profiles[0].id;
}

function WatchPlayer({ movieSlug }: { movieSlug: string }) {
  const searchParams = useSearchParams();
  const requestedEpisode = searchParams.get("episode") || "";

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const hideControlsTimer = useRef<number | null>(null);
  const progressSaveTimer = useRef<number | null>(null);

  const [movieData, setMovieData] = useState<MovieData | null>(null);
  const [loading, setLoading] = useState(true);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
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
  const [resumeProgress, setResumeProgress] = useState<number | null>(null);
  const [playbackMode, setPlaybackMode] = useState<'hls' | 'embed'>('hls');
  const [nextEpisode, setNextEpisode] = useState<EpisodeItem | null>(null);
  const [showNextOverlay, setShowNextOverlay] = useState(false);
  const nextCountdownRef = useRef<number | null>(null);
  const [nextCountdown, setNextCountdown] = useState(10);

  const fetchNextEpisode = useCallback(async (currentEpisodeSlug: string, currentServerName: string) => {
    try {
      const res = await fetch(`/api/interactions/next-episode?movieSlug=${movieSlug}&episodeSlug=${currentEpisodeSlug}&serverName=${encodeURIComponent(currentServerName)}`);
      const data = await res.json();
      if (data.hasNext && data.nextEpisode) {
        setNextEpisode(data.nextEpisode);
      } else {
        setNextEpisode(null);
      }
    } catch {
      setNextEpisode(null);
    }
  }, [movieSlug]);

  // Fetch movie data from DB
  useEffect(() => {
    let cancelled = false;
    const frame = window.requestAnimationFrame(() => {
      if (!movieSlug) {
        setLoading(false);
        setError("Không có slug phim.");
        return;
      }

      setLoading(true);
      fetch(`/api/movies?slug=${encodeURIComponent(movieSlug)}&withEpisodes=true`)
        .then((r) => r.json())
        .then(async (data) => {
          if (cancelled) return;
          if (!data.movie) {
            setError("Không tìm thấy phim.");
            return;
          }

          const eps: EpisodeItem[] = data.movie.episodes || [];
          const profileId = getPlaybackProfileId();
          let historyRow: HistoryRow | null = null;

          if (profileId) {
            const historyRes = await fetch(`/api/interactions?profileId=${encodeURIComponent(profileId)}`).catch(() => null);
            const historyData = historyRes ? await historyRes.json().catch(() => null) : null;
            historyRow = historyData?.history?.find((row: HistoryRow) => row.movieSlug === movieSlug) || null;
          }

          let nextIndex = 0;
          const requestedIndex = requestedEpisode ? eps.findIndex((episode) => episode.slug === requestedEpisode) : -1;
          const historyIndex = historyRow?.episodeSlug ? eps.findIndex((episode) => episode.slug === historyRow?.episodeSlug) : -1;

          if (requestedIndex >= 0) nextIndex = requestedIndex;
          else if (historyIndex >= 0) nextIndex = historyIndex;

          setMovieData(data.movie);
          setEpisodes(eps);
          setEpisodeIndex(nextIndex);

          const savedProgress = historyRow?.progress || 0;
          const savedDuration = historyRow?.duration || 0;
          setResumeProgress(savedProgress > 30 && (!savedDuration || savedProgress < savedDuration * 0.9) ? savedProgress : null);
        })
        .catch(() => {
          if (!cancelled) setError("Lỗi khi tải dữ liệu phim.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [movieSlug, requestedEpisode]);

  const activeEpisode = episodes[episodeIndex] || null;
  const title = movieData ? `${movieData.name}${activeEpisode ? ` - Tập ${activeEpisode.name}` : ""}` : "Đang tải...";
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Save watch progress
  const saveProgress = useCallback(() => {
    if (!movieSlug || !videoRef.current) return;
    const profileId = getPlaybackProfileId();
    if (!profileId) return;
    const video = videoRef.current;
    if (video.currentTime < 5) return;
    fetch("/api/interactions/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileId,
        movieSlug,
        episodeSlug: activeEpisode?.slug || null,
        serverName: activeEpisode?.serverName || null,
        progress: Math.floor(video.currentTime),
        duration: Math.floor(video.duration || 0),
      }),
    }).catch(() => {});
  }, [movieSlug, activeEpisode]);

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

  // Load HLS source
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeEpisode) return;

    const source = activeEpisode.m3u8Url;
    if (!source) {
      if (activeEpisode.embedUrl) {
        setPlaybackMode('embed');
      } else {
        setError("Tập này chưa có link phát.");
      }
      return;
    }

    setPlaybackMode('hls');

    const frame = window.requestAnimationFrame(() => {
      setError("");
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
      setShowControls(true);
    });
    video.pause();
    video.removeAttribute("src");
    video.load();

    let hls: Hls | null = null;
    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        maxBufferLength: 90,
        maxMaxBufferLength: 90,
        backBufferLength: 30,
      });
      hls.loadSource(source);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          if (activeEpisode.embedUrl) {
            setPlaybackMode('embed');
          } else {
            setError("Không thể tải luồng HLS này. Thử tập khác hoặc server khác.");
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = source;
    } else {
      setError("Trình duyệt này không hỗ trợ HLS.");
    }

    return () => {
      window.cancelAnimationFrame(frame);
      hls?.destroy();
    };
  }, [activeEpisode]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = muted;
    video.playbackRate = speed;

    const onPlay = () => { setIsPlaying(true); revealControls(); };
    const onPause = () => { setIsPlaying(false); revealControls(); saveProgress(); };
    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      // Check if near end (>90% progress or last 30 seconds) and has next episode
      if (activeEpisode && video.duration > 0) {
        const remaining = video.duration - video.currentTime;
        if ((remaining <= 30 || video.currentTime / video.duration >= 0.9) && !showNextOverlay && !nextEpisode) {
          fetchNextEpisode(activeEpisode.slug, activeEpisode.serverName);
        }
      }
    };
    const onLoadedMetadata = () => {
      setDuration(video.duration || 0);
      if (resumeProgress) {
        video.currentTime = resumeProgress;
        setResumeProgress(null);
      }
    };
    const onDurationChange = () => setDuration(video.duration || 0);
    const onEnded = () => {
      if (nextEpisode) {
        const nextSlug = nextEpisode.slug;
        setEpisodeIndex((prev) => {
          const newIndex = episodes.findIndex((ep) => ep.slug === nextSlug);
          return newIndex >= 0 ? newIndex : prev;
        });
        setShowNextOverlay(false);
        setNextEpisode(null);
        setNextCountdown(10);
      }
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("ended", onEnded);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("ended", onEnded);
    };
  }, [muted, speed, volume, saveProgress, resumeProgress, activeEpisode, fetchNextEpisode, showNextOverlay, nextEpisode, episodes]);

  // Periodic progress save every 10 seconds
  useEffect(() => {
    progressSaveTimer.current = window.setInterval(() => { if (isPlaying) saveProgress(); }, 10_000);
    return () => { if (progressSaveTimer.current) window.clearInterval(progressSaveTimer.current); };
  }, [isPlaying, saveProgress]);

  // Save on page unload
  useEffect(() => {
    const onUnload = () => saveProgress();
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [saveProgress]);

  useEffect(() => {
    hideControlsTimer.current = window.setTimeout(() => setShowControls(false), 3000);
    return () => { if (hideControlsTimer.current) window.clearTimeout(hideControlsTimer.current); };
  }, []);

  // Show next episode overlay and start countdown when nextEpisode is set
  useEffect(() => {
    if (!nextEpisode) return;
    const timer = window.setTimeout(() => setShowNextOverlay(true), 3000);
    return () => window.clearTimeout(timer);
  }, [nextEpisode]);

  // Countdown for auto-play
  useEffect(() => {
    if (!showNextOverlay || !nextEpisode) return;
    if (nextCountdown <= 0) {
      setEpisodeIndex(episodes.findIndex((ep) => ep.slug === nextEpisode.slug));
      setShowNextOverlay(false);
      setNextEpisode(null);
      setNextCountdown(10);
      return;
    }
    nextCountdownRef.current = window.setTimeout(() => {
      setNextCountdown((v) => v - 1);
    }, 1000);
    return () => { if (nextCountdownRef.current) window.clearTimeout(nextCountdownRef.current); };
  }, [showNextOverlay, nextEpisode, nextCountdown, episodes]);

  if (loading) {
    return (
      <main className="fixed inset-0 grid place-items-center bg-black text-white">
        <div className="text-lg">Đang tải phim...</div>
      </main>
    );
  }

  if (!activeEpisode || episodes.length === 0) {
    return (
      <main className="fixed inset-0 grid place-items-center bg-black text-white">
        <div className="max-w-md text-center">
          <div className="mb-4 text-lg">{error || "Phim này chưa có tập nào."}</div>
          <button onClick={() => history.back()} className="rounded bg-white/20 px-6 py-2 hover:bg-white/30">Quay lại</button>
        </div>
      </main>
    );
  }

  const serverName = activeEpisode.serverName || "Server";

  return (
    <main
      ref={shellRef}
      className={`fixed inset-0 h-screen w-screen overflow-hidden bg-black text-white ${playbackMode === 'embed' ? "cursor-default" : showControls ? "cursor-default" : "cursor-none"}`}
      onMouseMove={playbackMode === 'embed' ? undefined : revealControls}
    >
      {playbackMode === 'embed' && activeEpisode?.embedUrl ? (
        <iframe src={embedAutoplayUrl(activeEpisode.embedUrl)} className="h-full w-full" allowFullScreen allow="autoplay; fullscreen; encrypted-media" />
      ) : (
        <video ref={videoRef} className="h-full w-full bg-black object-contain" playsInline onClick={togglePlay} />
      )}

      {playbackMode !== 'embed' ? (
        <div className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}>
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/90 via-black/35 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/95 via-black/55 to-transparent" />
        </div>
      ) : null}

      <header className={`absolute inset-x-0 top-0 flex h-24 items-center justify-between px-8 transition-opacity duration-300 ${playbackMode === 'embed' ? "opacity-100" : showControls ? "opacity-100" : "opacity-0"}`}>
        <button className="grid size-12 place-items-center rounded-full text-white transition hover:bg-white/10" type="button" aria-label="Quay lại" onClick={() => { saveProgress(); history.back(); }}>
          <Icon name="back" />
        </button>
        {playbackMode === 'embed' ? (
          <div className="relative">
            <button type="button" aria-label="Danh sách tập" onClick={() => setShowEpisodes((v) => !v)} className="flex h-11 items-center gap-2 rounded-full px-3 transition hover:bg-white/10">
              <Icon name="episodes" />
              <span className="text-[14px]">Tập phim</span>
            </button>
            {showEpisodes ? (
              <div className="absolute right-0 top-14 w-72 overflow-hidden rounded bg-[#181818]/95 py-3 shadow-[0_8px_30px_rgba(0,0,0,.45)] z-50">
                <div className="px-4 pb-2 text-[13px] text-[#b3b3b3]">{serverName}</div>
                {episodes.map((episode, index) => (
                  <button
                    key={episode.id}
                    type="button"
                    onClick={() => { setEpisodeIndex(index); setShowEpisodes(false); }}
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-white/10"
                  >
                    <span>Tập {episode.name}</span>
                    {episodeIndex === index ? <Icon name="check" className="h-4 w-4 text-[#46d369]" /> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <h1 className={`pointer-events-none absolute left-1/2 max-w-[60vw] -translate-x-1/2 truncate text-center text-[22px] font-medium transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}>
              {title}
            </h1>
            <button className="grid size-12 place-items-center rounded-full text-white transition hover:bg-white/10" type="button" aria-label="Báo cáo lỗi">
              <Icon name="flag" />
            </button>
          </>
        )}
      </header>

      {error ? (
        <div className="absolute left-1/2 top-1/2 max-w-xl -translate-x-1/2 -translate-y-1/2 rounded bg-black/80 px-6 py-4 text-center text-[16px] text-[#e5e5e5]">
          {error}
        </div>
      ) : null}

      {!isPlaying && playbackMode !== 'embed' ? (
        <button type="button" aria-label="Phát video" onClick={togglePlay} className="absolute left-1/2 top-1/2 grid size-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition hover:scale-105 hover:bg-white/25">
          <Icon name="play" className="ml-1 h-12 w-12" />
        </button>
      ) : null}

      {playbackMode !== 'embed' ? (
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
                onClick={() => { const next = !muted; setMuted(next); if (videoRef.current) videoRef.current.muted = next; }}
                className="grid size-11 place-items-center rounded-full transition hover:bg-white/10"
              >
                <Icon name={muted || volume === 0 ? "muted" : "volume"} />
              </button>
              <input aria-label="Âm lượng" type="range" min="0" max="1" step="0.01" value={muted ? 0 : volume} onChange={(event) => updateVolume(Number(event.target.value))} className="h-1 w-28 accent-[#e50914]" />
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
                  <div className="px-4 pb-2 text-[13px] text-[#b3b3b3]">{serverName}</div>
                  {episodes.map((episode, index) => (
                    <button
                      key={episode.id}
                      type="button"
                      onClick={() => { setEpisodeIndex(index); setShowEpisodes(false); }}
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
      ) : null}

      {nextEpisode && showNextOverlay && playbackMode !== 'embed' ? (
        <div className="absolute bottom-28 right-8 z-40 w-72 rounded-lg bg-[#181818]/95 p-4 shadow-[0_8px_30px_rgba(0,0,0,.45)] backdrop-blur">
          <p className="text-[13px] text-[#b3b3b3]">Tiếp theo</p>
          <p className="mt-1 text-[15px] font-medium text-white">Tập {nextEpisode.name}</p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEpisodeIndex(episodes.findIndex((ep) => ep.slug === nextEpisode.slug));
                setShowNextOverlay(false);
                setNextEpisode(null);
                setNextCountdown(10);
              }}
              className="cursor-pointer rounded bg-white px-4 py-1.5 text-[13px] font-bold text-black transition hover:bg-[#c2c2c2]"
            >
              Xem tập tiếp
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNextOverlay(false);
                setNextEpisode(null);
                setNextCountdown(10);
              }}
              className="cursor-pointer rounded bg-white/10 px-4 py-1.5 text-[13px] text-white transition hover:bg-white/20"
            >
              Bỏ qua
            </button>
          </div>
          <div className="mt-2 h-0.5 w-full rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-[#e50914] transition-all duration-1000"
              style={{ width: `${(nextCountdown / 10) * 100}%` }}
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default function WatchPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  return (
    <Suspense fallback={<main className="fixed inset-0 grid place-items-center bg-black text-white"><div>Đang tải...</div></main>}>
      <WatchPlayer movieSlug={slug} />
    </Suspense>
  );
}
