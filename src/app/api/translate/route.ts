import { NextResponse } from "next/server"
import { normalizeText } from "@/app/utils/normalizeText"
import { createClient } from "@supabase/supabase-js"
import cors from 'cors'

// Configuración de CORS
const corsMiddleware = cors({
  origin: ['https://didxa-link.vercel.app', 'http://localhost:3000'], // Añade aquí los orígenes permitidos
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
})

// Función para aplicar CORS
function runMiddleware(req: Request, res: NextResponse, fn: Function) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result)
      }
      return resolve(result)
    })
  })
}

// Cache implementation
const cache = new Map<string, { value: string, timestamp: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 horas

function cleanupCache() {
  const now = Date.now()
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      cache.delete(key)
    }
  }
}

setInterval(cleanupCache, 60 * 60 * 1000)

// Inicialización de Supabase
let supabase: ReturnType<typeof createClient> | null = null

function initSupabase() {
  if (supabase) return supabase

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }

  supabase = createClient(supabaseUrl, supabaseKey)
  return supabase
}

// Definir el tipo para los datos de la frase
type PhraseData = {
  zapotec_phrase: string | null;
}

// Definir el tipo para los datos de la traducción
type TranslationData = {
  zapotec: string | null;
}

async function translatePhrase(phrase: string): Promise<string> {
  const db = initSupabase()
  // Buscar en frases comunes
  const { data: phraseData } = await db
    .from("common_phrases")
    .select("zapotec_phrase")
    .eq("spanish_phrase", phrase)
    .single()

  if (phraseData && phraseData.zapotec_phrase) {
    return phraseData.zapotec_phrase
  }

  // Si no se encuentra como frase, traducir palabra por palabra
  const words = phrase.split(" ")
  const translatedWords = await Promise.all(words.map(async (word) => {
    const { data } = await db
      .from("translations")
      .select("zapotec")
      .eq("spanish", word)
      .single()
    
    return (data as TranslationData | null)?.zapotec || word
  }))

  return translatedWords.join(" ")
}

export async function POST(request: Request) {
  // Aplicar CORS
  await runMiddleware(request, NextResponse.next(), corsMiddleware)

  try {
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL)
    console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '[EXISTS]' : '[MISSING]')

    const { text } = await request.json()
    console.log("Texto recibido:", text)

    if (!text) {
      console.log("Texto vacío recibido")
      return NextResponse.json({ error: "Se requiere el texto a traducir" }, { status: 400 })
    }

    const normalizedText = normalizeText(text)
    console.log("Texto normalizado:", normalizedText)

    if (cache.has(normalizedText)) {
      console.log("Traducción encontrada en caché")
      const cachedTranslation = cache.get(normalizedText)
      return NextResponse.json({ translation: cachedTranslation?.value })
    }

    // Dividir el texto en frases
    const phrases = normalizedText.split(" ")
    let translatedPhrases = []
    let currentPhrase = []

    for (const word of phrases) {
      currentPhrase.push(word)
      const phraseToTranslate = currentPhrase.join(" ")
      const translatedPhrase = await translatePhrase(phraseToTranslate)

      if (translatedPhrase !== phraseToTranslate) {
        translatedPhrases.push(translatedPhrase)
        currentPhrase = []
      } else if (currentPhrase.length > 3) {
        // Si la frase actual es muy larga y no se ha encontrado traducción, traducir palabra por palabra
        const wordByWordTranslation = await translatePhrase(word)
        translatedPhrases.push(wordByWordTranslation)
        currentPhrase = []
      }
    }

    // Traducir cualquier palabra restante
    if (currentPhrase.length > 0) {
      const remainingTranslation = await translatePhrase(currentPhrase.join(" "))
      translatedPhrases.push(remainingTranslation)
    }

    const translatedText = translatedPhrases.join(" ")
    console.log("Texto traducido:", translatedText)

    // Restaurar la puntuación original
    const finalTranslation = restorePunctuation(text, translatedText)

    cache.set(normalizedText, { 
      value: finalTranslation, 
      timestamp: Date.now() 
    })

    return NextResponse.json({ translation: finalTranslation })
  } catch (error) {
    console.error("Error en la traducción:", error)
    return NextResponse.json({ error: "Error al traducir el texto" }, { status: 500 })
  }
}

// Añadir manejo de OPTIONS para preflight requests
export async function OPTIONS(request: Request) {
  const response = NextResponse.next()
  await runMiddleware(request, response, corsMiddleware)
  return response
}

function restorePunctuation(original: string, translated: string): string {
  const punctuation = original.match(/[.,\/#!$%\^&\*;:{}=\-_`~()¿?¡!]/g) || []
  let result = translated
  
  punctuation.forEach(punct => {
    const index = original.indexOf(punct)
    if (index !== -1) {
      result = result.slice(0, index) + punct + result.slice(index)
    }
  })

  return result
}