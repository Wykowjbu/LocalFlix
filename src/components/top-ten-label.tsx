export default function TopTenLabel({ rank }: { rank: number }) {
  return (
    <div className="flex h-[30px] items-center gap-[10px] text-white">
      <div className="relative size-[28px] shrink-0 overflow-hidden rounded-[4px] bg-[#f50723] text-center font-black leading-none">
        <span className="absolute left-1/2 top-[3px] -translate-x-1/2 text-[9.5px] tracking-[-0.5px]">TOP</span>
        <span className="absolute left-1/2 top-[9px] -translate-x-1/2 text-[14px] tracking-[-1px]">10</span>
      </div>
      <span className="text-[20.856px] font-medium leading-none tracking-[-0.4345px]">#{rank} in TV Shows Today</span>
    </div>
  );
}
