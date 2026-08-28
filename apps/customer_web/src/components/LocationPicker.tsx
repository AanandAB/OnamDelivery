"use client";

// Leaflet map picker for sharing the delivery location. Dynamically imported
// with `ssr: false` (Leaflet touches `window`), so it only runs in the browser.

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Props {
  value: { lat: number; lng: number } | null;
  center: { lat: number; lng: number };
  onChange: (lat: number, lng: number) => void;
}

export default function LocationPicker({ value, center, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const initial = value ?? center;

  // Initialise the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView([initial.lat, initial.lng], 14);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(map);

    // Emoji pin avoids Leaflet's broken default-icon URLs in bundlers.
    const icon = L.divIcon({
      className: "",
      html: '<div style="font-size:30px;line-height:1;filter:drop-shadow(0 2px 2px rgba(0,0,0,.35))">📍</div>',
      iconSize: [30, 30],
      iconAnchor: [15, 28],
    });
    const marker = L.marker([initial.lat, initial.lng], { icon, draggable: true }).addTo(map);

    mapRef.current = map;
    markerRef.current = marker;

    const emit = () => {
      const p = marker.getLatLng();
      onChangeRef.current(p.lat, p.lng);
    };
    marker.on("dragend", emit);
    map.on("click", (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      emit();
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Move the pin when the parent sets a new location (e.g. "share my location").
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !value) return;
    markerRef.current.setLatLng([value.lat, value.lng]);
    mapRef.current.setView([value.lat, value.lng], 15);
  }, [value]);

  return (
    <div
      ref={containerRef}
      className="h-64 w-full overflow-hidden rounded-2xl border border-line"
    />
  );
}
