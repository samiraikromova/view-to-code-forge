import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { Project } from "./ChatHeader";
import { cn } from "@/lib/utils";

interface ProjectSelectorProps {
  projects: Project[];
  selected: Project;
  onChange: (project: Project) => void;
}

export function ProjectSelector({ projects, selected, onChange }: ProjectSelectorProps) {
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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 transition-colors hover:bg-surface-hover"
      >
        <span className="text-xl">{selected.icon}</span>
        <span className="text-sm font-medium text-foreground">{selected.name}</span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-lg border border-border bg-popover shadow-xl">
          <div className="max-h-96 overflow-y-auto">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => {
                  onChange(project);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-hover",
                  selected.id === project.id && "bg-surface-hover"
                )}
              >
                <span className="mt-0.5 text-2xl">{project.icon}</span>
                <div className="flex-1">
                  <div className="font-medium text-foreground">{project.name}</div>
                  <div className="mt-0.5 text-sm text-muted-foreground">{project.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}