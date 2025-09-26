"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Navigation, Loader2 } from "lucide-react"

interface Location {
  lat: number
  lng: number
  address?: string
}

interface MapMarker {
  id: string
  position: Location
  title: string
  description: string
  type: "donor" | "recipient" | "hospital" | "club"
  bloodType?: string
  urgency?: "low" | "medium" | "high"
}

interface MapComponentProps {
  markers?: MapMarker[]
  center?: Location
  zoom?: number
  height?: string
  onLocationSelect?: (location: Location) => void
  showCurrentLocation?: boolean
  interactive?: boolean
}

export default function MapComponent({
  markers = [],
  center = { lat: 40.7128, lng: -74.006 }, // Default to NYC
  zoom = 10,
  height = "400px",
  onLocationSelect,
  showCurrentLocation = true,
  interactive = true,
}: MapComponentProps) {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null)
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (showCurrentLocation) {
      getCurrentLocation()
    }
  }, [showCurrentLocation])

  const getCurrentLocation = () => {
    setLoading(true)

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }
          setCurrentLocation(location)
          setLoading(false)
        },
        (error) => {
          console.error("Error getting location:", error)
          setLoading(false)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
      )
    } else {
      console.error("Geolocation is not supported by this browser.")
      setLoading(false)
    }
  }

  const getMarkerColor = (marker: MapMarker) => {
    switch (marker.type) {
      case "donor":
        return "#10B981" // Green
      case "recipient":
        return "#EF4444" // Red
      case "hospital":
        return "#3B82F6" // Blue
      case "club":
        return "#8B5CF6" // Purple
      default:
        return "#6B7280" // Gray
    }
  }

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case "high":
        return "destructive"
      case "medium":
        return "default"
      case "low":
        return "secondary"
      default:
        return "outline"
    }
  }

  const handleMapClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !onLocationSelect) return

    const rect = mapRef.current?.getBoundingClientRect()
    if (!rect) return

    // This is a simplified click handler - in a real implementation,
    // you would convert screen coordinates to lat/lng coordinates
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    // Mock conversion for demonstration
    const lat = center.lat + (y - rect.height / 2) * 0.001
    const lng = center.lng + (x - rect.width / 2) * 0.001

    onLocationSelect({ lat, lng })
  }

  return (
    <div className="space-y-4">
      {/* Map Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Map View</span>
        </div>
        <div className="flex items-center gap-2">
          {showCurrentLocation && (
            <Button variant="outline" size="sm" onClick={getCurrentLocation} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
              {loading ? "Locating..." : "My Location"}
            </Button>
          )}
        </div>
      </div>

      {/* Map Container */}
      <Card>
        <CardContent className="p-0">
          <div
            ref={mapRef}
            className="relative bg-muted rounded-lg overflow-hidden cursor-pointer"
            style={{ height }}
            onClick={handleMapClick}
          >
            {/* Simplified map visualization */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-green-100">
              {/* Grid pattern to simulate map */}
              <div className="absolute inset-0 opacity-20">
                <svg width="100%" height="100%">
                  <defs>
                    <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#000" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              </div>

              {/* Current Location Marker */}
              {currentLocation && (
                <div
                  className="absolute w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 z-10"
                  style={{
                    left: "50%",
                    top: "50%",
                  }}
                  title="Your Location"
                />
              )}

              {/* Markers */}
              {markers.map((marker, index) => (
                <div
                  key={marker.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20"
                  style={{
                    left: `${30 + (index % 5) * 15}%`,
                    top: `${30 + Math.floor(index / 5) * 20}%`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedMarker(marker)
                  }}
                >
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center"
                    style={{ backgroundColor: getMarkerColor(marker) }}
                  >
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                  {marker.urgency === "high" && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  )}
                </div>
              ))}

              {/* Map Attribution */}
              <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-white/80 px-2 py-1 rounded">
                Interactive Map
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Marker Info */}
      {selectedMarker && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{selectedMarker.title}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" style={{ backgroundColor: getMarkerColor(selectedMarker), color: "white" }}>
                  {selectedMarker.type}
                </Badge>
                {selectedMarker.urgency && (
                  <Badge variant={getUrgencyColor(selectedMarker.urgency)}>{selectedMarker.urgency} priority</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">{selectedMarker.description}</p>
            {selectedMarker.bloodType && (
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium">Blood Type:</span>
                <Badge variant="secondary">{selectedMarker.bloodType}</Badge>
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm">Contact</Button>
              <Button size="sm" variant="outline">
                Get Directions
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedMarker(null)}>
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      {markers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Map Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs">Donors</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-xs">Recipients</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-xs">Hospitals</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-xs">Clubs</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
