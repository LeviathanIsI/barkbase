import { useState } from 'react';
import { X, Check, Upload, ChevronRight, ChevronLeft, Clock, Users, Calendar, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';

const StaffWizard = ({ isOpen, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [staffData, setStaffData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    jobTitle: '',
    employeeType: 'full-time',
    startDate: '',
    employeeId: '',
    payRate: '',
    payFrequency: 'bi-weekly',
    role: 'kennel-attendant',
    schedule: {
      monday: { enabled: true, start: '08:00', end: '17:00' },
      tuesday: { enabled: true, start: '08:00', end: '17:00' },
      wednesday: { enabled: true, start: '08:00', end: '17:00' },
      thursday: { enabled: true, start: '08:00', end: '17:00' },
      friday: { enabled: true, start: '08:00', end: '17:00' },
      saturday: { enabled: false, start: '00:00', end: '00:00' },
      sunday: { enabled: false, start: '00:00', end: '00:00' }
    },
    areas: ['dog-boarding', 'dog-daycare', 'reception'],
    skills: ['pet-first-aid', 'cpr'],
    timeOff: ''
  });

  const roles = [
    {
      id: 'kennel-attendant',
      name: 'Kennel Attendant',
      description: 'Day-to-day pet care and facility operations',
      permissions: [
        'Check in/out pets', 'View bookings and schedules', 'Log activities (feeding, medications, notes)',
        'Upload photos', 'Message customers'
      ],
      restrictions: [
        'Cannot modify bookings', 'Cannot access financial data', 'Cannot manage staff'
      ],
      perfectFor: 'Front-line staff, pet care workers',
      recommended: true
    },
    {
      id: 'manager',
      name: 'Manager',
      description: 'Operational oversight and team coordination',
      permissions: [
        'Everything Kennel Attendant can do', 'Create, modify, and cancel bookings', 'Process payments and refunds',
        'View financial reports', 'Manage daily operations', 'Assign tasks to staff'
      ],
      restrictions: [
        'Cannot manage other staff accounts', 'Cannot change facility settings'
      ],
      perfectFor: 'Facility managers, shift supervisors',
      recommended: false
    },
    {
      id: 'admin',
      name: 'Admin',
      description: 'Full access to all features and settings',
      permissions: [
        'Everything Manager can do', 'Add, edit, and remove staff', 'Configure facility settings',
        'Manage integrations and billing', 'Access all reports and analytics', 'Full system control'
      ],
      restrictions: [],
      perfectFor: 'Owners, general managers',
      recommended: false
    }
  ];

  const areas = [
    { id: 'dog-boarding', name: 'Dog boarding (indoor kennels)' },
    { id: 'dog-daycare', name: 'Dog daycare (play areas)' },
    { id: 'cat-boarding', name: 'Cat boarding' },
    { id: 'reception', name: 'Reception/Front desk' },
    { id: 'grooming', name: 'Grooming' },
    { id: 'training', name: 'Training' }
  ];

  const skills = [
    { id: 'pet-first-aid', name: 'Pet First Aid certified' },
    { id: 'cpr', name: 'CPR certified (Pet & Human)' },
    { id: 'grooming', name: 'Professional groomer' },
    { id: 'training', name: 'Dog trainer' },
    { id: 'vet-tech', name: 'Veterinary technician' },
    { id: 'behavior', name: 'Behavior specialist' }
  ];

  const handleInputChange = (field, value) => {
    setStaffData(prev => ({ ...prev, [field]: value }));
  };

  const handleScheduleChange = (day, field, value) => {
    setStaffData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: { ...prev.schedule[day], [field]: value }
      }
    }));
  };

  const handleAreaToggle = (areaId) => {
    setStaffData(prev => ({
      ...prev,
      areas: prev.areas.includes(areaId)
        ? prev.areas.filter(id => id !== areaId)
        : [...prev.areas, areaId]
    }));
  };

  const handleSkillToggle = (skillId) => {
    setStaffData(prev => ({
      ...prev,
      skills: prev.skills.includes(skillId)
        ? prev.skills.filter(id => id !== skillId)
        : [...prev.skills, skillId]
    }));
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

  const selectedRole = roles.find(role => role.id === staffData.role);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Add Staff Member</h3>
            <p className="text-sm text-gray-600">Step {currentStep} of 4: {
              currentStep === 1 ? 'Basic Information' :
              currentStep === 2 ? 'Role & Permissions' :
              currentStep === 3 ? 'Schedule & Availability' :
              'Review & Send Invitation'
            }</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4">
            {[1, 2, 3, 4].map(step => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
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
                    step < currentStep ? 'bg-blue-600' : 'bg-gray-300'
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
              {/* Personal Information */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={staffData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Jenny"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={staffData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Martinez"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={staffData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="jenny.martinez@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={staffData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(555) 234-5678"
                />
              </div>

              {/* Profile Photo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profile Photo (optional)</label>
                <div className="flex items-center gap-4">
                  <Button variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Photo
                  </Button>
                  <span className="text-sm text-gray-600">or</span>
                  <Button variant="outline">
                    Use Gravatar
                  </Button>
                </div>
              </div>

              {/* Employment Details */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Employment Details</h4>

                <div className="grid gap-4 md:grid-cols-2 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                    <input
                      type="text"
                      value={staffData.jobTitle}
                      onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Kennel Attendant"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee Type</label>
                    <select
                      value={staffData.employeeType}
                      onChange={(e) => handleInputChange('employeeType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="full-time">Full-time</option>
                      <option value="part-time">Part-time</option>
                      <option value="contractor">Contractor</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={staffData.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID (optional)</label>
                    <input
                      type="text"
                      value={staffData.employeeId}
                      onChange={(e) => handleInputChange('employeeId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="EMP-001"
                    />
                  </div>
                  <div></div>
                </div>

                {/* Compensation */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="track-compensation"
                      className="rounded"
                    />
                    <label htmlFor="track-compensation" className="text-sm font-medium text-gray-700">
                      Track compensation in system
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pay Rate</label>
                      <input
                        type="number"
                        value={staffData.payRate}
                        onChange={(e) => handleInputChange('payRate', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="15.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Per</label>
                      <select
                        value="hour"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="hour">Hour</option>
                        <option value="day">Day</option>
                        <option value="week">Week</option>
                        <option value="month">Month</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pay Frequency</label>
                      <select
                        value={staffData.payFrequency}
                        onChange={(e) => handleInputChange('payFrequency', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="weekly">Weekly</option>
                        <option value="bi-weekly">Bi-weekly</option>
                        <option value="semi-monthly">Semi-monthly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-800">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">Tip:</span>
                  <span className="text-sm">Email will be used for login and notifications</span>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Role Selection */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Select Role</h4>
                <p className="text-gray-600 mb-6">
                  Choose the role that best matches this staff member's responsibilities.
                  You can customize permissions later.
                </p>

                <div className="grid gap-4 md:grid-cols-1">
                  {roles.map((role) => (
                    <div
                      key={role.id}
                      className={`border rounded-lg p-6 cursor-pointer transition-all ${
                        staffData.role === role.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleInputChange('role', role.id)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <h5 className="text-lg font-semibold text-gray-900">{role.name}</h5>
                          {role.recommended && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                              Recommended
                            </span>
                          )}
                          {staffData.role === role.id && (
                            <Check className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                      </div>

                      <p className="text-gray-700 mb-4">{role.description}</p>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <h6 className="font-medium text-green-700 mb-2">✅ ALLOWED ACTIONS:</h6>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {role.permissions.map((permission, index) => (
                              <li key={index}>• {permission}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h6 className="font-medium text-red-700 mb-2">❌ RESTRICTED ACTIONS:</h6>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {role.restrictions.length > 0
                              ? role.restrictions.map((restriction, index) => (
                                  <li key={index}>• {restriction}</li>
                                ))
                              : <li>• None</li>
                            }
                          </ul>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-600">
                          <strong>Perfect for:</strong> {role.perfectFor}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-800">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">Tip:</span>
                  <span className="text-sm">Start with a pre-defined role, you can always adjust specific permissions later</span>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Working Hours */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Working Hours</h4>
                <p className="text-gray-600 mb-4">
                  Set {staffData.firstName}'s regular working schedule:
                </p>

                <div className="space-y-3">
                  {Object.entries(staffData.schedule).map(([day, schedule]) => (
                    <div key={day} className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg">
                      <div className="w-20">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={schedule.enabled}
                            onChange={(e) => handleScheduleChange(day, 'enabled', e.target.checked)}
                          />
                          <span className="capitalize text-sm font-medium">{day}</span>
                        </label>
                      </div>
                      {schedule.enabled ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={schedule.start}
                            onChange={(e) => handleScheduleChange(day, 'start', e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <span className="text-sm">to</span>
                          <input
                            type="time"
                            value={schedule.end}
                            onChange={(e) => handleScheduleChange(day, 'end', e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <span className="text-sm text-gray-600 ml-2">
                            ({Math.floor((new Date(`2000-01-01T${schedule.end}`) - new Date(`2000-01-01T${schedule.start}`)) / (1000 * 60 * 60))}h {Math.floor(((new Date(`2000-01-01T${schedule.end}`) - new Date(`2000-01-01T${schedule.start}`)) % (1000 * 60 * 60)) / (1000 * 60))}m})
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500 italic">Off</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 mt-4">
                  <Button variant="outline" size="sm">
                    Copy hours to all days
                  </Button>
                  <Button variant="outline" size="sm">
                    Clear all
                  </Button>
                </div>

                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm">
                    <strong>Weekly hours:</strong> {
                      Object.values(staffData.schedule)
                        .filter(s => s.enabled)
                        .reduce((total, s) => {
                          const start = new Date(`2000-01-01T${s.start}`);
                          const end = new Date(`2000-01-01T${s.end}`);
                          return total + (end - start) / (1000 * 60 * 60);
                        }, 0).toFixed(1)
                    } hours
                  </p>
                </div>
              </div>

              {/* Areas of Responsibility */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Areas of Responsibility</h4>
                <p className="text-gray-600 mb-4">
                  Which areas can {staffData.firstName} work in?
                </p>

                <div className="grid gap-3 md:grid-cols-2">
                  {areas.map((area) => (
                    <label key={area.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={staffData.areas.includes(area.id)}
                        onChange={() => handleAreaToggle(area.id)}
                        className="rounded"
                      />
                      <span className="text-sm">{area.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Skills & Certifications */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Special Skills & Certifications</h4>
                <p className="text-gray-600 mb-4">
                  Does {staffData.firstName} have any special skills or certifications?
                </p>

                <div className="grid gap-3 md:grid-cols-2">
                  {skills.map((skill) => (
                    <label key={skill.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={staffData.skills.includes(skill.id)}
                        onChange={() => handleSkillToggle(skill.id)}
                        className="rounded"
                      />
                      <span className="text-sm">{skill.name}</span>
                    </label>
                  ))}
                </div>

                <div className="mt-4">
                  <Button variant="outline" size="sm">
                    + Add Custom Skill/Certification
                  </Button>
                </div>
              </div>

              {/* Time Off */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Time Off & Unavailability</h4>
                <p className="text-gray-600 mb-4">
                  Does {staffData.firstName} have any upcoming time off?
                </p>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="add-time-off" className="rounded" />
                    <label htmlFor="add-time-off" className="text-sm">Add time off request now</label>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="vacation">Vacation</option>
                        <option value="sick">Sick</option>
                        <option value="personal">Personal</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              {/* Staff Member Summary */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Staff Member Summary</h4>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg mb-3">
                      {staffData.firstName[0]}{staffData.lastName[0]}
                    </div>
                    <h5 className="text-xl font-semibold text-gray-900">{staffData.firstName} {staffData.lastName}</h5>
                    <p className="text-gray-600">{staffData.email}</p>
                    <p className="text-gray-600">{staffData.phone}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Job Title:</span>
                      <span className="font-medium">{staffData.jobTitle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Employee Type:</span>
                      <span className="font-medium capitalize">{staffData.employeeType.replace('-', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Start Date:</span>
                      <span className="font-medium">{new Date(staffData.startDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pay Rate:</span>
                      <span className="font-medium">${staffData.payRate}/hour</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h6 className="font-medium text-gray-900 mb-2">Role & Permissions</h6>
                      <p className="text-sm text-gray-600 mb-2">{selectedRole?.name} (Standard Permissions)</p>
                      <div className="text-xs text-green-700 mb-1">Can: Check in/out, view schedules, log activities</div>
                      <div className="text-xs text-red-700">Cannot: Modify bookings, access financials, manage staff</div>
                    </div>
                    <div>
                      <h6 className="font-medium text-gray-900 mb-2">Schedule & Areas</h6>
                      <p className="text-sm text-gray-600 mb-2">
                        Mon-Fri: {staffData.schedule.monday.start} - {staffData.schedule.monday.end} ({Math.floor(Object.values(staffData.schedule).filter(s => s.enabled).length * 9)} hrs/week)
                      </p>
                      <div className="text-xs text-gray-600">
                        Areas: {staffData.areas.map(id => areas.find(a => a.id === id)?.name).join(', ')}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <Button variant="outline" size="sm">
                    ← Edit Information
                  </Button>
                </div>
              </div>

              {/* Send Invitation */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Send Invitation</h4>
                <p className="text-gray-600 mb-4">
                  Jenny will receive an email to create her account and set up her password
                </p>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <input type="radio" name="invite-type" id="send-now" defaultChecked />
                    <label htmlFor="send-now" className="text-sm">Send invitation email now</label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input type="radio" name="invite-type" id="manual-setup" />
                    <label htmlFor="manual-setup" className="text-sm">Add staff without sending invitation</label>
                  </div>

                  <div className="ml-5 text-xs text-gray-600">
                    You'll need to manually give Jenny login credentials
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <input type="checkbox" id="welcome-message" defaultChecked />
                    <label htmlFor="welcome-message" className="text-sm">Include welcome message</label>
                  </div>

                  <textarea
                    rows={4}
                    defaultValue="Welcome to Happy Paws Boarding & Daycare team! We're excited to have you. Please complete your profile and review our staff handbook in the system."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* What Happens Next */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h5 className="font-medium text-green-900 mb-3">What Happens Next?</h5>
                <div className="space-y-2 text-sm text-green-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Jenny will receive invitation email</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>She'll create her account and password</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>She can access the staff mobile app</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>She'll appear on the schedule</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>You can assign tasks and track her work</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
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
