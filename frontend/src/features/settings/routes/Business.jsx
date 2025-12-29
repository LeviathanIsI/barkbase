import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import StyledSelect from '@/components/ui/StyledSelect';
import apiClient from '@/lib/apiClient';
import { useTenantStore } from '@/stores/tenant';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { useLocation, useNavigate } from 'react-router-dom';
import { Clock, Moon, Sun, Scissors, Award, Phone as PhoneIcon, Mail, Globe, Building2, Home, DollarSign, Shield, CreditCard, Bell, FileText, AlertTriangle } from 'lucide-react';
import HolidayManager from '../components/HolidayManager';
import { Switch } from '@/components/ui/Switch';
import { useTimezoneUtils } from '@/lib/timezone';

const Business = () => {
  const tenant = useTenantStore((state) => state.tenant);
  const setTenant = useTenantStore((state) => state.setTenant);

  const navigate = useNavigate();
  const location = useLocation();
  const search = new URLSearchParams(location.search);
  const initialTab = search.get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    address: '',
    email: '',
    website: '',
    emergency: '',
    facebook: '',
    instagram: '',
  });

  const defaultHours = useMemo(() => ({
    Monday: { closed: false, open: '07:00', close: '18:00' },
    Tuesday: { closed: false, open: '07:00', close: '18:00' },
    Wednesday: { closed: false, open: '07:00', close: '18:00' },
    Thursday: { closed: false, open: '07:00', close: '18:00' },
    Friday: { closed: false, open: '07:00', close: '18:00' },
    Saturday: { closed: false, open: '08:00', close: '17:00' },
    Sunday: { closed: false, open: '08:00', close: '17:00' },
  }), []);
  const [hours, setHours] = useState(defaultHours);
  const [holidayOpen, setHolidayOpen] = useState(false);

  const [services, setServices] = useState({
    boarding: true,
    daycare: true,
    grooming: false,
    training: false,
    dropIn: false,
  });

  const [capacity, setCapacity] = useState({
    boarding: 20,
    daycare: 15,
    grooming: 2,
    enableSizeBased: false,
    small: 8,
    medium: 8,
    large: 6,
    cats: 4,
    staffRatio: 10,
    alertThreshold: 90,
    blockWhenFull: true,
    overbookingBuffer: 0,
  });

  // Load current defaults
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await apiClient('/api/v1/account-defaults');
        if (!isMounted) return;
        setProfile((prev) => ({
          ...prev,
          name: data?.businessInfo?.name ?? tenant?.name ?? '',
          phone: data?.businessInfo?.phone ?? '',
          email: data?.businessInfo?.email ?? '',
          website: data?.businessInfo?.website ?? '',
        }));
        setIsDirty(false);
      } catch (_) {
        setProfile((prev) => ({ ...prev, name: prev.name || tenant?.name || '' }));
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [tenant?.name]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      if (activeTab === 'profile') {
        await apiClient('/api/v1/account-defaults', {
          method: 'PATCH',
          body: { businessInfo: { name: profile.name, phone: profile.phone, email: profile.email, website: profile.website } },
        });
        setTenant({ ...tenant, name: profile.name });
      }
      toast.success('Business name updated');
      setIsDirty(false);
    } catch (error) {
      toast.error(error?.message ?? 'Failed to update business name');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">Business Settings</h1>
          <p className="mt-1 text-sm text-muted">Configure your facility profile, hours, services, policies and more</p>
        </div>
        <Button onClick={handleSave} disabled={!isDirty || isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </header>

      <Tabs value={activeTab} onValueChange={(t)=>{ setActiveTab(t); navigate(`?tab=${t}`, { replace: true }); }}>
        <TabsList className="border-b border-border w-full justify-start gap-6 bg-transparent px-0 mb-6">
          {['profile','hours','services','policies','vaccinations','branding','payments','notifications','legal'].map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize px-0 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent">{t.replace('-',' & ')}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="profile">
          <Card title="Business Information" description="Update your business details.">
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Business Name" value={profile.name} onChange={(e)=>{setProfile({...profile,name:e.target.value}); setIsDirty(true);}} />
                <Input label="Phone" value={profile.phone} placeholder="+1 (555) 123-4567" onChange={(e)=>{setProfile({...profile,phone:e.target.value}); setIsDirty(true);}} />
                <Input label="Email" type="email" value={profile.email} placeholder="business@example.com" onChange={(e)=>{setProfile({...profile,email:e.target.value}); setIsDirty(true);}} />
                <Input label="Website URL" type="url" value={profile.website} placeholder="https://" onChange={(e)=>{setProfile({...profile,website:e.target.value}); setIsDirty(true);}} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text">Address</label>
                <textarea className="w-full rounded-md border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary px-4 py-3 text-sm text-gray-900 dark:text-text-primary placeholder:text-gray-600 dark:placeholder:text-text-secondary" rows={3} placeholder="Street address, city, state, ZIP" onChange={()=>setIsDirty(true)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="After-hours emergencies" value={profile.emergency} onChange={(e)=>{setProfile({...profile,emergency:e.target.value}); setIsDirty(true);}} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Facebook URL" value={profile.facebook} onChange={(e)=>{setProfile({...profile,facebook:e.target.value}); setIsDirty(true);}} />
                  <Input label="Instagram Handle" value={profile.instagram} placeholder="@yourkennel" onChange={(e)=>{setProfile({...profile,instagram:e.target.value}); setIsDirty(true);}} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={!isDirty || isSaving}>{isSaving ? 'Saving…' : 'Save Changes'}</Button>
              </div>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="hours">
          <Card title="Business Hours" description="Set your operating hours for each day of the week.">
            <div className="space-y-4">
              {Object.entries(hours).map(([day, cfg]) => (
                <div key={day} className="flex items-center justify-between gap-4 border rounded-md p-3">
                  <div className="font-medium w-32">{day}</div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={cfg.closed} onChange={(e)=>{setHours({...hours,[day]:{...cfg, closed:e.target.checked}}); setIsDirty(true);}} />
                    Closed
                  </label>
                  {!cfg.closed && (
                    <div className="flex items-center gap-2">
                      <TimeSelect value={cfg.open} onChange={(v)=>{setHours({...hours,[day]:{...cfg, open:v}}); setIsDirty(true);}} />
                      <span>-</span>
                      <TimeSelect value={cfg.close} onChange={(v)=>{setHours({...hours,[day]:{...cfg, close:v}}); setIsDirty(true);}} />
                    </div>
                  )}
                </div>
              ))}
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={!isDirty || isSaving}>{isSaving ? 'Saving…' : 'Save Changes'}</Button>
              </div>
            </div>
          </Card>

          <Card title="Holiday Schedule" description="Manage closed dates and holidays.">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-text-secondary">Closed dates immediately block new bookings and remind staff to plan workloads.</p>
              <Button variant="secondary" size="sm" onClick={()=>setHolidayOpen(true)}>Manage Holiday Schedule</Button>
            </div>
          </Card>
          <HolidayManager open={holidayOpen} onClose={()=>setHolidayOpen(false)} />
        </TabsContent>

        <TabsContent value="services">
          <Card title="Services Offered" description="Select which services your facility provides.">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { key: 'boarding', label: 'Overnight Boarding', icon: Moon, color: 'blue' },
                { key: 'daycare', label: 'Daycare', icon: Sun, color: 'orange' },
                { key: 'grooming', label: 'Grooming', icon: Scissors, color: 'purple' },
                { key: 'training', label: 'Training', icon: Award, color: 'green' },
                { key: 'dropIn', label: 'Drop-in Visits', icon: Clock, color: 'gray' },
              ].map(({ key, label, icon: Icon, color }) => (
                <div
                  key={key}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    services[key] ? `border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/20` : 'border-gray-300 dark:border-surface-border hover:border-blue-400 dark:hover:border-blue-600'
                  }`}
                  onClick={() => { setServices({ ...services, [key]: !services[key] }); setIsDirty(true); }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${services[key] ? 'bg-blue-600 dark:bg-blue-700' : 'bg-gray-100 dark:bg-surface-secondary'}`}>
                      <Icon className={`h-5 w-5 ${services[key] ? 'text-white' : 'text-gray-500 dark:text-text-secondary'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-text-primary">{label}</div>
                    </div>
                    <input type="checkbox" checked={services[key]} readOnly className="w-5 h-5" />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Capacity Management" description="Set maximum capacity to prevent overbooking.">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="Total Boarding Capacity" type="number" value={capacity.boarding} onChange={(e)=>{setCapacity({...capacity, boarding: e.target.value}); setIsDirty(true);}} />
                <Input label="Total Daycare Capacity" type="number" value={capacity.daycare} onChange={(e)=>{setCapacity({...capacity, daycare: e.target.value}); setIsDirty(true);}} />
                <Input label="Grooming Stations" type="number" value={capacity.grooming} onChange={(e)=>{setCapacity({...capacity, grooming: e.target.value}); setIsDirty(true);}} />
              </div>

              <div className="border-t pt-4">
                <label className="flex items-center gap-3 mb-4">
                  <Switch checked={capacity.enableSizeBased} onCheckedChange={(c)=>{setCapacity({...capacity, enableSizeBased: c}); setIsDirty(true);}} />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-text-primary">Enable Size-Based Capacity</div>
                    <div className="text-sm text-gray-600 dark:text-text-secondary">Set different limits for small, medium, large dogs and cats</div>
                  </div>
                </label>

                {capacity.enableSizeBased && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 ml-8">
                    <Input label="Small (0-25 lbs)" type="number" value={capacity.small} onChange={(e)=>{setCapacity({...capacity, small: e.target.value}); setIsDirty(true);}} />
                    <Input label="Medium (26-50 lbs)" type="number" value={capacity.medium} onChange={(e)=>{setCapacity({...capacity, medium: e.target.value}); setIsDirty(true);}} />
                    <Input label="Large (51+ lbs)" type="number" value={capacity.large} onChange={(e)=>{setCapacity({...capacity, large: e.target.value}); setIsDirty(true);}} />
                    <Input label="Cats" type="number" value={capacity.cats} onChange={(e)=>{setCapacity({...capacity, cats: e.target.value}); setIsDirty(true);}} />
                  </div>
                )}
              </div>

              <div className="border-t pt-4 space-y-4">
                <h4 className="font-semibold text-gray-900 dark:text-text-primary">Alert Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Warn when capacity reaches (%)" type="number" min="50" max="100" value={capacity.alertThreshold} onChange={(e)=>{setCapacity({...capacity, alertThreshold: e.target.value}); setIsDirty(true);}} />
                  <Input label="Overbooking buffer (%)" type="number" min="0" max="10" value={capacity.overbookingBuffer} onChange={(e)=>{setCapacity({...capacity, overbookingBuffer: e.target.value}); setIsDirty(true);}} />
                </div>
                <label className="flex items-center gap-3">
                  <Switch checked={capacity.blockWhenFull} onCheckedChange={(c)=>{setCapacity({...capacity, blockWhenFull: c}); setIsDirty(true);}} />
                  <span className="text-sm text-gray-900 dark:text-text-primary">Block bookings when full</span>
                </label>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={!isDirty || isSaving}>{isSaving ? 'Saving…' : 'Save Changes'}</Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="policies">
          <PoliciesTab onDirtyChange={setIsDirty} isSaving={isSaving} onSave={handleSave} />
        </TabsContent>

        <TabsContent value="vaccinations">
          <VaccinationsTab onDirtyChange={setIsDirty} isSaving={isSaving} onSave={handleSave} />
        </TabsContent>

        <TabsContent value="branding">
          <BrandingTab onDirtyChange={setIsDirty} isSaving={isSaving} onSave={handleSave} />
        </TabsContent>

        <TabsContent value="payments">
          <PaymentsTab />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationsTab onDirtyChange={setIsDirty} isSaving={isSaving} onSave={handleSave} />
        </TabsContent>

        <TabsContent value="legal">
          <LegalTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// =============================================================================
// POLICIES TAB
// =============================================================================
function PoliciesTab({ onDirtyChange, isSaving, onSave }) {
  const [policies, setPolicies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [newPolicy, setNewPolicy] = useState({ name: '', type: 'cancellation', description: '', isActive: true });

  useEffect(() => {
    (async () => {
      try {
        const data = await apiClient('/api/v1/policies');
        setPolicies(data.policies || []);
      } catch (err) {
        console.error('Failed to load policies:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleAddPolicy = async () => {
    try {
      const created = await apiClient('/api/v1/policies', { method: 'POST', body: newPolicy });
      setPolicies([...policies, created]);
      setNewPolicy({ name: '', type: 'cancellation', description: '', isActive: true });
      setShowAddForm(false);
      toast.success('Policy created');
    } catch (err) {
      toast.error('Failed to create policy');
    }
  };

  const handleUpdatePolicy = async (policy) => {
    try {
      const updated = await apiClient(`/api/v1/policies/${policy.id}`, { method: 'PUT', body: policy });
      setPolicies(policies.map(p => p.id === policy.id ? updated : p));
      setEditingPolicy(null);
      toast.success('Policy updated');
    } catch (err) {
      toast.error('Failed to update policy');
    }
  };

  const handleDeletePolicy = async (id) => {
    if (!confirm('Are you sure you want to delete this policy?')) return;
    try {
      await apiClient(`/api/v1/policies/${id}`, { method: 'DELETE' });
      setPolicies(policies.filter(p => p.id !== id));
      toast.success('Policy deleted');
    } catch (err) {
      toast.error('Failed to delete policy');
    }
  };

  if (isLoading) return <Card><div className="text-center py-8 text-muted-foreground">Loading policies...</div></Card>;

  return (
    <div className="space-y-6">
      <Card title="Business Policies" description="Manage cancellation, deposit, and other policies shown to customers.">
        <div className="space-y-4">
          {policies.length === 0 && !showAddForm && (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 mb-3 opacity-50" />
              <p>No policies configured yet.</p>
              <Button variant="secondary" size="sm" className="mt-4" onClick={() => setShowAddForm(true)}>Add Your First Policy</Button>
            </div>
          )}

          {policies.map((policy) => (
            <div key={policy.id} className="border rounded-lg p-4">
              {editingPolicy?.id === policy.id ? (
                <div className="space-y-3">
                  <Input label="Policy Name" value={editingPolicy.name} onChange={(e) => setEditingPolicy({...editingPolicy, name: e.target.value})} />
                  <Select label="Type" value={editingPolicy.type} onChange={(e) => setEditingPolicy({...editingPolicy, type: e.target.value})} options={[
                    { value: 'cancellation', label: 'Cancellation Policy' },
                    { value: 'deposit', label: 'Deposit Policy' },
                    { value: 'late_pickup', label: 'Late Pickup Policy' },
                    { value: 'vaccination', label: 'Vaccination Policy' },
                    { value: 'other', label: 'Other' },
                  ]} />
                  <div>
                    <label className="mb-1 block text-sm font-medium">Description</label>
                    <textarea className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" rows={3} value={editingPolicy.description} onChange={(e) => setEditingPolicy({...editingPolicy, description: e.target.value})} />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setEditingPolicy(null)}>Cancel</Button>
                    <Button size="sm" onClick={() => handleUpdatePolicy(editingPolicy)}>Save</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{policy.name}</div>
                    <div className="text-sm text-muted-foreground capitalize">{policy.type?.replace('_', ' ')}</div>
                    {policy.description && <p className="text-sm mt-1">{policy.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditingPolicy(policy)}>Edit</Button>
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeletePolicy(policy.id)}>Delete</Button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {showAddForm && (
            <div className="border rounded-lg p-4 bg-muted/30">
              <h4 className="font-medium mb-3">Add New Policy</h4>
              <div className="space-y-3">
                <Input label="Policy Name" value={newPolicy.name} onChange={(e) => setNewPolicy({...newPolicy, name: e.target.value})} placeholder="e.g., 48-Hour Cancellation Policy" />
                <Select label="Type" value={newPolicy.type} onChange={(e) => setNewPolicy({...newPolicy, type: e.target.value})} options={[
                  { value: 'cancellation', label: 'Cancellation Policy' },
                  { value: 'deposit', label: 'Deposit Policy' },
                  { value: 'late_pickup', label: 'Late Pickup Policy' },
                  { value: 'vaccination', label: 'Vaccination Policy' },
                  { value: 'other', label: 'Other' },
                ]} />
                <div>
                  <label className="mb-1 block text-sm font-medium">Description</label>
                  <textarea className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" rows={3} value={newPolicy.description} onChange={(e) => setNewPolicy({...newPolicy, description: e.target.value})} placeholder="Describe the policy details..." />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleAddPolicy} disabled={!newPolicy.name}>Add Policy</Button>
                </div>
              </div>
            </div>
          )}

          {policies.length > 0 && !showAddForm && (
            <Button variant="secondary" size="sm" onClick={() => setShowAddForm(true)}>Add Policy</Button>
          )}
        </div>
      </Card>
    </div>
  );
}

// =============================================================================
// VACCINATIONS TAB
// =============================================================================
function VaccinationsTab({ onDirtyChange, isSaving, onSave }) {
  const [requirements, setRequirements] = useState({
    dogs: [],
    cats: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);

  const defaultVaccinations = {
    dogs: [
      { name: 'Rabies', required: true, expirationMonths: 12 },
      { name: 'DHPP (Distemper)', required: true, expirationMonths: 12 },
      { name: 'Bordetella', required: true, expirationMonths: 6 },
      { name: 'Canine Influenza', required: false, expirationMonths: 12 },
      { name: 'Leptospirosis', required: false, expirationMonths: 12 },
    ],
    cats: [
      { name: 'Rabies', required: true, expirationMonths: 12 },
      { name: 'FVRCP', required: true, expirationMonths: 12 },
      { name: 'FeLV', required: false, expirationMonths: 12 },
    ],
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await apiClient('/api/v1/config/required-vaccinations');
        if (data.requirements && (data.requirements.dogs?.length > 0 || data.requirements.cats?.length > 0)) {
          setRequirements(data.requirements);
        } else {
          setRequirements(defaultVaccinations);
        }
      } catch (err) {
        setRequirements(defaultVaccinations);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleToggle = (species, index, field, value) => {
    const updated = { ...requirements };
    updated[species] = [...updated[species]];
    updated[species][index] = { ...updated[species][index], [field]: value };
    setRequirements(updated);
    setIsDirty(true);
    onDirtyChange?.(true);
  };

  const handleSave = async () => {
    try {
      await apiClient('/api/v1/config/required-vaccinations', { method: 'PATCH', body: { requirements } });
      setIsDirty(false);
      onDirtyChange?.(false);
      toast.success('Vaccination requirements saved');
    } catch (err) {
      toast.error('Failed to save vaccination requirements');
    }
  };

  if (isLoading) return <Card><div className="text-center py-8 text-muted-foreground">Loading vaccination requirements...</div></Card>;

  return (
    <div className="space-y-6">
      <Card title="Vaccination Requirements" description="Configure which vaccinations are required for pets to stay at your facility.">
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">🐕</span>
              Dog Vaccinations
            </h4>
            <div className="space-y-2">
              {requirements.dogs.map((vax, idx) => (
                <div key={vax.name} className="flex items-center justify-between border rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <Switch checked={vax.required} onCheckedChange={(c) => handleToggle('dogs', idx, 'required', c)} />
                    <span className={vax.required ? 'font-medium' : 'text-muted-foreground'}>{vax.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Expires after</span>
                    <Select
                      value={vax.expirationMonths}
                      onChange={(e) => handleToggle('dogs', idx, 'expirationMonths', parseInt(e.target.value))}
                      options={[
                        { value: 6, label: '6 months' },
                        { value: 12, label: '1 year' },
                        { value: 24, label: '2 years' },
                        { value: 36, label: '3 years' },
                      ]}
                      className="w-28"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">🐈</span>
              Cat Vaccinations
            </h4>
            <div className="space-y-2">
              {requirements.cats.map((vax, idx) => (
                <div key={vax.name} className="flex items-center justify-between border rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <Switch checked={vax.required} onCheckedChange={(c) => handleToggle('cats', idx, 'required', c)} />
                    <span className={vax.required ? 'font-medium' : 'text-muted-foreground'}>{vax.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Expires after</span>
                    <Select
                      value={vax.expirationMonths}
                      onChange={(e) => handleToggle('cats', idx, 'expirationMonths', parseInt(e.target.value))}
                      options={[
                        { value: 6, label: '6 months' },
                        { value: 12, label: '1 year' },
                        { value: 24, label: '2 years' },
                        { value: 36, label: '3 years' },
                      ]}
                      className="w-28"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={!isDirty || isSaving}>{isSaving ? 'Saving…' : 'Save Requirements'}</Button>
          </div>
        </div>
      </Card>

      <Card title="Enforcement Settings" description="How vaccination requirements are enforced.">
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <Switch defaultChecked />
            <div>
              <div className="font-medium">Block bookings for pets with expired vaccinations</div>
              <div className="text-sm text-muted-foreground">Prevent new reservations if required vaccinations are expired</div>
            </div>
          </label>
          <label className="flex items-center gap-3">
            <Switch defaultChecked />
            <div>
              <div className="font-medium">Send expiration reminders</div>
              <div className="text-sm text-muted-foreground">Automatically remind pet owners 30 days before vaccinations expire</div>
            </div>
          </label>
          <label className="flex items-center gap-3">
            <Switch />
            <div>
              <div className="font-medium">Allow grace period</div>
              <div className="text-sm text-muted-foreground">Allow a 7-day grace period for vaccinations expiring during a stay</div>
            </div>
          </label>
        </div>
      </Card>
    </div>
  );
}

// =============================================================================
// BRANDING TAB
// =============================================================================
function BrandingTab({ onDirtyChange, isSaving, onSave }) {
  const [branding, setBranding] = useState({
    primaryColor: '#2563eb',
    accentColor: '#059669',
    logoUrl: '',
    faviconUrl: '',
    emailHeaderHtml: '',
    emailFooterHtml: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiClient('/api/v1/config/branding');
        if (data) setBranding({ ...branding, ...data });
      } catch (err) {
        console.error('Failed to load branding:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleChange = (field, value) => {
    setBranding({ ...branding, [field]: value });
    setIsDirty(true);
    onDirtyChange?.(true);
  };

  const handleSave = async () => {
    try {
      await apiClient('/api/v1/config/branding', { method: 'PATCH', body: branding });
      setIsDirty(false);
      onDirtyChange?.(false);
      toast.success('Branding saved');
    } catch (err) {
      toast.error('Failed to save branding');
    }
  };

  if (isLoading) return <Card><div className="text-center py-8 text-muted-foreground">Loading branding settings...</div></Card>;

  return (
    <div className="space-y-6">
      <Card title="Brand Colors" description="Customize colors used throughout your customer-facing pages.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Primary Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={branding.primaryColor} onChange={(e) => handleChange('primaryColor', e.target.value)} className="w-12 h-12 rounded cursor-pointer" />
              <Input value={branding.primaryColor} onChange={(e) => handleChange('primaryColor', e.target.value)} className="flex-1" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Accent Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={branding.accentColor} onChange={(e) => handleChange('accentColor', e.target.value)} className="w-12 h-12 rounded cursor-pointer" />
              <Input value={branding.accentColor} onChange={(e) => handleChange('accentColor', e.target.value)} className="flex-1" />
            </div>
          </div>
        </div>
      </Card>

      <Card title="Logo & Favicon" description="Upload your business logo for emails and customer portal.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Logo URL</label>
            <Input value={branding.logoUrl} onChange={(e) => handleChange('logoUrl', e.target.value)} placeholder="https://..." />
            {branding.logoUrl && <img src={branding.logoUrl} alt="Logo preview" className="mt-2 h-16 object-contain" />}
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Favicon URL</label>
            <Input value={branding.faviconUrl} onChange={(e) => handleChange('faviconUrl', e.target.value)} placeholder="https://..." />
            {branding.faviconUrl && <img src={branding.faviconUrl} alt="Favicon preview" className="mt-2 h-8 object-contain" />}
          </div>
        </div>
      </Card>

      <Card title="Email Customization" description="Customize header and footer content for automated emails.">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email Header (HTML)</label>
            <textarea className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono" rows={3} value={branding.emailHeaderHtml} onChange={(e) => handleChange('emailHeaderHtml', e.target.value)} placeholder="<div>Custom header HTML...</div>" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Email Footer (HTML)</label>
            <textarea className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono" rows={3} value={branding.emailFooterHtml} onChange={(e) => handleChange('emailFooterHtml', e.target.value)} placeholder="<div>Custom footer HTML...</div>" />
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!isDirty || isSaving}>{isSaving ? 'Saving…' : 'Save Branding'}</Button>
      </div>
    </div>
  );
}

// =============================================================================
// PAYMENTS TAB
// =============================================================================
function PaymentsTab() {
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiClient('/api/v1/config/payment-settings');
        setSettings(data);
      } catch (err) {
        console.error('Failed to load payment settings:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  if (isLoading) return <Card><div className="text-center py-8 text-muted-foreground">Loading payment settings...</div></Card>;

  return (
    <div className="space-y-6">
      <Card title="Payment Processor" description="Configure your payment processing settings.">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <div className="font-medium">Stripe</div>
                <div className="text-sm text-muted-foreground">
                  {settings?.stripeConnected ? 'Connected' : 'Not connected'}
                </div>
              </div>
            </div>
            <Button variant={settings?.stripeConnected ? 'secondary' : 'primary'}>
              {settings?.stripeConnected ? 'Manage' : 'Connect Stripe'}
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg opacity-60">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-gray-500" />
              </div>
              <div>
                <div className="font-medium">Square</div>
                <div className="text-sm text-muted-foreground">Coming soon</div>
              </div>
            </div>
            <Button variant="secondary" disabled>Coming Soon</Button>
          </div>
        </div>
      </Card>

      <Card title="Payment Options" description="Configure accepted payment methods and settings.">
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <Switch defaultChecked={settings?.acceptCards} />
            <div>
              <div className="font-medium">Accept credit/debit cards</div>
              <div className="text-sm text-muted-foreground">Visa, Mastercard, American Express, Discover</div>
            </div>
          </label>
          <label className="flex items-center gap-3">
            <Switch defaultChecked={settings?.acceptCash} />
            <div>
              <div className="font-medium">Accept cash payments</div>
              <div className="text-sm text-muted-foreground">Allow marking invoices as paid by cash</div>
            </div>
          </label>
          <label className="flex items-center gap-3">
            <Switch defaultChecked={settings?.acceptChecks} />
            <div>
              <div className="font-medium">Accept check payments</div>
              <div className="text-sm text-muted-foreground">Allow marking invoices as paid by check</div>
            </div>
          </label>
        </div>
      </Card>
    </div>
  );
}

// =============================================================================
// NOTIFICATIONS TAB
// =============================================================================
function NotificationsTab({ onDirtyChange, isSaving, onSave }) {
  const [settings, setSettings] = useState({
    emailEnabled: true,
    smsEnabled: false,
    bookingConfirmation: true,
    bookingReminder: true,
    reminderDaysBefore: 1,
    checkoutReminder: true,
    vaccinationReminder: true,
    invoiceSent: true,
    paymentReceived: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiClient('/api/v1/config/notifications');
        if (data) setSettings({ ...settings, ...data });
      } catch (err) {
        console.error('Failed to load notification settings:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleChange = (field, value) => {
    setSettings({ ...settings, [field]: value });
    setIsDirty(true);
    onDirtyChange?.(true);
  };

  const handleSave = async () => {
    try {
      await apiClient('/api/v1/config/notifications', { method: 'PATCH', body: settings });
      setIsDirty(false);
      onDirtyChange?.(false);
      toast.success('Notification settings saved');
    } catch (err) {
      toast.error('Failed to save notification settings');
    }
  };

  if (isLoading) return <Card><div className="text-center py-8 text-muted-foreground">Loading notification settings...</div></Card>;

  return (
    <div className="space-y-6">
      <Card title="Notification Channels" description="Enable or disable notification methods.">
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <Switch checked={settings.emailEnabled} onCheckedChange={(c) => handleChange('emailEnabled', c)} />
            <div>
              <div className="font-medium">Email notifications</div>
              <div className="text-sm text-muted-foreground">Send notifications via email</div>
            </div>
          </label>
          <label className="flex items-center gap-3">
            <Switch checked={settings.smsEnabled} onCheckedChange={(c) => handleChange('smsEnabled', c)} />
            <div>
              <div className="font-medium">SMS notifications</div>
              <div className="text-sm text-muted-foreground">Send notifications via text message (requires Twilio)</div>
            </div>
          </label>
        </div>
      </Card>

      <Card title="Booking Notifications" description="Configure when to notify customers about bookings.">
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <Switch checked={settings.bookingConfirmation} onCheckedChange={(c) => handleChange('bookingConfirmation', c)} />
            <span>Send booking confirmation</span>
          </label>
          <label className="flex items-center gap-3">
            <Switch checked={settings.bookingReminder} onCheckedChange={(c) => handleChange('bookingReminder', c)} />
            <span>Send booking reminder</span>
          </label>
          {settings.bookingReminder && (
            <div className="ml-8">
              <Select
                label="Days before check-in"
                value={settings.reminderDaysBefore}
                onChange={(e) => handleChange('reminderDaysBefore', parseInt(e.target.value))}
                options={[
                  { value: 1, label: '1 day before' },
                  { value: 2, label: '2 days before' },
                  { value: 3, label: '3 days before' },
                  { value: 7, label: '1 week before' },
                ]}
              />
            </div>
          )}
          <label className="flex items-center gap-3">
            <Switch checked={settings.checkoutReminder} onCheckedChange={(c) => handleChange('checkoutReminder', c)} />
            <span>Send checkout reminder on last day</span>
          </label>
          <label className="flex items-center gap-3">
            <Switch checked={settings.vaccinationReminder} onCheckedChange={(c) => handleChange('vaccinationReminder', c)} />
            <span>Send vaccination expiration reminders</span>
          </label>
        </div>
      </Card>

      <Card title="Payment Notifications" description="Configure payment-related notifications.">
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <Switch checked={settings.invoiceSent} onCheckedChange={(c) => handleChange('invoiceSent', c)} />
            <span>Notify when invoice is sent</span>
          </label>
          <label className="flex items-center gap-3">
            <Switch checked={settings.paymentReceived} onCheckedChange={(c) => handleChange('paymentReceived', c)} />
            <span>Notify when payment is received</span>
          </label>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!isDirty || isSaving}>{isSaving ? 'Saving…' : 'Save Settings'}</Button>
      </div>
    </div>
  );
}

// =============================================================================
// LEGAL TAB
// =============================================================================
function LegalTab() {
  return (
    <div className="space-y-6">
      <Card title="Terms & Conditions" description="Manage your facility's legal documents.">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-medium">Service Agreement</div>
              <div className="text-sm text-muted-foreground">Standard boarding and daycare agreement</div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm">Edit</Button>
              <Button variant="ghost" size="sm">Preview</Button>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-medium">Liability Waiver</div>
              <div className="text-sm text-muted-foreground">Release of liability for pet services</div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm">Edit</Button>
              <Button variant="ghost" size="sm">Preview</Button>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-medium">Medical Authorization</div>
              <div className="text-sm text-muted-foreground">Authorization for emergency veterinary care</div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm">Edit</Button>
              <Button variant="ghost" size="sm">Preview</Button>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Privacy Policy" description="Your facility's privacy policy shown to customers.">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure how you collect, use, and protect customer data. This is displayed on your online booking portal.
          </p>
          <Button variant="secondary">Edit Privacy Policy</Button>
        </div>
      </Card>

      <Card title="Compliance" description="Regulatory compliance settings.">
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <Switch defaultChecked />
            <div>
              <div className="font-medium">Require signature on waivers</div>
              <div className="text-sm text-muted-foreground">Customers must sign waivers before booking confirmation</div>
            </div>
          </label>
          <label className="flex items-center gap-3">
            <Switch defaultChecked />
            <div>
              <div className="font-medium">Keep signed documents</div>
              <div className="text-sm text-muted-foreground">Store signed waivers and agreements for record-keeping</div>
            </div>
          </label>
        </div>
      </Card>
    </div>
  );
}

export default Business;

function TimeSelect({ value, onChange }) {
  const tz = useTimezoneUtils();
  const times = [];
  const toLabel = (h, m) => {
    const date = new Date();
    date.setHours(h); date.setMinutes(m);
    const label = tz.formatTime(date);
    const hh = String(h).padStart(2,'0');
    const mm = String(m).padStart(2,'0');
    return { label, value: `${hh}:${mm}` };
  };
  for (let h=6; h<=23; h++) {
    for (let m=0; m<60; m+=30) {
      times.push(toLabel(h,m));
    }
  }
  return (
    <StyledSelect
      options={times}
      value={value}
      onChange={(opt) => onChange(opt?.value || '')}
      isClearable={false}
      isSearchable
    />
  );
}