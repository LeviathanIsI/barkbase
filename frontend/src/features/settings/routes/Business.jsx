import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import SettingsPage from '../components/SettingsPage';
import apiClient from '@/lib/apiClient';
import { useTenantStore } from '@/stores/tenant';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { useLocation, useNavigate } from 'react-router-dom';
import { Clock, Moon, Sun, Scissors, Award, Phone as PhoneIcon, Mail, Globe, Building2, Home, DollarSign, Shield, CreditCard, Bell, FileText, AlertTriangle } from 'lucide-react';
import HolidayManager from '../components/HolidayManager';
import { Switch } from '@/components/ui/Switch';

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
    <SettingsPage title="Business Settings" description="Configure your facility profile, hours, services, policies and more.">
      <Tabs value={activeTab} onValueChange={(t)=>{ setActiveTab(t); navigate(`?tab=${t}`, { replace: true }); }}>
        <TabsList className="mb-6">
          {['profile','hours','services','policies','vaccinations','branding','payments','notifications','legal'].map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize">{t.replace('-',' & ')}</TabsTrigger>
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
                <textarea className="w-full rounded-md border border-[#E0E0E0] px-4 py-3 text-sm" rows={3} placeholder="Street address, city, state, ZIP" onChange={()=>setIsDirty(true)} />
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
              <p className="text-sm text-[#64748B]">Closed dates immediately block new bookings and remind staff to plan workloads.</p>
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
                    services[key] ? `border-[#4B5DD3] bg-[#4B5DD3]/5` : 'border-[#E0E0E0] hover:border-[#4B5DD3]/30'
                  }`}
                  onClick={() => { setServices({ ...services, [key]: !services[key] }); setIsDirty(true); }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${services[key] ? 'bg-[#4B5DD3]' : 'bg-gray-100 dark:bg-surface-secondary'}`}>
                      <Icon className={`h-5 w-5 ${services[key] ? 'text-white' : 'text-gray-500 dark:text-text-secondary'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-[#263238]">{label}</div>
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
                    <div className="font-medium text-[#263238]">Enable Size-Based Capacity</div>
                    <div className="text-sm text-[#64748B]">Set different limits for small, medium, large dogs and cats</div>
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
                <h4 className="font-semibold text-[#263238]">Alert Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Warn when capacity reaches (%)" type="number" min="50" max="100" value={capacity.alertThreshold} onChange={(e)=>{setCapacity({...capacity, alertThreshold: e.target.value}); setIsDirty(true);}} />
                  <Input label="Overbooking buffer (%)" type="number" min="0" max="10" value={capacity.overbookingBuffer} onChange={(e)=>{setCapacity({...capacity, overbookingBuffer: e.target.value}); setIsDirty(true);}} />
                </div>
                <label className="flex items-center gap-3">
                  <Switch checked={capacity.blockWhenFull} onCheckedChange={(c)=>{setCapacity({...capacity, blockWhenFull: c}); setIsDirty(true);}} />
                  <span className="text-sm text-[#263238]">Block bookings when full</span>
                </label>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={!isDirty || isSaving}>{isSaving ? 'Saving…' : 'Save Changes'}</Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </SettingsPage>
  );
};

export default Business;

function TimeSelect({ value, onChange }) {
  const times = [];
  const toLabel = (h, m) => {
    const date = new Date();
    date.setHours(h); date.setMinutes(m);
    const label = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
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
    <select className="rounded-md border border-[#E0E0E0] px-3 pr-10 py-2 text-sm w-full bg-white dark:bg-surface-primary" value={value} onChange={(e)=>onChange(e.target.value)}>
      {times.map(t => (
        <option key={t.value} value={t.value}>{t.label}</option>
      ))}
    </select>
  );
}