import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware to restrict access from common CLI tools like curl and postman.
 * Note: This is not foolproof as User-Agent can be spoofed, but it addresses the user's specific request.
 */
export const restrictCliAccess = (req: Request, res: Response, next: NextFunction) => {
  const userAgent = req.headers['user-agent'] || '';
  
  const forbiddenAgents = [
    'curl',
    'PostmanRuntime',
    'insomnia',
    'python-requests',
    'Go-http-client'
  ];

  const isForbidden = forbiddenAgents.some(agent => userAgent.includes(agent));

  if (isForbidden) {
    return res.status(403).json({ 
      message: 'Access denied. CLI tools are not allowed. Please use the official web interface.' 
    });
  }

  next();
};
