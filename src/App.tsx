import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardPage } from "@/pages/DashboardPage";
import { StaffingPage } from "@/pages/StaffingPage";
import { SideWorkPage } from "@/pages/SideWorkPage";
import { MorePage } from "@/pages/MorePage";
import { FeedPage } from "@/pages/FeedPage";

// Konva + object catalog are heavy — load them only when the map is opened.
const MapPage = lazy(() => import("@/pages/MapPage").then((m) => ({ default: m.MapPage })));

function MapFallback() {
  return (
    <div className="flex h-[60svh] items-center justify-center text-sm text-muted-foreground">Loading floor plan…</div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="feed" element={<FeedPage />} />
        <Route
          path="map"
          element={
            <Suspense fallback={<MapFallback />}>
              <MapPage />
            </Suspense>
          }
        />
        <Route path="staff" element={<StaffingPage />} />
        <Route path="sidework" element={<SideWorkPage />} />
        <Route path="more" element={<MorePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
