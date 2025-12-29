import { useState } from 'react';
import { X, Check, ChevronRight, ChevronLeft, Clock, Users, Calendar, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import StyledSelect from '@/components/ui/StyledSelect';
import { useTimezoneUtils } from '@/lib/timezone';

const StaffWizard = ({ isOpen, onClose, onComplete }) => {
  const tz = useTimezoneUtils();
  const [currentStep, setCurrentStep] = useState(1);
  const [staffData, setStaffData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    jobTitle: '',
    employeeType: 'full-time',
    startDate: '',
    role: 'kennel-attendant'
  });

  const handleInputChange = (field, value) => {
    setStaffData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    onComplete(staffData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface-primary rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-border">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-text-primary">Add Staff Member</h3>
            <p className="text-sm text-gray-600 dark:text-text-secondary">Step {currentStep} of 4</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-surface-secondary dark:bg-surface-secondary rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-surface-border bg-gray-50 dark:bg-surface-secondary">
          <div className="flex items-center gap-4">
            {[1, 2, 3, 4].map(step => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-surface-border text-gray-700 dark:text-text-primary'
                }`}>
                  {step}
                </div>
                <div className="text-sm ml-2">
                  {step === 1 && 'Basic Info'}
                  {step === 2 && 'Role'}
                  {step === 3 && 'Schedule'}
                  {step === 4 && 'Review'}
                </div>
                {step < 4 && (
                  <div className={`w-12 h-px mx-4 ${
                    step < currentStep ? 'bg-blue-600' : 'bg-gray-300 dark:bg-surface-border'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">First Name</label>
                  <input
                    type="text"
                    value={staffData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Jenny"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">Last Name</label>
                  <input
                    type="text"
                    value={staffData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Martinez"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">Email</label>
                <input
                  type="email"
                  value={staffData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="jenny.martinez@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">Phone</label>
                <input
                  type="tel"
                  value={staffData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(555) 234-5678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">Job Title</label>
                <input
                  type="text"
                  value={staffData.jobTitle}
                  onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Kennel Attendant"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">Employee Type</label>
                  <StyledSelect
                    options={[
                      { value: 'full-time', label: 'Full-time' },
                      { value: 'part-time', label: 'Part-time' },
                      { value: 'contractor', label: 'Contractor' },
                    ]}
                    value={staffData.employeeType}
                    onChange={(opt) => handleInputChange('employeeType', opt?.value || 'full-time')}
                    isClearable={false}
                    isSearchable={false}
                    menuPortalTarget={document.body}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">Start Date</label>
                  <input
                    type="date"
                    value={staffData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-text-primary mb-2">Select Role</h4>
                <p className="text-gray-600 dark:text-text-secondary mb-6">Choose the role that best matches this staff member's responsibilities.</p>

                <div className="grid gap-4 md:grid-cols-1">
                  <div
                    className={`border rounded-lg p-6 cursor-pointer transition-all ${
                      staffData.role === 'kennel-attendant'
                        ? 'border-blue-500 bg-blue-50 dark:bg-surface-primary'
                        : 'border-gray-200 dark:border-surface-border hover:border-gray-300'
                    }`}
                    onClick={() => handleInputChange('role', 'kennel-attendant')}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h5 className="text-lg font-semibold text-gray-900 dark:text-text-primary">Kennel Attendant</h5>
                        <span className="px-2 py-1 bg-green-100 dark:bg-surface-secondary text-green-800 dark:text-green-200 text-xs font-medium rounded">Recommended</span>
                        {staffData.role === 'kennel-attendant' && (
                          <Check className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                    </div>
                    <p className="text-gray-700 dark:text-text-primary mb-4">Day-to-day pet care and facility operations</p>
                    <div className="text-xs text-green-700">
                      Can: Check in/out pets, view schedules, log activities
                    </div>
                    <div className="text-xs text-red-700 mt-1">
                      Cannot: Modify bookings, access financials, manage staff
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-text-primary mb-2">Schedule & Availability</h4>
                <p className="text-gray-600 dark:text-text-secondary mb-4">Set working hours (Mon-Fri, 8 AM - 5 PM)</p>
                <div className="p-4 bg-gray-50 dark:bg-surface-secondary rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-text-primary">Schedule will be configured after staff member is added.</p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-surface-secondary border border-gray-200 dark:border-surface-border rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 dark:text-text-primary mb-4">Staff Member Summary</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="w-16 h-16 bg-primary-600 dark:bg-primary-700 rounded-full flex items-center justify-center text-white font-semibold text-lg mb-3">
                      {staffData.firstName[0]}{staffData.lastName[0]}
                    </div>
                    <h5 className="text-xl font-semibold text-gray-900 dark:text-text-primary">{staffData.firstName} {staffData.lastName}</h5>
                    <p className="text-gray-600 dark:text-text-secondary">{staffData.email}</p>
                    <p className="text-gray-600 dark:text-text-secondary">{staffData.jobTitle}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-text-secondary">Role:</span>
                      <span className="font-medium">Kennel Attendant</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-text-secondary">Type:</span>
                      <span className="font-medium capitalize">{staffData.employeeType.replace('-', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-text-secondary">Start Date:</span>
                      <span className="font-medium">{tz.formatShortDate(staffData.startDate)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-text-primary mb-2">Send Invitation</h4>
                <p className="text-gray-600 dark:text-text-secondary mb-4">Staff member will receive an email to create their account.</p>
              </div>

              <div className="bg-green-50 dark:bg-surface-primary border border-green-200 dark:border-green-900/30 rounded-lg p-6">
                <h5 className="font-medium text-green-900 mb-3">What Happens Next?</h5>
                <div className="space-y-2 text-sm text-green-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Staff member receives invitation email</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>They create their account and password</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>They appear on the schedule and can start working</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-surface-border">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {currentStep > 1 && (
            <Button variant="outline" onClick={handleBack}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}
          {currentStep < 4 && (
            <Button onClick={handleNext}>
              Next: {
                currentStep === 1 ? 'Role & Permissions' :
                currentStep === 2 ? 'Schedule & Availability' :
                'Review & Invite'
              }
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
          {currentStep === 4 && (
            <Button onClick={handleComplete}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Add Staff Member & Send Invitation
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffWizard;
