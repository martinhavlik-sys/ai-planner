"use client";
import { useEffect, useId, useRef, useState } from "react";
export default function RecordPicker({ label, records, value, onChange, required = false }: { label: string; records: { id: number; name: string }[]; value: number | null; onChange: (id: number | null) => void; required?: boolean }) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const selected = records.find(r => r.id === value)?.name ?? "";
  const [text, setText] = useState(selected);
  useEffect(() => { setText(selected); input.current?.setCustomValidity(""); }, [selected, value]);
  return <label>{label}<input ref={input} required={required} list={id} value={text} placeholder={required ? "Vybrať zo zoznamu" : "Bez priradenia"} onChange={e => {
    const name = e.target.value; setText(name);
    const match = records.find(r => r.name.toLocaleLowerCase("sk") === name.toLocaleLowerCase("sk"));
    if (match || !name) onChange(match?.id ?? null);
    e.target.setCustomValidity(name && !match ? "Vyberte existujúci záznam zo zoznamu alebo pole vyprázdnite." : "");
  }} onBlur={() => {
    const match = records.find(r => r.name.toLocaleLowerCase("sk") === text.toLocaleLowerCase("sk"));
    if (match) setText(match.name);
  }} onKeyDown={e => { if (e.key === "Escape" && text !== selected) { e.stopPropagation(); setText(selected); e.currentTarget.setCustomValidity(""); } }} /><datalist id={id}>{records.map(r => <option key={r.id} value={r.name} />)}</datalist></label>;
}
