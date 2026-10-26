import 'server-only'
import { Resend } from 'resend'

// Only the slice of Resend's API this module actually calls - lets tests
// pass a fake object shaped like { emails: { send } } instead of a real
// Resend instance, without ever touching the network.
export type MailerLike = {
  emails: {
    send: Resend['emails']['send']
  }
}

export type EmailMessage = {
  to: string[]
  subject: string
  html: string
  text: string
  replyTo?: string
}

export function createMailer(): MailerLike {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured.')
  }
  return new Resend(apiKey)
}

export async function sendEmail(mailer: MailerLike, message: EmailMessage) {
  const from = process.env.EMAIL_FROM
  if (!from) {
    throw new Error('EMAIL_FROM is not configured.')
  }

  return mailer.emails.send({
    from,
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
    ...(message.replyTo ? { replyTo: message.replyTo } : {}),
  })
}
