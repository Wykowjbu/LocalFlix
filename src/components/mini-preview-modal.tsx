"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import Icon from "./icon";
import RoundButton from "./round-button";
import MaturityBadge from "./maturity-badge";
import QualityBadge from "./quality-badge";
import type { Movie } from "@/data/netflix";

export type PreviewState = {
  movie: Movie;
  top: number;
  left: number;
  width: number;
  active: boolean;
};

export default function MiniPreviewModal({
  preview,
  onExpand,
  onKeepOpen,
  onPreviewEnd,
  favoriteSlugs,
  likedSlugs,
  dislikedSlugs,
  onToggleFavorite,
  onToggleLike,
  onToggleDislike,
  onPlay,
}: {
  preview: PreviewState;
  onExpand: (movie: Movie) => void;
  onKeepOpen: () => void;
  onPreviewEnd: () => void;
  favoriteSlugs?: Set<string>;
  likedSlugs?: Set<string>;
  dislikedSlugs?: Set<string>;
  onToggleFavorite?: (movie: Movie) => void;
  onToggleLike?: (movie: Movie) => void;
  onToggleDislike?: (movie: Movie) => void;
  onPlay?: (movie: Movie) => void;
}) {
  const { movie, top, left, width } = preview;
  const isFav = favoriteSlugs?.has(movie.id) ?? false;
  const isLiked = likedSlugs?.has(movie.id) ?? false;
  const isDisliked = dislikedSlugs?.has(movie.id) ?? false;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={movie.title}
      tabIndex={-1}
      data-uia="modal-motion-container-MINI_MODAL"
      className={`mini-preview-modal absolute z-[70] overflow-hidden rounded-md bg-[#181818] text-white shadow-[0_3px_10px_rgba(0,0,0,.75)] ${
        preview.active ? "active" : ""
      }`}
      style={{ top, left, width, transformOrigin: "50% 50%" }}
      onMouseEnter={onKeepOpen}
      onMouseLeave={onPreviewEnd}
    >
      <div className="relative aspect-video overflow-hidden bg-[#181818]">
        <Image src={movie.image} alt={movie.title} fill sizes={`${Math.round(width)}px`} className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <button
          type="button"
          aria-label="Đóng"
          onClick={onPreviewEnd}
          className="absolute right-2 top-2 grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-[#181818]/90 text-white"
        >
          <Icon name="x" className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            <RoundButton icon="play" label="Phát" filled size="sm" onClick={() => onPlay?.(movie)} />
            <RoundButton icon={isFav ? "check" : "plus"} label="Danh sách của tôi" size="sm" onClick={() => onToggleFavorite?.(movie)} />
            <RoundButton icon="like" label="Thích" size="sm" filled={isLiked} onClick={() => onToggleLike?.(movie)} />
            <RoundButton icon="dislike" label="Không thích" size="sm" filled={isDisliked} onClick={() => onToggleDislike?.(movie)} />
          </div>
          <RoundButton icon="chevron" label="Mở rộng" size="sm" onClick={() => onExpand(movie)} />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-[#e5e5e5]">
          <span className="font-bold text-[#46d369]">{movie.match}% phù hợp</span>
          <MaturityBadge rating={movie.maturity} />
          <span>{movie.duration}</span>
          <QualityBadge quality={movie.quality} />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-white">
          {movie.genres.map((genre, index) => (
            <span key={genre} className="flex items-center gap-1.5">
              {genre}
              {index < movie.genres.length - 1 ? <span className="h-1 w-1 rounded-full bg-[#646464]" /> : null}
            </span>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
