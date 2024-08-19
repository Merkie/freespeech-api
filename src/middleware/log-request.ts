import { Request, Response, NextFunction } from 'express';

export default function LogRequestMiddleware(req: Request, res: Response, next: NextFunction) {
	console.log(`[${new Date(Date.now()).toLocaleString()}] ${req.method} ${req.path}`);
	next();
}
