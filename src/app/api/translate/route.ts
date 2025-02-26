import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const cache = new Map<string, string>();

function normalizeText(text: string): string {
  return text.replace(/'/g, "`");
}

function denormalizeText(text: string): string {
  return text.replace(/`/g, "'");
}

// ✅ Manejo de CORS
export async function OPTIONS() {
  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");

  return new Response(null, { status: 204, headers });
}

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: "Se requiere el texto a traducir" },
        { status: 400 }
      );
    }

    const normalizedText = normalizeText(text.toLowerCase());

    if (cache.has(normalizedText)) {
      return NextResponse.json(
        {
          original: text,
          translated: denormalizeText(cache.get(normalizedText)!),
          fromCache: true,
        },
        {
          status: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const words = normalizedText.split(" ");

    const translatedWords = await Promise.all(
      words.map(async (word) => {
        const { data, error } = await supabase
          .from("translations")
          .select("zapotec_word")
          .eq("spanish_word", word)
          .single();

        if (error) {
          console.error("Error al buscar traducción:", error);
          return word;
        }

        return data?.zapotec_word || word;
      })
    );

    const translatedText = translatedWords.join(" ");

    cache.set(normalizedText, translatedText);

    return NextResponse.json(
      {
        original: text,
        translated: denormalizeText(translatedText),
        fromCache: false,
      },
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Error en la traducción:", error);
    return NextResponse.json(
      { error: "Error en el servidor" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}
