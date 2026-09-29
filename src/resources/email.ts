import nodemailer from 'nodemailer';
import { RESEND_API_KEY, SMTP_FROM, SMTP_PASS, SMTP_USER } from '@/utils/env';

// Resend's HTTPS API when RESEND_API_KEY is set (DigitalOcean blocks outbound SMTP on
// newer droplets); otherwise Gmail / Google Workspace SMTP using an app password.
const transporter = nodemailer.createTransport({
	host: 'smtp.gmail.com',
	port: 465,
	secure: true,
	auth: {
		user: SMTP_USER,
		pass: SMTP_PASS
	}
});

export async function sendEmail({
	to,
	subject,
	html,
	text
}: {
	to: string;
	subject: string;
	html?: string;
	text?: string;
}) {
	if (RESEND_API_KEY) return sendWithResend({ to, subject, html, text });
	return transporter.sendMail({ from: SMTP_FROM, to, subject, html, text });
}

async function sendWithResend(email: {
	to: string;
	subject: string;
	html?: string;
	text?: string;
}) {
	const response = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({ from: SMTP_FROM, ...email }),
		signal: AbortSignal.timeout(15_000)
	});
	if (!response.ok) {
		throw new Error(`Resend rejected the email (${response.status}): ${await response.text()}`);
	}
	return response.json();
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
	return sendEmail({
		to,
		subject: 'Reset your password — FreeSpeech AAC',
		text: `We received a request to reset your FreeSpeech AAC password.\n\nReset it here (link expires in 1 hour):\n${resetUrl}\n\nIf you didn't request this, you can ignore this email — your password won't change.`,
		html: `
			<div style="font-family: sans-serif; line-height: 1.5; color: #18181b;">
				<h2>Reset your password</h2>
				<p>We received a request to reset your FreeSpeech AAC password.</p>
				<p>
					<a href="${resetUrl}"
						style="display:inline-block;padding:10px 18px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;">
						Reset password
					</a>
				</p>
				<p style="color:#666;font-size:13px;">Or paste this link into your browser:<br>${resetUrl}</p>
				<p style="color:#666;font-size:13px;">This link expires in 1 hour.</p>
				<p style="color:#666;font-size:13px;">If you didn't request this, you can ignore this email — your password won't change.</p>
			</div>`
	});
}

export default sendEmail;
