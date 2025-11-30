import { useState } from "react";
import { ProjectSelector } from "./ProjectSelector";
import { ModelSelector } from "./ModelSelector";
import { CreditsDisplay } from "./CreditsDisplay";

export interface Project {
  id: string;
  name: string;
  icon: string;
  description: string;
}

const mockProjects: Project[] = [
  {
    id: "cb4",
    name: "CB4 (Cam's Brain)",
    icon: "🧠",
    description: "Vector search integration with personal knowledge base",
  },
  {
    id: "contract",
    name: "Contract Writer",
    icon: "📄",
    description: "Generate professional contracts and legal documents",
  },
  {
    id: "ad-writing",
    name: "Ad Writing",
    icon: "📢",
    description: "Create compelling ad copy for various platforms",
  },
  {
    id: "sales-review",
    name: "Sales Call Review",
    icon: "📞",
    description: "Analyze and summarize sales call transcripts",
  },
  {
    id: "copywriting",
    name: "Copywriting Assistant",
    icon: "✍️",
    description: "Generate engaging copy for marketing materials",
  },
  {
    id: "hooks",
    name: "AI Hooks Generator",
    icon: "🎣",
    description: "Create attention-grabbing hooks for content",
  },
  {
    id: "image-gen",
    name: "Image Ad Generator",
    icon: "🎨",
    description: "Generate images for advertisements using Ideogram v3",
  },
];

export function ChatHeader() {
  const [selectedProject, setSelectedProject] = useState<Project>(mockProjects[0]);
  const [selectedModel, setSelectedModel] = useState("claude-sonnet-4-5");

  return (
    <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
      <div className="flex items-center gap-4">
        <ProjectSelector
          projects={mockProjects}
          selected={selectedProject}
          onChange={setSelectedProject}
        />
        <ModelSelector selected={selectedModel} onChange={setSelectedModel} />
      </div>
      <CreditsDisplay />
    </div>
  );
}