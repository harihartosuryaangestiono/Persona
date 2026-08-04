import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { PersonaAIEngine } from '@/lib/services/persona-ai-engine';

// Helper function to process query using Google Gemini AI
async function queryGeminiAI(
  apiKey: string,
  prompt: string,
  data: {
    worklogs: any[];
    tasks: any[];
    clients: any[];
    users: any[];
  }
) {
  const systemInstruction = `PERSONA AI — SYSTEM PROMPT (ENTERPRISE BUSINESS INTELLIGENCE)
You are Persona AI, the dedicated Business Intelligence, Operations, and Analytics Assistant for Persona OS.
You are NOT a general AI chatbot. You are NOT an internet assistant. You are an Enterprise Operations Analyst that understands every operational process inside Persona OS.
Your knowledge comes ONLY from the Persona OS application and its production Supabase PostgreSQL database. The database is your ONLY source of truth.

PRIMARY OBJECTIVE:
Every answer MUST be based on the real production database. Never answer from memory. Never estimate. Never invent numbers. Never use templates. Never use mock data. Never generate fake statistics. Never hallucinate.
If requested information cannot be obtained from database, respond: "No matching records were found. The production database does not contain enough information to answer this question."

FUNCTION REGISTRY MANIFEST (AVAILABLE ANALYTICS TOOLS):
- getClientSummary(client, month, year): Client Executive Summary, total contents, status, budget remaining, top format, top editor.
- getCompanySummary(month, year): Company-wide operations summary, total contents, approval queue, overdue tasks, top client.
- getEmployeeSummary(employee, month, year): Individual performance, score, capacity %, active tasks, main client.
- getContentStatistics(format, client, month, year): Aggregates format breakdown, scores, top contributors.
- getBudgetAnalysis(client, month, year): Point budget usage %, remaining points, status alerts.
- getWorkloadAnalysis(month, year): Team workload ranking, capacity %, burnout risk detection.
- getAttendanceSummary(month, year): HR presence and approved leave count.
- comparePeriods(periodA, periodB): MoM trend comparison (contents, budget, completion time, score difference).
- getExecutiveDashboard(month, year): Auto monthly executive BI dashboard metrics.

ALIAS RESOLUTION RULES:
- BEGS -> Baking Empire Gading Serpong
- BEKG -> Baking Empire Kelapa Gading
- BEC8 -> Baking Empire Citra 8
- Baking Empire -> All Baking Empire Clients combined (unless specified)
- Dinda -> Dindong
- bulan ini -> Current Month (August 2026)
- bulan lalu -> Previous Month (July 2026)

JSON RESPONSE SCHEMA (MANDATORY OUTPUT FORMAT):
Output MUST be a single raw JSON object matching:
{
  "answerTitle": "Short title describing the analytical answer in Indonesian",
  "answerText": "Detailed executive answer in Indonesian formatted in clean markdown",
  "summaryCards": [
    { "label": "Card Label", "value": "Value", "badge": "Optional Badge", "color": "emerald" }
  ],
  "autoInsights": [
    "Insight bullet 1 supported 100% by calculations",
    "Insight bullet 2 supported 100% by calculations"
  ],
  "recommendations": [
    "Data-driven operational recommendation 1"
  ],
  "reasoning": {
    "period": "Period analyzed (e.g. August 2026)",
    "calculation": "FunctionRegistry tool & SQL logic executed",
    "recordsFound": 10,
    "source": "Supabase Production Database via Gemini AI Copilot"
  }
}`;

  const dbContext = `LIVE SUPABASE DATABASE CONTEXT:
- Clients (${data.clients.length}): ${JSON.stringify(data.clients.map((c) => ({ id: c.id, name: c.name, budget: c.monthlyPointBudget, used: c.usedPoint })))}
- Users (${data.users.length}): ${JSON.stringify(data.users.map((u) => ({ id: u.id, name: u.name, roles: u.roles })))}
- Worklogs (${data.worklogs.length} items): ${JSON.stringify(data.worklogs.slice(0, 100).map((w) => ({ title: w.contentTitle, client: w.clientName, user: w.userName, format: w.format, taskType: w.taskType, score: w.score, date: w.date, month: w.month, year: w.year, status: w.status })))}
- Tasks (${data.tasks.length} items): ${JSON.stringify(data.tasks.slice(0, 100).map((t) => ({ title: t.title, client: t.clientName, priority: t.priority, deadline: t.deadline, status: t.status, score: t.score, month: t.month, year: t.year })))}

USER QUESTION: "${prompt}"`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemInstruction },
              { text: dbContext }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API HTTP Error ${response.status}: ${errText}`);
  }

  const jsonResult = await response.json();
  const textOutput = jsonResult.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOutput) {
    throw new Error('Empty output received from Gemini API');
  }

  return JSON.parse(textOutput);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, actionType, month = 'August', year = 2026 } = body;

    // Fetch live database records from Prisma / Supabase
    const [worklogs, tasks, clients, users, budgets, attendances, leaves] = await Promise.all([
      prisma.worklog.findMany({ orderBy: { date: 'desc' } }),
      prisma.task.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.client.findMany({ orderBy: { name: 'asc' } }),
      prisma.user.findMany({ orderBy: { name: 'asc' } }),
      prisma.clientMonthlyBudget.findMany(),
      prisma.attendance.findMany({ orderBy: { date: 'desc' } }),
      prisma.leaveRequest.findMany({ orderBy: { startDate: 'desc' } }),
    ]);

    // Map Prisma models to application type format
    const formattedLogs: any[] = worklogs.map((w) => ({
      ...w,
      date: w.date ? w.date.toISOString() : new Date().toISOString(),
      deadline: w.deadline ? w.deadline.toISOString() : '',
      stages: w.stages ? JSON.parse(w.stages) : null,
    }));

    const formattedTasks: any[] = tasks.map((t) => ({
      ...t,
      postingDate: t.postingDate ? t.postingDate.toISOString() : null,
      deadline: t.deadline ? t.deadline.toISOString() : null,
      createdAt: t.createdAt ? t.createdAt.toISOString() : new Date().toISOString(),
      stages: t.stages ? JSON.parse(t.stages) : null,
    }));

    const formattedClients: any[] = clients.map((c) => ({
      ...c,
      usedPoint: c.usedPoint || 0,
      monthlyPointBudget: c.monthlyPointBudget || 5000,
    }));

    const formattedUsers: any[] = users.map((u) => ({
      ...u,
      roles: u.roles ? (typeof u.roles === 'string' ? JSON.parse(u.roles) : u.roles) : ['Editor'],
    }));

    if (actionType === 'executive-summary') {
      const summary = PersonaAIEngine.getExecutiveSummary(
        formattedLogs,
        formattedTasks,
        formattedClients,
        formattedUsers,
        budgets as any,
        attendances as any,
        leaves as any,
        month,
        year
      );
      return NextResponse.json({ summary });
    }

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    // If Gemini API Key is available, use Gemini Copilot LLM!
    if (geminiKey && geminiKey.trim() !== '') {
      try {
        const geminiResult = await queryGeminiAI(geminiKey, prompt, {
          worklogs: formattedLogs,
          tasks: formattedTasks,
          clients: formattedClients,
          users: formattedUsers,
        });
        return NextResponse.json({ ...geminiResult, provider: 'Google Gemini AI Copilot' });
      } catch (geminiErr: any) {
        console.warn('Gemini API call failed, falling back to PersonaAIEngine:', geminiErr.message);
      }
    }

    // Fallback to local PersonaAIEngine
    const response = PersonaAIEngine.processQuery(
      prompt,
      formattedLogs,
      formattedTasks,
      formattedClients,
      formattedUsers,
      budgets as any,
      attendances as any,
      leaves as any
    );

    return NextResponse.json({ ...response, provider: 'Supabase Database Engine' });
  } catch (error: any) {
    console.error('Error executing Persona AI database query:', error);
    return NextResponse.json({ error: 'Failed to process Persona AI query', message: error.message }, { status: 500 });
  }
}
