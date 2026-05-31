"use client";

import MovieCard from "./movie-card";
import type { Movie } from "@/data/netflix";

export default function SearchResultsGrid({
  query,
  movies,
  searching,
  onExpand,
  onPreview,
  onPreviewEnd,
  favoriteSlugs,
  likedSlugs,
  dislikedSlugs,
  onToggleFavorite,
  onToggleLike,
  onToggleDislike,
  onPlay,
}: {
  query: string;
  movies: Movie[];
  searching: boolean;
  onExpand: (movie: Movie) => void;
  onPreview: (movie: Movie, rect: DOMRect) => void;
  onPreviewEnd: () => void;
  favoriteSlugs?: Set<string>;
  likedSlugs?: Set<string>;
  dislikedSlugs?: Set<string>;
  onToggleFavorite?: (movie: Movie) => void;
  onToggleLike?: (movie: Movie) => void;
  onToggleDislike?: (movie: Movie) => void;
  onPlay?: (movie: Movie) => void;
}) {
  return (
    <section className="min-h-screen px-[4%] pb-16 pt-[120px]">
      <div className="mb-8 flex flex-wrap items-end gap-x-3 gap-y-2">
        <h1 className="text-[clamp(22px,2.2vw,32px)] font-medium leading-tight">
          Kết quả tìm kiếm cho <span className="font-bold">&quot;{query}&quot;</span>
        </h1>
        <span className="text-sm text-[#a3a3a3]">
          {searching ? "Đang tìm..." : `${movies.length} kết quả`}
        </span>
      </div>

      {searching ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }, (_, index) => (
            <div key={index} className="aspect-video animate-pulse rounded-sm bg-[#232323]" />
          ))}
        </div>
      ) : movies.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-2 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {movies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              onExpand={onExpand}
              onPreview={onPreview}
              onPreviewEnd={onPreviewEnd}
              favoriteSlugs={favoriteSlugs}
              likedSlugs={likedSlugs}
              dislikedSlugs={dislikedSlugs}
              onToggleFavorite={onToggleFavorite}
              onToggleLike={onToggleLike}
              onToggleDislike={onToggleDislike}
              onPlay={onPlay}
            />
          ))}
        </div>
      ) : (
        <div className="max-w-2xl text-[16px] leading-7 text-[#b3b3b3]">
          Không tìm thấy kết quả. Thử tên phim, tên tiếng Anh, diễn viên, đạo diễn, quốc gia hoặc thể loại khác.
        </div>
      )}
    </section>
  );
}
