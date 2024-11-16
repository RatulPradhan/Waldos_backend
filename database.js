import mysql from "mysql2";
import dotenv from "dotenv";
import e from "express";
import { format } from "date-fns";

dotenv.config();

const db = mysql
	.createPool({
		host: process.env.DB_HOST,
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_NAME,
	})
	.promise();

export async function getUsers() {
	const [rows] = await db.query("SELECT * FROM user;");
	return rows;
}

export async function getUnbannedUsers() {
	const [rows] = await db.query(`
    SELECT * 
    FROM user
    WHERE email NOT IN (SELECT email FROM banned_users);
  `);
	return rows;
}

export async function getBannedUserEmails() {
	const [rows] = await db.query("SELECT email FROM banned_users;");
	return rows;
}

export async function getAllReports() {
	const [report] = await db.query("SELECT * FROM reports;");
	const [c_report] = await db.query("SELECT * FROM reportComment;");

	// Combine the dictionaries by their index positions
	const combinedReports = report.map((item, index) => {
		return { ...item, ...(c_report[index] || {}) };
	});

	return combinedReports;
}

export async function removeUserFromBanList(email) {
	const query = `DELETE FROM banned_users WHERE email = ?`;
	try {
		const result = await db.execute(query, [email]);
		return result;
	} catch (error) {
		console.error("Error removing user from ban list:", error);
		throw new Error("Database error: Could not remove user from ban list");
	}
}

export async function getUserByID(id) {
	const [rows] = await db.query(`SELECT * FROM user WHERE user_id = ?`, [id]);
	return rows;
}

export async function getUser(username) {
	const [rows] = await db.query(`SELECT * FROM user WHERE username = ?`, [
		username,
	]);
	return rows;
}

export async function banUser(email) {
	const result = await db.query(
		`
    INSERT INTO banned_users (email)
    VALUES (?)
    `,
		[email]
	);
	const rEmail = result.email;
	return getUser(rEmail);
}

export async function getPasswordByEmail(email) {
	const [rows] = await db.query(`SELECT password FROM user where email = ?`, [
		email,
	]);
	return rows;
}

export async function getUserByEmail(email) {
	const [rows] = await db.query(`SELECT * FROM user WHERE email = ?`, [email]);
	return rows;
}

export async function createUser(username, email, password, type) {
	const result = await db.query(
		`
    
    INSERT INTO user (username, email, password, user_type)
    VALUES (?, ?, ?, ?)
    `,
		[username, email, password, type]
	);
	const id = result.user_id;
	return getUser(id);
}

export async function getEvents() {
	const [rows] = await db.query("SELECT * FROM event;");
	return rows;
}

export async function getOngoingUpcomingEvents() {
	const [rows] = await db.query(
		"SELECT * FROM event WHERE status = 'ongoing' OR status = 'upcoming';"
	);
	return rows;
}

// Helper function to format the datetime for MySQL
function formatDateForMySQL(date) {
	return format(new Date(date), "yyyy-MM-dd HH:mm:ss");
}

// In your `createEvent` function or wherever you call it
export async function createEvent(
	name,
	description,
	status,
	event_at,
	event_end_at
) {
	// Format the event_at datetime for MySQL
	console.log(event_at);
	console.log(event_end_at);
	const formattedEventAt = formatDateForMySQL(event_at);
	const formattedEventEndAt = formatDateForMySQL(event_end_at);

	const query = `INSERT INTO event (name, description, status, event_at, event_end_at) VALUES (?, ?, ?, ?, ?)`;

	try {
		const [result] = await db.execute(query, [
			name,
			description,
			status,
			formattedEventAt, // Use the formatted datetime
			formattedEventEndAt,
		]);
		const id = result.insertId;
		return getPost(id);
	} catch (error) {
		console.error("Error saving post:", error);
		throw new Error("Database error: Could not save post");
	}
}

// post's functions
export async function createPost(user_id, channel_id, title, content) {
	const query = `INSERT INTO post (user_id, channel_id, title, content) VALUES (?, ?, ?, ?)`;

	try {
		const [result] = await db.execute(query, [
			user_id,
			channel_id,
			title,
			content,
		]);
		const id = result.insertId;
		return getPost(id);
	} catch (error) {
		console.error("Error saving post:", error);
		throw new Error("Database error: Could not save post");
	}
}

export async function getPost(id) {
	const [rows] = await db.query(
		`
      SELECT * 
      FROM post
      WHERE post_id = ?`,
		[id]
	);

	return rows[0];
}

export async function getPostsByChannel(channel_id) {
	const [rows] = await db.query(`SELECT * FROM post WHERE channel_id = ?`, [
		channel_id,
	]);
	return rows[0];
}

export async function getAllPosts() {
	const query = `SELECT post.post_id, post.user_id, post.channel_id, post.title, post.content, post.created_at, user.username, user.profile_picture,
		(SELECT COUNT(*) FROM comment WHERE comment.post_id = post.post_id) AS comment_count
		FROM post
		JOIN user ON post.user_id = user.user_id
		ORDER BY post.created_at DESC`;

	try {
		const [rows] = await db.execute(query);
		return rows;
	} catch (error) {
		console.error("Error retrieving posts:", error);
		throw new Error("Database error: Could not retrieve posts");
	}
}

