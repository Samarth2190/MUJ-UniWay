export interface LocationCoordinates {
  lat: number;
  lng: number;
  accuracy: number;
  heading?: number;
  speed?: number;
}

export interface LocationError {
  code: number;
  message: string;
}

export interface LocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export class LocationService {
  private watchId: number | null = null;
  private callbacks: Set<(location: LocationCoordinates) => void> = new Set();
  private errorCallbacks: Set<(error: LocationError) => void> = new Set();
  private lastKnownLocation: LocationCoordinates | null = null;
  private lastUpdateTimestampMs: number | null = null;

  // Advanced filtering/smoothing configuration
  private accuracyThresholdMeters: number = 50; // reject very imprecise readings
  private smoothingFactor: number = 0.25; // EMA factor for lat/lng smoothing
  private rejectJumpMeters: number = 120; // drop implausible jumps between updates

  constructor() {
    // Only check geolocation support in browser environment
    if (typeof window !== "undefined") {
      this.checkGeolocationSupport();
    }
  }

  private checkGeolocationSupport(): boolean {
    if (typeof window === "undefined" || !navigator.geolocation) {
      console.error("Geolocation is not supported by this browser");
      return false;
    }
    return true;
  }

  // Get current position once
  async getCurrentPosition(
    options?: LocationOptions
  ): Promise<LocationCoordinates> {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined") {
        reject(new Error("Geolocation not available in server environment"));
        return;
      }

      if (!this.checkGeolocationSupport()) {
        reject(new Error("Geolocation not supported"));
        return;
      }

      const defaultOptions: PositionOptions = {
        enableHighAccuracy: false,
        timeout: 60000,
        maximumAge: 5000, // force a fresh fix; cached readings are often inaccurate
        ...options,
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: LocationCoordinates = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined,
          };
          const filtered = this.applyFilters(location) ?? location;
          this.lastKnownLocation = filtered;
          this.lastUpdateTimestampMs = Date.now();
          resolve(filtered);
        },
        (error) => {
          const locationError: LocationError = {
            code: error.code,
            message: this.getErrorMessage(error.code),
          };
          reject(locationError);
        },
        defaultOptions
      );
    });
  }

  // Start watching position
  startWatching(options?: LocationOptions): void {
    if (typeof window === "undefined") {
      console.warn("Cannot start watching location in server environment");
      return;
    }

    if (!this.checkGeolocationSupport()) {
      return;
    }

    if (this.watchId !== null) {
      this.stopWatching();
    }

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: false,
      timeout: 60000,
      maximumAge: 5000, // prefer fresh over cached while watching
      ...options,
    };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const rawLocation: LocationCoordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading || undefined,
          speed: position.coords.speed || undefined,
        };
        const filtered = this.applyFilters(rawLocation);
        if (!filtered) {
          // Drop low-quality update silently
          return;
        }
        this.lastKnownLocation = filtered;
        this.lastUpdateTimestampMs = Date.now();
        this.callbacks.forEach((callback) => callback(filtered));
      },
      (error) => {
        const locationError: LocationError = {
          code: error.code,
          message: this.getErrorMessage(error.code),
        };
        this.errorCallbacks.forEach((callback) => callback(locationError));
      },
      defaultOptions
    );
  }

  // Stop watching position
  stopWatching(): void {
    if (typeof window === "undefined") {
      return;
    }

    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  // Subscribe to location updates
  onLocationUpdate(
    callback: (location: LocationCoordinates) => void
  ): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  // Subscribe to location errors
  onLocationError(callback: (error: LocationError) => void): () => void {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }

  // Get last known location
  getLastKnownLocation(): LocationCoordinates | null {
    return this.lastKnownLocation;
  }

  // Get timestamp of last known location
  getLastUpdateTimestampMs(): number | null {
    return this.lastUpdateTimestampMs;
  }

  // Check if currently watching
  isWatching(): boolean {
    return this.watchId !== null;
  }

  private getErrorMessage(code: number): string {
    switch (code) {
      case 1:
        return "Location access denied by user";
      case 2:
        return "Location information unavailable";
      case 3:
        return "Location request timeout";
      default:
        return "Unknown location error";
    }
  }

  // Basic quality filter + smoothing to reduce jitter and poor fixes
  private applyFilters(next: LocationCoordinates): LocationCoordinates | null {
    const nowMs = Date.now();

    // Reject extremely imprecise readings outright if we have a decent last fix
    if (
      this.lastKnownLocation &&
      next.accuracy >
        Math.max(
          this.accuracyThresholdMeters,
          this.lastKnownLocation.accuracy + 25
        )
    ) {
      // If accuracy is getting much worse and we already have a fix, ignore this update
      return null;
    }

    // Reject implausible jumps given short intervals
    if (this.lastKnownLocation && this.lastUpdateTimestampMs) {
      const dtSec = Math.max(0.5, (nowMs - this.lastUpdateTimestampMs) / 1000);
      const distance = LocationService.calculateDistance(
        this.lastKnownLocation,
        next
      );
      const maxJump = this.rejectJumpMeters + (next.accuracy || 0);
      if (distance > maxJump && dtSec < 3) {
        // Likely a GPS spike
        return null;
      }
    }

    // Smooth lat/lng to reduce jitter when walking
    if (this.lastKnownLocation) {
      const alpha = this.smoothingFactor;
      const smoothed: LocationCoordinates = {
        lat: this.lastKnownLocation.lat * (1 - alpha) + next.lat * alpha,
        lng: this.lastKnownLocation.lng * (1 - alpha) + next.lng * alpha,
        // Keep the better (lower) accuracy reading
        accuracy: Math.min(this.lastKnownLocation.accuracy, next.accuracy),
        heading:
          next.heading !== undefined
            ? next.heading
            : this.lastKnownLocation.heading,
        speed:
          next.speed !== undefined ? next.speed : this.lastKnownLocation.speed,
      };
      return smoothed;
    }

    return next;
  }

  // Allow runtime tuning of filters if needed by the UI
  setAdvancedOptions(options: {
    accuracyThresholdMeters?: number;
    smoothingFactor?: number;
    rejectJumpMeters?: number;
  }): void {
    if (typeof options.accuracyThresholdMeters === "number") {
      this.accuracyThresholdMeters = Math.max(
        5,
        options.accuracyThresholdMeters
      );
    }
    if (typeof options.smoothingFactor === "number") {
      this.smoothingFactor = Math.min(
        0.9,
        Math.max(0, options.smoothingFactor)
      );
    }
    if (typeof options.rejectJumpMeters === "number") {
      this.rejectJumpMeters = Math.max(20, options.rejectJumpMeters);
    }
  }

  // Calculate distance between two points
  static calculateDistance(
    point1: LocationCoordinates,
    point2: LocationCoordinates
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (point1.lat * Math.PI) / 180;
    const φ2 = (point2.lat * Math.PI) / 180;
    const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
    const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  // Calculate bearing between two points
  static calculateBearing(
    point1: LocationCoordinates,
    point2: LocationCoordinates
  ): number {
    const φ1 = (point1.lat * Math.PI) / 180;
    const φ2 = (point2.lat * Math.PI) / 180;
    const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x =
      Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    const bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360;
  }
}

// Global location service instance
export const locationService = new LocationService();
