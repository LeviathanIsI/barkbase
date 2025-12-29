import { useState } from 'react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import SettingsPage from '../../components/SettingsPage';
import { Calendar, Clock, Users, Wrench, Plus, Edit, Trash2 } from 'lucide-react';
import { useTimezoneUtils } from '@/lib/timezone';

const Schedules = () => {
  const tz = useTimezoneUtils();
  const [trainingSchedules, setTrainingSchedules] = useState([
    { recordId: 1, title: 'New Employee Orientation', frequency: 'As needed', duration: '4 hours', nextDue: '2025-10-20', assignedTo: 'All new hires' },
    { recordId: 2, title: 'Pet First Aid Certification', frequency: 'Annual', duration: '6 hours', nextDue: '2025-11-15', assignedTo: 'All staff' },
    { recordId: 3, title: 'Emergency Procedures Review', frequency: 'Quarterly', duration: '1 hour', nextDue: '2025-12-01', assignedTo: 'All staff' },
  ]);

  const [maintenanceSchedules, setMaintenanceSchedules] = useState([
    { recordId: 1, task: 'Deep Clean Kennels', frequency: 'Weekly', lastCompleted: '2025-10-06', nextDue: '2025-10-13', assignedTo: 'Cleaning crew' },
    { recordId: 2, task: 'HVAC System Inspection', frequency: 'Monthly', lastCompleted: '2025-09-15', nextDue: '2025-10-15', assignedTo: 'Maintenance team' },
    { recordId: 3, task: 'Fire Safety Equipment Check', frequency: 'Monthly', lastCompleted: '2025-09-30', nextDue: '2025-10-30', assignedTo: 'Safety officer' },
    { recordId: 4, task: 'Playground Equipment Inspection', frequency: 'Weekly', lastCompleted: '2025-10-08', nextDue: '2025-10-15', assignedTo: 'Staff supervisor' },
  ]);

  const [cleaningRoutines, setCleaningRoutines] = useState([
    { recordId: 1, routine: 'Kennel Sanitization', frequency: 'After each checkout', estimatedTime: '15 min', supplies: ['Disinfectant', 'Paper towels', 'Mop'] },
    { recordId: 2, routine: 'Common Area Cleaning', frequency: 'Twice daily', estimatedTime: '30 min', supplies: ['All-purpose cleaner', 'Vacuum', 'Mop'] },
    { recordId: 3, routine: 'Food Prep Area Sanitization', frequency: 'After each meal prep', estimatedTime: '10 min', supplies: ['Food-safe sanitizer', 'Clean cloths'] },
  ]);

  const getStatusBadge = (nextDue) => {
    const dueDate = new Date(nextDue);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) return <Badge variant="error" size="sm">Overdue</Badge>;
    if (daysUntilDue <= 3) return <Badge variant="warning" size="sm">Due Soon</Badge>;
    if (daysUntilDue <= 7) return <Badge variant="info" size="sm">Upcoming</Badge>;
    return <Badge variant="success" size="sm">Scheduled</Badge>;
  };

  return (
    <SettingsPage 
      title="Training & Schedules" 
      description="Manage staff training programs, facility maintenance, and cleaning schedules"
    >
      <Card 
        title="Staff Training Programs" 
        description="Schedule and track mandatory training for all staff members."
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-muted" />
              <span className="text-sm font-medium">{trainingSchedules.length} training programs</span>
            </div>
            <Button size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Training
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[700px]">
              <thead className="bg-surface/50">
                <tr className="text-left text-xs font-medium text-muted uppercase tracking-wide">
                  <th className="px-4 py-3">Training Program</th>
                  <th className="px-4 py-3">Frequency</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Next Due</th>
                  <th className="px-4 py-3">Assigned To</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {trainingSchedules.map((training) => (
                  <tr key={training.recordId} className="hover:bg-surface/30">
                    <td className="px-4 py-3 font-medium text-text">{training.title}</td>
                    <td className="px-4 py-3 text-sm text-muted">{training.frequency}</td>
                    <td className="px-4 py-3 text-sm text-muted">{training.duration}</td>
                    <td className="px-4 py-3 text-sm">{tz.formatShortDate(training.nextDue)}</td>
                    <td className="px-4 py-3 text-sm text-muted">{training.assignedTo}</td>
                    <td className="px-4 py-3">{getStatusBadge(training.nextDue)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost">
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <Card 
        title="Facility Maintenance Schedule" 
        description="Track routine maintenance tasks to keep your facility in top condition."
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-muted" />
              <span className="text-sm font-medium">{maintenanceSchedules.length} maintenance tasks</span>
            </div>
            <Button size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[700px]">
              <thead className="bg-surface/50">
                <tr className="text-left text-xs font-medium text-muted uppercase tracking-wide">
                  <th className="px-4 py-3">Maintenance Task</th>
                  <th className="px-4 py-3">Frequency</th>
                  <th className="px-4 py-3">Last Completed</th>
                  <th className="px-4 py-3">Next Due</th>
                  <th className="px-4 py-3">Assigned To</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {maintenanceSchedules.map((task) => (
                  <tr key={task.recordId} className="hover:bg-surface/30">
                    <td className="px-4 py-3 font-medium text-text">{task.task}</td>
                    <td className="px-4 py-3 text-sm text-muted">{task.frequency}</td>
                    <td className="px-4 py-3 text-sm">{tz.formatShortDate(task.lastCompleted)}</td>
                    <td className="px-4 py-3 text-sm">{tz.formatShortDate(task.nextDue)}</td>
                    <td className="px-4 py-3 text-sm text-muted">{task.assignedTo}</td>
                    <td className="px-4 py-3">{getStatusBadge(task.nextDue)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost">
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <Card 
        title="Cleaning & Sanitization Routines" 
        description="Standardize cleaning procedures to maintain health and safety standards."
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted" />
              <span className="text-sm font-medium">{cleaningRoutines.length} cleaning routines</span>
            </div>
            <Button size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Routine
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cleaningRoutines.map((routine) => (
              <div key={routine.recordId} className="rounded-lg border border-border bg-surface/30 p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-text">{routine.routine}</h4>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost">
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 text-xs text-muted">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <span>{routine.frequency} • {routine.estimatedTime}</span>
                  </div>
                  <div>
                    <span className="font-medium">Supplies needed:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {routine.supplies.map((supply, index) => (
                        <Badge key={index} variant="outline" size="sm">{supply}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card 
        title="Schedule Templates" 
        description="Create reusable schedule templates for different types of facilities."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="font-medium text-text mb-3">Quick Templates</h4>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                Small Kennel (1-20 dogs)
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                Medium Facility (21-50 dogs)
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                Large Facility (50+ dogs)
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                Daycare Only
              </Button>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-text mb-3">Custom Schedule Builder</h4>
            <p className="text-sm text-muted mb-4">
              Create custom maintenance and training schedules based on your facility's specific needs.
            </p>
            <Button>Build Custom Schedule</Button>
          </div>
        </div>
      </Card>
    </SettingsPage>
  );
};

export default Schedules;

