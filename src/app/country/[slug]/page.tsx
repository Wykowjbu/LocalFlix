import { Suspense } from "react";
import CountryClient from "./country-client";

export default async function CountryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center bg-[#141414]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
        </main>
      }
    >
      <CountryClient slug={slug} />
    </Suspense>
  );
}
