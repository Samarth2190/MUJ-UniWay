import {
  type LocationCoordinates,
  locationService,
  LocationService,
} from "./geolocation";
import type { RouteResponse, RoutePoint } from "./routing";

export interface NavigationStep {
  instruction: string;
  distance: number;
  duration: number;
  coordinates: [number, number][];
  maneuver?: string;
  direction?: string;
}

export interface NavigationState {
  isNavigating: boolean;
  currentStep: number;
  totalSteps: number;
  remainingDistance: number;
  remainingTime: number;
  nextInstruction: string;
  currentLocation: LocationCoordinates | null;
  destination: RoutePoint;
  route: RouteResponse | null;
  isOffRoute: boolean;
  recalculatingRoute: boolean;
}

export interface VoiceSettings {
  enabled: boolean;
  language: string;
  rate: number;
  pitch: number;
  volume: number;
}

export class NavigationService {
  private navigationState: NavigationState | null = null;
  private callbacks: Set<(state: NavigationState) => void> = new Set();
  private voiceSettings: VoiceSettings = {
    enabled: true,
    language: "en-US",
    rate: 1.0,
    pitch: 1.0,
    volume: 0.8,
  };
  private lastAnnouncedStep = -1;
  private offRouteThreshold = 25; // meters
  private recalculateThreshold = 50; // meters
  private speechSynthesis: SpeechSynthesis | null = null;

  constructor() {
    // Only initialize speech in browser environment
    if (typeof window !== "undefined") {
      this.initializeSpeech();
    }
  }

