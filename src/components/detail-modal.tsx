"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Icon from "./icon";
import RoundButton from "./round-button";
import QualityBadge from "./quality-badge";
import MaturityBadge from "./maturity-badge";
import type { Movie } from "@/data/netflix";

type DetailEpisode = { id: string; name: string; slug: string; serverName: string; embedUrl: string | null; m3u8Url: string | null };
type MovieDetail = {
  slug: string; name: string; originalName?: string | null; description?: string | null;
  casts?: string | null; director?: string | null; totalEpisodes?: number | null;
  currentEpisode?: string | null; time?: string | null; quality?: string | null;
  language?: string | null; thumbUrl?: string | null; posterUrl?: string | null;
  tags?: { name: string; group: string }[]; episodes?: DetailEpisode[];
};

export default function DetailModal({
  movie, closing, onClose, onSearch, onPlay, isFavorite, isLiked, isDisliked, onToggleFavorite, onToggleLike, onToggleDislike,
}: {
  movie: Movie; closing?: boolean; onClose: () => void; onSearch?: (keyword: string) => void;
  onPlay?: (slug: string, episodeSlug?: string) => void;
  isFavorite?: boolean; isLiked?: boolean; isDisliked?: boolean;
  onToggleFavorite?: () => void; onToggleLike?: () => void; onToggleDislike?: () => void;
}) {
  const [detail, setDetail] = useState<MovieDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKeyDown); document.body.style.overflow = ""; };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    const frame = window.requestAnimationFrame(() => {
      setLoading(true);
      fetch(`/api/movies?slug=${encodeURIComponent(movie.id)}&withEpisodes=true`)
        .then((r) => r.json())
        .then((data) => {
          if (!cancelled && data.movie) setDetail(data.movie);
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [movie.id]);

  const episodes = detail?.episodes || [];
  const casts = detail?.casts || "";
  const director = detail?.director || "";
  const description = detail?.description || "";
  const genres = detail?.tags?.filter((t) => t.group === "Thể loại").map((t) => t.name) || movie.genres;
  const totalEps = detail?.totalEpisodes;

  return (
    <div className={`fixed inset-0 z-[80] overflow-y-auto bg-black/70 px-3 py-8 md:px-8 ${closing ? 'pointer-events-none' : ''}`} onMouseDown={onClose}>
      <section
        role="dialog" aria-modal="true" aria-label={movie.title} tabIndex={-1}
        className={`mx-auto min-h-[80vh] w-[92vw] max-w-[850px] overflow-hidden rounded-md bg-[#181818] pb-8 text-white shadow-[0_3px_10px_rgba(0,0,0,.75)] outline-none detail-modal-content ${closing ? 'exiting' : ''}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="relative aspect-video min-h-[300px] overflow-hidden bg-[#141414]">
          <Image src={movie.image} alt={movie.title} fill sizes="92vw" className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-[#181818]/20 to-transparent" />
          <button type="button" aria-label="Đóng" onClick={onClose} className="absolute right-4 top-4 grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-[#181818] text-white transition-colors hover:bg-[#232323]">
            <Icon name="x" />
          </button>
          <div className="absolute bottom-[8%] left-[clamp(20px,4vw,48px)] right-[clamp(20px,4vw,48px)]">
            <div className="mb-2 text-[14px] font-bold leading-[18px] tracking-[0.28em] text-[#e50914]">LOCALFLIX</div>
            <h2 className="max-w-[75%] text-[clamp(34px,6vw,72px)] font-black leading-none">{movie.title}</h2>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button onClick={() => onPlay?.(movie.id)} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-sm bg-white px-7 py-2.5 text-[16px] font-bold text-black transition-colors hover:bg-[#c2c2c2]">
                <Icon name="play" /> Phát
              </button>
              <RoundButton icon={isFavorite ? "check" : "plus"} label="Danh sách của tôi" onClick={onToggleFavorite} />
              <RoundButton icon="like" label="Thích" filled={isLiked} onClick={onToggleLike} />
              <RoundButton icon="dislike" label="Không thích" filled={isDisliked} onClick={onToggleDislike} />
              <div className="ml-auto hidden opacity-60 sm:block"><RoundButton icon="volume" label="Bật âm thanh" /></div>
            </div>
          </div>
        </div>

        <div className="grid gap-8 px-[clamp(20px,4vw,48px)] py-8 md:grid-cols-[minmax(0,1fr)_250px]">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-[#e5e5e5]">
              <span className="font-bold text-[#46d369]">{movie.match}% phù hợp</span>
              {totalEps && <span>{totalEps} tập</span>}
              <QualityBadge quality={detail?.quality || movie.quality} />
              <MaturityBadge rating={movie.maturity} />
              {detail?.language && <span>{detail.language}</span>}
            </div>
            <p className="text-[clamp(15px,1.5vw,18px)] leading-relaxed text-white">
              {loading ? "Đang tải..." : (description || "Chưa có mô tả.")}
            </p>
          </div>
          <aside className="space-y-3 text-sm leading-relaxed text-white">
            {casts && (
              <p><span className="text-[#777777]">Diễn viên: </span>
                {casts.split(",").map((cast, i) => (<span key={i}>{i > 0 && ", "}<button type="button" className="cursor-pointer text-white underline-offset-2 hover:underline" onClick={() => { onSearch?.(cast.trim()); onClose(); }}>{cast.trim()}</button></span>))}
              </p>
            )}
            <p><span className="text-[#777777]">Thể loại: </span>
              {genres.map((genre, i) => (<span key={i}>{i > 0 && ", "}<button type="button" className="cursor-pointer text-white underline-offset-2 hover:underline" onClick={() => { onSearch?.(genre); onClose(); }}>{genre}</button></span>))}
            </p>
            {director && (
              <p><span className="text-[#777777]">Đạo diễn: </span>
                <button type="button" className="cursor-pointer text-white underline-offset-2 hover:underline" onClick={() => { onSearch?.(director); onClose(); }}>{director}</button>
              </p>
            )}
          </aside>
        </div>

        {episodes.length > 0 && (
          <section className="px-[clamp(20px,4vw,48px)]">
            <div className="mb-4 flex items-end justify-between gap-4">
              <h3 className="text-[24px] font-bold leading-[30px]">Tập</h3>
              <span className="text-sm text-[#b3b3b3]">{movie.title}</span>
            </div>
            <div className="divide-y divide-[#333333] overflow-hidden rounded-sm border border-[#333333]">
              {episodes.map((ep, index) => (
                <article key={ep.id} className={`grid cursor-pointer gap-4 p-4 transition-colors hover:bg-[#232323] sm:grid-cols-[32px_160px_1fr] ${index === 0 ? "bg-[#232323]" : ""}`} onClick={() => onPlay?.(movie.id, ep.slug)}>
                  <div className="self-center text-center text-xl text-[#b3b3b3]">{index + 1}</div>
                  <div className="relative aspect-video overflow-hidden rounded-sm bg-[#141414]">
                    <Image src={movie.image} alt={ep.name} fill sizes="160px" className="object-cover" />
                    <div className="absolute inset-0 grid place-items-center bg-black/20 opacity-0 transition-opacity hover:opacity-100"><Icon name="play" className="h-9 w-9 text-white" /></div>
                  </div>
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <h4 className="font-bold">Tập {ep.name}</h4>
                      <span className="shrink-0 text-xs text-[#808080]">{ep.serverName}</span>
                    </div>
                    <p className="line-clamp-2 text-sm leading-relaxed text-[#b3b3b3]">{ep.m3u8Url ? "Có sẵn để phát" : "Chưa có link phát"}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10 px-[clamp(20px,4vw,48px)] text-sm leading-relaxed">
          <h3 className="mb-4 text-[24px] font-bold leading-[30px]">Giới thiệu về <strong>{movie.title}</strong></h3>
          {director && <p><span className="text-[#777777]">Đạo diễn:</span> {director}</p>}
          {casts && <p><span className="text-[#777777]">Diễn viên:</span> {casts}</p>}
          <p><span className="text-[#777777]">Thể loại:</span> {genres.join(", ")}</p>
          <p><span className="text-[#777777]">Xếp hạng độ tuổi:</span> {movie.maturity}</p>
        </section>
      </section>
    </div>
  );
}
