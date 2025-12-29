import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Switch from '@/components/ui/Switch';
import Modal from '@/components/ui/Modal';
import SlidePanel from '@/components/ui/SlidePanel';
import StyledSelect from '@/components/ui/StyledSelect';
import apiClient from '@/lib/apiClient';
import { useTimezoneUtils } from '@/lib/timezone';
import {
  FileText, Plus, Edit, Trash2, Eye, Copy, Shield,
  Clock, Calendar, Syringe, Heart, DoorOpen, UtensilsCrossed,
  AlertTriangle, CheckCircle, FileCheck, Save, Loader2
} from 'lucide-react';

// Policy type definitions with icons and colors
const POLICY_TYPES = {
  liability_waiver: {
    label: 'Liability Waiver',
    icon: Shield,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    description: 'Releases kennel from liability for injury, illness, or death',
  },
  terms_of_service: {
    label: 'Terms of Service',
    icon: FileCheck,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    description: 'General terms of doing business',
  },
  cancellation: {
    label: 'Cancellation Policy',
    icon: Calendar,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    description: 'Cancellation windows and refund policies',
  },
  vaccination: {
    label: 'Vaccination Policy',
    icon: Syringe,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    description: 'Required vaccines and proof requirements',
  },
  health_behavior: {
    label: 'Health & Behavior',
    icon: Heart,
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
    description: 'Health requirements and behavior policies',
  },
  pickup_dropoff: {
    label: 'Pickup & Dropoff',
    icon: DoorOpen,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    description: 'Operating hours and late fees',
  },
  feeding_medication: {
    label: 'Feeding & Medication',
    icon: UtensilsCrossed,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    description: 'Food and medication policies',
  },
  emergency: {
    label: 'Emergency Policy',
    icon: AlertTriangle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    description: 'Emergency procedures and authorization',
  },
};

