import { Request, Response, NextFunction } from 'express';
import { AuthenticationError } from '@sap-framework/core';

export interface AuthUser {
  id: string;
  email: string;
  tenantId: string;
  roles: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    // TODO: Uncomment when XSUAA is configured in BTP
    // const xsenv = require('@sap/xsenv');
    // const xssec = require('@sap/xssec');
    // const services = xsenv.getServices({ uaa: 'sapframework-xsuaa' });
    // 
    // await new Promise((resolve, reject) => {
    //   xssec.createSecurityContext(token, services.uaa, (error: any, securityContext: any) => {
    //     if (error) return reject(new AuthenticationError('Invalid token'));
    //     req.user = {
    //       id: securityContext.getLogonName(),
    //       email: securityContext.getEmail(),
    //       tenantId: securityContext.getSubaccountId(),
    //       roles: securityContext.getScopes()
    //     };
    //     resolve(undefined);
    //   });
    // });

    // Development mode: mock user
    req.user = {
      id: 'dev-user',
      email: 'dev@example.com',
      tenantId: 'dev-tenant',
      roles: ['admin'],
    };

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      res.status(401).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Authentication failed' });
    }
  }
}