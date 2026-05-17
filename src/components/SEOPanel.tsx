'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';

type Tab = 'overview' | 'projects' | 'keywords' | 'content' | 'scraper';

export default function SEOPanel() {
  const { seoProjects, activeProjectId, setActiveProject } = useStore();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const activeProject = seoProjects.find((p) => p.id === activeProjectId);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'projects', label: '🏗️ Projects' },
    { id: 'keywords', label: '🔑 Keywords' },
    { id: 'content', label: '✍️ Content' },
    { id: 'scraper', label: '🕷️ Scraper' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">SEO / GEO Control</h2>
          <p className="text-xs text-gray-400">
            {seoProjects.length} Projects · {activeProject?.overallScore ?? 0}% Score
          </p>
        </div>
        {activeProject && (
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-xs text-gray-400">{activeProject.name}</div>
              <div className={`text-sm font-mono ${
                (activeProject.overallScore ?? 0) > 70 ? 'text-green-400' :
                (activeProject.overallScore ?? 0) > 40 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {activeProject.overallScore}%
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'projects' && <ProjectsTab />}
        {activeTab === 'keywords' && <KeywordsTab />}
        {activeTab === 'content' && <ContentTab />}
        {activeTab === 'scraper' && <ScraperTab />}
      </div>
    </div>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────

function OverviewTab() {
  const { seoProjects } = useStore();

  if (seoProjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <div className="text-4xl mb-4">🔍</div>
        <p className="text-lg font-medium mb-2">No SEO Projects yet</p>
        <p className="text-sm mb-4">Create a project to start tracking keywords & analyzing sites</p>
        <p className="text-xs text-gray-500">→ Projects tab to get started</p>
      </div>
    );
  }

  const avgScore = Math.round(seoProjects.reduce((s, p) => s + (p.overallScore || 0), 0) / seoProjects.length);
  const totalKeywords = seoProjects.reduce((s, p) => s + p.keywords.length, 0);
  const totalContent = seoProjects.reduce((s, p) => s + p.contents.length, 0);

  return (
    <div className="p-4 space-y-4">
      {/* Score Cards */}
      <div className="grid grid-cols-2 gap-3">
        <ScoreCard label="Avg Score" value={`${avgScore}%`} color={avgScore > 70 ? 'green' : avgScore > 40 ? 'yellow' : 'red'} />
        <ScoreCard label="Projects" value={seoProjects.length.toString()} />
        <ScoreCard label="Keywords" value={totalKeywords.toString()} />
        <ScoreCard label="Content" value={totalContent.toString()} />
      </div>

      {/* Project list */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-400">Projects</h3>
        {seoProjects.map((p) => (
          <ProjectRow key={p.id} project={p} />
        ))}
      </div>
    </div>
  );
}

function ScoreCard({ label, value, color }: { label: string; value: string; color?: 'green' | 'yellow' | 'red' }) {
  const colorClass = color === 'green' ? 'text-green-400' : color === 'yellow' ? 'text-yellow-400' : color === 'red' ? 'text-red-400' : 'text-white';
  return (
    <div className="bg-white/5 rounded-lg p-3">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className={`text-xl font-bold font-mono ${colorClass}`}>{value}</div>
    </div>
  );
}

function ProjectRow({ project }: { project: ReturnType<typeof useStore.getState>['seoProjects'][0] }) {
  const { setActiveProject, activeProjectId } = useStore();
  const isActive = project.id === activeProjectId;

  return (
    <button
      onClick={() => setActiveProject(project.id)}
      className={`w-full text-left p-3 rounded-lg border transition-all ${
        isActive ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:border-white/20 bg-white/5'
      }`}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="font-medium text-white text-sm">{project.name}</div>
          <div className="text-xs text-gray-400 mt-0.5">{project.url}</div>
        </div>
        <div className={`text-sm font-mono font-bold ${
          project.overallScore > 70 ? 'text-green-400' : project.overallScore > 40 ? 'text-yellow-400' : 'text-red-400'
        }`}>
          {project.overallScore}%
        </div>
      </div>
      <div className="flex gap-4 mt-2 text-xs text-gray-500">
        <span>🔑 {project.keywords.length} Keywords</span>
        <span>✍️ {project.contents.length} Content</span>
        <span>📋 {project.seoRecords.length} Scans</span>
      </div>
    </button>
  );
}

// ─── Projects ─────────────────────────────────────────────────────────────────

function ProjectsTab() {
  const { seoProjects, addProject } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', description: '' });

  const handleCreate = () => {
    if (!form.name || !form.url) return;
    addProject({ name: form.name, url: form.url, description: form.description });
    setForm({ name: '', url: '', description: '' });
    setShowForm(false);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-400">SEO Projects</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg transition-colors"
        >
          + New Project
        </button>
      </div>

      {showForm && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
          <input
            placeholder="Project name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-white/10 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <input
            placeholder="https://example.com"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            className="w-full bg-white/10 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <textarea
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className="w-full bg-white/10 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              className="px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs rounded transition-colors"
            >
              Create
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {seoProjects.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
        {seoProjects.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            No projects yet — create one above
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: ReturnType<typeof useStore.getState>['seoProjects'][0] }) {
  const { setActiveProject, activeProjectId, removeProject } = useStore();
  const isActive = project.id === activeProjectId;

  return (
    <div className={`p-3 rounded-lg border ${isActive ? 'border-blue-500' : 'border-white/10'} bg-white/5`}>
      <div className="flex items-start justify-between">
        <button onClick={() => setActiveProject(project.id)} className="text-left flex-1">
          <div className="font-medium text-white text-sm">{project.name}</div>
          <div className="text-xs text-blue-400 mt-0.5">{project.url}</div>
          {project.description && <div className="text-xs text-gray-500 mt-1">{project.description}</div>}
        </button>
        <button
          onClick={() => removeProject(project.id)}
          className="text-red-400/50 hover:text-red-400 text-xs ml-2"
        >
          ✕
        </button>
      </div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
        <ScorePill score={project.overallScore} />
        <div className="flex gap-3 text-xs text-gray-500">
          <span>{project.keywords.length} 🔑</span>
          <span>{project.contents.length} ✍️</span>
        </div>
      </div>
    </div>
  );
}

function ScorePill({ score }: { score: number }) {
  const cls = score > 70 ? 'bg-green-500/20 text-green-400' : score > 40 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400';
  return <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${cls}`}>{score}%</span>;
}

// ─── Keywords ─────────────────────────────────────────────────────────────────

function KeywordsTab() {
  const { seoProjects, activeProjectId, addKeyword, removeKeyword } = useStore();
  const activeProject = seoProjects.find((p) => p.id === activeProjectId);
  const [showAdd, setShowAdd] = useState(false);
  const [newKw, setNewKw] = useState({ term: '', volume: '', difficulty: '' });
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <div className="text-4xl mb-4">🔑</div>
        <p className="text-sm">Select a project first</p>
      </div>
    );
  }

  const handleSuggest = async () => {
    setLoading(true);
    try {
      const existing = activeProject.keywords.map((k) => k.term);
      const res = await fetch('/api/seo/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: existing, domain: activeProject.url }),
      });
      const data = await res.json();
      if (data.suggestions) {
        setSuggestions(data.suggestions.map((s: { term: string }) => s.term));
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleAdd = (term: string) => {
    if (!term.trim()) return;
    addKeyword(activeProject.id, {
      term: term.trim(),
      volume: parseInt(newKw.volume) || undefined,
      difficulty: parseInt(newKw.difficulty) || undefined,
      status: 'tracking',
      trend: 'stable',
    });
    setNewKw({ term: '', volume: '', difficulty: '' });
    setShowAdd(false);
  };

  const trendingUp = activeProject.keywords.filter((k) => k.trend === 'up').length;
  const trendingDown = activeProject.keywords.filter((k) => k.trend === 'down').length;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-white">{activeProject.name} — Keywords</h3>
          <div className="text-xs text-gray-500 mt-0.5">
            {trendingUp > 0 && <span className="text-green-400">↑ {trendingUp} up</span>}
            {trendingDown > 0 && <span className="text-red-400 ml-2">↓ {trendingDown} down</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSuggest}
            disabled={loading}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs rounded-lg transition-colors"
          >
            {loading ? '...' : '💡 Suggest'}
          </button>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg transition-colors"
          >
            + Add
          </button>
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 space-y-2">
          <div className="text-xs font-medium text-purple-400 mb-1">💡 Suggestions — click to add</div>
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => { handleAdd(s); setSuggestions(suggestions.filter((x) => x !== s)); }}
              className="block w-full text-left px-2 py-1 text-xs text-purple-200 hover:bg-purple-500/20 rounded transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2">
          <input
            placeholder="Keyword phrase"
            value={newKw.term}
            onChange={(e) => setNewKw({ ...newKw, term: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd(newKw.term)}
            className="w-full bg-white/10 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <div className="flex gap-2">
            <input
              placeholder="Volume (optional)"
              value={newKw.volume}
              onChange={(e) => setNewKw({ ...newKw, volume: e.target.value })}
              className="flex-1 bg-white/10 border border-white/10 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <input
              placeholder="Difficulty"
              value={newKw.difficulty}
              onChange={(e) => setNewKw({ ...newKw, difficulty: e.target.value })}
              className="w-24 bg-white/10 border border-white/10 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => handleAdd(newKw.term)}
            className="w-full px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs rounded transition-colors"
          >
            Add Keyword
          </button>
        </div>
      )}

      <div className="space-y-1">
        {activeProject.keywords.map((kw) => (
          <KeywordRow key={kw.id} keyword={kw} projectId={activeProject.id} />
        ))}
        {activeProject.keywords.length === 0 && (
          <div className="text-center py-6 text-gray-500 text-sm">No keywords yet</div>
        )}
      </div>
    </div>
  );
}

