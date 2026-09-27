import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const formId = url.searchParams.get("formId");

  if (!formId) {
    return new NextResponse("Missing formId", { status: 400 });
  }

  const form = await prisma.dmForm.findUnique({
    where: { id: formId },
    include: {
      submissions: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!form) {
    return new NextResponse("Form not found", { status: 404 });
  }

  // Generate CSV with UTF-8 BOM (\uFEFF) for Excel Persian text support
  const header = "\uFEFFشناسه,نام کاربری اینستاگرام,شماره موبایل,داده‌های فرم,تاریخ ثبت\n";
  const rows = form.submissions.map((s) => {
    const dataStr = JSON.stringify(s.data).replace(/"/g, '""');
    const dateStr = new Date(s.createdAt).toISOString();
    return `"${s.id}","${s.commenterUsername ?? s.commenterId}","${s.phone ?? ""}","${dataStr}","${dateStr}"`;
  });

  const csvContent = header + rows.join("\n");

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="form_${form.triggerKeyword}_leads.csv"`,
    },
  });
}
