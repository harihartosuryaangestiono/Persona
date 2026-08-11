import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { PersonaAIEngine, PersonaAIQueryExecutor, QueryPlan, QueryExecutionResult } from '@/lib/services/persona-ai-engine';

// Call 1: Parse user prompt to a structured query plan JSON
async function parseIntentAndKeywordsWithGemini(
  apiKey: string,
  prompt: string,
  history: Array<{ sender: string; text: string }> = []
): Promise<QueryPlan> {
  const historyText = history.length > 0 
    ? "RECENT CONVERSATION HISTORY:\n" + history.slice(-6).map(h => `${h.sender.toUpperCase()}: ${h.text}`).join('\n')
    : "NO RECENT HISTORY";

  const systemInstruction = `You are a query parser for Persona OS. Your job is to translate a user's natural language question into a structured JSON query plan.
  
  Today's reference date is Tuesday, August 11, 2026.
  
  Determine:
  1. "intent": One of:
     - "CONTENT_COUNT": If counting contents/reels/carousels/story/grafis/tasks/worklogs.
     - "CLIENT_BUDGET": If budget, used points, remaining points, over budget, point limit.
     - "EMPLOYEE_WORKLOAD": If editor workload, employee points, busiest team member, capacity %, cost/COGS of employee.
     - "HR_ATTENDANCE": If attendance, leaves, approved leave requests, days worked.
     - "COMPARISON": If comparison between periods (e.g. Juli vs Agustus).
     - "EXECUTIVE_SUMMARY": If summary of a client or general company summary.
     - "GENERAL_SEARCH": General search/fallback.
  2. "clientKeyword": Brand names or client keywords mentioned (e.g., "BEGS", "Baking Empire", "Karihome"). Do not map to IDs, just extract the keyword/phrase.
  3. "employeeKeyword": Team member names or employee keywords mentioned (e.g., "Jabin", "Dinda", "Dindong").
  4. "dateKeyword": Exact date expression or period mentioned (e.g. "Agustus", "Agustus 2026", "bulan lalu", "kemarin"). Use this to capture the target period context.
  5. "format": Format filter mentioned (e.g., "Reels", "Carousel", "Single Foto", "Story Video", "Grafis").
  6. "status": Status filter mentioned (e.g., "Posted", "Editing", "Revision", "Approval").
  7. "category": Category of task/work (e.g. "Editor", "Assistant", "Strategic", "Scheduler").
  8. "taskType": Task type filter (e.g. "Editing", "Revisi", "Scheduling").
  9. "metric": "COUNT", "SUM_SCORE", "BUDGET_USAGE", "RANKING_BUSIEST", "RANKING_BUDGET", "ATTENDANCE_COUNT", "LEAVE_COUNT", or "ALL".
  10. "dateFilterType": If the query specifically refers to a date type:
      - "postingDate" for post dates/posting contents (e.g. "berapa reels posted...").
      - "deadline" for overdue/deadline tracking (e.g. "task yang overdue").
      - "worklogDate" for work/activity date (e.g. "kerjaan Anggi tanggal 5").
      - "createdDate" for task creation (e.g. "task dibuat minggu ini").
      - Otherwise default to null or let system resolve.

  ${historyText}

  If the question is a follow-up to previous messages (e.g. "Kalau Juli?", "Kalau Jabin?"), use the history context to fill in the missing fields (e.g. keeping the client or format filters from earlier questions).
  
  Return a single raw JSON object matching the QueryPlan schema. Do not output any other text or markdown block outside JSON.`;

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
              { text: `USER QUESTION: "${prompt}"` }
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
    throw new Error(`Gemini API Error ${response.status}: ${errText}`);
  }

  const jsonResult = await response.json();
  const text = jsonResult.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Empty response from Gemini');
  }
  return JSON.parse(text);
}

