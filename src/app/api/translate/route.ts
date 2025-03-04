import { NextResponse } from "next/server"
import { normalizeText } from "@/app/utils/normalizeText"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = createClient(supabaseUrl, supabaseKey)

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

async function translatePhrase(phrase: string): Promise<string> {
  // Buscar en frases comunes
  const { data: phraseData } = await supabase
    .from("common_phrases")
    .select("zapotec_phrase")
    .eq("spanish_phrase", phrase)
    .single()

  if (phraseData?.zapotec_phrase) {
    return phraseData.zapotec_phrase
  }

  // Si no se encuentra como frase, traducir palabra por palabra
  const words = phrase.split(" ")
  const translatedWords = await Promise.all(words.map(async (word) => {
    const { data } = await supabase
      .from("translations")
      .select("zapotec")
      .eq("spanish", word)
      .single()
    
    return data?.zapotec || word
  }))

  return translatedWords.join(" ")
}

export async function POST(request: Request) {
  try {
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