function KeywordRow({ keyword, projectId }: { keyword: ReturnType<typeof useStore.getState>['seoProjects'][0]['keywords'][0]; projectId: string }) {
  const { removeKeyword, updateKeyword } = useStore();

  const trendIcon = keyword.trend === 'up' ? '↑' : keyword.trend === 'down' ? '↓' : '→';
  const trendColor = keyword.trend === 'up' ? 'text-green-400' : keyword.trend === 'down' ? 'text-red-400' : 'text-gray-400';

  const statusColor = keyword.status === 'new' ? 'text-blue-400' : keyword.status === 'updating' ? 'text-yellow-400' : 'text-gray-400';

  return (
    <div className="flex items-center justify-between p-2.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
      <div className="flex items-center gap-3">
        <span className={`text-sm ${trendColor}`}>{trendIcon}</span>
        <span className="text-white text-sm">{keyword.term}</span>
        <span className={`text-xs ${statusColor}`}>{keyword.status}</span>
      </div>
      <div className="flex items-center gap-4">
        {keyword.volume && <span className="text-xs text-gray-500">{keyword.volume.toLocaleString()}/mo</span>}
        {keyword.difficulty && (
          <span className={`text-xs font-mono ${
            keyword.difficulty > 70 ? 'text-red-400' : keyword.difficulty > 40 ? 'text-yellow-400' : 'text-green-400'
          }`}>
            {keyword.difficulty}
          </span>
        )}
        {keyword.rank && <span className="text-xs text-gray-400">#{keyword.rank}</span>}
        <button
          onClick={() => removeKeyword(projectId, keyword.id)}
          className="text-gray-600 hover:text-red-400 text-xs"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ─── Content ─────────────────────────────────────────────────────────────────

function ContentTab() {
  const { seoProjects, activeProjectId, addContent, updateContent } = useStore();
  const activeProject = seoProjects.find((p) => p.id === activeProjectId);
  const [generating, setGenerating] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [composerForm, setComposerForm] = useState({ keyword: '', type: 'blog' as 'blog' | 'newsletter' | 'social', tone: '', cta: '', targetWords: 800 });
  const [lastContent, setLastContent] = useState<{ type: string; content: string } | null>(null);

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <div className="text-4xl mb-4">✍️</div>
        <p className="text-sm">Select a project first</p>
      </div>
    );
  }

  const handleGenerate = async () => {
    if (!composerForm.keyword) return;
    setGenerating(true);
    setLastContent(null);
    try {
      // Add pending content
      addContent(activeProject.id, {
        keywordId: '',
        type: composerForm.type,
        title: `${composerForm.type} — ${composerForm.keyword}`,
        status: 'generating',
      });

      const res = await fetch('/api/seo/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: composerForm.type,
          keyword: composerForm.keyword,
          projectName: activeProject.name,
          tone: composerForm.tone,
          cta: composerForm.cta,
          targetWords: composerForm.targetWords,
        }),
      });
      const data = await res.json();

      if (data.content) {
        setLastContent({ type: composerForm.type, content: data.content });
        addContent(activeProject.id, {
          keywordId: '',
          type: composerForm.type,
          title: data.content.split('\n')[0].replace(/^#+ /, '').slice(0, 60) || composerForm.keyword,
          content: data.content,
          status: 'ready',
          wordCount: data.wordCount,
          tone: data.tone,
          cta: data.cta,
        });
      }
    } catch { /* ignore */ }
    setGenerating(false);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">Content Library</h3>
        <button
          onClick={() => setShowComposer(!showComposer)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg transition-colors"
        >
          + Generate Content
        </button>
      </div>

      {showComposer && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {(['blog', 'newsletter', 'social'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setComposerForm({ ...composerForm, type: t })}
                className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                  composerForm.type === t
                    ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                    : 'border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                {t === 'blog' ? '📝 Blog' : t === 'newsletter' ? '📧 Newsletter' : '📱 Social'}
              </button>
            ))}
          </div>
          <input
            placeholder="Target keyword"
            value={composerForm.keyword}
            onChange={(e) => setComposerForm({ ...composerForm, keyword: e.target.value })}
            className="w-full bg-white/10 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Tone (e.g. professionell)"
              value={composerForm.tone}
              onChange={(e) => setComposerForm({ ...composerForm, tone: e.target.value })}
              className="bg-white/10 border border-white/10 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <input
              type="number"
              placeholder="Target words"
              value={composerForm.targetWords}
              onChange={(e) => setComposerForm({ ...composerForm, targetWords: parseInt(e.target.value) || 800 })}
              className="bg-white/10 border border-white/10 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <input
            placeholder="Call-to-Action (optional)"
            value={composerForm.cta}
            onChange={(e) => setComposerForm({ ...composerForm, cta: e.target.value })}
            className="w-full bg-white/10 border border-white/10 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleGenerate}
            disabled={generating || !composerForm.keyword}
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <span className="animate-spin">⟳</span>
                Generating via Hermes...
              </>
            ) : (
              <>🤖 Generate with Hermes</>
            )}
          </button>
        </div>
      )}

      {lastContent && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="text-xs text-gray-400 mb-2">Last generated — {lastContent.type}</div>
          <pre className="text-xs text-gray-300 whitespace-pre-wrap font-sans overflow-y-auto max-h-60">
            {lastContent.content}
          </pre>
        </div>
      )}

      <div className="space-y-2">
        {activeProject.contents.map((c) => (
          <ContentRow key={c.id} content={c} projectId={activeProject.id} />
        ))}
        {activeProject.contents.length === 0 && (
          <div className="text-center py-6 text-gray-500 text-sm">
            No content yet — generate some above
          </div>
        )}
      </div>
    </div>
  );
}

