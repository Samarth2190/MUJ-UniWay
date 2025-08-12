// Routing service API keys
const ORS_API_KEY = process.env.NEXT_PUBLIC_ORS_API_KEY
const GRAPHHOPPER_API_KEY = process.env.NEXT_PUBLIC_GRAPHHOPPER_API_KEY // Optional

export interface RoutePoint {
  lat: number
  lng: number
}

export const ROUTING_REVISION = "direct-v2"

export interface RouteResponse {
  coordinates: [number, number][]
  distance: number // in meters
  duration: number // in seconds
  instructions: string[]
  isRealRoute: boolean // indicates if this is a real route or fallback
}

// Enhanced routing with heuristic: prefer real routes if efficient, else direct campus line
export async function getWalkingRoute(start: RoutePoint, end: RoutePoint): Promise<RouteResponse | null> {
  console.log("Getting walking route from", start, "to", end)

  const DIRECT_ROUTE_PENALTY_RATIO = 1.01 // prefer direct unless real route is within 1% of straight line

  const directRoute = getEnhancedSimulatedRoute(start, end)
  const straightLine = calculateStraightLineDistance(start, end)

  // Gather the first successful real route (ORS → OSRM → GraphHopper)
  let realRoute: RouteResponse | null = null

  try {
    const ors = await getOpenRouteServiceRoute(start, end)
    if (ors) realRoute = ors
  } catch (error: any) {
    console.warn("OpenRouteService failed:", (error && error.message) || error)
  }

  // if (!realRoute) {
  //   try {
  //     const osrm = await getOSRMRoute(start, end)
  //     if (osrm) realRoute = osrm
  //   } catch (error: any) {
  //     console.warn("OSRM failed:", (error && error.message) || error)
  //   }
  // }

  if (!realRoute && GRAPHHOPPER_API_KEY) {
    try {
      const gh = await getGraphHopperRoute(start, end)
      if (gh) realRoute = gh
    } catch (error: any) {
      console.warn("GraphHopper failed:", (error && error.message) || error)
    }
  }

  // If we have a real route but it is inefficient compared to straight line, use direct route
  // if (realRoute) {
  //   const isEfficient = realRoute.distance <= straightLine * DIRECT_ROUTE_PENALTY_RATIO
  //   if (isEfficient) {
  //     console.log("Using efficient real route (distance:", realRoute.distance, ")")
  //     return { ...realRoute, isRealRoute: true }
  //   } else {
  //     console.log("Real route too long; using direct campus route instead")
  //     return { ...directRoute, isRealRoute: false }
  //   }
  // }

  if (realRoute) {
    console.log("Using real route")
    return { ...realRoute, isRealRoute: true }
  }

  // No real route available → direct
  console.log("No real routing available; using direct campus route")
  return directRoute
}

async function getOpenRouteServiceRoute(start: RoutePoint, end: RoutePoint): Promise<RouteResponse | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

  try {
    console.log("Trying OpenRouteService...")

    const response = await fetch("https://api.openrouteservice.org/v2/directions/foot-walking/geojson", {
      method: "POST",
      headers: {
        Accept: "application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8",
        Authorization: ORS_API_KEY,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        coordinates: [
          [start.lng, start.lat],
          [end.lng, end.lat],
        ],
        format: "geojson",
        instructions: true,
        language: "en",
        geometry_simplify: false,
        continue_straight: false,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("ORS API Error:", response.status, errorText)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    if (data.features && data.features[0] && data.features[0].geometry) {
      const route = data.features[0]
      const coordinates = route.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => [lat, lng] as [number, number],
      )

      const segment = route.properties.segments[0]
      const instructions = segment.steps?.map((step: any) => step.instruction) || [
        "Head towards your destination",
        "Continue on the path",
        "You have arrived",
      ]

      return {
        coordinates,
        distance: segment.distance,
        duration: segment.duration,
        instructions,
        isRealRoute: true,
      }
    }

    return null
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error && error.name === "AbortError") {
      throw new Error("Request timeout")
    }
    throw error
  }
}

