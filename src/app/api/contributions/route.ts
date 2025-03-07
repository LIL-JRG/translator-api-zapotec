import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "https://didxa-link.vercel.app",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}

// Nuevo método GET para obtener todas las contribuciones
export async function GET() {
  try {
    console.log("Recibiendo solicitud GET para obtener todas las contribuciones")

    const { data, error } = await supabase.from("contributions").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("Error de Supabase:", JSON.stringify(error))
      throw error
    }

    console.log(`Se encontraron ${data?.length || 0} contribuciones`)

    return NextResponse.json(data, {
      headers: {
        "Access-Control-Allow-Origin": "https://didxa-link.vercel.app",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Content-Type": "application/json",
      },
    })
  } catch (error) {
    console.error("Error detallado:", error instanceof Error ? error.message : JSON.stringify(error))
    return NextResponse.json(
      {
        error: "Error al obtener las contribuciones",
        details: error instanceof Error ? error.message : JSON.stringify(error),
      },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "https://didxa-link.vercel.app",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Content-Type": "application/json",
        },
      },
    )
  }
}

// Método POST existente para crear contribuciones
export async function POST(request: Request) {
  try {
    console.log("Recibiendo solicitud POST")
    const data = await request.json()
    console.log("Datos recibidos:", JSON.stringify(data))

    // Validar datos requeridos
    const requiredFields = ["name", "email", "community", "spanish", "zapotec"]
    for (const field of requiredFields) {
      if (!data[field]) {
        console.log(`Campo requerido faltante: ${field}`)
        return NextResponse.json(
          { error: `El campo ${field} es requerido` },
          {
            status: 400,
            headers: {
              "Access-Control-Allow-Origin": "https://didxa-link.vercel.app",
              "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
              "Content-Type": "application/json",
            },
          },
        )
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

    console.log("Intentando insertar en Supabase:", JSON.stringify(contributionData))
    console.log("URL de Supabase:", process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log(
      "Clave de servicio de Supabase (primeros 5 caracteres):",
      process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 5),
    )

    const { data: insertedData, error } = await supabase.from("contributions").insert([contributionData]).select()

    if (error) {
      console.error("Error de Supabase:", JSON.stringify(error))
      throw error
    }

    console.log("Inserción exitosa:", JSON.stringify(insertedData))
    return NextResponse.json(
      {
        message: "Contribución creada exitosamente",
        success: true,
        data: insertedData,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "https://didxa-link.vercel.app",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Content-Type": "application/json",
        },
      },
    )
  } catch (error) {
    console.error("Error detallado:", error instanceof Error ? error.message : JSON.stringify(error))
    return NextResponse.json(
      {
        error: "Error al crear la contribución",
        details: error instanceof Error ? error.message : JSON.stringify(error),
      },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "https://didxa-link.vercel.app",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Content-Type": "application/json",
        },
      },
    )
  }
}