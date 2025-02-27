import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import Cors from "cors"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const cors = Cors({
  methods: ["POST", "HEAD"],
})

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

export async function POST(request: Request) {
  await runMiddleware(request, NextResponse.next(), cors)

  try {
    const { email, password } = await request.json()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

    return NextResponse.json({ user: data.user, session: data.session })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Error al iniciar sesión" }, { status: 500 })
  }
}

