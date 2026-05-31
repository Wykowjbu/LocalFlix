"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const SESSION_STORAGE_KEY = "localflix.session";

type AuthResponse = {
  error?: string;
  user?: { id: string; email: string };
  profiles?: { id: string; name: string; avatar: string; accent: string }[];
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as AuthResponse;

      if (!res.ok || !data.user || !data.profiles) {
        setError(data.error || "Không thể đăng nhập");
        return;
      }

      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data));
      router.replace("/");
    } catch {
      setError("Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#141414] text-white">
      <div className="absolute inset-0">
        <Image src="/localflix-logo.png" alt="" width={289} height={86} className="absolute left-[4%] top-6 z-10 h-auto w-[150px] md:w-[185px]" priority />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(229,9,20,.18),transparent_30%),linear-gradient(180deg,rgba(0,0,0,.72),#141414_82%)]" />
      </div>

      <section className="relative z-10 flex min-h-screen items-center justify-center px-4 py-28">
        <form onSubmit={handleSubmit} className="w-full max-w-[450px] rounded-sm bg-black/75 px-6 py-10 shadow-[0_12px_40px_rgba(0,0,0,.45)] sm:px-14 sm:py-12">
          <h1 className="mb-7 text-[32px] font-bold leading-tight">Đăng nhập</h1>

          <div className="space-y-4">
            <label className="block">
              <span className="sr-only">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
                autoComplete="email"
                required
                className="h-14 w-full rounded-sm border border-transparent bg-[#333333] px-4 text-[16px] text-white outline-none transition-colors placeholder:text-[#8c8c8c] focus:border-white"
              />
            </label>
            <label className="block">
              <span className="sr-only">Mật khẩu</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mật khẩu"
                autoComplete="current-password"
                required
                className="h-14 w-full rounded-sm border border-transparent bg-[#333333] px-4 text-[16px] text-white outline-none transition-colors placeholder:text-[#8c8c8c] focus:border-white"
              />
            </label>
          </div>

          {error ? <p className="mt-4 rounded-sm bg-[#e87c03]/20 px-3 py-2 text-sm text-[#ffb86c]">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-8 h-12 w-full cursor-pointer rounded-sm bg-[#e50914] text-[16px] font-bold text-white transition-colors hover:bg-[#f6121d] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>

          <p className="mt-8 text-[16px] text-[#737373]">
            Chưa có tài khoản?{" "}
            <Link href="/register" className="text-white hover:underline">
              Đăng ký ngay.
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
