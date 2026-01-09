import { useState, useEffect, useRef, useMemo } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import {
  Search,
  Send,
  Plus,
  ChevronRight,
  ChevronLeft,
  MoreHorizontal,
  Phone,
  Mail,
  PawPrint,
  User,
  FileText,
  Paperclip,
  Smile,
  CheckCheck,
  Check,
  Clock,
  MessageSquare,
  Calendar,
  DollarSign,
  Bell,
  ExternalLink,
  Loader2,
  MessageCircle,
  TrendingUp,
  Inbox,
  Send as SendIcon,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/card';
import Badge from '@/components/ui/Badge';
import StyledSelect from '@/components/ui/StyledSelect';
import { Skeleton } from '@/components/ui/skeleton';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import {
  useConversationsQuery,
  useConversationMessagesQuery,
  useSendMessageMutation,
  useMarkConversationReadMutation
} from '../api';
import { useAuthStore } from '@/stores/auth';
import { useSlideout, SLIDEOUT_TYPES } from '@/components/slideout';
import { getSocket } from '@/lib/socket';
import toast from 'react-hot-toast';
import { cn } from '@/lib/cn';

// Filter options
const FILTER_OPTIONS = [
  { value: 'all', label: 'All Messages' },
  { value: 'unread', label: 'Unread' },
  { value: 'needs-action', label: 'Needs Action' },
  { value: 'assigned', label: 'Assigned to Me' },
];

const SORT_OPTIONS = [
  { value: 'recent', label: 'Recent First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'owner', label: 'By Owner Name' },
];

// Format timestamp for conversation list
const formatConversationTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, 'h:mm a');
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d');
};

// Format timestamp for message bubbles
const formatMessageTime = (dateStr) => {
  if (!dateStr) return '';
  return format(new Date(dateStr), 'h:mm a');
};

// Get initials from name
const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Avatar component
const Avatar = ({ name, size = 'md', className }) => {
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  };

  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500',
    'bg-pink-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-rose-500',
  ];

  const colorIndex = name ? name.charCodeAt(0) % colors.length : 0;

  return (
    <div className={cn(
      'rounded-full flex items-center justify-center text-white font-medium flex-shrink-0',
      sizeClasses[size],
      colors[colorIndex],
      className
    )}>
      {getInitials(name)}
    </div>
  );
};

