import { NextRequest, NextResponse } from 'next/server';

// In-memory store for cross-session project persistence
// This supplements localStorage for server-side access
const projectsDb: Record<string, object> = {};

export async function GET() {
  return NextResponse.json({ projects: Object.values(projectsDb) });
}

export async function POST(req: NextRequest) {
  try {
    const project = await req.json();
    if (!project.id || !project.name || !project.url) {
      return NextResponse.json({ error: 'id, name, url required' }, { status: 400 });
    }
    projectsDb[project.id] = project;
    return NextResponse.json({ ok: true, project });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    delete projectsDb[id];
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
