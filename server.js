import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { sendEmail } from "./email.js";
import {
	getAllPosts,
	createPost,
	createComment,
	getPostWithComments,
	getUserByEmail,
	getUsers,
	insertData,
	getPasswordByEmail,
} from "./database.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/user/:email", async (req, res) => {
	const email = req.params.email;
	const user = await getUserByEmail(email);
	res.send(user);
});

app.get("/password/:email", async (req, res) => {
	const email = req.params.email;
	const password = await getPasswordByEmail(email);
	res.send(password);
});

// post's http
app.get("/posts", async (req, res) => {
	const posts = await getAllPosts();
	res.send(posts);
});

app.post("/posts", async (req, res) => {
	const { user_id, channel_id, title, content } = req.body;
	const post = await createPost(user_id, channel_id, title, content);
	res.status(201).send(post);
});

// comment's http
app.post("/posts/:post_id/comments", async (req, res) => {
	const { post_id } = req.params;
	const { user_id, content, parent_id } = req.body;
	const comment = await createComment(post_id, user_id, content, parent_id);
	res.status(201).send(comment);
});

app.get("/posts/:post_id/comments", async (req, res) => {
	const { post_id } = req.params;
	const result = await getPostWithComments(post_id);
	res.status(201).send(result);
});

app.post("/announcement", async (req, res) => {
	try {
		const { title, content } = req.body; // Extract title and content from the request body
		console.log("Received announcement:", { title, content });

		// Save the announcement to the database
		const insert = await insertData(
			"INSERT INTO announcements (title, content) VALUES (?, ?)",
			[title, content]
		);
		//console.log("Announcement created:", title, content);

		// Get all users
		const users = await getUsers();
		const emails = users.map((user) => user.email);

		// Send email to all users
		emails.forEach((email) => {
			sendEmail(email, `New Announcement: ${title}`, content);
		});

		res.status(201).send({ message: "Announcement created and emails sent" }); // Send a success response
	} catch (error) {
		console.error("Error creating announcement:", error);
		res.status(500).send({ error: "Error creating announcement" }); // Send an error response
	}
});

app.listen(8080, () => {
	console.log("Server started on port 8080");
});
