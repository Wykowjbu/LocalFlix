import { Prisma } from "@prisma/client";
import { hashPassword, normalizeEmail } from "@/lib/auth";
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
  const name = String(body?.name || "").trim();
  const password = String(body?.password || "");

  if (!email || !email.includes("@")) {
    return Response.json({ error: "Email không hợp lệ" }, { status: 400 });
  }

  if (password.length < 6) {
    return Response.json({ error: "Mật khẩu tối thiểu 6 ký tự" }, { status: 400 });
  }

  if (!name) {
    return Response.json({ error: "Tên hồ sơ không được trống" }, { status: 400 });
  }

  try {
    const user = await prisma.user.create({
      data: {
        email,
        password: hashPassword(password),
        profiles: {
          create: {
            name,
            avatarUrl: DEFAULT_AVATAR,
          },
        },
      },
      include: { profiles: true },
    });

    return Response.json({
      user: { id: user.id, email: user.email },
      profiles: user.profiles.map(formatProfile),
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ error: "Email đã tồn tại" }, { status: 409 });
    }

    console.error("Register error:", error);
    return Response.json({ error: "Không thể đăng ký" }, { status: 500 });
  }
}
