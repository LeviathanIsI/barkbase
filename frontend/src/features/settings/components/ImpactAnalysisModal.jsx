/**
 * Impact Analysis Modal
 * Pre-modification warning showing affected properties and dependencies
 * Displays risk assessment and cascade strategy options
 */

import React from 'react';
import { AlertTriangle, Info, XCircle, CheckCircle, GitBranch, FileCode } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

const RiskLevelBadge = ({ level }) => {
  const variants = {
    low: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
    medium: { color: 'bg-yellow-100 text-yellow-800', icon: Info },
    high: { color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
    critical: { color: 'bg-red-100 text-red-800', icon: XCircle },
  };

  const config = variants[level] || variants.medium;
  const Icon = config.icon;

  return (
    <Badge className={`${config.color} flex items-center space-x-1`}>
      <Icon className="w-3 h-3" />
      <span className="capitalize">{level} Risk</span>
    </Badge>
  );
};

export const ImpactAnalysisModal = ({
  open,
  onClose,
  impactData,
  onProceed,
  onCancel,
  modificationType = 'modify',
}) => {
  if (!impactData) return null;

  const {
    propertyName,
    displayLabel,
    riskAssessment,
    impactSummary,
    affectedProperties = [],
    criticalDependencies = [],
    usageBreakdown = {},
    recommendations = [],
    canProceed,
    requiresApproval,
  } = impactData;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <span>Impact Analysis: {displayLabel}</span>
          </DialogTitle>
          <DialogDescription>
            Review the impact of {modificationType === 'delete' ? 'deleting' : 'modifying'} this property
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 pr-4">
            {/* Risk Assessment */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Risk Assessment</h3>
                <RiskLevelBadge level={riskAssessment.level} />
              </div>
              
              {riskAssessment.factors && riskAssessment.factors.length > 0 && (
                <Alert>
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {riskAssessment.factors.map((factor, idx) => (
                        <li key={idx}>{factor}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Impact Summary */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Impact Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg p-3">
                  <div className="text-2xl font-bold text-blue-600">
                    {impactSummary.affectedPropertiesCount}
                  </div>
                  <div className="text-xs text-gray-600">Affected Properties</div>
                </div>
                
                <div className="border rounded-lg p-3">
                  <div className="text-2xl font-bold text-red-600">
                    {impactSummary.criticalDependenciesCount}
                  </div>
                  <div className="text-xs text-gray-600">Critical Dependencies</div>
                </div>
                
                <div className="border rounded-lg p-3">
                  <div className="text-2xl font-bold text-purple-600">
                    {impactSummary.recordsWithValuesCount?.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600">Records with Values</div>
                </div>
                
                <div className="border rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-600">
                    {impactSummary.maxDependencyDepth}
                  </div>
                  <div className="text-xs text-gray-600">Max Dependency Depth</div>
                </div>
              </div>
            </div>

            {/* Affected Properties */}
            {affectedProperties.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center">
                  <GitBranch className="w-4 h-4 mr-2" />
                  Affected Properties ({affectedProperties.length})
                </h3>
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {affectedProperties.map((prop) => (
                    <div key={prop.propertyId} className="p-3 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{prop.displayLabel}</div>
                          <div className="text-xs text-gray-500 font-mono">{prop.propertyName}</div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          Depth: {prop.depth}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Usage Breakdown */}
            {Object.values(usageBreakdown).some(v => v > 0) && (
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center">
                  <FileCode className="w-4 h-4 mr-2" />
                  Asset Usage
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {usageBreakdown.workflows > 0 && (
                    <div className="text-sm">
                      <span className="font-medium">{usageBreakdown.workflows}</span> Workflows
                    </div>
                  )}
                  {usageBreakdown.validations > 0 && (
                    <div className="text-sm">
                      <span className="font-medium">{usageBreakdown.validations}</span> Validations
                    </div>
                  )}
                  {usageBreakdown.forms > 0 && (
                    <div className="text-sm">
                      <span className="font-medium">{usageBreakdown.forms}</span> Forms
                    </div>
                  )}
                  {usageBreakdown.reports > 0 && (
                    <div className="text-sm">
                      <span className="font-medium">{usageBreakdown.reports}</span> Reports
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3">Recommendations</h3>
                <div className="space-y-2">
                  {recommendations.map((rec, idx) => (
                    <Alert key={idx} variant={rec.type === 'blocker' ? 'destructive' : 'default'}>
                      <AlertDescription>
                        <div className="font-medium text-sm mb-1">{rec.message}</div>
                        {rec.action && (
                          <div className="text-xs text-gray-600">
                            Action: {rec.action}
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={onProceed}
            disabled={!canProceed}
            variant={canProceed ? 'default' : 'destructive'}
          >
            {requiresApproval ? 'Request Approval' : 'Proceed'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImpactAnalysisModal;

