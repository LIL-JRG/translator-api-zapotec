import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Crear un cliente de Supabase con el rol de servicio
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://didxa-link.vercel.app",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  console.log("Iniciando solicitud PATCH")
  try {
    const authHeader = request.headers.get("Authorization")
    console.log("Encabezado de autorización:", authHeader)
    if (!authHeader) {
      return NextResponse.json(
        { error: "No se proporcionó token de autorización" },
        { status: 401, headers: corsHeaders },
      )
    }
    const token = authHeader.split(" ")[1]

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token)
    if (authError) {
      console.error("Error de autenticación:", authError)
      return NextResponse.json(
        { error: "Error de autenticación", details: authError },
        { status: 401, headers: corsHeaders },
      )
    }
    if (!user) {
      return NextResponse.json({ error: "Usuario no autenticado" }, { status: 401, headers: corsHeaders })
    }
    console.log("Usuario autenticado:", user.id)

    const { action } = await request.json()
    const id = params.id

    console.log(`Procesando acción ${action} para la contribución ${id}`)

    if (action === "approve") {
      const { data: contribution, error: fetchError } = await supabaseAdmin
        .from("contributions")
        .select("*")
        .eq("id", id)
        .single()

      if (fetchError) {
        console.error("Error al obtener la contribución:", fetchError)
        return NextResponse.json(
          { error: "Error al obtener la contribución", details: fetchError },
          { status: 500, headers: corsHeaders },
        )
      }

      console.log("Contribución obtenida:", contribution)

      const { error: updateError } = await supabaseAdmin
        .from("contributions")
        .update({ status: "approved" })
        .eq("id", id)

      if (updateError) {
        console.error("Error al actualizar el estado de la contribución:", updateError)
        return NextResponse.json(
          { error: "Error al actualizar el estado de la contribución", details: updateError },
          { status: 500, headers: corsHeaders },
        )
      }

      console.log("Estado de la contribución actualizado a 'approved'")

      if (contribution) {
        const { data: insertData, error: insertError } = await supabaseAdmin
          .from("translations")
          .insert([
            {
              spanish: contribution.spanish,
              zapotec: contribution.zapotec,
              community: contribution.community,
              notes: contribution.notes,
              contributor_id: contribution.id,
            },
          ])
          .select()

        if (insertError) {
          console.error("Error al insertar en la tabla de traducciones:", insertError)
          // Revertir la actualización del estado de la contribución
          await supabaseAdmin.from("contributions").update({ status: "pending" }).eq("id", id)
          return NextResponse.json(
            {
              error: "Error al insertar en la tabla de traducciones",
              details: insertError,
              message:
                "La contribución se mantuvo como pendiente debido a un error. Por favor, contacta al administrador del sistema para obtener ayuda.",
            },
            { status: 500, headers: corsHeaders },
          )
        }

        console.log("Traducción insertada:", insertData)
      }
    } else if (action === "reject") {
      const { data, error } = await supabaseAdmin
        .from("contributions")
        .update({ status: "rejected" })
        .eq("id", id)
        .select()

      if (error) {
        console.error("Error al rechazar la contribución:", error)
        return NextResponse.json(
          { error: "Error al rechazar la contribución", details: error },
          { status: 500, headers: corsHeaders },
        )
      }

      console.log("Contribución rechazada:", data)
    } else {
      return NextResponse.json({ error: "Acción no válida" }, { status: 400, headers: corsHeaders })
    }

    console.log(`Acción ${action} completada con éxito para la contribución ${id}`)

    return NextResponse.json({ message: "Acción completada exitosamente", success: true }, { headers: corsHeaders })
  } catch (error) {
    console.error("Error detallado en la ruta PATCH:", error)
    return NextResponse.json(
      { error: "Error al procesar la acción", details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: corsHeaders },
    )
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    console.log(`Obteniendo contribución con ID: ${id}`)

    const { data, error } = await supabaseAdmin.from("contributions").select("*").eq("id", id).single()

    if (error) {
      console.error("Error al obtener la contribución:", error)
      return NextResponse.json(
        { error: "Error al obtener la contribución", details: error },
        { status: 500, headers: corsHeaders },
      )
    }

    console.log(`Contribución obtenida con éxito: ${JSON.stringify(data)}`)

    return NextResponse.json(data, { headers: corsHeaders })
  } catch (error) {
    console.error("Error en la ruta GET:", error)
    return NextResponse.json(
      { error: "Error al obtener la contribución", details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: corsHeaders },
    )
  }
}

