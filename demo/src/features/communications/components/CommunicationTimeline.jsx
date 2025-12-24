import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  Mail, MessageSquare, Phone, FileText, Calendar, 
  DollarSign, AlertTriangle, StickyNote, ChevronRight 
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCustomerTimeline } from '../api';

const timelineIcons = {
  communication: {
    email: Mail,
    sms: MessageSquare,
    call: Phone,
    note: FileText,
    system: FileText,
  },
  booking: Calendar,
  payment: DollarSign,
  incident: AlertTriangle,
  note: StickyNote,
};

const timelineColors = {
  communication: 'blue',
  booking: 'green',
  payment: 'purple',
  incident: 'danger',
  note: 'gray',
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'Unknown time';
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Unknown time';
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return 'Unknown time';
  }
};

const TimelineItem = ({ item }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!item) return null;
  
  const itemType = item.type || 'note';
  const itemSubtype = item.subtype || 'note';
  
  const Icon = itemType === 'communication' 
    ? (timelineIcons.communication[itemSubtype] || FileText)
    : (timelineIcons[itemType] || FileText);
    
  const color = timelineColors[itemType] || 'gray';
  const title = item.title || item.content || 'Activity';
  const description = item.description || '';

  return (
    <div className="flex gap-4 group">
      <div className="relative">
        <div className={`w-10 h-10 rounded-full bg-${color}-100 flex items-center justify-center`}>
          <Icon className={`w-5 h-5 text-${color}-600`} />
        </div>
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-0.5 h-full bg-gray-200 dark:bg-surface-border" />
      </div>
      
      <div className="flex-1 pb-8">
        <div 
          className="cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium text-text">{title}</h4>
              {description && (
                <p className="text-sm text-text-secondary mt-0.5">{description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span>{formatTimestamp(item.timestamp)}</span>
              <ChevronRight 
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              />
            </div>
          </div>
        </div>
        
        {isExpanded && item.data && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-surface-secondary rounded-lg text-sm">
            <pre className="whitespace-pre-wrap text-text-secondary">
              {JSON.stringify(item.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default function CommunicationTimeline({ ownerId }) {
  const { data, isLoading, error, fetchNextPage, hasNextPage } = useCustomerTimeline(ownerId);

  if (isLoading) {
    return (
      <Card>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="text-center py-8 text-text-secondary">
          Failed to load timeline
        </div>
      </Card>
    );
  }

  const timeline = data?.pages?.flatMap(page => page.data) || [];

  if (timeline.length === 0) {
    return (
      <Card>
        <div className="text-center py-8 text-text-secondary">
          No activity to show
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="relative">
        {timeline.map((item, index) => (
          <div key={item.recordId || item.id || `timeline-${index}`} className={index === timeline.length - 1 ? '[&_.absolute]:hidden' : ''}>
            <TimelineItem item={item} />
          </div>
        ))}
      </div>
      
      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          className="w-full py-2 text-sm text-primary hover:text-primary-dark transition-colors"
        >
          Load more
        </button>
      )}
    </Card>
  );
}

