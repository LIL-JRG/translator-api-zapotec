import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const allowedOrigins = ["https://didxa-link.vercel.app", "http://localhost:4321"]

function setCorsHeaders(req: Request, res: NextResponse) {
  const origin = req.headers.get("origin")
  if (origin && allowedOrigins.includes(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin)
  }
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
  res.headers.set("Access-Control-Allow-Credentials", "true")
}

export async function OPTIONS(req: Request) {
  const res = new NextResponse(null, { status: 204 })
  setCorsHeaders(req, res)
  return res
}

export async function POST(req: Request) {
  const res = new NextResponse()
  setCorsHeaders(req, res)

  try {
    const { email, password } = await req.json()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

    return NextResponse.json(
      { user: data.user, session: data.session },
      {
        status: 200,
        headers: res.headers,
      },
    )
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Error al iniciar sesión" }, { status: 500, headers: res.headers })
  }
}

