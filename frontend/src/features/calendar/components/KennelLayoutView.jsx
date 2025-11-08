import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfDay, endOfDay } from 'date-fns';
import { Edit, Move, AlertTriangle, Plus } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Skeleton from '@/components/ui/Skeleton';
import { useKennels, useUpdateKennel } from '@/features/kennels/api';
import { useBookingsQuery } from '@/features/bookings/api';
import KennelForm from '@/features/kennels/components/KennelForm';
import { useOccupancyQuery, useAssignKennelMutation, useReassignKennelMutation } from '../api';

const KennelLayoutView = ({ currentDate }) => {
  const navigate = useNavigate();

  const [showAssign, setShowAssign] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedKennelId, setSelectedKennelId] = useState(null);

  const dayStart = startOfDay(currentDate || new Date());
  const dayEnd = endOfDay(currentDate || new Date());

  // Data sources
  const { data: kennels = [], isLoading: kennelsLoading } = useKennels();
  const { data: occupancyData, isLoading: occupancyLoading } = useOccupancyQuery({
    from: format(dayStart, 'yyyy-MM-dd'),
    to: format(dayEnd, 'yyyy-MM-dd'),
  });
  const { data: bookings = [] } = useBookingsQuery();

  // Merge occupancy into kennels list
  const groupedByBuilding = useMemo(() => {
    const byId = new Map();
    (occupancyData?.kennels || []).forEach((k) => {
      const id = k.kennel?.recordId || k.kennel?.id || k.kennelId;
      if (id) byId.set(id, k);
    });

    const merged = kennels.map((k) => {
      const occ = byId.get(k.recordId);
      return {
        ...k,
        occupied: occ?.occupied ?? k.occupied ?? 0,
        available: occ?.available ?? Math.max((k.capacity || 0) - (k.occupied || 0), 0),
        bookings: occ?.bookings || [],
      };
    });

    const groups = merged.reduce((acc, k) => {
      const key = k.building || 'General';
      acc[key] = acc[key] || [];
      acc[key].push(k);
      return acc;
    }, {});

    return Object.entries(groups).map(([building, list]) => ({ building, list }));
  }, [kennels, occupancyData]);

  const totalCapacity = useMemo(() => kennels.reduce((s, k) => s + (k.capacity || 0), 0), [kennels]);
  const totalOccupied = useMemo(() => groupedByBuilding.reduce((s, g) => s + g.list.reduce((x, k) => x + (k.occupied || 0), 0), 0), [groupedByBuilding]);
  const totalAvailable = Math.max(0, totalCapacity - totalOccupied);
  const utilizationPercent = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

  // Mutations
  const assignMutation = useAssignKennelMutation();
  const reassignMutation = useReassignKennelMutation();

  // Simple modals
  const AssignModal = () => {
    const defaultKennel = selectedKennelId || '';
    const [form, setForm] = useState({ bookingId: '', kennelId: defaultKennel, startDate: format(dayStart, 'yyyy-MM-dd'), endDate: format(dayEnd, 'yyyy-MM-dd') });
    const onSubmit = async (e) => {
      e.preventDefault();
      await assignMutation.mutateAsync(form);
      setShowAssign(false);
    };
    return (
      <Modal open onClose={() => setShowAssign(false)} className="max-w-md">
        <form onSubmit={onSubmit} className="space-y-4">
          <h3 className="text-lg font-semibold">Assign Kennel</h3>
          <Select label="Booking" value={form.bookingId} onChange={(e) => setForm({ ...form, bookingId: e.target.value })} required>
            <option value="">Select…</option>
            {(bookings || []).map((b) => {
              const id = b.recordId || b.bookingId || b.id;
              const petName = b.pet?.name || b.petName || 'Unknown Pet';
              const ownerName = b.owner?.name || b.ownerName || '';
              return (
                <option key={id} value={id}>{`#${String(id).slice(0,8)} — ${petName}${ownerName ? ` (${ownerName})` : ''}`}</option>
              );
            })}
          </Select>
          <Select label="Kennel" value={form.kennelId} onChange={(e) => setForm({ ...form, kennelId: e.target.value })} required>
            <option value="">Select…</option>
            {kennels.map((k) => (
              <option key={k.recordId} value={k.recordId}>{k.name}</option>
            ))}
          </Select>
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Start Date" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
            <Input label="End Date" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowAssign(false)}>Cancel</Button>
            <Button type="submit" loading={assignMutation.isPending}>Assign</Button>
          </div>
        </form>
      </Modal>
    );
  };

  const MoveModal = () => {
    const [form, setForm] = useState({ segmentId: '', kennelId: selectedKennelId || '' });
    const allSegments = (occupancyData?.kennels || []).flatMap((k) => (k.bookings || []).map((b) => ({...b, kennelName: k.kennel?.name })));
    const onSubmit = async (e) => {
      e.preventDefault();
      await reassignMutation.mutateAsync(form);
      setShowMove(false);
    };
    return (
      <Modal open onClose={() => setShowMove(false)} className="max-w-md">
        <form onSubmit={onSubmit} className="space-y-4">
          <h3 className="text-lg font-semibold">Move Pet</h3>
          <Select label="Segment" value={form.segmentId} onChange={(e) => setForm({ ...form, segmentId: e.target.value })} required>
            <option value="">Select…</option>
            {allSegments.map((seg) => (
              <option key={seg.segmentId || seg.recordId} value={seg.segmentId || seg.recordId}>
                {(seg.petName || 'Pet')} @ {seg.kennelName || 'Kennel'}
              </option>
            ))}
          </Select>
          <Select label="Target Kennel" value={form.kennelId} onChange={(e) => setForm({ ...form, kennelId: e.target.value })}>
            <option value="">Keep same</option>
            {kennels.map((k) => (
              <option key={k.recordId} value={k.recordId}>{k.name}</option>
            ))}
          </Select>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowMove(false)}>Cancel</Button>
            <Button type="submit" loading={reassignMutation.isPending}>Move</Button>
          </div>
        </form>
      </Modal>
    );
  };

  const MaintenanceModal = () => {
    const [kennelId, setKennelId] = useState(selectedKennelId || '');
    const updateKennelMutation = useUpdateKennel(kennelId);
    const onSubmit = async (e) => {
      e.preventDefault();
      if (!kennelId) return;
      await updateKennelMutation.mutateAsync({ isActive: false });
      setShowMaintenance(false);
    };
    return (
      <Modal open onClose={() => setShowMaintenance(false)} className="max-w-md">
        <form onSubmit={onSubmit} className="space-y-4">
          <h3 className="text-lg font-semibold">Mark Maintenance</h3>
          {kennelId ? (
            <div className="text-sm text-gray-700 dark:text-text-primary">Kennel: {kennels.find(k => k.recordId === kennelId)?.name || kennelId}</div>
          ) : (
            <Select label="Kennel" value={kennelId} onChange={(e) => setKennelId(e.target.value)} required>
              <option value="">Select…</option>
              {kennels.map((k) => (
                <option key={k.recordId} value={k.recordId}>{k.name}</option>
              ))}
            </Select>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowMaintenance(false)}>Cancel</Button>
            <Button type="submit">Mark</Button>
          </div>
        </form>
      </Modal>
    );
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary">Kennel Layout</h2>
        <Button variant="outline" onClick={() => navigate('/kennels')}>
          <Edit className="w-4 h-4 mr-2" />
          Edit Layout
        </Button>
      </div>

      <p className="text-gray-600 dark:text-text-secondary mb-6">Visual overview of your facility</p>

      {(kennelsLoading || occupancyLoading) ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="space-y-8">
          {groupedByBuilding.map((group) => (
            <div key={group.building}>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-4">{group.building}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {group.list.map((kennel) => (
                  <button
                    key={kennel.recordId}
                    type="button"
                    onClick={() => { setSelectedKennelId(kennel.recordId); setShowMaintenance(true); }}
                    className={`border-2 rounded-lg p-4 text-left focus:outline-none focus:ring-2 focus:ring-blue-400 ${kennel.occupied > 0 ? 'border-green-300 bg-green-50 dark:bg-surface-primary' : 'border-gray-300 dark:border-surface-border bg-gray-50 dark:bg-surface-secondary'}`}
                  >
                    <div className="text-center">
                      <div className="font-semibold text-gray-900 dark:text-text-primary">{kennel.name}</div>
                      <div className="text-sm text-gray-600 dark:text-text-secondary">Cap {kennel.capacity ?? 1}</div>
                      {kennel.occupied > 0 ? (
                        <div className="mt-2 space-y-1">
                          {(kennel.bookings || []).slice(0, 2).map((b) => (
                            <div key={b.segmentId || b.bookingId} className="text-xs font-medium text-green-800">✅ {b.petName || 'Occupied'}</div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-gray-500 dark:text-text-secondary">🟢 OPEN</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded-lg p-4 my-6">
        <div className="font-semibold text-blue-900 dark:text-blue-100">CAPACITY: {totalOccupied}/{totalCapacity} kennels occupied ({utilizationPercent}%)</div>
        <div className="text-sm text-blue-700 dark:text-blue-300">• {totalAvailable} available now</div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setShowAssign(true)}>
          <Move className="w-4 h-4 mr-2" />
          Assign Kennel
        </Button>
        <Button variant="outline" onClick={() => setShowMove(true)}>
          <Move className="w-4 h-4 mr-2" />
          Move Pet
        </Button>
        <Button variant="outline" onClick={() => setShowMaintenance(true)}>
          <AlertTriangle className="w-4 h-4 mr-2" />
          Mark Maintenance
        </Button>
        <Button variant="outline" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Kennel
        </Button>
      </div>

      {showAssign && <AssignModal />}
      {showMove && <MoveModal />}
      {showMaintenance && <MaintenanceModal />}
      {showAdd && (
        <KennelForm kennel={null} onClose={() => setShowAdd(false)} onSuccess={() => setShowAdd(false)} terminology={{ kennel: 'Kennel', suite: 'Suite', cabin: 'Cabin', daycare: 'Daycare', medical: 'Medical' }} />
      )}
    </Card>
  );
};

export default KennelLayoutView;
