import { sendEmail } from "./email.js";
import dotenv from "dotenv";

dotenv.config();

//Debugging
console.log("EMAIL_HOST:", process.env.EMAIL_HOST);
console.log("EMAIL_PORT:", process.env.EMAIL_PORT);
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS);
console.log("EMAIL_FROM:", process.env.EMAIL_FROM);

sendEmail("john@example.com", "Trial Subject", "Test email content")
	.then(() => console.log("Test email sent"))
	.catch((error) => console.error("Error sending test email:", error));
