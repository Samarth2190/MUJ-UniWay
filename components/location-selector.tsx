"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, MapPin, Crosshair } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import type { LocationCoordinates } from "@/lib/geolocation"

interface Building {
  id: number
  name: string
  category: string
  description: string
  lat: number
  lng: number
  x?: number
  y?: number
  services: string[]
  hours?: string
  phone?: string
  website?: string
}

interface LocationSelectorProps {
  label: string
  placeholder: string
  value: Building | null
  onValueChange: (building: Building | null) => void
  buildings: Building[]
  currentLocation: LocationCoordinates | null
  allowCurrentLocation?: boolean
  onStartLocationTracking?: () => void
  className?: string
}

const categoryIcons = {
  academic: "🎓",
  residential: "🏠",
  dining: "🍽️",
  recreation: "🏃",
  administrative: "🏢",
  parking: "🚗",
  outdoor: "🌳",
}

export function LocationSelector({
  label,
  placeholder,
  value,
  onValueChange,
  buildings,
  currentLocation,
  allowCurrentLocation = false,
  onStartLocationTracking,
  className,
}: LocationSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Create a virtual "My Location" building object
  const createMyLocationBuilding = (location: LocationCoordinates): Building => ({
    id: -1, // Special ID for current location
    name: "My Location",
    category: "location",
    description: "Your current GPS location",
    lat: location.lat,
    lng: location.lng,
    x: 0,
    y: 0,
    services: ["GPS Location", "Real-time Position"],
    hours: "24/7",
  })

  const handleSelect = async (selectedValue: string) => {
    if (selectedValue === "current-location") {
      if (currentLocation) {
        // Location is already available
        const myLocationBuilding = createMyLocationBuilding(currentLocation)
        onValueChange(myLocationBuilding)
      } else if (onStartLocationTracking) {
        // Start location tracking and wait for the location to be available
        onStartLocationTracking()
        // Don't set a temporary building - let the parent component handle the location update
        // The location will be updated via the onLocationUpdate callback
      }
    } else {
      // Extract the building ID from the end of the value string
      const buildingId = selectedValue.split(' ').pop()
      const selectedBuilding = buildings.find(b => b.id.toString() === buildingId)
      onValueChange(selectedBuilding || null)
    }
    setOpen(false)
    setSearchQuery("")
  }

  const handleClear = () => {
    onValueChange(null)
    setSearchQuery("")
  }

  return (
    <div className={cn("flex flex-col space-y-2", className)}>
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between shadow-crystal hover:shadow-crystal-medium backdrop-blur-living glass-input-living"
          >
            {value ? (
              <div className="flex items-center gap-2 truncate">
                {value.id === -1 ? (
                  <Crosshair className="h-4 w-4 text-blue-600" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}
                <span className="truncate">{value.name}</span>
                {value.id === -1 && (
                  <Badge variant="secondary" className="text-xs">
                    Live GPS
                  </Badge>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 shadow-crystal-strong backdrop-blur-living">
          <Command>
            <CommandInput
              placeholder="Search buildings..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="border-0 focus:ring-0"
            />
            <CommandList>
              <CommandEmpty>No building found.</CommandEmpty>
              
              {/* Current Location Option */}
              {allowCurrentLocation && (
                <CommandGroup>
                  <CommandItem
                    value="current-location"
                    onSelect={handleSelect}
                    className="cursor-pointer"
                  >
                    <Crosshair className="mr-2 h-4 w-4 text-blue-600" />
                    <div className="flex flex-col">
                      <span className="font-medium">My Location</span>
                      <span className="text-xs text-muted-foreground">
                        {currentLocation ? "Use your current GPS position" : "Start location tracking to use your position"}
                      </span>
                    </div>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {currentLocation ? "Live GPS" : "Enable GPS"}
                    </Badge>
                  </CommandItem>
                </CommandGroup>
              )}

              {/* Buildings by Category */}
              {Object.entries(
                buildings.reduce((acc: Record<string, Building[]>, building: Building) => {
                  if (!acc[building.category]) {
                    acc[building.category] = []
                  }
                  acc[building.category].push(building)
                  return acc
                }, {} as Record<string, Building[]>)
              ).map(([category, categoryBuildings]) => (
                <CommandGroup key={category} heading={category.charAt(0).toUpperCase() + category.slice(1)}>
                  {categoryBuildings.map((building) => (
                    <CommandItem
                      key={building.id}
                      value={`${building.name} ${building.description} ${building.category} ${building.id}`}
                      onSelect={handleSelect}
                      className="cursor-pointer"
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      <div className="flex flex-col">
                        <span className="font-medium">{building.name}</span>
                        <span className="text-xs text-muted-foreground">{building.description}</span>
                      </div>
                      <span className="ml-auto text-xs opacity-50">
                        {categoryIcons[building.category as keyof typeof categoryIcons] || "🏢"}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* Clear button */}
      {value && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="h-8 text-xs text-muted-foreground hover:text-foreground"
        >
          Clear selection
        </Button>
      )}
    </div>
  )
}