function ContentRow({ content, projectId }: { content: ReturnType<typeof useStore.getState>['seoProjects'][0]['contents'][0]; projectId: string }) {
  const { updateContent, removeContent } = useStore();

  const typeIcon = content.type === 'blog' ? '📝' : content.type === 'newsletter' ? '📧' : '📱';
  const statusColor = content.status === 'ready' ? 'text-green-400' : content.status === 'generating' ? 'text-yellow-400' : 'text-gray-400';

  const handlePublish = () => {
    updateContent(projectId, content.id, { status: 'published' });
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span>{typeIcon}</span>
            <span className="text-white text-sm font-medium">{content.title}</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className={`text-xs ${statusColor}`}>{content.status}</span>
            {content.wordCount && <span className="text-xs text-gray-500">{content.wordCount} words</span>}
            {content.tone && <span className="text-xs text-gray-500">{content.tone}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {content.status === 'ready' && (
            <button
              onClick={handlePublish}
              className="px-2 py-1 bg-green-600/80 hover:bg-green-500 text-white text-xs rounded transition-colors"
            >
              Publish
            </button>
          )}
          <button
            onClick={() => removeContent(projectId, content.id)}
            className="text-gray-600 hover:text-red-400 text-xs"
          >
            ✕
          </button>
        </div>
      </div>
      {content.content && (
        <details className="mt-2">
          <summary className="text-xs text-gray-500 cursor-pointer">Show content</summary>
          <pre className="mt-1 text-xs text-gray-300 whitespace-pre-wrap font-sans max-h-40 overflow-y-auto">
            {content.content}
          </pre>
        </details>
      )}
    </div>
  );
}

// ─── Scraper ──────────────────────────────────────────────────────────────────

function ScraperTab() {
  const { seoProjects, activeProjectId, addSEORecord, setProjectScore } = useStore();
  const activeProject = seoProjects.find((p) => p.id === activeProjectId);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');

  const handleScrape = async () => {
    if (!url || !activeProject) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Scrape
      const scrapeRes = await fetch('/api/seo/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const scrapeData = await scrapeRes.json();

      if (!scrapeData.ok) {
        setError(scrapeData.error || 'Scrape failed');
        setLoading(false);
        return;
      }

      // Analyze
      const analyzeRes = await fetch('/api/seo/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scrapeData),
      });
      const analyzeData = await analyzeRes.json();

      if (analyzeData.ok) {
        addSEORecord(activeProject.id, {
          url: scrapeData.url,
          scrapedAt: analyzeData.scrapedAt,
          score: analyzeData.score,
          title: analyzeData.title,
          metaDescription: analyzeData.metaDescription,
          h1s: analyzeData.h1s || [],
          wordCount: analyzeData.wordCount,
          loadTime: scrapeData.loadTime,
          issues: analyzeData.issues || [],
          recommendations: analyzeData.recommendations || [],
        });
        setProjectScore(activeProject.id, analyzeData.score);
        setResult(analyzeData);
      }
    } catch (e) {
      setError(String(e));
    }
    setLoading(false);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2">
        <input
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
          className="flex-1 bg-white/10 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleScrape}
          disabled={loading || !url}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
        >
          {loading ? <span className="animate-spin">⟳</span> : <span>🕷️</span>}
          {loading ? 'Scraping...' : 'Scrape'}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-400">
          {error}
        </div>
      )}

      {result && <ScraperResult result={result} />}

      {activeProject && activeProject.seoRecords.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-400">Scan History</h4>
          {activeProject.seoRecords.slice(0, 10).map((rec) => (
            <ScanHistoryRow key={rec.id} record={rec} />
          ))}
        </div>
      )}
    </div>
  );
}

