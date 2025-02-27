import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import Cors from "cors"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Inicializar el middleware
const cors = Cors({
  methods: ["POST", "GET", "HEAD"],
})

// Helper method to wait for a middleware to execute before continuing
// And to throw an error when an error happens in a middleware
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

export async function POST(request: Request) {
  await runMiddleware(request, NextResponse.next(), cors)

  try {
    const data = await request.json()

    const { error } = await supabase.from("contributions").insert([data])

    if (error) throw error

    return NextResponse.json({ message: "Contribución creada exitosamente" })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Error al crear la contribución" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  await runMiddleware(request, NextResponse.next(), cors)

  try {
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get("filter")

    let query = supabase.from("contributions").select("*").order("created_at", { ascending: false })

    if (filter && filter !== "all") {
      query = query.eq("status", filter)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Error al obtener las contribuciones" }, { status: 500 })
  }
}

