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
  Smartphone,
  AtSign,
  Hash,
  Zap,
  AlertCircle,
  Reply,
  ChevronDown,
  Sparkles,
  X,
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

// Channel types and their config
const CHANNEL_CONFIG = {
  sms: {
    icon: Smartphone,
    label: 'SMS',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    maxChars: 160,
  },
  email: {
    icon: Mail,
    label: 'Email',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    maxChars: null,
  },
  app: {
    icon: MessageCircle,
    label: 'In-App',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    maxChars: null,
  },
};

// Quick reply templates
const QUICK_TEMPLATES = [
  { id: 'confirm', label: 'Booking Confirmed', preview: 'Your booking has been confirmed for...' },
  { id: 'reminder', label: 'Appointment Reminder', preview: 'This is a friendly reminder about...' },
  { id: 'checkin', label: 'Check-in Instructions', preview: 'Here are your check-in instructions...' },
  { id: 'thankyou', label: 'Thank You', preview: 'Thank you for choosing us! We hope...' },
];

// Filter options
const FILTER_OPTIONS = [
  { value: 'all', label: 'All Messages' },
  { value: 'unread', label: 'Unread' },
  { value: 'needs-action', label: 'Needs Reply' },
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

// Avatar component with online status
const Avatar = ({ name, size = 'md', className, isOnline, channel }) => {
  const sizeClasses = {
    sm: 'h-9 w-9 text-xs',
    md: 'h-11 w-11 text-sm',
    lg: 'h-14 w-14 text-base',
  };

  const colors = [
    'bg-gradient-to-br from-blue-500 to-blue-600',
    'bg-gradient-to-br from-emerald-500 to-emerald-600',
    'bg-gradient-to-br from-purple-500 to-purple-600',
    'bg-gradient-to-br from-amber-500 to-amber-600',
    'bg-gradient-to-br from-pink-500 to-pink-600',
    'bg-gradient-to-br from-cyan-500 to-cyan-600',
    'bg-gradient-to-br from-indigo-500 to-indigo-600',
    'bg-gradient-to-br from-rose-500 to-rose-600',
  ];

  const colorIndex = name ? name.charCodeAt(0) % colors.length : 0;
  const ChannelIcon = channel ? CHANNEL_CONFIG[channel]?.icon : null;

  return (
    <div className="relative flex-shrink-0">
      <div className={cn(
        'rounded-full flex items-center justify-center text-white font-medium shadow-sm',
        sizeClasses[size],
        colors[colorIndex],
        className
      )}>
        {getInitials(name)}
      </div>
      {isOnline && (
        <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-[var(--bb-color-bg-surface)]" />
      )}
      {ChannelIcon && !isOnline && (
        <div className={cn(
          'absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full flex items-center justify-center border-2 border-white dark:border-[var(--bb-color-bg-surface)]',
          CHANNEL_CONFIG[channel].bg
        )}>
          <ChannelIcon className={cn('h-2.5 w-2.5', CHANNEL_CONFIG[channel].color)} />
        </div>
      )}
    </div>
  );
};

// Enhanced Stats Bar Component
const StatsBar = ({ conversations }) => {
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const total = conversations?.length || 0;
    const unread = conversations?.reduce((sum, c) => sum + (c.unreadCount || 0), 0) || 0;
    const needsReply = conversations?.filter(c => c.needsReply)?.length || 0;
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
      variant: 'default',
    },
    {
      label: 'Unread',
      value: stats.unread,
      icon: Inbox,
      variant: stats.unread > 0 ? 'danger' : 'default',
      urgent: stats.unread > 0,
    },
    {
      label: 'Needs Reply',
      value: stats.needsReply,
      icon: Reply,
      variant: stats.needsReply > 0 ? 'warning' : 'default',
      urgent: stats.needsReply > 0,
    },
    {
      label: 'Sent Today',
      value: stats.sentToday,
      icon: SendIcon,
      variant: 'success',
    },
  ];

  const variantStyles = {
    default: {
      bg: 'bg-[color:var(--bb-color-bg-surface)]',
      iconBg: 'bg-[color:var(--bb-color-accent-soft)]',
      iconColor: 'text-[color:var(--bb-color-accent)]',
      border: 'border-[color:var(--bb-color-border-subtle)]',
    },
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/20',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800/50',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-950/20',
      iconBg: 'bg-amber-100 dark:bg-amber-900/40',
      iconColor: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800/50',
      glow: 'shadow-[0_0_15px_rgba(245,158,11,0.2)]',
    },
    danger: {
      bg: 'bg-red-50 dark:bg-red-950/20',
      iconBg: 'bg-red-100 dark:bg-red-900/40',
      iconColor: 'text-red-600 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800/50',
      glow: 'shadow-[0_0_15px_rgba(239,68,68,0.2)]',
    },
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      {statItems.map((stat, idx) => {
        const styles = variantStyles[stat.variant];
        return (
          <div
            key={idx}
            className={cn(
              'relative rounded-xl border p-4 transition-all',
              styles.bg,
              styles.border,
              stat.urgent && styles.glow
            )}
          >
            {/* Urgent pulse indicator */}
            {stat.urgent && stat.value > 0 && (
              <div className="absolute -top-1.5 -right-1.5 h-4 w-4">
                <span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-75 animate-ping" style={{ color: stat.variant === 'danger' ? '#ef4444' : '#f59e0b' }} />
                <span className="relative inline-flex rounded-full h-4 w-4 items-center justify-center" style={{ backgroundColor: stat.variant === 'danger' ? '#ef4444' : '#f59e0b' }}>
                  <span className="text-[8px] font-bold text-white">!</span>
                </span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', styles.iconBg)}>
                <stat.icon className={cn('h-5 w-5', styles.iconColor)} />
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
        );
      })}
    </div>
  );
};

