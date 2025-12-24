import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import Input from "@/components/ui/Input";
import apiClient from "@/lib/apiClient";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID)
    return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export default function HolidayManager({ open, onClose }) {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    start: "",
    end: "",
    recurring: false,
  });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await apiClient("/api/v1/account-defaults");
        if (!cancelled) setHolidays(data?.holidays ?? []);
      } catch (e) {
        toast.error("Failed to load holiday schedule");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const canSave = form.name.trim() && form.start && form.end && !saving;

  const handleAdd = async () => {
    if (!canSave) return;
    const next = [
      ...holidays,
      {
        recordId: generateId(),
        name: form.name.trim(),
        startDate: form.start,
        endDate: form.end,
        recurring: Boolean(form.recurring),
      },
    ];
    await persist(next, "Holiday added");
    setForm({ name: "", start: "", end: "", recurring: false });
  };

  const handleRemove = async (recordId) => {
    const next = holidays.filter((h) => h.recordId !== recordId);
    await persist(next, "Holiday removed");
  };

  const persist = async (next, successMsg) => {
    try {
      setSaving(true);
      await apiClient("/api/v1/account-defaults", {
        method: "PATCH",
        body: { holidays: next },
      });
      setHolidays(next);
      toast.success(successMsg);
    } catch (e) {
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose?.() : null)}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Holiday Schedule</DialogTitle>
          <DialogDescription>
            Manage closed dates and holidays. Closed dates immediately block new
            bookings.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <Card
            title="Add Holiday"
            description="Create a new closed date or date range."
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-6 min-w-0">
                <Input
                  label="Name"
                  className="w-full min-w-0"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Memorial Day"
                />
              </div>
              <div className="md:col-span-3 min-w-0">
                <Input
                  label="Start Date"
                  type="date"
                  className="w-full min-w-0"
                  value={form.start}
                  onChange={(e) => setForm({ ...form, start: e.target.value })}
                />
              </div>
              <div className="md:col-span-3 min-w-0">
                <Input
                  label="End Date"
                  type="date"
                  className="w-full min-w-0"
                  value={form.end}
                  onChange={(e) => setForm({ ...form, end: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm md:col-span-12 mt-1">
                <input
                  type="checkbox"
                  checked={form.recurring}
                  onChange={(e) =>
                    setForm({ ...form, recurring: e.target.checked })
                  }
                />
                Repeat every year
              </label>
              <div className="md:col-span-12 flex justify-end">
                <Button onClick={handleAdd} disabled={!canSave}>
                  {saving ? "Saving…" : "Add Holiday"}
                </Button>
              </div>
            </div>
          </Card>

          <Card
            title="Scheduled Closures"
            description={
              loading
                ? "Loading…"
                : holidays.length
                ? "Existing closed dates"
                : "No holidays scheduled yet."
            }
          >
            <div className="space-y-3">
              {holidays.map((h) => (
                <div
                  key={h.recordId}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                >
                  <div>
                    <div className="font-medium text-sm text-text">
                      {h.name}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-text-secondary">
                      {h.startDate}{" "}
                      {h.endDate && h.endDate !== h.startDate
                        ? `– ${h.endDate}`
                        : ""}{" "}
                      {h.recurring ? "(recurring)" : ""}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(h.recordId)}
                    disabled={saving}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
