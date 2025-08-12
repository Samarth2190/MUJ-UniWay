"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { getWalkingRoute, type RouteResponse } from "@/lib/routing"
import type { LocationCoordinates } from "@/lib/geolocation"
import type { NavigationState } from "@/lib/navigation"

// Fix for default markers in Leaflet with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
})

interface Building {
  id: number
  name: string
  category: string
  description: string
  hours?: string
  phone?: string
  website?: string
  lat: number
  lng: number
  x?: number
  y?: number
  services: string[]
}

interface CampusMapProps {
  buildings: Building[]
  selectedBuilding: Building | null
  onBuildingClick: (building: Building) => void
  navigationFrom: Building | null
  navigationTo: Building | null
  mapStyle: string
  categoryColors: Record<string, string>
  onRouteCalculated?: (route: RouteResponse | null) => void
  currentLocation?: LocationCoordinates | null
  navigationState?: NavigationState | null
}

export default function CampusMap({
  buildings,
  selectedBuilding,
  onBuildingClick,
  navigationFrom,
  navigationTo,
  mapStyle,
  categoryColors,
  onRouteCalculated,
  currentLocation,
  navigationState,
}: CampusMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const markersRef = useRef<L.LayerGroup | null>(null)
  const routeLayerRef = useRef<L.LayerGroup | null>(null)
  const locationMarkerRef = useRef<L.Marker | null>(null)
  const accuracyCircleRef = useRef<L.Circle | null>(null)
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false)
  const [routeStatus, setRouteStatus] = useState<string | null>(null)
  const [mapInitialized, setMapInitialized] = useState(false)
  const [currentRouteRef, setCurrentRouteRef] = useState<string | null>(null)

  // Manipal University Jaipur campus center coordinates
  const campusCenter: [number, number] = [26.843, 75.5645]

  // Add CSS to fix Leaflet issues
  useEffect(() => {
    // Inject CSS to fix potential Leaflet styling issues
    const style = document.createElement("style")
    style.textContent = `
    .leaflet-container {
      background: #f8f9fa;
    }
    .leaflet-tile-pane {
      opacity: 1;
    }
    .leaflet-fade-anim .leaflet-tile {
      will-change: auto !important;
    }
    .custom-marker {
      background: transparent !important;
      border: none !important;
    }
    .current-location-marker {
      background: transparent !important;
      border: none !important;
    }
    .route-start-marker, .route-end-marker, .destination-marker {
      background: transparent !important;
      border: none !important;
    }
  `
    document.head.appendChild(style)

    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style)
      }
    }
  }, [])

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapInitialized) return

    // Ensure container is properly sized
    const container = mapContainerRef.current
    if (container.offsetWidth === 0 || container.offsetHeight === 0) {
      console.warn("Map container has no dimensions, retrying...")
      const retryTimeout = setTimeout(() => {
        setMapInitialized(false)
      }, 100)
      return () => clearTimeout(retryTimeout)
    }

    try {
      // Clear any existing map instance
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }

      // Create map instance with error handling
      const map = L.map(container, {
        center: campusCenter,
        zoom: 17,
        zoomControl: true,
        attributionControl: true,
        preferCanvas: false,
        fadeAnimation: false,
        zoomAnimation: false,
        markerZoomAnimation: false,
      })

      // Add error handling for map events
      map.on("error", (e: any) => {
        console.error("Map error:", e)
      })

      // Add tile layers with error handling
      const streetLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        errorTileUrl:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      })

      const satelliteLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "© Esri",
          maxZoom: 19,
          errorTileUrl:
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        },
      )

      // Add error handlers for tile layers
      streetLayer.on("tileerror", (e: any) => {
        console.warn("Street tile error:", e)
      })

      satelliteLayer.on("tileerror", (e: any) => {
        console.warn("Satellite tile error:", e)
      })

      // Add default layer
      streetLayer.addTo(map)

      // Store layers for switching
      ;(map as any)._streetLayer = streetLayer
      ;(map as any)._satelliteLayer = satelliteLayer

      // Initialize layer groups with error handling
      const markersLayer = L.layerGroup()
      const routeLayer = L.layerGroup()

      // Add layers to map
      markersLayer.addTo(map)
      routeLayer.addTo(map)

      // Store references
      mapRef.current = map
      markersRef.current = markersLayer
      routeLayerRef.current = routeLayer

      // Wait for map to be ready
      map.whenReady(() => {
        setMapInitialized(true)
        console.log("Map initialized successfully")
      })
    } catch (error) {
      console.error("Error initializing map:", error)
      setMapInitialized(false)
    }

    // Cleanup function
    return () => {
      if (mapRef.current) {
        try {
          // Clear all layers first
          if (markersRef.current) {
            markersRef.current.clearLayers()
          }
          if (routeLayerRef.current) {
            routeLayerRef.current.clearLayers()
          }
          if (locationMarkerRef.current) {
            mapRef.current.removeLayer(locationMarkerRef.current)
          }
          if (accuracyCircleRef.current) {
            mapRef.current.removeLayer(accuracyCircleRef.current)
          }

          // Remove map instance
          mapRef.current.off() // Remove all event listeners
          mapRef.current.remove()
        } catch (error) {
          console.error("Error cleaning up map:", error)
        }

        // Reset all references
        mapRef.current = null
        markersRef.current = null
        routeLayerRef.current = null
        locationMarkerRef.current = null
        accuracyCircleRef.current = null
        setMapInitialized(false)
      }
    }
  }, [])

  // Add a separate effect to handle container resize
  useEffect(() => {
    if (!mapRef.current || !mapInitialized) return

    const handleResize = () => {
      if (mapRef.current) {
        try {
          mapRef.current.invalidateSize()
        } catch (error) {
          console.error("Error resizing map:", error)
        }
      }
    }

    // Invalidate size after a short delay to ensure container is properly sized
    const resizeTimeout = setTimeout(handleResize, 100)

    window.addEventListener("resize", handleResize)

    return () => {
      clearTimeout(resizeTimeout)
      window.removeEventListener("resize", handleResize)
    }
  }, [mapInitialized])

  // Handle map style changes
  useEffect(() => {
    if (!mapRef.current || !mapInitialized) return

    try {
      const map = mapRef.current as any

      // Safely switch layers
      if (mapStyle === "satellite") {
        if (map._streetLayer && map.hasLayer(map._streetLayer)) {
          map.removeLayer(map._streetLayer)
        }
        if (map._satelliteLayer && !map.hasLayer(map._satelliteLayer)) {
          map.addLayer(map._satelliteLayer)
        }
      } else {
        if (map._satelliteLayer && map.hasLayer(map._satelliteLayer)) {
          map.removeLayer(map._satelliteLayer)
        }
        if (map._streetLayer && !map.hasLayer(map._streetLayer)) {
          map.addLayer(map._streetLayer)
        }
      }

      // Invalidate size after layer change
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize()
        }
      }, 100)
    } catch (error) {
      console.error("Error switching map style:", error)
    }
  }, [mapStyle, mapInitialized])

  // Update current location marker
  useEffect(() => {
    if (!mapRef.current || !mapInitialized) return

    try {
      if (currentLocation) {
        const { lat, lng, accuracy, heading } = currentLocation

        // Remove existing location marker and accuracy circle safely
        if (locationMarkerRef.current && mapRef.current.hasLayer(locationMarkerRef.current)) {
          mapRef.current.removeLayer(locationMarkerRef.current)
        }
        if (accuracyCircleRef.current && mapRef.current.hasLayer(accuracyCircleRef.current)) {
          mapRef.current.removeLayer(accuracyCircleRef.current)
        }

        // Create accuracy circle
        accuracyCircleRef.current = L.circle([lat, lng], {
          radius: accuracy,
          fillColor: "#3b82f6",
          fillOpacity: 0.1,
          color: "#3b82f6",
          weight: 1,
          opacity: 0.3,
        })

        // Create location marker with direction indicator
        const locationIcon = L.divIcon({
          html: `
            <div style="
              position: relative;
              width: 20px;
              height: 20px;
            ">
              <div style="
                width: 20px;
                height: 20px;
                background: #3b82f6;
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                position: absolute;
                top: 0;
                left: 0;
              "></div>
              ${
                heading !== undefined
                  ? `<div style="
                      width: 0;
                      height: 0;
                      border-left: 4px solid transparent;
                      border-right: 4px solid transparent;
                      border-bottom: 12px solid #1d4ed8;
                      position: absolute;
                      top: -8px;
                      left: 6px;
                      transform: rotate(${heading}deg);
                      transform-origin: 4px 16px;
                    "></div>`
                  : ""
              }
            </div>
          `,
          className: "current-location-marker",
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        })

        locationMarkerRef.current = L.marker([lat, lng], { icon: locationIcon }).bindPopup(
          `
            <div class="p-2">
              <h4 class="font-bold text-sm mb-1">Your Location</h4>
              <p class="text-xs text-gray-600">Accuracy: ±${Math.round(accuracy)}m</p>
              ${heading !== undefined ? `<p class="text-xs text-gray-600">Heading: ${Math.round(heading)}°</p>` : ""}
            </div>
          `,
          { closeButton: false, offset: [0, -10] },
        )

        // Add to map safely
        if (mapRef.current) {
          accuracyCircleRef.current.addTo(mapRef.current)
          locationMarkerRef.current.addTo(mapRef.current)
        }
      } else {
        // Remove location marker if no current location
        if (locationMarkerRef.current && mapRef.current.hasLayer(locationMarkerRef.current)) {
          mapRef.current.removeLayer(locationMarkerRef.current)
          locationMarkerRef.current = null
        }
        if (accuracyCircleRef.current && mapRef.current.hasLayer(accuracyCircleRef.current)) {
          mapRef.current.removeLayer(accuracyCircleRef.current)
          accuracyCircleRef.current = null
        }
      }
    } catch (error) {
      console.error("Error updating location marker:", error)
    }
  }, [currentLocation, mapInitialized])

  // Memoized function to get building coordinates
  const getBuildingCoordinates = useCallback(
    (building: Building): [number, number] => {
      if (building.lat && building.lng && !isNaN(Number(building.lat)) && !isNaN(Number(building.lng))) {
        return [Number(building.lat), Number(building.lng)]
      }
      // Fallback to x,y conversion if lat/lng not available (relative to MUJ campus)
      const lat = campusCenter[0] + ((building.y || 225) - 225) * 0.00005
      const lng = campusCenter[1] + ((building.x || 300) - 300) * 0.00005
      return [lat, lng]
    },
    [campusCenter],
  )

  // Update markers when buildings change
  useEffect(() => {
    if (!mapRef.current || !markersRef.current || !buildings.length || !mapInitialized) return

    try {
      // Clear existing markers safely
      markersRef.current.clearLayers()

      // Add building markers
      buildings.forEach((building) => {
        try {
          const [lat, lng] = getBuildingCoordinates(building)

          // Validate coordinates
          if (isNaN(lat) || isNaN(lng)) {
            console.warn(`Invalid coordinates for building ${building.name}:`, lat, lng)
            return
          }

          // Update building object with coordinates for routing
          building.lat = lat
          building.lng = lng

          // Create custom icon based on category
          const isSelected = selectedBuilding?.id === building.id
          const isNavigationPoint = navigationFrom?.id === building.id || navigationTo?.id === building.id

          const iconHtml = `
            <div style="
              background-color: ${categoryColors[building.category] || "#6b7280"};
              width: 32px;
              height: 32px;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 12px;
              ${isSelected ? "transform: scale(1.2); border-color: #1f2937;" : ""}
              ${isNavigationPoint ? "border-color: #3b82f6; border-width: 4px;" : ""}
            ">
              ${building.name.charAt(0)}
            </div>
          `

          const customIcon = L.divIcon({
            html: iconHtml,
            className: "custom-marker",
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          })

          const marker = L.marker([lat, lng], { icon: customIcon })
            .bindPopup(
              `
              <div class="p-3 max-w-xs">
                <h3 class="font-bold text-sm mb-1">${building.name}</h3>
                <p class="text-xs text-gray-600 mb-2">${building.description || "No description available"}</p>
                <div class="text-xs mb-2">
                  <span class="inline-block px-2 py-1 bg-gray-100 rounded text-gray-700">
                    ${building.category}
                  </span>
                </div>
                ${building.hours ? `<div class="text-xs text-gray-500">⏰ ${building.hours}</div>` : ""}
                ${building.phone ? `<div class="text-xs text-gray-500">📞 ${building.phone}</div>` : ""}
              </div>
            `,
              {
                closeButton: false,
                offset: [0, -16],
                maxWidth: 300,
              },
            )
            .on("click", () => {
              onBuildingClick(building)
            })

          if (markersRef.current) {
            markersRef.current.addLayer(marker)
          }
        } catch (error) {
          console.error(`Error adding marker for building ${building.name}:`, error)
        }
      })
    } catch (error) {
      console.error("Error updating markers:", error)
    }
  }, [
    buildings,
    selectedBuilding,
    navigationFrom,
    navigationTo,
    categoryColors,
    onBuildingClick,
    getBuildingCoordinates,
    mapInitialized,
  ])

  // Create route with improved error handling
  const createRoute = useCallback(
    async (fromBuilding: Building, toBuilding: Building) => {
      if (!routeLayerRef.current || !mapRef.current || !mapInitialized) return

      const routeKey = `${fromBuilding.id}-${toBuilding.id}`

      // Prevent duplicate route calculations
      if (currentRouteRef === routeKey) {
        return
      }

      console.log(`Creating walking route: ${fromBuilding.name} -> ${toBuilding.name}`)

      setCurrentRouteRef(routeKey)
      setIsCalculatingRoute(true)
      setRouteStatus("Finding best walking route on campus...")

      try {
        // Clear existing route
        routeLayerRef.current.clearLayers()

        const startCoords = getBuildingCoordinates(fromBuilding)
        const endCoords = getBuildingCoordinates(toBuilding)

        console.log("Start coords:", startCoords)
        console.log("End coords:", endCoords)

        // Get walking route using routing services
        const route = await getWalkingRoute(
          { lat: startCoords[0], lng: startCoords[1] },
          { lat: endCoords[0], lng: endCoords[1] },
        )

        if (route && route.coordinates.length > 0) {
          console.log(`Route calculated with ${route.coordinates.length} points, isReal: ${route.isRealRoute}`)

          // Determine route appearance based on whether it's a real route
          const routeColor = route.isRealRoute ? "#3b82f6" : "#10b981"
          const routeWeight = 5
          const routeOpacity = 0.9
          const dashArray = undefined

          // Create route polyline
          const routeLine = L.polyline(route.coordinates, {
            color: routeColor,
            weight: routeWeight,
            opacity: routeOpacity,
            smoothFactor: 1,
            dashArray: dashArray,
          })

          // Create start marker - special handling for current location
          const startIcon = L.divIcon({
            html:
              fromBuilding.id === -1
                ? `<div style="background: #3b82f6; color: white; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">📍</div>`
                : `<div style="background: #10b981; color: white; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">A</div>`,
            className: "route-start-marker",
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          })

          // Create end marker
          const endIcon = L.divIcon({
            html: `<div style="background: #ef4444; color: white; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">B</div>`,
            className: "route-end-marker",
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          })

          const startMarker = L.marker(startCoords, { icon: startIcon })
          const endMarker = L.marker(endCoords, { icon: endIcon })

          // Add all elements to route layer
          routeLayerRef.current.addLayer(routeLine)
          routeLayerRef.current.addLayer(startMarker)
          routeLayerRef.current.addLayer(endMarker)

          console.log("Route added to map successfully")

          // Fit map to show the route with error handling
          try {
            const bounds = routeLine.getBounds()
            if (bounds.isValid()) {
              mapRef.current.fitBounds(bounds, { padding: [30, 30] })
            }
          } catch (error) {
            console.error("Error fitting bounds:", error)
          }

          // Set status message
          if (route.isRealRoute) {
            setRouteStatus("✅ Real campus walking route found")
          } else {
            setRouteStatus("⚠️ Using simulated campus route")
          }

          // Notify parent component
          onRouteCalculated?.(route)
        } else {
          throw new Error("No route could be calculated")
        }
      } catch (error) {
        console.error("Route creation failed:", error)
        setRouteStatus("❌ Failed to calculate route")
        setCurrentRouteRef(null)
      } finally {
        setIsCalculatingRoute(false)
        // Clear status after 3 seconds
        setTimeout(() => setRouteStatus(null), 3000)
      }
    },
    [getBuildingCoordinates, onRouteCalculated, mapInitialized],
  )

  // Handle navigation route changes with debouncing
  useEffect(() => {
    if (!mapInitialized) return

    if (navigationFrom && navigationTo) {
      // Small delay to prevent rapid updates
      const timeoutId = setTimeout(() => {
        createRoute(navigationFrom, navigationTo)
      }, 300)

      return () => {
        clearTimeout(timeoutId)
      }
    } else {
      // Clear route when navigation is cleared
      if (routeLayerRef.current) {
        try {
          routeLayerRef.current.clearLayers()
        } catch (error) {
          console.error("Error clearing route:", error)
        }
      }
      setCurrentRouteRef(null)
      setIsCalculatingRoute(false)
      setRouteStatus(null)
      onRouteCalculated?.(null)
    }
  }, [navigationFrom, navigationTo, createRoute, mapInitialized, onRouteCalculated])

  // Update navigation route display
  useEffect(() => {
    if (!navigationState?.route || !routeLayerRef.current || !mapInitialized) return

    try {
      // Clear existing route
      routeLayerRef.current.clearLayers()

      const route = navigationState.route
      const routeColor = navigationState.isOffRoute ? "#ef4444" : "#3b82f6"
      const routeWeight = 5
      const routeOpacity = 0.8

      // Create route polyline
      const routeLine = L.polyline(route.coordinates, {
        color: routeColor,
        weight: routeWeight,
        opacity: routeOpacity,
        smoothFactor: 1,
      })

      routeLayerRef.current.addLayer(routeLine)

      // Add destination marker
      const destCoords = [navigationState.destination.lat, navigationState.destination.lng] as [number, number]
      const destIcon = L.divIcon({
        html: `<div style="background: #ef4444; color: white; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">🎯</div>`,
        className: "destination-marker",
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      })

      const destMarker = L.marker(destCoords, { icon: destIcon })
      routeLayerRef.current.addLayer(destMarker)
    } catch (error) {
      console.error("Error updating navigation route:", error)
    }
  }, [navigationState, mapInitialized])

  // Center map on selected building
  useEffect(() => {
    if (selectedBuilding && mapRef.current && mapInitialized) {
      try {
        const [lat, lng] = getBuildingCoordinates(selectedBuilding)
        mapRef.current.setView([lat, lng], 18, {
          animate: true,
          duration: 0.5,
        })
      } catch (error) {
        console.error("Error centering map on building:", error)
      }
    }
  }, [selectedBuilding, getBuildingCoordinates, mapInitialized])

  // Center map on current location when tracking starts
  useEffect(() => {
    if (currentLocation && mapRef.current && mapInitialized) {
      // Only center if we don't have a selected building
      if (!selectedBuilding) {
        mapRef.current.setView([currentLocation.lat, currentLocation.lng], 18, {
          animate: true,
          duration: 0.5,
        })
      }
    }
  }, [currentLocation, selectedBuilding, mapInitialized])

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full min-h-[500px]" />

      {/* Loading indicator */}
      {isCalculatingRoute && (
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg z-[1000]">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm font-medium">Finding campus route...</span>
          </div>
        </div>
      )}

      {/* Route status indicator */}
      {routeStatus && !isCalculatingRoute && (
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg z-[1000] border">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{routeStatus}</span>
          </div>
        </div>
      )}

      {/* Navigation info */}
      {navigationFrom && navigationTo && !isCalculatingRoute && !navigationState && (
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg z-[1000] border">
          <div className="text-sm">
            <div className="font-medium text-gray-900 mb-1">🗺️ MUJ Campus Route</div>
            <div className="text-gray-600">
              <span
                className={`inline-block w-4 h-4 rounded-full mr-2 ${navigationFrom.id === -1 ? "bg-blue-500" : "bg-green-500"}`}
              ></span>
              <span className="font-medium">{navigationFrom.name}</span>
            </div>
            <div className="text-gray-600">
              <span className="inline-block w-4 h-4 bg-red-500 rounded-full mr-2"></span>
              <span className="font-medium">{navigationTo.name}</span>
            </div>
          </div>
        </div>
      )}

      {/* Active navigation info */}
      {navigationState && (
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg z-[1000] border">
          <div className="text-sm">
            <div className="font-medium text-gray-900 mb-1">
              🧭 Active Navigation
              {navigationState.isOffRoute && <span className="text-red-600 ml-2">(Off Route)</span>}
            </div>
            <div className="text-gray-600">
              <span className="inline-block w-4 h-4 bg-blue-500 rounded-full mr-2"></span>
              <span className="font-medium">Your Location</span>
            </div>
            <div className="text-gray-600">
              <span className="inline-block w-4 h-4 bg-red-500 rounded-full mr-2"></span>
              <span className="font-medium">Destination</span>
            </div>
          </div>
        </div>
      )}

      {/* Campus info overlay */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg z-[1000] border">
        <div className="text-sm">
          <div className="font-bold text-gray-900">Manipal University Jaipur</div>
          <div className="text-gray-600">Campus Navigator</div>
          {currentLocation && <div className="text-xs text-green-600 mt-1">📍 Live Location Active</div>}
        </div>
      </div>

      {/* Map initialization indicator */}
      {!mapInitialized && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Initializing campus map...</p>
          </div>
        </div>
      )}
    </div>
  )
}
