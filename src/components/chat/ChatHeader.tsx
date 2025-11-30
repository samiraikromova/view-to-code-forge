import { useState } from "react";
import { ProjectSelector } from "./ProjectSelector";
import { ModelThinkingSelector } from "./ModelThinkingSelector";
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
    name: "CB4",
    icon: "🧠",
    description: "Vector search integration with personal knowledge base",
  },
  {
    id: "copywriting",
    name: "Copywriting Assistant",
    icon: "✍️",
    description: "Generate engaging copy for marketing materials",
  },
  {
    id: "contract",
    name: "Contract Writer",
    icon: "📄",
    description: "Generate professional contracts and legal documents",
  },
  {
    id: "sales-review",
    name: "Sales Call Transcript Review",
    icon: "📞",
    description: "Analyze and summarize sales call transcripts",
  },
  {
    id: "ad-writing",
    name: "Ad Writing",
    icon: "📢",
    description: "Create compelling ad copy for various platforms",
  },
  {
    id: "image-gen",
    name: "Image Ad Generator",
    icon: "🎨",
    description: "Generate images for advertisements",
  },
  {
    id: "hooks",
    name: "AI Hooks Generator",
    icon: "🎣",
    description: "Create attention-grabbing hooks for content",
  },
  {
    id: "documentation",
    name: "Documentation",
    icon: "📚",
    description: "Generate and manage technical documentation",
  },
];

export function ChatHeader() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(mockProjects[0]);
  const [selectedModel, setSelectedModel] = useState("claude-opus-4");
  const [extendedThinking, setExtendedThinking] = useState(false);

  return (
    <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
      <div className="flex items-center gap-4">
        <ProjectSelector
          projects={mockProjects}
          selected={selectedProject}
          onChange={setSelectedProject}
        />
        <ModelThinkingSelector
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          extendedThinking={extendedThinking}
          onToggleExtendedThinking={() => setExtendedThinking(!extendedThinking)}
        />
      </div>
      <CreditsDisplay />
    </div>
  );
}