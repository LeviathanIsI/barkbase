import { Outlet } from 'react-router-dom';
import SettingsSidebar from './SettingsSidebar';

const SettingsLayout = () => {
  return (
    <div className="flex h-full min-h-0 w-full gap-6 px-4 py-6 lg:gap-8 lg:px-6 xl:px-10">
      <SettingsSidebar />
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="w-full px-4 py-8 lg:px-8 lg:py-12 xl:px-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default SettingsLayout;
