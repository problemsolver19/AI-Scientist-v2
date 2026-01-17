"use client";

import type { JSX } from "react";
import { useState } from "react";
import {
  stages,
  promptSections,
  sourceTypeInfo
} from "./data/promptData";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function renderJsonWithHighlights(
  value: JsonValue,
  indent = 0,
  inheritedColor?: string
): JSX.Element[] {
  const elements: JSX.Element[] = [];
  const pad = "  ".repeat(indent);

  const append = (str: string, color?: string) => {
    elements.push(
      <span
        key={`${elements.length}-${pad}-${str.slice(0, 4)}`}
        style={{ color: color ?? "inherit" }}
      >
        {str}
      </span>
    );
  };

  const newline = () => elements.push(<br key={`br-${elements.length}`} />);

  const renderValue = (val: JsonValue, nextIndent: number, color?: string) => {
    if (val === null) {
      append("null", color);
    } else if (typeof val === "string") {
      append(`"${val}"`, color);
    } else if (typeof val === "number" || typeof val === "boolean") {
      append(String(val), color);
    } else if (Array.isArray(val)) {
      append("[", color);
      newline();
      val.forEach((item, idx) => {
        append("  ".repeat(nextIndent));
        renderValue(item, nextIndent + 1, color);
        if (idx < val.length - 1) append(",", color);
        newline();
      });
      append("  ".repeat(nextIndent - 1) + "]", color);
    } else if (typeof val === "object") {
      append("{", color);
      newline();
      const entries = Object.entries(val);
      entries.forEach(([k, v], idx) => {
        const keyColor = color;
        append("  ".repeat(nextIndent) + `"${k}": `, keyColor);
        const nextColor =
          color ??
          (k === "content" || k.startsWith("content_")
            ? k.includes("empty")
              ? "var(--json-empty)"
              : "var(--json-filled)"
            : k === "source"
            ? "var(--json-green)"
            : k === "role" && typeof v === "string"
            ? v === "system"
              ? "var(--json-system)"
              : "var(--json-user)"
            : undefined);
        renderValue(v, nextIndent + 1, nextColor);
        if (idx < entries.length - 1) append(",", keyColor);
        newline();
      });
      append("  ".repeat(nextIndent - 1) + "}", color);
    }
  };

  renderValue(value, indent + 1, inheritedColor);
  return elements;
}

