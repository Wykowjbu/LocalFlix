"use client";

import Image from "next/image";
import Icon from "./icon";
import QualityBadge from "./quality-badge";
import MaturityBadge from "./maturity-badge";
import TopTenLabel from "./top-ten-label";
import { featuredMovie, type Movie } from "@/data/netflix";

export default function HeroBillboard({ heroMovie, onPlay, onInfo }: { heroMovie?: Movie | null; onPlay?: (slug: string) => void; onInfo?: (movie: Movie) => void }) {
  const hero = heroMovie || null;
  const heroImage = hero?.image || featuredMovie.image;
  const heroTitle = hero?.title || featuredMovie.title;
  const heroSynopsis = hero ? "" : featuredMovie.synopsis;
  const heroLabel = hero ? "LOCALFLIX" : featuredMovie.label;

  return (
    <section className="relative min-h-[620px] overflow-hidden md:h-[80vh]">
      <div className="absolute inset-0">
        <Image src={heroImage} alt={heroTitle} fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#141414] to-transparent" />
      </div>
      <div className="relative z-10 flex h-full min-h-[620px] max-w-[754px] flex-col justify-end px-[4%] pb-[12vw] pt-32 md:pb-[8vw]">
        <p className="mb-3 text-[14px] font-bold leading-[18px] tracking-[0.28em] text-[#e50914]">{heroLabel}</p>
        <h1 className="text-[clamp(42px,6vw,88px)] font-black leading-[0.95] tracking-normal text-white">{heroTitle}</h1>
        <div className="mt-5 flex flex-wrap items-center gap-2 text-[16px] leading-[24px] text-[#bcbcbc]">
          <span className="font-medium tracking-[0.5px] text-[#46d369]">New</span>
          {hero ? <QualityBadge quality={hero.quality} /> : (
            <><span>2026</span><span>3 Seasons</span><QualityBadge quality="HD" /></>
          )}
        </div>
        {!hero && (
          <>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <MaturityBadge rating="TV-MA" />
              <span className="text-[14px] leading-[18px] text-white">violence, language</span>
            </div>
            <div className="mt-[14px]">
              <TopTenLabel rank={2} />
            </div>
          </>
        )}
        {heroSynopsis && <p className="mt-4 max-w-[481px] text-[16px] leading-[26px] text-white">{heroSynopsis}</p>}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button onClick={() => { if (hero && onPlay) onPlay(hero.id); }} className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-sm bg-white px-7 py-2.5 text-[16px] font-bold text-black transition-colors hover:bg-[#c2c2c2]">
            <Icon name="play" /> Phát
          </button>
          <button onClick={() => { if (hero && onInfo) onInfo(hero); }} className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-sm bg-[rgba(109,109,110,.7)] px-7 py-2.5 text-[16px] font-bold text-white transition-colors hover:bg-[rgba(109,109,110,.9)]">
            <Icon name="info" /> Thông tin khác
          </button>
        </div>
      </div>
    </section>
  );
}
