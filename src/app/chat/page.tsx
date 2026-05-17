import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getServerLocaleOnly } from "@/i18n/server";
import { prisma } from "@/lib/db";
import { ChatClient } from "@/components/chat/ChatClient";
import { t } from "@/i18n/t";

const ROOM_SCREENERS = "lobby";
const ROOM_ADMINS = "admins";
const ROOM_SUPER = "superadmins";

export default async function ChatPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const locale = await getServerLocaleOnly();

  if ((user.roleId ?? 0) < 2) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t(locale, "chat.title")}</h1>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
            {locale === "en" ? "No permission." : locale === "zh-Hans" ? "无权限访问。" : "無權限存取。"}
          </p>
        </div>
      </div>
    );
  }

  const [screeners, admins, superAdmins] = await Promise.all([
    prisma.chatRoom.upsert({
      where: { id: ROOM_SCREENERS },
      create: { id: ROOM_SCREENERS, type: "public", name: "All Screeners+", createdById: user.id, directKey: null },
      update: { name: "All Screeners+" },
      select: { id: true, type: true, name: true, updatedAt: true, directKey: true },
    }),
    prisma.chatRoom.upsert({
      where: { id: ROOM_ADMINS },
      create: { id: ROOM_ADMINS, type: "public", name: "All Admins+", createdById: user.id, directKey: null },
      update: { name: "All Admins+" },
      select: { id: true, type: true, name: true, updatedAt: true, directKey: true },
    }),
    prisma.chatRoom.upsert({
      where: { id: ROOM_SUPER },
      create: { id: ROOM_SUPER, type: "public", name: "Super Admin Group", createdById: user.id, directKey: null },
      update: { name: "Super Admin Group" },
      select: { id: true, type: true, name: true, updatedAt: true, directKey: true },
    }),
  ]);

  await prisma.chatMember.upsert({
    where: { roomId_userId: { roomId: screeners.id, userId: user.id } },
    create: { roomId: screeners.id, userId: user.id, role: "member" },
    update: {},
  });
  if ((user.roleId ?? 0) >= 3) {
    await prisma.chatMember.upsert({
      where: { roomId_userId: { roomId: admins.id, userId: user.id } },
      create: { roomId: admins.id, userId: user.id, role: "member" },
      update: {},
    });
  }
  if ((user.roleId ?? 0) >= 4) {
    await prisma.chatMember.upsert({
      where: { roomId_userId: { roomId: superAdmins.id, userId: user.id } },
      create: { roomId: superAdmins.id, userId: user.id, role: "member" },
      update: {},
    });
  }

  const rooms = await prisma.chatMember.findMany({
    where: { userId: user.id },
    orderBy: { room: { updatedAt: "desc" } },
    select: {
      room: {
        select: {
          id: true,
          type: true,
          name: true,
          updatedAt: true,
          directKey: true,
          members: { select: { user: { select: { id: true, name: true, email: true, roleId: true, avatarUpdatedAt: true } } } },
        },
      },
    },
  });

  const messages = await prisma.chatMessage.findMany({
    where: { roomId: screeners.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      kind: true,
      body: true,
      attachmentsJson: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true, roleId: true, avatarUpdatedAt: true } },
    },
  });

  const initialRooms = rooms.map((r) => {
    const room = r.room;
    const other =
      room.type === "direct" ? room.members.map((m) => m.user).find((u) => u.id !== user.id) ?? null : null;
    return {
      id: room.id,
      type: room.type,
      name: room.name,
      updatedAt: room.updatedAt,
      directKey: room.directKey,
      directUser: other ? { id: other.id, name: other.name, email: other.email, roleId: other.roleId, avatarUpdatedAt: other.avatarUpdatedAt } : null,
    };
  });
  const initialMessages = messages.reverse();

  return (
    <div className="relative space-y-4 overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-[-10rem] mx-auto h-[24rem] w-[72rem] bg-[radial-gradient(circle_at_22%_26%,rgba(59,130,246,0.18),transparent_42%),radial-gradient(circle_at_80%_20%,rgba(236,72,153,0.14),transparent_36%),radial-gradient(circle_at_50%_78%,rgba(20,184,166,0.14),transparent_40%)]" />
      <div className="relative rounded-3xl border border-white/60 bg-gradient-to-br from-white/95 via-sky-50/85 to-white/90 p-6 shadow-[0_14px_40px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-gradient-to-br dark:from-slate-900/70 dark:via-sky-950/35 dark:to-slate-900/70">
        <div className="inline-flex items-center rounded-full border border-sky-300/50 bg-sky-100/70 px-3 py-1 text-xs font-semibold text-sky-700 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-200">
          {locale === "en" ? "Team Chat" : locale === "zh-Hans" ? "团队聊天" : "團隊聊天"}
        </div>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">{t(locale, "chat.title")}</h1>
        {t(locale, "chat.subtitle") ? (
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{t(locale, "chat.subtitle")}</p>
        ) : null}
      </div>
      <ChatClient
        locale={locale}
        me={{ id: user.id, name: user.name ?? user.email, roleId: user.roleId }}
        canCreateRoom={user.roleId >= 4}
        initialRoomId={screeners.id}
        initialRooms={initialRooms}
        initialMessages={initialMessages}
      />
    </div>
  );
}
