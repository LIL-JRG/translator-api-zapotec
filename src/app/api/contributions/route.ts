import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import Cors from "cors"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Inicializar el middleware
const cors = Cors({
  methods: ["POST", "GET", "HEAD", "OPTIONS"],
  origin: "*", // Permitir cualquier origen para desarrollo, ajustar en producción
})

// Helper method to wait for a middleware to execute before continuing
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

// Manejar solicitudes OPTIONS para CORS preflight
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}

export async function POST(request: Request) {
  await runMiddleware(request, NextResponse.next(), cors)

  try {
    const data = await request.json()

    // Validar datos requeridos
    const requiredFields = ["name", "email", "community", "spanish", "zapotec"]
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json({ error: `El campo ${field} es requerido` }, { status: 400 })
      }
    }

    // Preparar datos para inserción
    const contributionData = {
      name: data.name,
      email: data.email,
      community: data.community,
      spanish: data.spanish,
      zapotec: data.zapotec,
      notes: data.notes || "",
      status: "pending",
      created_at: new Date().toISOString(),
    }

    const { error } = await supabase.from("contributions").insert([contributionData])

    if (error) throw error

    return NextResponse.json({
      message: "Contribución creada exitosamente",
      success: true,
    })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json(
      {
        error: "Error al crear la contribución",
        details: error,
      },
      { status: 500 },
    )
  }
}

export async function GET(request: Request) {
  await runMiddleware(request, NextResponse.next(), cors)

  try {
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get("filter")
    const search = searchParams.get("search")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    // Calcular offset para paginación
    const offset = (page - 1) * limit

    // Iniciar consulta
    let query = supabase.from("contributions").select("*", { count: "exact" }).order("created_at", { ascending: false })

    // Aplicar filtro de estado
    if (filter && filter !== "all") {
      query = query.eq("status", filter)
    }

    // Aplicar búsqueda si existe
    if (search) {
      query = query.or(
        `spanish.ilike.%${search}%,zapotec.ilike.%${search}%,name.ilike.%${search}%,email.ilike.%${search}%,community.ilike.%${search}%`,
      )
    }

    // Aplicar paginación
    query = query.range(offset, offset + limit - 1)

    // Ejecutar consulta
    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: count ? Math.ceil(count / limit) : 0,
      },
    })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json(
      {
        error: "Error al obtener las contribuciones",
        details: error,
      },
      { status: 500 },
    )
  }
}

