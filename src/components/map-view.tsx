"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import type { EventCategory } from "@/lib/types";
import { CATEGORY_META } from "@/lib/categories";

export type MapEvent = {
  id: string;
  title: string;
  category: EventCategory;
  lat: number;
  lng: number;
  venueName: string;
  suburb?: string | null;
  dateLabel: string;
  priceLabel: string;
  href: string;
};

export function MapView({
  events,
  center,
  zoom = 10,
  height = "620px",
  className,
}: {
  events: MapEvent[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: center ?? [-33.5, 151.3],
      zoom,
      zoomControl: true,
      scrollWheelZoom: true,
    });
    mapRef.current = map;

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const clusters = (L as unknown as { markerClusterGroup: (options?: object) => L.LayerGroup }).markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 46,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: (cluster: { getChildCount: () => number }) => {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `<div>${count}</div>`,
          className: "marker-cluster-custom",
          iconSize: L.point(42, 42),
        });
      },
    });

    for (const event of events) {
      const meta = CATEGORY_META[event.category] ?? CATEGORY_META.other;
      const icon = L.divIcon({
        html: `<span style="background:${meta.color};border-color:${meta.text}"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="${meta.text}" stroke-width="2"><circle cx="12" cy="12" r="7"/><circle cx="9" cy="9" r=".8" fill="${meta.text}"/><circle cx="15" cy="9" r=".8" fill="${meta.text}"/><circle cx="9" cy="15" r=".8" fill="${meta.text}"/><circle cx="15" cy="15" r=".8" fill="${meta.text}"/></svg></span>`,
        className: "pf-marker",
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([event.lat, event.lng], { icon, title: event.title, alt: event.title });
      const popup = document.createElement("div");
      popup.className = "w-[220px]";
      const category = document.createElement("p");
      category.textContent = meta.label;
      category.style.cssText = `font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:${meta.text};background:${meta.color};display:inline-block;padding:2px 7px;border-radius:999px`;
      const title = document.createElement("p");
      title.textContent = event.title;
      title.style.cssText = "font-weight:800;font-size:14px;line-height:1.25;margin:7px 0 4px;color:#0a2a20";
      const venue = document.createElement("p");
      venue.textContent = `${event.venueName}${event.suburb ? ` · ${event.suburb}` : ""}`;
      venue.style.cssText = "font-size:12px;color:#52665c;margin:0";
      const when = document.createElement("p");
      when.textContent = `${event.dateLabel} · ${event.priceLabel}`;
      when.style.cssText = "font-size:12px;color:#123b2c;font-weight:700;margin:5px 0 8px";
      const link = document.createElement("a");
      link.href = `${process.env.NEXT_PUBLIC_BASE_PATH || "/pickle"}${event.href}/`;
      link.textContent = "View session →";
      link.style.cssText = "font-size:12px;font-weight:800;color:#1e5b44;text-decoration:underline;text-underline-offset:3px";
      popup.append(category, title, venue, when, link);
      marker.bindPopup(popup, { maxWidth: 260 });
      clusters.addLayer(marker);
    }
    map.addLayer(clusters);

    if (events.length > 1) {
      const bounds = L.latLngBounds(events.map((e) => [e.lat, e.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    } else if (events.length === 1) {
      map.setView([events[0].lat, events[0].lng], 13);
    }

    const style = document.createElement("style");
    style.textContent = `
      .pf-marker span{display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:999px 999px 999px 3px;border:1.5px solid;box-shadow:0 2px 6px rgba(10,42,32,.25);transform:rotate(-8deg)}
      .pf-marker span svg{transform:rotate(8deg)}
      .marker-cluster-custom div{display:flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:999px;font-size:13px;background:#123b2c;color:#d8f26a;border:2px solid #d8f26a;box-shadow:0 4px 10px rgba(10,42,32,.28)}
    `;
    document.head.appendChild(style);

    return () => {
      map.remove();
      mapRef.current = null;
      style.remove();
    };
  }, [events, center, zoom]);

  return <div ref={containerRef} className={className} style={{ height, width: "100%", borderRadius: "22px", overflow: "hidden" }} aria-label="Map of pickleball sessions" />;
}
