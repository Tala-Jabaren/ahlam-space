import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  PageOrientation,
  WidthType,
  convertMillimetersToTwip,
} from 'docx'
import type { CustomerRow, CustomerTab, GuestBuyerRow } from './admin-customers'

export type ColumnDef<T> = {
  header: string
  value: (row: T) => string
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('ar', {
    timeZone: 'Asia/Jerusalem',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

function formatAmount(value: number) {
  return new Intl.NumberFormat('ar').format(value)
}

export function usersColumns(): ColumnDef<CustomerRow>[] {
  return [
    { header: 'تاريخ التسجيل', value: (r) => formatDateTime(r.registered_at) },
    { header: 'الاسم الكامل', value: (r) => r.full_name ?? '' },
    { header: 'البريد الإلكتروني', value: (r) => r.email ?? '' },
    { header: 'الهاتف', value: (r) => r.phone ?? '' },
    { header: 'المدينة', value: (r) => r.city ?? '' },
    { header: 'عدد الطلبات', value: (r) => String(r.orders_count) },
    { header: 'إجمالي الإنفاق (₪)', value: (r) => formatAmount(r.total_spent) },
    { header: 'آخر طلب', value: (r) => (r.last_order_at ? formatDateTime(r.last_order_at) : '') },
  ]
}

export function guestColumns(): ColumnDef<GuestBuyerRow>[] {
  return [
    { header: 'الاسم', value: (r) => r.guest_name ?? '' },
    { header: 'الهاتف', value: (r) => r.guest_phone ?? '' },
    { header: 'البريد الإلكتروني', value: (r) => r.guest_email ?? '' },
    { header: 'عدد الطلبات', value: (r) => String(r.orders_count) },
    { header: 'إجمالي الإنفاق (₪)', value: (r) => formatAmount(r.total_spent) },
    { header: 'آخر طلب', value: (r) => (r.last_order_at ? formatDateTime(r.last_order_at) : '') },
  ]
}

export function titleFor(tab: CustomerTab) {
  return tab === 'users' ? 'المستخدمون المسجلون' : 'المشترون كضيوف'
}

// ---------------------------------------------------------------------------
// CSV - UTF-8 with BOM (so Arabic opens correctly in Excel), RFC4180 quoting,
// and formula-injection protection (a leading =, +, -, or @ gets a leading
// apostrophe before anything else, so spreadsheet apps treat the cell as
// literal text instead of evaluating it as a formula).
// ---------------------------------------------------------------------------

function csvCell(raw: string): string {
  let value = raw
  if (/^[=+\-@]/.test(value)) {
    value = `'${value}`
  }
  if (/["\r\n,]/.test(value)) {
    value = `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function buildCsv<T>(columns: ColumnDef<T>[], rows: T[]): Buffer {
  const lines = [columns.map((column) => csvCell(column.header)).join(',')]

  for (const row of rows) {
    lines.push(columns.map((column) => csvCell(column.value(row))).join(','))
  }

  const BOM = '﻿'
  return Buffer.from(BOM + lines.join('\r\n'), 'utf-8')
}

// ---------------------------------------------------------------------------
// DOCX - right-to-left throughout: bidirectional paragraphs, right-to-left
// runs, a visually right-to-left table (column order, not just text shaping),
// an Arabic-capable font set explicitly for the complex-script sub-font (the
// one Word actually uses to shape Arabic), a repeated header row, and
// landscape orientation once there are enough columns to need the width.
// ---------------------------------------------------------------------------

const ARABIC_FONT = { ascii: 'Arial', hAnsi: 'Arial', cs: 'Arial' }
const LANDSCAPE_COLUMN_THRESHOLD = 6

function arabicRun(text: string, extra: { bold?: boolean; size?: number; color?: string } = {}) {
  return new TextRun({ text, font: ARABIC_FONT, rightToLeft: true, ...extra })
}

function arabicParagraph(
  children: TextRun[],
  extra: { alignment?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}
) {
  return new Paragraph({
    bidirectional: true,
    alignment: extra.alignment ?? AlignmentType.START,
    children,
  })
}

export async function buildDocx<T>(
  title: string,
  columns: ColumnDef<T>[],
  rows: T[]
): Promise<Buffer> {
  const generatedAt = new Intl.DateTimeFormat('ar', {
    timeZone: 'Asia/Jerusalem',
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date())

  const isLandscape = columns.length >= LANDSCAPE_COLUMN_THRESHOLD
  const pageWidth = convertMillimetersToTwip(isLandscape ? 297 : 210)
  const pageHeight = convertMillimetersToTwip(isLandscape ? 210 : 297)
  const margin = convertMillimetersToTwip(15)
  const contentWidth = pageWidth - margin * 2
  const columnWidth = Math.floor(contentWidth / columns.length)

  const headerRow = new TableRow({
    tableHeader: true,
    children: columns.map(
      (column) =>
        new TableCell({
          width: { size: columnWidth, type: WidthType.DXA },
          shading: { fill: 'D6E2B6' },
          children: [
            arabicParagraph([arabicRun(column.header, { bold: true })], {
              alignment: AlignmentType.CENTER,
            }),
          ],
        })
    ),
  })

  const dataRows = rows.map(
    (row) =>
      new TableRow({
        children: columns.map(
          (column) =>
            new TableCell({
              width: { size: columnWidth, type: WidthType.DXA },
              children: [arabicParagraph([arabicRun(column.value(row))])],
            })
        ),
      })
  )

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: isLandscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
              width: pageWidth,
              height: pageHeight,
            },
            margin: { top: margin, bottom: margin, left: margin, right: margin },
          },
        },
        children: [
          arabicParagraph([arabicRun(title, { bold: true, size: 32 })], {
            alignment: AlignmentType.CENTER,
          }),
          arabicParagraph(
            [arabicRun(`تاريخ الإنشاء: ${generatedAt}`, { size: 20, color: '617A55' })],
            { alignment: AlignmentType.CENTER }
          ),
          new Paragraph({ text: '' }),
          new Table({
            visuallyRightToLeft: true,
            width: { size: contentWidth, type: WidthType.DXA },
            columnWidths: columns.map(() => columnWidth),
            rows: [headerRow, ...dataRows],
          }),
        ],
      },
    ],
  })

  return Packer.toBuffer(doc)
}
