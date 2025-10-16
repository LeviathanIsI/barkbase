import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { differenceInMinutes, format } from 'date-fns';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import { useBookingCheckOutMutation, useIncidentsQuery } from '../api';
import { useGenerateInvoiceMutation } from '@/features/invoices/api';
import { formatCurrency } from '@/lib/utils';

const SignatureCanvas = forwardRef(({ onChange }, ref) => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    ctxRef.current = ctx;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#111827';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const getPoint = (event) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    };

    const handlePointerDown = (event) => {
      drawingRef.current = true;
      const { x, y } = getPoint(event);
      ctx.beginPath();
      ctx.moveTo(x, y);
      canvas.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event) => {
      if (!drawingRef.current) return;
      const { x, y } = getPoint(event);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const finishStroke = (event) => {
      if (!drawingRef.current) return;
      drawingRef.current = false;
      canvas.releasePointerCapture(event.pointerId);
      onChange?.(canvas.toDataURL('image/png'));
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', finishStroke);
    canvas.addEventListener('pointerleave', finishStroke);

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', finishStroke);
      canvas.removeEventListener('pointerleave', finishStroke);
    };
  }, [onChange]);

  useImperativeHandle(
    ref,
    () => ({
      clear: () => {
        const canvas = canvasRef.current;
        const ctx = ctxRef.current;
        if (!canvas || !ctx) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        onChange?.(null);
      },
      toDataURL: () => canvasRef.current?.toDataURL('image/png'),
    }),
    [onChange],
  );

  return (
    <canvas
      ref={canvasRef}
      width={480}
      height={200}
      className="h-40 w-full rounded-lg border border-dashed border-border/70 bg-white"
    />
  );
});

SignatureCanvas.displayName = 'SignatureCanvas';

