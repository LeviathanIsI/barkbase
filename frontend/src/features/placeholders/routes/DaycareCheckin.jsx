import { CheckCircle, UserCheck } from 'lucide-react';
import PlaceholderPage from '@/components/shared/PlaceholderPage';

const DaycareCheckin = () => {
  return (
    <PlaceholderPage
      title="Daycare Check-in"
      breadcrumbs={[
        { label: 'Home', to: '/dashboard' },
        { label: 'Operations' },
        { label: 'Daycare Check-in' },
      ]}
      description="Streamlined check-in and check-out for daycare visits. Track arrival times, attendance, and send notifications to pet parents."
      illustration={CheckCircle}
      primaryCTA={{
        label: 'Check In Pet',
        icon: UserCheck,
        disabled: true,
        onClick: () => {},
      }}
      badge={{ label: 'Coming Soon', variant: 'secondary' }}
      pageName="daycare-checkin"
    />
  );
};

export default DaycareCheckin;
