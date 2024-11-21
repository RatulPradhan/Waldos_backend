import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import multer from "multer";
import fs from "fs";
import path from "path";
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
	addReportComment,
	updateComment,
	likePost,
	likeComment,
	getPostLikes,
	getCommentLikes,
	getBannedUserEmails,
	removeUserFromBanList,
	banUser,
	getEvents,
	getUserBio,
	getOngoingUpcomingEvents,
	createEvent,
	getUnbannedUsers,
	getUserCreated_at,
	updateUserProfilePicture,
	updateBio,
	updateUsername,
	getAllReports,
  createUser,
  followChannel,
  unfollowChannel,
  isFollowing
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

app.get("/unbanned_users", async (req, res) => {
	const user = await getUnbannedUsers();
	res.send(user);
});

app.get("/users", async (req, res) => {
	const user = await getUsers();
	res.send(user);
});

app.get("/all-reports", async (req, res) => {
	const reports = await getAllReports();
	res.send(reports);
});

app.get("/events", async (req, res) => {
	const event = await getEvents();
	res.send(event);
});

app.get("/ongoing_upcoming_events", async (req, res) => {
	const event = await getOngoingUpcomingEvents();
	res.send(event);
});

app.get("/password/:email", async (req, res) => {
	const email = req.params.email;
	const password = await getPasswordByEmail(email);
	res.send(password);
});

// like a post
app.post("/api/likePost", async (req, res) => {
	const { post_id, user_id } = req.body;
	try {
		const like_count = await likePost(post_id, user_id);
		res.json({ like_count });
	} catch (error) {
		console.error("Error liking post:", error);
		res.status(500).json({ error: "Failed to like post" });
	}
});

// like a comment
app.post("/api/likeComment", async (req, res) => {
	const { comment_id, user_id } = req.body;
	try {
		const like_count = await likeComment(comment_id, user_id);
		res.json({ like_count });
	} catch (error) {
		console.error("Error liking comment:", error);
		res.status(500).json({ error: "Failed to like comment" });
	}
});

//get users who liked a post
app.get("/api/postLikes/:post_id", async (req, res) => {
	const { post_id } = req.params;
	try {
		const likes = await getPostLikes(post_id);
		res.json(likes);
	} catch (error) {
		console.error("Error fetching post likes:", error);
		res.status(500).json({ error: "Failed to fetch post likes" });
	}
});

