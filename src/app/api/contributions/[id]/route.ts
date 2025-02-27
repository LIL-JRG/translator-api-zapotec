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

    if (action === "approve") {
      // Obtener los datos de la contribución
      const { data: contribution, error: fetchError } = await supabase
        .from("contributions")
        .select("*")
        .eq("id", id)
        .single()

      if (fetchError) throw fetchError

      // Actualizar el estado a aprobado
      const { error: updateError } = await supabase.from("contributions").update({ status: "approved" }).eq("id", id)

      if (updateError) throw updateError

      // Insertar en la tabla de traducciones (asumiendo que tienes una tabla para esto)
      // Esto reemplaza la función RPC approve_contribution
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

        if (insertError) throw insertError
      }
    } else if (action === "reject") {
      const { error } = await supabase.from("contributions").update({ status: "rejected" }).eq("id", id)

      if (error) throw error
    }

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
    console.error("Error:", error)
    return NextResponse.json(
      {
        error: "Error al procesar la acción",
        details: error,
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

    const { data, error } = await supabase.from("contributions").select("*").eq("id", id).single()

    if (error) throw error

    return NextResponse.json(data, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Content-Type": "application/json",
      },
    })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json(
      {
        error: "Error al obtener la contribución",
        details: error,
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

