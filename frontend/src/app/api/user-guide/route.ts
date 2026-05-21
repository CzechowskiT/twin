import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const filePath = path.join(process.cwd(), "public", "docs", "twin-user-guide.md");
  try {
    const body = await readFile(filePath, "utf8");
    return new NextResponse(body, {
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  } catch {
    return NextResponse.json({ detail: "User guide not found" }, { status: 404 });
  }
}
