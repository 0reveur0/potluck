import { NextResponse } from 'next/server'

type RoadmapResource = {
  source: string
  keyword: string
}

type RoadmapStep = {
  step: number
  title: string
  duration: string
  skills: string[]
  resources: RoadmapResource[]
}

type RoadmapOutput = {
  similarity_score: number
  analysis_summary: string
  roadmap: RoadmapStep[]
}

const ROADMAP_MODEL = 'gemini-1.5-flash'
const OPENAI_MODEL = 'gpt-4o-mini'
const MAX_OUTPUT_TOKENS = 500

function sanitizeJsonText(raw: string) {
  let text = raw.trim()
  text = text.replace(/^```\s*(json)?\s*/gi, '')
  text = text.replace(/```$/g, '')
  text = text.replace(/^json\s*/i, '')

  const match = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/m)
  return match ? match[1].trim() : text
}

function extractTextFromResponse(response: any): string {
  if (!response) return ''
  if (typeof response === 'string') return response
  if (typeof response.output_text === 'string') return response.output_text
  if (typeof response.text === 'string') return response.text
  if (Array.isArray(response.output)) {
    return response.output
      .map((item: any) => {
        if (typeof item === 'string') return item
        if (Array.isArray(item.content)) {
          return item.content.map((content: any) => content?.text ?? '').join('')
        }
        return item?.text ?? ''
      })
      .join(' ')
  }
  if (Array.isArray(response.candidates)) {
    return response.candidates
      .map((candidate: any) => {
        if (typeof candidate === 'string') return candidate
        if (Array.isArray(candidate.content)) {
          return candidate.content.map((content: any) => content?.text ?? '').join('')
        }
        return candidate?.text ?? ''
      })
      .join(' ')
  }
  return JSON.stringify(response)
}

async function getModelResponse(prompt: string): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY
  const openAiKey = process.env.OPENAI_API_KEY
  const apiKey = geminiKey ?? openAiKey
  if (!apiKey) {
    throw new Error('Missing LLM API key. Set GEMINI_API_KEY or OPENAI_API_KEY.')
  }

  if (geminiKey) {
    const google = await import('@google/genai')
    const GoogleGenAI = (google.GoogleGenAI ?? google.default ?? google) as any
    const client = new GoogleGenAI({ apiKey: geminiKey })
    const response = await client.responses.create({
      model: ROADMAP_MODEL,
      input: prompt,
      temperature: 0.2,
      max_output_tokens: MAX_OUTPUT_TOKENS,
    })
    return extractTextFromResponse(response)
  }

  const openai = await import('openai')
  const OpenAI = (openai.default ?? openai) as any
  const client = new OpenAI({ apiKey: openAiKey })
  const response = await client.responses.create({
    model: OPENAI_MODEL,
    input: prompt,
    temperature: 0.2,
    max_output_tokens: MAX_OUTPUT_TOKENS,
  })
  return extractTextFromResponse(response)
}

function validateRoadmapOutput(value: any): RoadmapOutput {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Expected an object for roadmap output.')
  }
  if (typeof value.similarity_score !== 'number') {
    throw new Error('Expected similarity_score to be a number.')
  }
  if (typeof value.analysis_summary !== 'string') {
    throw new Error('Expected analysis_summary to be a string.')
  }
  if (!Array.isArray(value.roadmap) || value.roadmap.length !== 4) {
    throw new Error('Expected roadmap to be an array with exactly 4 steps.')
  }

  value.roadmap.forEach((step: any, index: number) => {
    if (typeof step !== 'object' || step === null) {
      throw new Error(`Roadmap step ${index + 1} must be an object.`)
    }
    if (typeof step.step !== 'number') {
      throw new Error(`Roadmap step ${index + 1} must include a numeric step value.`)
    }
    if (typeof step.title !== 'string') {
      throw new Error(`Roadmap step ${index + 1} must include a title string.`)
    }
    if (typeof step.duration !== 'string') {
      throw new Error(`Roadmap step ${index + 1} must include a duration string.`)
    }
    if (!Array.isArray(step.skills) || step.skills.some((skill: any) => typeof skill !== 'string')) {
      throw new Error(`Roadmap step ${index + 1} must include an array of skill strings.`)
    }
    if (!Array.isArray(step.resources)) {
      throw new Error(`Roadmap step ${index + 1} must include a resources array.`)
    }
    step.resources.forEach((resource: any, resourceIndex: number) => {
      if (typeof resource !== 'object' || resource === null) {
        throw new Error(`Roadmap step ${index + 1} resource ${resourceIndex + 1} must be an object.`)
      }
      if (typeof resource.source !== 'string' || typeof resource.keyword !== 'string') {
        throw new Error(`Roadmap step ${index + 1} resource ${resourceIndex + 1} must include source and keyword strings.`)
      }
    })
  })

  return value as RoadmapOutput
}

export async function POST(request: Request) {
  if (request.headers.get('content-type')?.includes('application/json') === false) {
    return NextResponse.json({ error: 'Expected application/json content type.' }, { status: 400 })
  }

  let payload: any
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Unable to parse JSON body.' }, { status: 400 })
  }

  const { current_job, target_job, hours_per_day } = payload ?? {}
  if (!current_job || !target_job || !hours_per_day) {
    return NextResponse.json(
      { error: 'Request body must contain current_job, target_job, and hours_per_day.' },
      { status: 400 }
    )
  }

  const prompt = `You are a career roadmap assistant. Return ONLY raw JSON that exactly matches the schema below. Do not wrap the response in markdown, code fences, explanations, or any additional text. If you must include JSON fences, strip them in the final output.

Response schema:
{
  "similarity_score": 45,
  "analysis_summary": "Concise paragraph on career shift feasibility.",
  "roadmap": [
    {
      "step": 1,
      "title": "Phase Title",
      "duration": "e.g., 3 weeks",
      "skills": ["Skill A", "Skill B"],
      "resources": [
        {"source": "YouTube", "keyword": "search keywords"},
        {"source": "Coursera", "keyword": "search keywords"}
      ]
    }
  ]
}

Generate exactly 4 roadmap steps. Use the incoming values to customize the output.

Input:
current_job: ${current_job}
target_job: ${target_job}
hours_per_day: ${hours_per_day}

Make the analysis summary concise and actionable. Make the roadmap practical, with a warm coaching tone.`

  let rawResponse: string
  try {
    rawResponse = await getModelResponse(prompt)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'LLM request failed.' }, { status: 502 })
  }

  const sanitized = sanitizeJsonText(rawResponse)
  let parsed: RoadmapOutput
  try {
    parsed = validateRoadmapOutput(JSON.parse(sanitized))
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Unable to parse valid roadmap JSON from AI response.', details: error?.message ?? 'Unknown parse error.' },
      { status: 502 }
    )
  }

  return NextResponse.json(parsed)
}