  private initializeSpeech(): void {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.speechSynthesis = window.speechSynthesis;
    }
  }

  // Start navigation to destination
  async startNavigation(
    destination: RoutePoint,
    route: RouteResponse
  ): Promise<void> {
    try {
      // Get current location more robustly.
      // First, try to use a recent, cached location to avoid unnecessary and slow GPS requests.
      let currentLocation = locationService.getLastKnownLocation();
      const lastUpdateTimestamp = locationService.getLastUpdateTimestampMs();
      const isLocationStale =
        !lastUpdateTimestamp || Date.now() - lastUpdateTimestamp > 10000; // 10s threshold

      // If we don't have a recent location, fetch a new one with a reasonable timeout.
      if (!currentLocation || isLocationStale) {
        console.log("Location is stale or missing, fetching fresh position...");
        currentLocation = await locationService.getCurrentPosition({
          timeout: 20000, // 20 seconds, a compromise to avoid long waits
          maximumAge: 0, // We need it now
          enableHighAccuracy: true, // For starting navigation, accuracy is important
        });
      } else {
        console.log("Using recent cached location to start navigation.");
      }

      // Initialize navigation state
      this.navigationState = {
        isNavigating: true,
        currentStep: 0,
        totalSteps: route.instructions.length,
        remainingDistance: route.distance,
        remainingTime: route.duration,
        nextInstruction: route.instructions[0] || "Head to destination",
        currentLocation,
        destination,
        route,
        isOffRoute: false,
        recalculatingRoute: false,
      };

      // Ensure location tracking is active, but don't start it if it's already running.
      if (!locationService.isWatching()) {
        locationService.startWatching({
          enableHighAccuracy: false, // Can be less aggressive for continuous tracking
          timeout: 10000,
          maximumAge: 2000,
        });
      }

      // Subscribe to location updates
      locationService.onLocationUpdate(this.handleLocationUpdate.bind(this));
      locationService.onLocationError(this.handleLocationError.bind(this));

      // Announce start of navigation
      this.announceInstruction(
        "Navigation started. " + this.navigationState.nextInstruction
      );

      // Notify subscribers
      this.notifyStateChange();

      console.log("Navigation started to:", destination);
    } catch (error) {
      console.error("Failed to start navigation:", error);
      throw error;
    }
  }

  // Stop navigation
  stopNavigation(): void {
    if (this.navigationState) {
      locationService.stopWatching();
      this.navigationState.isNavigating = false;
      this.announceInstruction("Navigation stopped");
      this.navigationState = null;
      this.lastAnnouncedStep = -1;
      this.notifyStateChange();
      console.log("Navigation stopped");
    }
  }

  // Handle location updates during navigation
  private handleLocationUpdate(location: LocationCoordinates): void {
    if (!this.navigationState || !this.navigationState.isNavigating) return;

    // Update current location
    this.navigationState.currentLocation = location;

    // Check if off route
    this.checkOffRoute(location);

    // Update navigation progress
    this.updateNavigationProgress(location);

    // Check for step completion
    this.checkStepCompletion(location);

    // Notify subscribers
    this.notifyStateChange();
  }

  // Handle location errors
  private handleLocationError(error: any): void {
    console.error("Location error during navigation:", error);
    if (this.navigationState) {
      // Could implement fallback strategies here
    }
  }

  // Check if user is off the planned route
  private checkOffRoute(location: LocationCoordinates): void {
    if (!this.navigationState?.route) return;

    const route = this.navigationState.route;
    let minDistance = Number.POSITIVE_INFINITY;

    // Find closest point on route
    for (const coordinate of route.coordinates) {
      const distance = LocationService.calculateDistance(location, {
        lat: coordinate[0],
        lng: coordinate[1],
        accuracy: 0,
      });
      minDistance = Math.min(minDistance, distance);
    }

    const wasOffRoute = this.navigationState.isOffRoute;
    this.navigationState.isOffRoute = minDistance > this.offRouteThreshold;

    // If just went off route, announce it
    if (!wasOffRoute && this.navigationState.isOffRoute) {
      this.announceInstruction("Off route. Recalculating...");
      this.recalculateRoute(location);
    }
  }

  // Recalculate route when off course
  private async recalculateRoute(location: LocationCoordinates): Promise<void> {
    if (!this.navigationState) return;

    this.navigationState.recalculatingRoute = true;
    this.notifyStateChange();

    try {
      // Import routing function dynamically to avoid circular dependency
      const { getWalkingRoute } = await import("./routing");

      const newRoute = await getWalkingRoute(
        { lat: location.lat, lng: location.lng },
        this.navigationState.destination
      );

      if (newRoute) {
        this.navigationState.route = newRoute;
        this.navigationState.currentStep = 0;
        this.navigationState.totalSteps = newRoute.instructions.length;
        this.navigationState.remainingDistance = newRoute.distance;
        this.navigationState.remainingTime = newRoute.duration;
        this.navigationState.nextInstruction =
          newRoute.instructions[0] || "Head to destination";
        this.navigationState.isOffRoute = false;
        this.lastAnnouncedStep = -1;

        this.announceInstruction(
          "Route recalculated. " + this.navigationState.nextInstruction
        );
      }
    } catch (error) {
      console.error("Failed to recalculate route:", error);
      this.announceInstruction(
        "Unable to recalculate route. Continue to destination."
      );
    } finally {
      this.navigationState.recalculatingRoute = false;
      this.notifyStateChange();
    }
  }

  // Update navigation progress based on current location
  private updateNavigationProgress(location: LocationCoordinates): void {
    if (!this.navigationState?.route) return;

    // Calculate remaining distance to destination
    const remainingDistance = LocationService.calculateDistance(location, {
      ...this.navigationState.destination,
      accuracy: 0,
    });
    this.navigationState.remainingDistance = remainingDistance;

    // Estimate remaining time (assuming walking speed of 1.4 m/s)
    this.navigationState.remainingTime = remainingDistance / 1.4;

    // Check if arrived at destination
    if (remainingDistance < 10) {
      this.handleArrival();
    }
  }

  // Check if current step is completed
  private checkStepCompletion(location: LocationCoordinates): void {
    if (!this.navigationState?.route) return;

    const route = this.navigationState.route;
    const currentStep = this.navigationState.currentStep;

    // Simple step completion logic - could be more sophisticated
    if (currentStep < route.instructions.length - 1) {
      // Check if we're close to the next waypoint
      const nextStepIndex = Math.min(
        currentStep + 1,
        route.coordinates.length - 1
      );
      const nextWaypoint = route.coordinates[nextStepIndex];

      const distanceToNext = LocationService.calculateDistance(location, {
        lat: nextWaypoint[0],
        lng: nextWaypoint[1],
        accuracy: 0,
      });

      // If within 20 meters of next waypoint, advance to next step
      if (distanceToNext < 20) {
        this.advanceToNextStep();
      }
    }
  }

  // Advance to the next navigation step
  private advanceToNextStep(): void {
    if (!this.navigationState?.route) return;

    this.navigationState.currentStep++;

    if (
      this.navigationState.currentStep <
      this.navigationState.route.instructions.length
    ) {
      this.navigationState.nextInstruction =
        this.navigationState.route.instructions[
          this.navigationState.currentStep
        ];

      // Announce new instruction if it's different from last announced
      if (this.navigationState.currentStep !== this.lastAnnouncedStep) {
        this.announceInstruction(this.navigationState.nextInstruction);
        this.lastAnnouncedStep = this.navigationState.currentStep;
      }
    }
  }

  // Handle arrival at destination
  private handleArrival(): void {
    if (!this.navigationState) return;

    this.announceInstruction("You have arrived at your destination");
    this.stopNavigation();
  }

  // Announce instruction using text-to-speech
  private announceInstruction(instruction: string): void {
    if (!this.voiceSettings.enabled || !this.speechSynthesis) return;

    // Cancel any ongoing speech
    this.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(instruction);
    utterance.lang = this.voiceSettings.language;
    utterance.rate = this.voiceSettings.rate;
    utterance.pitch = this.voiceSettings.pitch;
    utterance.volume = this.voiceSettings.volume;

    this.speechSynthesis.speak(utterance);
  }

  // Subscribe to navigation state changes
  onStateChange(callback: (state: NavigationState) => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  // Notify all subscribers of state change
  private notifyStateChange(): void {
    if (this.navigationState) {
      this.callbacks.forEach((callback) => callback(this.navigationState!));
    }
  }

  // Get current navigation state
  getNavigationState(): NavigationState | null {
    return this.navigationState;
  }

  // Update voice settings
  updateVoiceSettings(settings: Partial<VoiceSettings>): void {
    this.voiceSettings = { ...this.voiceSettings, ...settings };
  }

  // Get voice settings
  getVoiceSettings(): VoiceSettings {
    return { ...this.voiceSettings };
  }

  // Test voice announcement
  testVoice(message = "This is a test of the navigation voice"): void {
    this.announceInstruction(message);
  }

  // Get available voices
  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.speechSynthesis) return [];
    return this.speechSynthesis.getVoices();
  }
}

// Global navigation service instance
export const navigationService = new NavigationService();
