export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  tenantSlug: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string;
  tenantId: string;
  tokenId: string;
}
