import { authenticateRequest } from '@/middleware/authenticate-request';
import prisma from '@/resources/prisma';
import type { Request, Response } from 'express';

export const GET = [
	authenticateRequest(),
	async (req: Request, res: Response) => {
		const marketplacePages = await prisma.marketPlaceTilePage.findMany({
			take: 20,
			include: {
				tilePage: {
					include: {
						user: {
							select: {
								name: true
							}
						}
					}
				}
			}
		});

		return res.json({ pages: marketplacePages });
	}
];
