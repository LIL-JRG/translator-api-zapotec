import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { action } = await request.json()
    const id = params.id

    if (action === "approve") {
      // Call the approve_contribution function
      const { error } = await supabase.rpc("approve_contribution", { contribution_id: Number.parseInt(id) })

      if (error) throw error
    } else if (action === "reject") {
      const { error } = await supabase.from("contributions").update({ status: "rejected" }).eq("id", id)

      if (error) throw error
    }

    return NextResponse.json({ message: "Acción completada exitosamente" })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Error al procesar la acción" }, { status: 500 })
  }
}

