export type Role = 'admin' | 'owner' | 'employee'
export type JobTitle = 'mechanic' | 'painter' | 'receptionist'
export type OSStatus = 'open' | 'progress' | 'done'
export type WorkshopStatus = 'active' | 'blocked'
export type CostType = 'fixed' | 'additive'

export interface Profile {
  id: string
  name: string
  role: Role
  job_title?: JobTitle
  workshop_id?: string | null
  created_at: string
}

export interface Workshop {
  id: string
  name: string
  cnpj: string
  phone: string
  address?: string | null
  logo_url?: string | null
  status: WorkshopStatus
  owner_id: string
  created_at: string
}

export interface ProfileWithWorkshop extends Profile {
  workshops: Workshop | null
}

export interface StockItem {
  id: string
  workshop_id: string
  name: string
  category?: string
  unit: string
  cost_price: number
  sale_price: number
  qty: number
  created_at: string
}

export interface OSClient {
  name: string
  cpf: string
  phone: string
  email?: string
}

export interface OSVehicle {
  model: string
  plate: string
  color?: string
  km?: string
  problem: string
}

export interface OSItem {
  name: string
  qty: number
  price: number
  from_stock?: string | null
}

export interface OSRating {
  parts: number
  cleaning: number
  resolved: number
}

export interface Order {
  id: string
  workshop_id: string
  number: string
  status: OSStatus
  client: OSClient
  vehicle: OSVehicle
  items: OSItem[]
  labor: number
  total: number
  obs?: string
  signed: boolean
  sig_auth?: string
  delivered: boolean
  sig_del?: string
  rating?: OSRating
  created_by?: string
  created_at: string
}

export interface Cost {
  id: string
  workshop_id: string
  type: CostType
  name: string
  value: number
  month?: string
  created_at: string
}

export interface Notification {
  id: string
  workshop_id: string
  message: string
  read: boolean
  created_at: string
}
