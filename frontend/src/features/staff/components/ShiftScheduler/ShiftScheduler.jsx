/**
 * ShiftScheduler - Staff shift scheduling component
 * Uses react-big-schedule for drag-and-drop shift management
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Scheduler, SchedulerData, ViewType, DATE_FORMAT } from 'react-big-schedule';
import dayjs from 'dayjs';
import 'react-big-schedule/lib/css/style.css';
import { schedulerConfig, getRoleColor, getStatusColor } from './schedulerConfig';
import './ShiftScheduler.css';

const ShiftScheduler = ({
  staff = [],
  shifts = [],
  onShiftCreate,
  onShiftUpdate,
  onShiftDelete,
  onShiftClick,
  selectedDate = new Date(),
  viewType = ViewType.Week,
  readOnly = false,
}) => {
  const [schedulerData, setSchedulerData] = useState(null);
  const schedulerRef = useRef(null);

  // Initialize scheduler data
  useEffect(() => {
    const newSchedulerData = new SchedulerData(
      dayjs(selectedDate).format(DATE_FORMAT),
      viewType,
      false,
      false,
      {
        // Scheduler configuration
        schedulerWidth: '100%',
        besidesWidth: schedulerConfig.resourceCellWidth,
        schedulerMaxHeight: 600,
        tableHeaderHeight: 40,
        agendaResourceTableWidth: schedulerConfig.resourceCellWidth,
        agendaMaxEventWidth: 100,

        dayStartFrom: schedulerConfig.dayStartFrom,
        dayStopTo: schedulerConfig.dayStopTo,
        minuteStep: schedulerConfig.minuteStep,

        resourceName: schedulerConfig.resourceName,
        taskName: 'Shift',

        eventItemHeight: schedulerConfig.eventItemHeight,
        eventItemLineHeight: schedulerConfig.eventItemLineHeight,

        nonAgendaDayCellHeaderFormat: 'ddd M/D',
        nonAgendaOtherCellHeaderFormat: 'ddd M/D',

        movable: !readOnly && schedulerConfig.movable,
        creatable: !readOnly && schedulerConfig.creatable,
        resizable: !readOnly && schedulerConfig.resizable,

        views: [
          { viewName: 'Day', viewType: ViewType.Day, showAgenda: false, isEventPerspective: false },
          { viewName: 'Week', viewType: ViewType.Week, showAgenda: false, isEventPerspective: false },
        ],
      }
    );

    // Set resources (staff members)
    const resources = staff.map((member) => ({
      id: member.id || member.recordId,
      name: member.name || member.email || 'Staff Member',
      role: member.role || member.title || '',
      avatar: member.avatar,
    }));
    newSchedulerData.setResources(resources);

    // Set events (shifts)
    const events = shifts.map((shift) => ({
      id: shift.id || shift.recordId,
      start: shift.startTime || shift.start,
      end: shift.endTime || shift.end,
      resourceId: shift.staffId || shift.resourceId,
      title: shift.title || shift.role || 'Shift',
      bgColor: shift.bgColor || getRoleColor(shift.role),
      showPopover: true,
      resizable: !readOnly,
      movable: !readOnly,
      // Custom data
      role: shift.role,
      status: shift.status,
      notes: shift.notes,
    }));
    newSchedulerData.setEvents(events);

    setSchedulerData(newSchedulerData);
  }, [staff, shifts, selectedDate, viewType, readOnly]);

  // Handle previous click
  const handlePrevClick = useCallback((schedulerData) => {
    schedulerData.prev();
    setSchedulerData({ ...schedulerData });
  }, []);

  // Handle next click
  const handleNextClick = useCallback((schedulerData) => {
    schedulerData.next();
    setSchedulerData({ ...schedulerData });
  }, []);

  // Handle today click
  const handleTodayClick = useCallback((schedulerData) => {
    schedulerData.setDate(dayjs().format(DATE_FORMAT));
    setSchedulerData({ ...schedulerData });
  }, []);

  // Handle view change
  const handleViewChange = useCallback((schedulerData, view) => {
    schedulerData.setViewType(view.viewType, view.showAgenda, view.isEventPerspective);
    setSchedulerData({ ...schedulerData });
  }, []);

  // Handle select date
  const handleSelectDate = useCallback((schedulerData, date) => {
    schedulerData.setDate(date);
    setSchedulerData({ ...schedulerData });
  }, []);

  // Handle event click
  const handleEventClick = useCallback((schedulerData, event) => {
    if (onShiftClick) {
      onShiftClick(event);
    }
  }, [onShiftClick]);

  // Handle new event (creating a shift)
  const handleNewEvent = useCallback((schedulerData, slotId, slotName, start, end, type, item) => {
    if (readOnly) return;

    if (onShiftCreate) {
      onShiftCreate({
        staffId: slotId,
        staffName: slotName,
        start,
        end,
      });
    }
  }, [onShiftCreate, readOnly]);

  // Handle event move (drag and drop)
  const handleMoveEvent = useCallback((schedulerData, event, slotId, slotName, start, end) => {
    if (readOnly) return;

    if (onShiftUpdate) {
      onShiftUpdate({
        ...event,
        staffId: slotId,
        start,
        end,
      });
    }

    // Update local state
    schedulerData.moveEvent(event, slotId, slotName, start, end);
    setSchedulerData({ ...schedulerData });
  }, [onShiftUpdate, readOnly]);

  // Handle event resize
  const handleResizeEvent = useCallback((schedulerData, event, newStart, newEnd) => {
    if (readOnly) return;

    if (onShiftUpdate) {
      onShiftUpdate({
        ...event,
        start: newStart,
        end: newEnd,
      });
    }

    // Update local state
    schedulerData.updateEventEnd(event, newEnd);
    schedulerData.updateEventStart(event, newStart);
    setSchedulerData({ ...schedulerData });
  }, [onShiftUpdate, readOnly]);

  // Custom event item template
  const eventItemTemplateResolver = useCallback((schedulerData, event, bgColor, isStart, isEnd, mustAddCssClass, mustBeHeight, agendaMaxEventWidth) => {
    const backgroundColor = event.bgColor || bgColor;
    const borderRadius = isStart ? (isEnd ? '4px' : '4px 0 0 4px') : (isEnd ? '0 4px 4px 0' : '0');

    return (
      <div
        className={`shift-event ${mustAddCssClass}`}
        style={{
          backgroundColor,
          borderRadius,
          height: mustBeHeight,
          opacity: event.status === 'cancelled' ? 0.5 : 1,
        }}
      >
        <span className="shift-event-title">{event.title}</span>
        {event.role && <span className="shift-event-role">{event.role}</span>}
      </div>
    );
  }, []);

  // Custom slot (resource) template
  const slotItemTemplateResolver = useCallback((schedulerData, slot, slotClickedFunc, width, clsName) => {
    return (
      <div
        className={`staff-slot ${clsName}`}
        style={{ width }}
        onClick={() => slotClickedFunc && slotClickedFunc(schedulerData, slot)}
      >
        <div className="staff-slot-avatar">
          {slot.avatar ? (
            <img src={slot.avatar} alt={slot.name} />
          ) : (
            <span>{slot.name?.charAt(0)?.toUpperCase() || '?'}</span>
          )}
        </div>
        <div className="staff-slot-info">
          <div className="staff-slot-name">{slot.name}</div>
          {slot.role && <div className="staff-slot-role">{slot.role}</div>}
        </div>
      </div>
    );
  }, []);

  if (!schedulerData) {
    return (
      <div className="shift-scheduler-loading">
        <div className="animate-pulse">Loading scheduler...</div>
      </div>
    );
  }

  return (
    <div className="shift-scheduler" ref={schedulerRef}>
      <Scheduler
        schedulerData={schedulerData}
        prevClick={handlePrevClick}
        nextClick={handleNextClick}
        onSelectDate={handleSelectDate}
        onViewChange={handleViewChange}
        eventItemClick={handleEventClick}
        newEvent={handleNewEvent}
        moveEvent={handleMoveEvent}
        updateEventEnd={handleResizeEvent}
        eventItemTemplateResolver={eventItemTemplateResolver}
        slotItemTemplateResolver={slotItemTemplateResolver}
        toggleExpandFunc={() => {}}
      />
    </div>
  );
};

export default ShiftScheduler;
