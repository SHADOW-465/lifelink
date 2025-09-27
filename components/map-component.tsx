"use client"

import { useState, useMemo, useCallback } from "react"
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api"
import { Button } from "@/components/ui/button"
import { BloodType, UrgencyLevel } from "@prisma/client"
import Link from "next/link"
import { Heart } from "lucide-react"

// Define the shape of a single request prop
interface BloodRequestForMap {
  id: string
  latitude: number
  longitude: number
  bloodType: BloodType
  urgency: UrgencyLevel
  requester: {
    firstName: string | null
  }
}

interface MapComponentProps {
  requests: BloodRequestForMap[]
}

// Define the map container style
const containerStyle = {
  width: "100%",
  height: "100%",
}

// Default center for the map (e.g., center of a relevant area)
const defaultCenter = {
  lat: 28.6139, // New Delhi, for example
  lng: 77.2090,
}

export function MapComponent({ requests }: MapComponentProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  })

  const [selectedRequest, setSelectedRequest] = useState<BloodRequestForMap | null>(null)

  const onMarkerClick = useCallback((request: BloodRequestForMap) => {
    setSelectedRequest(request)
  }, [])

  const mapOptions = useMemo(
    () => ({
      disableDefaultUI: true,
      clickableIcons: false,
      scrollwheel: true,
    }),
    []
  )

  if (loadError) {
    return <div>Error loading maps. Please check your API key and network connection.</div>
  }

  if (!isLoaded) {
    return <div>Loading Map...</div>
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={defaultCenter}
      zoom={8}
      options={mapOptions}
    >
      {requests.map((request) => (
        <Marker
          key={request.id}
          position={{ lat: request.latitude, lng: request.longitude }}
          onClick={() => onMarkerClick(request)}
          icon={{
            path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
            fillColor: "#EF4444", // Red for requests
            fillOpacity: 1,
            strokeWeight: 0,
            scale: 1.5,
            anchor: new google.maps.Point(12, 24),
          }}
        />
      ))}

      {selectedRequest && (
        <InfoWindow
          position={{ lat: selectedRequest.latitude, lng: selectedRequest.longitude }}
          onCloseClick={() => setSelectedRequest(null)}
        >
          <div className="p-2 space-y-2">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Blood Request
            </h3>
            <p>
              <strong>Requester:</strong> {selectedRequest.requester.firstName}
            </p>
            <p>
              <strong>Blood Type:</strong>{" "}
              <span className="font-semibold text-red-600">
                {selectedRequest.bloodType.replace("_", " ")}
              </span>
            </p>
            <p>
              <strong>Urgency:</strong> {selectedRequest.urgency}
            </p>
            <Button asChild size="sm" className="mt-2 w-full">
              <Link href={`/requests/${selectedRequest.id}`}>View Details</Link>
            </Button>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  )
}