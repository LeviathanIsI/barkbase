/**
 * Tasks Page Object
 * Handles task management functionality
 */

import { BasePage } from './BasePage.js';

export class TasksPage extends BasePage {
  constructor(page) {
    super(page);

    this.url = '/tasks';

    this.selectors = {
      ...this.selectors,
      // Page elements
      pageTitle: 'h1:has-text("Tasks")',
      tasksCount: '[data-testid="tasks-count"]',

      // Actions
      newTaskButton: 'button:has-text("New Task"), button:has-text("Create Task"), [data-testid="new-task"]',
      filterButton: 'button:has-text("Filter")',

      // Search
      searchInput: 'input[placeholder*="Search"], [data-testid="search-input"]',

      // View toggles
      listView: 'button:has-text("List"), [data-testid="list-view"]',
      kanbanView: 'button:has-text("Kanban"), button:has-text("Board"), [data-testid="kanban-view"]',
      calendarView: 'button:has-text("Calendar"), [data-testid="calendar-view"]',

      // Table/List
      tasksTable: 'table',
      taskRow: 'tbody tr',
      taskCard: '[data-testid="task-card"]',

      // Task details in list
      taskTitle: '[data-testid="task-title"]',
      taskType: '[data-testid="task-type"]',
      taskPriority: '[data-testid="task-priority"]',
      taskStatus: '[data-testid="task-status"]',
      taskAssignee: '[data-testid="task-assignee"]',
      taskDueDate: '[data-testid="task-due-date"]',
      taskPet: '[data-testid="task-pet"]',

      // Status filters
      statusAll: 'button:has-text("All")',
      statusTodo: 'button:has-text("To Do"), button:has-text("Pending")',
      statusInProgress: 'button:has-text("In Progress")',
      statusCompleted: 'button:has-text("Completed")',
      statusOverdue: 'button:has-text("Overdue")',

      // Priority filters
      priorityAll: 'button:has-text("All Priorities")',
      priorityUrgent: 'button:has-text("Urgent")',
      priorityHigh: 'button:has-text("High")',
      priorityMedium: 'button:has-text("Medium")',
      priorityLow: 'button:has-text("Low")',

      // Type filters
      typeAll: 'button:has-text("All Types")',
      typeFeeding: 'button:has-text("Feeding")',
      typeMedication: 'button:has-text("Medication")',
      typeGrooming: 'button:has-text("Grooming")',
      typeExercise: 'button:has-text("Exercise")',
      typeCheckup: 'button:has-text("Checkup")',

      // Assignee filter
      assigneeFilter: 'select[name="assignee"], #assignee',
      myTasksButton: 'button:has-text("My Tasks")',

      // Row actions
      completeButton: 'button:has-text("Complete"), button[aria-label="Complete"]',
      editButton: 'button[aria-label="Edit"], button:has-text("Edit")',
      deleteButton: 'button[aria-label="Delete"], button:has-text("Delete")',
      moreActionsButton: 'button[aria-label="More actions"]',

      // Quick complete checkbox
      quickCompleteCheckbox: 'input[type="checkbox"][data-testid*="complete"]',

      // Create/Edit Task Modal/Slideout
      taskSlideout: '[data-testid="task-slideout"], [data-testid="task-modal"], [role="dialog"]',

      // Task form fields
      titleInput: 'input[name="title"], #title',
      descriptionInput: 'textarea[name="description"], #description',
      typeSelect: 'select[name="type"], #type',
      prioritySelect: 'select[name="priority"], #priority',
      statusSelect: 'select[name="status"], #status',

      // Assignment
      assigneeSelect: 'select[name="assigneeId"], #assigneeId',
      assignToMe: 'button:has-text("Assign to Me")',

      // Scheduling
      dueDateInput: 'input[name="dueDate"], #dueDate, input[type="date"]',
      dueTimeInput: 'input[name="dueTime"], #dueTime, input[type="time"]',
      recurringCheckbox: 'input[type="checkbox"][name="recurring"], #recurring',
      recurringFrequency: 'select[name="frequency"], #frequency',

      // Association
      petSelect: 'select[name="petId"], #petId',
      bookingSelect: 'select[name="bookingId"], #bookingId',

      // Attachments
      attachmentUpload: 'input[type="file"][name="attachment"]',
      attachmentsList: '[data-testid="attachments-list"]',

      // Checklist
      addChecklistButton: 'button:has-text("Add Checklist")',
      checklistItem: '[data-testid="checklist-item"]',
      checklistInput: 'input[placeholder*="checklist"]',

      // Actions in slideout
      saveButton: 'button[type="submit"], button:has-text("Save")',
      saveAndCreateButton: 'button:has-text("Save & Create Another")',
      cancelButton: 'button[type="button"]:has-text("Cancel")',

      // Task detail view
      taskDetail: '[data-testid="task-detail"]',
      taskHeader: '[data-testid="task-header"]',
      taskInfo: '[data-testid="task-info"]',
      taskActivity: '[data-testid="task-activity"]',
      taskComments: '[data-testid="task-comments"]',

      // Comments
      commentInput: 'textarea[placeholder*="comment"]',
      addCommentButton: 'button:has-text("Add Comment")',
      commentsList: '[data-testid="comments-list"]',

      // Kanban board
      kanbanBoard: '[data-testid="kanban-board"]',
      kanbanColumn: '[data-testid="kanban-column"]',
      todoColumn: '[data-testid="column-todo"]',
      inProgressColumn: '[data-testid="column-in-progress"]',
      completedColumn: '[data-testid="column-completed"]',

      // Bulk actions
      bulkActionsBar: '[data-testid="bulk-actions"]',
      bulkCompleteButton: 'button:has-text("Mark as Complete")',
      bulkAssignButton: 'button:has-text("Assign")',
      bulkDeleteButton: 'button:has-text("Delete")',

      // Date range
      todayButton: 'button:has-text("Today")',
      tomorrowButton: 'button:has-text("Tomorrow")',
      thisWeekButton: 'button:has-text("This Week")',

      // Pagination
      pagination: '[data-testid="pagination"]',
    };
  }

