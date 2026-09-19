"use client";

import { useEffect, useRef, useState } from "react";
import { Task, CalendarSlot, CalendarRange, addDays, localDate, parseDate, monday, rangeDays, layoutSlots, timeLabel, calendarSegments } from "./model";

const hourHeight = 64;
export default function Calendar({ tasks, onOpen, onEdit, onAdd, onMove }: {
  tasks: Task[]; onOpen: (task: Task) => void; onEdit: (task: Task) => void;
  onAdd: (task: Task, slot: CalendarSlot) => void;
  onMove: (task: Task, slotId: number, day: string, hour: number) => void;
}) {
  const [now, setNow] = useState<Date | null>(null);
  const [anchor, setAnchor] = useState("");
  const [month, setMonth] = useState("");
  const [range, setRange] = useState<CalendarRange>("work");
  const [navigation, setNavigation] = useState(0);
  const [drag, setDrag] = useState<{ taskId: number; slotId: number } | null>(null);
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const current = new Date(); setNow(current); setAnchor(localDate(current)); setMonth(localDate(current));
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!anchor || !scroll.current) return;
    scroll.current.scrollTop = 8 * hourHeight;
  }, [anchor, range, navigation]);
  if (!now || !anchor || !month) return <p>Načítavam kalendár…</p>;
  const today = localDate(now), days = rangeDays(anchor, range);
  const monthDate = parseDate(month);
  const monthStart = localDate(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1, 12));
  const miniDays = Array.from({ length: 42 }, (_, i) => addDays(monday(monthStart), i));
  const selectDate = (date: string) => { setAnchor(date); setMonth(date); setNavigation(value => value + 1); };
  const changeMonth = (offset: number) => { setMonth(localDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + offset, 1, 12))); setNavigation(value => value + 1); };
  const dateTitle = (date: string) => parseDate(date).toLocaleDateString("sk-SK", { day: "numeric", month: "short", year: "numeric" });
  return <section className="realCalendar" aria-label="Kalendár úloh">
    <aside className="miniMonth">
      <div className="monthControls"><button className="ghost" aria-label="Predchádzajúci mesiac" onClick={() => changeMonth(-1)}>‹</button><strong>{monthDate.toLocaleDateString("sk-SK", { month: "long", year: "numeric" })}</strong><button className="ghost" aria-label="Ďalší mesiac" onClick={() => changeMonth(1)}>›</button></div>
      <div className="monthGrid">{["Po", "Ut", "St", "Št", "Pi", "So", "Ne"].map(day => <span key={day}>{day}</span>)}
        {miniDays.map(date => <button key={date} aria-label={dateTitle(date)} aria-current={date === today ? "date" : undefined} aria-pressed={date === anchor} className={`${date.slice(0, 7) !== month.slice(0, 7) ? "outside" : ""} ${date === today ? "today" : ""} ${days.includes(date) ? "inRange" : ""}`} onClick={() => selectDate(date)}>{parseDate(date).getDate()}</button>)}
      </div>
    </aside>
    <div className="calendarMain">
      <div className="calendarToolbar">
        <button className="ghost" onClick={() => selectDate(today)}>Dnes</button>
        <button className="ghost" aria-label="Predchádzajúci rozsah" onClick={() => selectDate(addDays(anchor, -(range === "work" || range === "week" ? 7 : Number(range))))}>‹</button>
        <button className="ghost" aria-label="Ďalší rozsah" onClick={() => selectDate(addDays(anchor, range === "work" || range === "week" ? 7 : Number(range)))}>›</button>
        <strong>{dateTitle(days[0])} – {dateTitle(days[days.length - 1])}</strong>
        <select aria-label="Rozsah kalendára" value={range} onChange={e => setRange(e.target.value as CalendarRange)}><option value="3">3 dni</option><option value="5">5 dní</option><option value="work">Pracovný týždeň</option><option value="week">Celý týždeň</option></select>
      </div>
      <div className="calendarScroll" ref={scroll}>
        <div className="calendarCanvas" style={{ minWidth: 56 + days.length * 120 }}>
          <div className="dateHeaders" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}><span>Čas</span>{days.map(day => <div key={day} className={day === today ? "isToday" : ""}>{parseDate(day).toLocaleDateString("sk-SK", { weekday: "short", day: "numeric", month: "numeric" })}</div>)}</div>
          <div className="calendarTimeline" style={{ height: 24 * hourHeight, gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}>
            <div className="hourAxis">{Array.from({ length: 25 }, (_, hour) => <span key={hour} style={{ top: hour * hourHeight }}>{timeLabel(hour)}</span>)}</div>
            {days.map(day => <div key={day} className="dateColumn" onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }} onDrop={e => {
              e.preventDefault();
              const task = tasks.find(t => t.id === drag?.taskId), slot = task?.slots.find(s => s.id === drag?.slotId);
              if (task && slot) {
                const hour = Math.round((e.clientY - e.currentTarget.getBoundingClientRect().top) / hourHeight * 4) / 4;
                onMove(task, slot.id, day, Math.max(0, Math.min(24 - slot.duration, hour)));
              }
              setDrag(null);
            }}>
              {layoutSlots(tasks.flatMap(task => task.slots.flatMap(calendarSegments).filter(slot => slot.day === day))).map(({ slot, column, columns }) => {
                const task = tasks.find(t => t.id === slot.taskId)!;
                return <article key={`${task.id}-${slot.id}`} className="timedEvent" draggable tabIndex={0} role="button" aria-label={`${task.name}, ${dateTitle(day)}, ${timeLabel(slot.startHour)} – ${timeLabel(slot.startHour + slot.duration)}`} title={`${task.name}\n${timeLabel(slot.startHour)} – ${timeLabel(slot.startHour + slot.duration)}`} onClick={() => onOpen(task)} onKeyDown={e => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onOpen(task); } }} onDragStart={e => { setDrag({ taskId: task.id, slotId: slot.id }); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", `${task.id}:${slot.id}`); }} onDragEnd={() => setDrag(null)} style={{ top: slot.startHour * hourHeight, height: slot.duration * hourHeight, left: `${column / columns * 100}%`, width: `${100 / columns}%` }}>
                  <strong>{task.name}</strong><small>{timeLabel(slot.startHour)}–{timeLabel(slot.startHour + slot.duration)}</small>
                  <div className="timedActions"><button aria-label="Upraviť úlohu a bloky" title="Upraviť" onClick={e => { e.stopPropagation(); onEdit(task); }}>✎</button><button aria-label="Pridať ďalší blok tej istej úlohy" title="Pridať blok" onClick={e => { e.stopPropagation(); onAdd(task, task.slots.find(s => s.id === slot.id)!); }}>+</button></div>
                </article>;
              })}
              {day === today ? <div className="nowLine" style={{ top: (now.getHours() + now.getMinutes() / 60) * hourHeight }} aria-label={`Aktuálny čas ${timeLabel(now.getHours() + now.getMinutes() / 60)}`} /> : null}
            </div>)}
          </div>
        </div>
      </div>
    </div>
  </section>;
}