// Enhanced Conversation Item
const ConversationItem = ({ conversation, isSelected, onClick }) => {
  const hasUnread = conversation.unreadCount > 0;
  const needsReply = conversation.needsReply;
  const ownerName = conversation.owner
    ? `${conversation.owner.firstName} ${conversation.owner.lastName}`
    : conversation.otherUser?.name || 'Unknown';
  const channel = conversation.channel || 'app';
  const channelConfig = CHANNEL_CONFIG[channel];

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 p-3 text-left transition-all relative',
        isSelected
          ? 'bg-[var(--bb-color-accent-soft)]'
          : 'hover:bg-[var(--bb-color-bg-elevated)]'
      )}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-[var(--bb-color-accent)]" />
      )}

      {/* Avatar */}
      <Avatar
        name={ownerName}
        size="sm"
        channel={channel}
        isOnline={conversation.isOnline}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className={cn(
            'font-medium truncate text-sm',
            hasUnread && 'text-[color:var(--bb-color-text-primary)] font-semibold'
          )}>
            {ownerName}
          </span>
          <span className="text-[10px] text-[color:var(--bb-color-text-muted)] flex-shrink-0">
            {formatConversationTime(conversation.lastMessage?.createdAt)}
          </span>
        </div>

        {/* Pet names if available */}
        {conversation.pets?.length > 0 && (
          <div className="flex items-center gap-1 mb-1">
            <PawPrint className="h-2.5 w-2.5 text-[color:var(--bb-color-text-muted)]" />
            <span className="text-[10px] text-[color:var(--bb-color-text-muted)] truncate">
              {conversation.pets.map(p => p.name).join(', ')}
            </span>
          </div>
        )}

        {/* Last message preview */}
        <p className={cn(
          'text-xs truncate',
          hasUnread ? 'text-[color:var(--bb-color-text-primary)] font-medium' : 'text-[color:var(--bb-color-text-muted)]'
        )}>
          {conversation.lastMessage?.senderType === 'STAFF' && (
            <span className="text-[color:var(--bb-color-text-muted)]">You: </span>
          )}
          {conversation.lastMessage?.content || 'No messages yet'}
        </p>

        {/* Status badges */}
        <div className="flex items-center gap-1.5 mt-1.5">
          {hasUnread && (
            <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-[var(--bb-color-accent)] text-white text-[10px] font-bold">
              {conversation.unreadCount}
            </span>
          )}
          {needsReply && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-medium">
              <Reply className="h-2.5 w-2.5" />
              Reply
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

// Enhanced Message Bubble
const MessageBubble = ({ message, isCurrentUser, showTimestamp, conversation }) => {
  const senderName = isCurrentUser
    ? (message.staffName || 'You')
    : (conversation?.owner ? `${conversation.owner.firstName}` : 'Customer');
  const channel = message.channel || 'app';
  const channelConfig = CHANNEL_CONFIG[channel];
  const ChannelIcon = channelConfig?.icon;

  return (
    <div className={cn('flex gap-2', isCurrentUser ? 'justify-end' : 'justify-start')}>
      {!isCurrentUser && (
        <Avatar name={senderName} size="sm" className="mt-1" />
      )}
      <div className={cn('max-w-[70%] flex flex-col', isCurrentUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'relative rounded-2xl px-4 py-2.5',
            isCurrentUser
              ? 'bg-gradient-to-br from-[var(--bb-color-accent)] to-[color:hsl(from_var(--bb-color-accent)_h_s_calc(l_-_10%))] text-white rounded-br-md shadow-sm'
              : 'bg-[var(--bb-color-bg-elevated)] text-[color:var(--bb-color-text-primary)] rounded-bl-md border border-[color:var(--bb-color-border-subtle)]'
          )}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        </div>
        {showTimestamp && (
          <div className={cn(
            'flex items-center gap-1.5 mt-1 px-1',
            isCurrentUser ? 'justify-end' : 'justify-start'
          )}>
            {ChannelIcon && (
              <ChannelIcon className={cn('h-3 w-3', channelConfig.color)} />
            )}
            <span className="text-[10px] text-[color:var(--bb-color-text-muted)]">
              {formatMessageTime(message.createdAt)}
            </span>
            {isCurrentUser && (
              message.status === 'delivered' ? (
                <CheckCheck className="h-3 w-3 text-emerald-500" />
              ) : message.status === 'sent' ? (
                <Check className="h-3 w-3 text-[color:var(--bb-color-text-muted)]" />
              ) : (
                <Clock className="h-3 w-3 text-[color:var(--bb-color-text-muted)]" />
              )
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
  else label = format(date, 'EEEE, MMMM d');

  return (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[color:var(--bb-color-border-subtle)] to-transparent" />
      <span className="text-xs text-[color:var(--bb-color-text-muted)] font-medium px-3 py-1 rounded-full bg-[color:var(--bb-color-bg-elevated)]">
        {label}
      </span>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[color:var(--bb-color-border-subtle)] to-transparent" />
    </div>
  );
};

// Template Picker Component
const TemplatePicker = ({ onSelect, onClose }) => {
  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 p-2 rounded-xl border shadow-lg bg-[color:var(--bb-color-bg-elevated)] border-[color:var(--bb-color-border-subtle)]">
      <div className="flex items-center justify-between mb-2 px-2">
        <span className="text-xs font-semibold text-[color:var(--bb-color-text-primary)]">Quick Templates</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-[color:var(--bb-color-bg-surface)]">
          <X className="h-3.5 w-3.5 text-[color:var(--bb-color-text-muted)]" />
        </button>
      </div>
      <div className="space-y-1">
        {QUICK_TEMPLATES.map(template => (
          <button
            key={template.id}
            onClick={() => onSelect(template)}
            className="w-full flex items-start gap-3 p-2 rounded-lg text-left hover:bg-[color:var(--bb-color-bg-surface)] transition-colors"
          >
            <div className="h-8 w-8 rounded-lg bg-[color:var(--bb-color-accent-soft)] flex items-center justify-center flex-shrink-0">
              <FileText className="h-4 w-4 text-[color:var(--bb-color-accent)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">{template.label}</p>
              <p className="text-xs text-[color:var(--bb-color-text-muted)] truncate">{template.preview}</p>
            </div>
          </button>
        ))}
      </div>
      <div className="mt-2 pt-2 border-t border-[color:var(--bb-color-border-subtle)]">
        <button
          onClick={() => toast.info('Templates library coming soon')}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs text-[color:var(--bb-color-accent)] hover:underline"
        >
          <Sparkles className="h-3.5 w-3.5" />
          View All Templates
        </button>
      </div>
    </div>
  );
};

// Enhanced Context Sidebar Component
const ContextSidebar = ({ conversation, onViewOwner, onViewPet, onScheduleBooking }) => {
  if (!conversation) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[color:var(--bb-color-accent)]/20 to-purple-500/20 blur-xl scale-150" />
          <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-[color:var(--bb-color-bg-elevated)] to-[color:var(--bb-color-bg-surface)] flex items-center justify-center border border-[color:var(--bb-color-border-subtle)]">
            <User className="h-10 w-10 text-[color:var(--bb-color-text-muted)]" />
          </div>
        </div>
        <h3 className="text-base font-semibold text-[color:var(--bb-color-text-primary)] mb-2">
          Contact Details
        </h3>
        <p className="text-sm text-[color:var(--bb-color-text-muted)] max-w-[200px]">
          Select a conversation to view owner info, pets, and quick actions
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
  const channel = conversation.channel || 'app';
  const channelConfig = CHANNEL_CONFIG[channel];

  return (
    <div className="h-full overflow-y-auto">
      {/* Contact Header */}
      <div className="p-4 border-b border-[color:var(--bb-color-border-subtle)]">
        <div className="flex flex-col items-center text-center">
          <Avatar name={owner?.name} size="lg" isOnline={conversation.isOnline} />
          <h3 className="mt-3 font-semibold text-[color:var(--bb-color-text-primary)]">
            {owner?.name || 'Unknown'}
          </h3>
          {owner?.email && (
            <p className="text-xs text-[color:var(--bb-color-text-muted)] truncate max-w-full">
              {owner.email}
            </p>
          )}
          {/* Channel badge */}
          <div className={cn(
            'mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
            channelConfig.bg, channelConfig.color
          )}>
            <channelConfig.icon className="h-3 w-3" />
            {channelConfig.label}
          </div>
        </div>

        {/* Contact Actions */}
        <div className="flex gap-2 mt-4">
          {owner?.phone && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => window.open(`tel:${owner.phone}`)}
            >
              <Phone className="h-3.5 w-3.5" />
            </Button>
          )}
          {owner?.email && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => window.open(`mailto:${owner.email}`)}
            >
              <Mail className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onViewOwner}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Cards */}
      <div className="p-4 space-y-4">
        {/* Their Pets Card */}
        {pets.length > 0 && (
          <div className="rounded-xl border p-4 bg-[color:var(--bb-color-bg-surface)] border-[color:var(--bb-color-border-subtle)]">
            <h4 className="text-xs font-semibold text-[color:var(--bb-color-text-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
              <PawPrint className="h-3.5 w-3.5" />
              Their Pets ({pets.length})
            </h4>
            <div className="space-y-2">
              {pets.map((pet, idx) => (
                <button
                  key={pet.recordId || idx}
                  onClick={() => onViewPet(pet)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-[var(--bb-color-bg-elevated)] group"
                >
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                    <PawPrint className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)] truncate group-hover:text-[color:var(--bb-color-accent)]">
                      {pet.name}
                    </p>
                    <p className="text-xs text-[color:var(--bb-color-text-muted)] truncate">
                      {pet.breed || pet.species || 'Pet'}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[color:var(--bb-color-text-muted)] group-hover:text-[color:var(--bb-color-accent)]" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Activity Summary */}
        <div className="rounded-xl border p-4 bg-[color:var(--bb-color-bg-surface)] border-[color:var(--bb-color-border-subtle)]">
          <h4 className="text-xs font-semibold text-[color:var(--bb-color-text-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5" />
            Activity
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-[color:var(--bb-color-bg-elevated)]">
              <p className="text-lg font-bold text-[color:var(--bb-color-text-primary)]">
                {conversation.upcomingBookings || 0}
              </p>
              <p className="text-xs text-[color:var(--bb-color-text-muted)]">Upcoming</p>
            </div>
            <div className="p-3 rounded-lg bg-[color:var(--bb-color-bg-elevated)]">
              <p className="text-lg font-bold text-[color:var(--bb-color-text-primary)]">
                {conversation.totalBookings || 0}
              </p>
              <p className="text-xs text-[color:var(--bb-color-text-muted)]">Total Visits</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[color:var(--bb-color-border-subtle)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[color:var(--bb-color-text-muted)]">Last Visit</span>
              <span className="text-xs font-medium text-[color:var(--bb-color-text-primary)]">
                {conversation.lastBookingDate || 'Never'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[color:var(--bb-color-text-muted)]">Status</span>
              <Badge
                variant={conversation.accountStatus === 'Active' ? 'success' : 'warning'}
                size="sm"
              >
                {conversation.accountStatus || 'Active'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <Button
            variant="primary"
            size="sm"
            className="w-full"
            onClick={onScheduleBooking}
          >
            <Calendar className="h-3.5 w-3.5 mr-2" />
            Schedule Booking
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => toast.info('Send reminder coming soon')}
          >
            <Bell className="h-3.5 w-3.5 mr-2" />
            Send Reminder
          </Button>
        </div>
      </div>
    </div>
  );
};

// Enhanced Empty State Components
const EmptyConversationList = ({ onNewConversation }) => (
  <div className="flex flex-col items-center justify-center h-full py-12 px-6">
    <div className="relative mb-6">
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[color:var(--bb-color-accent)]/20 to-purple-500/20 blur-xl scale-150 animate-pulse" />
      <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-[color:var(--bb-color-accent)] to-purple-600 flex items-center justify-center shadow-lg shadow-[color:var(--bb-color-accent)]/30">
        <MessageSquare className="h-10 w-10 text-white" />
      </div>
    </div>
    <h3 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)] mb-2">
      Your inbox is ready
    </h3>
    <p className="text-sm text-[color:var(--bb-color-text-muted)] text-center mb-6 max-w-[220px]">
      Start connecting with pet owners. Conversations will appear here.
    </p>
    <Button size="sm" onClick={onNewConversation}>
      <Plus className="h-4 w-4 mr-1.5" />
      Start Conversation
    </Button>
  </div>
);

const EmptyChatPane = ({ onNewConversation }) => (
  <div className="flex flex-col items-center justify-center h-full px-6 bg-gradient-to-b from-[color:var(--bb-color-bg-body)] to-transparent">
    <div className="relative mb-8 h-24 w-24">
      {/* Animated rings - contained within parent */}
      <div className="absolute inset-[-12px] rounded-full border-2 border-dashed border-[color:var(--bb-color-accent)]/20 animate-[spin_30s_linear_infinite]" />
      <div className="absolute inset-[-24px] rounded-full border-2 border-dashed border-[color:var(--bb-color-accent)]/10 animate-[spin_20s_linear_infinite_reverse]" />

      {/* Main icon */}
      <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-[color:var(--bb-color-accent)]/10 to-purple-500/10 flex items-center justify-center">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[color:var(--bb-color-accent)] to-purple-600 flex items-center justify-center shadow-lg shadow-[color:var(--bb-color-accent)]/20">
          <Send className="h-7 w-7 text-white transform rotate-[-20deg]" />
        </div>
      </div>
    </div>

    <h3 className="text-xl font-semibold text-[color:var(--bb-color-text-primary)] mb-2">
      Select a conversation
    </h3>
    <p className="text-sm text-[color:var(--bb-color-text-muted)] text-center mb-6 max-w-[300px]">
      Choose a conversation from the list to view messages, or start a new one
    </p>
    <Button variant="outline" onClick={onNewConversation}>
      <Plus className="h-4 w-4 mr-1.5" />
      New Conversation
    </Button>
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
  const [showTemplates, setShowTemplates] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const currentUser = useAuthStore(state => state.user);

  const { data: conversations, isLoading: conversationsLoading, refetch: refetchConversations } = useConversationsQuery();
  const { data: messages, isLoading: messagesLoading, refetch: refetchMessages } = useConversationMessagesQuery(
    selectedConversation?.id || selectedConversation?.conversationId
  );
  const sendMutation = useSendMessageMutation();
  const markReadMutation = useMarkConversationReadMutation();

  // Determine channel and character limit
  const activeChannel = selectedConversation?.channel || 'app';
  const charLimit = CHANNEL_CONFIG[activeChannel]?.maxChars;

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
      default:
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

  const handleTemplateSelect = (template) => {
    setMessageText(template.preview);
    setShowTemplates(false);
    textareaRef.current?.focus();
  };

  const handleNewConversation = () => {
    openSlideout(SLIDEOUT_TYPES.MESSAGE_CREATE);
  };

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

  const handleViewPet = (pet) => {
    if (pet) {
      openSlideout(SLIDEOUT_TYPES.PET_EDIT, {
        pet,
        title: `${pet.name || 'Pet'} Profile`,
      });
    }
  };

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
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[color:var(--bb-color-accent)] to-purple-600 flex items-center justify-center">
              <MessageCircle className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-[color:var(--bb-color-text-primary)]">Messages</h1>
          </div>
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
      <div className="flex-1 flex rounded-xl overflow-hidden border border-[color:var(--bb-color-border-subtle)] shadow-sm">
        {/* Left Panel - Conversation List */}
        <div
          className={cn(
            'w-[280px] flex-shrink-0 flex flex-col bg-[color:var(--bb-color-bg-surface)]',
            'lg:block',
            showMobileList ? 'block absolute inset-0 z-20 lg:relative' : 'hidden'
          )}
        >
          {/* Search & Filters Header */}
          <div className="p-3 space-y-2 border-b border-[color:var(--bb-color-border-subtle)]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--bb-color-accent)]/50 bg-[color:var(--bb-color-bg-elevated)] text-[color:var(--bb-color-text-primary)] border border-[color:var(--bb-color-border-subtle)]"
              />
            </div>

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
          <div className="flex-1 overflow-y-auto divide-y divide-[color:var(--bb-color-border-subtle)]">
            {conversationsLoading ? (
              <div className="p-3 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
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

        {/* Center Panel - Chat */}
        <div className="flex-1 flex flex-col min-w-0 border-x border-[color:var(--bb-color-border-subtle)]">
          {!selectedConversation ? (
            <EmptyChatPane onNewConversation={handleNewConversation} />
          ) : (
            <>
              {/* Conversation Header */}
              <div className="flex items-center justify-between p-3 border-b border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)]">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowMobileList(true)}
                    className="lg:hidden p-1.5 text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)] hover:bg-[var(--bb-color-bg-elevated)] rounded"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <Avatar
                    name={selectedConversation.owner ? `${selectedConversation.owner.firstName} ${selectedConversation.owner.lastName}` : 'Unknown'}
                    size="md"
                    isOnline={selectedConversation.isOnline}
                    channel={selectedConversation.channel}
                  />
                  <div>
                    <button
                      onClick={handleViewOwner}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <h3 className="font-semibold text-[color:var(--bb-color-text-primary)]">
                        {selectedConversation.owner ? `${selectedConversation.owner.firstName} ${selectedConversation.owner.lastName}` : 'Unknown User'}
                      </h3>
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

                <div className="flex items-center gap-1">
                  {/* Channel indicator */}
                  {selectedConversation.channel && (
                    <div className={cn(
                      'flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium mr-2',
                      CHANNEL_CONFIG[selectedConversation.channel]?.bg,
                      CHANNEL_CONFIG[selectedConversation.channel]?.color
                    )}>
                      {(() => {
                        const Icon = CHANNEL_CONFIG[selectedConversation.channel]?.icon;
                        return Icon ? <Icon className="h-3 w-3" /> : null;
                      })()}
                      {CHANNEL_CONFIG[selectedConversation.channel]?.label}
                    </div>
                  )}
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[color:var(--bb-color-bg-body)]">
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
              <div className="p-3 border-t border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)]">
                <form onSubmit={handleSendMessage}>
                  <div className="relative">
                    {showTemplates && (
                      <TemplatePicker
                        onSelect={handleTemplateSelect}
                        onClose={() => setShowTemplates(false)}
                      />
                    )}

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
                          className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--bb-color-accent)]/50 resize-none bg-[color:var(--bb-color-bg-elevated)] text-[color:var(--bb-color-text-primary)] border border-[color:var(--bb-color-border-subtle)]"
                          style={{ maxHeight: '120px' }}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowTemplates(!showTemplates)}
                          className={cn(
                            "p-2 rounded-lg transition-colors",
                            showTemplates
                              ? "bg-[color:var(--bb-color-accent-soft)] text-[color:var(--bb-color-accent)]"
                              : "text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)] hover:bg-[var(--bb-color-bg-elevated)]"
                          )}
                          title="Quick templates"
                        >
                          <Zap className="h-5 w-5" />
                        </button>
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
                  </div>

                  {/* Footer info */}
                  <div className="flex items-center justify-between mt-1.5 px-1">
                    <p className="text-[10px] text-[color:var(--bb-color-text-muted)]">
                      Press Enter to send, Shift+Enter for new line
                    </p>
                    {charLimit && (
                      <p className={cn(
                        'text-[10px] font-medium',
                        messageText.length > charLimit
                          ? 'text-red-500'
                          : messageText.length > charLimit * 0.8
                            ? 'text-amber-500'
                            : 'text-[color:var(--bb-color-text-muted)]'
                      )}>
                        {messageText.length}/{charLimit}
                      </p>
                    )}
                  </div>
                </form>
              </div>
            </>
          )}
        </div>

        {/* Right Panel - Context Sidebar */}
        <div className="w-[300px] flex-shrink-0 hidden lg:block bg-[color:var(--bb-color-bg-body)]">
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
