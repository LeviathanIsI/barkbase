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
import { useReportsDashboardQuery } from '../../settings/api';

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

  // Real reports data from API
  const { data: reportsData, isLoading: reportsLoading } = useReportsDashboardQuery();

  const handleExportReport = (reportType, reportData) => {
    setSelectedReport(reportType);
    setSelectedReportData(reportData);
    setShowExportModal(true);
  };

  // Use real data or provide structure for when API returns data
  const reportData = reportsData || {
    revenueSummary: {
      title: 'No Data Available',
      period: 'No data',
      totalRevenue: 0,
      previousPeriod: 0,
      samePeriodLastYear: 0,
      totalTransactions: 0,
      averageTransaction: 0,
      revenueByService: [],
      revenueByPaymentMethod: [],
      topCustomers: [],
      refunds: 0,
      discounts: 0,
      insights: []
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
            <div className="flex items-center bg-gray-100 dark:bg-surface-secondary rounded-lg p-1">
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
