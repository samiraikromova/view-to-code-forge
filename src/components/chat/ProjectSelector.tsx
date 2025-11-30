import { useState, useRef, useEffect } from "react";
import { X, Zap } from "lucide-react";
import { Project } from "./ChatHeader";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  return <TooltipProvider delayDuration={300}>
      <div ref={ref} className="relative flex items-center gap-2">
        {/* Tools button - expands when tool is selected */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => setOpen(!open)} className={cn(
              "h-8 px-1.5 rounded-lg border flex items-center justify-center transition-all",
              selected 
                ? "min-w-8 gap-2 border-accent bg-surface text-muted-foreground pr-2.5" 
                : "min-w-8 border-border/30 text-muted-foreground hover:text-accent"
            )}>
              <Zap className="h-4 w-4" />
              {selected && <span className="text-xs whitespace-nowrap">{selected.name}</span>}
              {selected && <button onClick={e => {
                e.stopPropagation();
                onChange(null);
              }} className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-surface-hover">
                <X className="h-3 w-3" />
              </button>}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Tools</p>
          </TooltipContent>
        </Tooltip>

        {/* Dropdown menu */}
        {open && <div className="absolute bottom-full left-0 mb-2 w-64 rounded-xl border border-border bg-popover shadow-xl z-50">
            <div className="p-1.5">
              
              <div className="max-h-80 overflow-y-auto">
                {projects.map(project => <button key={project.id} onClick={() => {
              onChange(project);
              setOpen(false);
            }} className={cn("flex w-full items-center rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-hover", selected?.id === project.id && "bg-surface-hover")}>
                    <span className="text-xs text-muted-foreground">{project.name}</span>
                  </button>)}
              </div>
            </div>
          </div>}
      </div>
    </TooltipProvider>;
}