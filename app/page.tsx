"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  MapPin,
  Navigation,
  Clock,
  Phone,
  Globe,
  GraduationCap,
  Home,
  Utensils,
  Dumbbell,
  Car,
  Trees,
  Settings,
  Layers,
  Route,
  Navigation2,
  AlertTriangle,
  Building2,
  Target,
  Crosshair,
} from "lucide-react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { formatDistance, formatDuration, type RouteResponse } from "@/lib/routing"
import LocationTracker from "@/components/location-tracker"
import type { LocationCoordinates } from "@/lib/geolocation"
import { type NavigationState, navigationService } from "@/lib/navigation"

// Dynamically import the map component to avoid SSR issues
const CampusMap = dynamic(() => import("@/components/campus-map"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-gray-100 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-sm text-muted-foreground">Loading MUJ campus map...</p>
      </div>
    </div>
  ),
})

const categoryIcons = {
  academic: GraduationCap,
  residential: Home,
  dining: Utensils,
  recreation: Dumbbell,
  administrative: Building2,
  parking: Car,
  outdoor: Trees,
}

const categoryColors = {
  academic: "#3b82f6", // Blue for academic buildings
  residential: "#10b981", // Green for hostels
  dining: "#f59e0b", // Orange for dining
  recreation: "#8b5cf6", // Purple for sports/recreation
  administrative: "#ef4444", // Red for admin buildings
  parking: "#6b7280", // Gray for parking
  outdoor: "#22c55e", // Light green for outdoor spaces
}

// Create a virtual "My Location" building object
const createMyLocationBuilding = (location: LocationCoordinates) => ({
  id: -1, // Special ID for current location
  name: "My Location",
  category: "location" as const,
  description: "Your current GPS location",
  lat: location.lat,
  lng: location.lng,
  x: 0,
  y: 0,
  services: ["GPS Location", "Real-time Position"],
  hours: "24/7",
  phone: undefined,
  website: undefined,
})

