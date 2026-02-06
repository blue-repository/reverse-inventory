/**
 * API Route para diagnóstico de PDFs
 * GET /api/pdf-diagnosis
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    // Verificar disponibilidad de librerías
    const diagnostics: Record<string, any> = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      libraries: {},
    };

    // Verificar pdf-parse
    try {
      const pdfParse = await import("pdf-parse");
      diagnostics.libraries["pdf-parse"] = {
        available: true,
        hasDefault: !!(pdfParse.default || pdfParse),
      };
    } catch (error) {
      diagnostics.libraries["pdf-parse"] = {
        available: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    // Verificar pdfjs-dist
    try {
      const pdfjs = await import("pdfjs-dist");
      diagnostics.libraries["pdfjs-dist"] = {
        available: true,
        version: pdfjs.version || "unknown",
      };
    } catch (error) {
      diagnostics.libraries["pdfjs-dist"] = {
        available: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    return NextResponse.json(diagnostics);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
