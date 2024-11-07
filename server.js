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
	deletePost, 
	updatePost,
	getCeramicPost,
	getPrintmakingPost,
	getFilmPost,
	addReport,
  getBannedUserEmails,
  removeUserFromBanList,
  banUser
} from "./database.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/user/:email", async (req, res) => {
	const email = req.params.email;
	const user = await getUserByEmail(email);
	res.send(user);
});

app.get("/banned_users", async (req, res) => {
  const user = await getBannedUserEmails();
  res.send(user);
});

app.get("/users", async (req, res) => {
	const user = await getUsers();
	res.send(user);
})

app.get("/password/:email", async (req, res) => {
	const email = req.params.email;
	const password = await getPasswordByEmail(email);
	res.send(password);
});

//filter channel
app.get("/ceramic", async (req, res) => {
	const ceramicPosts = await getCeramicPost();
	res.send(ceramicPosts);
});

app.get("/printmaking", async (req, res) => {
	const printmakingPosts = await getPrintmakingPost();
	res.send(printmakingPosts);
});

app.get("/film", async (req, res) => {
	const filmPosts = await getFilmPost();
	res.send(filmPosts);
});

//add report
app.post('/reports', async (req, res) => {
	const { post_id, reported_by, reason } = req.body;
  
	try {
	  await addReport(post_id, reported_by, reason); 
	  res.status(201).json({ message: 'Report submitted successfully' });
	} catch (error) {
	  console.error('Error submitting report:', error);
	  res.status(500).json({ message: 'Failed to submit report', error: error.message });
	}
});

app.delete("/unban-user", async (req, res) => {
  const { email } = req.body; // Expecting the email to be sent in the request body

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const result = await removeUserFromBanList(email);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found in ban list" });
    }
    res.status(200).json({ message: "User unbanned successfully" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Failed to unban user", error: error.message });
  }
});

app.post("/ban-user", async (req, res) => {
  const { email } = req.body; // Expecting the email to be sent in the request body

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    await banUser(email); // Call the function to ban the user
    res.status(201).json({ message: "User banned successfully" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Failed to ban user", error: error.message });
  }
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

// update post
app.put('/posts/:id', async (req, res) => {
    const postId = req.params.id;
    const { title, content } = req.body;

    try {
        // Use the helper function to update the post
        await updatePost(postId, title, content);
        res.status(200).json({ message: 'Post updated successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating post', error: err.message });
    }
});

//delete post
app.delete('/posts/:id', async (req, res) => {
    const postId = req.params.id;

    try {
        // Use the helper function to delete the post
        await deletePost(postId);
        res.status(200).json({ message: 'Post deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting post', error: err.message });
    }
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