// Stats Bar Component
const StatsBar = ({ conversations }) => {
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const total = conversations?.length || 0;
    const unread = conversations?.reduce((sum, c) => sum + (c.unreadCount || 0), 0) || 0;
    const needsReply = conversations?.filter(c => c.needsReply)?.length || 0;
    // Mock sent today - would need actual API data
    const sentToday = conversations?.filter(c => {
      const lastMsg = c.lastMessage?.createdAt;
      return lastMsg && lastMsg.split('T')[0] === today && c.lastMessage?.senderType === 'STAFF';
    })?.length || 0;

    return { total, unread, needsReply, sentToday };
  }, [conversations]);

  const statItems = [
    {
      label: 'Total Conversations',
      value: stats.total,
      icon: MessageCircle,
      color: 'text-[var(--bb-color-accent)]',
      bgColor: 'bg-[var(--bb-color-accent-soft)]',
    },
    {
      label: 'Unread',
      value: stats.unread,
      icon: Inbox,
      color: stats.unread > 0 ? 'text-[var(--bb-color-status-negative)]' : 'text-[var(--bb-color-text-muted)]',
      bgColor: stats.unread > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-[var(--bb-color-bg-elevated)]',
      attention: stats.unread > 0,
    },
    {
      label: 'Needs Reply',
      value: stats.needsReply,
      icon: Bell,
      color: stats.needsReply > 0 ? 'text-[var(--bb-color-status-warning)]' : 'text-[var(--bb-color-text-muted)]',
      bgColor: stats.needsReply > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-[var(--bb-color-bg-elevated)]',
      attention: stats.needsReply > 0,
    },
    {
      label: 'Sent Today',
      value: stats.sentToday,
      icon: SendIcon,
      color: 'text-[var(--bb-color-status-positive)]',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4 mb-4">
      {statItems.map((stat, idx) => (
        <div
          key={idx}
          className={cn(
            'rounded-xl border p-4 transition-all',
            stat.attention && 'ring-2 ring-offset-2',
            stat.attention && stat.color.includes('negative') && 'ring-red-500/30',
            stat.attention && stat.color.includes('warning') && 'ring-amber-500/30'
          )}
          style={{
            backgroundColor: 'var(--bb-color-bg-surface)',
            borderColor: 'var(--bb-color-border-subtle)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', stat.bgColor)}>
              <stat.icon className={cn('h-5 w-5', stat.color)} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[color:var(--bb-color-text-primary)]">
                {stat.value}
              </p>
              <p className="text-xs text-[color:var(--bb-color-text-muted)]">
                {stat.label}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Conversation Item
const ConversationItem = ({ conversation, isSelected, onClick }) => {
  const hasUnread = conversation.unreadCount > 0;
  const needsReply = conversation.needsReply;
  const ownerName = conversation.owner
    ? `${conversation.owner.firstName} ${conversation.owner.lastName}`
    : conversation.otherUser?.name || 'Unknown';

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 p-3 text-left transition-colors border-b',
        isSelected
          ? 'bg-[var(--bb-color-accent-soft)] border-l-2 border-l-[var(--bb-color-accent)]'
          : 'hover:bg-[var(--bb-color-bg-elevated)]'
      )}
      style={{ borderColor: 'var(--bb-color-border-subtle)' }}
    >
      {/* Avatar with unread indicator */}
      <div className="relative flex-shrink-0">
        <Avatar name={ownerName} size="sm" />
        {hasUnread && (
          <div className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-[var(--bb-color-accent)] rounded-full border-2 border-white dark:border-[var(--bb-color-bg-surface)]" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className={cn(
            'font-medium truncate text-sm',
            hasUnread ? 'text-[color:var(--bb-color-text-primary)]' : 'text-[color:var(--bb-color-text-primary)]'
          )}>
            {ownerName}
          </span>
          <span className="text-[10px] text-[color:var(--bb-color-text-muted)] flex-shrink-0">
            {formatConversationTime(conversation.lastMessage?.createdAt)}
          </span>
        </div>

        {/* Last message preview */}
        <p className={cn(
          'text-xs truncate',
          hasUnread ? 'text-[color:var(--bb-color-text-primary)] font-medium' : 'text-[color:var(--bb-color-text-muted)]'
        )}>
          {conversation.lastMessage?.content || 'No messages yet'}
        </p>

        {/* Status badges */}
        {(hasUnread || needsReply) && (
          <div className="flex items-center gap-1.5 mt-1">
            {hasUnread && (
              <Badge variant="primary" size="sm">{conversation.unreadCount}</Badge>
            )}
            {needsReply && (
              <Badge variant="warning" size="sm">Reply</Badge>
            )}
          </div>
        )}
      </div>
    </button>
  );
};

// Message Bubble
const MessageBubble = ({ message, isCurrentUser, showTimestamp, conversation }) => {
  // Get display name based on sender type
  const senderName = isCurrentUser
    ? (message.staffName || 'Staff')
    : (conversation?.owner ? `${conversation.owner.firstName}` : 'Customer');

  return (
    <div className={cn('flex gap-2', isCurrentUser ? 'justify-end' : 'justify-start')}>
      {!isCurrentUser && (
        <Avatar name={senderName} size="sm" className="mt-1" />
      )}
      <div className={cn('max-w-[70%]', isCurrentUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2',
            isCurrentUser
              ? 'bg-[var(--bb-color-accent)] text-white rounded-br-md'
              : 'bg-[var(--bb-color-bg-elevated)] text-[color:var(--bb-color-text-primary)] rounded-bl-md'
          )}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        </div>
        {showTimestamp && (
          <div className={cn(
            'flex items-center gap-1 mt-1 px-1',
            isCurrentUser ? 'justify-end' : 'justify-start'
          )}>
            <span className="text-[10px] text-[color:var(--bb-color-text-muted)]">
              {formatMessageTime(message.createdAt)}
            </span>
            {isCurrentUser && (
              <CheckCheck className="h-3 w-3 text-[var(--bb-color-accent)]" />
            )}
          </div>
        )}
      </div>
      {isCurrentUser && (
        <Avatar name={senderName} size="sm" className="mt-1" />
      )}
    </div>
  );
};

// Date Divider
const DateDivider = ({ date }) => {
  let label;
  if (isToday(date)) label = 'Today';
  else if (isYesterday(date)) label = 'Yesterday';
  else label = format(date, 'MMMM d, yyyy');

  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px" style={{ backgroundColor: 'var(--bb-color-border-subtle)' }} />
      <span className="text-xs text-[color:var(--bb-color-text-muted)] font-medium">{label}</span>
      <div className="flex-1 h-px" style={{ backgroundColor: 'var(--bb-color-border-subtle)' }} />
    </div>
  );
};

// Context Sidebar Component
const ContextSidebar = ({ conversation, onViewOwner, onViewPet, onScheduleBooking }) => {
  if (!conversation) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div
          className="h-16 w-16 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
        >
          <User className="h-8 w-8 text-[color:var(--bb-color-text-muted)]" />
        </div>
        <p className="text-sm text-[color:var(--bb-color-text-muted)]">
          Select a conversation to view details
        </p>
      </div>
    );
  }

  const ownerData = conversation.owner || conversation.otherUser;
  const owner = ownerData ? {
    ...ownerData,
    name: ownerData.firstName ? `${ownerData.firstName} ${ownerData.lastName}` : ownerData.name,
  } : null;
  const pets = conversation.pets || [];

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Contact Info Card */}
      <div
        className="rounded-xl border p-4"
        style={{
          backgroundColor: 'var(--bb-color-bg-surface)',
          borderColor: 'var(--bb-color-border-subtle)',
        }}
      >
        <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)] mb-3 flex items-center gap-2">
          <User className="h-4 w-4" />
          Contact Info
        </h3>
        <div className="flex items-center gap-3 mb-3">
          <Avatar name={owner?.name} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[color:var(--bb-color-text-primary)] truncate">
              {owner?.name || 'Unknown'}
            </p>
            {owner?.email && (
              <p className="text-xs text-[color:var(--bb-color-text-muted)] truncate">
                {owner.email}
              </p>
            )}
          </div>
        </div>

        {/* Contact Actions */}
        <div className="flex gap-2 mb-3">
          {owner?.phone && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => window.open(`tel:${owner.phone}`)}
            >
              <Phone className="h-3.5 w-3.5 mr-1.5" />
              Call
            </Button>
          )}
          {owner?.email && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => window.open(`mailto:${owner.email}`)}
            >
              <Mail className="h-3.5 w-3.5 mr-1.5" />
              Email
            </Button>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={onViewOwner}
        >
          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
          View Full Profile
        </Button>
      </div>

      {/* Their Pets Card */}
      {pets.length > 0 && (
        <div
          className="rounded-xl border p-4"
          style={{
            backgroundColor: 'var(--bb-color-bg-surface)',
            borderColor: 'var(--bb-color-border-subtle)',
          }}
        >
          <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)] mb-3 flex items-center gap-2">
            <PawPrint className="h-4 w-4" />
            Their Pets ({pets.length})
          </h3>
          <div className="space-y-2">
            {pets.map((pet, idx) => (
              <button
                key={pet.recordId || idx}
                onClick={() => onViewPet(pet)}
                className="w-full flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-[var(--bb-color-bg-elevated)]"
              >
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'var(--bb-color-accent-soft)' }}
                >
                  <PawPrint className="h-4 w-4 text-[var(--bb-color-accent)]" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)] truncate">
                    {pet.name}
                  </p>
                  <p className="text-xs text-[color:var(--bb-color-text-muted)] truncate">
                    {pet.breed || pet.species || 'Pet'}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity Card */}
      <div
        className="rounded-xl border p-4"
        style={{
          backgroundColor: 'var(--bb-color-bg-surface)',
          borderColor: 'var(--bb-color-border-subtle)',
        }}
      >
        <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)] mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Recent Activity
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-1.5">
            <span className="text-xs text-[color:var(--bb-color-text-muted)]">Last Booking</span>
            <span className="text-xs font-medium text-[color:var(--bb-color-text-primary)]">
              {conversation.lastBookingDate || 'None'}
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-xs text-[color:var(--bb-color-text-muted)]">Upcoming</span>
            <span className="text-xs font-medium text-[color:var(--bb-color-text-primary)]">
              {conversation.upcomingBookings || 0} bookings
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-xs text-[color:var(--bb-color-text-muted)]">Account Status</span>
            <Badge
              variant={conversation.accountStatus === 'Active' ? 'success' : 'warning'}
              size="sm"
            >
              {conversation.accountStatus || 'Active'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Quick Actions Card */}
      <div
        className="rounded-xl border p-4"
        style={{
          backgroundColor: 'var(--bb-color-bg-surface)',
          borderColor: 'var(--bb-color-border-subtle)',
        }}
      >
        <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)] mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Quick Actions
        </h3>
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={onScheduleBooking}
          >
            <Calendar className="h-3.5 w-3.5 mr-2" />
            Schedule Booking
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => toast.info('Send reminder coming soon')}
          >
            <Bell className="h-3.5 w-3.5 mr-2" />
            Send Reminder
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => toast.info('Add note coming soon')}
          >
            <FileText className="h-3.5 w-3.5 mr-2" />
            Add Note
          </Button>
        </div>
      </div>
    </div>
  );
};

