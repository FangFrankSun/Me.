import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from './auth-context';

export type TaskCategory = {
  id: string;
  name: string;
  color: string;
};

export type TaskItem = {
  id: string;
  title: string;
  notes: string;
  categoryId: string;
  scheduledAt: string;
  repeatable: boolean;
  done: boolean;
  createdAt: number;
};

type TaskDraftInput = {
  title: string;
  notes: string;
  categoryId: string;
  scheduledAt: string;
  repeatable: boolean;
};

type CalendarEvent = {
  id: string;
  title: string;
  notes: string;
  scheduledAt: string;
  repeatable: boolean;
  done: boolean;
  categoryName: string;
  categoryColor: string;
};

type TasksContextValue = {
  categories: TaskCategory[];
  tasks: TaskItem[];
  calendarEvents: CalendarEvent[];
  addCategory: (name: string, color: string) => string;
  deleteCategory: (categoryId: string) => void;
  addTask: (draft: TaskDraftInput) => void;
  updateTask: (taskId: string, draft: TaskDraftInput) => void;
  toggleTaskDone: (taskId: string) => void;
};

type UserTaskData = {
  categories: TaskCategory[];
  tasks: TaskItem[];
};

const seedCategories: TaskCategory[] = [
  { id: 'cat-work', name: 'Work', color: '#4C6FFF' },
  { id: 'cat-health', name: 'Health', color: '#17A673' },
  { id: 'cat-life', name: 'Personal', color: '#FF8A4C' },
];

function todayAt(hour: number, minute: number) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function buildInitialTasks(): TaskItem[] {
  return [
    {
      id: 'task-1',
      title: 'Ship sprint recap',
      notes: 'Share highlights in team channel',
      categoryId: 'cat-work',
      scheduledAt: todayAt(9, 30),
      repeatable: false,
      done: true,
      createdAt: Date.now() - 10000,
    },
    {
      id: 'task-2',
      title: 'Plan tomorrow routine',
      notes: 'Set priorities before lunch',
      categoryId: 'cat-life',
      scheduledAt: todayAt(13, 15),
      repeatable: true,
      done: false,
      createdAt: Date.now() - 9000,
    },
    {
      id: 'task-3',
      title: '20-minute deep stretch',
      notes: 'Lower back + hamstrings',
      categoryId: 'cat-health',
      scheduledAt: todayAt(20, 0),
      repeatable: true,
      done: false,
      createdAt: Date.now() - 8000,
    },
  ];
}

function buildInitialTaskData(): UserTaskData {
  return {
    categories: seedCategories.map((category) => ({ ...category })),
    tasks: buildInitialTasks(),
  };
}

const TasksContext = createContext<TasksContextValue | null>(null);

function normalizedTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

export function TasksProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [taskDataByUserId, setTaskDataByUserId] = useState<Record<string, UserTaskData>>({});

  const currentData = useMemo(() => {
    if (!user) {
      return buildInitialTaskData();
    }
    return taskDataByUserId[user.id] ?? buildInitialTaskData();
  }, [taskDataByUserId, user]);

  const categories = currentData.categories;
  const tasks = currentData.tasks;

  const updateCurrentUserData = (updater: (current: UserTaskData) => UserTaskData) => {
    if (!user) {
      return;
    }

    setTaskDataByUserId((prev) => {
      const current = prev[user.id] ?? buildInitialTaskData();
      return {
        ...prev,
        [user.id]: updater(current),
      };
    });
  };

  const addCategory = (name: string, color: string) => {
    const normalizedName = name.trim();

    if (!normalizedName) {
      return categories[0]?.id ?? '';
    }

    const existing = categories.find(
      (category) => category.name.toLowerCase() === normalizedName.toLowerCase()
    );

    if (existing) {
      return existing.id;
    }

    const id = `cat-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nextCategory: TaskCategory = {
      id,
      name: normalizedName,
      color,
    };

    updateCurrentUserData((current) => ({
      ...current,
      categories: [...current.categories, nextCategory],
    }));
    return id;
  };

  const deleteCategory = (categoryId: string) => {
    if (categories.length <= 1 || !categories.some((category) => category.id === categoryId)) {
      return;
    }

    const fallback = categories.find((category) => category.id !== categoryId);

    if (!fallback) {
      return;
    }

    updateCurrentUserData((current) => ({
      categories: current.categories.filter((category) => category.id !== categoryId),
      tasks: current.tasks.map((task) =>
        task.categoryId === categoryId ? { ...task, categoryId: fallback.id } : task
      ),
    }));
  };

  const addTask = (draft: TaskDraftInput) => {
    const newTask: TaskItem = {
      id: `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: draft.title.trim(),
      notes: draft.notes.trim(),
      categoryId: draft.categoryId,
      scheduledAt: normalizedTimestamp(draft.scheduledAt),
      repeatable: draft.repeatable,
      done: false,
      createdAt: Date.now(),
    };

    updateCurrentUserData((current) => ({
      ...current,
      tasks: [newTask, ...current.tasks],
    }));
  };

  const updateTask = (taskId: string, draft: TaskDraftInput) => {
    updateCurrentUserData((current) => ({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              title: draft.title.trim(),
              notes: draft.notes.trim(),
              categoryId: draft.categoryId,
              scheduledAt: normalizedTimestamp(draft.scheduledAt),
              repeatable: draft.repeatable,
            }
          : task
      ),
    }));
  };

  const toggleTaskDone = (taskId: string) => {
    updateCurrentUserData((current) => ({
      ...current,
      tasks: current.tasks.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task)),
    }));
  };

  const calendarEvents = useMemo(() => {
    const categoryMap = new Map(categories.map((category) => [category.id, category]));

    return tasks
      .filter((task) => Boolean(task.scheduledAt))
      .slice()
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
      .map((task) => {
        const category = categoryMap.get(task.categoryId);
        return {
          id: task.id,
          title: task.title,
          notes: task.notes,
          scheduledAt: task.scheduledAt,
          repeatable: task.repeatable,
          done: task.done,
          categoryName: category?.name ?? 'General',
          categoryColor: category?.color ?? '#4C6FFF',
        };
      });
  }, [categories, tasks]);

  const value: TasksContextValue = {
    categories,
    tasks,
    calendarEvents,
    addCategory,
    deleteCategory,
    addTask,
    updateTask,
    toggleTaskDone,
  };

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks() {
  const context = useContext(TasksContext);

  if (!context) {
    throw new Error('useTasks must be used inside a TasksProvider');
  }

  return context;
}