//delete post
export async function deletePost(post_id) {
	const query = "DELETE FROM post WHERE post_id = ?";

	return db.execute(query, [post_id]);
}

//update post
export async function updatePost(post_id, title, content) {
	const query = "UPDATE post SET title = ?, content = ? WHERE post_id = ?";
	return db.execute(query, [title, content, post_id]);
}

// comment's function

export async function createComment(postId, userId, content, parent_id = null) {
	const query = `INSERT INTO comment (post_id, user_id, content, parent_id)
                 VALUES (?, ?, ?, ?)`;
	try {
		const [result] = await db.execute(query, [
			postId,
			userId,
			content,
			parent_id,
		]);
		const id = result.insertId;
		return getComment(id);
	} catch (error) {
		console.error("Error saving comment:", error);
		throw new Error("Database error: Could not save comment");
	}
}

export async function getComment(id) {
	const [rows] = await db.query(
		`
      SELECT * 
      FROM comment
      WHERE comment_id = ?
  `,
		[id]
	);

	return rows[0];
}

export async function getPostWithComments(post_id) {
	const postQuery = ` 
	SELECT post.*, user.username, 
	(SELECT COUNT(*) FROM comment WHERE comment.post_id = post.post_id) AS comment_count
	FROM post
	JOIN user ON post.user_id = user.user_id
	WHERE post.post_id = ?`;

	const commentsQuery = `
	SELECT comment.comment_id, comment.post_id, comment.user_id, comment.parent_id, comment.content, comment.created_at, user.username
	FROM comment
	JOIN user ON comment.user_id = user.user_id
	WHERE comment.post_id = ?
	ORDER BY comment.created_at ASC
  `;

	try {
		const [postResult] = await db.execute(postQuery, [post_id]);
		const [commentsResult] = await db.execute(commentsQuery, [post_id]);

		if (!postResult.length) {
			throw new Error(`Post with id ${post_id} not found`);
		}

		const post = postResult[0];

		const commentsByParentId = commentsResult.reduce((acc, comment) => {
			const parentId = comment.parent_id || null;
			if (!acc[parentId]) {
				acc[parentId] = [];
			}
			acc[parentId].push(comment);
			return acc;
		}, {});

		// Recursive function to nest replies
		const nestReplies = (commentList) => {
			return commentList.map((comment) => ({
				...comment,
				replies: commentsByParentId[comment.comment_id]
					? nestReplies(commentsByParentId[comment.comment_id])
					: [],
			}));
		};

		// Initialize top-level comments with nested replies
		const topLevelComments = nestReplies(commentsByParentId[null] || []);

		// const topLevelComments = commentsByParentId[null] || [];

		// topLevelComments.forEach((comment) => {
		// 	comment.replies = commentsByParentId[comment.comment_id] || [];
		// });

		// num of total comments
		const totalComments = commentsResult.length;

		return { post, comments: topLevelComments, totalComments };
	} catch (error) {
		console.error("Error retrieving post and comments:", error);
		throw new Error("Database error: Could not retrieve post and comments");
	}
}

//update comment
export async function updateComment(comment_id, content) {
	const query = "UPDATE comment SET content = ? WHERE comment_id = ?";
	return db.execute(query, [content, comment_id]);
}

//function to filter channel
export async function getCeramicPost() {
	const query = `SELECT post.post_id, post.user_id, post.channel_id, post.title, post.content, post.created_at, user.username,
		(SELECT COUNT(*) FROM comment WHERE comment.post_id = post.post_id) AS comment_count
		FROM post
		JOIN user ON post.user_id = user.user_id
		WHERE post.channel_id = 2
		ORDER BY post.created_at DESC`;
	const [rows] = await db.execute(query);
	return rows;
}

export async function getPrintmakingPost() {
	const query = `SELECT post.post_id, post.user_id, post.channel_id, post.title, post.content, post.created_at, user.username,
		(SELECT COUNT(*) FROM comment WHERE comment.post_id = post.post_id) AS comment_count
		FROM post
		JOIN user ON post.user_id = user.user_id
		WHERE post.channel_id = 3
		ORDER BY post.created_at DESC`;

	const [rows] = await db.execute(query);
	return rows;
}

export async function getFilmPost() {
	const query = `SELECT post.post_id, post.user_id, post.channel_id, post.title, post.content, post.created_at, user.username,
		(SELECT COUNT(*) FROM comment WHERE comment.post_id = post.post_id) AS comment_count
		FROM post
		JOIN user ON post.user_id = user.user_id
		WHERE post.channel_id = 4
		ORDER BY post.created_at DESC`;

	const [rows] = await db.execute(query);
	return rows;
}

