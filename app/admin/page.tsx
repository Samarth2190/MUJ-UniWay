"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Edit, Trash2, MapPin, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { createBuilding, updateBuilding, deleteBuilding } from "@/lib/actions"

const categories = ["academic", "residential", "dining", "recreation", "administrative", "parking", "outdoor"]

const categoryColors = {
  academic: "#3b82f6", // Blue for academic buildings
  residential: "#10b981", // Green for hostels
  dining: "#f59e0b", // Orange for dining
  recreation: "#8b5cf6", // Purple for sports/recreation
  administrative: "#ef4444", // Red for admin buildings
  parking: "#6b7280", // Gray for parking
  outdoor: "#22c55e", // Light green for outdoor spaces
}

export default function AdminPage() {
  const [buildings, setBuildings] = useState([])
  const [error, setError] = useState(null)
  const [editingBuilding, setEditingBuilding] = useState(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBuildings()
  }, [])

  const fetchBuildings = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/buildings")

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (Array.isArray(data)) {
        setBuildings(data)
      } else {
        console.error("API returned non-array data:", data)
        setBuildings([])
        setError("Invalid data format received")
      }
    } catch (error) {
      console.error("Error fetching buildings:", error)
      setBuildings([])
      setError(error.message || "Failed to load buildings")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (formData: FormData) => {
    try {
      let result
      if (editingBuilding) {
        result = await updateBuilding(editingBuilding.id, formData)
      } else {
        result = await createBuilding(formData)
      }

      if (result.success) {
        setIsDialogOpen(false)
        setEditingBuilding(null)
        fetchBuildings()
      } else {
        alert(result.error || "An error occurred")
      }
    } catch (error) {
      console.error("Error submitting form:", error)
      alert("An error occurred")
    }
  }

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this building?")) {
      try {
        const result = await deleteBuilding(id)
        if (result.success) {
          fetchBuildings()
        } else {
          alert(result.error || "An error occurred")
        }
      } catch (error) {
        console.error("Error deleting building:", error)
        alert("An error occurred")
      }
    }
  }

  const openEditDialog = (building) => {
    setEditingBuilding(building)
    setIsDialogOpen(true)
  }

  const openCreateDialog = () => {
    setEditingBuilding(null)
    setIsDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2">Error Loading Admin Panel</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 gradient-living-header z-10 sticky top-0">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="font-medium">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Map
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-2xl font-bold gradient-text">Campus Admin</h1>
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog} className="h-11 font-medium">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Building
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingBuilding ? "Edit Building" : "Add New Building"}</DialogTitle>
                  <DialogDescription>
                    {editingBuilding ? "Update building information" : "Add a new building to the campus map"}
                  </DialogDescription>
                </DialogHeader>
                <form action={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Building Name *</Label>
                      <Input id="name" name="name" defaultValue={editingBuilding?.name || ""} required />
                    </div>
                    <div>
                      <Label htmlFor="category">Category *</Label>
                      <Select name="category" defaultValue={editingBuilding?.category || ""} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category.charAt(0).toUpperCase() + category.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      defaultValue={editingBuilding?.description || ""}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="hours">Hours</Label>
                      <Input
                        id="hours"
                        name="hours"
                        defaultValue={editingBuilding?.hours || ""}
                        placeholder="e.g., 9:00 AM - 5:00 PM"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        name="phone"
                        defaultValue={editingBuilding?.phone || ""}
                        placeholder="e.g., (555) 123-4567"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      name="website"
                      defaultValue={editingBuilding?.website || ""}
                      placeholder="e.g., library.university.edu"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="lat">Latitude *</Label>
                      <Input
                        id="lat"
                        name="lat"
                        type="number"
                        step="0.000001"
                        defaultValue={editingBuilding?.lat || "37.8719"}
                        required
                        placeholder="e.g., 37.8719"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lng">Longitude *</Label>
                      <Input
                        id="lng"
                        name="lng"
                        type="number"
                        step="0.000001"
                        defaultValue={editingBuilding?.lng || "-122.2585"}
                        required
                        placeholder="e.g., -122.2585"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="x">X Coordinate (Legacy)</Label>
                      <Input
                        id="x"
                        name="x"
                        type="number"
                        defaultValue={editingBuilding?.x || "300"}
                        min="0"
                        max="600"
                      />
                    </div>
                    <div>
                      <Label htmlFor="y">Y Coordinate (Legacy)</Label>
                      <Input
                        id="y"
                        name="y"
                        type="number"
                        defaultValue={editingBuilding?.y || "225"}
                        min="0"
                        max="450"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="services">Services (comma-separated)</Label>
                    <Input
                      id="services"
                      name="services"
                      defaultValue={editingBuilding?.services?.join(", ") || ""}
                      placeholder="e.g., Study Rooms, Computer Lab, Printing"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="font-medium">{editingBuilding ? "Update Building" : "Add Building"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>
      <div className="container mx-auto px-4 py-6 m-4">
        <Card>

          <CardHeader>
            <CardTitle className="text-xl font-semibold gradient-text">Buildings Management</CardTitle>
            <CardDescription>Manage campus buildings and their information</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>GPS Coordinates</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buildings.map((building) => (
                  <TableRow key={building.id}>
                    <TableCell className="font-semibold">{building.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-medium">{building.category}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{building.description}</TableCell>
                    <TableCell className="text-xs">
                      {building.lat && building.lng
                        ? `${Number(building.lat).toFixed(6)}, ${Number(building.lng).toFixed(6)}`
                        : "Not set"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {building.services?.slice(0, 2).map((service) => (
                          <Badge key={service} variant="outline" className="text-xs font-medium">
                            {service}
                          </Badge>
                        ))}
                        {building.services?.length > 2 && (
                          <Badge variant="outline" className="text-xs font-medium">
                            +{building.services.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(building)} className="font-medium">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(building.id)} className="font-medium">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
