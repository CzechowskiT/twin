"use client";

import {
  SiAngular,
  SiDocker,
  SiFastapi,
  SiGit,
  SiGo,
  SiGraphql,
  SiJavascript,
  SiKotlin,
  SiKubernetes,
  SiLinux,
  SiMongodb,
  SiMysql,
  SiNextdotjs,
  SiNodedotjs,
  SiPostgresql,
  SiPython,
  SiReact,
  SiRedis,
  SiRust,
  SiSwift,
  SiTerraform,
  SiTypescript,
  SiVuedotjs,
} from "@icons-pack/react-simple-icons";
import type { ComponentType } from "react";

type IconProps = { size?: number; color?: string; className?: string };

const TECH_ICONS: Record<string, ComponentType<IconProps>> = {
  python: SiPython,
  java: SiJavascript,
  javascript: SiJavascript,
  typescript: SiTypescript,
  react: SiReact,
  vue: SiVuedotjs,
  angular: SiAngular,
  node: SiNodedotjs,
  fastapi: SiFastapi,
  postgresql: SiPostgresql,
  postgres: SiPostgresql,
  mysql: SiMysql,
  mongodb: SiMongodb,
  redis: SiRedis,
  docker: SiDocker,
  kubernetes: SiKubernetes,
  terraform: SiTerraform,
  git: SiGit,
  linux: SiLinux,
  go: SiGo,
  rust: SiRust,
  kotlin: SiKotlin,
  swift: SiSwift,
  graphql: SiGraphql,
  nextjs: SiNextdotjs,
  "next.js": SiNextdotjs,
};

export function TechStackIcons({ stack, max = 6 }: { stack: string[]; max?: number }) {
  if (!stack.length) return null;
  const shown = stack.slice(0, max);
  return (
    <ul className="flex flex-wrap items-center gap-1.5" aria-label="Tech stack">
      {shown.map((tech) => {
        const key = tech.toLowerCase().trim();
        const Icon = TECH_ICONS[key];
        return (
          <li
            key={key}
            className="inline-flex items-center gap-1 rounded bg-[var(--twin-surface-muted)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--twin-muted-fg)]"
            title={tech}
          >
            {Icon ? <Icon size={14} /> : null}
            <span>{tech}</span>
          </li>
        );
      })}
    </ul>
  );
}
