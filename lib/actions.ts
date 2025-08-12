"use server"

import { sql } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function createBuilding(formData: FormData) {
  try {
    const name = formData.get("name") as string
    const category = formData.get("category") as string
    const description = formData.get("description") as string
    const hours = formData.get("hours") as string
    const phone = formData.get("phone") as string
    const website = formData.get("website") as string
    const lat = Number.parseFloat(formData.get("lat") as string)
    const lng = Number.parseFloat(formData.get("lng") as string)
    const x = Number.parseInt(formData.get("x") as string) || 300
    const y = Number.parseInt(formData.get("y") as string) || 225
    const services = formData.get("services") as string

    if (!name || !category || isNaN(lat) || isNaN(lng)) {
      return { error: "Missing required fields" }
    }

    const servicesArray = services ? services.split(",").map((s) => s.trim()) : []

    await sql`
      INSERT INTO buildings (name, category, description, hours, phone, website, lat, lng, x, y, services)
      VALUES (${name}, ${category}, ${description}, ${hours}, ${phone}, ${website}, ${lat}, ${lng}, ${x}, ${y}, ${JSON.stringify(servicesArray)})
    `

    revalidatePath("/admin")
    revalidatePath("/")

    return { success: true }
  } catch (error) {
    console.error("Error creating building:", error)
    return { error: "Failed to create building" }
  }
}

export async function updateBuilding(id: number, formData: FormData) {
  try {
    const name = formData.get("name") as string
    const category = formData.get("category") as string
    const description = formData.get("description") as string
    const hours = formData.get("hours") as string
    const phone = formData.get("phone") as string
    const website = formData.get("website") as string
    const lat = Number.parseFloat(formData.get("lat") as string)
    const lng = Number.parseFloat(formData.get("lng") as string)
    const x = Number.parseInt(formData.get("x") as string) || 300
    const y = Number.parseInt(formData.get("y") as string) || 225
    const services = formData.get("services") as string

    const servicesArray = services ? services.split(",").map((s) => s.trim()) : []

    await sql`
      UPDATE buildings 
      SET name = ${name}, 
          category = ${category}, 
          description = ${description}, 
          hours = ${hours}, 
          phone = ${phone}, 
          website = ${website}, 
          lat = ${lat},
          lng = ${lng},
          x = ${x}, 
          y = ${y}, 
          services = ${JSON.stringify(servicesArray)},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `

    revalidatePath("/admin")
    revalidatePath("/")

    return { success: true }
  } catch (error) {
    console.error("Error updating building:", error)
    return { error: "Failed to update building" }
  }
}

export async function deleteBuilding(id: number) {
  try {
    await sql`DELETE FROM buildings WHERE id = ${id}`

    revalidatePath("/admin")
    revalidatePath("/")

    return { success: true }
  } catch (error) {
    console.error("Error deleting building:", error)
    return { error: "Failed to delete building" }
  }
}
