import { Outlet } from "react-router-dom";
import SettingsSidebar from "./SettingsSidebar";

export default function SettingsLayout() {
  return (
    <div
      className="grid grid-cols-[18rem_minmax(0,1fr)] min-h-screen w-full"
      style={{ overflow: "hidden" }}
    >
      {/* Sidebar stays fixed in its own column */}
      <div className="h-screen sticky top-0 self-start">
        <SettingsSidebar />
      </div>

      {/* Main content scrolls independently */}
      <main className="min-w-0 overflow-y-auto bg-white">
        <div className="w-full px-4 py-8 lg:px-8 lg:py-12 xl:px-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
