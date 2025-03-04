import { NextResponse } from "next/server"
import { normalizeText } from "@/app/utils/normalizeText"
import { createClient } from "@supabase/supabase-js"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = createClient(supabaseUrl, supabaseKey)

// Caché con tiempo de expiración
const cache = new Map<string, { value: string, timestamp: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 horas

// Limpiar caché antigua
function cleanupCache() {
  const now = Date.now()
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      cache.delete(key)
    }
  }
}

// Ejecutar limpieza cada hora
setInterval(cleanupCache, 60 * 60 * 1000)

export async function POST(request: Request) {
  try {
    const { text } = await request.json()
    console.log("Texto recibido:", text)

    if (!text) {
      console.log("Texto vacío recibido")
      return NextResponse.json({ error: "Se requiere el texto a traducir" }, { status: 400 })
    }

    const normalizedText = normalizeText(text.toLowerCase())
    console.log("Texto normalizado:", normalizedText)

    // Verificar caché
    if (cache.has(normalizedText)) {
      console.log("Traducción encontrada en caché")
      const cachedTranslation = cache.get(normalizedText)
      return NextResponse.json({ translation: cachedTranslation?.value })
    }

    // Dividir el texto en oraciones
    const sentences = normalizedText.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const translatedSentences = []

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim()
      
      // 1. Intentar traducir la oración completa
      const { data: sentenceData } = await supabase
        .from("translations")
        .select("zapotec")
        .eq("spanish", trimmedSentence)
        .single()

      if (sentenceData?.zapotec) {
        translatedSentences.push(sentenceData.zapotec)
        continue
      }

      // 2. Buscar frases comunes (n-gramas)
      const words = trimmedSentence.split(" ")
      let translatedWords = [...words]
      
      // Buscar frases de 3, 2 palabras
      for (let n = Math.min(5, words.length); n >= 2; n--) {
        for (let i = 0; i <= words.length - n; i++) {
          const phrase = words.slice(i, i + n).join(" ")
          
          const { data: phraseData } = await supabase
            .from("translations")
            .select("zapotec")
            .eq("spanish", phrase)
            .single()
            
          if (phraseData?.zapotec) {
            // Reemplazar las palabras individuales con la frase traducida
            for (let j = 0; j < n; j++) {
              translatedWords[i + j] = j === 0 ? phraseData.zapotec : null
            }
            // Eliminar los nulls después
            translatedWords = translatedWords.filter(w => w !== null)
          }
        }
      }
      
      // 3. Traducir palabras individuales que no forman parte de frases
      translatedWords = await Promise.all(
        translatedWords.map(async (word, index) => {
          // Si no es una palabra original (ya fue traducida como parte de una frase)
          if (word !== words[index]) {
            return word
          }
          
          const { data } = await supabase
            .from("translations")
            .select("zapotec")
            .eq("spanish", word)
            .single()
            
          return data?.zapotec || word
        })
      )
      
      translatedSentences.push(translatedWords.join(" "))
    }

    const translatedText = translatedSentences.join(". ")
    console.log("Texto traducido:", translatedText)

    // Guardar en caché
    cache.set(normalizedText, { 
      value: translatedText, 
      timestamp: Date.now() 
    })

    return NextResponse.json({ translation: translatedText })
  } catch (error) {
    console.error("Error en la traducción:", error)
    return NextResponse.json({ error: "Error al traducir el texto" }, { status: 500 })
  }
}