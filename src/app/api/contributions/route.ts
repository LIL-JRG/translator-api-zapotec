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
    const data = await request.json()
    
    // Validar datos requeridos
    const requiredFields = ['name', 'email', 'community', 'spanish', 'zapotec']
    for (const field of requiredFields) {
      if (!data[field]) {
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

    const { error } = await supabase.from("contributions").insert([contributionData])

    if (error) throw error

    return NextResponse.json({ 
      message: "Contribución creada exitosamente",
      success: true
    }, {
      headers: {
        'Access-Control-Allow-Origin': 'https://didxa-link.vercel.app',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Content-Type': 'application/json'
      }
    })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ 
      error: "Error al crear la contribución",
      details: error
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