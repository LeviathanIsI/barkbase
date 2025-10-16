import { useState } from 'react';
import { BarChart3, FileText, TrendingUp, Calendar, Users, DollarSign, Download, Mail, Settings, Star, Zap, Target, PieChart, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import QuickInsightsDashboard from '../components/QuickInsightsDashboard';
import ReportCategories from '../components/ReportCategories';
import LiveAnalyticsDashboard from '../components/LiveAnalyticsDashboard';
import ScheduledReports from '../components/ScheduledReports';
import ReportDetailModal from '../components/ReportDetailModal';
import ExportModal from '../components/ExportModal';
import CustomReportBuilder from '../components/CustomReportBuilder';
import BenchmarkingComparisons from '../components/BenchmarkingComparisons';
import PredictiveAnalytics from '../components/PredictiveAnalytics';
import QuickIntegrations from '../components/QuickIntegrations';

const ReportsOverview = () => {
  const [activeView, setActiveView] = useState('overview'); // overview, analytics, scheduled, custom, benchmarks, predictive
  const [showReportDetail, setShowReportDetail] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedReportData, setSelectedReportData] = useState(null);

  // Set document title
  useState(() => {
    document.title = 'Reports & Analytics | BarkBase';
    return () => {
      document.title = 'BarkBase';
    };
  }, []);

  const handleGenerateReport = (reportType, reportData) => {
    setSelectedReport(reportType);
    setSelectedReportData(reportData);
    setShowReportDetail(true);
  };

  const handleExportReport = (reportType, reportData) => {
    setSelectedReport(reportType);
    setSelectedReportData(reportData);
    setShowExportModal(true);
  };

  const mockReportData = {
    revenueSummary: {
      title: 'Revenue Summary',
      period: 'Oct 1-15, 2025',
      totalRevenue: 18450.00,
      previousPeriod: 2340,
      samePeriodLastYear: 3125,
      totalTransactions: 247,
      averageTransaction: 74.70,
      revenueByService: [
        { service: 'Boarding', revenue: 11439, percentage: 62, bookings: 153, avgPerBooking: 74.70 },
        { service: 'Daycare', revenue: 4922, percentage: 27, bookings: 141, avgPerBooking: 34.90 },
        { service: 'Grooming', revenue: 1658, percentage: 9, bookings: 37, avgPerBooking: 44.81 },
        { service: 'Training', revenue: 431, percentage: 2, bookings: 8, avgPerBooking: 53.88 }
      ],
      revenueByPaymentMethod: [
        { method: 'Credit Card', revenue: 15982, percentage: 87, transactions: 218 },
        { method: 'Package/Member', revenue: 1845, percentage: 10, transactions: 23 },
        { method: 'Cash', revenue: 623, percentage: 3, transactions: 6 }
      ],
      topCustomers: [
        { name: 'Sarah Johnson', revenue: 847.50, visits: 11 },
        { name: 'Mike Thompson', revenue: 723.00, visits: 9 },
        { name: 'Emma Davis', revenue: 689.25, visits: 8 },
        { name: 'Tom Brown', revenue: 612.00, visits: 7 },
        { name: 'Jessica Lee', revenue: 584.50, visits: 6 }
      ],
      refunds: 127.50,
      discounts: 892.00,
      insights: [
        { type: 'opportunity', text: 'Weekdays only 40% lower - Run midweek promotion', impact: '+$320/month' },
        { type: 'opportunity', text: 'Top 5 customers very loyal - Offer VIP program/perks' },
        { type: 'concern', text: '12 regular customers haven\'t booked in 60+ days', impact: 'Win-back campaign needed' },
        { type: 'concern', text: 'Refund rate increasing slightly (was 0.4% last month)' }
      ]
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        breadcrumb="Home > Records > Reports & Analytics"
        title="Reports & Analytics"
        subtitle="Transform data into actionable insights"
        actions={
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <Button
                variant={activeView === 'overview' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('overview')}
                className="px-3"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Overview
              </Button>
              <Button
                variant={activeView === 'analytics' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('analytics')}
                className="px-3"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Live Analytics
              </Button>
              <Button
                variant={activeView === 'scheduled' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('scheduled')}
                className="px-3"
              >
                <Clock className="h-4 w-4 mr-2" />
                Scheduled
              </Button>
              <Button
                variant={activeView === 'custom' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('custom')}
                className="px-3"
              >
                <Settings className="h-4 w-4 mr-2" />
                Custom Builder
              </Button>
              <Button
                variant={activeView === 'benchmarks' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('benchmarks')}
                className="px-3"
              >
                <Target className="h-4 w-4 mr-2" />
                Benchmarks
              </Button>
              <Button
                variant={activeView === 'predictive' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('predictive')}
                className="px-3"
              >
                <Zap className="h-4 w-4 mr-2" />
                Predictive
              </Button>
            </div>
          </div>
        }
      />

      {/* Main Content Area */}
      {activeView === 'overview' && (
        <div className="space-y-6">
          {/* Quick Insights Dashboard */}
          <QuickInsightsDashboard />

          {/* Report Categories */}
          <ReportCategories
            onGenerateReport={handleGenerateReport}
            onExportReport={handleExportReport}
          />

          {/* Quick Integrations */}
          <QuickIntegrations />
        </div>
      )}

      {activeView === 'analytics' && (
        <LiveAnalyticsDashboard />
      )}

      {activeView === 'scheduled' && (
        <ScheduledReports />
      )}

      {activeView === 'custom' && (
        <CustomReportBuilder />
      )}

      {activeView === 'benchmarks' && (
        <BenchmarkingComparisons />
      )}

      {activeView === 'predictive' && (
        <PredictiveAnalytics />
      )}

      {/* Report Detail Modal */}
      <ReportDetailModal
        report={selectedReport}
        data={selectedReportData}
        isOpen={showReportDetail}
        onClose={() => setShowReportDetail(false)}
        onExport={() => {
          setShowReportDetail(false);
          setShowExportModal(true);
        }}
      />

      {/* Export Modal */}
      <ExportModal
        report={selectedReport}
        data={selectedReportData}
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
    </div>
  );
};

export default ReportsOverview;
