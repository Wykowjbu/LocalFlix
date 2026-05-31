"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SearchResultsGrid from "@/components/search-results-grid";
import TopNav from "@/components/top-nav";
import { getStoredProfiles, getStoredSession, getStoredActiveProfileId, saveStoredActiveProfileId, ACTIVE_PROFILE_STORAGE_KEY, SESSION_STORAGE_KEY } from "@/lib/session";
import { mapDbMovie, type DbMovie } from "@/lib/movie-format";
import { profiles, type Movie, type Profile } from "@/data/netflix";

export default function SearchClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [movies, setMovies] = useState<Movie[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const session = getStoredSession();
    if (!session) { router.replace("/login"); return; }
    const storedActiveProfileId = getStoredActiveProfileId();
    const profile = session.profiles.find((p: Profile) => p.id === storedActiveProfileId) || session.profiles[0] || profiles[0];
    setActiveProfile(profile);
  }, [router]);

  useEffect(() => {
    if (!query) { setMovies([]); return; }
    setSearching(true);
    fetch(`/api/movies?q=${encodeURIComponent(query)}&limit=60`)
      .then((res) => res.json())
      .then((data) => {
        setMovies(data.movies ? (data.movies as DbMovie[]).map(mapDbMovie) : []);
      })
      .catch(() => setMovies([]))
      .finally(() => setSearching(false));
  }, [query]);

  const handleExpand = useCallback((movie: Movie) => {
    router.push(`/browse?jbv=${movie.id}`);
  }, [router]);

  const handlePlay = useCallback((movie: Movie) => {
    router.push(`/watch/${movie.id}`);
  }, [router]);

  const handleLogout = useCallback(() => {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    window.localStorage.removeItem(ACTIVE_PROFILE_STORAGE_KEY);
    window.localStorage.removeItem("localflix.profiles");
    router.replace("/login");
  }, [router]);

  if (!activeProfile) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#141414]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </main>
    );
  }

  const accountProfiles = getStoredProfiles();

  return (
    <main className="min-h-screen bg-[#141414] text-white">
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
      {query ? (
        <SearchResultsGrid
          query={query}
          movies={movies}
          searching={searching}
          onExpand={handleExpand}
          onPreview={() => {}}
          onPreviewEnd={() => {}}
          onPlay={handlePlay}
        />
      ) : (
        <section className="min-h-screen px-[4%] pt-[120px]">
          <div className="max-w-2xl text-[16px] leading-7 text-[#b3b3b3]">
            Nhập từ khóa để tìm kiếm phim, diễn viên, thể loại...
          </div>
        </section>
      )}
    </main>
  );
}
