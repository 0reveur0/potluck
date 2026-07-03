import { NextResponse } from 'next/server'

type QuizQuestion = {
  id: number
  question: string
  options: string[]
  correct_answer: string
  explanation: string
}

const ROADMAP_MODEL = 'gemini-1.5-flash'
const OPENAI_MODEL = 'gpt-4o-mini'
const MAX_OUTPUT_TOKENS = 400

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

function validateQuizOutput(value: any): QuizQuestion[] {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new Error('Expected an array with exactly 3 quiz questions.')
  }

  value.forEach((item: any, index: number) => {
    if (typeof item !== 'object' || item === null) {
      throw new Error(`Question ${index + 1} must be an object.`)
    }
    if (typeof item.id !== 'number') {
      throw new Error(`Question ${index + 1} must include a numeric id.`)
    }
    if (typeof item.question !== 'string') {
      throw new Error(`Question ${index + 1} must include a question string.`)
    }
    if (!Array.isArray(item.options) || item.options.length !== 4 || item.options.some((option: any) => typeof option !== 'string')) {
      throw new Error(`Question ${index + 1} must include exactly 4 string options.`)
    }
    if (typeof item.correct_answer !== 'string') {
      throw new Error(`Question ${index + 1} must include a correct_answer string.`)
    }
    if (typeof item.explanation !== 'string') {
      throw new Error(`Question ${index + 1} must include an explanation string.`)
    }
  })

  return value as QuizQuestion[]
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

  const { topic_name } = payload ?? {}
  if (!topic_name || typeof topic_name !== 'string') {
    return NextResponse.json({ error: 'Request body must contain topic_name as a string.' }, { status: 400 })
  }

  const prompt = `You are a friendly baking-themed mentor. Generate EXACTLY 3 multiple-choice questions for the topic: ${topic_name}. Return ONLY raw JSON formatted as an array like this:
[
  {
    "id": 1,
    "question": "Question text?",
    "options": ["A", "B", "C", "D"],
    "correct_answer": "Exact string match of correct option",
    "explanation": "Warm, encouraging bakery-themed mentoring response."
  }
]

Do not include markdown fences, commentary, or any extra keys. Keep the explanation warm, encouraging, and bakery-themed.`

  let rawResponse: string
  try {
    rawResponse = await getModelResponse(prompt)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'LLM request failed.' }, { status: 502 })
  }

  const sanitized = sanitizeJsonText(rawResponse)
  let parsed: QuizQuestion[]
  try {
    parsed = validateQuizOutput(JSON.parse(sanitized))
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Unable to parse valid quiz JSON from AI response.', details: error?.message ?? 'Unknown parse error.' },
      { status: 502 }
    )
  }

  return NextResponse.json(parsed)
}
