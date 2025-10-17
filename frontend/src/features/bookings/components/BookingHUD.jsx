import { useEffect, useMemo, useState } from 'react';
import { Calendar, Dog, User, Home, DollarSign, Plus, Filter, Clock } from 'lucide-react';
import Button from '@/components/ui/Button';
import SlidePanel from '@/components/ui/SlidePanel';

// Reusable heads-up panel for rapid booking context and actions
const BookingHUD = ({
  date = new Date(),
  stats = {},
  onNewBooking,
  onOpenFilters,
  onCheckInOut,
}) => {
  const [open, setOpen] = useState(true);
  const totals = {
    petsToday: stats.petsToday ?? 0,
    checkIns: stats.checkIns ?? 0,
    checkOuts: stats.checkOuts ?? 0,
    occupancyPct: stats.occupancyPct ?? 0,
    revenueToday: stats.revenueToday ?? 0,
  };

  useEffect(() => {
    setOpen(true);
  }, [date]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Today</p>
            <p className="text-sm font-semibold text-gray-900">
              {date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onOpenFilters}><Filter className="w-4 h-4 mr-2"/>Filters</Button>
          <Button size="sm" variant="outline" onClick={onCheckInOut}><Clock className="w-4 h-4 mr-2"/>Check-in/out</Button>
          <Button size="sm" variant="secondary" onClick={onNewBooking}><Plus className="w-4 h-4 mr-2"/>New Booking</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
        <HUDCard icon={Dog} label="Pets Today" value={totals.petsToday} color="text-blue-600"/>
        <HUDCard icon={Home} label="Check-ins" value={totals.checkIns} color="text-emerald-600"/>
        <HUDCard icon={Home} label="Check-outs" value={totals.checkOuts} color="text-amber-600"/>
        <HUDCard icon={User} label="Occupancy" value={`${Math.round(totals.occupancyPct)}%`} color="text-violet-600"/>
        <HUDCard icon={DollarSign} label="Revenue" value={`$${(totals.revenueToday/100).toFixed(2)}`} color="text-green-700"/>
      </div>
    </div>
  );
};

const HUDCard = ({ icon: Icon, label, value, color }) => (
  <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-md p-3">
    <div className={`w-8 h-8 rounded-md bg-white border flex items-center justify-center ${color}`}>
      <Icon className="w-4 h-4" />
    </div>
    <div>
      <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  </div>
);

export default BookingHUD;


