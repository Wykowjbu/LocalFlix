import Image from "next/image";

export default function NetflixLogo() {
  return (
    <Image
      src="/localflix-logo.png"
      alt="Localflix"
      width={289}
      height={86}
      priority
      className="h-auto w-[145px] md:w-[172px]"
    />
  );
}
