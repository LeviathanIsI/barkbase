import { useState, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Building, Settings, TrendingUp, AlertTriangle, DollarSign, Calendar, Users, Home } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCapacityQuery } from '../api-capacity';

const CapacityOverviewSection = ({ currentDate }) => {
  const navigate = useNavigate();
  const [isConfigured, setIsConfigured] = useState(true);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Fetch real capacity data for this week
  const startDateStr = format(weekStart, 'yyyy-MM-dd');
  const endDateStr = format(weekEnd, 'yyyy-MM-dd');
  
  
  const { data: weekCapacityData, isLoading } = useCapacityQuery(startDateStr, endDateStr);
  

  const capacityData = useMemo(() => {
    if (!weekCapacityData || weekCapacityData.length === 0) {
      return {
        overall: 0,
        trend: 0,
        daily: [],
        insights: []
      };
    }

    // PostgreSQL returns lowercase column names unless quoted
    const daily = weekCapacityData.map(d => {
      const util = d.utilizationPercent || d.utilizationpercent || d.utilizationPercent || 0;
      return parseFloat(util);
    });
    const overall = Math.round(daily.reduce((sum, val) => sum + (val || 0), 0) / daily.length);

    return {
      overall,
      trend: 0, // Could calculate week-over-week change
      daily,
      insights: []
    };
  }, [weekCapacityData]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-8">
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-8">
        <div className="text-center max-w-2xl mx-auto">
          <div className="w-16 h-16 bg-blue-100 dark:bg-surface-secondary rounded-full flex items-center justify-center mx-auto mb-4">
            <Building className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-text-primary mb-2">
            Capacity Overview
          </h2>
          <p className="text-gray-600 dark:text-text-secondary mb-6">
            Get started by configuring your facility capacity
          </p>

          <div className="bg-blue-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">🏗️ SETUP REQUIRED</h3>
            </div>

            <p className="text-blue-800 dark:text-blue-200 mb-4">
              Before you can track capacity, tell us about your facility setup:
            </p>

            <div className="space-y-3 text-left">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <div className="font-medium text-blue-900 dark:text-blue-100">Define Your Kennels/Runs</div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">How many kennels do you have? What sizes?</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <div className="font-medium text-blue-900 dark:text-blue-100">Set Capacity Rules</div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">How many dogs per daycare group? Size limits?</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <div className="font-medium text-blue-900 dark:text-blue-100">Enable Overbooking Prevention</div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">Automatically block bookings when full</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="flex items-center gap-2"
              onClick={() => navigate('/kennels')}
            >
              <Settings className="w-5 h-5" />
              Configure Kennels
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="flex items-center gap-2"
              onClick={() => {
                alert('Quick Setup Wizard coming soon! For now, please use Configure Kennels.');
              }}
            >
              <Building className="w-5 h-5" />
              Quick Setup Wizard (5 minutes)
            </Button>
          </div>

          <div className="mt-6 text-sm text-gray-500 dark:text-text-secondary">
            <p>💡 Pro tip: Start with your most common kennel sizes and add specialty runs later.</p>
          </div>
        </div>
      </div>
    );
  }

  // Populated capacity overview
  return (
    <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary">
          Capacity Overview
        </h2>
        <span className="text-sm text-gray-500 dark:text-text-secondary">
          {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
        </span>
      </div>

      {/* Overall Capacity Card */}
      <div className="bg-primary-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">{capacityData.overall}%</div>
            <div className="text-sm text-blue-700 dark:text-blue-300">Overall Utilization</div>
            <div className="text-xs text-green-600 flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              Week-over-week: +{capacityData.trend}%
            </div>
          </div>
          <div className="w-16 h-16 bg-blue-100 dark:bg-surface-secondary rounded-full flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </div>

      {/* Weekly Capacity Bar Chart */}
      <div className="mb-6">
        <div className="grid grid-cols-7 gap-2 mb-2">
          {days.map((day, index) => {
            const percentage = capacityData.daily[index];
            const isHigh = percentage >= 90;
            const isCritical = percentage >= 95;

            return (
              <div key={day.toISOString()} className="text-center">
                <div className="text-xs font-medium text-gray-600 dark:text-text-secondary mb-1">
                  {format(day, 'EEE')}
                </div>
                <div className="relative h-20 bg-gray-100 dark:bg-surface-secondary rounded-sm overflow-hidden">
                  <div
                    className={`w-full transition-all duration-300 ${
                      isCritical ? 'bg-red-50 dark:bg-red-950/20' : isHigh ? 'bg-orange-500' : 'bg-blue-50 dark:bg-blue-950/20'
                    }`}
                    style={{ height: `${percentage}%` }}
                  />
                </div>
                <div className={`text-xs font-medium mt-1 ${
                  isCritical ? 'text-red-600' : isHigh ? 'text-orange-600' : 'text-gray-900 dark:text-text-primary'
                }`}>
                  {percentage}%
                </div>
                {isHigh && (
                  <div className={`text-xs mt-1 ${isCritical ? 'text-red-500' : 'text-orange-500'}`}>
                    {isCritical ? '🔥' : '⚠️'}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-6 text-xs text-gray-500 dark:text-text-secondary mt-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-50 dark:bg-blue-950/20 rounded"></div>
            <span>Normal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span>High (90-95%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-50 dark:bg-red-950/20 rounded"></div>
            <span>Critical (95%+)</span>
          </div>
        </div>
      </div>

      {/* Service Breakdown */}
      {capacityData.services && (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-4">UTILIZATION BY SERVICE TYPE</h3>
        <div className="space-y-3">
          {Object.entries(capacityData.services || {}).map(([service, data]) => (
            <div key={service} className="flex items-center gap-4">
              <div className="w-20 text-sm font-medium text-gray-600 dark:text-text-secondary capitalize">
                {service}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-gray-900 dark:text-text-primary">
                    {data.used}/{data.total} {service === 'boarding' ? 'kennels' : service === 'daycare' ? 'spots' : 'slots'}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-text-secondary">({data.percentage}%)</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-surface-border rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      data.percentage >= 90 ? 'bg-red-50 dark:bg-red-950/20' :
                      data.percentage >= 80 ? 'bg-yellow-50 dark:bg-yellow-950/20' : 'bg-green-50 dark:bg-green-950/20'
                    }`}
                    style={{ width: `${data.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Capacity Insights */}
      {capacityData.insights && capacityData.insights.length > 0 && (
      <div className="border-t border-gray-200 dark:border-surface-border pt-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-4">CAPACITY INSIGHTS</h3>
        <div className="space-y-3">
          {(capacityData.insights || []).map((insight, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-blue-800 dark:text-blue-200">{insight}</span>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Action Buttons - Always show */}
      <div className="border-t border-gray-200 dark:border-surface-border pt-6">
        <div className="flex gap-3">
          <Button 
            variant="outline"
            onClick={() => {
              alert('Schedule optimization feature coming soon! This will suggest optimal booking times based on capacity.');
            }}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Optimize Schedule
          </Button>
          <Button 
            variant="outline"
            onClick={() => navigate('/settings/pricing')}
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Adjust Pricing
          </Button>
          <Button 
            variant="outline"
            onClick={() => navigate('/reports')}
          >
            <Calendar className="w-4 h-4 mr-2" />
            View Analytics
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CapacityOverviewSection;
