import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    message: "Campus Navigator API Configuration",
    routing: {
      provider: "OpenRouteService",
      fallback: "Straight line calculation",
      note: "Set NEXT_PUBLIC_ORS_API_KEY environment variable for enhanced routing",
    },
    features: [
      "Real walking paths",
      "Turn-by-turn directions",
      "Accurate distance and time estimates",
      "Fallback to straight line if API unavailable",
    ],
  })
}
