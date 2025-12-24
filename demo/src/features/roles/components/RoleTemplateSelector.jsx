import { useState } from 'react';
import { 
  Search,
  Users,
  Briefcase,
  Wrench,
  Calculator,
  ChevronRight
} from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Badge from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { PERMISSION_CATEGORIES } from '@/lib/permissions';

// Kennel role templates
const KENNEL_ROLE_TEMPLATES = {
  RECEPTIONIST: {
    name: 'Receptionist',
    description: 'Front desk operations - handles bookings, check-ins, and customer service',
    category: 'operations',
    icon: Users,
    permissions: {
      VIEW_BOOKINGS: true,
      CREATE_BOOKING: true,
      EDIT_BOOKING: true,
      VIEW_CUSTOMERS: true,
      VIEW_CUSTOMER_DETAILS: true,
      CREATE_CUSTOMER: true,
      EDIT_CUSTOMER: true,
      VIEW_CUSTOMER_FINANCIAL: true,
      MANAGE_CUSTOMER_NOTES: true,
      VIEW_PETS: true,
      VIEW_PET_DETAILS: true,
      CREATE_PET: true,
      EDIT_PET: true,
      VIEW_MEDICAL_RECORDS: true,
      VIEW_KENNELS: true,
      VIEW_OCCUPANCY: true,
      VIEW_INVOICES: true,
      CREATE_INVOICE: true,
      VIEW_PAYMENTS: true,
      PROCESS_PAYMENT: true,
      VIEW_MESSAGES: true,
      SEND_MESSAGES: true,
      VIEW_BASIC_REPORTS: true,
      VIEW_DASHBOARDS: true
    }
  },
  
  KENNEL_ATTENDANT: {
    name: 'Kennel Attendant',
    description: 'Daily pet care - feeding, cleaning, exercise, and basic health monitoring',
    category: 'operations',
    icon: Users,
    permissions: {
      VIEW_BOOKINGS: true,
      VIEW_CUSTOMERS: true,
      MANAGE_CUSTOMER_NOTES: true,
      VIEW_PETS: true,
      VIEW_PET_DETAILS: true,
      EDIT_PET: true,
      VIEW_MEDICAL_RECORDS: true,
      EDIT_MEDICAL_RECORDS: true,
      VIEW_KENNELS: true,
      VIEW_OCCUPANCY: true,
      MANAGE_INVENTORY: true,
      VIEW_MAINTENANCE: true,
      CREATE_MAINTENANCE: true,
      VIEW_MESSAGES: true,
      VIEW_DASHBOARDS: true
    }
  },
  
  GROOMER: {
    name: 'Groomer',
    description: 'Pet grooming services - appointments, grooming records, and scheduling',
    category: 'specialized',
    icon: Wrench,
    permissions: {
      VIEW_BOOKINGS: true,
      CREATE_BOOKING: true,
      EDIT_BOOKING: true,
      VIEW_CUSTOMERS: true,
      VIEW_CUSTOMER_DETAILS: true,
      MANAGE_CUSTOMER_NOTES: true,
      VIEW_PETS: true,
      VIEW_PET_DETAILS: true,
      EDIT_PET: true,
      VIEW_MEDICAL_RECORDS: true,
      MANAGE_INVENTORY: true,
      VIEW_INVOICES: true,
      CREATE_INVOICE: true,
      VIEW_PAYMENTS: true,
      PROCESS_PAYMENT: true,
      VIEW_MESSAGES: true,
      SEND_MESSAGES: true,
      VIEW_BASIC_REPORTS: true,
      VIEW_DASHBOARDS: true
    }
  },
  
  TRAINER: {
    name: 'Trainer',
    description: 'Pet training services - training sessions, progress tracking, and behavior notes',
    category: 'specialized',
    icon: Wrench,
    permissions: {
      VIEW_BOOKINGS: true,
      CREATE_BOOKING: true,
      EDIT_BOOKING: true,
      VIEW_CUSTOMERS: true,
      VIEW_CUSTOMER_DETAILS: true,
      MANAGE_CUSTOMER_NOTES: true,
      VIEW_PETS: true,
      VIEW_PET_DETAILS: true,
      EDIT_PET: true,
      VIEW_MEDICAL_RECORDS: true,
      EDIT_MEDICAL_RECORDS: true,
      VIEW_KENNELS: true,
      MANAGE_SCHEDULES: true,
      VIEW_INVOICES: true,
      CREATE_INVOICE: true,
      VIEW_MESSAGES: true,
      SEND_MESSAGES: true,
      MANAGE_TEMPLATES: true,
      VIEW_BASIC_REPORTS: true,
      CREATE_CUSTOM_REPORTS: true
    }
  },
  
  VET_TECH: {
    name: 'Veterinary Technician',
    description: 'Medical care support - medication administration, health monitoring, and medical records',
    category: 'specialized',
    icon: Wrench,
    permissions: {
      VIEW_BOOKINGS: true,
      VIEW_CUSTOMERS: true,
      VIEW_CUSTOMER_DETAILS: true,
      VIEW_PETS: true,
      VIEW_PET_DETAILS: true,
      EDIT_PET: true,
      VIEW_MEDICAL_RECORDS: true,
      EDIT_MEDICAL_RECORDS: true,
      MANAGE_VACCINATIONS: true,
      VIEW_KENNELS: true,
      MANAGE_INVENTORY: true,
      VIEW_MAINTENANCE: true,
      VIEW_INVOICES: true,
      CREATE_INVOICE: true,
      VIEW_MESSAGES: true,
      SEND_MESSAGES: true,
      VIEW_BASIC_REPORTS: true,
      VIEW_ADVANCED_REPORTS: true
    }
  },
  
  SHIFT_SUPERVISOR: {
    name: 'Shift Supervisor',
    description: 'Shift management - oversees daily operations, staff coordination, and problem resolution',
    category: 'management',
    icon: Briefcase,
    permissions: {
      VIEW_BOOKINGS: true,
      CREATE_BOOKING: true,
      EDIT_BOOKING: true,
      DELETE_BOOKING: true,
      OVERRIDE_PRICING: true,
      VIEW_BOOKING_REPORTS: true,
      VIEW_CUSTOMERS: true,
      VIEW_CUSTOMER_DETAILS: true,
      CREATE_CUSTOMER: true,
      EDIT_CUSTOMER: true,
      VIEW_CUSTOMER_FINANCIAL: true,
      MANAGE_CUSTOMER_NOTES: true,
      VIEW_PETS: true,
      VIEW_PET_DETAILS: true,
      CREATE_PET: true,
      EDIT_PET: true,
      VIEW_MEDICAL_RECORDS: true,
      VIEW_KENNELS: true,
      MANAGE_KENNELS: true,
      VIEW_OCCUPANCY: true,
      VIEW_INVOICES: true,
      CREATE_INVOICE: true,
      EDIT_INVOICE: true,
      VIEW_PAYMENTS: true,
      PROCESS_PAYMENT: true,
      ISSUE_REFUND: true,
      VIEW_MESSAGES: true,
      SEND_MESSAGES: true,
      VIEW_BASIC_REPORTS: true,
      VIEW_DASHBOARDS: true,
      VIEW_STAFF: true,
      VIEW_SCHEDULES: true,
      MANAGE_SCHEDULES: true,
      VIEW_TIMESHEETS: true,
      VIEW_ADVANCED_REPORTS: true,
      EXPORT_REPORTS: true
    }
  },
  
  FACILITY_MANAGER: {
    name: 'Facility Manager',
    description: 'Facility operations - manages staff, inventory, maintenance, and operational efficiency',
    category: 'management',
    icon: Briefcase,
    permissions: {
      VIEW_BOOKINGS: true,
      CREATE_BOOKING: true,
      EDIT_BOOKING: true,
      DELETE_BOOKING: true,
      MANAGE_PRICING: true,
      OVERRIDE_PRICING: true,
      VIEW_BOOKING_REPORTS: true,
      VIEW_CUSTOMERS: true,
      VIEW_CUSTOMER_DETAILS: true,
      CREATE_CUSTOMER: true,
      EDIT_CUSTOMER: true,
      DELETE_CUSTOMER: true,
      VIEW_CUSTOMER_FINANCIAL: true,
      MANAGE_CUSTOMER_NOTES: true,
      EXPORT_CUSTOMER_DATA: true,
      VIEW_PETS: true,
      VIEW_PET_DETAILS: true,
      CREATE_PET: true,
      EDIT_PET: true,
      DELETE_PET: true,
      VIEW_MEDICAL_RECORDS: true,
      EDIT_MEDICAL_RECORDS: true,
      MANAGE_VACCINATIONS: true,
      VIEW_KENNELS: true,
      MANAGE_KENNELS: true,
      VIEW_OCCUPANCY: true,
      MANAGE_INVENTORY: true,
      VIEW_MAINTENANCE: true,
      CREATE_MAINTENANCE: true,
      MANAGE_SCHEDULES: true,
      VIEW_INVOICES: true,
      CREATE_INVOICE: true,
      EDIT_INVOICE: true,
      VIEW_PAYMENTS: true,
      PROCESS_PAYMENT: true,
      ISSUE_REFUND: true,
      VIEW_FINANCIAL_REPORTS: true,
      VIEW_STAFF: true,
      CREATE_STAFF: true,
      EDIT_STAFF: true,
      DELETE_STAFF: true,
      VIEW_SCHEDULES: true,
      VIEW_TIMESHEETS: true,
      APPROVE_TIMESHEETS: true,
      VIEW_MESSAGES: true,
      SEND_MESSAGES: true,
      MANAGE_TEMPLATES: true,
      VIEW_CAMPAIGNS: true,
      CREATE_CAMPAIGNS: true,
      MANAGE_AUTOMATIONS: true,
      VIEW_BASIC_REPORTS: true,
      VIEW_ADVANCED_REPORTS: true,
      CREATE_CUSTOM_REPORTS: true,
      EXPORT_REPORTS: true,
      VIEW_DASHBOARDS: true,
      CUSTOMIZE_DASHBOARDS: true,
      VIEW_SETTINGS: true,
      VIEW_INTEGRATIONS: true,
      VIEW_AUDIT_LOGS: true,
      MANAGE_ROLES: true,
      MANAGE_USERS: true
    }
  },
  
  ACCOUNTANT: {
    name: 'Accountant/Bookkeeper',
    description: 'Financial management - handles invoicing, payments, and financial reporting',
    category: 'administrative',
    icon: Calculator,
    permissions: {
      VIEW_BOOKINGS: true,
      VIEW_CUSTOMERS: true,
      VIEW_CUSTOMER_DETAILS: true,
      VIEW_CUSTOMER_FINANCIAL: true,
      EXPORT_CUSTOMER_DATA: true,
      VIEW_INVOICES: true,
      CREATE_INVOICE: true,
      EDIT_INVOICE: true,
      DELETE_INVOICE: true,
      VIEW_PAYMENTS: true,
      PROCESS_PAYMENT: true,
      ISSUE_REFUND: true,
      VIEW_FINANCIAL_REPORTS: true,
      EXPORT_FINANCIAL_DATA: true,
      VIEW_BASIC_REPORTS: true,
      VIEW_ADVANCED_REPORTS: true,
      CREATE_CUSTOM_REPORTS: true,
      EXPORT_REPORTS: true,
      VIEW_STAFF: true,
      VIEW_TIMESHEETS: true,
      VIEW_AUDIT_LOGS: true
    }
  },
  
  MARKETING_COORDINATOR: {
    name: 'Marketing Coordinator',
    description: 'Marketing and customer engagement - campaigns, communications, and customer insights',
    category: 'administrative',
    icon: Calculator,
    permissions: {
      VIEW_BOOKINGS: true,
      VIEW_CUSTOMERS: true,
      VIEW_CUSTOMER_DETAILS: true,
      MANAGE_CUSTOMER_NOTES: true,
      EXPORT_CUSTOMER_DATA: true,
      VIEW_MESSAGES: true,
      SEND_MESSAGES: true,
      MANAGE_TEMPLATES: true,
      VIEW_CAMPAIGNS: true,
      CREATE_CAMPAIGNS: true,
      MANAGE_AUTOMATIONS: true,
      VIEW_BASIC_REPORTS: true,
      VIEW_ADVANCED_REPORTS: true,
      CREATE_CUSTOM_REPORTS: true,
      EXPORT_REPORTS: true,
      VIEW_DASHBOARDS: true,
      CUSTOMIZE_DASHBOARDS: true
    }
  },
  
  PART_TIME_STAFF: {
    name: 'Part-Time Staff',
    description: 'Limited access for part-time employees - basic operations only',
    category: 'operations',
    icon: Users,
    permissions: {
      VIEW_BOOKINGS: true,
      VIEW_CUSTOMERS: true,
      VIEW_PETS: true,
      VIEW_PET_DETAILS: true,
      VIEW_KENNELS: true,
      VIEW_OCCUPANCY: true,
      VIEW_MESSAGES: true,
      VIEW_DASHBOARDS: true
    }
  }
};

