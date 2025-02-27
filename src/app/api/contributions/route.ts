import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://didxa-link.vercel.app',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

export async function POST(request: Request) {
  try {
    console.log("Recibiendo solicitud POST");
    const data = await request.json()
    console.log("Datos recibidos:", data);
    
    // Validar datos requeridos
    const requiredFields = ['name', 'email', 'community', 'spanish', 'zapotec']
    for (const field of requiredFields) {
      if (!data[field]) {
        console.log(`Campo requerido faltante: ${field}`);
        return NextResponse.json(
          { error: `El campo ${field} es requerido` },
          { 
            status: 400,
            headers: {
              'Access-Control-Allow-Origin': 'https://didxa-link.vercel.app',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
              'Content-Type': 'application/json'
            }
          }
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
      notes: data.notes || '',
      status: 'pending',
      created_at: new Date().toISOString()
    }

    console.log("Intentando insertar en Supabase:", contributionData);
    const { data: insertedData, error } = await supabase.from("contributions").insert([contributionData]).select()

    if (error) {
      console.error("Error de Supabase:", error);
      throw error
    }

    console.log("Inserción exitosa:", insertedData);
    return NextResponse.json({ 
      message: "Contribución creada exitosamente",
      success: true,
      data: insertedData
    }, {
      headers: {
        'Access-Control-Allow-Origin': 'https://didxa-link.vercel.app',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Content-Type': 'application/json'
      }
    })
  } catch (error) {
    console.error("Error detallado:", error);
    return NextResponse.json({ 
      error: "Error al crear la contribución",
      details: error instanceof Error ? error.message : String(error)
    }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': 'https://didxa-link.vercel.app',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Content-Type': 'application/json'
      }
    })
  }
}