export default function CampusNavigator() {
  const [buildings, setBuildings] = useState([])
  const [selectedBuilding, setSelectedBuilding] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [navigationFrom, setNavigationFrom] = useState(null)
  const [navigationTo, setNavigationTo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mapStyle, setMapStyle] = useState("street")
  const [currentRoute, setCurrentRoute] = useState<RouteResponse | null>(null)
  const [currentLocation, setCurrentLocation] = useState<LocationCoordinates | null>(null)
  const [navigationState, setNavigationState] = useState<NavigationState | null>(null)
  const [useCurrentLocationAsStart, setUseCurrentLocationAsStart] = useState(false)

  // Fetch buildings from API
  useEffect(() => {
    const fetchBuildings = async () => {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()
        if (selectedCategory !== "all") {
          params.append("category", selectedCategory)
        }
        if (searchQuery) {
          params.append("search", searchQuery)
        }

        const response = await fetch(`/api/buildings?${params}`)

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

    fetchBuildings()
  }, [selectedCategory, searchQuery])

  const categories = useMemo(() => {
    if (!Array.isArray(buildings)) return []
    return [...new Set(buildings.map((b) => b.category))]
  }, [buildings])

  const handleBuildingClick = (building) => {
    setSelectedBuilding(building)
  }

  const handleLocationUpdate = (location: LocationCoordinates) => {
    setCurrentLocation(location)
  }

  const handleNavigationStateChange = (state: NavigationState | null) => {
    setNavigationState(state)
  }

  const handleNavigate = async () => {
    if (selectedBuilding) {
      if (!navigationFrom) {
        setNavigationFrom(selectedBuilding)
      } else if (!navigationTo) {
        setNavigationTo(selectedBuilding)
      } else {
        setNavigationFrom(selectedBuilding)
        setNavigationTo(null)
      }
    }
  }

  // Set current location as starting point
  const setCurrentLocationAsStart = () => {
    if (currentLocation) {
      const myLocationBuilding = createMyLocationBuilding(currentLocation)
      setNavigationFrom(myLocationBuilding)
      setUseCurrentLocationAsStart(true)
    }
  }

  // Navigate from current location to selected building
  const navigateFromCurrentLocation = () => {
    if (currentLocation && selectedBuilding) {
      const myLocationBuilding = createMyLocationBuilding(currentLocation)
      setNavigationFrom(myLocationBuilding)
      setNavigationTo(selectedBuilding)
      setUseCurrentLocationAsStart(true)
    }
  }

  // Add new function for starting live navigation
  const startLiveNavigation = async () => {
    if (selectedBuilding && currentRoute) {
      try {
        await navigationService.startNavigation({ lat: selectedBuilding.lat, lng: selectedBuilding.lng }, currentRoute)
      } catch (error) {
        console.error("Failed to start navigation:", error)
        alert("Failed to start navigation. Please ensure location access is enabled.")
      }
    }
  }

  // Start live navigation from current location
  const startLiveNavigationFromCurrentLocation = async () => {
    if (selectedBuilding && currentLocation) {
      try {
        // Import routing function
        const { getWalkingRoute } = await import("@/lib/routing")

        // Calculate route from current location to selected building
        const route = await getWalkingRoute(
          { lat: currentLocation.lat, lng: currentLocation.lng },
          { lat: selectedBuilding.lat, lng: selectedBuilding.lng },
        )

        if (route) {
          await navigationService.startNavigation({ lat: selectedBuilding.lat, lng: selectedBuilding.lng }, route)
        } else {
          throw new Error("Could not calculate route")
        }
      } catch (error) {
        console.error("Failed to start navigation from current location:", error)
        alert("Failed to start navigation. Please ensure location access is enabled and try again.")
      }
    }
  }

  const clearNavigation = () => {
    setNavigationFrom(null)
    setNavigationTo(null)
    setCurrentRoute(null)
    setUseCurrentLocationAsStart(false)
  }

  const handleRouteCalculated = (route: RouteResponse | null) => {
    setCurrentRoute(route)
  }

  // Update navigation when current location changes and we're using it as start
  useEffect(() => {
    if (useCurrentLocationAsStart && currentLocation && navigationTo) {
      const myLocationBuilding = createMyLocationBuilding(currentLocation)
      setNavigationFrom(myLocationBuilding)
    }
  }, [currentLocation, useCurrentLocationAsStart, navigationTo])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto shadow-glow-primary"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400/20 to-purple-400/20 animate-pulse"></div>
          </div>
          <p className="mt-4 text-muted-foreground bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent font-medium">Loading Manipal University Jaipur campus...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-4">
            <div className="text-red-500 text-6xl mb-4 shadow-glow-danger">⚠️</div>
            <div className="absolute inset-0 bg-gradient-to-r from-red-400/20 to-orange-400/20 rounded-full blur-xl"></div>
          </div>
          <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">Error Loading Campus Map</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} className="shadow-glow-danger">Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="border-b gradient-header backdrop-blur-medium shadow-soft sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg shadow-glow-primary bg-white/20 backdrop-blur-soft">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">MUJ Campus Navigator</h1>
                <p className="text-sm text-muted-foreground">Manipal University Jaipur</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search buildings, hostels, facilities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-80 shadow-soft backdrop-blur-soft bg-white/80 dark:bg-gray-800/80"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMapStyle(mapStyle === "street" ? "satellite" : "street")}
                className="shadow-soft"
              >
                <Layers className="h-4 w-4 mr-2" />
                {mapStyle === "street" ? "Satellite" : "Street"}
              </Button>
              <Link href="/admin">
                <Button variant="outline" size="sm" className="shadow-soft">
                  <Settings className="h-4 w-4 mr-2" />
                  Admin
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Category Filter */}
            <Card className="shadow-medium hover:shadow-strong">
              <CardHeader>
                <CardTitle className="text-lg">Campus Areas</CardTitle>
                <CardDescription>Browse by building type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button
                    variant={selectedCategory === "all" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSelectedCategory("all")}
                  >
                    All Buildings ({buildings.length})
                  </Button>
                  {categories.map((category) => {
                    const Icon = categoryIcons[category]
                    const count = buildings.filter((b) => b.category === category).length
                    return (
                      <Button
                        key={category}
                        variant={selectedCategory === category ? "default" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => setSelectedCategory(category)}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {category.charAt(0).toUpperCase() + category.slice(1)} ({count})
                      </Button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Navigation Panel */}
            {(navigationFrom || navigationTo) && (
              <Card className="shadow-medium hover:shadow-strong shadow-glow-primary">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Navigation className="h-5 w-5" />
                    Campus Navigation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {navigationFrom && (
                    <div>
                      <p className="text-sm text-muted-foreground">From:</p>
                      <div className="flex items-center gap-2">
                        {navigationFrom.id === -1 ? (
                          <Crosshair className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Building2 className="h-4 w-4" />
                        )}
                        <p className="font-medium">{navigationFrom.name}</p>
                        {navigationFrom.id === -1 && (
                          <Badge variant="secondary" className="text-xs">
                            Live GPS
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  {navigationTo && (
                    <div>
                      <p className="text-sm text-muted-foreground">To:</p>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <p className="font-medium">{navigationTo.name}</p>
                      </div>
                    </div>
                  )}

                  {currentRoute && navigationFrom && navigationTo && (
                    <div
                      className={`p-3 rounded-lg space-y-2 shadow-soft backdrop-blur-soft ${
                        currentRoute.isRealRoute 
                          ? "bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 shadow-glow-primary" 
                          : "bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 shadow-glow-warning"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Route
                          className={`h-4 w-4 ${currentRoute.isRealRoute ? "text-blue-600" : "text-yellow-600"}`}
                        />
                        <span
                          className={`text-sm font-medium ${currentRoute.isRealRoute ? "text-blue-900" : "text-yellow-900"}`}
                        >
                          {currentRoute.isRealRoute ? "Campus Route" : "Simulated Route"}
                        </span>
                        {!currentRoute.isRealRoute && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className={currentRoute.isRealRoute ? "text-blue-700" : "text-yellow-700"}>
                            Distance:
                          </span>
                          <p
                            className={`font-medium ${currentRoute.isRealRoute ? "text-blue-900" : "text-yellow-900"}`}
                          >
                            {formatDistance(currentRoute.distance)}
                          </p>
                        </div>
                        <div>
                          <span className={currentRoute.isRealRoute ? "text-blue-700" : "text-yellow-700"}>Time:</span>
                          <p
                            className={`font-medium ${currentRoute.isRealRoute ? "text-blue-900" : "text-yellow-900"}`}
                          >
                            {formatDuration(currentRoute.duration)}
                          </p>
                        </div>
                      </div>
                      <p className={`text-xs ${currentRoute.isRealRoute ? "text-blue-700" : "text-yellow-700"}`}>
                        {currentRoute.isRealRoute ? "Follow the path on the map" : "Approximate campus route"}
                      </p>
                    </div>
                  )}

                  {/* Turn-by-turn directions */}
                  {currentRoute && currentRoute.instructions && currentRoute.instructions.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Navigation2 className="h-4 w-4 text-gray-600" />
                        <span className="text-sm font-medium">Directions</span>
                      </div>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {currentRoute.instructions.slice(0, 5).map((instruction, index) => (
                          <div key={index} className="text-xs p-2 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 rounded shadow-soft backdrop-blur-soft">
                            <span className="font-medium text-gray-700 dark:text-gray-300">{index + 1}.</span> {instruction}
                          </div>
                        ))}
                        {currentRoute.instructions.length > 5 && (
                          <p className="text-xs text-gray-500 text-center">
                            +{currentRoute.instructions.length - 5} more steps
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <Button onClick={clearNavigation} variant="outline" className="w-full bg-transparent">
                    Clear Navigation
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Location Tracker */}
            <LocationTracker
              onLocationUpdate={handleLocationUpdate}
              onNavigationStateChange={handleNavigationStateChange}
            />

            {/* Building Details */}
            {selectedBuilding && (
              <Card className="shadow-medium hover:shadow-strong shadow-glow-success">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {(() => {
                      const Icon = categoryIcons[selectedBuilding.category]
                      return <Icon className="h-5 w-5" />
                    })()}
                    {selectedBuilding.name}
                  </CardTitle>
                  <CardDescription>{selectedBuilding.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Badge style={{ backgroundColor: categoryColors[selectedBuilding.category] }} className="text-white">
                    {selectedBuilding.category}
                  </Badge>

                  {selectedBuilding.hours && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4" />
                      {selectedBuilding.hours}
                    </div>
                  )}

                  {selectedBuilding.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4" />
                      <a href={`tel:${selectedBuilding.phone}`} className="text-blue-600 hover:underline">
                        {selectedBuilding.phone}
                      </a>
                    </div>
                  )}

                  {selectedBuilding.website && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4" />
                      <a
                        href={`https://${selectedBuilding.website}`}
                        className="text-blue-600 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {selectedBuilding.website}
                      </a>
                    </div>
                  )}

                  {selectedBuilding.services && selectedBuilding.services.length > 0 && (
                    <div>
                      <p className="font-medium text-sm mb-2">Facilities:</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedBuilding.services.map((service) => (
                          <Badge key={service} variant="secondary" className="text-xs">
                            {service}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="space-y-2">
                    <Button onClick={handleNavigate} className="w-full">
                      <Navigation className="h-4 w-4 mr-2" />
                      {!navigationFrom ? "Start Navigation" : !navigationTo ? "Navigate Here" : "Set as Start"}
                    </Button>

                    {/* Navigate from current location button */}
                    {currentLocation && (
                      <Button onClick={navigateFromCurrentLocation} variant="secondary" className="w-full">
                        <Crosshair className="h-4 w-4 mr-2" />
                        Navigate from My Location
                      </Button>
                    )}

                    {/* Live navigation buttons */}
                    {currentRoute && !navigationState && (
                      <Button onClick={startLiveNavigation} className="w-full bg-transparent" variant="outline">
                        <Navigation className="h-4 w-4 mr-2" />
                        Start Live Navigation
                      </Button>
                    )}

                    {/* Direct live navigation from current location */}
                    {currentLocation && !navigationState && (
                      <Button
                        onClick={startLiveNavigationFromCurrentLocation}
                        className="w-full bg-transparent"
                        variant="outline"
                      >
                        <Target className="h-4 w-4 mr-2" />
                        Navigate Here Now
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions for Current Location */}
            {currentLocation && !selectedBuilding && (
              <Card className="shadow-medium hover:shadow-strong shadow-glow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crosshair className="h-5 w-5 text-blue-600" />
                    Quick Actions
                  </CardTitle>
                  <CardDescription>Use your current location for navigation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button onClick={setCurrentLocationAsStart} variant="outline" className="w-full bg-transparent">
                    <Target className="h-4 w-4 mr-2" />
                    Set as Starting Point
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Select a destination building to navigate from your current location
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Map Area */}
          <div className="lg:col-span-3">
            <Card className="h-[600px] shadow-medium hover:shadow-strong">
              <CardHeader>
                <CardTitle>Manipal University Jaipur Campus Map</CardTitle>
                <CardDescription>Click on buildings to view details and plan your route across campus</CardDescription>
              </CardHeader>
              <CardContent className="h-full p-0">
                <div className="h-full rounded-lg overflow-hidden">
                  <CampusMap
                    buildings={buildings}
                    selectedBuilding={selectedBuilding}
                    onBuildingClick={handleBuildingClick}
                    navigationFrom={navigationFrom}
                    navigationTo={navigationTo}
                    mapStyle={mapStyle}
                    categoryColors={categoryColors}
                    onRouteCalculated={handleRouteCalculated}
                    currentLocation={currentLocation}
                    navigationState={navigationState}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Legend */}
            <Card className="mt-4 shadow-soft hover:shadow-medium">
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-4">
                  {categories.map((category) => {
                    const Icon = categoryIcons[category]
                    return (
                      <div key={category} className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: categoryColors[category] }} />
                        <Icon className="h-4 w-4" />
                        <span className="text-sm capitalize">{category}</span>
                      </div>
                    )
                  })}
                  {currentLocation && (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-blue-500" />
                      <Crosshair className="h-4 w-4" />
                      <span className="text-sm">My Location</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
