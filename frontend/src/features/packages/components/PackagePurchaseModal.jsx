import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useCreatePackageMutation } from '../api';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

const PackagePurchaseModal = ({ open, onClose, ownerId, ownerName }) => {
  const [name, setName] = useState('');
  const [credits, setCredits] = useState(10);
  const [priceCents, setPriceCents] = useState(10000); // $100
  const [expiresAt, setExpiresAt] = useState('');

  const createMutation = useCreatePackageMutation();

  const pricePerCredit = credits > 0 ? Math.round(priceCents / credits) : 0;
  const savings = credits > 0 ? Math.round((10000 - pricePerCredit) / 100) : 0; // vs $100/credit baseline

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await createMutation.mutateAsync({
        ownerId,
        name: name || `${credits}-Visit Package`,
        creditsPurchased: credits,
        priceCents,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null
      });

      toast.success('Package created successfully');
      onClose();
      
      // Reset form
      setName('');
      setCredits(10);
      setPriceCents(10000);
      setExpiresAt('');
    } catch (error) {
      toast.error('Failed to create package');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Purchase Package for ${ownerName}`}
      className="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Package Name (Optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`${credits}-Visit Package`}
        />

        <Input
          label="Number of Credits"
          type="number"
          min="1"
          max="100"
          value={credits}
          onChange={(e) => setCredits(parseInt(e.target.value) || 0)}
          helper="1 credit = 1 daycare/boarding visit"
          required
        />

        <Input
          label="Total Package Price"
          type="number"
          min="0"
          step="100"
          value={priceCents}
          onChange={(e) => setPriceCents(parseInt(e.target.value) || 0)}
          helper={`${formatCurrency(priceCents)} (${formatCurrency(pricePerCredit)} per credit)`}
          required
        />

        {savings > 0 && (
          <div className="bg-success/10 border border-success/20 rounded-lg p-3">
            <p className="text-sm text-success font-medium">
              Saves ${savings} per credit vs. regular pricing
            </p>
          </div>
        )}

        <Input
          label="Expiration Date (Optional)"
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          helper="Leave blank for no expiration"
        />

        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            disabled={createMutation.isLoading || credits < 1 || priceCents < 1}
          >
            {createMutation.isLoading ? 'Creating...' : 'Create Package'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default PackagePurchaseModal;