const buildReceiptHtml = ({ booking, ownerName, lateFeeCents, addOnsCents, remainingBalanceCents, signatureUrl }) => {
  const printedAt = format(new Date(), 'PPpp');
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Receipt</title>
    <style>
      body { font-family: Helvetica, Arial, sans-serif; width: 80mm; margin: 0; padding: 8mm; }
      h1 { font-size: 16px; margin: 0 0 8px; text-align: center; }
      table { width: 100%; font-size: 12px; border-collapse: collapse; }
      td { padding: 4px 0; }
      .totals { border-top: 1px solid #d1d5db; margin-top: 8px; padding-top: 8px; }
      .muted { color: #6b7280; font-size: 11px; text-align: center; margin-top: 8px; }
    </style>
  </head>
  <body>
    <h1>${booking.tenantName ?? 'Boarding Receipt'}</h1>
    <p><strong>Guest:</strong> ${booking.pet?.name ?? 'N/A'}<br/>
       <strong>Owner:</strong> ${ownerName ?? 'N/A'}<br/>
       <strong>Checkout:</strong> ${printedAt}</p>
    <table>
      <tr><td>Balance due</td><td style="text-align:right">${formatCurrency(booking.balanceDueCents ?? 0)}</td></tr>
      <tr><td>Late fee</td><td style="text-align:right">${formatCurrency(lateFeeCents)}</td></tr>
      <tr><td>Add-ons</td><td style="text-align:right">${formatCurrency(addOnsCents)}</td></tr>
    </table>
    <div class="totals">
      <div style="display:flex; justify-content:space-between; font-weight:600;">
        <span>Remaining balance</span>
        <span>${formatCurrency(remainingBalanceCents)}</span>
      </div>
    </div>
    ${signatureUrl ? `<p class="muted">Guardian signature</p><img src="${signatureUrl}" alt="Signature" />` : ''}
    <p class="muted">Thank you for boarding with us!</p>
  </body>
</html>`;
};

const buildGoHomeHtml = ({ booking, notes, incidentSummary, pickupTime, signatureUrl }) => {
  const petName = booking.pet?.name ?? booking.petName ?? 'Your pet';
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Go-Home Report</title>
    <style>
      body { font-family: Helvetica, Arial, sans-serif; margin: 0; padding: 24px; color: #111827; }
      h1 { font-size: 24px; margin-bottom: 4px; }
      section { margin-bottom: 18px; }
      .muted { color: #6b7280; }
    </style>
  </head>
  <body>
    <h1>${petName}'s Stay Summary</h1>
    <p class="muted">Checked out at ${pickupTime}</p>
    <section>
      <h2>Highlights</h2>
      <p>${notes || 'Happy, hydrated, and ready for cuddles at home.'}</p>
    </section>
    ${incidentSummary ? `<section><h2>Incident Overview</h2><p>${incidentSummary}</p></section>` : ''}
    ${signatureUrl ? `<section><h2>Guardian Signature</h2><img src="${signatureUrl}" alt="Signature" /></section>` : ''}
    <footer class="muted">We loved caring for ${petName}. Contact us anytime for updates.</footer>
  </body>
</html>`;
};

const openPrintWindow = (html) => {
  const win = window.open('', '_blank', 'noopener,noreferrer,width=600,height=800');
  if (!win) {
    toast.error('Please allow pop-ups to print.');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 250);
};

const CheckOutModal = ({ booking, open, onClose }) => {
  const [checkoutTime, setCheckoutTime] = useState(() => new Date().toISOString().slice(0, 16));
  const [lateFeeCents, setLateFeeCents] = useState(0);
  const [lateFeeTouched, setLateFeeTouched] = useState(false);
  const [addOnsDescription, setAddOnsDescription] = useState('');
  const [addOnsCents, setAddOnsCents] = useState(0);
  const [capturePayment, setCapturePayment] = useState(true);
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const [sendReceipt, setSendReceipt] = useState(true);
  const [notes, setNotes] = useState('');
  const [signatureUrl, setSignatureUrl] = useState(null);
  const [incidentMode, setIncidentMode] = useState('none');
  const [selectedIncidentId, setSelectedIncidentId] = useState('');
  const [incidentSeverity, setIncidentSeverity] = useState('MINOR');
  const [incidentNarrative, setIncidentNarrative] = useState('');
  const [incidentVetContacted, setIncidentVetContacted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const signatureRef = useRef(null);
  const mutation = useBookingCheckOutMutation();
  const generateInvoiceMutation = useGenerateInvoiceMutation();
  const incidentQuery = useIncidentsQuery({ bookingId: booking?.recordId, petId: booking?.pet?.recordId ?? booking?.petId });

  useEffect(() => {
    if (open) {
      const now = new Date();
      setCheckoutTime(now.toISOString().slice(0, 16));
      setLateFeeTouched(false);
      setLateFeeCents(0);
      setAddOnsDescription('');
      setAddOnsCents(0);
      setCapturePayment(true);
      setPaymentIntentId('');
      setSendReceipt(true);
      setNotes('');
      setSignatureUrl(null);
      setIncidentMode('none');
      setSelectedIncidentId('');
      setIncidentSeverity('MINOR');
      setIncidentNarrative('');
      setIncidentVetContacted(false);
      signatureRef.current?.clear?.();
    }
  }, [open]);

  useEffect(() => {
    if (!lateFeeTouched && booking?.checkOut) {
      const scheduledCheckout = new Date(booking.checkOut);
      const actualCheckout = new Date(checkoutTime);
      const minutesLate = differenceInMinutes(actualCheckout, scheduledCheckout);
      if (minutesLate > 60) {
        const hoursLate = Math.floor(minutesLate / 60);
        setLateFeeCents(hoursLate * 1500);
      } else {
        setLateFeeCents(0);
      }
    }
  }, [checkoutTime, booking, lateFeeTouched]);

  const remainingBalanceCents = useMemo(() => {
    const base = booking?.balanceDueCents ?? 0;
    return base + lateFeeCents + addOnsCents;
  }, [booking, lateFeeCents, addOnsCents]);

  const handleSubmit = async () => {
    if (!booking?.recordId) return;

    const payload = {
      time: new Date(checkoutTime).toISOString(),
      remainingBalanceCents,
      signatureUrl,
      capturePayment,
      paymentIntentId: paymentIntentId || null,
      extraCharges: {
        lateFeeCents,
        addOnsCents,
        addOnsDescription,
      },
      metadata: {},
    };

    if (incidentMode === 'create') {
      payload.incident = {
        petId: booking.pet?.recordId ?? booking.petId,
        occurredAt: new Date().toISOString(),
        severity: incidentSeverity,
        narrative: incidentNarrative,
        photos: [],
        vetContacted: incidentVetContacted,
      };
    } else if (incidentMode === 'existing' && selectedIncidentId) {
      payload.incidentReportId = selectedIncidentId;
    }

    try {
      setIsSubmitting(true);
      const result = await mutation.mutateAsync({ bookingId: booking.recordId, payload });
      toast.success(`Checked out ${booking?.pet?.name ?? 'pet'} successfully.`);

      // Auto-generate invoice after successful checkout
      try {
        await generateInvoiceMutation.mutateAsync(booking.recordId);
        toast.success('Invoice generated successfully');
      } catch (invoiceError) {
        console.error('Failed to generate invoice:', invoiceError);
        toast.error('Checkout successful, but invoice generation failed');
      }

      if (sendReceipt) {
        const ownerName = `${booking.owner?.firstName ?? ''} ${booking.owner?.lastName ?? ''}`.trim();
        const receiptHtml = buildReceiptHtml({
          booking,
          ownerName,
          lateFeeCents,
          addOnsCents,
          remainingBalanceCents,
          signatureUrl,
        });
        openPrintWindow(receiptHtml);
      }

      onClose?.();
    } catch (error) {
      toast.error(error?.message ?? 'Unable to complete check-out.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintGoHomeReport = () => {
    const pickupTime = format(new Date(checkoutTime), 'PPpp');
    const incidentSummary = incidentMode === 'create' && incidentNarrative ? incidentNarrative : '';
    const html = buildGoHomeHtml({
      booking,
      notes,
      incidentSummary,
      pickupTime,
      signatureUrl,
    });
    openPrintWindow(html);
  };

  if (!booking) {
    return (
      <Modal open={open} onClose={onClose} title="Check Out">
        <Skeleton className="h-96 w-full" />
      </Modal>
    );
  }

  const scheduledCheckOut = booking.checkOut ?? booking.dateRange?.end;
  const kennelName = booking.kennelName ?? booking.segments?.[0]?.kennel?.name;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Check Out ${booking.pet?.name ?? booking.petName ?? ''}`.trim()}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={handlePrintGoHomeReport} disabled={isSubmitting}>
            Print Go-Home Report
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Processing…' : 'Complete Check-Out'}
          </Button>
        </>
      }
    >
      <div className="rounded-xl border border-border/60 bg-surface/60 p-4 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="info">
            Scheduled {scheduledCheckOut ? format(new Date(scheduledCheckOut), 'PPpp') : 'n/a'}
          </Badge>
          {kennelName ? <Badge variant="neutral">From {kennelName}</Badge> : null}
          <Badge variant="neutral">Booking #{booking.id?.slice(0, 8)}</Badge>
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium">Actual Checkout Time</label>
          <input
            type="datetime-local"
            value={checkoutTime}
            onChange={(e) => setCheckoutTime(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">Late Fee</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={(lateFeeCents / 100).toFixed(2)}
            onChange={(e) => {
              setLateFeeTouched(true);
              setLateFeeCents(Math.round(parseFloat(e.target.value || 0) * 100));
            }}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="0.00"
          />
          <p className="text-xs text-muted">Auto-calculated for late pickups (hourly rate: $15)</p>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">Add-On Charges</label>
          <input
            type="text"
            value={addOnsDescription}
            onChange={(e) => setAddOnsDescription(e.target.value)}
            placeholder="Description (e.g., extra bath, nail trim)"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <input
            type="number"
            step="0.01"
            min="0"
            value={(addOnsCents / 100).toFixed(2)}
            onChange={(e) => setAddOnsCents(Math.round(parseFloat(e.target.value || 0) * 100))}
            placeholder="0.00"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <div className="rounded-lg border border-border bg-surface/60 p-3">
          <div className="flex justify-between text-sm">
            <span>Original Balance:</span>
            <span>{formatCurrency(booking.balanceDueCents ?? 0)}</span>
          </div>
          <div className="flex justify-between text-sm text-muted">
            <span>+ Late Fee:</span>
            <span>{formatCurrency(lateFeeCents)}</span>
          </div>
          <div className="flex justify-between text-sm text-muted">
            <span>+ Add-Ons:</span>
            <span>{formatCurrency(addOnsCents)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold">
            <span>Total Due:</span>
            <span>{formatCurrency(remainingBalanceCents)}</span>
          </div>
        </div>

        <div className="grid gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={capturePayment} onChange={(e) => setCapturePayment(e.target.checked)} />
            Capture payment now
          </label>
          {capturePayment && (
            <input
              type="text"
              value={paymentIntentId}
              onChange={(e) => setPaymentIntentId(e.target.value)}
              placeholder="Payment Intent ID (optional)"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          )}
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">Incident Report</label>
          <select
            value={incidentMode}
            onChange={(e) => setIncidentMode(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="none">No incident to report</option>
            <option value="create">Create new incident report</option>
            {incidentQuery.data?.length > 0 && <option value="existing">Link existing incident</option>}
          </select>

          {incidentMode === 'create' && (
            <div className="grid gap-3 rounded-lg border border-border bg-surface/60 p-3">
              <select
                value={incidentSeverity}
                onChange={(e) => setIncidentSeverity(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              >
                <option value="MINOR">Minor</option>
                <option value="MODERATE">Moderate</option>
                <option value="SEVERE">Severe</option>
                <option value="CRITICAL">Critical</option>
              </select>
              <textarea
                rows={3}
                value={incidentNarrative}
                onChange={(e) => setIncidentNarrative(e.target.value)}
                placeholder="Describe what happened..."
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={incidentVetContacted}
                  onChange={(e) => setIncidentVetContacted(e.target.checked)}
                />
                Vet was contacted
              </label>
            </div>
          )}

          {incidentMode === 'existing' && (
            <select
              value={selectedIncidentId}
              onChange={(e) => setSelectedIncidentId(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            >
              <option value="">Select an incident...</option>
              {incidentQuery.data?.map((incident) => (
                <option key={incident.recordId} value={incident.recordId}>
                  {format(new Date(incident.occurredAt), 'PPpp')} - {incident.severity}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">Go-Home Notes</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Summary of the stay, behavior highlights, feeding notes"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">Guardian Signature</label>
          <SignatureCanvas ref={signatureRef} onChange={setSignatureUrl} />
          <button
            type="button"
            onClick={() => signatureRef.current?.clear()}
            className="text-sm text-primary hover:underline"
          >
            Clear signature
          </button>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={sendReceipt} onChange={(e) => setSendReceipt(e.target.checked)} />
          Print thermal receipt on checkout
        </label>
      </div>
    </Modal>
  );
};

export default CheckOutModal;
