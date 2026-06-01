"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { movieRows, type Movie, type Profile } from "@/data/netflix";
import { ACTIVE_PROFILE_STORAGE_KEY, getStoredProfiles, getStoredSession, SESSION_STORAGE_KEY } from "@/lib/session";
import { mapDbMovie, type DbMovie } from "@/lib/movie-format";
import TopNav from "./top-nav";
import SearchResultsGrid from "./search-results-grid";
import HeroBillboard from "./hero-billboard";
import MovieRow from "./movie-row";
import MiniPreviewModal from "./mini-preview-modal";
import DetailModal from "./detail-modal";
import { saveStoredActiveProfileId } from "@/lib/session";
import type { PreviewState } from "./mini-preview-modal";

type HomeRowData = {
  id: string;
  title: string;
  variant?: 'top10' | 'standard';
  movies: Movie[];
};

export default function Browse({ activeProfile, onProfileChange }: { activeProfile: Profile; onProfileChange: (profile: Profile) => void }) {
  const router = useRouter();
  const [accountProfiles] = useState(getStoredProfiles);
  const [detailMovie, setDetailMovie] = useState<Movie | null>(null);
  const [closing, setClosing] = useState(false);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);
  const [isHomeLoading, setIsHomeLoading] = useState(true);
  const [homeRows, setHomeRows] = useState<HomeRowData[]>([]);
  const [favoriteSlugs, setFavoriteSlugs] = useState<Set<string>>(new Set());
  const [likedSlugs, setLikedSlugs] = useState<Set<string>>(new Set());
  const [dislikedSlugs, setDislikedSlugs] = useState<Set<string>>(new Set());
  const previewOpenTimer = useRef<number | null>(null);
  const previewHideTimer = useRef<number | null>(null);
  const previewRemoveTimer = useRef<number | null>(null);
  const currentActivePopup = useRef<string | null>(null);

  const loadInteractions = useCallback(async (profileId: string) => {
    try {
      const res = await fetch(`/api/interactions?profileId=${profileId}`);
      const data = await res.json();
      if (data.favoriteSlugs) setFavoriteSlugs(new Set(data.favoriteSlugs));
      if (data.likedSlugs) setLikedSlugs(new Set(data.likedSlugs));
      if (data.dislikedSlugs) setDislikedSlugs(new Set(data.dislikedSlugs));
    } catch {}
  }, []);

  const loadHomeRows = useCallback(async (profileId: string) => {
    setIsHomeLoading(true);
    try {
      const res = await fetch(`/api/home-rows?profileId=${profileId}`);
      const data = await res.json();
      if (data.rows) {
        const mapped: HomeRowData[] = data.rows.map((row: { id: string; title: string; variant?: string; movies: Record<string, unknown>[] }) => ({
          id: row.id,
          title: row.title,
          variant: row.variant as 'top10' | 'standard' | undefined,
          movies: row.movies.map((m) => mapDbMovie(m as DbMovie)),
        }));
        setHomeRows(mapped);
      }
    } catch (err) {
      console.error('Lỗi khi tải home rows:', err);
    } finally {
      setIsHomeLoading(false);
    }
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      loadInteractions(activeProfile.id);
      loadHomeRows(activeProfile.id);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeProfile.id, loadInteractions, loadHomeRows]);

  const handleToggleFavorite = useCallback(async (movie: Movie) => {
    const slug = movie.id;
    const isCurrentlyFav = favoriteSlugs.has(slug);
    setFavoriteSlugs((prev) => {
      const next = new Set(prev);
      if (isCurrentlyFav) next.delete(slug);
      else next.add(slug);
      return next;
    });
    try {
      await fetch('/api/interactions/favorites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profileId: activeProfile.id, movieSlug: slug, enabled: !isCurrentlyFav }) });
    } catch {
      setFavoriteSlugs((prev) => {
        const next = new Set(prev);
        if (isCurrentlyFav) next.add(slug);
        else next.delete(slug);
        return next;
      });
    }
  }, [activeProfile.id, favoriteSlugs]);

  const handleToggleLike = useCallback(async (movie: Movie) => {
    const slug = movie.id;
    const isCurrentlyLiked = likedSlugs.has(slug);
    const wasDisliked = dislikedSlugs.has(slug);
    setLikedSlugs((prev) => {
      const next = new Set(prev);
      if (isCurrentlyLiked) next.delete(slug);
      else next.add(slug);
      return next;
    });
    if (!isCurrentlyLiked) {
      setDislikedSlugs((prev) => {
        const next = new Set(prev);
        next.delete(slug);
        return next;
      });
    }
    try {
      await fetch('/api/interactions/reactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profileId: activeProfile.id, movieSlug: slug, value: isCurrentlyLiked ? null : 'like' }) });
    } catch {
      setLikedSlugs((prev) => {
        const next = new Set(prev);
        if (isCurrentlyLiked) next.add(slug);
        else next.delete(slug);
        return next;
      });
      if (wasDisliked) {
        setDislikedSlugs((prev) => {
          const next = new Set(prev);
          next.add(slug);
          return next;
        });
      }
    }
  }, [activeProfile.id, dislikedSlugs, likedSlugs]);

  const handleToggleDislike = useCallback(async (movie: Movie) => {
    const slug = movie.id;
    const isCurrentlyDisliked = dislikedSlugs.has(slug);
    const wasLiked = likedSlugs.has(slug);
    setDislikedSlugs((prev) => {
      const next = new Set(prev);
      if (isCurrentlyDisliked) next.delete(slug);
      else next.add(slug);
      return next;
    });
    if (!isCurrentlyDisliked) {
      setLikedSlugs((prev) => {
        const next = new Set(prev);
        next.delete(slug);
        return next;
      });
    }
    try {
      await fetch('/api/interactions/reactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profileId: activeProfile.id, movieSlug: slug, value: isCurrentlyDisliked ? null : 'dislike' }) });
    } catch {
      setDislikedSlugs((prev) => {
        const next = new Set(prev);
        if (isCurrentlyDisliked) next.add(slug);
        else next.delete(slug);
        return next;
      });
      if (wasLiked) {
        setLikedSlugs((prev) => {
          const next = new Set(prev);
          next.add(slug);
          return next;
        });
      }
    }
  }, [activeProfile.id, dislikedSlugs, likedSlugs]);

  const handlePlay = useCallback((movie: Movie) => {
    router.push(`/watch/${movie.id}`);
  }, [router]);

  const handlePlaySlug = useCallback((slug: string, episodeSlug?: string) => {
    router.push(`/watch/${slug}${episodeSlug ? `?episode=${episodeSlug}` : ''}`);
  }, [router]);

  const handleProfileChange = useCallback((profile: Profile) => {
    saveStoredActiveProfileId(profile.id);
    onProfileChange(profile);
  }, [onProfileChange]);

  const handleLogout = useCallback(() => {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    window.localStorage.removeItem(ACTIVE_PROFILE_STORAGE_KEY);
    window.localStorage.removeItem("localflix.profiles");
    router.replace("/login");
  }, [router]);

  const handleSeed = async () => {
    setSeeding(true); setSeedResult(null);
    try {
      const res = await fetch('/api/seed', { method: 'POST' }); const data = await res.json();
      if (!res.ok) { setSeedResult('Lỗi: ' + (data.error || `HTTP ${res.status}`)); return; }
      if (data.success) {
        setSeedResult(`Đã sync: ${data.addedMovies} mới, ${data.updatedMovies} cập nhật, ${data.episodesCreated} tập mới${data.errorCount ? `, ${data.errorCount} lỗi đã skip` : ''}`);
        loadHomeRows(activeProfile.id);
      } else { setSeedResult('Lỗi: ' + (data.error || 'Không xác định')); }
    } catch { setSeedResult('Lỗi kết nối'); }
    finally { setSeeding(false); setTimeout(() => setSeedResult(null), 5000); }
  };

  const handleSeedForce = async () => {
    setSeeding(true); setSeedResult(null);
    try {
      const res = await fetch('/api/seed?force=true', { method: 'POST' }); const data = await res.json();
      if (!res.ok) { setSeedResult('Lỗi: ' + (data.error || `HTTP ${res.status}`)); return; }
      if (data.success) {
        setSeedResult(`Full sync: ${data.addedMovies} mới, ${data.updatedMovies} cập nhật, ${data.pagesSynced} pages${data.errorCount ? `, ${data.errorCount} lỗi đã skip` : ''}`);
        loadHomeRows(activeProfile.id);
      } else { setSeedResult('Lỗi: ' + (data.error || 'Không xác định')); }
    } catch { setSeedResult('Lỗi kết nối'); }
    finally { setSeeding(false); setTimeout(() => setSeedResult(null), 10000); }
  };

  const keepPreviewOpen = () => { if (previewHideTimer.current) window.clearTimeout(previewHideTimer.current); if (previewRemoveTimer.current) window.clearTimeout(previewRemoveTimer.current); };
  const fadePreviewOut = (removeDelay = 300) => { if (previewOpenTimer.current) window.clearTimeout(previewOpenTimer.current); if (previewHideTimer.current) window.clearTimeout(previewHideTimer.current); if (previewRemoveTimer.current) window.clearTimeout(previewRemoveTimer.current); currentActivePopup.current = null; setPreview((v) => (v ? { ...v, active: false } : v)); previewRemoveTimer.current = window.setTimeout(() => setPreview(null), removeDelay); };
  const closePreview = () => { if (previewOpenTimer.current) window.clearTimeout(previewOpenTimer.current); if (previewHideTimer.current) window.clearTimeout(previewHideTimer.current); previewHideTimer.current = window.setTimeout(() => fadePreviewOut(), 300); };
  const closePreviewNow = () => { fadePreviewOut(); };
  const openPreview = (movie: Movie, rect: DOMRect) => {
    if (previewOpenTimer.current) window.clearTimeout(previewOpenTimer.current); if (previewHideTimer.current) window.clearTimeout(previewHideTimer.current); if (previewRemoveTimer.current) window.clearTimeout(previewRemoveTimer.current);
    if (currentActivePopup.current && currentActivePopup.current !== movie.id) { setPreview((v) => (v ? { ...v, active: false } : v)); currentActivePopup.current = null; }
    const width = Math.min(Math.max(window.innerWidth * 0.34, 360), 433, window.innerWidth - 32); const height = width * 0.5625 + 148;
    const centeredLeft = rect.left + window.scrollX + rect.width / 2 - width / 2;
    const left = Math.min(Math.max(window.scrollX + 16, centeredLeft), window.scrollX + window.innerWidth - width - 16);
    const preferredTop = rect.top + window.scrollY - 52;
    const top = Math.min(Math.max(window.scrollY + 76, preferredTop), Math.max(window.scrollY + 76, window.scrollY + window.innerHeight - height - 16));
    previewOpenTimer.current = window.setTimeout(() => { currentActivePopup.current = movie.id; setPreview({ movie, top, left, width, active: true }); }, 450);
  };

  useEffect(() => { return () => { if (previewOpenTimer.current) window.clearTimeout(previewOpenTimer.current); if (previewHideTimer.current) window.clearTimeout(previewHideTimer.current); if (previewRemoveTimer.current) window.clearTimeout(previewRemoveTimer.current); }; }, []);

  const heroMovie = homeRows.length > 0 ? (homeRows[0].movies[0] ?? null) : null;
  const interactionProps = { favoriteSlugs, likedSlugs, dislikedSlugs, onToggleFavorite: handleToggleFavorite, onToggleLike: handleToggleLike, onToggleDislike: handleToggleDislike, onPlay: handlePlay };
  const expandHandler = (movie: Movie) => {
    setPreview(null);
    setDetailMovie(movie);
  };

  const handleCloseDetail = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => {
      setDetailMovie(null);
      setClosing(false);
    }, 200);
  }, [closing]);

  return (
    <main className="min-h-screen bg-[#141414] pb-16 text-white">
      <TopNav activeProfile={activeProfile} accountProfiles={accountProfiles} onProfileChange={handleProfileChange} onLogout={handleLogout} onSeed={handleSeed} onSeedForce={handleSeedForce} seeding={seeding} seedResult={seedResult} />
      <>
        <HeroBillboard heroMovie={heroMovie} onPlay={handlePlaySlug} onInfo={(m) => { setPreview(null); setDetailMovie(m); }} />
        <div className="-mt-[7vw] space-y-[1vw]">
          {homeRows.length > 0 ? (
            homeRows.map((row) => {
              if (row.movies.length === 0) return null;
              return (
                <MovieRow
                  key={row.id}
                  title={row.title}
                  movies={row.movies}
                  onExpand={expandHandler}
                  onPreview={openPreview}
                  onPreviewEnd={closePreview}
                  variant={row.variant || 'standard'}
                  {...interactionProps}
                />
              );
            })
          ) : isHomeLoading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
          ) : (
            movieRows.map((row) => <MovieRow key={row.id} title={row.title} movies={row.movies} onExpand={expandHandler} onPreview={openPreview} onPreviewEnd={closePreview} />)
          )}
        </div>
      </>
      {preview ? (
        <MiniPreviewModal preview={preview} onKeepOpen={keepPreviewOpen} onPreviewEnd={closePreviewNow} onExpand={(movie) => { closePreviewNow(); setDetailMovie(movie); }} {...interactionProps} />
      ) : null}
      {detailMovie ? (
        <DetailModal
          movie={detailMovie}
          closing={closing}
          onClose={handleCloseDetail}
          onSearch={(keyword) => { router.push(`/search?q=${encodeURIComponent(keyword)}`); }}
          onPlay={handlePlaySlug}
          isFavorite={favoriteSlugs.has(detailMovie.id)}
          isLiked={likedSlugs.has(detailMovie.id)}
          isDisliked={dislikedSlugs.has(detailMovie.id)}
          onToggleFavorite={() => handleToggleFavorite(detailMovie)}
          onToggleLike={() => handleToggleLike(detailMovie)}
          onToggleDislike={() => handleToggleDislike(detailMovie)}
        />
      ) : null}
    </main>
  );
}

function SkeletonRow() {
  return (
    <section className="slider-row group/row relative py-[1.6vw]">
      <div className="mb-2 px-[4%]">
        <div className="h-[clamp(18px,1.4vw,24px)] w-48 animate-pulse rounded bg-[#2a2a2a]" />
      </div>
      <div className="relative overflow-x-clip overflow-y-visible py-12 -my-12">
        <div className="flex gap-2 px-[4%]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-video basis-[48%] sm:basis-[31%] md:basis-[23.5%] lg:basis-[18.9%] xl:basis-[15.8%] animate-pulse rounded-sm bg-[#2a2a2a]" />
          ))}
        </div>
      </div>
    </section>
  );
}