const categories = {
  all: { label: 'All Templates', icon: Users },
  operations: { label: 'Daily Operations', icon: Users },
  management: { label: 'Management', icon: Briefcase },
  specialized: { label: 'Specialized Services', icon: Wrench },
  administrative: { label: 'Administrative', icon: Calculator }
};

export default function RoleTemplateSelector({ onSelect, onSkip }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [previewKey, setPreviewKey] = useState(null);

  const filteredTemplates = Object.entries(KENNEL_ROLE_TEMPLATES).filter(([key, template]) => {
    const matchesSearch = !searchTerm || 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Choose a Role Template</CardTitle>
            <CardDescription>
              Start with a pre-configured role template and customize as needed
            </CardDescription>
          </div>
          <Button variant="ghost" onClick={onSkip}>
            Skip & Create Custom
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Tabs */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid grid-cols-5 w-full">
              {Object.entries(categories).map(([key, category]) => (
                <TabsTrigger key={key} value={key} className="flex items-center gap-1">
                  <category.icon className="h-3 w-3" />
                  <span className="hidden sm:inline">{category.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTemplates.map(([key, template]) => {
              const Icon = template.icon;
              const permissionCount = Object.values(template.permissions).filter(p => p).length;
              
              return (
                <Card 
                  key={key}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setPreviewKey(key)}
                >
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {template.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">
                        {permissionCount} permissions
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted">No templates found matching your criteria</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>

    {/* Preview Modal */}
    <Dialog open={!!previewKey} onOpenChange={(open) => !open && setPreviewKey(null)}>
      <DialogContent className="sm:max-w-2xl">
        {previewKey ? (
          <PreviewContent
            template={KENNEL_ROLE_TEMPLATES[previewKey]}
            onUse={() => { onSelect(KENNEL_ROLE_TEMPLATES[previewKey]); setPreviewKey(null); }}
            onClose={() => setPreviewKey(null)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
    </>
  );
}


function PreviewContent({ template, onUse, onClose }) {
  const permissionKeys = Object.keys(template.permissions).filter((k) => template.permissions[k]);
  const grouped = Object.values(PERMISSION_CATEGORIES)
    .map((cat) => ({
      label: cat.label,
      items: Object.keys(cat.permissions)
        .filter((p) => permissionKeys.includes(p))
        .map((p) => cat.permissions[p]),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{template.name}</DialogTitle>
        <DialogDescription>{template.description}</DialogDescription>
      </DialogHeader>
      <div className="max-h-[60vh] overflow-auto space-y-4">
        {grouped.map((g) => (
          <div key={g.label} className="border rounded-lg p-3">
            <div className="font-medium mb-2">{g.label}</div>
            <ul className="list-disc pl-5 text-sm text-text">
              {g.items.map((label) => (
                <li key={label} className="py-0.5">{label}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <DialogFooter>
        <Button onClick={onUse}>Use This Template</Button>
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </DialogFooter>
    </>
  );
}

