import { BookOpen, Plus } from 'lucide-react';
import PlaceholderPage from '@/components/shared/PlaceholderPage';

const KnowledgeBase = () => {
  return (
    <PlaceholderPage
      title="Knowledge Base (Help Center)"
      breadcrumbs={[
        { label: 'Home', to: '/dashboard' },
        { label: 'Support' },
        { label: 'Knowledge Base' },
      ]}
      description="Build a help center with FAQs, guides, and documentation for your team and customers. Create articles, organize by category, and enable search."
      illustration={BookOpen}
      primaryCTA={{
        label: 'Add Article',
        icon: Plus,
        disabled: true,
        onClick: () => {},
      }}
      badge={{ label: 'Coming Soon', variant: 'secondary' }}
      pageName="knowledge-base"
    />
  );
};

export default KnowledgeBase;
