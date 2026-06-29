"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Star, Trash2, X, StickyNote, ListTodo, Flame, BookOpen, CheckSquare, Check, Pencil } from "lucide-react";
import { uid, habitStreak, type Task, type Habit } from "@/lib/planner";

export function DaySidebar({
  tasks, onTasks, note, onNote, courseLink, onCourseLink,
  habits, onHabits, dayLog, onDayLog, log, date,
}: {
  tasks: Task[];
  onTasks: (t: Task[]) => void;
  note: string;
  onNote: (s: string) => void;
  courseLink: string;
  onCourseLink: (s: string) => void;
  habits: Habit[];
  onHabits: (h: Habit[]) => void;
  dayLog: Record<string, boolean>;
  onDayLog: (log: Record<string, boolean>) => void;
  log: Record<string, Record<string, boolean>>;
  date: Date;
}) {
  return (
    <div className="space-y-5">
      <Tasks tasks={tasks} onTasks={onTasks} />
      <CourseLink link={courseLink} onLink={onCourseLink} />
      <Habits habits={habits} onHabits={onHabits} dayLog={dayLog} onDayLog={onDayLog} log={log} date={date} />
      <Note note={note} onNote={onNote} />
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-line bg-page p-4 shadow-sm">{children}</div>;
}

function CourseLink({ link, onLink }: { link: string; onLink: (s: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(link);

  function save() {
    onLink(val.trim());
    setEditing(false);
  }

  return (
    <Card>
      <h3 className="mb-3 flex items-center gap-2 font-sans font-bold text-ink">
        <BookOpen size={17} className="text-sky-500" /> Bugungi dars
      </h3>
      {editing ? (
        <div className="flex gap-2">
          <input
            autoFocus
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
            placeholder="/ingliz-tili/01-a1-boshlangich/..."
            className="flex-1 rounded-lg border border-line bg-bg px-3 py-1.5 text-sm text-ink outline-none focus:border-accent"
          />
          <button onClick={save} className="rounded-lg bg-accent px-2.5 py-1.5 text-sm text-white hover:opacity-90">
            OK
          </button>
          <button onClick={() => setEditing(false)} className="text-soft hover:text-ink">
            <X size={16} />
          </button>
        </div>
      ) : link ? (
        <div className="flex items-center gap-2">
          <Link
            href={link}
            className="flex-1 truncate rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-sm text-sky-600 hover:bg-sky-500/20"
          >
            {link}
          </Link>
          <button
            onClick={() => { setVal(link); setEditing(true); }}
            className="text-soft hover:text-ink"
            title="Tahrirlash"
          >
            <Pencil size={14} />
          </button>
          <button onClick={() => { onLink(""); setVal(""); }} className="text-soft hover:text-rose-500">
            <Trash2 size={13} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
        >
          <Plus size={14} /> Dars havolasi qo'shish
        </button>
      )}
    </Card>
  );
}

function Tasks({ tasks, onTasks }: { tasks: Task[]; onTasks: (t: Task[]) => void }) {
  const [text, setText] = useState("");
  const done = tasks.filter((t) => t.done).length;

  function add() {
    const v = text.trim();
    if (!v) return;
    onTasks([...tasks, { id: uid(), text: v, done: false, priority: false }]);
    setText("");
  }
  const sorted = [...tasks].sort(
    (a, b) => Number(a.done) - Number(b.done) || Number(b.priority) - Number(a.priority),
  );

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-sans font-bold text-ink">
          <ListTodo size={17} className="text-accent" /> Vazifalar
        </h3>
        {tasks.length > 0 && <span className="text-xs text-soft">{done}/{tasks.length}</span>}
      </div>

      <div className="mb-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Yangi vazifa..."
          className="flex-1 rounded-lg border border-line bg-bg px-3 py-1.5 text-sm text-ink outline-none focus:border-accent"
        />
        <button onClick={add} className="rounded-lg bg-accent px-2.5 text-white hover:opacity-90">
          <Plus size={16} />
        </button>
      </div>

      <div className="space-y-1.5">
        {sorted.map((t) => (
          <div key={t.id} className="group flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-ink/[0.03]">
            <button
              onClick={() => onTasks(tasks.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))}
              className={`grid h-5 w-5 flex-none place-items-center rounded-md border transition ${
                t.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-soft/40 hover:border-accent"
              }`}
            >
              {t.done && <Check size={11} />}
            </button>
            <span className={`flex-1 text-sm ${t.done ? "text-soft line-through" : "text-ink"}`}>
              {t.priority && !t.done && <Star size={11} className="mr-0.5 inline shrink-0 text-amber-500" fill="currentColor" />}
              {t.text}
            </span>
            <button
              onClick={() => onTasks(tasks.map((x) => (x.id === t.id ? { ...x, priority: !x.priority } : x)))}
              className={`opacity-0 transition group-hover:opacity-100 ${t.priority ? "text-amber-500 opacity-100" : "text-soft hover:text-amber-500"}`}
              title="Muhim"
            >
              <Star size={14} fill={t.priority ? "currentColor" : "none"} />
            </button>
            <button
              onClick={() => onTasks(tasks.filter((x) => x.id !== t.id))}
              className="text-soft opacity-0 transition hover:text-rose-500 group-hover:opacity-100"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {tasks.length === 0 && <p className="py-1 text-center text-sm text-soft">Bugun uchun vazifa yo'q.</p>}
      </div>
    </Card>
  );
}

function Habits({
  habits, onHabits, dayLog, onDayLog, log, date,
}: {
  habits: Habit[];
  onHabits: (h: Habit[]) => void;
  dayLog: Record<string, boolean>;
  onDayLog: (log: Record<string, boolean>) => void;
  log: Record<string, Record<string, boolean>>;
  date: Date;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const doneCount = habits.filter((h) => dayLog[h.id]).length;

  function add() {
    const v = name.trim();
    if (!v) return;
    onHabits([...habits, { id: uid(), name: v }]);
    setName("");
    setAdding(false);
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-sans font-bold text-ink">
          <Flame size={17} className="text-amber-500" /> Odatlar
        </h3>
        <span className="text-xs text-soft">{doneCount}/{habits.length}</span>
      </div>

      <div className="space-y-1.5">
        {habits.map((h) => {
          const on = !!dayLog[h.id];
          const streak = habitStreak(h.id, log, date);
          return (
            <div key={h.id} className="group flex items-center gap-2">
              <button
                onClick={() => onDayLog({ ...dayLog, [h.id]: !on })}
                className={`flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                  on
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                    : "border-line bg-bg text-ink hover:border-accent/40"
                }`}
              >
                <CheckSquare size={14} className={on ? "text-emerald-600" : "text-muted"} />
                <span className={`flex-1 text-left ${on ? "font-medium" : ""}`}>{h.name}</span>
                {streak > 0 && (
                  <span className="flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-bold text-amber-600">
                    <Flame size={10} fill="currentColor" /> {streak}
                  </span>
                )}
                {on && <Check size={14} className="text-emerald-600" />}
              </button>
              <button
                onClick={() => onHabits(habits.filter((x) => x.id !== h.id))}
                className="text-soft opacity-0 transition hover:text-rose-500 group-hover:opacity-100"
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}
        {habits.length === 0 && <p className="py-1 text-center text-sm text-soft">Hali odat yo'q.</p>}
      </div>

      {adding ? (
        <div className="mt-2 flex gap-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Yangi odat..."
            className="flex-1 rounded-lg border border-line bg-bg px-3 py-1.5 text-sm text-ink outline-none focus:border-accent"
          />
          <button onClick={add} className="rounded-lg bg-accent px-2.5 text-white">
            <Plus size={16} />
          </button>
          <button onClick={() => setAdding(false)} className="text-soft">
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-2 inline-flex items-center gap-1 text-sm text-accent hover:underline"
        >
          <Plus size={14} /> Odat qo'shish
        </button>
      )}
    </Card>
  );
}

function Note({ note, onNote }: { note: string; onNote: (s: string) => void }) {
  return (
    <Card>
      <h3 className="mb-3 flex items-center gap-2 font-sans font-bold text-ink">
        <StickyNote size={17} className="text-violet-500" /> Kun eslatmasi
      </h3>
      <textarea
        value={note}
        onChange={(e) => onNote(e.target.value)}
        placeholder="Fikrlar, eslatmalar, kun yakuni..."
        rows={5}
        className="w-full resize-y rounded-lg border border-line bg-bg p-3 text-sm leading-relaxed text-ink outline-none focus:border-accent"
      />
    </Card>
  );
}
