import openapi from "../../../../public/openapi.json"
import { NextResponse } from "next/server"

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(openapi, {
    headers: {
      "Cache-Control": "public, max-age=3600",
    },
  })
}
