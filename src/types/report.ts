export interface DetailedReportRow {
  id: string
  kind: 'Penjualan' | 'Pembayaran Member'
  date: string
  code: string
  amount: number
  staff_id: string
  staff_name: string
  branch_id: string
  branch_name: string
  shift_id: string | null
  shift_number: number | null
  payment_method: string
}

export interface ReportShiftOption {
  id: string
  number: number
  staff_id: string
  staff_name: string
  branch_id: string
  branch_name: string
  check_in: string
  check_out: string | null
}

export interface DetailedReportSummary {
  total: number
  transaction_count: number
  staff_count: number
  branch_count: number
  shift_count: number
}

export interface DetailedReportResult {
  rows: DetailedReportRow[]
  summary: DetailedReportSummary
}
