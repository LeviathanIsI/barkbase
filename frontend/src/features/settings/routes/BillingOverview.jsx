import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import FinancialDashboard from './components/FinancialDashboard';
import SubscriptionTab from './components/SubscriptionTab';
import PaymentMethodsTab from './components/PaymentMethodsTab';
import InvoicesTab from './components/InvoicesTab';
import UsageTab from './components/UsageTab';
import PlansTab from './components/PlansTab';

const TABS = [
  { id: 'subscription', label: 'Subscription' },
  { id: 'payment-methods', label: 'Payment Methods' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'usage', label: 'Usage' },
  { id: 'plans', label: 'Plans' },
];

export default function BillingOverview() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'subscription';

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId }, { replace: true });
  };

  return (
    <div className="space-y-6">
      {/* Financial Dashboard */}
      <FinancialDashboard />

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="border-b border-border w-full justify-start gap-6 bg-transparent px-0 mb-6">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="px-0 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="subscription">
          <SubscriptionTab />
        </TabsContent>
        <TabsContent value="payment-methods">
          <PaymentMethodsTab />
        </TabsContent>
        <TabsContent value="invoices">
          <InvoicesTab />
        </TabsContent>
        <TabsContent value="usage">
          <UsageTab />
        </TabsContent>
        <TabsContent value="plans">
          <PlansTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
