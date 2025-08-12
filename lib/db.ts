import { neon } from "@neondatabase/serverless"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set")
}

export const sql = neon(process.env.DATABASE_URL)

export type Building = {
  id: number
  name: string
  category: string
  description: string
  hours?: string
  phone?: string
  website?: string
  x: number
  y: number
  services: string[]
  created_at: Date
  updated_at: Date
}
