"use client";

import { useState } from "react";
import Icon from "./icon";
import MovieCard from "./movie-card";
import type { Movie } from "@/data/netflix";

export default function MovieRow({
  title,
  movies,
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
  title: string;
  movies: Movie[];
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
  const [trackPage, setTrackPage] = useState(1);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const isTop10Row = title.toLowerCase().includes("top 10");
  const pageSize = 6;
  const pages = Array.from({ length: Math.max(1, Math.ceil(movies.length / pageSize)) }, (_, pageIndex) =>
    movies.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize)
  );
  const pageCount = pages.length;
  const loopPages = pageCount > 1 ? [pages[pageCount - 1], ...pages, pages[0]] : pages;
  const activePage = pageCount > 1 ? (trackPage - 1 + pageCount) % pageCount : 0;

  const handleLoopSnap = () => {
    if (pageCount <= 1) return;
    if (trackPage === 0) {
      setTransitionEnabled(false);
      setTrackPage(pageCount);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setTransitionEnabled(true));
      });
    }
    if (trackPage === pageCount + 1) {
      setTransitionEnabled(false);
      setTrackPage(1);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setTransitionEnabled(true));
      });
    }
  };

  const goBack = () => {
    if (pageCount <= 1) return;
    setTransitionEnabled(true);
    setTrackPage((value) => value - 1);
  };

  const goNext = () => {
    if (pageCount <= 1) return;
    setTransitionEnabled(true);
    setTrackPage((value) => value + 1);
  };
  const visibleTrackPage = pageCount > 1 ? Math.min(trackPage, pageCount + 1) : 0;

  return (
    <section className="slider-row group/row relative py-[1.6vw]">
      <div className="mb-2 flex items-end gap-2 px-[4%]">
        <h2 className="text-[clamp(18px,1.4vw,24px)] font-bold leading-tight">{title}</h2>
        <ul className="ml-auto hidden items-center gap-1 opacity-0 transition-opacity duration-200 group-hover/row:flex group-hover/row:opacity-100" aria-hidden="true">
          {Array.from({ length: pageCount }, (_, index) => (
            <li key={index} className={`h-0.5 w-3 ${index === activePage ? "bg-[#aaa]" : "bg-[#4d4d4d]"}`} />
          ))}
        </ul>
      </div>
      <div className="relative overflow-x-clip overflow-y-visible py-12 -my-12">
        <div
          className={`flex ease-[cubic-bezier(.5,0,.1,1)] ${transitionEnabled ? "transition-transform duration-700" : ""}`}
          style={{ transform: `translateX(calc(${visibleTrackPage} * -100%))` }}
          onTransitionEnd={handleLoopSnap}
        >
          {loopPages.map((pageMovies, loopIndex) => {
            const pageOffset =
              pageCount > 1
                ? loopIndex === 0
                  ? (pageCount - 1) * pageSize
                  : loopIndex === loopPages.length - 1
                    ? 0
                    : (loopIndex - 1) * pageSize
                : 0;

            return (
              <div key={`${title}-${loopIndex}`} className="flex min-w-full gap-2 px-[4%]">
                {pageMovies.map((movie, index) => (
                  <MovieCard
                    key={`${loopIndex}-${movie.id}`}
                    movie={movie}
                    onExpand={onExpand}
                    onPreview={onPreview}
                    onPreviewEnd={onPreviewEnd}
                    variant={isTop10Row ? "top10" : "standard"}
                    rank={pageOffset + index + 1}
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
            );
          })}
        </div>
        <button
          type="button"
          aria-label="Xem video trước"
          disabled={pageCount <= 1}
          onClick={goBack}
          className={`absolute left-0 top-12 bottom-12 z-20 grid w-[4%] min-w-10 cursor-pointer place-items-center bg-black/45 text-white opacity-0 transition-opacity duration-200 ${
            pageCount > 1 ? "group-hover/row:opacity-100 hover:bg-black/65" : "pointer-events-none"
          }`}
        >
          <Icon name="chevron" className="h-10 w-10 rotate-180 drop-shadow-[0_1px_2px_rgba(0,0,0,.8)]" />
        </button>
        <button
          type="button"
          aria-label="Xem video khác"
          disabled={pageCount <= 1}
          onClick={goNext}
          className={`absolute right-0 top-12 bottom-12 z-20 grid w-[4%] min-w-10 cursor-pointer place-items-center bg-black/45 text-white opacity-0 transition-opacity duration-200 ${
            pageCount > 1 ? "group-hover/row:opacity-100 hover:bg-black/65" : "pointer-events-none"
          }`}
        >
          <Icon name="chevron" className="h-10 w-10 drop-shadow-[0_1px_2px_rgba(0,0,0,.8)]" />
        </button>
      </div>
    </section>
  );
}
