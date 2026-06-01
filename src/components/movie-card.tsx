"use client";

import Image from "next/image";
import Icon from "./icon";
import RoundButton from "./round-button";
import MaturityBadge from "./maturity-badge";
import QualityBadge from "./quality-badge";
import type { Movie } from "@/data/netflix";

export default function MovieCard({
  movie,
  onExpand,
  onPreview,
  onPreviewEnd,
  variant = "standard",
  rank,
  favoriteSlugs,
  likedSlugs,
  dislikedSlugs,
  onToggleFavorite,
  onToggleLike,
  onToggleDislike,
  onPlay,
}: {
  movie: Movie;
  onExpand: (movie: Movie) => void;
  onPreview: (movie: Movie, rect: DOMRect) => void;
  onPreviewEnd: () => void;
  variant?: "standard" | "top10";
  rank?: number;
  favoriteSlugs?: Set<string>;
  likedSlugs?: Set<string>;
  dislikedSlugs?: Set<string>;
  onToggleFavorite?: (movie: Movie) => void;
  onToggleLike?: (movie: Movie) => void;
  onToggleDislike?: (movie: Movie) => void;
  onPlay?: (movie: Movie) => void;
}) {
  const isTop10 = variant === "top10";
  const isFav = favoriteSlugs?.has(movie.id) ?? false;
  const isLiked = likedSlugs?.has(movie.id) ?? false;
  const isDisliked = dislikedSlugs?.has(movie.id) ?? false;

  return (
    <article
      onMouseEnter={(event) => onPreview(movie, event.currentTarget.getBoundingClientRect())}
      onMouseLeave={onPreviewEnd}
      className={`movie-card group/card relative shrink-0 cursor-pointer ${
        isTop10 ? "basis-[64%] sm:basis-[42%] md:basis-[31%] lg:basis-[24%] xl:basis-[20%]" : "basis-[48%] sm:basis-[31%] md:basis-[23.5%] lg:basis-[18.9%] xl:basis-[15.8%]"
      }`}
    >
      {isTop10 ? (
        <div className="relative flex h-[clamp(150px,13vw,210px)] items-end overflow-visible">
          <div
            className="rank-number pointer-events-none z-0 w-[45%] select-none text-right text-[clamp(120px,12vw,210px)] font-black leading-[0.78] text-[#141414]"
            style={{ WebkitTextStroke: "4px #595959", textShadow: "0 0 1px #000" }}
            aria-hidden="true"
          >
            {rank}
          </div>
          <div className="relative z-10 h-full aspect-[7/10] -ml-[7%] overflow-hidden bg-[#181818] shadow-[0_0_0_1px_rgba(255,255,255,.05)]">
            <Image
              src={movie.image}
              alt={movie.title}
              fill
              sizes="(max-width: 640px) 32vw, (max-width: 1024px) 18vw, 12vw"
              className="object-cover transition-transform duration-300 group-hover/card:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2">
              <p className="truncate text-[11px] font-bold text-white">{movie.title}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative aspect-video overflow-hidden rounded-sm bg-[#181818]">
          <Image
            src={movie.image}
            alt={movie.title}
            fill
            sizes="(max-width: 640px) 48vw, (max-width: 768px) 31vw, (max-width: 1024px) 24vw, 16vw"
            className="object-cover transition-transform duration-300 group-hover/card:scale-105"
          />
          {movie.top10 ? (
            <div className="absolute left-2 top-2 grid size-8 place-items-center rounded-[4px] bg-[#f50723] text-center font-black leading-none text-white">
              <span className="text-[10px] tracking-[-0.5px]">TOP</span>
              <span className="-mt-1 text-[15px] tracking-[-1px]">10</span>
            </div>
          ) : null}
          {movie.episodeLabel ? (
            <div className="absolute left-2 bottom-2 rounded bg-black/70 px-2 py-0.5 text-[11px] text-white">
              {movie.episodeLabel}
            </div>
          ) : null}
          {movie.progress != null && movie.progress > 0 ? (
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/30">
              <div className="h-full bg-[#e50914]" style={{ width: `${movie.watchDuration ? Math.min((movie.progress / movie.watchDuration) * 100, 100) : Math.min(movie.progress / 10, 100)}%` }} />
            </div>
          ) : null}
        </div>
      )}
    </article>
  );
}