// get users who liked a comment
app.get("/api/commentLikes/:comment_id", async (req, res) => {
	const { comment_id } = req.params;
	try {
		const likes = await getCommentLikes(comment_id);
		res.json(likes);
	} catch (error) {
		console.error("Error fetching comment likes:", error);
		res.status(500).json({ error: "Failed to fetch comment likes" });
	}
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

//add report(post)
app.post("/reports", async (req, res) => {
	const { post_id, reported_by, reason } = req.body;

	try {
		await addReport(post_id, reported_by, reason);
		res.status(201).json({ message: "Report submitted successfully" });
	} catch (error) {
		console.error("Error submitting report:", error);
		res
			.status(500)
			.json({ message: "Failed to submit report", error: error.message });
	}
});

//add report(comment)
app.post("/reportComment", async (req, res) => {
	const { comment_id, reported_by, reason } = req.body;

	try {
		await addReportComment(comment_id, reported_by, reason);
		res.status(201).json({ message: "Report submitted successfully" });
	} catch (error) {
		console.error("Error submitting report:", error);
		res
			.status(500)
			.json({ message: "Failed to submit report", error: error.message });
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

// Route to unfollow a channel
app.delete("/unfollow-channel", async (req, res) => {
  const { user_id, channel_id } = req.body; // Ensure user_id and channel_id are sent in the body

  try {
    // Call the function to remove the user-channel pair from the following table
    const result = await unfollowChannel(user_id, channel_id);

    // Check if the record was successfully deleted
    if (result.affectedRows > 0) {
      res.status(200).send({ message: "User successfully unfollowed the channel" });
    } else {
      res.status(404).send({ message: "No matching record found" });
    }
  } catch (error) {
    console.error("Error unfollowing the channel:", error);
    res.status(500).send({ message: "Internal server error" });
  }
});



// Route to check if a user is following a specific channel
app.get('/is-following', async (req, res) => {
  const { user_id, channel_id } = req.query; // Expecting query parameters

  try {
    const following = await isFollowing(user_id, channel_id);

    res.status(200).json({ isFollowing: following });
  } catch (error) {
    console.error('Error checking if user is following the channel:', error);
    res.status(500).json({ message: 'Internal server error' });
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

app.post("/create-event", async (req, res) => {
	const { name, url, event_at, event_end_at } = req.body; // Expecting the name, description, event_at, and event_end_at in the request body
	console.log(event_at);
	console.log(event_end_at);
	if (!name || !event_at || !event_end_at) {
		return res.status(400).json({
			message: "Name, event start time, and event end time are required",
		});
	}

	try {
		// Convert event times to Date objects
		const eventDate = new Date(event_at);
		const eventEndDate = new Date(event_end_at);
		const currentDate = new Date();

		let status;

		// Determine the event status based on the current date and time
		if (currentDate < eventDate) {
			// Event is before the start date
			status = "upcoming";
		} else if (currentDate >= eventDate && currentDate <= eventEndDate) {
			// Event is between the start and end date (ongoing)
			status = "ongoing";
		} else {
			// Event is after the end date (completed)
			status = "completed";
		}

		// Call the function to create the event in the database
		const event = await createEvent(
			name,
			url,
			status,
			event_at,
			event_end_at
		);

		res.status(201).json({ message: "Event created successfully", event });
	} catch (error) {
		console.error(error);
		res
			.status(500)
			.json({ message: "Failed to create event", error: error.message });
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

app.post("/create-user", async (req, res) => {
  const {username, email, password, type, Bio, profile_picture} = req.body;
  const user = await createUser(username, email, password, type, Bio, profile_picture);
  res.status(201).send(user);
})

app.post("/follow-channel", async (req, res) => {
  const {user_id, channel_id} = req.body;
  const follow = await followChannel(user_id, channel_id);
  res.status(201).send(follow);
})

// update post
app.put("/posts/:id", async (req, res) => {
	const postId = req.params.id;
	const { title, content } = req.body;

	try {
		await updatePost(postId, title, content);
		res.status(200).json({ message: "Post updated successfully" });
	} catch (err) {
		res
			.status(500)
			.json({ message: "Error updating post", error: err.message });
	}
});

//delete post
app.delete("/posts/:id", async (req, res) => {
	const postId = req.params.id;

	try {
		await deletePost(postId);
		res.status(200).json({ message: "Post deleted successfully" });
	} catch (err) {
		res
			.status(500)
			.json({ message: "Error deleting post", error: err.message });
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

app.get("/user/:user_id/bio", async (req, res) => {
	const { user_id } = req.params;
	const bio = await getUserBio(user_id);
	res.status(201).send(bio);
});

app.get("/user/:user_id/created_at", async (req, res) => {
	const { user_id } = req.params;
	const created_at = await getUserCreated_at(user_id);
	res.status(201).send(created_at);
});

app.put("/user/:user_id/bio", async (req, res) => {
	const { user_id } = req.params;
	const { bio } = req.body;

	try {
		await updateBio(user_id, bio);
		res.status(200).json({ bio });
	} catch (error) {
		console.error("Error updating bio:", error);
		res.status(500).json({ message: "Failed to update bio" });
	}
});

app.post("/user/:user_id/username", async (req, res) => {
	const { username } = req.body;

	try {
		await updateUsername(req.params.user_id, username);
		res.status(200).json({ message: "Username updated successfully" });
	} catch (error) {
		console.error("Error updating username:", error);
		res.status(500).json({ message: "Failed to update username" });
	}
});

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		console.log("Setting destination for file upload"); // Log destination setting
		cb(null, "../Waldos_frontend/public/images/profile_pictures");
	},
	filename: (req, file, cb) => {
		const userId = req.body.user_id;
		const extension = path.extname(file.originalname);
		cb(null, `${userId}${extension}`);
	},
});

const upload = multer({ storage });

app.post(
	"/upload_profile_picture",
	upload.single("profile_picture"),
	async (req, res) => {
		try {
			console.log("Received request to upload profile picture"); // Log request received
			const userId = req.body.user_id;
			const fileName = req.body.file_name;
			console.log("User ID in route handler:", userId); // Log user ID in route handler
			if (!userId) {
				return res.status(400).json({ message: "User ID is required" });
			}

			const fileExtension = path.extname(req.file.originalname);

			// Rename the file to the correct name
			// This is necessary because the file name is generated by the frontend, and is saved as undefined first round since upload.single("profile_picture") is used to send the photo object
			// The file name is then updated to the correct name, i.e. this is a workaround to rename the file
			const oldPath = req.file.path;
			const newPath = path.join(req.file.destination, fileName);
			fs.renameSync(oldPath, newPath);

			await updateUserProfilePicture(userId, fileName);
			res
				.status(200)
				.json({ message: "Profile picture uploaded successfully" });
		} catch (error) {
			console.error("Error uploading profile picture:", error);
			res.status(500).json({
				message: "Failed to upload profile picture",
				error: error.message,
			});
		}
	}
);

//update comment
app.put("/comment/:id", async (req, res) => {
	const commentId = req.params.id;
	const { content } = req.body;

	try {
		await updateComment(commentId, content);
		res.status(200).json({ message: "Comment updated successfully" });
	} catch (err) {
		res
			.status(500)
			.json({ message: "Error updating comment", error: err.message });
	}
});

app.listen(8080, () => {
	console.log("Server started on port 8080");
});
