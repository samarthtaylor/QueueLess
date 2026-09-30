import { Award, BadgeCheck, FileCheck2, Home, IdCard, type LucideIcon } from 'lucide-react'

export type Service = {
  service_id: string
  service_name: string
  description: string
  category: string
  average_service_time: number
  icon: LucideIcon
}

export const services: Service[] = [
  { service_id: 'document-verification', service_name: 'Document Verification', category: 'Documents', description: 'Verify and submit documents for government services.', average_service_time: 15, icon: FileCheck2 },
  { service_id: 'certificate-application', service_name: 'Certificate Application', category: 'Certificates', description: 'Submit and process applications for eligible certificates.', average_service_time: 20, icon: Award },
  { service_id: 'address-update', service_name: 'Address Update', category: 'Applications', description: 'Request an update to your registered address information.', average_service_time: 10, icon: Home },
  { service_id: 'id-services', service_name: 'ID Services', category: 'Identity', description: 'Access available identity-related government services.', average_service_time: 25, icon: IdCard },
  { service_id: 'application-submission', service_name: 'Application Submission', category: 'Applications', description: 'Submit applications and supporting documents.', average_service_time: 15, icon: BadgeCheck },
]

export type QueueData = {
  service_id: string
  people_waiting: number
  active_counters: number
  estimated_wait: number
  crowd_level: 'low' | 'medium' | 'high'
  current_token: string
  queue_tokens: string[]
  counters: { counter_number: string; status: 'Available' | 'In Service' | 'Break' }[]
  queue_history: number[]
}

export const queueData: Record<string, QueueData> = {
  'document-verification': {
    service_id: 'document-verification', people_waiting: 8, active_counters: 3, estimated_wait: 24, crowd_level: 'medium', current_token: '1042',
    queue_tokens: ['1043', '1044', '1045', '1046', '1047'],
    counters: [{ counter_number: '01', status: 'Available' }, { counter_number: '02', status: 'In Service' }, { counter_number: '03', status: 'In Service' }, { counter_number: '04', status: 'Break' }],
    queue_history: [6, 8, 7, 10, 9, 12, 10, 8],
  },
}

export function getService(serviceId: string | null) {
  return services.find((service) => service.service_id === serviceId)
}

export function getQueue(serviceId: string) {
  return queueData[serviceId] ?? queueData['document-verification']
}
