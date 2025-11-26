import { X, Package, Calendar, CreditCard, TrendingUp, Crown, Filter } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';

const PackageTemplatesModal = ({ isOpen, onClose, onSelectTemplate }) => {
  const templates = [
    {
      id: 'boarding-10day',
      icon: Calendar,
      name: '10-Day Boarding Package',
      category: 'Boarding',
      type: 'multi-visit',
      description: 'Pay for 10 days, save 10%. Most popular boarding package.',
      price: 450,
      regularPrice: 500,
      savings: 50,
      features: ['10 nights boarding', 'Daily playtime', 'Photo updates', '6 month validity'],
      popularityRank: 1
    },
    {
      id: 'boarding-5day',
      icon: Calendar,
      name: '5-Day Boarding Package',
      category: 'Boarding',
      type: 'multi-visit',
      description: 'Perfect for short trips. 5 days at 8% discount.',
      price: 230,
      regularPrice: 250,
      savings: 20,
      features: ['5 nights boarding', 'Daily playtime', '3 month validity'],
      popularityRank: 3
    },
    {
      id: 'daycare-5visit',
      icon: CreditCard,
      name: '5-Visit Daycare Punch Card',
      category: 'Daycare',
      type: 'punch-card',
      description: 'Buy 5 visits, get 15% off. Flexible scheduling.',
      price: 175,
      regularPrice: 200,
      savings: 25,
      features: ['5 daycare visits', 'Use anytime', '90 day validity', 'Punch card tracking'],
      popularityRank: 2
    },
    {
      id: 'daycare-10visit',
      icon: CreditCard,
      name: '10-Visit Daycare Punch Card',
      category: 'Daycare',
      type: 'punch-card',
      description: 'Buy 10 visits, save 20%. Best value for regular daycare users.',
      price: 320,
      regularPrice: 400,
      savings: 80,
      features: ['10 daycare visits', 'Use anytime', '6 month validity'],
      popularityRank: 5
    },
    {
      id: 'unlimited-daycare',
      icon: TrendingUp,
      name: 'Monthly Unlimited Daycare',
      category: 'Daycare',
      type: 'recurring',
      description: 'Unlimited visits for one monthly fee. Best for frequent users.',
      price: 399,
      recurring: true,
      features: ['Unlimited visits', 'Auto-renews monthly', 'Cancel anytime', 'Priority booking'],
      popularityRank: 4
    },
    {
      id: 'vip-membership',
      icon: Crown,
      name: 'VIP Club Membership',
      category: 'All Services',
      type: 'vip',
      description: 'Priority booking + 10% off all services + exclusive perks.',
      price: 49,
      recurring: true,
      features: ['10% off everything', 'Priority booking', 'Birthday treats', 'Monthly photo album'],
      popularityRank: 6
    },
    {
      id: 'grooming-5pack',
      icon: Package,
      name: '5-Pack Grooming Package',
      category: 'Grooming',
      type: 'multi-visit',
      description: 'Prepay for 5 grooming sessions, save 12%.',
      price: 220,
      regularPrice: 250,
      savings: 30,
      features: ['5 grooming sessions', 'All breeds welcome', '1 year validity'],
      popularityRank: 7
    },
    {
      id: 'training-6week',
      icon: Package,
      name: '6-Week Training Package',
      category: 'Training',
      type: 'multi-visit',
      description: 'Complete training program with weekly sessions.',
      price: 350,
      regularPrice: 420,
      savings: 70,
      features: ['6 weekly sessions', '1 hour each', 'Includes materials', 'Progress tracking'],
      popularityRank: 8
    },
    {
      id: 'puppy-starter',
      icon: Package,
      name: 'Puppy Starter Pack',
      category: 'Boarding + Daycare',
      type: 'multi-visit',
      description: 'Perfect for new puppy owners. 5 daycare + consultation.',
      price: 299,
      regularPrice: 350,
      savings: 51,
      features: ['5 daycare visits', 'Behavioral consultation', 'Welcome kit', '6 month validity'],
      popularityRank: 9
    },
    {
      id: 'weekend-warrior',
      icon: Calendar,
      name: 'Weekend Warrior Package',
      category: 'Boarding + Grooming',
      type: 'multi-visit',
      description: '4 weekend daycare + 2 bath & brush sessions.',
      price: 399,
      regularPrice: 480,
      savings: 81,
      features: ['4 weekend daycare', '2 bath & brush', 'Valid Fri-Sun only', '3 month validity'],
      popularityRank: 10
    },
    {
      id: 'senior-care',
      icon: Package,
      name: 'Senior Pet Care Package',
      category: 'Boarding',
      type: 'multi-visit',
      description: 'Specialized care for senior pets. 7 days with extra attention.',
      price: 450,
      regularPrice: 525,
      savings: 75,
      features: ['7 nights boarding', 'Medication included', 'Extra TLC', 'Daily check-ins'],
      popularityRank: 11
    },
    {
      id: 'gift-100',
      icon: Package,
      name: '$100 Gift Certificate',
      category: 'Gift',
      type: 'gift',
      description: 'Perfect for holidays and special occasions.',
      price: 100,
      features: ['$100 credit', 'Use for any service', '1 year validity', 'Transferable'],
      popularityRank: 12
    }
  ];

  const categories = ['All', 'Boarding', 'Daycare', 'Grooming', 'Training', 'All Services', 'Gift'];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold">Package Templates</DialogTitle>
              <p className="text-sm text-gray-600 dark:text-text-secondary mt-1">
                Choose a pre-built template to get started quickly
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-text-tertiary hover:text-gray-600 dark:hover:text-text-secondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <Button variant="outline" size="sm" className="text-xs">
            <Filter className="w-3 h-3 mr-1" />
            Filter
          </Button>
          {categories.map((cat) => (
            <Button key={cat} variant="outline" size="sm" className="text-xs">
              {cat}
            </Button>
          ))}
        </div>

        {/* Templates Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => {
            const Icon = template.icon;
            return (
              <div
                key={template.id}
                className="border border-gray-200 dark:border-surface-border rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                onClick={() => onSelectTemplate(template)}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 dark:text-text-primary text-sm mb-1">{template.name}</h4>
                    <Badge variant="secondary" className="text-xs">{template.category}</Badge>
                  </div>
                  {template.popularityRank <= 3 && (
                    <Badge variant="warning" className="text-xs flex-shrink-0">
                      #{template.popularityRank}
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-gray-600 dark:text-text-secondary mb-3">{template.description}</p>

                <div className="mb-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-gray-900 dark:text-text-primary">
                      ${template.price}{template.recurring && <span className="text-sm font-normal">/mo</span>}
                    </span>
                    {template.regularPrice && (
                      <>
                        <span className="text-sm text-gray-400 dark:text-text-tertiary line-through">${template.regularPrice}</span>
                        <span className="text-xs font-semibold text-green-700">Save ${template.savings}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-1 mb-3">
                  {template.features.map((feature, idx) => (
                    <p key={idx} className="text-xs text-gray-600 dark:text-text-secondary flex items-center gap-1">
                      <span className="text-green-600">✓</span>
                      {feature}
                    </p>
                  ))}
                </div>

                <Button size="sm" className="w-full" onClick={() => onSelectTemplate(template)}>
                  Use Template
                </Button>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-surface-border">
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PackageTemplatesModal;