// OSRM routing service (free and open source, no API key required)
async function getOSRMRoute(start: RoutePoint, end: RoutePoint): Promise<RouteResponse | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000) // 8 second timeout

  try {
    console.log("Trying OSRM...")

    const response = await fetch(
      `https://router.project-osrm.org/route/v1/foot/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true&annotations=true`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      },
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()

    if (data.routes && data.routes[0] && data.routes[0].geometry) {
      const route = data.routes[0]
      const coordinates = route.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => [lat, lng] as [number, number],
      )

      // Extract turn-by-turn instructions
      const instructions: string[] = []
      if (route.legs && route.legs[0] && route.legs[0].steps) {
        route.legs[0].steps.forEach((step: any) => {
          if (step.maneuver && step.maneuver.instruction) {
            instructions.push(step.maneuver.instruction)
          }
        })
      }

      // Fallback instructions if none provided
      if (instructions.length === 0) {
        instructions.push(
          "Head towards your destination following available paths",
          "Continue along the route",
          "Turn as needed to stay on walkable paths",
          "You have arrived at your destination",
        )
      }

      return {
        coordinates,
        distance: route.distance,
        duration: route.duration,
        instructions,
        isRealRoute: true,
      }
    }

    return null
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error && error.name === "AbortError") {
      throw new Error("Request timeout")
    }
    console.error("OSRM error:", error)
    throw error
  }
}

// GraphHopper routing service (requires API key)
async function getGraphHopperRoute(start: RoutePoint, end: RoutePoint): Promise<RouteResponse | null> {
  if (!GRAPHHOPPER_API_KEY) {
    throw new Error("GraphHopper API key not available")
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)

  try {
    console.log("Trying GraphHopper...")

    const response = await fetch(
      `https://graphhopper.com/api/1/route?point=${start.lat},${start.lng}&point=${end.lat},${end.lng}&vehicle=foot&locale=en&instructions=true&calc_points=true&debug=false&elevation=false&points_encoded=false&key=${GRAPHHOPPER_API_KEY}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      },
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("GraphHopper API Error:", response.status, errorText)
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()

    if (data.paths && data.paths[0]) {
      const path = data.paths[0]
      const coordinates = path.points.coordinates.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number])

      const instructions = path.instructions?.map((inst: any) => inst.text) || [
        "Head towards your destination",
        "Continue on the path",
        "You have arrived",
      ]

      return {
        coordinates,
        distance: path.distance,
        duration: path.time / 1000, // Convert from milliseconds
        instructions,
        isRealRoute: true,
      }
    }

    return null
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error && error.name === "AbortError") {
      throw new Error("Request timeout")
    }
    throw error
  }
}

// Enhanced simulated route that prefers the most direct, walkable path on campus
function getEnhancedSimulatedRoute(start: RoutePoint, end: RoutePoint): RouteResponse {
  console.log("Creating direct simulated campus route")

  const coordinates: [number, number][] = []

  // Interpolate a straight line between start and end so the path is optimal
  const segments = 20
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const lat = start.lat + (end.lat - start.lat) * t
    const lng = start.lng + (end.lng - start.lng) * t
    coordinates.push([lat, lng])
  }

  // Distance: straight-line for optimal path
  const straightLineDistance = calculateStraightLineDistance(start, end)

  // Simple turn-by-turn style instructions for the UI
  const instructions = [
    "Head towards your destination",
    "Proceed on the most direct path",
    "Continue straight",
    "You have arrived",
  ]

  return {
    coordinates,
    distance: straightLineDistance,
    duration: straightLineDistance / 1.4, // Walking speed ~1.4 m/s (5 km/h)
    instructions,
    isRealRoute: false,
  }
}

// Calculate straight line distance between two points
export function calculateStraightLineDistance(start: RoutePoint, end: RoutePoint): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (start.lat * Math.PI) / 180
  const φ2 = (end.lat * Math.PI) / 180
  const Δφ = ((end.lat - start.lat) * Math.PI) / 180
  const Δλ = ((end.lng - start.lng) * Math.PI) / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`
  }
  return `${(meters / 1000).toFixed(1)}km`
}

export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}
