"use client";

export function SkillTags({ skills, max = 6 }: { skills: string[]; max?: number }) {
  const shown = skills.slice(0, max);
  if (!shown.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((skill) => (
        <span key={skill} className="twin-badge text-[10px]">
          {skill}
        </span>
      ))}
    </div>
  );
}