  /**
   * Navigate to tasks page
   */
  async goto() {
    await super.goto(this.url);
    await this.waitForTasksLoad();
  }

  /**
   * Wait for tasks page to load
   */
  async waitForTasksLoad() {
    await this.page.locator(this.selectors.pageTitle).waitFor({ state: 'visible' });
    await this.waitForLoadingComplete();
  }

  /**
   * Click new task button
   */
  async clickNewTask() {
    await this.page.locator(this.selectors.newTaskButton).click();
    await this.page.locator(this.selectors.taskSlideout).waitFor({ state: 'visible' });
  }

  /**
   * Fill task form
   */
  async fillTaskForm(taskData) {
    await this.waitForLoadingComplete();

    // Title
    if (taskData.title) {
      const titleInput = this.page.locator(this.selectors.titleInput);
      await titleInput.clear();
      await titleInput.fill(taskData.title);
    }

    // Description
    if (taskData.description) {
      const descriptionInput = this.page.locator(this.selectors.descriptionInput);
      if (await descriptionInput.isVisible()) {
        await descriptionInput.clear();
        await descriptionInput.fill(taskData.description);
      }
    }

    // Type
    if (taskData.type) {
      await this.page.locator(this.selectors.typeSelect).selectOption(taskData.type);
    }

    // Priority
    if (taskData.priority) {
      await this.page.locator(this.selectors.prioritySelect).selectOption(taskData.priority);
    }

    // Status
    if (taskData.status) {
      const statusSelect = this.page.locator(this.selectors.statusSelect);
      if (await statusSelect.isVisible()) {
        await statusSelect.selectOption(taskData.status);
      }
    }

    // Assignee
    if (taskData.assigneeId) {
      const assigneeSelect = this.page.locator(this.selectors.assigneeSelect);
      if (await assigneeSelect.isVisible()) {
        await assigneeSelect.selectOption(taskData.assigneeId);
      }
    }

    // Due date
    if (taskData.dueDate) {
      await this.page.locator(this.selectors.dueDateInput).fill(taskData.dueDate);
    }

    // Due time
    if (taskData.dueTime) {
      const dueTimeInput = this.page.locator(this.selectors.dueTimeInput);
      if (await dueTimeInput.isVisible()) {
        await dueTimeInput.fill(taskData.dueTime);
      }
    }

    // Pet association
    if (taskData.petId) {
      const petSelect = this.page.locator(this.selectors.petSelect);
      if (await petSelect.isVisible()) {
        await petSelect.selectOption(taskData.petId);
      }
    }

    // Booking association
    if (taskData.bookingId) {
      const bookingSelect = this.page.locator(this.selectors.bookingSelect);
      if (await bookingSelect.isVisible()) {
        await bookingSelect.selectOption(taskData.bookingId);
      }
    }

    // Recurring
    if (taskData.recurring !== undefined) {
      await this.setCheckbox(this.selectors.recurringCheckbox, taskData.recurring);

      if (taskData.recurring && taskData.frequency) {
        await this.page.locator(this.selectors.recurringFrequency).selectOption(taskData.frequency);
      }
    }
  }

