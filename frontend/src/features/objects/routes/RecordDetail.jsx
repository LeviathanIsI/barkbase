import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import RecordDetailsView from '@/components/RecordDetailsView';

const OBJECT_CONFIGS = {
  owner: {
    singularName: 'Owner',
    basePath: '/owners',
    summaryTitle: 'Owner Summary',
  },
  pet: {
    singularName: 'Pet',
    basePath: '/pets',
    summaryTitle: 'Pet Summary',
  },
};

const RecordDetail = () => {
  const { objectType, recordId } = useParams();
  const navigate = useNavigate();
  const config = OBJECT_CONFIGS[objectType];

  useEffect(() => {
    if (!config) {
      toast.error(`Unknown object type: ${objectType}`);
      navigate('/');
    }
  }, [config, navigate, objectType]);

  if (!config) {
    return null;
  }

  const actions = (
    <div className="flex items-center gap-2">
      <Button size="sm" icon={<Pencil className="h-4 w-4" />} disabled>
        Edit
      </Button>
      <Button size="sm" variant="ghost" icon={<Trash2 className="h-4 w-4" />} disabled>
        Delete
      </Button>
    </div>
  );

  return (
    <RecordDetailsView
      objectType={objectType}
      recordId={recordId}
      actions={actions}
      summaryTitle={config.summaryTitle}
    />
  );
};

export default RecordDetail;
