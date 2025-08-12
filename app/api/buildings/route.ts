import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const search = searchParams.get("search")

    let buildings

    // Build query using tagged template literals
    if (category && category !== "all" && search) {
      // Both category and search filters
      buildings = await sql`
        SELECT * FROM buildings 
        WHERE category = ${category} 
        AND (name ILIKE ${`%${search}%`} OR description ILIKE ${`%${search}%`})
        ORDER BY name
      `
    } else if (category && category !== "all") {
      // Only category filter
      buildings = await sql`
        SELECT * FROM buildings 
        WHERE category = ${category}
        ORDER BY name
      `
    } else if (search) {
      // Only search filter
      buildings = await sql`
        SELECT * FROM buildings 
        WHERE (name ILIKE ${`%${search}%`} OR description ILIKE ${`%${search}%`})
        ORDER BY name
      `
    } else {
      // No filters
      buildings = await sql`
        SELECT * FROM buildings 
        ORDER BY name
      `
    }

    // Transform the data to ensure proper types
    const transformedBuildings = buildings.map((building) => ({
      ...building,
      lat: building.lat ? Number(building.lat) : null,
      lng: building.lng ? Number(building.lng) : null,
      x: building.x ? Number(building.x) : 300,
      y: building.y ? Number(building.y) : 225,
      services: typeof building.services === "string" ? JSON.parse(building.services) : building.services || [],
    }))

    // Ensure we always return an array
    return NextResponse.json(Array.isArray(transformedBuildings) ? transformedBuildings : [])
  } catch (error) {
    console.error("Error fetching buildings:", error)
    // Return empty array on error to prevent frontend crashes
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, category, description, hours, phone, website, x, y, services } = body

    if (!name || !category || !x || !y) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO buildings (name, category, description, hours, phone, website, x, y, services)
      VALUES (${name}, ${category}, ${description}, ${hours}, ${phone}, ${website}, ${x}, ${y}, ${JSON.stringify(services || [])})
      RETURNING *
    `

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error creating building:", error)
    return NextResponse.json({ error: "Failed to create building" }, { status: 500 })
  }
}
