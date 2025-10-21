import { useState } from 'react';
import { BarChart3, TrendingUp, Clock, Settings, Target, Zap } from 'lucide-react';
import Button from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/Card';
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

const Reports = () => {
  const [activeView, setActiveView] = useState('overview');
  const [showReportDetail, setShowReportDetail] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedReportData, setSelectedReportData] = useState(null);

  const handleGenerateReport = (reportType, reportData) => {
    setSelectedReport(reportType);
    setSelectedReportData(reportData);
    setShowReportDetail(true);
  };

  const { data: reportsData, isLoading: reportsLoading } = useReportsDashboardQuery();

  const handleExportReport = (reportType, reportData) => {
    setSelectedReport(reportType);
    setSelectedReportData(reportData);
    setShowExportModal(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="Home > Records > Reports & Analytics"
        title="Reports & Analytics"
        subtitle="Transform data into actionable insights"
        actions={
          <div className="flex items-center gap-2">
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

      {activeView === 'overview' && (
        <div className="space-y-6">
          <QuickInsightsDashboard />
          <ReportCategories
            onGenerateReport={handleGenerateReport}
            onExportReport={handleExportReport}
          />
          <QuickIntegrations />
        </div>
      )}

      {activeView === 'analytics' && <LiveAnalyticsDashboard />}
      {activeView === 'scheduled' && <ScheduledReports />}
      {activeView === 'custom' && <CustomReportBuilder />}
      {activeView === 'benchmarks' && <BenchmarkingComparisons />}
      {activeView === 'predictive' && <PredictiveAnalytics />}

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

      <ExportModal
        report={selectedReport}
        data={selectedReportData}
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
    </div>
  );
};

export default Reports;
