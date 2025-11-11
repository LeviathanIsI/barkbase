# Card Component Audit - File Details

## PADDING BY FILE

### P-6 STANDARD (121 instances)
- BookingCard.jsx:32
- QuickStatsDashboard.jsx:23,57
- CalendarView.jsx:5, KanbanView.jsx:5, TimelineView.jsx:5
- CalendarWeekView.jsx:42,95
- CheckInOutDashboard.jsx:126,177,236
- Pets.jsx:268,280,292,304,323,339,387
- And 100+ more files

### P-4 COMPACT (82 instances)
- EnhancedStatsDashboard.jsx:70,86,103,118
- CustomerDetail.jsx:85,97,109,121
- Payments.jsx:133,146,159,172,186
- PetDetailsDrawer.jsx:109,124,151,193,218,238,290
- EnhancedDaycareStats.jsx:76,97,115,133

### P-8 EXCESSIVE (9 instances - FIX)
- EmptyStatePets.jsx:34,70,155
- EmptyStatePackages.jsx:106,174,202,264
- TeamOverview.jsx:147

### P-12 CRITICAL (3 instances - FIX)
- PaymentsDashboard.jsx:160,173
- Vaccinations.jsx:135

### P-0 FLEX (3 instances - OK)
- HighDensityTodayView.jsx:219
- InternalMessaging.jsx:73 (x2 locations)

## CARDHEADER/CARDCONTENT USAGE (4 files only)
- RoleTemplateSelector.jsx
- RoleEditor.jsx
- Roles.jsx
- Card.jsx (definition)

## METRICCARD USAGE
Active: DashboardEnhanced.jsx:196 (1 file)
Missing: 12+ files with manual metric cards

## KEY ISSUES
1. P-8 and P-12 padding too excessive
2. MetricCard underutilized
3. CardHeader/CardContent adoption <3%
4. space-y-2 too tight for card sections
5. Manual metric card duplication

