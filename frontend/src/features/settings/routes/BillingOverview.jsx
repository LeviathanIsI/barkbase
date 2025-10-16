import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CreditCard, Settings, FileText, BarChart3, Star,
  DollarSign, Calendar, Download, Receipt
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import FinancialDashboard from './components/FinancialDashboard';
import SubscriptionTab from './components/SubscriptionTab';
import PaymentMethodsTab from './components/PaymentMethodsTab';
import InvoicesTab from './components/InvoicesTab';
import UsageTab from './components/UsageTab';
import PlansTab from './components/PlansTab';

const TABS = [
  { id: 'subscription', label: 'Subscription', icon: Settings },
  { id: 'payment-methods', label: 'Payment Methods', icon: CreditCard },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'usage', label: 'Usage', icon: BarChart3 },
  { id: 'plans', label: 'Plans', icon: Star },
];

export default function BillingOverview() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'subscription';

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'subscription':
        return <SubscriptionTab />;
      case 'payment-methods':
        return <PaymentMethodsTab />;
      case 'invoices':
        return <InvoicesTab />;
      case 'usage':
        return <UsageTab />;
      case 'plans':
        return <PlansTab />;
      default:
        return <SubscriptionTab />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Billing</h1>
        <p className="text-gray-600">Subscription and payment settings</p>
      </div>

      {/* Financial Dashboard */}
      <FinancialDashboard />

      {/* Sub-Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {renderTabContent()}
      </div>
    </div>
  );
}
