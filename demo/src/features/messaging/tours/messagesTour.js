/**
 * Messages Page Tour Definition
 *
 * Product tour for the Messages/Inbox page.
 */

export const MESSAGES_TOUR_ID = 'messages-page-v1';

export const messagesTourSteps = [
  {
    element: '[data-tour="messages-header"]',
    popover: {
      title: 'Messages',
      description:
        'Your communication hub for conversations with pet owners. See unread counts and manage all messages.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="messages-new-conversation"]',
    popover: {
      title: 'New Conversation',
      description:
        'Start a new conversation with a pet owner directly from here.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="messages-search"]',
    popover: {
      title: 'Search & Filters',
      description:
        'Search conversations by owner name, pet, or message content. Filter by status and sort by date or name.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="messages-conversation-list"]',
    popover: {
      title: 'Conversation List',
      description:
        'All your conversations appear here. Unread messages show a badge, and conversations needing a reply are highlighted.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="messages-chat-area"]',
    popover: {
      title: 'Chat Area',
      description:
        'Select a conversation to view the full message history. Messages are grouped by date for easy reference.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="messages-help-button"]',
    popover: {
      title: 'Start Page Tour',
      description: 'Click here anytime to replay this guided tour.',
      side: 'bottom',
      align: 'end',
    },
  },
];

export const messagesTourConfig = {
  id: MESSAGES_TOUR_ID,
  steps: messagesTourSteps,
};

export default messagesTourConfig;
