import { ProjectDomain } from '@/types';

export interface DomainConfig {
  value: ProjectDomain;
  label: string;
  icon: string; // emoji
  color: string; // tailwind color class
  bgColor: string;
  description: string;
}

export const domainConfigs: Record<ProjectDomain, DomainConfig> = {
  [ProjectDomain.WORK]: {
    value: ProjectDomain.WORK,
    label: 'Trabajo',
    icon: '💼',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    description: 'Proyectos profesionales y de clientes',
  },
  [ProjectDomain.AUTO]: {
    value: ProjectDomain.AUTO,
    label: 'Auto',
    icon: '🚗',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    description: 'Mantenimiento y gastos del vehículo',
  },
  [ProjectDomain.HEALTH]: {
    value: ProjectDomain.HEALTH,
    label: 'Salud',
    icon: '🏥',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    description: 'Citas médicas, tratamientos y bienestar',
  },
  [ProjectDomain.HOME]: {
    value: ProjectDomain.HOME,
    label: 'Hogar',
    icon: '🏠',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    description: 'Mantenimiento y mejoras del hogar',
  },
  [ProjectDomain.FINANCE]: {
    value: ProjectDomain.FINANCE,
    label: 'Finanzas',
    icon: '💰',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    description: 'Gastos, inversiones y presupuestos',
  },
  [ProjectDomain.PERSONAL]: {
    value: ProjectDomain.PERSONAL,
    label: 'Personal',
    icon: '👤',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    description: 'Metas personales y desarrollo',
  },
};

export const domainOptions = Object.values(domainConfigs);

export function getDomainConfig(domain?: ProjectDomain | string): DomainConfig {
  if (!domain) return domainConfigs[ProjectDomain.WORK];
  return domainConfigs[domain as ProjectDomain] || domainConfigs[ProjectDomain.WORK];
}