// Policy templates with real kennel content
const POLICY_TEMPLATES = {
  liability_waiver: {
    title: 'Liability Waiver & Release',
    content: `LIABILITY WAIVER AND RELEASE OF CLAIMS

I, the undersigned pet owner/guardian, in consideration of the services provided by [FACILITY NAME] (hereinafter referred to as "the Facility"), do hereby agree to the following terms and conditions:

1. ASSUMPTION OF RISK
I understand and acknowledge that there are inherent risks associated with boarding, daycare, grooming, and other pet care services, including but not limited to:
• Injury from playing with other animals
• Escape or loss
• Illness or disease transmission
• Allergic reactions
• Stress-related behaviors
• Property damage
• Injury or death

I voluntarily assume all such risks, both known and unknown, even if arising from the negligence of the Facility or others, and assume full responsibility for my pet's participation.

2. RELEASE AND WAIVER
I hereby release, waive, discharge, and covenant not to sue the Facility, its owners, operators, employees, agents, and representatives from any and all liability, claims, demands, actions, or causes of action arising out of or relating to any loss, damage, or injury, including death, that may be sustained by me or my pet while participating in or as a result of the services provided.

3. EMERGENCY MEDICAL AUTHORIZATION
In the event of a medical emergency, I authorize the Facility to:
• Seek emergency veterinary care for my pet at my expense
• Transport my pet to a veterinary clinic of their choosing if my designated veterinarian is unavailable
• Authorize necessary medical treatment if I cannot be reached
• I agree to pay all costs associated with emergency veterinary care

4. PRE-EXISTING CONDITIONS
I certify that my pet is in good health and has not been ill with any communicable disease within the last 30 days. I understand that vaccinations reduce but do not eliminate the risk of disease transmission. I agree to inform the Facility of any pre-existing medical conditions, behavioral issues, or special needs.

5. INDEMNIFICATION
I agree to indemnify and hold harmless the Facility from any and all claims, actions, suits, procedures, costs, expenses, damages, and liabilities arising out of my pet's stay or my breach of any term of this agreement.

6. PHOTO/VIDEO RELEASE
I grant permission for the Facility to photograph or video my pet for promotional materials, social media, or other business purposes without compensation to me.

7. ACKNOWLEDGMENT
I have read this agreement, fully understand its terms, and sign it freely and voluntarily. I understand that this waiver is binding upon my heirs, executors, and assigns.

By signing below, I acknowledge that I have read and agree to all terms and conditions set forth in this Liability Waiver and Release.`,
  },
  terms_of_service: {
    title: 'Terms of Service Agreement',
    content: `TERMS OF SERVICE AGREEMENT

Welcome to [FACILITY NAME]. By using our services, you agree to the following terms and conditions:

1. SERVICES PROVIDED
We provide professional pet care services including:
• Overnight boarding
• Daycare
• Grooming
• Training (if applicable)
• Additional add-on services as offered

2. RESERVATION & BOOKING
• Reservations are recommended and may be required during peak seasons
• A valid credit card is required to hold reservations
• Same-day bookings are subject to availability

3. CHECK-IN & CHECK-OUT
• Standard check-in: [TIME] - [TIME]
• Standard check-out: [TIME] - [TIME]
• Extended hours may be available for an additional fee
• Pets not picked up by closing time may incur overnight boarding charges

4. PAYMENT TERMS
• Payment is due at the time of service
• We accept cash, credit cards, and debit cards
• Returned checks will incur a $35 fee
• Outstanding balances may result in collection action

5. RATES & FEES
• All rates are subject to change without notice
• Holiday rates may apply during designated holiday periods
• Multi-pet discounts may be available
• See current rate card for complete pricing

6. WHAT TO BRING
• Current vaccination records
• Your pet's regular food (to prevent digestive upset)
• Any required medications with clear instructions
• A favorite toy or blanket (labeled with pet's name)
• Completed intake forms

7. WHAT NOT TO BRING
• Rawhide or bones
• Retractable leashes
• Prong or shock collars
• Valuable items

8. PET REQUIREMENTS
• All pets must be current on required vaccinations
• Pets must be free of fleas, ticks, and other parasites
• Aggressive pets may not be accepted or may be required to leave
• Pets showing signs of illness will not be accepted

9. LIABILITY
• The Facility is not responsible for lost or damaged personal items
• See our Liability Waiver for complete terms
• Pet insurance is the owner's responsibility

10. AGREEMENT
By utilizing our services, you acknowledge that you have read, understood, and agree to these Terms of Service.`,
  },
  cancellation: {
    title: 'Cancellation & Refund Policy',
    content: `CANCELLATION & REFUND POLICY

We understand that plans change. Please review our cancellation policy carefully:

1. STANDARD CANCELLATION WINDOWS

Cancellation more than 72 hours before reservation:
• Full refund of any deposits paid
• No cancellation fee

Cancellation 48-72 hours before reservation:
• 75% refund of deposits
• 25% cancellation fee applies

Cancellation 24-48 hours before reservation:
• 50% refund of deposits
• 50% cancellation fee applies

Cancellation less than 24 hours before reservation:
• No refund
• Full payment required

2. NO-SHOW POLICY
Failure to arrive for your reservation without notice will result in:
• Full charge for the first night/day of service
• Cancellation of remaining reservation
• Possible impact on future booking privileges

3. EARLY PICKUP
If you pick up your pet earlier than scheduled:
• No refund for unused days
• Full payment for booked services is required

4. HOLIDAY & PEAK SEASON POLICY
During designated holidays and peak seasons:
• 7-day advance cancellation required for full refund
• Cancellations within 7 days forfeit full deposit
• Holidays include: New Year's, Memorial Day, July 4th, Labor Day, Thanksgiving, Christmas

5. EXTENDED STAYS
For reservations of 7 or more consecutive nights:
• 50% deposit required at booking
• Special cancellation terms may apply
• Contact us for details

6. WEATHER & EMERGENCIES
In the event of weather emergencies or facility closures:
• Affected bookings will receive full credit
• Credits can be applied to future bookings
• Credits expire 12 months from issue date

7. HOW TO CANCEL
• Phone: Call during business hours
• Email: Send written cancellation request
• Online: Use your account portal (if available)
• Cancellation is confirmed only when you receive confirmation from us

8. REFUND PROCESSING
• Refunds are processed within 5-7 business days
• Refunds are credited to the original payment method
• Cash payments may be refunded by check`,
  },
  vaccination: {
    title: 'Vaccination Requirements Policy',
    content: `VACCINATION REQUIREMENTS POLICY

The health and safety of all pets in our care is our top priority. All pets must meet the following vaccination requirements:

1. REQUIRED VACCINATIONS FOR DOGS

Rabies
• Current 1-year or 3-year vaccination required
• Must be administered by a licensed veterinarian
• Certificate must show expiration date

DHPP/DAPP (Distemper, Hepatitis, Parainfluenza, Parvovirus)
• Must be current per veterinarian's schedule
• Initial series plus annual boosters required

Bordetella (Kennel Cough)
• Must be administered within the past 12 months
• Intranasal, oral, or injectable accepted
• We recommend administration at least 5 days before boarding

Canine Influenza (H3N2 and H3N8)
• Required for all dogs
• Both strains (bivalent vaccine) recommended
• Must be current per manufacturer's schedule

2. REQUIRED VACCINATIONS FOR CATS

Rabies
• Current vaccination required
• Certificate must show expiration date

FVRCP (Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia)
• Must be current per veterinarian's schedule
• Annual boosters required

3. PROOF REQUIREMENTS

We accept:
• Veterinary records with clinic letterhead
• Rabies certificates
• Electronic records from your vet's portal
• Printed vaccination history

We do NOT accept:
• Handwritten notes
• Expired records
• Records without veterinary identification

4. RECORD SUBMISSION
• Submit records at least 48 hours before your reservation
• Email to [EMAIL] or upload to your account
• Keep records current in our system

5. VACCINE TIMING
• Rabies: Cannot board without current vaccination
• Bordetella: Must be given at least 5 days before arrival for maximum effectiveness
• All others: Must be current, not expired

6. TITERS
• Titer tests may be accepted in lieu of certain vaccinations
• Must be accompanied by veterinarian letter
• Subject to management approval
• Not accepted for Rabies (legally required)

7. MEDICAL EXEMPTIONS
• Written exemption from licensed veterinarian required
• Must explain medical reason for exemption
• Subject to facility approval
• Exempted pets may have restricted activities

8. EXPIRED VACCINATIONS
• Pets with expired vaccinations cannot be accepted
• No exceptions for same-day appointments
• Allow time for vaccine effectiveness (especially Bordetella)

For questions about our vaccination requirements or to submit records, please contact us.`,
  },
  health_behavior: {
    title: 'Health & Behavior Requirements',
    content: `HEALTH & BEHAVIOR REQUIREMENTS

To ensure the safety and well-being of all pets and staff, please review the following requirements:

1. HEALTH REQUIREMENTS

Flea & Tick Prevention
• All pets must be on current flea and tick prevention
• Pets found with fleas/ticks will be treated at owner's expense
• Treatment fee: $[AMOUNT] plus cost of products used

General Health
• Pets must be in good health upon arrival
• Pets showing signs of illness will not be accepted
• This includes: coughing, sneezing, nasal discharge, lethargy, diarrhea, vomiting

Spay/Neuter Policy
• Dogs over 6 months of age must be spayed or neutered for daycare participation
• Intact dogs may board but will have limited group interaction
• Females in heat cannot be accepted

Illness During Stay
• If your pet becomes ill during their stay, we will contact you immediately
• Veterinary care will be sought if needed at owner's expense
• Pets may be isolated for the safety of other animals

2. BEHAVIOR REQUIREMENTS

Aggression Policy
• Aggressive behavior toward people or other animals is not tolerated
• Pets displaying aggression may be required to leave immediately
• No refunds for early removal due to behavioral issues
• Repeat offenders may be banned from the facility

Socialization Assessment
• All new dogs undergo a temperament evaluation
• Evaluation fee: $[AMOUNT] (may be waived with booking)
• Results determine group play eligibility
• Some dogs may be suitable for individual care only

Acceptable Behaviors
We welcome friendly, social pets who:
• Can interact safely with other animals
• Respond to basic commands
• Do not exhibit excessive fear or anxiety
• Are comfortable in a group environment

Behaviors That May Result in Removal
• Biting or attempting to bite
• Excessive mounting
• Bullying other animals
• Destructive behavior
• Excessive barking that cannot be managed
• Escape attempts

3. WHEN TO KEEP YOUR PET HOME

Please do not bring your pet if they are experiencing:
• Vomiting or diarrhea in the last 24 hours
• Coughing or sneezing
• Eye or nasal discharge
• Lethargy or loss of appetite
• Fleas or ticks
• Open wounds or skin conditions
• Contagious conditions

4. DISCLOSURE REQUIREMENTS

You must inform us of:
• Any history of aggression
• Resource guarding behaviors
• Separation anxiety
• Fear triggers
• Medical conditions
• Current medications
• Recent surgeries or injuries

Failure to disclose relevant health or behavior information may result in dismissal from the facility without refund.`,
  },
  pickup_dropoff: {
    title: 'Pickup & Dropoff Policy',
    content: `PICKUP & DROPOFF POLICY

Please review our hours and procedures for smooth check-in and check-out experiences:

1. OPERATING HOURS

Monday - Friday: [TIME] AM - [TIME] PM
Saturday: [TIME] AM - [TIME] PM
Sunday: [TIME] AM - [TIME] PM

Holidays: Limited hours or closed - see holiday schedule

2. CHECK-IN PROCEDURES

• Arrive within 15 minutes of your scheduled time
• Complete any outstanding paperwork
• Provide any medications with clear written instructions
• Label all personal items with your pet's name
• Discuss any special needs with staff
• Say your goodbyes quickly to minimize stress

3. CHECK-OUT PROCEDURES

• Payment is due at time of pickup
• You will receive a summary of your pet's stay
• Collect all personal belongings
• Ask questions about your pet's experience

4. AUTHORIZED PICKUP PERSONS

• Only authorized individuals may pick up your pet
• Authorization must be provided in writing or added to your account
• Valid photo ID required for all pickups
• We will not release pets to unauthorized individuals

To add an authorized pickup person:
• Call or email us with the person's full name
• They must present valid photo ID at pickup

5. LATE PICKUP POLICY

Pickup after closing time:
• $[AMOUNT] late pickup fee per hour
• After 2 hours past closing: full overnight boarding charge
• Repeated late pickups may result in loss of booking privileges

Extended Hours (by appointment):
• Early drop-off (before regular hours): $[AMOUNT]
• Late pickup (after regular hours): $[AMOUNT]
• Must be arranged in advance
• Subject to staff availability

6. EARLY DROPOFF POLICY

• Early dropoff on scheduled boarding day is permitted during regular hours
• No additional charge unless before regular opening hours
• For daycare, arrive within your scheduled window
• Arriving more than 30 minutes early may not be accommodated

7. EXTENDED STAYS

If you are delayed in picking up your pet:
• Contact us as soon as possible
• Additional boarding charges will apply
• We will ensure your pet continues to receive excellent care
• Emergency contact may be called if we cannot reach you

8. MISSED PICKUPS

If you fail to pick up your pet for 3 or more days without contact:
• Your emergency contact will be notified
• Legal action may be taken
• Abandonment laws may apply
• Storage and care fees will continue to accrue

9. TRANSPORT SERVICES

If available, we may offer:
• Pickup and dropoff services for additional fee
• Contact us for availability and rates
• Must be scheduled in advance`,
  },
  feeding_medication: {
    title: 'Feeding & Medication Policy',
    content: `FEEDING & MEDICATION POLICY

We want your pet to feel at home. Please review our feeding and medication guidelines:

1. FEEDING GUIDELINES

Bring Your Own Food
• We strongly recommend bringing your pet's regular food
• Sudden diet changes can cause digestive upset
• Provide enough food for the entire stay plus 1 extra day
• Pre-portioned meals are appreciated but not required

Food Packaging
• Clearly label all food containers with your pet's name
• Include feeding instructions (amount and frequency)
• Resealable containers or Ziploc bags are ideal
• We cannot accept opened cans

Facility Food (if not providing your own)
• Premium kibble available for $[AMOUNT] per day
• We stock [BRAND NAME] adult formula
• Prescription diets must be provided by owner
• Notify us of any food allergies

2. FEEDING SCHEDULE

Standard Schedule:
• Breakfast: [TIME] AM
• Dinner: [TIME] PM

Special Schedules:
• Custom feeding times can be accommodated
• Note requirements on your intake form
• Additional feedings (puppies/seniors): $[AMOUNT] per feeding

3. TREATS & EXTRAS

We provide:
• Training treats for positive reinforcement
• Dental chews (with permission)
• Birthday treats (upon request)

You may bring:
• Special treats (in moderation)
• Chews and bones (non-rawhide only)
• Puzzle feeders

Please do NOT bring:
• Rawhide (choking hazard)
• Bones that can splinter
• Human food items

4. MEDICATION ADMINISTRATION

Medication Fee Schedule:
• Oral medications (pills/liquids): $[AMOUNT] per administration
• Topical medications: $[AMOUNT] per application
• Injections (insulin, etc.): $[AMOUNT] per injection
• Eye/ear drops: $[AMOUNT] per treatment

Medication Requirements:
• All medications must be in original prescription containers
• Include clear written instructions
• Provide enough medication for the entire stay plus 2 extra doses
• Controlled substances may require special arrangements

What We Can Administer:
✓ Pills and capsules
✓ Liquid medications
✓ Insulin injections
✓ Eye and ear drops
✓ Topical treatments
✓ Medicated shampoos

What We Cannot Administer:
✗ IV medications
✗ Complex medical procedures
✗ Medications requiring specialized training

5. SPECIAL DIETS

We accommodate:
• Prescription diets (owner-provided)
• Raw food diets (with proper handling)
• Homemade diets
• Multiple small meals
• Food puzzles and slow feeders

Raw Food Note:
• Must be properly packaged and labeled
• Kept frozen until use
• Handled separately from other foods
• Additional handling fee may apply

6. REFUSAL TO EAT

If your pet refuses to eat:
• We will try warming food or hand-feeding
• You will be notified if pet misses 2 consecutive meals
• We may try alternative foods with your permission
• Veterinary consultation if concerning

7. WATER

• Fresh, clean water is always available
• Filtered water provided
• Bowls cleaned and refilled multiple times daily
• Special water requirements should be noted`,
  },
  emergency: {
    title: 'Emergency Policy & Procedures',
    content: `EMERGENCY POLICY & PROCEDURES

Your pet's safety is our top priority. Please review our emergency procedures:

1. EMERGENCY VETERINARY AUTHORIZATION

By boarding your pet with us, you authorize [FACILITY NAME] to:

• Seek immediate emergency veterinary care for your pet
• Transport your pet to the nearest emergency veterinary clinic
• Authorize necessary life-saving treatment
• Make medical decisions if you cannot be reached

This authorization is granted when the safety or health of your pet is at immediate risk.

2. PRIMARY VETERINARY CONTACT

Your Veterinarian: [To be completed on intake form]
• We will attempt to contact your vet first during business hours
• For after-hours emergencies, we use [EMERGENCY VET NAME]

Our Emergency Veterinary Partner:
[EMERGENCY VET NAME]
[ADDRESS]
[PHONE]
Available 24/7

3. OWNER NOTIFICATION

In an emergency, we will:
1. Stabilize the situation and ensure pet safety
2. Seek veterinary care if immediately needed
3. Attempt to contact you via all numbers on file
4. Contact your emergency contact if you're unavailable
5. Continue with authorized treatment

Contact Attempts:
• Primary phone number
• Secondary phone number
• Emergency contact
• Email notification

4. FINANCIAL RESPONSIBILITY

Emergency Veterinary Care:
• All emergency veterinary expenses are the pet owner's responsibility
• You agree to pay all costs associated with emergency care
• A credit card on file may be charged for emergency expenses
• Estimated costs will be communicated when possible
• Treatment will not be withheld due to inability to reach owner

Deposit Requirement:
• Emergency vet may require a deposit before treatment
• [FACILITY NAME] is not responsible for advancing funds
• Your credit card on file may be used for initial deposit

5. TYPES OF EMERGENCIES

Medical Emergencies:
• Difficulty breathing
• Collapse or unconsciousness
• Seizures
• Severe injury
• Bloat (gastric dilation)
• Allergic reactions
• Persistent vomiting or diarrhea

Facility Emergencies:
• Fire
• Natural disaster
• Power outage
• Facility evacuation

6. EVACUATION PROCEDURES

In case of evacuation:
• Pets will be transported to our secondary location: [LOCATION]
• You will be notified immediately via phone and email
• Instructions for pickup will be provided
• Pets will receive continued care until reunited with owners

7. AFTER-HOURS EMERGENCIES

Our facility is staffed:
• 24/7 for overnight boarding guests
• Staff trained in pet first aid and CPR
• Emergency protocols clearly posted
• Veterinary consultation available by phone

8. DNR (DO NOT RESUSCITATE) ORDERS

If you have specific wishes regarding heroic measures:
• Provide written DNR instructions
• Discuss with management in advance
• Update as needed
• Signed acknowledgment required

9. DEATH OF A PET

In the unfortunate event of a pet's death:
• You will be contacted immediately
• Remains will be handled with dignity and respect
• Options for cremation services will be discussed
• Necropsy may be recommended to determine cause

10. LIMITATION OF LIABILITY

[FACILITY NAME] is not liable for:
• Veterinary expenses (owner's responsibility)
• Pre-existing conditions that worsen
• Unforeseeable medical events
• Injury or illness despite proper care

Your pet's safety is paramount. Please ensure all contact information is current and accurate.`,
  },
};

