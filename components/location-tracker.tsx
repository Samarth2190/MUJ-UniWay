"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  MapPin,
  Navigation,
  Volume2,
  VolumeX,
  Settings,
  Target,
  Compass,
  Clock,
  Route,
  AlertTriangle,
  Play,
  Square,
} from "lucide-react"
import { type LocationCoordinates, locationService } from "@/lib/geolocation"
import { type NavigationState, navigationService } from "@/lib/navigation"
import { formatDistance, formatDuration } from "@/lib/routing"

interface LocationTrackerProps {
  onLocationUpdate?: (location: LocationCoordinates) => void
  onNavigationStateChange?: (state: NavigationState | null) => void
}

export default function LocationTracker({ onLocationUpdate, onNavigationStateChange }: LocationTrackerProps) {
  const [currentLocation, setCurrentLocation] = useState<LocationCoordinates | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [navigationState, setNavigationState] = useState<NavigationState | null>(null)
  const [voiceSettings, setVoiceSettings] = useState(navigationService.getVoiceSettings())
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])

  // Initialize location tracking
  useEffect(() => {
    // Load available voices
    const loadVoices = () => {
      setAvailableVoices(navigationService.getAvailableVoices())
    }

    loadVoices()
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices
    }

    // Subscribe to location updates
    const unsubscribeLocation = locationService.onLocationUpdate((location) => {
      setCurrentLocation(location)
      setLocationError(null)
      onLocationUpdate?.(location)
    })

    // Subscribe to location errors
    const unsubscribeError = locationService.onLocationError((error) => {
      setLocationError(error.message)
      setIsTracking(false)
    })

    // Subscribe to navigation state changes
    const unsubscribeNavigation = navigationService.onStateChange((state) => {
      setNavigationState(state)
      onNavigationStateChange?.(state)
    })

    return () => {
      unsubscribeLocation()
      unsubscribeError()
      unsubscribeNavigation()
    }
  }, [onLocationUpdate, onNavigationStateChange])

  // Start/stop location tracking
  const toggleTracking = async () => {
    if (isTracking) {
      locationService.stopWatching()
      setIsTracking(false)
    } else {
      try {
        // Get initial position
        const location = await locationService.getCurrentPosition()
        setCurrentLocation(location)
        setLocationError(null)

        // Start watching
        locationService.startWatching()
        setIsTracking(true)
      } catch (error: any) {
        setLocationError(error.message)
        setIsTracking(false)
      }
    }
  }

  // Stop navigation
  const stopNavigation = () => {
    navigationService.stopNavigation()
    setNavigationState(null)
  }

  // Update voice settings
  const updateVoiceSettings = (key: string, value: any) => {
    const newSettings = { ...voiceSettings, [key]: value }
    setVoiceSettings(newSettings)
    navigationService.updateVoiceSettings(newSettings)
  }

  // Test voice
  const testVoice = () => {
    navigationService.testVoice("This is a test of the navigation voice system")
  }

  // Get location accuracy badge color
  const getAccuracyColor = (accuracy: number) => {
    if (accuracy <= 5) return "bg-green-500"
    if (accuracy <= 10) return "bg-yellow-500"
    return "bg-red-500"
  }

  // Get speed in km/h
  const getSpeedKmh = (speed?: number) => {
    if (!speed) return 0
    return Math.round(speed * 3.6 * 10) / 10
  }

  return (
    <div className="space-y-4">
      {/* Location Status Card */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-lg font-semibold">
            <div className="p-2 rounded-lg bg-primary/10"><MapPin className="h-5 w-5 text-primary" /></div>
            Live Location
          </CardTitle>
          <CardDescription>Real-time GPS tracking and navigation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Location Controls */}
          <div className="flex items-center justify-between gap-3">
            <Button onClick={toggleTracking} variant={isTracking ? "destructive" : "default"} className="h-11 font-medium">
              {isTracking ? (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Stop Tracking
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Tracking
                </>
              )}
            </Button>

            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-11 font-medium">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Navigation Settings</DialogTitle>
                  <DialogDescription>Configure voice guidance and location settings</DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                  {/* Voice Settings */}
                  <div className="space-y-4">
                    <h4 className="font-semibold">Voice Guidance</h4>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="voice-enabled">Enable Voice</Label>
                      <Switch
                        id="voice-enabled"
                        checked={voiceSettings.enabled}
                        onCheckedChange={(checked) => updateVoiceSettings("enabled", checked)}
                      />
                    </div>

                    {voiceSettings.enabled && (
                      <>
                        <div className="space-y-2">
                          <Label>Voice Volume</Label>
                          <Slider
                            value={[voiceSettings.volume]}
                            onValueChange={([value]) => updateVoiceSettings("volume", value)}
                            max={1}
                            min={0}
                            step={0.1}
                            className="w-full"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Speech Rate</Label>
                          <Slider
                            value={[voiceSettings.rate]}
                            onValueChange={([value]) => updateVoiceSettings("rate", value)}
                            max={2}
                            min={0.5}
                            step={0.1}
                            className="w-full"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Voice Pitch</Label>
                          <Slider
                            value={[voiceSettings.pitch]}
                            onValueChange={([value]) => updateVoiceSettings("pitch", value)}
                            max={2}
                            min={0.5}
                            step={0.1}
                            className="w-full"
                          />
                        </div>

                        <Button onClick={testVoice} variant="outline" className="w-full h-11 font-medium">
                          <Volume2 className="h-4 w-4 mr-2" />
                          Test Voice
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Location Error */}
          {locationError && (
            <div className="flex items-center gap-3 p-4 bg-red-50/50 border border-red-200/50 rounded-xl dark:bg-red-950/30 dark:border-red-800/30">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700 dark:text-red-300 font-medium">{locationError}</span>
            </div>
          )}

          {/* Low accuracy warning */}
          {currentLocation && currentLocation.accuracy > 50 && (
            <div className="flex items-center gap-3 p-4 bg-amber-50/50 border border-amber-200/50 rounded-xl dark:bg-amber-950/30 dark:border-amber-800/30">
              <AlertTriangle className="h-4 w-4 text-amber-700" />
              <span className="text-sm text-amber-800 dark:text-amber-300 font-medium">
                Low GPS accuracy (±{Math.round(currentLocation.accuracy)}m). For better results, move outdoors,
                enable Wi‑Fi/Bluetooth, and disable battery saver.
              </span>
            </div>
          )}

          {/* Current Location Info */}
          {currentLocation && (
            <div className="grid grid-cols-2 gap-4 text-sm p-4 bg-muted/30 rounded-xl">
              <div>
                <Label className="text-muted-foreground font-medium">Coordinates</Label>
                <p className="font-mono text-xs">
                  {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground font-medium">Accuracy</Label>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getAccuracyColor(currentLocation.accuracy)}`} />
                  <span className="font-medium">{Math.round(currentLocation.accuracy)}m</span>
                </div>
              </div>
              {currentLocation.heading !== undefined && (
                <div>
                  <Label className="text-muted-foreground font-medium">Heading</Label>
                  <div className="flex items-center gap-2">
                    <Compass className="h-4 w-4" />
                    <span className="font-medium">{Math.round(currentLocation.heading)}°</span>
                  </div>
                </div>
              )}
              {currentLocation.speed !== undefined && (
                <div>
                  <Label className="text-muted-foreground font-medium">Speed</Label>
                  <span className="font-medium">{getSpeedKmh(currentLocation.speed)} km/h</span>
                </div>
              )}
            </div>
          )}

          {/* Tracking Status */}
          <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
            <div className={`w-2 h-2 rounded-full ${isTracking ? "bg-green-500" : "bg-gray-400"}`} />
            <span className="text-sm text-muted-foreground font-medium">
              {isTracking ? "Location tracking active" : "Location tracking inactive"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Status Card */}
      {navigationState && (
        <Card className="glass-effect border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-lg font-semibold">
              <div className="p-2 rounded-lg bg-primary/10"><Navigation className="h-5 w-5 text-primary" /></div>
              Active Navigation
              {navigationState.isOffRoute && (
                <Badge variant="destructive" className="ml-2 font-medium">
                  Off Route
                </Badge>
              )}
              {navigationState.recalculatingRoute && (
                <Badge variant="secondary" className="ml-2 font-medium">
                  Recalculating...
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Next Instruction */}
            <div className="p-4 bg-blue-50/50 border border-blue-200/50 rounded-xl dark:bg-blue-950/30 dark:border-blue-800/30">
              <div className="flex items-start gap-2">
                <Route className="h-5 w-5 text-blue-600 mt-1" />
                <div>
                  <p className="font-semibold text-blue-900 dark:text-blue-100">{navigationState.nextInstruction}</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                    Step {navigationState.currentStep + 1} of {navigationState.totalSteps}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation Stats */}
            <div className="grid grid-cols-2 gap-4 text-sm p-4 bg-muted/30 rounded-xl">
              <div>
                <Label className="text-muted-foreground font-medium">Remaining Distance</Label>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  <span className="font-semibold">{formatDistance(navigationState.remainingDistance)}</span>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground font-medium">Estimated Time</Label>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="font-semibold">{formatDuration(navigationState.remainingTime)}</span>
                </div>
              </div>
            </div>

            {/* Voice Status */}
            <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
              <div className="flex items-center gap-2">
                {voiceSettings.enabled ? (
                  <Volume2 className="h-4 w-4 text-green-600" />
                ) : (
                  <VolumeX className="h-4 w-4 text-gray-400" />
                )}
                <span className="text-sm text-muted-foreground font-medium">
                  Voice guidance {voiceSettings.enabled ? "enabled" : "disabled"}
                </span>
              </div>
              <Button onClick={stopNavigation} variant="destructive" size="sm" className="font-medium">
                <Square className="h-4 w-4 mr-2" />
                Stop Navigation
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