// Empty State Components
const EmptyConversationList = ({ onNewConversation }) => (
  <div className="flex flex-col items-center justify-center h-full py-8 px-4">
    <EmptyState
      icon={MessageSquare}
      title="Your inbox is ready"
      description="Start connecting with pet owners. Conversations will appear here."
      variant="messages"
      compact
      actions={
        <Button size="sm" onClick={onNewConversation}>
          <Plus className="h-4 w-4 mr-1.5" />
          Start Conversation
        </Button>
      }
    />
  </div>
);

const EmptyChatPane = ({ onNewConversation }) => (
  <div className="flex flex-col items-center justify-center h-full px-4">
    <EmptyState
      icon={Send}
      title="Select a conversation"
      description="Choose a conversation from the list to view messages and connect with pet owners."
      variant="messages"
      actions={
        <Button variant="outline" size="sm" onClick={onNewConversation}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Conversation
        </Button>
      }
    />
  </div>
);

const Messages = () => {
  const { openSlideout } = useSlideout();
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [searchTerm, setSearchTerm] = useState('');
  const [showMobileList, setShowMobileList] = useState(true);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const currentUser = useAuthStore(state => state.user);

  const { data: conversations, isLoading: conversationsLoading, refetch: refetchConversations } = useConversationsQuery();
  const { data: messages, isLoading: messagesLoading, refetch: refetchMessages } = useConversationMessagesQuery(
    selectedConversation?.id || selectedConversation?.conversationId
  );
  const sendMutation = useSendMessageMutation();
  const markReadMutation = useMarkConversationReadMutation();

  // Mark conversation as read when selected
  useEffect(() => {
    if (selectedConversation && selectedConversation.unreadCount > 0) {
      markReadMutation.mutate(selectedConversation.id || selectedConversation.conversationId);
    }
  }, [selectedConversation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [messageText]);

  // Set up socket.io listener for new messages
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = () => {
      refetchConversations();
      if (selectedConversation) {
        refetchMessages();
      }
    };

    socket.on('message:new', handleNewMessage);

    return () => {
      socket.off('message:new', handleNewMessage);
    };
  }, [selectedConversation, refetchConversations, refetchMessages]);

  // Filter and sort conversations
  const filteredConversations = useMemo(() => {
    let result = conversations || [];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(conv => {
        const ownerName = conv.owner
          ? `${conv.owner.firstName} ${conv.owner.lastName}`.toLowerCase()
          : conv.otherUser?.name?.toLowerCase() || '';
        return ownerName.includes(term) ||
          conv.pets?.some(p => p.name?.toLowerCase().includes(term)) ||
          conv.lastMessage?.content?.toLowerCase().includes(term);
      });
    }

    // Status filter
    switch (filter) {
      case 'unread':
        result = result.filter(c => c.unreadCount > 0);
        break;
      case 'needs-action':
        result = result.filter(c => c.needsReply);
        break;
      case 'assigned':
        result = result.filter(c => c.assignedTo === currentUser?.recordId);
        break;
    }

    // Sort
    switch (sortBy) {
      case 'oldest':
        result = [...result].sort((a, b) =>
          new Date(a.lastMessage?.createdAt || 0) - new Date(b.lastMessage?.createdAt || 0)
        );
        break;
      case 'owner':
        result = [...result].sort((a, b) => {
          const nameA = a.owner ? `${a.owner.firstName} ${a.owner.lastName}` : a.otherUser?.name || '';
          const nameB = b.owner ? `${b.owner.firstName} ${b.owner.lastName}` : b.otherUser?.name || '';
          return nameA.localeCompare(nameB);
        });
        break;
      default: // recent
        result = [...result].sort((a, b) =>
          new Date(b.lastMessage?.createdAt || 0) - new Date(a.lastMessage?.createdAt || 0)
        );
    }

    return result;
  }, [conversations, searchTerm, filter, sortBy, currentUser]);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    if (!messages) return [];

    const groups = [];
    let currentDate = null;

    messages.forEach((msg, idx) => {
      const msgDate = new Date(msg.createdAt);
      const dateStr = format(msgDate, 'yyyy-MM-dd');

      if (dateStr !== currentDate) {
        groups.push({ type: 'date', date: msgDate });
        currentDate = dateStr;
      }

      // Show timestamp every 5 messages or if gap > 5 minutes
      const prevMsg = messages[idx - 1];
      const showTimestamp = !prevMsg ||
        (idx % 5 === 0) ||
        (new Date(msg.createdAt) - new Date(prevMsg.createdAt)) > 5 * 60 * 1000;

      groups.push({ type: 'message', message: msg, showTimestamp });
    });

    return groups;
  }, [messages]);

  const handleSelectConversation = (conv) => {
    setSelectedConversation(conv);
    setShowMobileList(false);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!messageText.trim() || !selectedConversation) return;

    try {
      const ownerId = selectedConversation.owner?.id || selectedConversation.otherUser?.recordId;
      await sendMutation.mutateAsync({
        recipientId: ownerId,
        conversationId: selectedConversation.id || selectedConversation.conversationId,
        content: messageText
      });
      setMessageText('');
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const handleNewConversation = () => {
    openSlideout(SLIDEOUT_TYPES.MESSAGE_CREATE);
  };

  // DAFE: Open Owner slideout
  const handleViewOwner = () => {
    const ownerData = selectedConversation?.owner || selectedConversation?.otherUser;
    if (ownerData) {
      const owner = {
        ...ownerData,
        name: ownerData.firstName ? `${ownerData.firstName} ${ownerData.lastName}` : ownerData.name,
      };
      openSlideout(SLIDEOUT_TYPES.OWNER_EDIT, {
        owner,
        title: `${owner.name || 'Owner'} Profile`,
      });
    }
  };

  // DAFE: Open Pet slideout
  const handleViewPet = (pet) => {
    if (pet) {
      openSlideout(SLIDEOUT_TYPES.PET_EDIT, {
        pet,
        title: `${pet.name || 'Pet'} Profile`,
      });
    }
  };

  // DAFE: Open Booking slideout
  const handleScheduleBooking = () => {
    const ownerData = selectedConversation?.owner || selectedConversation?.otherUser;
    const pets = selectedConversation?.pets || [];
    openSlideout(SLIDEOUT_TYPES.BOOKING_CREATE, {
      title: 'New Booking',
      prefill: {
        ownerId: ownerData?.id || ownerData?.recordId,
        petId: pets[0]?.id || pets[0]?.recordId,
      },
    });
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <nav className="mb-1">
            <ol className="flex items-center gap-1 text-xs text-[color:var(--bb-color-text-muted)]">
              <li><span>Communications</span></li>
              <li><ChevronRight className="h-3 w-3" /></li>
              <li className="text-[color:var(--bb-color-text-primary)] font-medium">Messages</li>
            </ol>
          </nav>
          <h1 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)]">Messages</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => toast.info('Templates coming soon')}>
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Templates
          </Button>
          <Button size="sm" onClick={handleNewConversation}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Conversation
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <StatsBar conversations={conversations} />

      {/* Main Content - Three Column Layout */}
      <div
        className="flex-1 flex rounded-xl border overflow-hidden"
        style={{
          backgroundColor: 'var(--bb-color-bg-surface)',
          borderColor: 'var(--bb-color-border-subtle)',
        }}
      >
        {/* Left Panel - Conversation List (20%) */}
        <div
          className={cn(
            'w-[20%] min-w-[240px] flex-shrink-0 border-r flex flex-col',
            'lg:block',
            showMobileList ? 'block absolute inset-0 z-20 lg:relative' : 'hidden'
          )}
          style={{
            backgroundColor: 'var(--bb-color-bg-surface)',
            borderColor: 'var(--bb-color-border-subtle)',
          }}
        >
          {/* Search & Filters */}
          <div className="p-3 border-b space-y-2" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--bb-color-accent)]/50"
                style={{
                  backgroundColor: 'var(--bb-color-bg-elevated)',
                  color: 'var(--bb-color-text-primary)',
                }}
              />
            </div>

            {/* Filter & Sort Row */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <StyledSelect
                  options={FILTER_OPTIONS}
                  value={filter}
                  onChange={(opt) => setFilter(opt?.value || 'all')}
                  isClearable={false}
                  isSearchable={false}
                  size="sm"
                />
              </div>
              <div className="flex-1">
                <StyledSelect
                  options={SORT_OPTIONS}
                  value={sortBy}
                  onChange={(opt) => setSortBy(opt?.value || 'recent')}
                  isClearable={false}
                  isSearchable={false}
                  size="sm"
                />
              </div>
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {conversationsLoading ? (
              <div className="p-3 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <EmptyConversationList onNewConversation={handleNewConversation} />
            ) : (
              filteredConversations.map(conv => (
                <ConversationItem
                  key={conv.id || conv.conversationId}
                  conversation={conv}
                  isSelected={(selectedConversation?.id || selectedConversation?.conversationId) === (conv.id || conv.conversationId)}
                  onClick={() => handleSelectConversation(conv)}
                />
              ))
            )}
          </div>
        </div>

        {/* Center Panel - Chat (50%) */}
        <div className="flex-1 flex flex-col min-w-0" style={{ width: '50%' }}>
          {!selectedConversation ? (
            <EmptyChatPane onNewConversation={handleNewConversation} />
          ) : (
            <>
              {/* Conversation Header */}
              <div
                className="flex items-center justify-between p-3 border-b"
                style={{ borderColor: 'var(--bb-color-border-subtle)' }}
              >
                <div className="flex items-center gap-3">
                  {/* Mobile back button */}
                  <button
                    onClick={() => setShowMobileList(true)}
                    className="lg:hidden p-1.5 text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)] hover:bg-[var(--bb-color-bg-elevated)] rounded"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <Avatar name={selectedConversation.owner ? `${selectedConversation.owner.firstName} ${selectedConversation.owner.lastName}` : 'Unknown'} size="md" />
                  <div>
                    <button
                      onClick={handleViewOwner}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <h3 className="font-semibold text-[color:var(--bb-color-text-primary)]">
                        {selectedConversation.owner ? `${selectedConversation.owner.firstName} ${selectedConversation.owner.lastName}` : 'Unknown User'}
                      </h3>
                      {selectedConversation.isOnline && (
                        <span className="h-2 w-2 bg-green-500 rounded-full" />
                      )}
                    </button>
                    {selectedConversation.pets?.length > 0 && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <PawPrint className="h-3 w-3 text-[color:var(--bb-color-text-muted)]" />
                        <span className="text-xs text-[color:var(--bb-color-text-muted)]">
                          {selectedConversation.pets.map(p => p.name).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>

              {/* Messages Area */}
              <div
                className="flex-1 overflow-y-auto p-4 space-y-2"
                style={{ backgroundColor: 'var(--bb-color-bg-body)' }}
              >
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <LoadingState label="Loading messages..." variant="skeleton" />
                  </div>
                ) : (
                  <>
                    {groupedMessages.map((item, idx) => {
                      if (item.type === 'date') {
                        return <DateDivider key={`date-${idx}`} date={item.date} />;
                      }
                      return (
                        <MessageBubble
                          key={item.message.id || item.message.recordId || `msg-${idx}`}
                          message={item.message}
                          isCurrentUser={item.message.senderId === currentUser?.recordId || item.message.senderType === 'STAFF'}
                          showTimestamp={item.showTimestamp}
                          conversation={selectedConversation}
                        />
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Message Composer */}
              <div
                className="p-3 border-t"
                style={{
                  backgroundColor: 'var(--bb-color-bg-surface)',
                  borderColor: 'var(--bb-color-border-subtle)',
                }}
              >
                <form onSubmit={handleSendMessage}>
                  <div className="flex items-end gap-2">
                    <div className="flex-1 relative">
                      <textarea
                        ref={textareaRef}
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(e);
                          }
                        }}
                        placeholder="Type your message..."
                        rows={1}
                        className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--bb-color-accent)]/50 resize-none"
                        style={{
                          backgroundColor: 'var(--bb-color-bg-elevated)',
                          color: 'var(--bb-color-text-primary)',
                          maxHeight: '120px',
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="p-2 text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)] hover:bg-[var(--bb-color-bg-elevated)] rounded-lg transition-colors"
                        title="Attach file"
                      >
                        <Paperclip className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        className="p-2 text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)] hover:bg-[var(--bb-color-bg-elevated)] rounded-lg transition-colors"
                        title="Emoji"
                      >
                        <Smile className="h-5 w-5" />
                      </button>
                      <Button
                        type="submit"
                        disabled={!messageText.trim() || sendMutation.isPending}
                        className="rounded-xl"
                      >
                        {sendMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className="text-[10px] text-[color:var(--bb-color-text-muted)] mt-1.5 px-1">
                    Press Enter to send, Shift+Enter for new line
                  </p>
                </form>
              </div>
            </>
          )}
        </div>

        {/* Right Panel - Context Sidebar (30%) */}
        <div
          className="w-[30%] min-w-[280px] flex-shrink-0 border-l hidden lg:block"
          style={{
            backgroundColor: 'var(--bb-color-bg-body)',
            borderColor: 'var(--bb-color-border-subtle)',
          }}
        >
          <ContextSidebar
            conversation={selectedConversation}
            onViewOwner={handleViewOwner}
            onViewPet={handleViewPet}
            onScheduleBooking={handleScheduleBooking}
          />
        </div>
      </div>
    </div>
  );
};

export default Messages;
