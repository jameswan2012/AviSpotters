import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/admin-guard";

export async function POST(request: Request) {
  try {
    await requireStaff();

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
    }

    // Return the file data as base64 for client-side processing
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = file.type || "application/pdf";

    return NextResponse.json({
      success: true,
      pdfDataUrl: `data:${mimeType};base64,${base64}`,
      fileName: file.name,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "PDF processing failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
