export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
  tenantSlug: string;
}

export interface AuthenticatedTenant {
  id: string;
  slug: string;
  name: string;
  plan: string;
}
