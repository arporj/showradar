import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { buildLibraryCsv } from "@/lib/export/library-csv";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const csv = await buildLibraryCsv(session.user.id);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="showradar-biblioteca.csv"',
    },
  });
}