function ScraperResult({ result }: { result: Record<string, unknown> }) {
  const score = result.score as number;
  const issues = (result.issues || []) as Array<{ severity: string; code: string; message: string }>;
  const recommendations = (result.recommendations || []) as Array<{ priority: string; category: string; action: string; impact: string }>;

  const scoreColor = score > 70 ? 'text-green-400' : score > 40 ? 'text-yellow-400' : 'text-red-400';
  const scoreBg = score > 70 ? 'bg-green-500/20' : score > 40 ? 'bg-yellow-500/20' : 'bg-red-500/20';

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-4 animate-in">
      {/* Score */}
      <div className="flex items-center gap-4">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${scoreBg}`}>
          <span className={`text-2xl font-bold font-mono ${scoreColor}`}>{score}</span>
        </div>
        <div>
          <div className="text-white font-medium text-sm">{(result.title as string) || 'No title'}</div>
          <div className="text-xs text-gray-400 mt-0.5">{(result.url as string)}</div>
          {(result.loadTime as number) && (
            <div className="text-xs text-gray-500 mt-0.5">⚡ {(result.loadTime as number) / 1000}s load time</div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Words', value: (result.wordCount as number) || 0 },
          { label: 'H1s', value: (result.h1s as string[])?.length || 0 },
          { label: 'Score', value: `${score}%` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white/5 rounded p-2 text-center">
            <div className="text-white font-bold font-mono text-sm">{value}</div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Issues */}
      {issues.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-gray-400 mb-2">Issues ({issues.length})</h5>
          <div className="space-y-1">
            {issues.map((issue, i) => (
              <div key={i} className={`text-xs px-2 py-1.5 rounded ${
                issue.severity === 'critical' ? 'bg-red-500/10 text-red-400 border-l-2 border-red-500' :
                issue.severity === 'warning' ? 'bg-yellow-500/10 text-yellow-400 border-l-2 border-yellow-500' :
                'bg-blue-500/10 text-blue-400 border-l-2 border-blue-500'
              }`}>
                <span className="font-mono text-[10px] mr-2">{issue.code}</span>
                {issue.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-gray-400 mb-2">Recommendations</h5>
          <div className="space-y-1.5">
            {recommendations.map((rec, i) => (
              <div key={i} className="text-xs bg-white/5 rounded p-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    rec.priority === 'high' ? 'bg-red-400' : rec.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                  }`} />
                  <span className="text-gray-400 text-[10px]">{rec.category}</span>
                  <span className={`ml-auto text-[10px] ${
                    rec.priority === 'high' ? 'text-red-400' : rec.priority === 'medium' ? 'text-yellow-400' : 'text-green-400'
                  }`}>{rec.priority}</span>
                </div>
                <div className="text-gray-200">{rec.action}</div>
                <div className="text-gray-500 text-[10px] mt-0.5">Impact: {rec.impact}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ScanHistoryRow({ record }: { record: ReturnType<typeof useStore.getState>['seoProjects'][0]['seoRecords'][0] }) {
  const scoreColor = record.score > 70 ? 'text-green-400' : record.score > 40 ? 'text-yellow-400' : 'text-red-400';
  return (
    <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
      <div className="flex-1 min-w-0">
        <div className="text-xs text-white truncate">{record.url}</div>
        <div className="text-[10px] text-gray-500">
          {new Date(record.scrapedAt).toLocaleString()} · {record.issues.length} issues
        </div>
      </div>
      <div className={`text-sm font-mono font-bold ml-3 ${scoreColor}`}>{record.score}%</div>
    </div>
  );
}
