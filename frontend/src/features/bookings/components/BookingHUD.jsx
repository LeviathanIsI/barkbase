import { useEffect, useMemo, useState } from 'react';
import { Calendar, Dog, User, Home } from 'lucide-react';
import { useTimezoneUtils } from '@/lib/timezone';
import SlidePanel from '@/components/ui/SlidePanel';

// Reusable heads-up panel for rapid booking context and actions
const BookingHUD = ({
  date = new Date(),
  stats = {},
}) => {
  const tz = useTimezoneUtils();
  const [open, setOpen] = useState(true);
  const totals = {
    petsToday: stats.petsToday ?? 0,
    checkIns: stats.checkIns ?? 0,
    checkOuts: stats.checkOuts ?? 0,
    occupancyPct: stats.occupancyPct ?? 0,
    // revenue removed per request
  };

  useEffect(() => {
    setOpen(true);
  }, [date]);

  return (
    <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-surface-secondary flex items-center justify-center">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-text-secondary">Today</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-text-primary">
              {tz.formatDate(date, { weekday: 'short', month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <HUDCard icon={Dog} label="Pets Today" value={totals.petsToday} color="text-blue-600 dark:text-blue-400"/>
        <HUDCard icon={Home} label="Check-ins" value={totals.checkIns} color="text-emerald-600 dark:text-emerald-400"/>
        <HUDCard icon={Home} label="Check-outs" value={totals.checkOuts} color="text-amber-600 dark:text-amber-400"/>
        <HUDCard icon={User} label="Occupancy" value={`${Math.round(totals.occupancyPct)}%`} color="text-violet-600 dark:text-violet-400"/>
      </div>
    </div>
  );
};

const HUDCard = ({ icon: Icon, label, value, color }) => (
  <div className="flex items-center gap-3 bg-gray-50 dark:bg-surface-secondary border border-gray-200 dark:border-surface-border rounded-md p-3">
    <div className={`w-8 h-8 rounded-md bg-white dark:bg-surface-primary border flex items-center justify-center ${color}`}>
      <Icon className="w-4 h-4" />
    </div>
    <div>
      <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-text-secondary">{label}</p>
      <p className="text-sm font-semibold text-gray-900 dark:text-text-primary">{value}</p>
    </div>
  </div>
);

export default BookingHUD;


