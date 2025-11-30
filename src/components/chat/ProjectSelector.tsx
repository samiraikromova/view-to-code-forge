import { useState, useRef, useEffect } from "react";
import { X, Zap } from "lucide-react";
import { Project } from "./ChatHeader";
import { cn } from "@/lib/utils";
interface ProjectSelectorProps {
  projects: Project[];
  selected: Project | null;
  onChange: (project: Project | null) => void;
}
export function ProjectSelector({
  projects,
  selected,
  onChange
}: ProjectSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  return <div ref={ref} className="relative flex items-center gap-2">
      {/* Tools button */}
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm transition-colors hover:bg-surface-hover">
        <Zap className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Tools</span>
      </button>

      {/* Selected project pill */}
      {selected && <div className="flex items-center gap-2 rounded-full border border-border/50 bg-surface px-2.5 py-1.5">
          <span className="text-xs text-foreground">{selected.name}</span>
          <button onClick={e => {
        e.stopPropagation();
        onChange(null);
      }} className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-surface-hover">
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>}

      {/* Dropdown menu */}
      {open && <div className="absolute bottom-full left-0 mb-2 w-64 rounded-xl border border-border bg-popover shadow-xl z-50">
          <div className="max-h-80 overflow-y-auto p-1.5">
            {projects.map(project => <button key={project.id} onClick={() => {
          onChange(project);
          setOpen(false);
        }} className={cn("flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-hover", selected?.id === project.id && "bg-surface-hover")}>
                <div className="flex-1">
                  <div className="text-xs font-medium text-foreground">{project.name}</div>
                  <div className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{project.description}</div>
                </div>
              </button>)}
          </div>
        </div>}
    </div>;
}