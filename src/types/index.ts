// ─── User & Auth ────────────────────────────────────────────────────────────

export type UserRole = 'developer' | 'manager' | 'staff'

export interface User {
  id: string
  name: string
  phone: string
  address: string
  role: UserRole
  branch_id: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserPermission {
  id: string
  user_id: string
  permission_key: string
  created_at: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  selectedBranchId: string | null
}

// ─── Branch ─────────────────────────────────────────────────────────────────

export interface Branch {
  id: string
  name: string
  address: string
  phone: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// ─── Category ───────────────────────────────────────────────────────────────

export interface Category {
  id: string
  name: string
  icon: string | null
  branch_id: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

// ─── Product ────────────────────────────────────────────────────────────────

export interface Product {
  id: string
  name: string
  category_id: string
  category?: Category
  sku: string | null
  capital_price: number
  base_price: number
  stock: number
  min_stock: number
  unit: string
  image_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProductPrice {
  id: string
  product_id: string
  branch_id: string
  price: number
  created_at: string
  updated_at: string
}

// ─── Supplier ───────────────────────────────────────────────────────────────

export interface Supplier {
  id: string
  name: string
  address: string
  phone: string
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// ─── Stock ──────────────────────────────────────────────────────────────────

export type StockLogType = 'in' | 'out' | 'adjustment' | 'sale'

export interface StockLog {
  id: string
  product_id: string
  product?: Product
  branch_id: string
  type: StockLogType
  quantity: number
  notes: string | null
  user_id: string
  user?: User
  supplier_id: string | null
  supplier?: Supplier
  created_at: string
}

// ─── Transaction ────────────────────────────────────────────────────────────

export type TransactionStatus = 'pending' | 'paid' | 'debt' | 'cancelled'
export type PaymentMethod = 'cash' | 'qris' | 'transfer'

export interface TransactionItem {
  id: string
  transaction_id: string
  product_id: string
  product?: Product
  quantity: number
  unit_price: number
  subtotal: number
  status: TransactionStatus
  created_at: string
}

export interface Transaction {
  id: string
  code: string
  branch_id: string
  branch?: Branch
  user_id: string
  user?: User
  customer_name: string | null
  customer_phone: string | null
  status: TransactionStatus
  payment_method: PaymentMethod | null
  total_amount: number
  paid_amount: number
  change_amount: number
  notes: string | null
  items?: TransactionItem[]
  created_at: string
  updated_at: string
}

// ─── Debt ───────────────────────────────────────────────────────────────────

export interface Debt {
  id: string
  transaction_id: string
  transaction?: Transaction
  branch_id: string
  branch?: Branch
  customer_name: string
  customer_address: string | null
  customer_phone: string | null
  total_amount: number
  paid_amount: number
  remaining_amount: number
  status: 'unpaid' | 'partial' | 'paid'
  created_at: string
  updated_at: string
}

export interface DebtPayment {
  id: string
  debt_id: string
  amount: number
  user_id: string
  user?: User
  branch_id: string
  notes: string | null
  created_at: string
}

// ─── Shift ──────────────────────────────────────────────────────────────────

export interface Shift {
  id: string
  user_id: string
  user?: User
  branch_id: string
  branch?: Branch
  check_in: string
  check_out: string | null
  system_cash: number
  actual_cash: number | null
  difference: number | null
  notes: string | null
  status: 'active' | 'pending_handover' | 'closed'
  created_at: string
}

export interface ShiftHandover {
  id: string
  from_shift_id: string
  from_user_id: string
  from_user?: User
  to_user_id: string
  to_user?: User
  branch_id: string
  system_cash: number
  actual_cash: number
  difference: number
  notes: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

// ─── Report ──────────────────────────────────────────────────────────────────

export interface DailySales {
  date: string
  total: number
  transaction_count: number
}

export interface TopProduct {
  product_id: string
  product_name: string
  quantity: number
  revenue: number
}

export interface StaffSales {
  user_id: string
  user_name: string
  total: number
  transaction_count: number
}

// ─── Kasir / POS ────────────────────────────────────────────────────────────

export interface CartItem {
  product: Product
  quantity: number
  unit_price: number
  subtotal: number
  selected: boolean
}

export interface Cart {
  items: CartItem[]
  customer_name: string
  customer_phone: string
  notes: string
}

// ─── Theme ───────────────────────────────────────────────────────────────────

export type ThemeKey = 'blue-white' | 'blue-black' | 'white-black'

export interface Theme {
  key: ThemeKey
  name: string
  description: string
}

// ─── Pagination ──────────────────────────────────────────────────────────────

export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ─── Permission keys ────────────────────────────────────────────────────────

export type PermissionKey =
  | 'add_product'
  | 'edit_product'
  | 'delete_product'
  | 'add_stock'
  | 'input_expense'
  | 'buy_gas'
  | 'take_cash'
  | 'edit_price'
  | 'export_data'
  | 'import_data'
  | 'view_report'
  | 'view_all_branches'
  | 'manage_users'
  | 'manage_branches'
  | 'manage_categories'
  | 'manage_suppliers'
  | 'delete_transaction'
  | 'backup_restore'
  | 'close_warung'
  | 'add_staff'
