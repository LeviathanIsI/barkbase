import Alert from '@/components/ui/Alert';

/**
 * Error state component for directory views
 * Uses the unified Alert component for consistent styling
 */
const DirectoryErrorState = ({ message = 'Unable to load data.' }) => (
  <Alert variant="danger">
    {message}
  </Alert>
);

export default DirectoryErrorState;
