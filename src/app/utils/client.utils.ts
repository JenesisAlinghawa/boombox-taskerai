// utils/client.utils.ts
import { Client, NewClientForm } from '../types';

export const createClientFromForm = (formData: NewClientForm): Client => ({
  ...formData,
  id: Date.now(),
  links: formData.links.split(',').map(s => s.trim()).filter(Boolean),
  coreProducts: formData.coreProducts.split(',').map(s => s.trim()).filter(Boolean),
  competitors: formData.competitors.split(',').map(s => s.trim()).filter(Boolean),
  inspo: formData.inspo.split(',').map(s => s.trim()).filter(Boolean),
  logo: formData.logoUrl,
});

export const filterClients = (clients: Client[], searchTerm: string): Client[] => {
  if (!searchTerm.trim()) return clients;
  
  const term = searchTerm.toLowerCase();
  return clients.filter(client =>
    client.name.toLowerCase().includes(term) ||
    client.industry.toLowerCase().includes(term) ||
    client.niche.toLowerCase().includes(term) ||
    client.info.toLowerCase().includes(term)
  );
};

export const sortClients = (clients: Client[], sortBy: 'name' | 'industry' | 'businessAge' = 'name'): Client[] => {
  return [...clients].sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === 'industry') {
      return a.industry.localeCompare(b.industry);
    }
    if (sortBy === 'businessAge') {
      // Extract numeric value from business age for proper sorting
      const getYears = (age: string) => {
        const match = age.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
      };
      return getYears(b.businessAge) - getYears(a.businessAge);
    }
    return 0;
  });
};

export const validateClient = (client: Partial<NewClientForm>): string[] => {
  const errors: string[] = [];
  
  if (!client.name?.trim()) {
    errors.push('Business name is required');
  }
  
  if (!client.info?.trim()) {
    errors.push('Business address is required');
  }
  
  if (!client.industry?.trim()) {
    errors.push('Industry is required');
  }
  
  // Validate email format in links if provided
  if (client.links) {
    const linkArray = client.links.split(',').map(s => s.trim()).filter(Boolean);
    const urlPattern = /^https?:\/\/.+/;
    const invalidLinks = linkArray.filter(link => !urlPattern.test(link));
    
    if (invalidLinks.length > 0) {
      errors.push(`Invalid URLs: ${invalidLinks.join(', ')}`);
    }
  }
  
  return errors;
};