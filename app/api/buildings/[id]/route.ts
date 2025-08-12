import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    const building = await sql`SELECT * FROM buildings WHERE id = ${id}`

    if (building.length === 0) {
      return NextResponse.json({ error: "Building not found" }, { status: 404 })
    }

    const transformedBuilding = {
      ...building[0],
      lat: building[0].lat ? Number(building[0].lat) : null,
      lng: building[0].lng ? Number(building[0].lng) : null,
      x: building[0].x ? Number(building[0].x) : 300,
      y: building[0].y ? Number(building[0].y) : 225,
      services:
        typeof building[0].services === "string" ? JSON.parse(building[0].services) : building[0].services || [],
    }

    return NextResponse.json(transformedBuilding)
  } catch (error) {
    console.error("Error fetching building:", error)
    return NextResponse.json({ error: "Failed to fetch building" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    const body = await request.json()
    const { name, category, description, hours, phone, website, x, y, services } = body

    const result = await sql`
      UPDATE buildings 
      SET name = ${name}, 
          category = ${category}, 
          description = ${description}, 
          hours = ${hours}, 
          phone = ${phone}, 
          website = ${website}, 
          x = ${x}, 
          y = ${y}, 
          services = ${JSON.stringify(services || [])},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Building not found" }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error updating building:", error)
    return NextResponse.json({ error: "Failed to update building" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    const result = await sql`DELETE FROM buildings WHERE id = ${id} RETURNING id`

    if (result.length === 0) {
      return NextResponse.json({ error: "Building not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Building deleted successfully" })
  } catch (error) {
    console.error("Error deleting building:", error)
    return NextResponse.json({ error: "Failed to delete building" }, { status: 500 })
  }
}
