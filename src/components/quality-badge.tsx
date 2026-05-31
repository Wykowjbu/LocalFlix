export default function QualityBadge({ quality }: { quality: string }) {
  return (
    <span className="inline-flex h-4 items-center justify-center rounded-[4px] border border-[#808080] px-[6.5px] text-[11px] leading-none text-[#e5e5e5]">
      {quality}
    </span>
  );
}
