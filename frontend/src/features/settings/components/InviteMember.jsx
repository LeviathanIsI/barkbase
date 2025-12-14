import { useState } from 'react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import StyledSelect from '@/components/ui/StyledSelect';
import { useInviteMemberMutation } from '../api';

const roles = [
  { value: 'OWNER', label: 'Owner' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'STAFF', label: 'Staff' },
  { value: 'READONLY', label: 'Read Only' },
];

const InviteMember = () => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('STAFF');
  const mutation = useInviteMemberMutation();

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await mutation.mutateAsync({ email, role });
      toast.success('Invitation sent');
      setEmail('');
      setRole('STAFF');
      setOpen(false);
    } catch (error) {
      toast.error(error.message ?? 'Failed to send invite');
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>Invite Member</Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-hidden="true" />
          <Card className="relative w-full max-w-md">
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <div>
                <h2 className="text-lg font-semibold text-text">Invite a teammate</h2>
                <p className="text-sm text-muted">Send an email invite with role-based access.</p>
              </div>
              <label className="text-sm font-medium text-text">
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                  required
                  autoFocus
                />
              </label>
              <div className="text-sm font-medium text-text">
                <span className="mb-1 block">Role</span>
                <StyledSelect
                  options={roles}
                  value={role}
                  onChange={(opt) => setRole(opt?.value || 'STAFF')}
                  isClearable={false}
                  isSearchable={false}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={mutation.isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={mutation.isPending || !email}>
                  {mutation.isPending ? 'Sending…' : 'Send Invite'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}
    </>
  );
};

export default InviteMember;