  /**
   * Save task
   */
  async saveTask() {
    await this.page.locator(this.selectors.saveButton).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Create complete task
   */
  async createTask(taskData) {
    await this.clickNewTask();
    await this.fillTaskForm(taskData);
    await this.saveTask();
  }

  /**
   * Search tasks
   */
  async searchTask(searchTerm) {
    await this.page.locator(this.selectors.searchInput).fill(searchTerm);
    await this.page.waitForTimeout(500);
    await this.waitForLoadingComplete();
  }

  /**
   * Filter by status
   */
  async filterByStatus(status) {
    const statusSelectors = {
      all: this.selectors.statusAll,
      todo: this.selectors.statusTodo,
      'in progress': this.selectors.statusInProgress,
      completed: this.selectors.statusCompleted,
      overdue: this.selectors.statusOverdue,
    };

    await this.page.locator(statusSelectors[status.toLowerCase()]).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Filter by priority
   */
  async filterByPriority(priority) {
    const prioritySelectors = {
      all: this.selectors.priorityAll,
      urgent: this.selectors.priorityUrgent,
      high: this.selectors.priorityHigh,
      medium: this.selectors.priorityMedium,
      low: this.selectors.priorityLow,
    };

    await this.page.locator(prioritySelectors[priority.toLowerCase()]).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Filter by type
   */
  async filterByType(type) {
    const typeSelectors = {
      all: this.selectors.typeAll,
      feeding: this.selectors.typeFeeding,
      medication: this.selectors.typeMedication,
      grooming: this.selectors.typeGrooming,
      exercise: this.selectors.typeExercise,
      checkup: this.selectors.typeCheckup,
    };

    await this.page.locator(typeSelectors[type.toLowerCase()]).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Filter to show only my tasks
   */
  async showMyTasks() {
    await this.page.locator(this.selectors.myTasksButton).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Get task row by title
   */
  async getTaskRow(taskTitle) {
    return this.page.locator(`${this.selectors.taskRow}:has-text("${taskTitle}")`);
  }

  /**
   * Complete task
   */
  async completeTask(taskTitle) {
    const row = await this.getTaskRow(taskTitle);
    await row.locator(this.selectors.completeButton).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Quick complete task via checkbox
   */
  async quickCompleteTask(taskTitle) {
    const row = await this.getTaskRow(taskTitle);
    await row.locator(this.selectors.quickCompleteCheckbox).check();
    await this.waitForLoadingComplete();
  }

  /**
   * Edit task
   */
  async editTask(taskTitle, newData) {
    const row = await this.getTaskRow(taskTitle);
    await row.locator(this.selectors.editButton).click();
    await this.page.locator(this.selectors.taskSlideout).waitFor({ state: 'visible' });
    await this.fillTaskForm(newData);
    await this.saveTask();
  }

  /**
   * Delete task
   */
  async deleteTask(taskTitle) {
    const row = await this.getTaskRow(taskTitle);
    await row.locator(this.selectors.moreActionsButton).click();
    await this.page.locator(this.selectors.deleteButton).click();

    // Confirm deletion
    await this.page.locator('button:has-text("Confirm"), button:has-text("Delete")').click();
    await this.waitForLoadingComplete();
  }

  /**
   * Get task count
   */
  async getTaskCount() {
    return this.page.locator(this.selectors.taskRow).count();
  }

  /**
   * Switch to kanban view
   */
  async switchToKanbanView() {
    await this.page.locator(this.selectors.kanbanView).click();
    await this.page.locator(this.selectors.kanbanBoard).waitFor({ state: 'visible' });
  }

  /**
   * Switch to list view
   */
  async switchToListView() {
    await this.page.locator(this.selectors.listView).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Switch to calendar view
   */
  async switchToCalendarView() {
    const calendarViewButton = this.page.locator(this.selectors.calendarView);
    if (await calendarViewButton.isVisible()) {
      await calendarViewButton.click();
      await this.waitForLoadingComplete();
    }
  }

  /**
   * Drag task to different column in kanban
   */
  async dragTaskToColumn(taskTitle, targetColumn) {
    await this.switchToKanbanView();

    const task = this.page.locator(`${this.selectors.taskCard}:has-text("${taskTitle}")`);
    const column = this.page.locator(`${this.selectors.kanbanColumn}:has-text("${targetColumn}")`);

    await task.dragTo(column);
    await this.waitForLoadingComplete();
  }

  /**
   * Add comment to task
   */
  async addComment(taskTitle, comment) {
    const row = await this.getTaskRow(taskTitle);
    await row.click();
    await this.page.locator(this.selectors.taskDetail).waitFor({ state: 'visible' });

    await this.page.locator(this.selectors.commentInput).fill(comment);
    await this.page.locator(this.selectors.addCommentButton).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Assign task to self
   */
  async assignTaskToSelf() {
    const assignToMeButton = this.page.locator(this.selectors.assignToMe);
    if (await assignToMeButton.isVisible()) {
      await assignToMeButton.click();
    }
  }

  /**
   * Upload attachment to task
   */
  async uploadAttachment(filePath) {
    const fileInput = this.page.locator(this.selectors.attachmentUpload);
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles(filePath);
      await this.page.waitForTimeout(1000);
    }
  }

  /**
   * Filter by date range
   */
  async filterByToday() {
    await this.page.locator(this.selectors.todayButton).click();
    await this.waitForLoadingComplete();
  }

  async filterByTomorrow() {
    const tomorrowButton = this.page.locator(this.selectors.tomorrowButton);
    if (await tomorrowButton.isVisible()) {
      await tomorrowButton.click();
      await this.waitForLoadingComplete();
    }
  }

  async filterByThisWeek() {
    const thisWeekButton = this.page.locator(this.selectors.thisWeekButton);
    if (await thisWeekButton.isVisible()) {
      await thisWeekButton.click();
      await this.waitForLoadingComplete();
    }
  }

  /**
   * Bulk complete tasks
   */
  async bulkCompleteTasks(taskTitles) {
    for (const title of taskTitles) {
      const row = await this.getTaskRow(title);
      await row.locator('input[type="checkbox"]').first().check();
    }

    await this.page.locator(this.selectors.bulkCompleteButton).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Get tasks by status from kanban board
   */
  async getTasksByStatus(status) {
    await this.switchToKanbanView();

    const columnSelectors = {
      todo: this.selectors.todoColumn,
      'in progress': this.selectors.inProgressColumn,
      completed: this.selectors.completedColumn,
    };

    const column = this.page.locator(columnSelectors[status.toLowerCase()]);
    const tasks = await column.locator(this.selectors.taskCard).all();

    return tasks.length;
  }
}

export default TasksPage;
