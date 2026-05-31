export default function MaturityBadge({ rating }: { rating: string }) {
  return (
    <span className="inline-flex h-5 items-center justify-center border border-[#bcbcbc] px-[6px] text-[14.545px] leading-[18px] text-[#bcbcbc]">
      {rating}
    </span>
  );
}
