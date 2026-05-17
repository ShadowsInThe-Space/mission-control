'use client';

import { useState, useEffect } from 'react';
import { useStore, type Task, type TaskStatus, type AgentType } from '@/lib/store';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Trash2, GripVertical, AlertCircle, X } from 'lucide-react';

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'backlog', label: 'Backlog', color: 'var(--color-muted)' },
  { id: 'in-progress', label: 'In Progress', color: 'var(--color-accent)' },
  { id: 'review', label: 'Review', color: 'var(--color-warning)' },
  { id: 'done', label: 'Done', color: 'var(--color-success)' },
];

const PRIORITIES: Task['priority'][] = ['low', 'medium', 'high', 'critical'];
const AGENTS: AgentType[] = ['hermes', 'openclaw', 'claude'];
const PRIORITY_COLORS = {
  low: 'var(--color-muted)',
  medium: 'var(--color-warning)',
  high: 'var(--color-hermes)',
  critical: 'var(--color-danger)',
};

function TaskCard({ task, onDelete }: { task: Task; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="p-3 rounded-lg mb-2 cursor-grab active:cursor-grabbing group"
      data-dragging={isDragging}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start gap-2">
        <GripVertical size={14} className="mt-0.5 flex-shrink-0 opacity-30 group-hover:opacity-60" style={{ color: 'var(--color-muted)' }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs px-1.5 py-0.5 rounded font-medium uppercase tracking-wider"
              style={{ background: `${PRIORITY_COLORS[task.priority]}20`, color: PRIORITY_COLORS[task.priority] }}
            >
              {task.priority}
            </span>
            {task.assignee && (
              <span className="text-xs px-1.5 py-0.5 rounded capitalize" style={{ background: 'var(--color-surface-hover)', color: 'var(--color-muted)' }}>
                {task.assignee}
              </span>
            )}
          </div>
          <div className="text-sm font-medium mb-1" style={{ color: 'var(--color-foreground)' }}>{task.title}</div>
          {task.description && (
            <div className="text-xs leading-relaxed" style={{ color: 'var(--color-muted)' }}>{task.description}</div>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          style={{ color: 'var(--color-danger)' }}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

interface TaskForm {
  title: string;
  description: string;
  priority: Task['priority'];
  assignee: AgentType | '';
  status: TaskStatus;
}

function TaskModal({ onClose }: { onClose: () => void }) {
  const { addTask } = useStore();
  const [form, setForm] = useState<TaskForm>({
    title: '',
    description: '',
    priority: 'medium',
    assignee: '',
    status: 'backlog',
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleSubmit() {
    if (!form.title.trim()) return;
    addTask({
      title: form.title.trim(),
      description: form.description.trim(),
      priority: form.priority,
      assignee: form.assignee as AgentType | undefined,
      status: form.status,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-foreground)' }}>New Task</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:bg-opacity-10" style={{ color: 'var(--color-muted)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-muted)' }}>Title *</label>
            <input
              autoFocus
              className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
              style={{ background: 'var(--color-surface-hover)', color: 'var(--color-foreground)', border: '1px solid var(--color-border)' }}
              placeholder="What needs to be done?"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-muted)' }}>Description</label>
            <textarea
              className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none transition-colors"
              style={{ background: 'var(--color-surface-hover)', color: 'var(--color-foreground)', border: '1px solid var(--color-border)', minHeight: '80px' }}
              placeholder="Optional details..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-muted)' }}>Priority</label>
              <div className="flex flex-col gap-1">
                {PRIORITIES.map((p) => (
                  <label key={p} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      value={p}
                      checked={form.priority === p}
                      onChange={() => setForm({ ...form, priority: p })}
                      className="accent-violet-500"
                    />
                    <span className="text-xs capitalize" style={{ color: PRIORITY_COLORS[p] }}>{p}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-muted)' }}>Assignee</label>
                <select
                  className="w-full px-2 py-1.5 rounded-lg text-xs outline-none"
                  style={{ background: 'var(--color-surface-hover)', color: 'var(--color-foreground)', border: '1px solid var(--color-border)' }}
                  value={form.assignee}
                  onChange={(e) => setForm({ ...form, assignee: e.target.value as AgentType | '' })}
                >
                  <option value="">Unassigned</option>
                  {AGENTS.map((a) => <option key={a} value={a} className="capitalize">{a}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-muted)' }}>Status</label>
                <select
                  className="w-full px-2 py-1.5 rounded-lg text-xs outline-none"
                  style={{ background: 'var(--color-surface-hover)', color: 'var(--color-foreground)', border: '1px solid var(--color-border)' }}
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}
                >
                  {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ color: 'var(--color-muted)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.title.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-40"
            style={{ background: 'var(--color-accent)', color: '#fff' }}
          >
            Create Task
          </button>
        </div>
      </div>
    </div>
  );
}

export default function KanbanBoard() {
  const { tasks, addTask, moveTask, removeTask } = useStore();
  const [showModal, setShowModal] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id as string;
    const overId = over.id as string;
    if (COLUMNS.some((c) => c.id === overId)) {
      moveTask(taskId, overId as TaskStatus);
    } else {
      const targetTask = tasks.find((t) => t.id === overId);
      if (targetTask) moveTask(taskId, targetTask.status);
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <h1 className="text-base font-semibold" style={{ color: 'var(--color-foreground)' }}>Kanban Board</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{tasks.length} tasks across {COLUMNS.length} columns</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-opacity"
          style={{ background: 'var(--color-accent)', color: '#fff' }}
        >
          <Plus size={14} /> Add Task
        </button>
      </div>

      <div className="flex-1 overflow-x-auto">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 p-4 h-full" style={{ minWidth: 'max-content' }}>
            {COLUMNS.map((col) => {
              const colTasks = tasks.filter((t) => t.status === col.id);
              return (
                <div key={col.id} className="flex flex-col w-72 flex-shrink-0">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                      <span className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>{col.label}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--color-surface)', color: 'var(--color-muted)' }}>
                        {colTasks.length}
                      </span>
                    </div>
                  </div>
                  <SortableContext items={colTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    <div
                      className="flex-1 rounded-xl p-2 overflow-y-auto transition-colors"
                      style={{ background: 'var(--color-surface)', minHeight: '200px', border: '1px solid var(--color-border)' }}
                      id={col.id}
                    >
                      {colTasks.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-24 text-xs" style={{ color: 'var(--color-muted)' }}>
                          <AlertCircle size={16} className="mb-1 opacity-40" />
                          Drop tasks here
                        </div>
                      )}
                      {colTasks.map((task) => (
                        <TaskCard key={task.id} task={task} onDelete={() => removeTask(task.id)} />
                      ))}
                    </div>
                  </SortableContext>
                </div>
              );
            })}
          </div>
        </DndContext>
      </div>

      {showModal && <TaskModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
