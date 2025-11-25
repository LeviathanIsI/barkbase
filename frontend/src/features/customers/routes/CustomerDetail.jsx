import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Mail, Phone, MapPin, Calendar, DollarSign, 
  Dog, FileText, MessageSquare, Activity 
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Tabs from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useOwner } from '@/features/owners/api';
import { useCommunicationStats } from '@/features/communications/api';
import CommunicationTimeline from '@/features/communications/components/CommunicationTimeline';
import CommunicationForm from '@/features/communications/components/CommunicationForm';
import NotesPanel from '@/features/communications/components/NotesPanel';
import { format } from 'date-fns';

const CustomerHeader = ({ owner, stats }) => {
  const navigate = useNavigate();
  
  return (
    <div className="bg-white dark:bg-surface-primary border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-6">
            <Button
              variant="ghost"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => navigate('/owners')}
            >
              Back
            </Button>
            
            <div>
              <h1 className="text-2xl font-bold text-text">
                {owner.firstName} {owner.lastName}
              </h1>
              
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-text-secondary">
                {owner.email && (
                  <a href={`mailto:${owner.email}`} className="flex items-center gap-1 hover:text-primary">
                    <Mail className="w-4 h-4" />
                    {owner.email}
                  </a>
                )}
                {owner.phone && (
                  <a href={`tel:${owner.phone}`} className="flex items-center gap-1 hover:text-primary">
                    <Phone className="w-4 h-4" />
                    {owner.phone}
                  </a>
                )}
                {owner.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {owner.address.city}, {owner.address.state}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="gray">
                  <Calendar className="w-3 h-3 mr-1" />
                  Customer since {format(new Date(owner.createdAt), 'MMM yyyy')}
                </Badge>
                {owner._count?.pets > 0 && (
                  <Badge variant="blue">
                    <Dog className="w-3 h-3 mr-1" />
                    {owner._count.pets} {owner._count.pets === 1 ? 'Pet' : 'Pets'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline">Edit Customer</Button>
            <Button>New Booking</Button>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Total Bookings</p>
                <p className="text-2xl font-semibold text-text">
                  {owner._count?.bookings || 0}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-gray-400 dark:text-text-tertiary" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Lifetime Value</p>
                <p className="text-2xl font-semibold text-text">
                  ${((owner._count?.payments || 0) * 150).toFixed(0)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-gray-400 dark:text-text-tertiary" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Communications</p>
                <p className="text-2xl font-semibold text-text">
                  {stats?.total || 0}
                </p>
              </div>
              <MessageSquare className="w-8 h-8 text-gray-400 dark:text-text-tertiary" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Last Activity</p>
                <p className="text-lg font-semibold text-text">
                  {owner.updatedAt ? format(new Date(owner.updatedAt), 'MMM d') : 'Never'}
                </p>
              </div>
              <Activity className="w-8 h-8 text-gray-400 dark:text-text-tertiary" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default function CustomerDetail() {
  const { ownerId } = useParams();
  const [activeTab, setActiveTab] = useState('timeline');
  const [showCommunicationForm, setShowCommunicationForm] = useState(false);
  
  const { data: owner, isLoading: ownerLoading } = useOwner(ownerId);
  const { data: stats } = useCommunicationStats(ownerId);

  if (ownerLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!owner) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-text">Customer not found</h2>
        </div>
      </DashboardLayout>
    );
  }

  const tabs = [
    { recordId: 'timeline', label: 'Timeline', icon: Activity },
    { recordId: 'communications', label: 'Communications', icon: MessageSquare },
    { recordId: 'notes', label: 'Notes', icon: FileText },
    { recordId: 'pets', label: 'Pets', icon: Dog },
    { recordId: 'bookings', label: 'Bookings', icon: Calendar },
    { recordId: 'payments', label: 'Payments', icon: DollarSign },
  ];

  return (
    <>
      <CustomerHeader owner={owner} stats={stats} />
      
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={setActiveTab}
            className="mb-6"
          />
          
          {activeTab === 'timeline' && (
            <div>
              <div className="flex justify-end mb-4">
                <Button
                  leftIcon={<MessageSquare className="w-4 h-4" />}
                  onClick={() => setShowCommunicationForm(true)}
                >
                  New Communication
                </Button>
              </div>
              
              {showCommunicationForm && (
                <Card className="mb-6">
                  <CommunicationForm
                    ownerId={ownerId}
                    onSuccess={() => setShowCommunicationForm(false)}
                    onCancel={() => setShowCommunicationForm(false)}
                  />
                </Card>
              )}
              
              <CommunicationTimeline ownerId={ownerId} />
            </div>
          )}
          
          {activeTab === 'communications' && (
            <div>
              <div className="flex justify-end mb-4">
                <Button
                  leftIcon={<MessageSquare className="w-4 h-4" />}
                  onClick={() => setShowCommunicationForm(true)}
                >
                  New Communication
                </Button>
              </div>
              
              {showCommunicationForm && (
                <Card className="mb-6">
                  <CommunicationForm
                    ownerId={ownerId}
                    onSuccess={() => setShowCommunicationForm(false)}
                    onCancel={() => setShowCommunicationForm(false)}
                  />
                </Card>
              )}
              
              <Card>
                <p className="text-center py-8 text-text-secondary">
                  Communication list coming soon
                </p>
              </Card>
            </div>
          )}
          
          {activeTab === 'notes' && (
            <NotesPanel entityType="owner" entityId={ownerId} />
          )}
          
          {activeTab === 'pets' && (
            <Card>
              <p className="text-center py-8 text-text-secondary">
                Pet list coming soon
              </p>
            </Card>
          )}
          
          {activeTab === 'bookings' && (
            <Card>
              <p className="text-center py-8 text-text-secondary">
                Booking history coming soon
              </p>
            </Card>
          )}
          
          {activeTab === 'payments' && (
            <Card>
              <p className="text-center py-8 text-text-secondary">
                Payment history coming soon
              </p>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}

