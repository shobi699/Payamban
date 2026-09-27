import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const workspace = await prisma.workspace.findFirst({
    where: { ownerId: session.user.id },
  });

  if (!workspace) {
    return new NextResponse("Workspace not found", { status: 404 });
  }

  const contacts = await prisma.phonebookContact.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
  });

  // UTF-8 BOM for Persian characters in Excel
  const header = "\uFEFFنام,شماره موبایل,آیدی اینستاگرام,ایمیل,برچسب‌ها,منبع,تاریخ ثبت\n";
  const rows = contacts.map((c) => {
    const tags = c.tags.join("; ");
    const dateStr = new Date(c.createdAt).toISOString();
    return `"${c.name ?? ""}","${c.phone}","${c.instagramUsername ?? ""}","${c.email ?? ""}","${tags}","${c.source}","${dateStr}"`;
  });

  const csvContent = header + rows.join("\n");

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="phonebook_contacts_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