export default function Home() {
  const [selectedStage, setSelectedStage] = useState(1);
  const currentStage = stages.find((s) => s.number === selectedStage)!;

  const sectionOrder = [
    "introduction",
    "research_preamble",
    "title",
    "abstract",
    "hypothesis",
    "code_to_use",
    "stage_info",
    "memory",
    "response_format",
    "evaluation_metrics",
    "impl_guidelines",
    "packages",
    "experiments",
    "risk_factors",
  ];

  const filteredSections = promptSections
    .filter((s) => s.stages.includes(selectedStage))
    .sort((a, b) => {
      const ia = sectionOrder.indexOf(a.id);
      const ib = sectionOrder.indexOf(b.id);
      const sa = ia === -1 ? Number.MAX_SAFE_INTEGER : ia;
      const sb = ib === -1 ? Number.MAX_SAFE_INTEGER : ib;
      if (sa !== sb) return sa - sb;
      return a.id.localeCompare(b.id);
    });

  const systemTypes = ["hardcoded", "runtime"];

  const promptJson = {
    stage: {
      number: currentStage.number,
      name: currentStage.name,
      codeName: currentStage.codeName,
    },
    sections: filteredSections.map((section, index) => {
      const sectionObj: { [key: string]: JsonValue } = {
        order: index + 1,
        id: section.id,
        name: section.name,
        role: systemTypes.includes(section.source.type) ? "system" : "user",
        source: { ...section.source } as { [key: string]: JsonValue },
      };

      // Populate content variants when provided
      if (section.contentVariants?.length) {
        section.contentVariants.forEach((variant) => {
          sectionObj[variant.label] = variant.value;
        });
      }

      // Runtime-expanded stage info
      if (section.id === "stage_info") {
        sectionObj["content_runtime"] = `Current Main Stage: ${currentStage.codeName}
Sub-stage: 1 - preliminary
Sub-stage goals:
${currentStage.goals.map((g) => `- ${g}`).join("\n")}`;
      } else if (section.content && !section.contentVariants) {
        // Static content fallback
        sectionObj["content"] = section.content;
      }

      return sectionObj;
    }),
  };

  return (
    <div className="min-h-screen bg-[--bg-primary]">
      {/* Header */}
      <header className="border-b border-[--border-color] bg-[--bg-secondary] sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h1 className="text-xl font-bold">
            <span className="text-[--color-hardcoded]">AI-Scientist-v2</span>
            <span className="text-[--text-primary]"> Prompt Flow</span>
          </h1>
          <p className="text-xs text-[--text-muted] mt-1">
            How prompts are constructed from multiple sources
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Legend */}
        <section className="border border-[--border-color] rounded-lg bg-[--bg-secondary] p-4">
          <h2 className="text-xs font-bold text-[--text-muted] uppercase tracking-wider mb-3">
            Source Types
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(sourceTypeInfo).map(([key, info]) => (
              <div
                key={key}
                className="flex items-start gap-2 p-2 rounded"
                style={{ background: info.bgColor }}
              >
                <div
                  className="w-3 h-3 rounded mt-0.5 flex-shrink-0"
                  style={{ background: info.color }}
                />
                <div>
                  <div className="text-xs font-bold" style={{ color: info.color }}>
                    {info.label}
                  </div>
                  <div className="text-[10px] text-[--text-secondary]">
                    {info.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Stage Selector */}
        <section>
          <h2 className="text-xs font-bold text-[--text-muted] uppercase tracking-wider mb-3">
            Select Stage
          </h2>
          <div className="flex flex-wrap gap-2">
            {stages.map((stage) => (
              <button
                key={stage.number}
                onClick={() => setSelectedStage(stage.number)}
                className={`px-4 py-2 rounded-lg border transition-all text-left ${
                  selectedStage === stage.number
                    ? "border-[--color-hardcoded] bg-[--color-hardcoded-bg]"
                    : "border-[--border-color] bg-[--bg-tertiary] hover:border-[--text-muted]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                      selectedStage === stage.number
                        ? "bg-[--color-hardcoded] text-white"
                        : "bg-[--bg-primary] text-[--text-muted]"
                    }`}
                  >
                    {stage.number}
                  </span>
                  <div>
                    <div className="text-sm font-medium">{stage.name}</div>
                    <div className="text-[10px] text-[--text-muted]">
                      {stage.codeName}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Stage Goals */}
        <section className="border border-[--border-color] rounded-lg bg-[--bg-secondary] p-4">
          <h3 className="text-sm font-bold text-[--text-secondary] mb-2">
            Stage {currentStage.number} Goals: {currentStage.name}
          </h3>
          <ul className="space-y-1">
            {currentStage.goals.map((goal, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-[--color-ideation]">•</span>
                <span>{goal}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Prompt Flow */}
        <section>
          <h2 className="text-xs font-bold text-[--text-muted] uppercase tracking-wider mb-3">
            Full Prompt (Stage {selectedStage}) — {filteredSections.length} sections
          </h2>

          <div className="border border-[--border-color] rounded-lg bg-[--bg-secondary]">
            <div className="px-4 py-2 border-b border-[--border-color] flex items-center justify-between text-xs text-[--text-secondary]">
              <span>Prompt as JSON</span>
              <span className="text-[--text-muted]">
                Red = prompt text, Green = source metadata, Blue = system, Yellow = user
              </span>
            </div>
            <pre className="text-sm whitespace-pre-wrap font-mono text-[--text-primary] leading-relaxed p-4 overflow-x-auto">
              {renderJsonWithHighlights(promptJson)}
            </pre>
          </div>
        </section>

        {/* Data Flow Summary */}
        <section className="border border-[--border-color] rounded-lg bg-[--bg-secondary] p-4">
          <h2 className="text-xs font-bold text-[--text-muted] uppercase tracking-wider mb-3">
            Data Flow Summary
          </h2>
          <pre className="text-xs font-mono text-[--text-secondary] leading-relaxed">
{`.md Topic File (HUMAN)
    ↓
Ideation LLM (perform_ideation_temp_free.py)
    ↓
.json Ideas File (IDEATION LLM)
    ├── Title
    ├── Abstract
    ├── Short Hypothesis
    ├── Experiments (Stage 3 only)
    └── Risk Factors (Stage 4 only)

.py Code Reference (HUMAN)
    └── Dataset loading examples, training code

Hardcoded Prompts (parallel_agent.py, agent_manager.py)
    ├── Introduction
    ├── Implementation Guidelines
    ├── Response Format
    └── Installed Packages

Runtime LLM (once at start)
    └── Evaluation Metrics

Previous Stage Results (Journal)
    └── Memory summary

All combined → FINAL PROMPT → Code LLM → Execute → Results`}
          </pre>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[--border-color] bg-[--bg-secondary] mt-16">
        <div className="max-w-4xl mx-auto px-6 py-4 text-xs text-[--text-muted]">
          AI-Scientist-v2 Prompt Flow Viewer
        </div>
      </footer>
    </div>
  );
}
