import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const cache = new Map<string, string>()

function normalizeText(text: string): string {
  return text.replace(/'/g, "`")
}

function denormalizeText(text: string): string {
  return text.replace(/`/g, "'")
}

export async function POST(request: Request) {
  try {
    const { text } = await request.json()

    if (!text) {
      return NextResponse.json({ error: "Se requiere el texto a traducir" }, { status: 400 })
    }

    const normalizedText = normalizeText(text.toLowerCase())

    if (cache.has(normalizedText)) {
      return NextResponse.json({
        original: text,
        translated: denormalizeText(cache.get(normalizedText)!),
        fromCache: true,
      })
    }

    const words = normalizedText.split(" ")

    const translatedWords = await Promise.all(
      words.map(async (word) => {
        const { data, error } = await supabase
          .from("translations")
          .select("zapotec_word")
          .eq("spanish_word", word)
          .single()

        if (error) {
          console.error("Error al buscar traducción:", error)
          return word
        }

        return data?.zapotec_word || word
      }),
    )

    const translatedText = translatedWords.join(" ")

    cache.set(normalizedText, translatedText)

    return NextResponse.json({
      original: text,
      translated: denormalizeText(translatedText),
      fromCache: false,
    })
  } catch (error) {
    console.error("Error en la traducción:", error)
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 })
  }
}

