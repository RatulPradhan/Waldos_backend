import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
	host: process.env.EMAIL_HOST,
	port: process.env.EMAIL_PORT,
	secure: false, // true for 465, false for other ports
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASS,
	},
});

export async function sendEmail(to, subject, text) {
	const mailOptions = {
		from: process.env.EMAIL_FROM,
		to,
		subject,
		text,
	};

	try {
		await transporter.sendMail(mailOptions);
		console.log("Email sent successfully");
	} catch (error) {
		console.error("Error sending email:", error);
	}
}

export async function sendVerificationEmail(to, token) {
	const subject = "Verify your email";
	const text = `Click the following link to verify your email: ${process.env.FRONTEND_URL}/verify-email/${token}`;
	await sendEmail(to, subject, text);
}
