import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export function validateSchema<T>(schema: ZodSchema<T>) {
	return (req: Request, res: Response, next: NextFunction) => {
		const parseResult = schema.safeParse(req.body);

		if (!parseResult.success) {
			return res.status(400).json({ error: 'zodError', zodError: parseResult.error });
		}

		req.body = parseResult.data;

		next();
	};
}
