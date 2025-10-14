import { useEffect, useMemo, useState } from 'react';
import { Page, SectionCard, SkeletonBlock } from '@/components/primitives';
import { cn } from '@/lib/cn';
import useOwner from '@/hooks/useOwner';
import usePet from '@/hooks/usePet';
import OwnerDetails from './sections/OwnerDetails';
import PetDetails from './sections/PetDetails';

const DOMAIN_HOOKS = {
  owner: useOwner,
  pet: usePet,
};

const RENDERERS = {
  owner: OwnerDetails,
  pet: PetDetails,
};

function renderSectionContent(section, record) {
  if (!section) return null;

  if (section.render) {
    return section.render(record);
  }

  if (typeof section.children === 'function') {
    return section.children(record);
  }

  return section.children ?? section.content ?? null;
}

function makeTitle(objectType, record) {
  if (!record) return 'Loading…';
  switch (objectType) {
    case 'owner':
      return [record.firstName, record.lastName].filter(Boolean).join(' ') || 'Owner';
    case 'pet':
      return record.name || 'Pet';
    default:
      return 'Record';
  }
}

function makeSubtitle(objectType, record) {
  if (!record) return null;
  switch (objectType) {
    case 'owner':
      return record.email || record.phone || null;
    case 'pet':
      return record.breed || record.species || null;
    default:
      return null;
  }
}

function useDomainFetch(objectType, recordId, shouldFetch) {
  const hook = DOMAIN_HOOKS[objectType];
  if (!hook) {
    return {
      data: undefined,
      isLoading: false,
      error: objectType ? new Error(`Unsupported record type "${objectType}"`) : null,
    };
  }

  const query = hook(recordId, { enabled: shouldFetch && Boolean(recordId) });
  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
}

export default function RecordDetailsView({
  objectType,
  recordId,
  data,
  fetchOnMount = true,
  title,
  subtitle,
  actions,
  breadcrumbs,
  toolbar,
  sections = [],
  summaryTitle = 'Summary',
  summaryDescription,
  summaryProps,
  asideSections = [],
  tabs = [],
}) {
  const shouldFetch = fetchOnMount && !data;
  const query = useDomainFetch(objectType, recordId, shouldFetch);

  if (query.error) {
    throw query.error;
  }

  const finalData = useMemo(() => data ?? query.data, [data, query.data]);
  const Section = RENDERERS[objectType];
  const hasAside = asideSections?.length > 0;

  const [activeTabId, setActiveTabId] = useState(() => tabs?.[0]?.recordId ?? null);

  useEffect(() => {
    if (!tabs?.length) {
      setActiveTabId(null);
      return;
    }

    if (!tabs.some((tab) => tab.recordId === activeTabId)) {
      setActiveTabId(tabs[0].recordId);
    }
  }, [tabs, activeTabId]);

  const activeTab = tabs?.find((tab) => tab.recordId === activeTabId) ?? (tabs?.length ? tabs[0] : null);

  if (!finalData && query.isLoading) {
    return (
      <Page title={title ?? makeTitle(objectType, finalData)} breadcrumbs={breadcrumbs}>
        <div className="py-8">
          <SkeletonBlock variant="details" />
        </div>
      </Page>
    );
  }

  if (!Section) {
    return (
      <Page title="Unsupported record" breadcrumbs={breadcrumbs}>
        <SectionCard title="Details">
          <p className="text-sm text-muted">
            No renderer registered for type <code>{objectType}</code>.
          </p>
        </SectionCard>
      </Page>
    );
  }

  const summaryNode = Section ? <Section data={finalData} {...summaryProps} /> : null;

  return (
    <Page
      title={title ?? makeTitle(objectType, finalData)}
      subtitle={subtitle ?? makeSubtitle(objectType, finalData)}
      actions={actions}
      toolbar={toolbar}
      breadcrumbs={breadcrumbs}
    >
      {tabs?.length > 0 && (
        <div className="border-b border-border">
          <nav className="flex gap-6 overflow-x-auto px-1">
            {tabs.map((tab) => (
              <button
                key={tab.recordId}
                onClick={() => setActiveTabId(tab.recordId)}
                className={cn(
                  'relative pb-3 pt-4 text-sm font-medium transition-colors',
                  activeTab?.recordId === tab.recordId
                    ? 'text-primary'
                    : 'text-muted hover:text-text',
                )}
              >
                {tab.label}
                {activeTab?.recordId === tab.recordId && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />
                )}
              </button>
            ))}
          </nav>
        </div>
      )}

      <div
        className={cn(
          'grid gap-6',
          hasAside ? 'lg:grid-cols-[minmax(0,1fr)_320px]' : '',
        )}
      >
        <div className="space-y-6">
          {summaryNode && (
            <SectionCard
              title={summaryTitle}
              description={summaryDescription}
              variant="spacious"
            >
              {summaryNode}
            </SectionCard>
          )}

          {activeTab && (
            <div className="space-y-6">
              {renderSectionContent(activeTab, finalData)}
            </div>
          )}

          {sections.map((section) => (
            <SectionCard
              key={section.recordId ?? section.title}
              title={section.title}
              description={section.description}
              header={
                typeof section.header === 'function'
                  ? section.header(finalData)
                  : section.header
              }
              footer={
                typeof section.footer === 'function'
                  ? section.footer(finalData)
                  : section.footer
              }
              variant={section.variant}
              className={section.className}
            >
              {renderSectionContent(section, finalData)}
            </SectionCard>
          ))}
        </div>

        {hasAside && (
          <div className="space-y-6">
            {asideSections.map((section) => (
              <SectionCard
                key={section.recordId ?? section.title}
                title={section.title}
                description={section.description}
                header={
                  typeof section.header === 'function'
                    ? section.header(finalData)
                    : section.header
                }
                footer={
                  typeof section.footer === 'function'
                    ? section.footer(finalData)
                    : section.footer
                }
                variant={section.variant ?? 'compact'}
                className={section.className}
              >
                {renderSectionContent(section, finalData)}
              </SectionCard>
            ))}
          </div>
        )}
      </div>
    </Page>
  );
}
