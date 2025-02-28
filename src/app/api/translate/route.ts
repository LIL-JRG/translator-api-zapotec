import { NextResponse } from "next/server"
import { normalizeText } from "@/app/utils/normalizeText"
import { createClient } from "@supabase/supabase-js"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = createClient(supabaseUrl, supabaseKey)

// Initialize cache (in-memory for this example)
const cache = new Map()

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

    if (cache.has(normalizedText)) {
      console.log("Traducción encontrada en caché")
      const cachedTranslation = cache.get(normalizedText)
      return NextResponse.json({ translation: cachedTranslation })
    }

    const words = normalizedText.split(" ")
    console.log("Palabras a traducir:", words)

    const translatedWords = await Promise.all(
      words.map(async (word) => {
        console.log("Buscando traducción para:", word)
        const { data, error } = await supabase.from("translations").select("zapotec").eq("spanish", word).single()

        if (error) {
          console.error("Error al buscar traducción:", error)
          return word
        }

        console.log("Traducción encontrada:", data?.zapotec || word)
        return data?.zapotec || word
      }),
    )

    const translatedText = translatedWords.join(" ")
    console.log("Texto traducido:", translatedText)

    cache.set(normalizedText, translatedText)

    return NextResponse.json({ translation: translatedText })
  } catch (error) {
    console.error("Error en la traducción:", error)
    return NextResponse.json({ error: "Error al traducir el texto" }, { status: 500 })
  }
}

