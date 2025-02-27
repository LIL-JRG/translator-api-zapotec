import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Manejar solicitudes OPTIONS para CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { action } = await request.json()
    const id = params.id

    console.log(`Procesando acción ${action} para la contribución ${id}`)

    if (action === "approve") {
      // Obtener los datos de la contribución
      const { data: contribution, error: fetchError } = await supabase
        .from("contributions")
        .select("*")
        .eq("id", id)
        .single()

      if (fetchError) {
        console.error("Error al obtener la contribución:", fetchError)
        throw fetchError
      }

      // Actualizar el estado a aprobado
      const { error: updateError } = await supabase.from("contributions").update({ status: "approved" }).eq("id", id)

      if (updateError) {
        console.error("Error al actualizar el estado de la contribución:", updateError)
        throw updateError
      }

      // Insertar en la tabla de traducciones
      if (contribution) {
        const { error: insertError } = await supabase.from("translations").insert([
          {
            spanish: contribution.spanish,
            zapotec: contribution.zapotec,
            community: contribution.community,
            notes: contribution.notes,
            contributor_id: contribution.id,
          },
        ])

        if (insertError) {
          console.error("Error al insertar en la tabla de traducciones:", insertError)
          throw insertError
        }
      }
    } else if (action === "reject") {
      const { error } = await supabase.from("contributions").update({ status: "rejected" }).eq("id", id)

      if (error) {
        console.error("Error al rechazar la contribución:", error)
        throw error
      }
    } else {
      throw new Error(`Acción no válida: ${action}`)
    }

    console.log(`Acción ${action} completada con éxito para la contribución ${id}`)

    return NextResponse.json(
      {
        message: "Acción completada exitosamente",
        success: true,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          "Content-Type": "application/json",
        },
      },
    )
  } catch (error) {
    console.error("Error en la ruta PATCH:", error)
    return NextResponse.json(
      {
        error: "Error al procesar la acción",
        details: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          "Content-Type": "application/json",
        },
      },
    )
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    console.log(`Obteniendo contribución con ID: ${id}`)

    const { data, error } = await supabase.from("contributions").select("*").eq("id", id).single()

    if (error) {
      console.error("Error al obtener la contribución:", error)
      throw error
    }

    console.log(`Contribución obtenida con éxito: ${JSON.stringify(data)}`)

    return NextResponse.json(data, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Content-Type": "application/json",
      },
    })
  } catch (error) {
    console.error("Error en la ruta GET:", error)
    return NextResponse.json(
      {
        error: "Error al obtener la contribución",
        details: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          "Content-Type": "application/json",
        },
      },
    )
  }
}

