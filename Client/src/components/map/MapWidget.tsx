import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon issues in Leaflet with React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Coordinates {
    lat: number;
    lng: number;
}

interface MapWidgetProps {
    userLocation: Coordinates | null;
    destination: Coordinates | null;
}

const OSRM_ROUTE_URL = 'https://router.project-osrm.org/route/v1/driving';

const RecenterMap: React.FC<{ userLocation: Coordinates | null; destination: Coordinates | null }> = ({ userLocation, destination }) => {
    const map = useMap();

    useEffect(() => {
        if (userLocation && destination) {
            const bounds = L.latLngBounds([
                [userLocation.lat, userLocation.lng],
                [destination.lat, destination.lng]
            ]);
            map.fitBounds(bounds, { padding: [50, 50] });
        } else if (userLocation) {
            map.setView([userLocation.lat, userLocation.lng], 13);
        } else if (destination) {
            map.setView([destination.lat, destination.lng], 13);
        }
    }, [userLocation, destination, map]);

    return null;
};

const MapWidget: React.FC<MapWidgetProps> = ({ userLocation, destination }) => {
    const [routePath, setRoutePath] = useState<[number, number][]>([]);

    useEffect(() => {
        const controller = new AbortController();

        const loadRoute = async () => {
            if (!userLocation || !destination) {
                setRoutePath([]);
                return;
            }

            try {
                const response = await fetch(
                    `${OSRM_ROUTE_URL}/${userLocation.lng},${userLocation.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`,
                    { signal: controller.signal },
                );
                if (!response.ok) {
                    throw new Error(`Route request failed (${response.status})`);
                }

                const payload = await response.json();
                const coordinates = payload.routes?.[0]?.geometry?.coordinates;
                if (!Array.isArray(coordinates)) {
                    setRoutePath([]);
                    return;
                }

                setRoutePath(
                    coordinates
                        .filter((point: unknown): point is [number, number] => Array.isArray(point) && point.length >= 2)
                        .map(([lng, lat]) => [lat, lng]),
                );
            } catch (error) {
                if ((error as Error).name !== 'AbortError') {
                    setRoutePath([]);
                }
            }
        };

        void loadRoute();

        return () => controller.abort();
    }, [userLocation, destination]);

    // Default center (Sri Lanka) if no locations
    const defaultCenter = { lat: 7.8731, lng: 80.7718 };
    const center = userLocation || destination || defaultCenter;

    return (
        <div className="h-full w-full rounded-xl overflow-hidden z-0">
            <MapContainer
                center={[center.lat, center.lng]}
                zoom={7}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {userLocation && (
                    <Marker position={[userLocation.lat, userLocation.lng]} title="Your Location">
                        <Popup>Your Location</Popup>
                    </Marker>
                )}

                {destination && (
                    <Marker position={[destination.lat, destination.lng]} title="Vehicle Location">
                        <Popup>Vehicle Location</Popup>
                    </Marker>
                )}

                {userLocation && destination && (
                    <Polyline
                        positions={
                            routePath.length > 1
                                ? routePath
                                : [
                                    [userLocation.lat, userLocation.lng],
                                    [destination.lat, destination.lng],
                                ]
                        }
                        color="blue"
                    />
                )}

                <RecenterMap userLocation={userLocation} destination={destination} />
            </MapContainer>
        </div>
    );
};

export default MapWidget;