// function to add report(post)
export async function addReport(postId, reportedBy, reason) {
	const query =
		"INSERT INTO reports (post_id, reported_by, reason, status) VALUES (?, ?, ?, ?)";
	const params = [postId, reportedBy, reason, "pending"];
	return db.execute(query, params);
}

// function to add report(comment)
export async function addReportComment(commentId, reportedBy, reason) {
	const query =
		"INSERT INTO reportComment (comment_id, reported_by, reason, status) VALUES (?, ?, ?, ?)";
	const params = [commentId, reportedBy, reason, "pending"];
	return db.execute(query, params);
}

// Function to add a like to a post
export async function likePost(post_id, user_id) {
	const [exists] = await db.query(
		"SELECT * FROM post_likes WHERE post_id = ? AND user_id = ?",
		[post_id, user_id]
	);
	if (exists.length === 0) {
		await db.query("INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)", [
			post_id,
			user_id,
		]);
	}
	const [result] = await db.query(
		"SELECT COUNT(*) AS like_count FROM post_likes WHERE post_id = ?",
		[post_id]
	);
	return result[0].like_count;
}

// Function to add a like to a comment
export async function likeComment(comment_id, user_id) {
	const [exists] = await db.query(
		"SELECT * FROM comment_likes WHERE comment_id = ? AND user_id = ?",
		[comment_id, user_id]
	);
	if (exists.length === 0) {
		await db.query(
			"INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)",
			[comment_id, user_id]
		);
	}
	const [result] = await db.query(
		"SELECT COUNT(*) AS like_count FROM comment_likes WHERE comment_id = ?",
		[comment_id]
	);
	return result[0].like_count;
}

// Function to get users who liked a post
export async function getPostLikes(post_id) {
	const likeCountQuery =
		"SELECT COUNT(*) AS like_count FROM post_likes WHERE post_id = ?";
	const likedUsersQuery = `
      SELECT user.user_id, user.username
      FROM post_likes
      JOIN user ON post_likes.user_id = user.user_id
      WHERE post_likes.post_id = ?
    `;

	const [likeCountResult] = await db.execute(likeCountQuery, [post_id]);
	const [likedUsersResult] = await db.execute(likedUsersQuery, [post_id]);

	return {
		like_count: likeCountResult[0].like_count,
		liked_by_users: likedUsersResult,
	};
}

// Function to get users who liked a comment
export async function getCommentLikes(comment_id) {
	const likeCountQuery =
		"SELECT COUNT(*) AS like_count FROM comment_likes WHERE comment_id = ?";
	const likedUsersQuery = `
      SELECT user.user_id, user.username
      FROM comment_likes
      JOIN user ON comment_likes.user_id = user.user_id
      WHERE comment_likes.comment_id = ?
    `;

	const [likeCountResult] = await db.execute(likeCountQuery, [comment_id]);
	const [likedUsersResult] = await db.execute(likedUsersQuery, [comment_id]);

	return {
		like_count: likeCountResult[0].like_count,
		liked_by_users: likedUsersResult,
	};
}

// Function to test getUsers
async function testGetUsers() {
	try {
		const users = await getUsers();
		console.log(users);
	} catch (error) {
		console.error("Error fetching users:", error);
	}
}

//function to insert data into a database
//takes in a list of values and a query string
//returns the result of the query
export async function insertData(values, query) {
	try {
		const result = await db.query(query, values);
		return result;
	} catch (error) {
		console.error("Error inserting data:", error);
	}
}

export async function getUserBio(userId) {
	const query = `SELECT bio FROM user WHERE user_id = ?`;
	const [rows] = await db.execute(query, [userId]);
	return rows[0];
}

export async function getUserCreated_at(userId) {
	const query = `SELECT created_at FROM user WHERE user_id = ?`;
	const [rows] = await db.execute(query, [userId]);
	return rows[0];
}

export async function updateUserProfilePicture(userId, fileExtension) {
	const query = `UPDATE user SET profile_picture = ? WHERE user_id = ?`;
	try {
		const [result] = await db.execute(query, [fileExtension, userId]);
		return result;
	} catch (error) {
		console.error("Error updating user profile picture:", error);
		throw new Error("Database error: Could not update user profile picture");
	}
}

export async function updateBio(userId, bio) {
	const query = `UPDATE user SET bio = ? WHERE user_id = ?`;
	try {
		const [result] = await db.execute(query, [bio, userId]);
		return result;
	} catch (error) {
		console.error("Error updating user bio:", error);
		throw new Error("Database error: Could not update user bio");
	}
}

export async function updateUsername(userId, newUsername) {
	const checkQuery = `SELECT COUNT(*) as count FROM user WHERE username = ?`;
	const updateQuery = `UPDATE user SET username = ? WHERE user_id = ?`;

	try {
		const [checkResult] = await db.execute(checkQuery, [newUsername]);
		if (checkResult[0].count > 0) {
			throw new Error("Username is already taken");
		}

		const [updateResult] = await db.execute(updateQuery, [newUsername, userId]);
		return updateResult;
	} catch (error) {
		console.error("Error updating username:", error);
		throw new Error("Database error: Could not update username");
	}
}
