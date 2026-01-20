import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface ImageGenerationSelectorsProps {
  quality: string;
  onQualityChange: (quality: string) => void;
  numImages: number;
  onNumImagesChange: (num: number) => void;
  aspectRatio: string;
  onAspectRatioChange: (ratio: string) => void;
}

const qualityOptions = [
  { value: 'TURBO', label: 'Fast (Cheapest)', cost: '$0.03/image' },
  { value: 'BALANCED', label: 'Balanced', cost: '$0.06/image' },
  { value: 'QUALITY', label: 'Quality (Best)', cost: '$0.09/image' }
];

const numImagesOptions = [1, 2, 3, 4];

const aspectRatioOptions = [
  { value: 'square_hd', label: 'Square HD (1:1)' },
  { value: 'square', label: 'Square (1:1)' },
  { value: 'portrait_16_9', label: 'Portrait (9:16)' },
  { value: 'portrait_4_3', label: 'Portrait (3:4)' },
  { value: 'landscape_16_9', label: 'Landscape (16:9)' },
  { value: 'landscape_4_3', label: 'Landscape (4:3)' }
];

export function ImageGenerationSelectors({
  quality,
  onQualityChange,
  numImages,
  onNumImagesChange,
  aspectRatio,
  onAspectRatioChange
}: ImageGenerationSelectorsProps) {
  const [qualityOpen, setQualityOpen] = useState(false);
  const [numImagesOpen, setNumImagesOpen] = useState(false);
  const [aspectRatioOpen, setAspectRatioOpen] = useState(false);

  const qualityRef = useRef<HTMLDivElement>(null);
  const numImagesRef = useRef<HTMLDivElement>(null);
  const aspectRatioRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (qualityRef.current && !qualityRef.current.contains(event.target as Node)) {
        setQualityOpen(false);
      }
      if (numImagesRef.current && !numImagesRef.current.contains(event.target as Node)) {
        setNumImagesOpen(false);
      }
      if (aspectRatioRef.current && !aspectRatioRef.current.contains(event.target as Node)) {
        setAspectRatioOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getQualityLabel = () => {
    return quality === 'TURBO' ? 'Fast' : quality === 'BALANCED' ? 'Balanced' : 'Quality';
  };

  const getAspectRatioLabel = () => {
    const option = aspectRatioOptions.find(o => o.value === aspectRatio);
    return option?.label || 'Square HD (1:1)';
  };

return (
    <div className="flex flex-wrap gap-2">
      {/* Quality Selector */}
      <div className="relative" ref={qualityRef}>
        <button
          type="button"
          onClick={() => setQualityOpen(!qualityOpen)}
          className="h-8 px-3 rounded-md flex items-center gap-2 text-sm text-muted-foreground transition-all hover:bg-surface-hover hover:text-foreground"
        >
          <span>{getQualityLabel()}</span>
          <ChevronDown className={cn("h-3 w-3 transition-transform", qualityOpen && "rotate-180")} />
        </button>
        {qualityOpen && (
          <div className="absolute bottom-full mb-2 left-0 bg-background border border-border rounded-lg shadow-lg w-48 z-50 py-1">
            {qualityOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onQualityChange(opt.value);
                  setQualityOpen(false);
                }}
                className={cn(
                  "block w-full text-left px-3 py-2 text-xs hover:bg-surface-hover transition-colors",
                  quality === opt.value && "text-accent font-medium"
                )}
              >
                <div className="font-medium">{opt.label}</div>
                <div className="text-muted-foreground text-[10px]">{opt.cost}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Number of Images Selector */}
      <div className="relative" ref={numImagesRef}>
        <button
          type="button"
          onClick={() => setNumImagesOpen(!numImagesOpen)}
          className="h-8 px-3 rounded-md flex items-center gap-2 text-sm text-muted-foreground transition-all hover:bg-surface-hover hover:text-foreground"
        >
          <span>{numImages} {numImages === 1 ? 'Image' : 'Images'}</span>
          <ChevronDown className={cn("h-3 w-3 transition-transform", numImagesOpen && "rotate-180")} />
        </button>
        {numImagesOpen && (
          <div className="absolute bottom-full mb-2 left-0 bg-background border border-border rounded-lg shadow-lg w-32 z-50 py-1">
            {numImagesOptions.map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => {
                  onNumImagesChange(num);
                  setNumImagesOpen(false);
                }}
                className={cn(
                  "block w-full text-left px-3 py-2 text-xs hover:bg-surface-hover transition-colors",
                  numImages === num && "text-accent font-medium"
                )}
              >
                {num} {num === 1 ? 'Image' : 'Images'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Aspect Ratio Selector */}
      <div className="relative" ref={aspectRatioRef}>
        <button
          type="button"
          onClick={() => setAspectRatioOpen(!aspectRatioOpen)}
          className="h-8 px-3 rounded-md flex items-center gap-2 text-sm text-muted-foreground transition-all hover:bg-surface-hover hover:text-foreground"
        >
          <span>{getAspectRatioLabel()}</span>
          <ChevronDown className={cn("h-3 w-3 transition-transform", aspectRatioOpen && "rotate-180")} />
        </button>
        {aspectRatioOpen && (
          <div className="absolute bottom-full mb-2 left-0 bg-background border border-border rounded-lg shadow-lg w-48 z-50 py-1 max-h-56 overflow-y-auto">
            {aspectRatioOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onAspectRatioChange(opt.value);
                  setAspectRatioOpen(false);
                }}
                className={cn(
                  "block w-full text-left px-3 py-2 text-xs hover:bg-surface-hover transition-colors",
                  aspectRatio === opt.value && "text-accent font-medium"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
