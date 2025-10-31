import { useState, useMemo } from 'react';
import { 
  Search,
  Filter,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  PhoneCall,
  MessageSquare,
  DollarSign,
  FileText,
  PawPrint,
  Calendar,
  MoreVertical,
  Eye,
  EyeOff,
  TableProperties,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { useTodaysPetsQuery } from '../api';
import { useBookingCheckInMutation, useBookingCheckOutMutation } from '@/features/bookings/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

/**
 * High-Density Today View
 * Addresses: "Need to see pet info, warnings, vaccine dates, AND send Text-to-Pay from dashboard"
 * Compact view with inline actions - no navigation required
 */

const HighDensityTodayView = () => {
  const navigate = useNavigate();
  const [densityMode, setDensityMode] = useState('compact'); // compact, comfortable, spacious
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showColumns, setShowColumns] = useState({
    photo: true,
    owner: true,
    service: true,
    room: true,
    time: true,
    warnings: true,
    vaccines: true,
    balance: true,
    actions: true
  });

  // Fetch today's pets from API
  const { data: apiPets = [], isLoading } = useTodaysPetsQuery();
  const checkInMutation = useBookingCheckInMutation();
  const checkOutMutation = useBookingCheckOutMutation();

  // Transform API data to component format
  const todaysPets = useMemo(() => {
    return apiPets.map((item) => {
      const booking = item.booking || {};
      const pet = item.pet || {};
      const owner = item.owner || {};
      
      // Format check-in time
      let checkInTime = 'TBD';
      if (booking.checkIn) {
        const checkInDate = new Date(booking.checkIn);
        if (checkInDate.toDateString() === new Date().toDateString()) {
          checkInTime = checkInDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        } else {
          checkInTime = checkInDate.toLocaleDateString();
        }
      }

      // Format check-out time
      let checkOutTime = 'TBD';
      if (booking.checkOut) {
        const checkOutDate = new Date(booking.checkOut);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (checkOutDate.toDateString() === new Date().toDateString()) {
          checkOutTime = checkOutDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        } else if (checkOutDate.toDateString() === tomorrow.toDateString()) {
          checkOutTime = `Tomorrow ${checkOutDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
        } else {
          checkOutTime = checkOutDate.toLocaleDateString();
        }
      }

      // Determine vaccine status
      let vaccineStatus = 'current';
      if (item.expiringVaccinations && item.expiringVaccinations.length > 0) {
        vaccineStatus = 'expires-soon';
      }

      // Calculate balance (would come from booking)
      const balance = (booking.balanceDueInCents || 0) / 100;

      return {
        id: item.petId || pet.recordId,
        bookingId: booking.id || booking.recordId,
        petName: item.petName || pet.name,
        petBreed: item.breed || pet.breed,
        ownerName: owner.name || `${owner.firstName || ''} ${owner.lastName || ''}`.trim(),
        ownerPhone: owner.phone,
        ownerEmail: owner.email,
        service: booking.service || 'N/A',
        room: booking.run || 'N/A',
        checkIn: checkInTime,
        checkOut: checkOutTime,
        status: item.status || booking.status?.toLowerCase().replace('_', '-') || 'other',
        warnings: item.warnings || [],
        vaccineStatus,
        balance,
        notes: item.notes || booking.notes || '',
        photo: item.photoUrl || pet.photoUrl,
        rawData: item // Keep raw data for mutations
      };
    });
  }, [apiPets]);

  // Filter pets based on search and status
  const filteredPets = useMemo(() => {
    return todaysPets.filter(pet => {
      const matchesSearch = !searchTerm || 
        pet.petName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pet.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pet.service.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || pet.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [todaysPets, searchTerm, filterStatus]);

  const toggleRowSelection = (id) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const selectAll = () => {
    if (selectedRows.size === filteredPets.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredPets.map(p => p.id)));
    }
  };

  const handleCheckIn = async (pet) => {
    if (!pet.bookingId) {
      toast.error('No booking found for this pet');
      return;
    }
    try {
      await checkInMutation.mutateAsync({
        bookingId: pet.bookingId,
        payload: { notes: '', condition: 'GOOD' }
      });
      toast.success(`${pet.petName} checked in successfully`);
    } catch (error) {
      toast.error(error.message || 'Failed to check in pet');
    }
  };

  const handleCheckOut = async (pet) => {
    if (!pet.bookingId) {
      toast.error('No booking found for this pet');
      return;
    }
    try {
      await checkOutMutation.mutateAsync({
        bookingId: pet.bookingId,
        payload: { 
          notes: '', 
          condition: 'GOOD',
          finalPriceInCents: Math.round(pet.balance * 100),
          lateFeeInCents: 0
        }
      });
      toast.success(`${pet.petName} checked out successfully`);
    } catch (error) {
      toast.error(error.message || 'Failed to check out pet');
    }
  };

  const handleViewInvoice = (pet) => {
    if (pet.bookingId) {
      navigate(`/bookings/${pet.bookingId}?tab=invoice`);
    }
  };

  const handleSendSMS = (pet) => {
    // TODO: Implement SMS sending
    toast.info(`SMS functionality will be implemented soon`);
  };

  // Row height based on density mode
  const getRowClass = () => {
    switch (densityMode) {
      case 'compact': return 'h-12';
      case 'comfortable': return 'h-14';
      case 'spacious': return 'h-16';
      default: return 'h-12';
    }
  };

  return (
    <Card className="p-0 h-full flex flex-col">
      {/* Header with Controls */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-900">Today's Pets</h3>
            
            {/* Quick Stats */}
            <div className="flex items-center gap-3 text-sm">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              ) : (
                <>
                  <Badge variant="success">{filteredPets.filter(p => p.status === 'checked-in').length} In</Badge>
                  <Badge variant="warning">{filteredPets.filter(p => p.status === 'arriving').length} Arriving</Badge>
                  <Badge variant="secondary">{filteredPets.filter(p => p.status === 'departing').length} Departing</Badge>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Density Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              {[
                { value: 'compact', icon: Minus, label: 'Compact' },
                { value: 'comfortable', icon: TableProperties, label: 'Comfortable' },
                { value: 'spacious', icon: Eye, label: 'Spacious' }
              ].map(mode => (
                <button
                  key={mode.value}
                  onClick={() => setDensityMode(mode.value)}
                  className={cn(
                    "p-1.5 rounded transition-all",
                    densityMode === mode.value
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                  title={mode.label}
                >
                  <mode.icon className="h-4 w-4" />
                </button>
              ))}
            </div>

            {/* Column Visibility */}
            <div className="relative group">
              <Button variant="ghost" size="icon">
                <EyeOff className="h-4 w-4" />
              </Button>
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 hidden group-hover:block z-10">
                <div className="px-3 py-1 text-xs font-medium text-gray-500">Show/Hide Columns</div>
                {Object.entries(showColumns).map(([col, show]) => (
                  <label key={col} className="flex items-center gap-2 px-3 py-1 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={show}
                      onChange={(e) => setShowColumns(prev => ({ ...prev, [col]: e.target.checked }))}
                      className="h-3 w-3"
                    />
                    <span className="text-sm capitalize">{col}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All Status</option>
              <option value="checked-in">Checked In</option>
              <option value="arriving">Arriving</option>
              <option value="departing">Departing</option>
            </select>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Quick search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm w-48 text-gray-900 placeholder:text-gray-600 placeholder:opacity-75"
              />
            </div>
          </div>
        </div>

        {/* Batch Actions - Show when rows selected */}
        {selectedRows.size > 0 && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
            <span className="text-sm text-gray-600">{selectedRows.size} selected</span>
            <Button size="sm" variant="secondary">
              <MessageSquare className="h-3 w-3 mr-1" />
              Send SMS
            </Button>
            <Button size="sm" variant="secondary">
              <DollarSign className="h-3 w-3 mr-1" />
              Process Payments
            </Button>
            <Button size="sm" variant="secondary">
              <FileText className="h-3 w-3 mr-1" />
              Generate Reports
            </Button>
          </div>
        )}
      </div>

      {/* High Density Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-gray-50 z-10">
            <tr className="text-xs font-medium text-gray-700 border-b">
              <th className="text-left p-3 w-10">
                <input
                  type="checkbox"
                  checked={filteredPets.length > 0 && selectedRows.size === filteredPets.length}
                  onChange={selectAll}
                  className="rounded"
                  disabled={isLoading || filteredPets.length === 0}
                />
              </th>
              {showColumns.photo && <th className="text-left p-3 w-12">Pet</th>}
              <th className="text-left p-3">Name/Breed</th>
              {showColumns.owner && <th className="text-left p-3">Owner</th>}
              {showColumns.service && <th className="text-left p-3">Service</th>}
              {showColumns.room && <th className="text-left p-3">Room</th>}
              {showColumns.time && <th className="text-left p-3">Time</th>}
              <th className="text-left p-3">Status</th>
              {showColumns.warnings && <th className="text-left p-3">Alerts</th>}
              {showColumns.vaccines && <th className="text-left p-3">Vaccine</th>}
              {showColumns.balance && <th className="text-right p-3">Balance</th>}
              {showColumns.actions && <th className="text-center p-3 w-32">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={10} className="p-8 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400 mx-auto" />
                </td>
              </tr>
            ) : filteredPets.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-gray-500">
                  No pets found for today
                </td>
              </tr>
            ) : (
              filteredPets.map((pet) => (
                <tr
                  key={pet.id}
                  className={cn(
                    "border-b hover:bg-gray-50 transition-colors",
                    getRowClass(),
                    selectedRows.has(pet.id) && "bg-primary-50"
                  )}
                >
                  {/* Selection */}
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(pet.id)}
                      onChange={() => toggleRowSelection(pet.id)}
                      className="rounded"
                    />
                  </td>

                  {/* Photo */}
                  {showColumns.photo && (
                    <td className="p-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <PawPrint className="h-4 w-4 text-gray-500" />
                      </div>
                    </td>
                  )}

                  {/* Pet Name/Breed */}
                  <td className="p-3">
                    <div className={cn(densityMode === 'compact' && "flex items-center gap-2")}>
                      <p className="font-medium text-gray-900 text-sm">{pet.petName}</p>
                      <p className={cn(
                        "text-xs text-gray-500",
                        densityMode === 'compact' && "hidden lg:inline"
                      )}>
                        {pet.petBreed}
                      </p>
                    </div>
                  </td>

                  {/* Owner */}
                  {showColumns.owner && (
                    <td className="p-3">
                      <div>
                        <p className="text-sm text-gray-900">{pet.ownerName}</p>
                        <p className="text-xs text-gray-500">{pet.ownerPhone}</p>
                      </div>
                    </td>
                  )}

                  {/* Service */}
                  {showColumns.service && (
                    <td className="p-3">
                      <Badge 
                        variant={pet.service === 'Boarding' ? 'primary' : 'secondary'}
                        className="text-xs"
                      >
                        {pet.service}
                      </Badge>
                    </td>
                  )}

                  {/* Room */}
                  {showColumns.room && (
                    <td className="p-3">
                      <span className="text-sm font-medium text-gray-700">{pet.room}</span>
                    </td>
                  )}

                  {/* Time */}
                  {showColumns.time && (
                    <td className="p-3">
                      <div className="text-sm">
                        <p className="text-gray-900">{pet.checkIn}</p>
                        {densityMode !== 'compact' && (
                          <p className="text-xs text-gray-500">→ {pet.checkOut}</p>
                        )}
                      </div>
                    </td>
                  )}

                  {/* Status */}
                  <td className="p-3">
                    <StatusIndicator status={pet.status} />
                  </td>

                  {/* Warnings */}
                  {showColumns.warnings && (
                    <td className="p-3">
                      <WarningIndicators warnings={pet.warnings} notes={pet.notes} />
                    </td>
                  )}

                  {/* Vaccine Status */}
                  {showColumns.vaccines && (
                    <td className="p-3">
                      <VaccineIndicator status={pet.vaccineStatus} />
                    </td>
                  )}

                  {/* Balance */}
                  {showColumns.balance && (
                    <td className="p-3 text-right">
                      {pet.balance > 0 && (
                        <span className="text-sm font-medium text-gray-900">
                          ${pet.balance.toFixed(2)}
                        </span>
                      )}
                    </td>
                  )}

                  {/* Inline Actions */}
                  {showColumns.actions && (
                    <td className="p-3">
                      <InlineActions 
                        pet={pet}
                        onCheckIn={handleCheckIn}
                        onCheckOut={handleCheckOut}
                        onViewInvoice={handleViewInvoice}
                        onSendSMS={handleSendSMS}
                        checkInLoading={checkInMutation.isPending}
                        checkOutLoading={checkOutMutation.isPending}
                      />
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Footer Summary */}
      <div className="px-4 py-3 border-t bg-gray-50 text-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-gray-600">
            <span>Showing {filteredPets.length} of {todaysPets.length} pets</span>
            <span>•</span>
            <span>Total balance due: ${todaysPets.reduce((sum, p) => sum + p.balance, 0).toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm">Export List</Button>
            <Button variant="secondary" size="sm">Print Day Sheet</Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Status Indicator Component
const StatusIndicator = ({ status }) => {
  const config = {
    'checked-in': { icon: CheckCircle, color: 'text-success-600', bg: 'bg-success-50', label: 'Checked In' },
    'arriving': { icon: Clock, color: 'text-warning-600', bg: 'bg-warning-50', label: 'Arriving' },
    'departing': { icon: XCircle, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Departing' }
  };

  const { icon: Icon, color, bg, label } = config[status] || config['arriving'];

  return (
    <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full w-fit", bg)}>
      <Icon className={cn("h-3 w-3", color)} />
      <span className={cn("text-xs font-medium", color)}>{label}</span>
    </div>
  );
};

// Warning Indicators Component
const WarningIndicators = ({ warnings, notes }) => {
  if (!warnings.length && !notes) return <span className="text-xs text-gray-400">None</span>;

  return (
    <div className="flex items-center gap-1">
      {warnings.includes('medication') && (
        <div className="w-5 h-5 bg-warning-500 text-white rounded flex items-center justify-center" title="Medication required">
          <span className="text-[10px] font-bold">M</span>
        </div>
      )}
      {warnings.includes('special-diet') && (
        <div className="w-5 h-5 bg-blue-500 text-white rounded flex items-center justify-center" title="Special diet">
          <span className="text-[10px] font-bold">D</span>
        </div>
      )}
      {warnings.includes('aggressive') && (
        <AlertCircle className="h-4 w-4 text-error-600" title="Aggressive behavior" />
      )}
      {notes && (
        <FileText className="h-4 w-4 text-gray-500" title={notes} />
      )}
    </div>
  );
};

// Vaccine Indicator Component
const VaccineIndicator = ({ status }) => {
  if (status === 'current') {
    return (
      <span className="text-xs text-success-600 font-medium">
        ✓ Current
      </span>
    );
  }
  if (status === 'expires-soon') {
    return (
      <span className="text-xs text-warning-600 font-medium flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        Expires Soon
      </span>
    );
  }
  return (
    <span className="text-xs text-error-600 font-medium">
      Expired
    </span>
  );
};

// Inline Actions Component - The key to avoiding navigation
const InlineActions = ({ pet, onCheckIn, onCheckOut, onViewInvoice, onSendSMS, checkInLoading, checkOutLoading }) => {
  const handleCall = () => {
    if (pet.ownerPhone) {
      window.location.href = `tel:${pet.ownerPhone}`;
    }
  };

  return (
    <div className="flex items-center justify-center gap-1">
      {pet.status === 'arriving' && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2"
          onClick={() => onCheckIn(pet)}
          disabled={checkInLoading}
          title="Check In"
        >
          {checkInLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <CheckCircle className="h-3 w-3" />
          )}
        </Button>
      )}
      
      {pet.status === 'departing' && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2"
          onClick={() => onCheckOut(pet)}
          disabled={checkOutLoading}
          title="Check Out"
        >
          {checkOutLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <XCircle className="h-3 w-3" />
          )}
        </Button>
      )}

      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2"
        onClick={handleCall}
        disabled={!pet.ownerPhone}
        title={`Call ${pet.ownerName}`}
      >
        <PhoneCall className="h-3 w-3" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2"
        onClick={() => onSendSMS(pet)}
        title={`Send SMS to ${pet.ownerName}`}
      >
        <MessageSquare className="h-3 w-3" />
      </Button>

      {pet.balance > 0 && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-primary-600"
          onClick={() => onViewInvoice(pet)}
          title="View Invoice"
        >
          <DollarSign className="h-3 w-3" />
        </Button>
      )}

      <Button size="sm" variant="ghost" className="h-7 px-2" title="More options">
        <MoreVertical className="h-3 w-3" />
      </Button>
    </div>
  );
};

export default HighDensityTodayView;


