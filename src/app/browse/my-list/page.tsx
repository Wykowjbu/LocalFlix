"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredSession, getStoredActiveProfileId } from "@/lib/session";
import { mapDbMovie, type DbMovie } from "@/lib/movie-format";
import { profiles, type Movie, type Profile } from "@/data/netflix";
import MovieRow from "@/components/movie-row";

function MyListContent() {
  const router = useRouter();
  const [movies, setMovies] = useState<Movie[]>([]);

  useEffect(() => {
    const session = getStoredSession();
    if (!session) { router.replace("/login"); return; }
    const storedActiveProfileId = getStoredActiveProfileId();
    const profile = session.profiles.find((p: Profile) => p.id === storedActiveProfileId) || session.profiles[0];
    if (!profile) return;

    fetch(`/api/movies?favoritesProfileId=${profile.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.movies) setMovies((data.movies as DbMovie[]).map(mapDbMovie));
      })
      .catch(() => {});
  }, [router]);

  return (
    <main className="min-h-screen bg-[#141414] pt-[120px] text-white">
      <div className="px-[4%]">
        <h1 className="text-[clamp(22px,2.2vw,32px)] font-medium mb-8">Danh sách của tôi</h1>
        {movies.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {movies.map((movie) => (
              <div key={movie.id} className="basis-[48%] sm:basis-[31%] md:basis-[23.5%] lg:basis-[18.9%] xl:basis-[15.8%]">
                <div className="relative aspect-video overflow-hidden rounded-sm bg-[#181818]">
                  <img src={movie.image} alt={movie.title} className="h-full w-full object-cover" />
                </div>
                <p className="mt-2 truncate text-[14px] font-bold text-white">{movie.title}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[16px] text-[#b3b3b3]">Danh sách của bạn đang trống.</p>
        )}
      </div>
    </main>
  );
}

export default function MyListPage() {
  return (
    <Suspense fallback={
      <main className="grid min-h-screen place-items-center bg-[#141414]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </main>
    }>
      <MyListContent />
    </Suspense>
  );
}
