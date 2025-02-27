import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://didxa-link.vercel.app",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    }

    return NextResponse.json(
      { user: data.user, session: data.session },
      {
        status: 200,
        headers: corsHeaders,
      },
    )
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json(
      { error: "Error al iniciar sesión" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "https://didxa-link.vercel.app",
        },
      },
    )
  }
}

export async function OPTIONS(request: Request) {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "https://didxa-link.vercel.app",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    },
  )
}

