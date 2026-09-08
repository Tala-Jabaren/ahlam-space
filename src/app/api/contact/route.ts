import { Resend } from 'resend'

type ContactBody = {
  name?: unknown
  email?: unknown
  message?: unknown
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export async function POST(request: Request) {
  let body: ContactBody

  try {
    body = (await request.json()) as ContactBody
  } catch {
    return Response.json(
      { success: false, error: 'Invalid JSON body.' },
      { status: 400 }
    )
  }

  if (
    !isNonEmptyString(body.name) ||
    !isNonEmptyString(body.email) ||
    !isNonEmptyString(body.message)
  ) {
    return Response.json(
      { success: false, error: 'Name, email, and message are required.' },
      { status: 400 }
    )
  }

  const resendApiKey = process.env.RESEND_API_KEY

  if (!resendApiKey) {
    return Response.json(
      { success: false, error: 'Email service is not configured.' },
      { status: 500 }
    )
  }

  const name = body.name.trim()
  const email = body.email.trim()
  const message = body.message.trim()
  const resend = new Resend(resendApiKey)
  const businessEmail = 'nmi.ahlam@gmail.com' // TODO: replace with the real business email address.

  try {
    const { error } = await resend.emails.send({
      from: 'Ahlam Space <onboarding@resend.dev>',
      to: [businessEmail],
      replyTo: email,
      subject: `New contact form message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
    })

    if (error) {
      return Response.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return Response.json({ success: true })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unable to send message.'

    return Response.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
