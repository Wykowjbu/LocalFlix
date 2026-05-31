import { normalizeEmail, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";

const DEFAULT_AVATAR = "/avatars/avatar-172.png";
const DEFAULT_ACCENT = "#e50914";

function formatProfile(profile: { id: string; name: string; avatarUrl: string | null }) {
  return {
    id: profile.id,
    name: profile.name,
    avatar: profile.avatarUrl || DEFAULT_AVATAR,
    accent: DEFAULT_ACCENT,
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = normalizeEmail(body?.email || "");
  const password = String(body?.password || "");

  if (!email || !password) {
    return Response.json({ error: "Thiếu email hoặc mật khẩu" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { profiles: true },
  });

  if (!user || !verifyPassword(password, user.password)) {
    return Response.json({ error: "Email hoặc mật khẩu không đúng" }, { status: 401 });
  }

  return Response.json({
    user: { id: user.id, email: user.email },
    profiles: user.profiles.map(formatProfile),
  });
}
