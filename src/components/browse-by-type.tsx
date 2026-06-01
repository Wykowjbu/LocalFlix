"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TopNav from "@/components/top-nav";
import MiniPreviewModal from "@/components/mini-preview-modal";
import DetailModal from "@/components/detail-modal";
import MovieRow from "@/components/movie-row";
import HeroBillboard from "@/components/hero-billboard";
import { getStoredProfiles, getStoredSession, getStoredActiveProfileId, saveStoredActiveProfileId, ACTIVE_PROFILE_STORAGE_KEY, SESSION_STORAGE_KEY } from "@/lib/session";
import { mapDbMovie, type DbMovie } from "@/lib/movie-format";
import { profiles, type Movie, type Profile } from "@/data/netflix";
import type { PreviewState } from "@/components/mini-preview-modal";
import LoadMoreButton from "@/components/load-more-button";

export default function BrowseByType({
  title,
  apiParams,
}: {
  title: string;
  apiParams: string;
}) {
  const router = useRouter();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [allMovies, setAllMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [detailMovie, setDetailMovie] = useState<Movie | null>(null);
  const [closing, setClosing] = useState(false);
  const [favoriteSlugs, setFavoriteSlugs] = useState<Set<string>>(new Set());
  const [likedSlugs, setLikedSlugs] = useState<Set<string>>(new Set());
  const [dislikedSlugs, setDislikedSlugs] = useState<Set<string>>(new Set());
  const previewOpenTimer = useRef<number | null>(null);
  const previewHideTimer = useRef<number | null>(null);
  const previewRemoveTimer = useRef<number | null>(null);
  const currentActivePopup = useRef<string | null>(null);

  useEffect(() => {
    const session = getStoredSession();
    if (!session) { router.replace("/login"); return; }
    const storedActiveProfileId = getStoredActiveProfileId();
    const profile = session.profiles.find((p: Profile) => p.id === storedActiveProfileId) || session.profiles[0] || profiles[0];
    setActiveProfile(profile);
  }, [router]);

  const loadInteractions = useCallback(async (profileId: string) => {
    try {
      const res = await fetch(`/api/interactions?profileId=${profileId}`);
      const data = await res.json();
      if (data.favoriteSlugs) setFavoriteSlugs(new Set(data.favoriteSlugs));
      if (data.likedSlugs) setLikedSlugs(new Set(data.likedSlugs));
      if (data.dislikedSlugs) setDislikedSlugs(new Set(data.dislikedSlugs));
    } catch {}
  }, []);

  useEffect(() => {
    if (!activeProfile) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/movies?${apiParams}&limit=50&page=1`).then((res) => res.json()),
      loadInteractions(activeProfile.id),
    ])
      .then(([data]) => {
        const m = data.movies ? (data.movies as DbMovie[]).map(mapDbMovie) : [];
        setAllMovies(m);
        setMovies(m.slice(0, 20));
        setHasMore(data.hasMore ?? false);
        setPage(1);
      })
      .catch(() => { setAllMovies([]); setMovies([]); setHasMore(false); })
      .finally(() => setLoading(false));
  }, [activeProfile, apiParams, loadInteractions]);

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
      await fetch('/api/interactions/favorites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profileId: activeProfile!.id, movieSlug: slug, enabled: !isCurrentlyFav }) });
    } catch {
      setFavoriteSlugs((prev) => {
        const next = new Set(prev);
        if (isCurrentlyFav) next.add(slug);
        else next.delete(slug);
        return next;
      });
    }
  }, [activeProfile, favoriteSlugs]);

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
      await fetch('/api/interactions/reactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profileId: activeProfile!.id, movieSlug: slug, value: isCurrentlyLiked ? null : 'like' }) });
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
  }, [activeProfile, dislikedSlugs, likedSlugs]);

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
      await fetch('/api/interactions/reactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profileId: activeProfile!.id, movieSlug: slug, value: isCurrentlyDisliked ? null : 'dislike' }) });
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
  }, [activeProfile, dislikedSlugs, likedSlugs]);

  const handleExpand = useCallback((movie: Movie) => {
    setPreview(null);
    setDetailMovie(movie);
  }, []);

  const handleCloseDetail = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => {
      setDetailMovie(null);
      setClosing(false);
    }, 200);
  }, [closing]);

  const loadMore = useCallback(async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/movies?${apiParams}&limit=50&page=${nextPage}`);
      if (!res.ok) return;
      const data = await res.json();
      const m = data.movies ? (data.movies as DbMovie[]).map(mapDbMovie) : [];
      setMovies((prev) => [...prev, ...m]);
      setAllMovies((prev) => [...prev, ...m]);
      setPage(nextPage);
      setHasMore(data.hasMore ?? false);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  }, [page, apiParams]);

  const handlePlay = useCallback((movie: Movie) => {
    router.push(`/watch/${movie.id}`);
  }, [router]);

  const handlePlaySlug = useCallback((slug: string, episodeSlug?: string) => {
    router.push(`/watch/${slug}${episodeSlug ? `?episode=${episodeSlug}` : ''}`);
  }, [router]);

  const handleLogout = useCallback(() => {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    window.localStorage.removeItem(ACTIVE_PROFILE_STORAGE_KEY);
    window.localStorage.removeItem("localflix.profiles");
    router.replace("/login");
  }, [router]);

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

  if (!activeProfile) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#141414]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </main>
    );
  }

  const heroMovie = allMovies.length > 0 ? allMovies[0] : null;
  const accountProfiles = getStoredProfiles();
  const interactionProps = { favoriteSlugs, likedSlugs, dislikedSlugs, onToggleFavorite: handleToggleFavorite, onToggleLike: handleToggleLike, onToggleDislike: handleToggleDislike, onPlay: handlePlay };

  return (
    <main className="min-h-screen bg-[#141414] pb-16 text-white">
      <TopNav
        activeProfile={activeProfile}
        accountProfiles={accountProfiles}
        onProfileChange={(p) => { saveStoredActiveProfileId(p.id); setActiveProfile(p); }}
        onLogout={handleLogout}
        onSeed={() => {}}
        onSeedForce={() => {}}
        seeding={false}
        seedResult={null}
      />
      <HeroBillboard heroMovie={heroMovie} onPlay={handlePlaySlug} onInfo={(m) => { setPreview(null); setDetailMovie(m); }} />
      <div className="-mt-[7vw] space-y-[1vw]">
        {loading ? (
          <div className="px-[4%] py-8">
            <div className="mb-4 h-6 w-48 animate-pulse rounded bg-[#232323]" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {Array.from({ length: 12 }, (_, i) => (
                <div key={i} className="aspect-video animate-pulse rounded-sm bg-[#232323]" />
              ))}
            </div>
          </div>
        ) : movies.length > 0 ? (
          <MovieRow title={title} movies={movies} onExpand={handleExpand} onPreview={openPreview} onPreviewEnd={closePreview} {...interactionProps} />
        ) : (
          <div className="px-[4%] py-8 text-[16px] text-[#b3b3b3]">
            Không tìm thấy phim nào.
          </div>
        )}
        {!loading ? (
          <div className="px-[4%]">
            <LoadMoreButton loading={loadingMore} hasMore={hasMore} onClick={loadMore} />
          </div>
        ) : null}
      </div>
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
