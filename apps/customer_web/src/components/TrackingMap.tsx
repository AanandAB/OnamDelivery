"use client";

// Live-tracking map: pickup (shop), drop (customer) and the delivery partner's
// moving position. Dynamically imported with `ssr: false`.

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Props {
  pickup: { lat: number; lng: number };
  drop: { lat: number; lng: number };
  partner: { lat: number; lng: number } | null;
}

export default function TrackingMap({ pickup, drop, partner }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const partnerMarkerRef = useRef<L.Marker | null>(null);

  // Initialise once with fixed pickup/drop pins, then fit both into view.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(map);

    const pin = (emoji: string) =>
      L.divIcon({
        className: "",
        html: `<div style="font-size:26px;line-height:1">${emoji}</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 26],
      });

    L.marker([pickup.lat, pickup.lng], { icon: pin("🏪") }).addTo(map);
    L.marker([drop.lat, drop.lng], { icon: pin("🏠") }).addTo(map);

    map.fitBounds(
      L.latLngBounds(
        [
          [pickup.lat, pickup.lng],
          [drop.lat, drop.lng],
        ],
      ),
      { padding: [40, 40] },
    );

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      partnerMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Create / move the partner's live marker.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!partner) {
      partnerMarkerRef.current?.remove();
      partnerMarkerRef.current = null;
      return;
    }
    if (partnerMarkerRef.current) {
      partnerMarkerRef.current.setLatLng([partner.lat, partner.lng]);
    } else {
      const icon = L.divIcon({
        className: "",
        html: '<div style="font-size:28px;line-height:1;filter:drop-shadow(0 2px 2px rgba(0,0,0,.35))">🛵</div>',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });
      partnerMarkerRef.current = L.marker([partner.lat, partner.lng], { icon }).addTo(map);
    }
  }, [partner]);

  return (
    <div
      ref={containerRef}
      className="h-72 w-full overflow-hidden rounded-2xl border border-line"
    />
  );
}