// Call 2: Explain and format verified calculations
async function explainAndFormatResultsWithGemini(
  apiKey: string,
  prompt: string,
  plan: QueryPlan,
  result: QueryExecutionResult
): Promise<any> {
  const systemInstruction = `You are Persona AI, a dedicated Business Intelligence & Operations Analyst for Persona OS.
  Your job is to explain the verified database query results to the user in a natural, conversational manner.
  Think of yourself as a smart operational partner, not a static report generator.

  🚨 CRITICAL DIRECTIVES & RULES:

  1. ANSWER THE USER'S EXACT QUESTION FIRST:
     The very first sentence of "answerText" must directly answer the user's question (e.g. "Baking Empire Gading Serpong memiliki 12 Reels pada Agustus 2026."). Do not say "Berikut adalah...", "Berdasarkan analisis...", or similar fluff. Never make the user search through a report to find the answer.

  2. ADAPT LENGTH TO COMPLEXITY:
     - Simple Question: Provide a direct answer (1 sentence) + brief breakdown (relevant metrics or status). Keep it extremely concise and do not generate a long report.
     - Comparison: Show values for both periods, calculation of difference, and growth/decrease percentage.
     - Summary Request: Show structured summary sections (Content, Points, Workflow, Team) using bullet lists.

  3. NO UNRELATED DATA:
     Only show data relevant to the resolved client, employee, and format. Never show other brands/people unless explicitly asked for a ranking/comparison.

  4. STATUSES ARE IMMUTABLE AND MUST COME FROM CODE:
     You must use the calculated statuses provided in the VERIFIED DATABASE RESULTS. Do not invent or decide a status:
     - Budget Status: Use result.clientBudgetStatusString (which outputs "🔴 OVER BUDGET\\n[X] pts over budget\\n[Y]% above budget" or "🟢 WITHIN BUDGET").
     - Workload Status: Use result.employeeWorkloadStatusString (which outputs "OVERLOAD", "BUSY", or "HEALTHY").
     Explain these statuses, but do not change them.

  5. NUMBERS ARE IMMUTABLE:
     Never round, change, estimate, or invent values. If the database returned 1935, use 1935.

  6. ZERO DATA HANDLING:
     - If result.recordsAnalyzed === 0:
       * If result.clientLabel and result.clientLabel !== 'All Clients': answerText must be exactly: "Client ditemukan, tetapi tidak ada content yang tercatat pada periode tersebut."
       * Otherwise: answerText must be exactly: "Belum ada data yang tercatat untuk filter tersebut."
     - If the result success is false or indicates client not found:
       * Just return the exact alert message provided.

  7. SHOWING RECORDS (LIST/TABLE REQUESTS):
     If the user asks to "tampilkan kontennya", "list", or "lihat daftarnya", output a clean markdown table:
     | # | Title | Format | Date | PIC | Status | Points |
     Use the content items provided in results.contentsList.

  8. ANSWER FORMAT (SIMPLE/ANALYTICAL):
     Always structure simple analytical questions like this:
     ### Answer
     [Direct Answer]
     
     ### Breakdown
     [Brief list of only relevant metrics, e.g.:
      - Status/workflow count
      - Total points
      - Budget status]

     <details>
     <summary>Analysis Based On</summary>
     Client: [Resolved Client Name]
     Period: [Resolved Period]
     Format: [Resolved Format]
     Unique contents: [Unique Content Count]
     Calculation: [Calculation Logic, e.g. COUNT DISTINCT contentId]
     Source: Supabase Production Database
     </details>

  9. SUMMARY REQUEST FORMAT:
     If the user requests a summary (e.g. "Ringkasan Baking Empire bulan Juni"), structure it exactly like this:
     # [Client Name] — [Period]
     ### Content
     - Total Content: [X]
     - Reels: [X] (if any)
     ...
     ### Points
     - Used: [X] pts
     - Budget: [X] pts
     - Remaining: [X] pts
     - Utilization: [X]%
     ### Workflow
     - [Status]: [Count]
     ### Team
     - Top contributor: [Name]
     - Total employee points: [X] pts

  10. RANKING REQUEST FORMAT:
      Use markdown tables:
      | Rank | Client | Used | Budget | Usage |
      Or:
      | Rank | Employee | Total Points | Capacity Usage | COGS |
      Identify sorting clearly (e.g. "Ranking berdasarkan persentase penggunaan budget" or "Ranking berdasarkan total points").

  11. LANGUAGE:
      - Default to Indonesian.
      - If user asks in English, respond in English.
      - If user mixes English and Indonesian, use natural Indonesian with common business terms (e.g. "Totalnya ada 18 Reels", "Budget usage bulan ini 72%").

  OUTPUT FORMAT:
  Output must be a single raw JSON object matching this schema. Do not output markdown codeblocks around the JSON:
  {
    "answerTitle": "Short descriptive title",
    "answerText": "Markdown response string following all the formatting rules above. Output HTML tags like details/summary exactly.",
    "summaryCards": [
       { "label": "Card Label", "value": "Value", "badge": "Optional Badge", "color": "emerald" } // color can be 'emerald', 'red', 'amber', 'neutral'
    ],
    "autoInsights": [
       "Bullet insight 1",
       "Bullet insight 2"
    ],
    "recommendations": [
       "Recommendation 1"
    ],
    "reasoning": {
       "period": "[Period]",
       "calculation": "[Calculation description]",
       "recordsFound": [count],
       "source": "Supabase Production Database"
    }
  }`;

  const dbContext = `VERIFIED DATABASE RESULTS:
  - Intent: ${result.intent}
  - Client: ${result.clientLabel}
  - Employee: ${result.employeeLabel}
  - Period: ${result.periodLabel}
  - Format: ${result.formatLabel}
  - Status: ${result.statusLabel}
  - Records Analyzed: ${result.recordsAnalyzed}
  - Worklogs Checked: ${result.worklogCount}
  - Tasks Checked: ${result.taskCount}
  - Unique Content Count: ${result.uniqueContentCount}
  
  - Employee Points: ${result.employeePoints !== undefined ? result.employeePoints : 'N/A'}
  - Employee Capacity: ${result.employeeCapacity !== undefined ? result.employeeCapacity : 'N/A'}
  - Employee Capacity Usage: ${result.employeeCapacityPct !== undefined ? result.employeeCapacityPct + '%' : 'N/A'}
  - Employee COGS: ${result.employeeCOGS !== undefined ? 'Rp ' + result.employeeCOGS.toLocaleString() : 'N/A'}
  - Employee Workload Status: ${result.employeeWorkloadStatusString !== undefined ? result.employeeWorkloadStatusString : 'N/A'}
  
  - Client Budget: ${result.clientBudget !== undefined ? result.clientBudget : 'N/A'}
  - Client Used Points: ${result.clientUsed !== undefined ? result.clientUsed : 'N/A'}
  - Client Remaining Budget: ${result.clientRemaining !== undefined ? result.clientRemaining : 'N/A'}
  - Client Budget Usage %: ${result.clientUsagePct !== undefined ? result.clientUsagePct + '%' : 'N/A'}
  - Client Overage Points: ${result.clientOverage !== undefined ? result.clientOverage : 'N/A'}
  - Client Overage %: ${result.clientOveragePct !== undefined ? result.clientOveragePct + '%' : 'N/A'}
  - Client Budget Status: ${result.clientBudgetStatusString !== undefined ? result.clientBudgetStatusString : 'N/A'}
  
  - Format Breakdown: ${JSON.stringify(result.formatBreakdown)}
  - Status Breakdown: ${JSON.stringify(result.statusBreakdown)}
  - Team Rankings: ${JSON.stringify(result.teamRankings)}
  - Client Rankings: ${JSON.stringify(result.clientRankings)}
  - Comparison Stats: ${JSON.stringify(result.comparison)}
  - Contents List: ${JSON.stringify(result.contentsList || [])}
  
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
    throw new Error(`Gemini API Error ${response.status}: ${errText}`);
  }

  const jsonResult = await response.json();
  const text = jsonResult.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Empty response from Gemini');
  }
  return JSON.parse(text);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, actionType, month = 'August', year = 2026, history = [] } = body;

    // Fetch live database records from Prisma / Supabase (including MasterScore)
    const [worklogs, tasks, clients, users, budgets, attendances, leaves, masterScores] = await Promise.all([
      prisma.worklog.findMany({ orderBy: { date: 'desc' } }),
      prisma.task.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.client.findMany({ orderBy: { name: 'asc' } }),
      prisma.user.findMany({ orderBy: { name: 'asc' } }),
      prisma.clientMonthlyBudget.findMany(),
      prisma.attendance.findMany({ orderBy: { date: 'desc' } }),
      prisma.leaveRequest.findMany({ orderBy: { startDate: 'desc' } }),
      prisma.masterScore.findMany(),
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

    const formattedMasterScores: any[] = masterScores.map((ms) => ({
      ...ms,
      category: ms.category as any,
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

    // Use Gemini pipeline if key is available
    if (geminiKey && geminiKey.trim() !== '') {
      try {
        // Stage 1: Parse intent & extract keywords
        const queryPlan = await parseIntentAndKeywordsWithGemini(geminiKey, prompt, history);

        // Stage 2 & 3: Run entity matching & TypeScript calculation engine
        const executionResult = PersonaAIQueryExecutor.execute(
          queryPlan,
          formattedLogs,
          formattedTasks,
          formattedClients,
          formattedUsers,
          budgets as any,
          attendances as any,
          leaves as any,
          formattedMasterScores
        );

        // If query plan resolution indicates an ambiguity, return the clarification directly
        if (!executionResult.success && executionResult.alerts?.[0]) {
          return NextResponse.json({
            answerTitle: 'Klarifikasi Kueri',
            answerText: executionResult.alerts[0],
            summaryCards: [],
            autoInsights: [],
            reasoning: {
              period: executionResult.periodLabel,
              calculation: 'Ambiguity Resolution',
              recordsFound: 0,
              source: 'Persona AI Copilot'
            },
            provider: 'Google Gemini AI Copilot'
          });
        }

        // Stage 4: Formulate explainable response based on verified details
        const geminiResult = await explainAndFormatResultsWithGemini(geminiKey, prompt, queryPlan, executionResult);
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
      leaves as any,
      formattedMasterScores
    );

    return NextResponse.json({ ...response, provider: 'Supabase Database Engine' });
  } catch (error: any) {
    console.error('Error executing Persona AI database query:', error);
    return NextResponse.json({ error: 'Failed to process Persona AI query', message: error.message }, { status: 500 });
  }
}
