import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ParticleBackgroundProps {
  className?: string;
}

export function ParticleBackground({ className }: ParticleBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create floating particles
    const particleCount = 20;
    const particles: HTMLDivElement[] = [];

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement("div");
      particle.className = "particle";
      
      // Random size between 2-6px
      const size = 2 + Math.random() * 4;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      
      // Random starting position
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      
      // Random animation duration and delay
      const duration = 15 + Math.random() * 20;
      const delay = Math.random() * -20;
      particle.style.animationDuration = `${duration}s`;
      particle.style.animationDelay = `${delay}s`;
      
      // Random opacity
      particle.style.opacity = `${0.1 + Math.random() * 0.3}`;
      
      container.appendChild(particle);
      particles.push(particle);
    }

    // Create grid lines
    const gridLines = 8;
    for (let i = 0; i < gridLines; i++) {
      const line = document.createElement("div");
      line.className = "grid-line-h";
      line.style.top = `${(i + 1) * (100 / (gridLines + 1))}%`;
      line.style.animationDelay = `${i * 0.2}s`;
      container.appendChild(line);
    }

    for (let i = 0; i < gridLines; i++) {
      const line = document.createElement("div");
      line.className = "grid-line-v";
      line.style.left = `${(i + 1) * (100 / (gridLines + 1))}%`;
      line.style.animationDelay = `${i * 0.15}s`;
      container.appendChild(line);
    }

    return () => {
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute inset-0 overflow-hidden pointer-events-none",
        className
      )}
      aria-hidden="true"
    />
  );
}