const TermsPolicies = () => {
  const tz = useTimezoneUtils();
  const [policies, setPolicies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editorForm, setEditorForm] = useState({
    title: '',
    type: 'liability_waiver',
    content: '',
    status: 'draft',
    requireForBooking: false,
    requireSignature: false,
  });

  // Load policies on mount
  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data } = await apiClient.get('/api/v1/policies');
      setPolicies(data?.policies || []);
    } catch (err) {
      console.error('Failed to load policies:', err);
      setError(err.message || 'Failed to load policies');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedPolicy(null);
    setEditorForm({
      title: '',
      type: 'liability_waiver',
      content: '',
      status: 'draft',
      requireForBooking: false,
      requireSignature: false,
    });
    setShowEditor(true);
  };

  const handleEdit = (policy) => {
    setSelectedPolicy(policy);
    setEditorForm({
      title: policy.title || policy.name || '',
      type: policy.type || 'liability_waiver',
      content: policy.content || '',
      status: policy.status || 'draft',
      requireForBooking: policy.requireForBooking || false,
      requireSignature: policy.requireSignature || false,
    });
    setShowEditor(true);
  };

  const handlePreview = (policy) => {
    setSelectedPolicy(policy);
    setShowPreview(true);
  };

  const handleDeleteClick = (policy) => {
    setSelectedPolicy(policy);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!selectedPolicy) return;

    try {
      setIsSaving(true);
      await apiClient.delete(`/api/v1/policies/${selectedPolicy.id}`);
      setPolicies(policies.filter(p => p.id !== selectedPolicy.id));
      setShowDeleteConfirm(false);
      setSelectedPolicy(null);
    } catch (err) {
      console.error('Failed to delete policy:', err);
      alert(err.message || 'Failed to delete policy');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicate = async (policy) => {
    try {
      const newPolicy = {
        ...policy,
        title: `${policy.title || policy.name} (Copy)`,
        name: `${policy.title || policy.name} (Copy)`,
        status: 'draft',
      };
      delete newPolicy.id;
      delete newPolicy.createdAt;
      delete newPolicy.updatedAt;

      const { data } = await apiClient.post('/api/v1/policies', newPolicy);
      setPolicies([...policies, data.policy || data]);
    } catch (err) {
      console.error('Failed to duplicate policy:', err);
      alert(err.message || 'Failed to duplicate policy');
    }
  };

  const handleSavePolicy = async () => {
    if (!editorForm.title.trim() || !editorForm.content.trim()) {
      alert('Title and content are required');
      return;
    }

    try {
      setIsSaving(true);

      const policyData = {
        name: editorForm.title,
        title: editorForm.title,
        type: editorForm.type,
        content: editorForm.content,
        status: editorForm.status,
        isActive: editorForm.status === 'active',
        requireForBooking: editorForm.requireForBooking,
        requireSignature: editorForm.requireSignature,
        version: selectedPolicy ? (selectedPolicy.version || 1) + 1 : 1,
      };

      if (selectedPolicy) {
        const { data } = await apiClient.put(`/api/v1/policies/${selectedPolicy.id}`, policyData);
        setPolicies(policies.map(p => p.id === selectedPolicy.id ? (data.policy || data) : p));
      } else {
        const { data } = await apiClient.post('/api/v1/policies', policyData);
        setPolicies([...policies, data.policy || data]);
      }

      setShowEditor(false);
      setSelectedPolicy(null);
    } catch (err) {
      console.error('Failed to save policy:', err);
      alert(err.message || 'Failed to save policy');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUseTemplate = (templateType) => {
    const template = POLICY_TEMPLATES[templateType];
    if (!template) return;

    setEditorForm({
      title: template.title,
      type: templateType,
      content: template.content,
      status: 'draft',
      requireForBooking: templateType === 'liability_waiver',
      requireSignature: templateType === 'liability_waiver' || templateType === 'terms_of_service',
    });
    setShowTemplates(false);
    setShowEditor(true);
  };

  const getStatusBadge = (policy) => {
    const status = policy.status || (policy.isActive ? 'active' : 'draft');
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'inactive':
        return <Badge variant="neutral">Inactive</Badge>;
      default:
        return <Badge variant="warning">Draft</Badge>;
    }
  };

  const getPolicyIcon = (type) => {
    const config = POLICY_TYPES[type] || POLICY_TYPES.terms_of_service;
    const Icon = config.icon;
    return (
      <div className={`p-2 rounded-lg ${config.bgColor}`}>
        <Icon className={`w-5 h-5 ${config.color}`} />
      </div>
    );
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return 'Never';
    try {
      return tz.formatDate(new Date(dateStr), {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        <span className="ml-3 text-gray-500 dark:text-text-secondary">Loading policies...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error State */}
      {error && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-200">{error}</p>
              <Button variant="link" size="sm" onClick={loadPolicies} className="mt-1 p-0 h-auto text-red-600 dark:text-red-400">
                Try again
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Policies List Card */}
      <Card
        title="Your Policies"
        description="Policies that customers can view and sign"
        headerActions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)}>
              <FileText className="w-4 h-4 mr-2" />
              Templates
            </Button>
            <Button size="sm" onClick={handleCreateNew}>
              <Plus className="w-4 h-4 mr-2" />
              Create Policy
            </Button>
          </div>
        }
      >
        {policies.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-text-primary mb-2">
              No policies created yet
            </h3>
            <Button onClick={handleCreateNew} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Create First Policy
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {policies.map(policy => (
              <div
                key={policy.id}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-surface-border bg-gray-50 dark:bg-surface-secondary hover:bg-gray-100 dark:hover:bg-surface-elevated transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {getPolicyIcon(policy.type)}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-sm truncate">{policy.title || policy.name}</h4>
                      {getStatusBadge(policy)}
                      {policy.requireForBooking && <Badge variant="info" size="sm">Required</Badge>}
                      {policy.requireSignature && <Badge variant="neutral" size="sm">Signature</Badge>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-text-secondary mt-0.5">
                      <span>{POLICY_TYPES[policy.type]?.label || 'Custom'}</span>
                      <span>•</span>
                      <span>Updated {formatDateDisplay(policy.updatedAt || policy.createdAt)}</span>
                      {policy.version && <><span>•</span><span>v{policy.version}</span></>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => handlePreview(policy)} title="Preview">
                    <Eye className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDuplicate(policy)} title="Duplicate">
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(policy)} title="Edit">
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(policy)}
                    title="Delete"
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Policy Best Practices */}
      <Card title="Policy Best Practices" description="Tips for effective kennel policies">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-surface-secondary border border-gray-200 dark:border-surface-border">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm">Liability Waiver First</h4>
                <p className="text-xs text-gray-500 dark:text-text-secondary mt-1">
                  Always require a signed liability waiver before the first booking. This is your most important legal protection.
                </p>
              </div>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-surface-secondary border border-gray-200 dark:border-surface-border">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm">Clear Language</h4>
                <p className="text-xs text-gray-500 dark:text-text-secondary mt-1">
                  Use simple, clear language customers can understand. Avoid jargon and legal terms when possible.
                </p>
              </div>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-surface-secondary border border-gray-200 dark:border-surface-border">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm">Annual Review</h4>
                <p className="text-xs text-gray-500 dark:text-text-secondary mt-1">
                  Review and update your policies at least once a year. Laws and best practices change.
                </p>
              </div>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-surface-secondary border border-gray-200 dark:border-surface-border">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm">Legal Review</h4>
                <p className="text-xs text-gray-500 dark:text-text-secondary mt-1">
                  Have an attorney review your policies before publishing. Template policies should be customized for your state.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Policy Editor Slide Panel */}
      <SlidePanel
        open={showEditor}
        onClose={() => setShowEditor(false)}
        title={selectedPolicy ? 'Edit Policy' : 'Create New Policy'}
        width="w-full md:w-2/3 lg:w-1/2"
      >
        <div className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">Policy Title *</label>
            <input
              type="text"
              value={editorForm.title}
              onChange={(e) => setEditorForm({ ...editorForm, title: e.target.value })}
              placeholder="e.g., Liability Waiver"
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary text-gray-900 dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Type */}
          <div>
            <StyledSelect
              label="Policy Type"
              options={Object.entries(POLICY_TYPES).map(([key, config]) => ({
                value: key,
                label: config.label,
              }))}
              value={editorForm.type}
              onChange={(opt) => setEditorForm({ ...editorForm, type: opt?.value || 'liability_waiver' })}
              isClearable={false}
              isSearchable
              menuPortalTarget={document.body}
            />
          </div>

          {/* Status */}
          <div>
            <StyledSelect
              label="Status"
              options={[
                { value: 'draft', label: 'Draft' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
              value={editorForm.status}
              onChange={(opt) => setEditorForm({ ...editorForm, status: opt?.value || 'draft' })}
              isClearable={false}
              isSearchable={false}
              menuPortalTarget={document.body}
              helpText="Only active policies will be shown to customers"
            />
          </div>

          {/* Options */}
          <div className="space-y-4">
            <Switch
              checked={editorForm.requireForBooking}
              onChange={(checked) => setEditorForm({ ...editorForm, requireForBooking: checked })}
              label="Required for Booking"
              description="Customers must agree to this policy before booking"
            />
            <Switch
              checked={editorForm.requireSignature}
              onChange={(checked) => setEditorForm({ ...editorForm, requireSignature: checked })}
              label="Require Signature"
              description="Customers must provide an electronic signature"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium mb-2">Policy Content *</label>
            <textarea
              value={editorForm.content}
              onChange={(e) => setEditorForm({ ...editorForm, content: e.target.value })}
              placeholder="Enter your policy content here..."
              rows={20}
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary text-gray-900 dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 dark:text-text-secondary mt-1">
              Use plain text. Replace [FACILITY NAME], [TIME], [AMOUNT], etc. with your actual information.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-surface-border">
            <Button variant="ghost" onClick={() => setShowEditor(false)}>Cancel</Button>
            <div className="flex gap-2">
              {editorForm.content && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedPolicy({ ...selectedPolicy, ...editorForm, title: editorForm.title, name: editorForm.title });
                    setShowPreview(true);
                  }}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              )}
              <Button onClick={handleSavePolicy} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {selectedPolicy ? 'Update Policy' : 'Create Policy'}
              </Button>
            </div>
          </div>
        </div>
      </SlidePanel>

      {/* Preview Modal */}
      <Modal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        title={selectedPolicy?.title || selectedPolicy?.name || 'Policy Preview'}
        size="xl"
      >
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
            {selectedPolicy?.content || editorForm.content}
          </pre>
        </div>
      </Modal>

      {/* Templates Modal */}
      <Modal
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        title="Policy Templates"
        description="Start with a pre-built template and customize for your business"
        size="xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(POLICY_TYPES).map(([key, config]) => {
            const Icon = config.icon;
            const template = POLICY_TEMPLATES[key];

            return (
              <div
                key={key}
                className="p-4 rounded-lg border border-gray-200 dark:border-surface-border hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-md transition-all cursor-pointer"
                onClick={() => template && handleUseTemplate(key)}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${config.bgColor}`}>
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{config.label}</h4>
                    <p className="text-sm text-gray-500 dark:text-text-secondary mt-1">{config.description}</p>
                    {template ? (
                      <Button variant="outline" size="sm" className="mt-3">Use Template</Button>
                    ) : (
                      <p className="text-xs text-gray-400 dark:text-text-muted mt-3 italic">Coming soon</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Policy"
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete Policy
            </Button>
          </div>
        }
      >
        <p>Are you sure you want to delete <strong>{selectedPolicy?.title || selectedPolicy?.name}</strong>?</p>
        <p className="text-sm text-gray-500 dark:text-text-secondary mt-2">
          This action cannot be undone. Customers who have already signed this policy will retain their signed copies.
        </p>
      </Modal>
    </div>
  );
};

export default TermsPolicies;
